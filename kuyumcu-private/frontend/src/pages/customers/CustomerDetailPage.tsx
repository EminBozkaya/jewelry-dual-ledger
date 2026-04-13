import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { format } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import { Pencil, Trash2, Upload, Banknote, ArrowUpFromLine, RefreshCw, Printer, Calendar as CalendarIcon } from "lucide-react";
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
import { formatDate, formatDateShort, formatTransactionType, formatCustomerType, formatAmount } from "@/lib/formatters";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ── Zod schema ─────────────────────────────────────────────────
const schema = z.object({
  firstName: z.string().min(2, "min_2").max(50, "max_50"),
  lastName: z.string().min(2, "min_2").max(50, "max_50"),
  type: z.number().int().min(0, "select_type"),
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
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "phone_10_digits" });
      }
    } else {
      if (num.length < 5) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "phone_invalid" });
      }
    }
  }),
  nationalId: z
    .string()
    .optional()
    .refine((v) => !v || isValidTC(v), "national_id_invalid"),
  email: z
    .string()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "email_invalid"),
  address: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ── İşlem tipi badge rengi ────────────────────────────────────
function TransactionTypeBadge({ type }: { type: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    Deposit: "bg-green-100 text-green-800",
    Withdrawal: "bg-red-100 text-red-800",
    Conversion: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[type] ?? "bg-muted text-muted-foreground"}`}
    >
      {formatTransactionType(type, t)}
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
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("customerDetail.cancel.title")}</DialogTitle>
        </DialogHeader>
        {transaction && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1 mb-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("customerDetail.cancel.type")}</span>
              <span>{formatTransactionType(transaction.type)}</span>
            </div>
            {transaction.amount != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("customerDetail.cancel.amount")}</span>
                <span>{formatAmount(transaction.amount, "Piece")} {transaction.assetTypeCode}</span>
              </div>
            )}
          </div>
        )}
        <div className="space-y-2 py-1">
          <Label>{t("customerDetail.cancel.reason")} *</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={t("customerDetail.cancel.reasonPlaceholder")}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("customerDetail.cancel.back")}
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            {t("customerDetail.cancel.confirm")}
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
      toast.error(t("customerDetail.loadError"));
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
      toast.error(t("customerDetail.dataLoadError"));
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
      toast.error(t("customerDetail.photoFormatError"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("customerDetail.photoSizeError"));
      return;
    }
    try {
      await customerApi.uploadPhoto(id, file);
      toast.success(t("customerDetail.photoUploadSuccess"));
      setPhotoKey((k) => k + 1);
      setCustomer((c) => c ? { ...c, hasPhoto: true } : c);
    } catch {
      toast.error(t("customerDetail.photoUploadError"));
    }
    e.target.value = "";
  };

  const executePhotoDelete = async () => {
    if (!id || !customer?.hasPhoto) return;
    
    try {
      await customerApi.deletePhoto(id);
      toast.success(t("customerDetail.photoDeleteSuccess"));
      setPhotoKey((k) => k + 1);
      setCustomer((c) => c ? { ...c, hasPhoto: false } : c);
      setDeletePhotoOpen(false);
    } catch {
      toast.error(t("customerDetail.photoDeleteError"));
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
      toast.success(t("customerDetail.updateSuccess"));
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
        toast.error(errorMsg || t("customerDetail.updateError"));
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
      toast.success(t("customerDetail.updateSuccess"));
      setEditOpen(false);
      setPendingUpdateReq(null);
    } catch (err: any) {
      const msg = err.response?.data?.error || t("customerDetail.defaultError");
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
      toast.success(t("customerDetail.deleteSuccess"));
      navigate("/customers");
    } catch {
      toast.error(t("customerDetail.deleteError"));
    }
  };

  // ── İşlem iptali ──────────────────────────────────────────
  const handleCancel = async (reason: string) => {
    if (!cancelTarget) return;
    try {
      await transactionApi.cancel(cancelTarget.id, reason);
      toast.success(t("customerDetail.cancelSuccess"));
      setCancelTarget(null);
      await refreshData();
    } catch {
      toast.error(t("customerDetail.cancelError"));
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
      toast.success(t("customerDetail.activateSuccess"));
      setRestoreConfirmOpen(false);
      loadAll();
    } catch {
      toast.error(t("customerDetail.activateError"));
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
      header: t("customerDetail.columns.date"),
      cell: ({ getValue }) => formatDate(getValue<string>()),
    },
    {
      accessorKey: "type",
      header: t("customerDetail.columns.type"),
      cell: ({ getValue }) => <TransactionTypeBadge type={getValue<string>()} />,
    },
    {
      id: "asset",
      header: t("customerDetail.columns.asset"),
      cell: ({ row }) => {
        const tx = row.original;
        if (tx.type === "Conversion" && tx.conversion) {
          return (
            <span className="text-sm">
              {tx.conversion.fromAssetCode} → {tx.conversion.toAssetCode}
            </span>
          );
        }
        return <span className="text-sm">{tx.assetTypeName ?? "—"}</span>;
      },
    },
    {
      id: "amount",
      header: t("customerDetail.columns.amount"),
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
      header: t("customerDetail.columns.description"),
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="hidden md:block max-w-[160px] truncate text-sm text-muted-foreground" title={getValue<string>()}>
          {getValue<string>() ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "createdByFullName",
      header: t("customerDetail.columns.by"),
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="hidden lg:block text-sm">{getValue<string>()}</span>
      ),
    },
    {
      id: "status",
      header: t("customerDetail.columns.status"),
      enableSorting: false,
      cell: ({ row }) => {
        const tx = row.original;
        if (tx.isCancelled) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Badge variant="destructive" className="text-xs cursor-help">
                    {t("customerDetail.status.cancelled")}
                  </Badge>
                </span>
              </TooltipTrigger>
              {tx.cancelReason && (
                <TooltipContent>
                  <p className="max-w-[200px]">{tx.cancelReason}</p>
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
                setCancelTarget(tx);
              }}
            >
              {t("customerDetail.cancel.confirm")}
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
    return <p className="text-muted-foreground">{t("customerDetail.notFound")}</p>;
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
        description={t("customerDetail.pageDescription")}
        actions={
          customer.isDeleted ? (
            <Button size="sm" onClick={() => setRestoreOpen(true)} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
              <RefreshCw className="h-4 w-4" />
              {t("customerDetail.activateTitle")}
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={openEdit} className="gap-2">
                <Pencil className="h-4 w-4" />
                {t("customerDetail.buttons.edit")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                {t("customerDetail.buttons.delete")}
              </Button>
            </>
          )
        }
      />

      <div className={`space-y-8 ${customer.isDeleted ? "opacity-50 pointer-events-none grayscale transition-opacity" : ""}`}>
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
                title={customer.hasPhoto ? t("customerDetail.viewPhotoLabel") : undefined}
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
                  {t("customerDetail.buttons.uploadPhoto")}
                </Button>

                {customer.hasPhoto && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs text-destructive border-destructive/20 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeletePhotoOpen(true)}
                  >
                    <Trash2 className="h-3 w-3 mr-1.5" />
                    {t("customerDetail.buttons.removePhoto")}
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
                    const cfg = customerTypes.find((ct) => ct.value === Number(customer.type));
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
                        {formatCustomerType(cfg.value, t)}
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
                  {t("customerDetail.registrationLabel")} {formatDateShort(customer.createdAt)}
                </p>
              </div>
            </div>

            {/* Sağ — Portföy Özeti */}
            {(() => {
              const assetMap = new Map(assetTypes.map((a) => [a.id, a]));
              const doviz = balances.filter((b) => b.unitType === "Currency");
              const altin = balances.filter((b) => b.unitType !== "Currency" && assetMap.get(b.assetTypeId)?.karat != null);
              const diger = balances.filter((b) => b.unitType !== "Currency" && assetMap.get(b.assetTypeId)?.karat == null);

              const groupsWithKeys = [
                { titleKey: "currency", items: doviz },
                { titleKey: "gold", items: altin },
                { titleKey: "other", items: diger },
              ].filter((g) => g.items.length > 0);

              const printGroups = groupsWithKeys.map((g) => ({
                title: t(`customerDetail.assetGroups.${g.titleKey}`),
                items: g.items,
              }));

              return (
                <div className="sm:flex-1 sm:pl-8 flex justify-center sm:justify-start items-start">
                  <div className="w-full max-w-xs">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {t("customerDetail.portfolio")}
                      </p>
                      {balances.length > 0 && (
                        <button
                          onClick={() => printReceipt(customer!, printGroups, t)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          title={t("customerDetail.printPortfolioLabel")}
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {balances.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">{t("customerDetail.noBalance")}</p>
                    ) : (
                      <div className="space-y-3">
                        {groupsWithKeys.map((g) => (
                          <div key={g.titleKey}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1">
                              {t(`customerDetail.assetGroups.${g.titleKey}`)}
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
                {t("customerDetail.buttons.calculateBalance")}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* İşlem Butonları */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Button
          className="flex-1 gap-2 min-h-11 bg-green-600 hover:bg-green-700"
          onClick={() => setDepositOpen(true)}
        >
          <Banknote className="h-4 w-4" />
          {t("customerDetail.buttons.deposit")}
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2 min-h-11 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
          onClick={() => setWithdrawOpen(true)}
        >
          <ArrowUpFromLine className="h-4 w-4" />
          {t("customerDetail.buttons.withdraw")}
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2 min-h-11"
          onClick={() => setConvertOpen(true)}
        >
          <RefreshCw className="h-4 w-4" />
          {t("customerDetail.buttons.convert")}
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
              <h3 className="text-base font-semibold">{t("customerDetail.sections.transactionHistory")}</h3>
              <div className="flex flex-wrap gap-3">
                {btn("all", t("customerDetail.allTransactions"), transactions.length, "grey", () => {
                  setActiveTab("all");
                  setFilters((f) => ({ ...f, type: "all" }));
                })}
                {btn("deposit", t("customerDetail.deposits"), depositCount, "green", () => {
                  setActiveTab("all");
                  setFilters((f) => ({ ...f, type: "Deposit" }));
                })}
                {btn("withdrawal", t("customerDetail.withdrawals"), withdrawalCount, "red", () => {
                  setActiveTab("all");
                  setFilters((f) => ({ ...f, type: "Withdrawal" }));
                })}
                {btn("conversions", t("customerDetail.conversions"), conversionTxs.length, "blue", () => {
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
                  <SelectValue placeholder={t("customerDetail.allAssets")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("customerDetail.allAssets")}</SelectItem>
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
                  <SelectValue placeholder={t("customerDetail.allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("customerDetail.allStatuses")}</SelectItem>
                  <SelectItem value="active">{t("customerDetail.activeStatus")}</SelectItem>
                  <SelectItem value="cancelled">{t("customerDetail.cancelledStatus")}</SelectItem>
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
                  {t("customerDetail.transactions.filtersClear")}
                </Button>
              </div>
            </div>

            {/* Tarih aralığı */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("customerDetail.transactions.dateFrom")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal min-h-9 text-sm"
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {filters.dateFrom ? format(new Date(filters.dateFrom + "T00:00:00"), "dd MMM yyyy", { locale: i18n.language === "tr" ? tr : enUS }) : t("customerDetail.transactions.selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom ? new Date(filters.dateFrom + "T00:00:00") : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFilters((f) => ({ ...f, dateFrom: format(date, "yyyy-MM-dd") }));
                        }
                      }}
                      disabled={(date) => filters.dateTo ? date > new Date(filters.dateTo + "T00:00:00") : false}
                      locale={i18n.language === "tr" ? tr : enUS}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("customerDetail.transactions.dateTo")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal min-h-9 text-sm"
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {filters.dateTo ? format(new Date(filters.dateTo + "T00:00:00"), "dd MMM yyyy", { locale: i18n.language === "tr" ? tr : enUS }) : t("customerDetail.transactions.selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo ? new Date(filters.dateTo + "T00:00:00") : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFilters((f) => ({ ...f, dateTo: format(date, "yyyy-MM-dd") }));
                        }
                      }}
                      disabled={(date) => filters.dateFrom ? date < new Date(filters.dateFrom + "T00:00:00") : false}
                      locale={i18n.language === "tr" ? tr : enUS}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <DataTable
              columns={txColumns}
              data={filteredTransactions}
              searchPlaceholder={t("customerDetail.transactions.searchPlaceholder")}
              emptyMessage={t("customerDetail.transactions.emptyMessage")}
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
                header: t("customerDetail.conversionTableColumns.date"),
                cell: ({ getValue }) => formatDate(getValue<string>()),
              },
              {
                id: "from",
                header: t("customerDetail.conversionTableColumns.source"),
                cell: ({ row }) => {
                  const c = row.original.conversion;
                  return c ? `${c.fromAssetName} — ${formatAmount(c.fromAmount, "Piece")}` : "—";
                },
              },
              {
                id: "tryEq",
                header: t("customerDetail.conversionTableColumns.trEquivalent"),
                cell: ({ row }) => {
                  const c = row.original.conversion;
                  return c ? `${c.tryEquivalent.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺` : "—";
                },
              },
              {
                id: "to",
                header: t("customerDetail.conversionTableColumns.target"),
                cell: ({ row }) => {
                  const c = row.original.conversion;
                  return c ? `${c.toAssetName} — ${formatAmount(c.toAmount, "Piece")}` : "—";
                },
              },
              {
                id: "rate",
                header: t("customerDetail.conversionTableColumns.rateSource"),
                cell: ({ row }) => row.original.conversion?.rateSource ?? "—",
              },
            ]}
            data={conversionTxs}
            searchPlaceholder={t("customerDetail.conversionsTable.searchPlaceholder")}
            emptyMessage={t("customerDetail.conversionsTable.emptyMessage")}
          />
        )}
      </div>
      </div>

      {/* Düzenleme Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("customerDetail.form.title")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("customerDetail.form.firstNameRequired")}</Label>
                <Input {...register("firstName")} maxLength={50} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t("customerDetail.form.lastNameRequired")}</Label>
                <Input {...register("lastName")} maxLength={50} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("customerDetail.form.customerTypeRequired")}</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("customerDetail.form.selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                      {customerTypes.filter((ct) => ct.isActive).map((ct) => (
                        <SelectItem key={ct.id} value={String(ct.value)}>
                          {formatCustomerType(ct.value, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t("customerDetail.form.phone")}</Label>
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
              <Label>{t("customerDetail.form.nationalId")}</Label>
              <Input {...register("nationalId")} maxLength={11} />
              {errors.nationalId && (
                <p className="text-xs text-destructive">{errors.nationalId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("customerDetail.form.email")}</Label>
              <Input type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("customerDetail.form.address")}</Label>
              <Textarea {...register("address")} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("customerDetail.form.notes")}</Label>
              <Textarea {...register("notes")} rows={2} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditOpen(false)}>
                {t("customerDetail.form.cancel")}
              </Button>
              <Button type="submit" disabled={saving} className="min-h-11">
                {saving ? t("customerDetail.form.saving") : t("customerDetail.form.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("customerDetail.deleteConfirmTitle")}
        description={t("customerDetail.deleteConfirmDesc")}
        confirmLabel={t("customerDetail.delete")}
        onConfirm={handleDelete}
        destructive
      />

      {/* Fotoğraf Silme Onay Dialog */}
      <ConfirmDialog
        open={deletePhotoOpen}
        onOpenChange={setDeletePhotoOpen}
        title={t("customerDetail.deletePhotoTitle")}
        description={t("customerDetail.deletePhotoDesc")}
        confirmLabel={t("customerDetail.deletePhotoConfirm")}
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
        title={t("customerDetail.phoneExistsTitle")}
        description={t("customerDetail.phoneExistsDesc")}
        confirmLabel={t("customerDetail.phoneExistsConfirm")}
        cancelLabel={t("customerDetail.phoneExistsCancel")}
        onConfirm={handlePhoneWarningConfirm}
      />

      {/* Restore Dialogs */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("customerDetail.activateTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {t("customerDetail.activateDescription")}
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
                  <p className="text-sm font-medium">{t("customerDetail.activateKeepOption")}</p>
                  <p className="text-xs text-muted-foreground">{t("customerDetail.activateKeepOptionDesc")}</p>
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
                  <p className="text-sm font-medium">{t("customerDetail.activateResetOption")}</p>
                  <p className="text-xs text-muted-foreground">{t("customerDetail.activateResetOptionDesc")}</p>
                </div>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreOpen(false)}>
              {t("customerDetail.activateConfirmCancel")}
            </Button>
            <Button onClick={handleRestoreSelect} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
              {t("customerDetail.activateContinue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={restoreConfirmOpen}
        onOpenChange={setRestoreConfirmOpen}
        title={t("customerDetail.activateConfirmTitle")}
        description={
          restoreOption === "keep"
            ? t("customerDetail.activateConfirmDescKeep")
            : t("customerDetail.activateConfirmDescReset")
        }
        onConfirm={handleRestoreConfirm}
        confirmLabel={t("customerDetail.activateConfirm")}
        cancelLabel={t("customerDetail.activateConfirmCancel")}
      />
    </div>
  );
}
