import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { customerApi } from "@/api/customers";
import { customerTypeApi } from "@/api/customer-types";
import type { Customer, CustomerCreateRequest, CustomerTypeConfig } from "@/types";
import { formatDateShort } from "@/lib/formatters";

import { isValidTC } from "@/lib/validations";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CustomerTypeFilter } from "@/components/shared/CustomerTypeFilter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

import type { ColumnDef } from "@tanstack/react-table";
import type { ExportColumn } from "@/components/shared/ExportButtons";

// ── Zod schema ────────────────────────────────────────────────
const schema = z.object({
  firstName: z.string().min(2, "min_2_chars").max(50, "max_50_chars"),
  lastName: z.string().min(2, "min_2_chars").max(50, "max_50_chars"),
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
  email: z.string().optional().refine((v) => !v || z.string().email().safeParse(v).success, "email_invalid"),
  address: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ── Bileşen ───────────────────────────────────────────────────
export function CustomerListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerTypes, setCustomerTypes] = useState<CustomerTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phoneWarningOpen, setPhoneWarningOpen] = useState(false);
  const [pendingCreateReq, setPendingCreateReq] = useState<CustomerCreateRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "deleted" | "all">("active");

  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<number[]>([]);

  const filteredCustomers = useMemo(() => {
    if (selectedCustomerTypes.length === 0) return customers;
    return customers.filter((c) => selectedCustomerTypes.includes(Number(c.type)));
  }, [customers, selectedCustomerTypes]);

  const validationMsg = (msg: string | undefined) => {
    const map: Record<string, string> = {
      "min_2_chars": t("customers.validation.minChars"),
      "max_50_chars": t("customers.validation.maxChars"),
      "select_type": t("customers.validation.selectType"),
      "phone_10_digits": t("customers.validation.phoneDigits"),
      "phone_invalid": t("customers.validation.phoneInvalid"),
      "national_id_invalid": t("customers.validation.nationalIdInvalid"),
      "email_invalid": t("customers.validation.emailInvalid"),
    };
    return msg ? (map[msg] ?? msg) : "";
  };

  // Tip bilgisine göre badge render yardımcısı
  const resolveType = (value: number | string) => {
    const v = Number(value);
    return customerTypes.find((ct) => ct.value === v);
  };

  // Dinamik sütunlar (customerTypes yüklenince badge güncellensin diye içeride)
  // Fotoğraf cache-busting: veri her yüklendiğinde artırılır
  const [photoVersion, setPhotoVersion] = useState(0);

  const exportColumns: ExportColumn[] = [
    { header: t("customers.export.name"), accessor: "fullName" },
    { header: t("customers.export.phone"), accessor: "phone" },
    { header: t("customers.export.registrationDate"), accessor: "createdAt", formatter: (v) => formatDateShort(v as string) },
  ];

  const columns: ColumnDef<Customer>[] = [
    {
      id: "avatar",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const c = row.original;
        const initials = `${c.firstName[0]}${c.lastName[0]}`.toUpperCase();
        return (
          <Avatar className="h-10 w-10 hidden sm:flex border border-black/[0.05] dark:border-white/[0.05] shadow-sm">
            {c.hasPhoto && (
              <AvatarImage
                src={`${customerApi.getPhotoUrl(c.id)}?v=${photoVersion}`}
                className="object-cover"
                alt={c.fullName}
              />
            )}
            <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-600 dark:text-slate-400">
              {initials}
            </AvatarFallback>
          </Avatar>
        );
      },
    },
    {
      accessorKey: "fullName",
      header: t("customers.columns.name"),
      cell: ({ row }) => {
        const c = row.original;
        return (
          <span className="font-medium">
            {c.fullName}
            {c.isDeleted && (
              <span className="ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
                Silinmiş
              </span>
            )}
          </span>
        );
      },
    },
    {
      accessorKey: "type",
      header: t("customers.columns.type"),
      cell: ({ getValue }) => {
        const cfg = resolveType(getValue<number>());
        if (!cfg) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: cfg.colorHex + "22",
              color: cfg.colorHex,
              border: `1px solid ${cfg.colorHex}44`,
            }}
          >
            {cfg.name}
          </span>
        );
      },
    },
    {
      accessorKey: "phone",
      header: t("customers.columns.phone"),
      enableSorting: false,
    },
    {
      accessorKey: "createdAt",
      header: t("customers.columns.registrationDate"),
      cell: ({ getValue }) => (
        <span className="hidden md:block">{formatDateShort(getValue<string>())}</span>
      ),
    },
  ];

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const load = async (status?: "active" | "deleted" | "all") => {
    const s = status ?? statusFilter;
    try {
      setLoading(true);
      const includeDeleted = s === "all" ? null : s === "deleted" ? true : false;
      const [data, types] = await Promise.all([
        customerApi.getAll(includeDeleted),
        customerTypeApi.getAll(),
      ]);
      setCustomers(data);
      setCustomerTypes(types);
      setPhotoVersion((v) => v + 1);
    } catch {
      toast.error(t("customers.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = (s: "active" | "deleted" | "all") => {
    setStatusFilter(s);
    load(s);
  };

  const onSubmit = async (values: FormValues) => {
    const req: CustomerCreateRequest = {
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone || undefined,
      type: values.type,
      nationalId: values.nationalId || undefined,
      email: values.email || undefined,
      address: values.address || undefined,
      notes: values.notes || undefined,
    };
    try {
      setSaving(true);
      await customerApi.create(req);
      toast.success(t("customers.createSuccess"));
      reset();
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error;
      if (errorMsg === "PHONE_EXISTS") {
        setPendingCreateReq(req);
        setPhoneWarningOpen(true);
      } else {
        toast.error(errorMsg || t("customers.createError"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneWarningConfirm = async () => {
    if (!pendingCreateReq) return;
    try {
      setSaving(true);
      setPhoneWarningOpen(false);
      await customerApi.create({ ...pendingCreateReq, ignorePhoneWarning: true });
      toast.success(t("customers.createSuccess"));
      reset();
      setDialogOpen(false);
      setPendingCreateReq(null);
      await load();
    } catch (err: any) {
      const msg = err.response?.data?.error || t("customers.createError");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("customers.title")}
        description={t("customers.description")}
        actions={
          <Button onClick={() => { reset(); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("customers.newCustomer")}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
        <CustomerTypeFilter
          types={customerTypes}
          selectedTypes={selectedCustomerTypes}
          onChange={setSelectedCustomerTypes}
          className="w-full sm:w-auto"
        />
        <div className="text-xs text-muted-foreground font-medium bg-black/[0.03] dark:bg-white/[0.03] px-3 py-1.5 rounded-lg border border-black/[0.05] dark:border-white/[0.05]">
          {t("customers.total")} <span className="text-foreground font-bold">{filteredCustomers.length}</span> {t("customers.totalListed")}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredCustomers}
        searchPlaceholder={t("customers.searchPlaceholder")}
        isLoading={loading}
        emptyMessage={t("customers.noCustomers")}
        onRowClick={(c) => navigate(`/customers/${c.id}`)}
        exportFilename="musteri-listesi"
        exportColumns={exportColumns}
        getRowClassName={(row) => row.original.isDeleted ? "opacity-60" : ""}
        headerActions={
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 shrink-0">
            {([
              { key: "active" as const, label: "Aktif" },
              { key: "deleted" as const, label: "Silinmiş" },
              { key: "all" as const, label: "Tümü" },
            ]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleStatusChange(key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  statusFilter === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {/* Yeni Müşteri Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("customers.form.title")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">{t("customers.form.firstName")} *</Label>
                <Input id="firstName" {...register("firstName")} maxLength={50} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{validationMsg(errors.firstName.message)}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">{t("customers.form.lastName")} *</Label>
                <Input id="lastName" {...register("lastName")} maxLength={50} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{validationMsg(errors.lastName.message)}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">{t("customers.form.customerType")} *</Label>
              <Controller
                control={control}
                name="type"
                defaultValue={customerTypes[0]?.value ?? 0}
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("customers.form.selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                      {customerTypes.filter((ct) => ct.isActive).map((ct) => (
                        <SelectItem key={ct.id} value={String(ct.value)}>
                          {ct.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <p className="text-xs text-destructive">{validationMsg(errors.type.message)}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("customers.form.phone")}</Label>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    id="phone"
                    value={field.value ?? undefined}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{validationMsg(errors.phone.message)}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nationalId">{t("customers.form.nationalId")}</Label>
              <Input id="nationalId" {...register("nationalId")} maxLength={11} />
              {errors.nationalId && (
                <p className="text-xs text-destructive">{validationMsg(errors.nationalId.message)}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">{t("customers.form.email")}</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{validationMsg(errors.email.message)}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">{t("customers.form.address")}</Label>
              <Textarea id="address" {...register("address")} rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">{t("customers.form.notes")}</Label>
              <Textarea id="notes" {...register("notes")} rows={2} />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 px-6"
                onClick={() => setDialogOpen(false)}
              >
                {t("customers.form.cancel")}
              </Button>
              <Button type="submit" disabled={saving} className="min-h-11 px-6">
                {saving ? t("customers.form.saving") : t("customers.form.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Telefon Numarası Mükerrer Uyarısı */}
      <ConfirmDialog
        open={phoneWarningOpen}
        onOpenChange={(open) => {
          setPhoneWarningOpen(open);
          if (!open) setPendingCreateReq(null);
        }}
        title="Telefon Numarası Mevcut"
        description="Bu telefon numarası başka bir müşteride zaten kayıtlı. Yine de bu müşteriyi oluşturmak istediğinize emin misiniz?"
        confirmLabel="Evet, Oluştur"
        cancelLabel="İptal"
        onConfirm={handlePhoneWarningConfirm}
      />
    </div>
  );
}
