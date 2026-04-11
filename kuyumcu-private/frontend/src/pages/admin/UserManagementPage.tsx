import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, KeyRound, PowerOff, Power } from "lucide-react";

import { userApi, type UserUpdateRequest } from "@/api/users";
import type { User, UserCreateRequest } from "@/types";
import { useAuth } from "@/hooks/useAuth";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ── Zod şemaları ─────────────────────────────────────────────
const createSchema = z
  .object({
    fullName: z.string().min(2, "Ad soyad en az 2 karakter"),
    username: z.string().min(3, "Kullanıcı adı en az 3 karakter"),
    password: z.string().min(6, "Şifre en az 6 karakter"),
    confirmPassword: z.string(),
    role: z.enum(["Admin", "Staff"]),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

const editSchema = z.object({
  fullName: z.string().min(2, "Ad soyad en az 2 karakter"),
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter"),
  role: z.enum(["Admin", "Staff"]),
  isActive: z.boolean(),
});

const passwordSchema = z
  .object({
    newPassword: z.string().min(6, "Şifre en az 6 karakter"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

// ── Rol badge ────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  return role === "Admin"
    ? <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Admin</Badge>
    : <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Personel</Badge>;
}

// ── Durum badge ──────────────────────────────────────────────
function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive
    ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aktif</Badge>
    : <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">Pasif</Badge>;
}

// ── UserManagementPage ────────────────────────────────────────
export function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [toggleUser, setToggleUser] = useState<User | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const loadUsers = () => {
    setLoading(true);
    userApi
      .getAll()
      .then(setUsers)
      .catch(() => toast.error("Kullanıcılar yüklenemedi"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  // ── Yeni kullanıcı formu ──────────────────────────────────
  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { fullName: "", username: "", password: "", confirmPassword: "", role: "Staff" },
  });

  const handleCreate = async (data: CreateForm) => {
    setSubmitting(true);
    try {
      await userApi.create({ fullName: data.fullName, username: data.username, password: data.password, role: data.role });
      toast.success("Kullanıcı oluşturuldu");
      setCreateOpen(false);
      createForm.reset();
      loadUsers();
    } catch {
      toast.error("Kullanıcı oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Kullanıcı düzenleme formu ─────────────────────────────
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  const openEdit = (user: User) => {
    setEditUser(user);
    editForm.reset({ fullName: user.fullName, username: user.username, role: user.role, isActive: user.isActive });
  };

  const handleEdit = async (data: EditForm) => {
    if (!editUser) return;
    setSubmitting(true);
    try {
      const payload: UserUpdateRequest = { fullName: data.fullName, username: data.username, role: data.role, isActive: data.isActive };
      await userApi.update(editUser.id, payload);
      toast.success("Kullanıcı güncellendi");
      setEditUser(null);
      loadUsers();
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Şifre değiştirme formu ────────────────────────────────
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const handlePassword = async (data: PasswordForm) => {
    if (!passwordUser) return;
    setSubmitting(true);
    try {
      await userApi.changePassword(passwordUser.id, data.newPassword);
      toast.success("Şifre değiştirildi");
      setPasswordUser(null);
      passwordForm.reset();
    } catch {
      toast.error("Şifre değiştirilemedi");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle aktif/pasif ────────────────────────────────────
  const handleToggle = async () => {
    if (!toggleUser) return;
    setSubmitting(true);
    try {
      await userApi.toggleActive(toggleUser.id);
      toast.success(toggleUser.isActive ? "Kullanıcı pasife alındı" : "Kullanıcı aktif edildi");
      setToggleUser(null);
      loadUsers();
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Tablo sütunları ────────────────────────────────────────
  const columns: ColumnDef<User>[] = [
    { accessorKey: "fullName", header: "Ad Soyad", cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span> },
    { accessorKey: "username", header: "Kullanıcı Adı", cell: ({ getValue }) => <span className="font-mono text-sm">{getValue<string>()}</span> },
    {
      accessorKey: "role",
      header: "Rol",
      cell: ({ getValue }) => <RoleBadge role={getValue<string>()} />,
    },
    {
      accessorKey: "isActive",
      header: "Durum",
      cell: ({ getValue }) => <StatusBadge isActive={getValue<boolean>()} />,
    },
    {
      id: "actions",
      header: "İşlemler",
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        const isSelf = u.id === currentUser?.id;
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Düzenle</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setPasswordUser(u); passwordForm.reset(); }}>
                  <KeyRound className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Şifre Değiştir</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${u.isActive ? "text-red-500 hover:text-red-600" : "text-green-600 hover:text-green-700"}`}
                  onClick={() => !isSelf && setToggleUser(u)}
                  disabled={isSelf}
                >
                  {u.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isSelf ? "Kendi hesabınızı pasif yapamazsınız" : u.isActive ? "Pasife Al" : "Aktif Et"}</TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kullanıcı Yönetimi"
        description="Sistem kullanıcıları — Sadece Admin erişebilir"
        actions={
          <Button className="gap-2" onClick={() => { setCreateOpen(true); createForm.reset(); }}>
            <Plus className="h-4 w-4" />
            Yeni Kullanıcı
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={users}
        isLoading={loading}
        searchPlaceholder="Kullanıcı ara..."
        emptyMessage="Henüz kullanıcı eklenmemiş"
      />

      {/* ── Yeni kullanıcı dialogu ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-1">
              <Label>Ad Soyad</Label>
              <Input {...createForm.register("fullName")} placeholder="Ahmet Yılmaz" />
              {createForm.formState.errors.fullName && <p className="text-sm text-red-500">{createForm.formState.errors.fullName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Kullanıcı Adı</Label>
              <Input {...createForm.register("username")} placeholder="ahmet.yilmaz" />
              {createForm.formState.errors.username && <p className="text-sm text-red-500">{createForm.formState.errors.username.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Şifre</Label>
              <Input type="password" {...createForm.register("password")} placeholder="En az 6 karakter" />
              {createForm.formState.errors.password && <p className="text-sm text-red-500">{createForm.formState.errors.password.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Şifre Tekrar</Label>
              <Input type="password" {...createForm.register("confirmPassword")} placeholder="Şifreyi tekrar girin" />
              {createForm.formState.errors.confirmPassword && <p className="text-sm text-red-500">{createForm.formState.errors.confirmPassword.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select
                defaultValue="Staff"
                onValueChange={(v) => createForm.setValue("role", v as "Admin" | "Staff")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Staff">Personel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Kaydediliyor..." : "Oluştur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Kullanıcı düzenleme dialogu ── */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Ad Soyad</Label>
              <Input {...editForm.register("fullName")} />
              {editForm.formState.errors.fullName && <p className="text-sm text-red-500">{editForm.formState.errors.fullName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Kullanıcı Adı</Label>
              <Input {...editForm.register("username")} />
              {editForm.formState.errors.username && <p className="text-sm text-red-500">{editForm.formState.errors.username.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select
                value={editForm.watch("role")}
                onValueChange={(v) => editForm.setValue("role", v as "Admin" | "Staff")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Staff">Personel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>İptal</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Kaydediliyor..." : "Güncelle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Şifre değiştirme dialogu ── */}
      <Dialog open={!!passwordUser} onOpenChange={(open) => !open && setPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şifre Değiştir — {passwordUser?.fullName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={passwordForm.handleSubmit(handlePassword)} className="space-y-4">
            <div className="space-y-1">
              <Label>Yeni Şifre</Label>
              <Input type="password" {...passwordForm.register("newPassword")} placeholder="En az 6 karakter" />
              {passwordForm.formState.errors.newPassword && <p className="text-sm text-red-500">{passwordForm.formState.errors.newPassword.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Yeni Şifre Tekrar</Label>
              <Input type="password" {...passwordForm.register("confirmPassword")} placeholder="Şifreyi tekrar girin" />
              {passwordForm.formState.errors.confirmPassword && <p className="text-sm text-red-500">{passwordForm.formState.errors.confirmPassword.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordUser(null)}>İptal</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Kaydediliyor..." : "Şifreyi Değiştir"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Aktif/Pasif onay dialogu ── */}
      <ConfirmDialog
        open={!!toggleUser}
        onOpenChange={(open) => !open && setToggleUser(null)}
        title={toggleUser?.isActive ? "Kullanıcıyı Pasife Al" : "Kullanıcıyı Aktif Et"}
        description={
          toggleUser?.isActive
            ? `"${toggleUser?.fullName}" pasif yapılacak. Bu kullanıcı sisteme giriş yapamaz.`
            : `"${toggleUser?.fullName}" aktif edilecek.`
        }
        confirmLabel={toggleUser?.isActive ? "Pasife Al" : "Aktif Et"}
        destructive={!!toggleUser?.isActive}
        onConfirm={handleToggle}
      />
    </div>
  );
}
