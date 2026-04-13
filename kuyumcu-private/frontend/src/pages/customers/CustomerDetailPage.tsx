import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Upload, Banknote, ArrowUpFromLine, RefreshCw, Printer } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { customerApi } from "@/api/customers";
import { balanceApi } from "@/api/balances";
import { transactionApi } from "@/api/transactions";
import { assetTypeApi } from "@/api/asset-types";
import { customerTypeApi } from "@/api/customer-types";
import type { AssetType, Customer, Balance, Transaction, CustomerUpdateRequest, CustomerTypeConfig } from "@/types";
import { formatDate, formatDateShort, formatTransactionType, formatAmount } from "@/lib/formatters";
import { useAuth } from "@/hooks/useAuth";
import { isValidTC } from "@/lib/validations";
import { breadcrumbLabelRegistry } from "@/lib/breadcrumb";
import { printReceipt } from "@/lib/printUtils";

import { PageHeader } from "@/components/shared/PageHeader";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable } from "@/components/shared/DataTable";
import { DepositDialog } from "@/components/shared/DepositDialog";
import { WithdrawalDialog } from "@/components/shared/WithdrawalDialog";
import { ConversionDialog } from "@/components/shared/ConversionDialog";
import { OzetBakiyeModal } from "@/components/shared/OzetBakiyeModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Zod schema ─────────────────────────────────────────────────
const schema = z.object({
  firstName: z.string().min(2, "En az 2 karakter").max(50, "En fazla 50 karakter"),
  lastName: z.string().min(2, "En az 2 karakter").max(50, "En fazla 50 karakter"),
  type: z.number().int().min(0, "Müşteri tipi seçiniz"),
  phone: z.string().optional().nullable().superRefine((val, ctx) => {
    if (!val || val.trim() === "") return;
    
    const parts = val.split(" ");
    if (parts.length < 2) return;

    const code = parts[0];
    const num = parts.slice(1).join("").replace(/\D/g, "");

    // Eğer numara kısmı tamamen boşsa validasyona girme
    if (num.length === 0) return;

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
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [customerTypes, setCustomerTypes] = useState<CustomerTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoKey, setPhotoKey] = useState(0);

  const [activeTab, setActiveTab] = useState<"all" | "conversions">("all");
  const [ozetOpen, setOzetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhotoOpen, setDeletePhotoOpen] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Transaction | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phoneWarningOpen, setPhoneWarningOpen] = useState(false);
  const [pendingUpdateReq, setPendingUpdateReq] = useState<CustomerUpdateRequest | null>(null);

  // Restore States
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreOption, setRestoreOption] = useState<"keep" | "reset">("keep");
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);

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
      const [c, b, t, at, ct] = await Promise.all([
        customerApi.getById(id),
        balanceApi.getByCustomer(id),
        transactionApi.getByCustomer(id),
        assetTypeApi.getAll(),
        customerTypeApi.getAll(),
      ]);
      setCustomer(c);
      if (id) breadcrumbLabelRegistry.set(id, `${c.firstName} ${c.lastName}`);
      setBalances(b.filter((bal) => bal.amount !== 0));
      setTransactions(t);
      setAssetTypes(at.filter((a) => a.isActive));
      setCustomerTypes(ct);
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
    
    const allowedTypes = [
      "image/jpeg", 
      "image/png", 
      "image/webp", 
      "image/svg+xml", 
      "image/gif", 
      "image/avif",
      "image/heic",
      "image/heif"
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Desteklenmeyen dosya formatı. Lütfen JPG, PNG, WebP veya SVG yükleyin.");
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

  const executePhotoDelete = async () => {
    if (!id || !customer?.hasPhoto) return;
    
    try {
      await customerApi.deletePhoto(id);
      toast.success("Fotoğraf silindi");
      setPhotoKey((k) => k + 1);
      setCustomer((c) => c ? { ...c, hasPhoto: false } : c);
      setDeletePhotoOpen(false);
    } catch {
      toast.error("Fotoğraf silinemedi");
    }
  };

  // ── Düzenleme ──────────────────────────────────────────────
  const openEdit = () => {
    if (!customer) return;
    reset({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      type: customer.type,
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
        phone: values.phone || undefined,
        type: values.type,
        nationalId: values.nationalId || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        notes: values.notes || undefined,
      };
      const updated = await customerApi.update(id, req);
      setCustomer(updated);
      breadcrumbLabelRegistry.set(id, `${updated.firstName} ${updated.lastName}`);
      toast.success("Müşteri güncellendi");
      setEditOpen(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error;
      if (errorMsg === "PHONE_EXISTS") {
        const req: CustomerUpdateRequest = {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone || undefined,
          type: values.type,
          nationalId: values.nationalId || undefined,
          email: values.email || undefined,
          address: values.address || undefined,
          notes: values.notes || undefined,
        };
        setPendingUpdateReq(req);
        setPhoneWarningOpen(true);
      } else {
        toast.error(errorMsg || "Güncelleme başarısız");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneWarningConfirm = async () => {
    if (!id || !pendingUpdateReq) return;
    try {
      setSaving(true);
      setPhoneWarningOpen(false);
      const updated = await customerApi.update(id, { ...pendingUpdateReq, ignorePhoneWarning: true });
      setCustomer(updated);
      breadcrumbLabelRegistry.set(id, `${updated.firstName} ${updated.lastName}`);
      toast.success("Müşteri güncellendi");
      setEditOpen(false);
      setPendingUpdateReq(null);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Güncelleme başarısız";
      toast.error(msg);
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

  const handleRestoreSelect = () => {
    setRestoreOpen(false);
    setRestoreConfirmOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (!id) return;
    try {
      const resetBalances = restoreOption === "reset";
      await customerApi.restore(id, resetBalances);
      toast.success("Müşteri başarıyla aktif edildi");
      setRestoreConfirmOpen(false);
      loadAll();
    } catch {
      toast.error("Müşteri aktif edilemedi");
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
  const depositCount = useMemo(
    () => transactions.filter((t) => t.type === "Deposit").length,
    [transactions]
  );
  const withdrawalCount = useMemo(
    () => transactions.filter((t) => t.type === "Withdrawal").length,
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
        title={
          <div className="flex items-center gap-3">
            {customer.fullName}
            {customer.isDeleted && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                {t("customers.filter.deleted")}
              </span>
            )}
          </div>
        }
        description="Müşteri detayı"
        actions={
          customer.isDeleted ? (
            <Button size="sm" onClick={() => setRestoreOpen(true)} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
              <RefreshCw className="h-4 w-4" />
              Müşteriyi Aktif Et
            </Button>
          ) : (
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
          )
        }
      />

      <div className={customer.isDeleted ? "opacity-50 pointer-events-none grayscale transition-opacity" : ""}>
      {/* Bilgi Kartı — Tam genişlik, 3 sütun: Avatar | Bilgiler | Portföy */}
      <Card>
        <CardContent className="p-6">
          {/* Mobil: alt alta — Masaüstü: 3 sütun yan yana, aralarda divider */}
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-0 sm:divide-x sm:divide-border">

            {/* Sol — Büyük Avatar ve İşlem Butonları */}
            <div className="flex flex-col items-center justify-center sm:pr-8 sm:pl-4 shrink-0 gap-3">
              <Avatar
                className={`h-32 w-32 border-4 border-background shadow-md ${customer.hasPhoto ? "cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" : ""}`}
                onClick={() => {
                  if (customer.hasPhoto) setPhotoViewerOpen(true);
                }}
                title={customer.hasPhoto ? "Orijinal boyutu gör" : undefined}
              >
                {customer.hasPhoto && (
                  <AvatarImage
                    key={photoKey}
                    src={`${customerApi.getPhotoUrl(customer.id)}?v=${photoKey}`}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="text-3xl font-bold bg-primary/10">{initials}</AvatarFallback>
              </Avatar>
              
              {/* Fotoğraf İşlem Butonları */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-3 w-3 mr-1.5" />
                  Güncelle
                </Button>

                {customer.hasPhoto && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs text-destructive border-destructive/20 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeletePhotoOpen(true)}
                  >
                    <Trash2 className="h-3 w-3 mr-1.5" />
                    Kaldır
                  </Button>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif,image/avif"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Orta — Müşteri Bilgileri */}
            <div className="flex flex-col justify-center sm:w-[35%] sm:px-8">
              <div className="space-y-1.5">
                <div className="flex flex-col items-start gap-1.5 mb-2">
                  <h2 className="text-2xl font-bold">{customer.fullName}</h2>
                  {(() => {
                    const cfg = customerTypes.find((t) => t.value === Number(customer.type));
                    if (!cfg) return null;
                    return (
                      <span
                        className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium"
                        style={{
                          backgroundColor: cfg.colorHex + "22",
                          color: cfg.colorHex,
                          border: `1px solid ${cfg.colorHex}44`,
                        }}
                      >
                        {cfg.name}
                      </span>
                    );
                  })()}
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
                  {customer.nationalId && (
                    <p className="text-sm text-muted-foreground">TC: {customer.nationalId}</p>
                  )}
                  {customer.address && (
                    <p className="text-sm text-muted-foreground mt-1">{customer.address}</p>
                  )}
                  {customer.notes && (
                    <p className="text-sm italic text-muted-foreground">{customer.notes}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Kayıt: {formatDateShort(customer.createdAt)}
                </p>
              </div>
            </div>

            {/* Sağ — Portföy Özeti */}
            {(() => {
              const assetMap = new Map(assetTypes.map((a) => [a.id, a]));
              const doviz = balances.filter((b) => b.unitType === "Currency");
              const altin = balances.filter((b) => b.unitType !== "Currency" && assetMap.get(b.assetTypeId)?.karat != null);
              const diger = balances.filter((b) => b.unitType !== "Currency" && assetMap.get(b.assetTypeId)?.karat == null);

              const groups = [
                { title: "Döviz", items: doviz },
                { title: "Altın", items: altin },
                { title: "Diğer", items: diger },
              ].filter((g) => g.items.length > 0);

              return (
                <div className="sm:flex-1 sm:pl-8 flex justify-center sm:justify-start items-start">
                  <div className="w-full max-w-xs">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Portföy
                      </p>
                      {balances.length > 0 && (
                        <button
                          onClick={() => printReceipt(customer!, groups)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          title="Portföyü Yazdır (Adisyon)"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {balances.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Bakiye yok</p>
                    ) : (
                      <div className="space-y-3">
                        {groups.map((g) => (
                          <div key={g.title}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1">
                              {g.title}
                            </p>
                            <div className="space-y-0.5">
                              {g.items.map((b) => {
                                const isPos = b.amount >= 0;
                                return (
                                  <div
                                    key={b.assetTypeId}
                                    className="grid grid-cols-2 gap-2 items-center rounded px-1.5 py-0.5 hover:bg-muted/50 transition-colors"
                                  >
                                    <span className="text-xs text-muted-foreground truncate">{b.assetTypeName}</span>
                                    <span
                                      className={`text-xs font-semibold tabular-nums text-right ${isPos ? "text-green-600" : "text-red-600"}`}
                                      style={{ textShadow: isPos ? "0 0 6px rgba(22,163,74,0.3)" : "0 0 6px rgba(220,38,38,0.3)" }}
                                    >
                                      {isPos ? "+" : ""}{formatAmount(b.amount, b.unitType)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Müşteri Bakiye Hesapla butonu — üstte border, ortalı */}
          {balances.length > 0 && (
            <div className="mt-5 pt-5 border-t border-border flex justify-center">
              <button
                onClick={() => setOzetOpen(true)}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300"
                style={{
                  color: "var(--color-gold)",
                  background: "rgba(212,164,55,0.06)",
                  border: "1px solid rgba(212,164,55,0.3)",
                  boxShadow: "0 0 0 1px rgba(212,164,55,0.15), 0 2px 8px rgba(212,164,55,0.12), inset 0 1px 0 rgba(245,209,110,0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(212,164,55,0.12)";
                  e.currentTarget.style.borderColor = "rgba(212,164,55,0.6)";
                  e.currentTarget.style.boxShadow = "0 0 0 1px rgba(212,164,55,0.4), 0 4px 16px rgba(212,164,55,0.3), 0 0 28px rgba(212,164,55,0.15), inset 0 1px 0 rgba(245,209,110,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(212,164,55,0.06)";
                  e.currentTarget.style.borderColor = "rgba(212,164,55,0.3)";
                  e.currentTarget.style.boxShadow = "0 0 0 1px rgba(212,164,55,0.15), 0 2px 8px rgba(212,164,55,0.12), inset 0 1px 0 rgba(245,209,110,0.15)";
                }}
              >
                <span style={{ fontSize: "1rem", lineHeight: 1 }}>₺</span>
                Müşteri Bakiye Hesapla
              </button>
            </div>
          )}
        </CardContent>
      </Card>

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
      <div className="space-y-4">
        {/* Başlık + filtre butonları */}
        {(() => {
          const activeBtn =
            activeTab === "conversions" ? "conversions" :
            filters.type === "Deposit" ? "deposit" :
            filters.type === "Withdrawal" ? "withdrawal" : "all";

          const btn = (
            key: typeof activeBtn,
            label: string,
            count: number,
            color: "grey" | "green" | "red" | "blue",
            onClick: () => void
          ) => {
            const isActive = activeBtn === key;
            const colorMap = {
              grey:  { text: "text-slate-600",  activeBg: "bg-slate-50",  badge: "bg-slate-200 text-slate-600",  idleBorder: "rgba(100,116,139,0.35)", activeShadow: "0 0 0 1.5px rgba(100,116,139,0.55), 0 3px 12px rgba(100,116,139,0.22), inset 0 1px 0 rgba(255,255,255,0.5)" },
              green: { text: "text-green-600",  activeBg: "bg-green-50",  badge: "bg-green-100 text-green-700",  idleBorder: "rgba(22,163,74,0.35)",    activeShadow: "0 0 0 1.5px rgba(22,163,74,0.65), 0 3px 14px rgba(22,163,74,0.30), 0 0 22px rgba(22,163,74,0.14), inset 0 1px 0 rgba(134,239,172,0.35)" },
              red:   { text: "text-red-600",    activeBg: "bg-red-50",    badge: "bg-red-100 text-red-700",      idleBorder: "rgba(220,38,38,0.35)",    activeShadow: "0 0 0 1.5px rgba(220,38,38,0.65), 0 3px 14px rgba(220,38,38,0.28), 0 0 22px rgba(220,38,38,0.13), inset 0 1px 0 rgba(252,165,165,0.35)" },
              blue:  { text: "text-blue-600",   activeBg: "bg-blue-50",   badge: "bg-blue-100 text-blue-700",    idleBorder: "rgba(37,99,235,0.35)",    activeShadow: "0 0 0 1.5px rgba(37,99,235,0.65), 0 3px 14px rgba(37,99,235,0.28), 0 0 22px rgba(37,99,235,0.13), inset 0 1px 0 rgba(147,197,253,0.35)" },
            }[color];
            return (
              <button
                key={key}
                onClick={onClick}
                style={{
                  boxShadow: isActive
                    ? colorMap.activeShadow
                    : `0 0 0 1px ${colorMap.idleBorder}`,
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border-0 transition-all duration-200 ${
                  isActive
                    ? `${colorMap.activeBg} ${colorMap.text}`
                    : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive ? colorMap.badge : "bg-muted text-muted-foreground"
                }`}>
                  {count}
                </span>
              </button>
            );
          };

          return (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold">İşlem Geçmişi</h3>
              <div className="flex flex-wrap gap-2">
                {btn("all", "Tüm İşlemler", transactions.length, "grey", () => {
                  setActiveTab("all");
                  setFilters((f) => ({ ...f, type: "all" }));
                })}
                {btn("deposit", "Yatırma", depositCount, "green", () => {
                  setActiveTab("all");
                  setFilters((f) => ({ ...f, type: "Deposit" }));
                })}
                {btn("withdrawal", "Çekme", withdrawalCount, "red", () => {
                  setActiveTab("all");
                  setFilters((f) => ({ ...f, type: "Withdrawal" }));
                })}
                {btn("conversions", "Dönüşümler", conversionTxs.length, "blue", () => {
                  setActiveTab("conversions");
                })}
              </div>
            </div>
          );
        })()}

        {activeTab === "all" && (
          <div className="space-y-3">
            {/* Filtreler */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
          </div>
        )}

        {activeTab === "conversions" && (
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
        )}
      </div>
      </div>

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
              <Label>Müşteri Tipi *</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tip seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerTypes.filter((t) => t.isActive).map((t) => (
                        <SelectItem key={t.id} value={String(t.value)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    value={field.value ?? undefined}
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

      {/* Fotoğraf Silme Onay Dialog */}
      <ConfirmDialog
        open={deletePhotoOpen}
        onOpenChange={setDeletePhotoOpen}
        title="Fotoğrafı Kaldır"
        description="Müşteri fotoğrafını silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmLabel="Kaldır"
        onConfirm={executePhotoDelete}
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

      {/* Özet Bakiye Hesaplama */}
      <OzetBakiyeModal
        open={ozetOpen}
        onOpenChange={setOzetOpen}
        balances={balances}
        assetTypes={assetTypes}
      />

      {/* Fotoğraf Görüntüleme Dialog */}
      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="max-w-4xl p-1 bg-transparent border-none shadow-none flex justify-center items-center">
          {customer?.hasPhoto && (
            <img
              src={`${customerApi.getPhotoUrl(customer.id)}?v=${photoKey}`}
              alt={customer.fullName}
              className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl ring-4 ring-background/10"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Telefon Numarası Mükerrer Uyarısı */}
      <ConfirmDialog
        open={phoneWarningOpen}
        onOpenChange={(open) => {
          setPhoneWarningOpen(open);
          if (!open) setPendingUpdateReq(null);
        }}
        title="Telefon Numarası Mevcut"
        description="Bu telefon numarası başka bir müşteride zaten kayıtlı. Yine de güncellemek istediğinize emin misiniz?"
        confirmLabel="Evet, Güncelle"
        cancelLabel="İptal"
        onConfirm={handlePhoneWarningConfirm}
      />

      {/* Restore Dialogs */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Müşteriyi Aktif Et</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Müşteriyi yeniden aktif ederken varlık durumunu nasıl ayarlamak istersiniz?
            </p>
            <div className="space-y-3">
              <label
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  restoreOption === "keep" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="restoreOption"
                  value="keep"
                  checked={restoreOption === "keep"}
                  onChange={() => setRestoreOption("keep")}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Son varlık değerleri kalsın</p>
                  <p className="text-xs text-muted-foreground">Müşterinin silindiği andaki portföy bakiyeleri aynen korunur.</p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  restoreOption === "reset" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="restoreOption"
                  value="reset"
                  checked={restoreOption === "reset"}
                  onChange={() => setRestoreOption("reset")}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Sıfırlanarak aktif edilsin</p>
                  <p className="text-xs text-muted-foreground">Müşterinin tüm varlık bakiyeleri sıfırlanır, eski hesapları kapatılır.</p>
                </div>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleRestoreSelect} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
              Devam Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={restoreConfirmOpen}
        onOpenChange={setRestoreConfirmOpen}
        title="İşlemi Onayla"
        description={
          restoreOption === "keep"
            ? "Müşteri, hesabındaki mevcut bakiyeleriyle birlikte tekrar aktif edilecektir. Onaylıyor musunuz?"
            : "Müşterinin tüm bakiyeleri sıfırlanacak ve müşteri bu şekilde aktif edilecektir. Bu işlem geri alınamaz. Onaylıyor musunuz?"
        }
        onConfirm={handleRestoreConfirm}
        confirmLabel="Evet, Aktif Et"
        cancelLabel="İptal"
      />
    </div>
  );
}
