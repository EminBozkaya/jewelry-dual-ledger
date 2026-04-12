import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { customerApi } from "@/api/customers";
import { customerTypeApi } from "@/api/customer-types";
import type { Customer, CustomerCreateRequest, CustomerTypeConfig } from "@/types";
import { formatDateShort } from "@/lib/formatters";

import { isValidTC } from "@/lib/validations";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { CustomerTypeFilter } from "@/components/shared/CustomerTypeFilter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  email: z.string().optional().refine((v) => !v || z.string().email().safeParse(v).success, "Geçerli e-posta"),
  address: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const exportColumns: ExportColumn[] = [
  { header: "Ad Soyad", accessor: "fullName" },
  { header: "Telefon", accessor: "phone" },
  { header: "Kayıt Tarihi", accessor: "createdAt", formatter: (v) => formatDateShort(v as string) },
];

// ── Bileşen ───────────────────────────────────────────────────
export function CustomerListPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerTypes, setCustomerTypes] = useState<CustomerTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<number[]>([]);

  const filteredCustomers = useMemo(() => {
    if (selectedCustomerTypes.length === 0) return customers;
    return customers.filter((c) => selectedCustomerTypes.includes(Number(c.type)));
  }, [customers, selectedCustomerTypes]);

  // Tip bilgisine göre badge render yardımcısı
  const resolveType = (value: number | string) => {
    const v = Number(value);
    return customerTypes.find((t) => t.value === v);
  };

  // Dinamik sütunlar (customerTypes yüklenince badge güncellensin diye içeride)
  // Fotoğraf cache-busting: veri her yüklendiğinde artırılır
  const [photoVersion, setPhotoVersion] = useState(0);

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
      header: "Ad Soyad",
      cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
    },
    {
      accessorKey: "type",
      header: "Müşteri Tipi",
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
      header: "Telefon",
      enableSorting: false,
    },
    {
      accessorKey: "createdAt",
      header: "Kayıt Tarihi",
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

  const load = async () => {
    try {
      setLoading(true);
      const [data, types] = await Promise.all([
        customerApi.getAll(),
        customerTypeApi.getAll(),
      ]);
      setCustomers(data);
      setCustomerTypes(types);
      setPhotoVersion((v) => v + 1);
    } catch {
      toast.error("Veriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (values: FormValues) => {
    try {
      setSaving(true);
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
      await customerApi.create(req);
      toast.success("Müşteri oluşturuldu");
      reset();
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Müşteri oluşturulamadı";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Müşteriler"
        description="Kayıtlı müşteri listesi"
        actions={
          <Button onClick={() => { reset(); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Müşteri
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
          Toplam <span className="text-foreground font-bold">{filteredCustomers.length}</span> müşteri listeleniyor
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredCustomers}
        searchPlaceholder="Müşteri adı, telefon veya TC ile ara..."
        isLoading={loading}
        emptyMessage="Henüz müşteri eklenmemiş"
        onRowClick={(c) => navigate(`/customers/${c.id}`)}
        exportFilename="musteri-listesi"
        exportColumns={exportColumns}
      />

      {/* Yeni Müşteri Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Yeni Müşteri
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Ad *</Label>
                <Input id="firstName" {...register("firstName")} maxLength={50} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Soyad *</Label>
                <Input id="lastName" {...register("lastName")} maxLength={50} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">Müşteri Tipi *</Label>
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
              <Label htmlFor="phone">Telefon</Label>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    id="phone"
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
              <Label htmlFor="nationalId">TC Kimlik No</Label>
              <Input id="nationalId" {...register("nationalId")} maxLength={11} />
              {errors.nationalId && (
                <p className="text-xs text-destructive">{errors.nationalId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Adres</Label>
              <Textarea id="address" {...register("address")} rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea id="notes" {...register("notes")} rows={2} />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 px-6"
                onClick={() => setDialogOpen(false)}
              >
                İptal
              </Button>
              <Button type="submit" disabled={saving} className="min-h-11 px-6">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
