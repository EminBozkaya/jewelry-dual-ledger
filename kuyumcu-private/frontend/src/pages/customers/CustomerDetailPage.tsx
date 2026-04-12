import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2, Upload, Banknote, ArrowUpFromLine, RefreshCw } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { customerApi } from "@/api/customers";
import { balanceApi } from "@/api/balances";
import { transactionApi } from "@/api/transactions";
import { assetTypeApi } from "@/api/asset-types";
import type { AssetType, Customer, Balance, Transaction, CustomerUpdateRequest } from "@/types";
import { formatDate, formatDateShort, formatTransactionType, formatAmount } from "@/lib/formatters";
import { useAuth } from "@/hooks/useAuth";
import { isValidTC } from "@/lib/validations";

import { PageHeader } from "@/components/shared/PageHeader";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable } from "@/components/shared/DataTable";
import { DepositDialog } from "@/components/shared/DepositDialog";
import { WithdrawalDialog } from "@/components/shared/WithdrawalDialog";
import { ConversionDialog } from "@/components/shared/ConversionDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Zod schema ─────────────────────────────────────────────────
const schema = z.object({
  firstName: z.string().min(2, "En az 2 karakter").max(50, "En fazla 50 karakter"),
  lastName: z.string().min(2, "En az 2 karakter").max(50, "En fazla 50 karakter"),
  phone: z.string().superRefine((val, ctx) => {
    if (!val) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Telefon zorunludur" });
      return;
    }
    const parts = val.split(" ");
    const code = parts[0];
    const num = parts.slice(1).join("").replace(/\D/g, "");
    if (code === "+90") {
      if (num.length !== 10) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "10 haneli telefon numarası girmelisiniz" });
      }
    } else {
      if (num.length < 5) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Geçerli bir telefon numarası giriniz" });
      }
    }
  }),
  nationalId: z
    .string()
    .optional()
    .refine((v) => !v || isValidTC(v), "Geçerli bir TC Kimlik No giriniz"),
  email: z
    .string()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "Geçerli e-posta"),
  address: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ── İşlem tipi badge rengi ────────────────────────────────────
function TransactionTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    Deposit: "bg-green-100 text-green-800",
    Withdrawal: "bg-red-100 text-red-800",
    Conversion: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[type] ?? "bg-muted text-muted-foreground"}`}
    >
      {formatTransactionType(type)}
    </span>
  );
}

// ── İptal dialogu ─────────────────────────────────────────────
function CancelDialog({
  open,
  onOpenChange,
  transaction,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transaction: Transaction | null;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>İşlemi İptal Et</DialogTitle>
        </DialogHeader>
        {transaction && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1 mb-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">İşlem Türü:</span>
              <span>{formatTransactionType(transaction.type)}</span>
            </div>
            {transaction.amount != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Miktar:</span>
                <span>{formatAmount(transaction.amount, "Piece")} {transaction.assetTypeCode}</span>
              </div>
            )}
          </div>
        )}
        <div className="space-y-2 py-1">
          <Label>İptal sebebi *</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Sebebi yazın..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            İptal Et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── İşlem Geçmişi Filtreleri ─────────────────────────────────
interface TxFilters {
  type: string;       // "all" | "Deposit" | "Withdrawal" | "Conversion"
  assetCode: string;  // "all" | "TRY" | ...
  status: string;     // "all" | "active" | "cancelled"
  dateFrom: string;
  dateTo: string;
}

function filterTransactions(txs: Transaction[], f: TxFilters): Transaction[] {
  return txs.filter((t) => {
    if (f.type !== "all" && t.type !== f.type) return false;
    if (f.status === "active" && t.isCancelled) return false;
    if (f.status === "cancelled" && !t.isCancelled) return false;
    if (f.assetCode !== "all") {
      const matches =
        t.assetTypeCode === f.assetCode ||
        (t.conversion &&
          (t.conversion.fromAssetCode === f.assetCode ||
            t.conversion.toAssetCode === f.assetCode));
      if (!matches) return false;
    }
    if (f.dateFrom) {
      const d = new Date(t.createdAt);
      if (d < new Date(f.dateFrom)) return false;
    }
    if (f.dateTo) {
      const d = new Date(t.createdAt);
      const end = new Date(f.dateTo);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  });
}

// ── Ana bileşen ───────────────────────────────────────────────
export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoKey, setPhotoKey] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Transaction | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filtreler
  const [filters, setFilters] = useState<TxFilters>({
    type: "all",
    assetCode: "all",
    status: "all",
    dateFrom: "",
    dateTo: "",
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const loadAll = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [c, b, t, at] = await Promise.all([
        customerApi.getById(id),
        balanceApi.getByCustomer(id),
        transactionApi.getByCustomer(id),
        assetTypeApi.getAll(),
      ]);
      setCustomer(c);
      setBalances(b.filter((bal) => bal.amount !== 0));
      setTransactions(t);
      setAssetTypes(at.filter((a) => a.isActive));
    } catch {
      toast.error("Müşteri bilgileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  // Yatır/Çek/Dönüştür sonrası sadece bakiye ve işlem listesini yenile
  const refreshData = async () => {
    if (!id) return;
    try {
      const [b, t] = await Promise.all([
        balanceApi.getByCustomer(id),
        transactionApi.getByCustomer(id),
      ]);
      setBalances(b.filter((bal) => bal.amount !== 0));
      setTransactions(t);
    } catch {
      toast.error("Veriler yenilenemedi");
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fotoğraf yükleme ─────────────────────────────────────
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Sadece JPG veya PNG dosyası yüklenebilir");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya 5MB'dan büyük olamaz");
      return;
    }
    try {
      await customerApi.uploadPhoto(id, file);
      toast.success("Fotoğraf güncellendi");
      setPhotoKey((k) => k + 1);
      setCustomer((c) => c ? { ...c, hasPhoto: true } : c);
    } catch {
      toast.error("Fotoğraf yüklenemedi");
    }
    e.target.value = "";
  };

  // ── Düzenleme ──────────────────────────────────────────────
  const openEdit = () => {
    if (!customer) return;
    reset({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      nationalId: customer.nationalId ?? "",
      email: customer.email ?? "",
      address: customer.address ?? "",
      notes: customer.notes ?? "",
    });
    setEditOpen(true);
  };

  const onEditSubmit = async (values: FormValues) => {
    if (!id) return;
    try {
      setSaving(true);
      const req: CustomerUpdateRequest = {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        nationalId: values.nationalId || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        notes: values.notes || undefined,
      };
      const updated = await customerApi.update(id, req);
      setCustomer(updated);
      toast.success("Müşteri güncellendi");
      setEditOpen(false);
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setSaving(false);
    }
  };

  // ── Silme ─────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!id) return;
    try {
      await customerApi.delete(id);
      toast.success("Müşteri silindi");
      navigate("/customers");
    } catch {
      toast.error("Silme işlemi başarısız");
    }
  };

  // ── İşlem iptali ──────────────────────────────────────────
  const handleCancel = async (reason: string) => {
    if (!cancelTarget) return;
    try {
      await transactionApi.cancel(cancelTarget.id, reason);
      toast.success("İşlem iptal edildi");
      setCancelTarget(null);
      await refreshData();
    } catch {
      toast.error("İptal işlemi başarısız");
    }
  };

  // ── Filtre değişkenlerinden unique asset kodları ──────────
  const uniqueAssetCodes = useMemo(() => {
    const codes = new Set<string>();
    transactions.forEach((t) => {
      if (t.assetTypeCode) codes.add(t.assetTypeCode);
      if (t.conversion) {
        codes.add(t.conversion.fromAssetCode);
        codes.add(t.conversion.toAssetCode);
      }
    });
    return Array.from(codes).sort();
  }, [transactions]);

  // Filtrelenmiş işlemler
  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, filters),
    [transactions, filters]
  );

  const conversionTxs = useMemo(
    () => transactions.filter((t) => t.type === "Conversion"),
    [transactions]
  );

  // ── İşlem tablosu sütunları ───────────────────────────────
  const txColumns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "createdAt",
      header: "Tarih",
      cell: ({ getValue }) => formatDate(getValue<string>()),
    },
    {
      accessorKey: "type",
      header: "İşlem Türü",
      cell: ({ getValue }) => <TransactionTypeBadge type={getValue<string>()} />,
    },
    {
      id: "asset",
      header: "Varlık",
      cell: ({ row }) => {
        const t = row.original;
        if (t.type === "Conversion" && t.conversion) {
          return (
            <span className="text-sm">
              {t.conversion.fromAssetCode} → {t.conversion.toAssetCode}
            </span>
          );
        }
        return <span className="text-sm">{t.assetTypeName ?? "—"}</span>;
      },
    },
    {
      id: "amount",
      header: "Miktar",
      cell: ({ row }) => {
        const t = row.original;
        if (t.isCancelled) {
          return (
            <span className="line-through text-muted-foreground text-sm">
              {t.amount != null
                ? formatAmount(t.amount, "Piece")
                : t.conversion
                ? `${formatAmount(t.conversion.fromAmount, "Piece")} → ${formatAmount(t.conversion.toAmount, "Piece")}`
                : "—"}
            </span>
          );
        }
        if (t.type === "Conversion" && t.conversion) {
          return (
            <span className="text-sm text-muted-foreground">
              {formatAmount(t.conversion.fromAmount, "Piece")} → {formatAmount(t.conversion.toAmount, "Piece")}
            </span>
          );
        }
        if (t.amount == null) return "—";
        const sign = t.type === "Withdrawal" ? -1 : 1;
        return (
          <AmountDisplay
            value={sign * t.amount}
            unitType="Piece"
            showSign
          />
        );
      },
    },
    {
      accessorKey: "description",
      header: "Açıklama",
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="hidden md:block max-w-[160px] truncate text-sm text-muted-foreground" title={getValue<string>()}>
          {getValue<string>() ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "createdByFullName",
      header: "İşlemi Yapan",
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="hidden lg:block text-sm">{getValue<string>()}</span>
      ),
    },
    {
      id: "status",
      header: "Durum",
      enableSorting: false,
      cell: ({ row }) => {
        const t = row.original;
        if (t.isCancelled) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Badge variant="destructive" className="text-xs cursor-help">
                    İptal
                  </Badge>
                </span>
              </TooltipTrigger>
              {t.cancelReason && (
                <TooltipContent>
                  <p className="max-w-[200px]">{t.cancelReason}</p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        }
        if (isAdmin) {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive text-xs h-7"
              onClick={(e) => {
                e.stopPropagation();
                setCancelTarget(t);
              }}
            >
              İptal Et
            </Button>
          );
        }
        return null;
      },
    },
  ];

  // ── Yükleniyor durumu ─────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return <p className="text-muted-foreground">Müşteri bulunamadı.</p>;
  }

  const initials = `${customer.firstName[0]}${customer.lastName[0]}`.toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.fullName}
        description="Müşteri detayı"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={openEdit} className="gap-2">
              <Pencil className="h-4 w-4" />
              Düzenle
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Sil
            </Button>
          </>
        }
      />

      {/* Bilgi Kartı */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar
                className="h-20 w-20 cursor-pointer"
                onClick={() => fileRef.current?.click()}
                title="Fotoğraf yükle"
              >
                {customer.hasPhoto && (
                  <AvatarImage
                    key={photoKey}
                    src={`${customerApi.getPhotoUrl(customer.id)}?v=${photoKey}`}
                  />
                )}
                <AvatarFallback className="text-xl bg-primary/10">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
              >
                <Upload className="h-3 w-3" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Bilgiler */}
            <div className="flex-1 space-y-1">
              <h2 className="text-xl font-bold">{customer.fullName}</h2>
              <p className="text-muted-foreground">{customer.phone}</p>
              {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
              {customer.nationalId && (
                <p className="text-sm text-muted-foreground">TC: {customer.nationalId}</p>
              )}
              {customer.address && (
                <p className="mt-2 text-sm text-muted-foreground">{customer.address}</p>
              )}
              {customer.notes && (
                <p className="mt-1 text-sm italic text-muted-foreground">{customer.notes}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Kayıt: {formatDateShort(customer.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bakiye Kartları */}
      <div>
        <h3 className="mb-3 text-base font-semibold">Bakiyeler</h3>
        {balances.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Bu müşteriye ait bakiye kaydı bulunmuyor.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {balances.map((b) => {
              const isPos = b.amount > 0;
              return (
                <Card
                  key={b.assetTypeId}
                  className={`border-2 ${isPos ? "border-[var(--color-alacak)]" : "border-[var(--color-borc)]"}`}
                >
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {b.assetTypeName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <AmountDisplay
                      value={b.amount}
                      unitType={b.unitType}
                      size="lg"
                    />
                    <div className="mt-2">
                      <Badge
                        className={`text-xs ${isPos ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}`}
                      >
                        {isPos ? "▲ Alacak" : "▼ Borç"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* İşlem Butonları */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1 gap-2 min-h-11 bg-green-600 hover:bg-green-700"
          onClick={() => setDepositOpen(true)}
        >
          <Banknote className="h-4 w-4" />
          Yatır
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2 min-h-11 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
          onClick={() => setWithdrawOpen(true)}
        >
          <ArrowUpFromLine className="h-4 w-4" />
          Çek
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2 min-h-11"
          onClick={() => setConvertOpen(true)}
        >
          <RefreshCw className="h-4 w-4" />
          Dönüştür
        </Button>
      </div>

      {/* Hareket Geçmişi */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Tüm İşlemler ({transactions.length})</TabsTrigger>
          <TabsTrigger value="conversions">Dönüşümler ({conversionTxs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-3">
          {/* Filtreler */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Select
              value={filters.type}
              onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}
            >
              <SelectTrigger className="min-h-9 text-sm">
                <SelectValue placeholder="İşlem Türü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Türler</SelectItem>
                <SelectItem value="Deposit">Yatırma</SelectItem>
                <SelectItem value="Withdrawal">Çekme</SelectItem>
                <SelectItem value="Conversion">Dönüşüm</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.assetCode}
              onValueChange={(v) => setFilters((f) => ({ ...f, assetCode: v }))}
            >
              <SelectTrigger className="min-h-9 text-sm">
                <SelectValue placeholder="Varlık" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Varlıklar</SelectItem>
                {uniqueAssetCodes.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger className="min-h-9 text-sm">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="cancelled">İptal Edilmiş</SelectItem>
              </SelectContent>
            </Select>

            <div className="col-span-2 sm:col-span-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full min-h-9 text-muted-foreground"
                onClick={() =>
                  setFilters({ type: "all", assetCode: "all", status: "all", dateFrom: "", dateTo: "" })
                }
              >
                Filtreleri Temizle
              </Button>
            </div>
          </div>

          {/* Tarih aralığı */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Başlangıç Tarihi</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                className="min-h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bitiş Tarihi</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                className="min-h-9 text-sm"
              />
            </div>
          </div>

          <DataTable
            columns={txColumns}
            data={filteredTransactions}
            searchPlaceholder="İşlemlerde ara..."
            emptyMessage="Filtreyle eşleşen işlem bulunamadı"
            getRowClassName={(row) =>
              row.original.isCancelled ? "bg-red-50/50 opacity-75" : ""
            }
          />
        </TabsContent>

        <TabsContent value="conversions" className="mt-4">
          <DataTable
            columns={[
              {
                accessorKey: "createdAt",
                header: "Tarih",
                cell: ({ getValue }) => formatDate(getValue<string>()),
              },
              {
                id: "from",
                header: "Kaynak",
                cell: ({ row }) => {
                  const c = row.original.conversion;
                  return c ? `${c.fromAssetName} — ${formatAmount(c.fromAmount, "Piece")}` : "—";
                },
              },
              {
                id: "tryEq",
                header: "TL Karşılığı",
                cell: ({ row }) => {
                  const c = row.original.conversion;
                  return c ? `${c.tryEquivalent.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺` : "—";
                },
              },
              {
                id: "to",
                header: "Hedef",
                cell: ({ row }) => {
                  const c = row.original.conversion;
                  return c ? `${c.toAssetName} — ${formatAmount(c.toAmount, "Piece")}` : "—";
                },
              },
              {
                id: "rate",
                header: "Kur Kaynağı",
                cell: ({ row }) => row.original.conversion?.rateSource ?? "—",
              },
            ]}
            data={conversionTxs}
            searchPlaceholder="Dönüşümlerde ara..."
            emptyMessage="Henüz dönüşüm işlemi yapılmamış"
          />
        </TabsContent>
      </Tabs>

      {/* Düzenleme Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Müşteri Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ad *</Label>
                <Input {...register("firstName")} maxLength={50} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Soyad *</Label>
                <Input {...register("lastName")} maxLength={50} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Telefon *</Label>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>TC Kimlik No</Label>
              <Input {...register("nationalId")} maxLength={11} />
              {errors.nationalId && (
                <p className="text-xs text-destructive">{errors.nationalId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>E-posta</Label>
              <Input type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Adres</Label>
              <Textarea {...register("address")} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Notlar</Label>
              <Textarea {...register("notes")} rows={2} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={saving} className="min-h-11">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Müşteri Silinsin mi?"
        description="Bu müşteri silinecektir. İşlem geri alınamaz."
        confirmLabel="Sil"
        onConfirm={handleDelete}
        destructive
      />

      {/* İşlem İptal Dialog */}
      <CancelDialog
        open={cancelTarget !== null}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        transaction={cancelTarget}
        onConfirm={handleCancel}
      />

      {/* Yatırma Dialog */}
      <DepositDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        customer={customer}
        assetTypes={assetTypes}
        onSuccess={refreshData}
      />

      {/* Çekme Dialog */}
      <WithdrawalDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        customer={customer}
        assetTypes={assetTypes}
        balances={balances}
        onSuccess={refreshData}
      />

      {/* Dönüşüm Dialog */}
      <ConversionDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        customer={customer}
        assetTypes={assetTypes}
        balances={balances}
        onSuccess={refreshData}
      />
    </div>
  );
}
