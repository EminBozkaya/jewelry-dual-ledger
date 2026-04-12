import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { customerApi } from "@/api/customers";
import type { Customer, CustomerCreateRequest } from "@/types";
import { formatDateShort } from "@/lib/formatters";

import { isValidTC } from "@/lib/validations";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
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
import { Textarea } from "@/components/ui/textarea";

import type { ColumnDef } from "@tanstack/react-table";
import type { ExportColumn } from "@/components/shared/ExportButtons";

// ── Zod schema ────────────────────────────────────────────────
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
  email: z.string().optional().refine((v) => !v || z.string().email().safeParse(v).success, "Geçerli e-posta"),
  address: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ── Tablo sütunları ───────────────────────────────────────────
const columns: ColumnDef<Customer>[] = [
  {
    id: "avatar",
    header: "",
    enableSorting: false,
    cell: ({ row }) => {
      const c = row.original;
      const initials = `${c.firstName[0]}${c.lastName[0]}`.toUpperCase();
      return (
        <Avatar className="h-9 w-9 hidden sm:flex">
          {c.hasPhoto && (
            <AvatarImage src={customerApi.getPhotoUrl(c.id)} />
          )}
          <AvatarFallback className="text-xs bg-primary/10">{initials}</AvatarFallback>
        </Avatar>
      );
    },
  },
  {
    accessorKey: "fullName",
    header: "Ad Soyad",
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue<string>()}</span>
    ),
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

const exportColumns: ExportColumn[] = [
  { header: "Ad Soyad", accessor: "fullName" },
  { header: "Telefon", accessor: "phone" },
  { header: "Kayıt Tarihi", accessor: "createdAt", formatter: (v) => formatDateShort(v as string) },
];

// ── Bileşen ───────────────────────────────────────────────────
export function CustomerListPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
      const data = await customerApi.getAll();
      setCustomers(data);
    } catch {
      toast.error("Müşteriler yüklenemedi");
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
        phone: values.phone,
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
    } catch {
      toast.error("Müşteri oluşturulamadı");
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

      <DataTable
        columns={columns}
        data={customers}
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
              <Label htmlFor="phone">Telefon *</Label>
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
