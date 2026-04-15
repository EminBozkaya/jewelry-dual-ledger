import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, KeyRound, PowerOff, Power } from "lucide-react";

import { userApi, type UserUpdateRequest } from "@/api/users";
import type { User } from "@/types";
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
    fullName: z.string().min(2, "fullName_min"),
    username: z.string().min(3, "username_min"),
    password: z.string().min(6, "password_min"),
    confirmPassword: z.string(),
    role: z.enum(["SuperAdmin", "Admin", "Staff"]),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "password_mismatch",
    path: ["confirmPassword"],
  });

const editSchema = z.object({
  fullName: z.string().min(2, "fullName_min"),
  username: z.string().min(3, "username_min"),
  role: z.enum(["SuperAdmin", "Admin", "Staff"]),
  isActive: z.boolean(),
});

const passwordSchema = z
  .object({
    newPassword: z.string().min(6, "password_min"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "password_mismatch",
    path: ["confirmPassword"],
  });

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

// ── Rol badge ────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation();
  return role === "Admin"
    ? <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">{t("users.roles.admin")}</Badge>
    : <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{t("users.roles.staff")}</Badge>;
}

// ── Durum badge ──────────────────────────────────────────────
function StatusBadge({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation();
  return isActive
    ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t("users.status.active")}</Badge>
    : <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">{t("users.status.inactive")}</Badge>;
}

// ── UserManagementPage ────────────────────────────────────────
export function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const validationMsg = (msg: string | undefined) => {
    const map: Record<string, string> = {
      "fullName_min": t("users.validation.fullNameMin"),
      "username_min": t("users.validation.usernameMin"),
      "password_min": t("users.validation.passwordMin"),
      "password_mismatch": t("users.validation.passwordMismatch"),
    };
    return msg ? (map[msg] ?? msg) : "";
  };

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
      .catch(() => toast.error(t("users.loadError")))
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
      toast.success(t("users.createSuccess"));
      setCreateOpen(false);
      createForm.reset();
      loadUsers();
    } catch {
      toast.error(t("users.createError"));
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
      toast.success(t("users.updateSuccess"));
      setEditUser(null);
      loadUsers();
    } catch {
      toast.error(t("users.updateError"));
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
      toast.success(t("users.passwordSuccess"));
      setPasswordUser(null);
      passwordForm.reset();
    } catch {
      toast.error(t("users.passwordError"));
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
      toast.success(toggleUser.isActive ? t("users.deactivateSuccess") : t("users.activateSuccess"));
      setToggleUser(null);
      loadUsers();
    } catch {
      toast.error(t("users.toggleError"));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Tablo sütunları ────────────────────────────────────────
  const columns: ColumnDef<User>[] = [
    { accessorKey: "fullName", header: t("users.columns.name"), cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span> },
    { accessorKey: "username", header: t("users.columns.username"), cell: ({ getValue }) => <span className="font-mono text-sm">{getValue<string>()}</span> },
    {
      accessorKey: "role",
      header: t("users.columns.role"),
      cell: ({ getValue }) => <RoleBadge role={getValue<string>()} />,
    },
    {
      accessorKey: "isActive",
      header: t("users.columns.status"),
      cell: ({ getValue }) => <StatusBadge isActive={getValue<boolean>()} />,
    },
    {
      id: "actions",
      header: t("users.columns.actions"),
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
              <TooltipContent>{t("users.actions.edit")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setPasswordUser(u); passwordForm.reset(); }}>
                  <KeyRound className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("users.actions.changePassword")}</TooltipContent>
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
              <TooltipContent>{isSelf ? t("users.actions.selfToggleWarning") : u.isActive ? t("users.actions.deactivate") : t("users.actions.activate")}</TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("users.title")}
        description={t("users.description")}
        actions={
          <Button className="gap-2" onClick={() => { setCreateOpen(true); createForm.reset(); }}>
            <Plus className="h-4 w-4" />
            {t("users.newUser")}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={users}
        isLoading={loading}
        searchPlaceholder={t("users.searchPlaceholder")}
        emptyMessage={t("users.noUsers")}
      />

      {/* ── Yeni kullanıcı dialogu ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.createForm.title")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-1">
              <Label>{t("users.createForm.fullName")}</Label>
              <Input {...createForm.register("fullName")} placeholder={t("users.createForm.namePlaceholder")} />
              {createForm.formState.errors.fullName && <p className="text-sm text-red-500">{validationMsg(createForm.formState.errors.fullName.message)}</p>}
            </div>
            <div className="space-y-1">
              <Label>{t("users.createForm.username")}</Label>
              <Input {...createForm.register("username")} placeholder={t("users.createForm.usernamePlaceholder")} />
              {createForm.formState.errors.username && <p className="text-sm text-red-500">{validationMsg(createForm.formState.errors.username.message)}</p>}
            </div>
            <div className="space-y-1">
              <Label>{t("users.createForm.password")}</Label>
              <Input type="password" {...createForm.register("password")} placeholder={t("users.createForm.passwordPlaceholder")} />
              {createForm.formState.errors.password && <p className="text-sm text-red-500">{validationMsg(createForm.formState.errors.password.message)}</p>}
            </div>
            <div className="space-y-1">
              <Label>{t("users.createForm.confirmPassword")}</Label>
              <Input type="password" {...createForm.register("confirmPassword")} placeholder={t("users.createForm.confirmPlaceholder")} />
              {createForm.formState.errors.confirmPassword && <p className="text-sm text-red-500">{validationMsg(createForm.formState.errors.confirmPassword.message)}</p>}
            </div>
            <div className="space-y-1">
              <Label>{t("users.createForm.role")}</Label>
              <Select
                defaultValue="Staff"
                onValueChange={(v) => createForm.setValue("role", v as "SuperAdmin" | "Admin" | "Staff")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">{t("users.roles.admin")}</SelectItem>
                  <SelectItem value="Staff">{t("users.roles.staff")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("users.createForm.cancel")}</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("users.createForm.saving") : t("users.createForm.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Kullanıcı düzenleme dialogu ── */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.editForm.title")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
            <div className="space-y-1">
              <Label>{t("users.editForm.fullName")}</Label>
              <Input {...editForm.register("fullName")} />
              {editForm.formState.errors.fullName && <p className="text-sm text-red-500">{validationMsg(editForm.formState.errors.fullName.message)}</p>}
            </div>
            <div className="space-y-1">
              <Label>{t("users.editForm.username")}</Label>
              <Input {...editForm.register("username")} />
              {editForm.formState.errors.username && <p className="text-sm text-red-500">{validationMsg(editForm.formState.errors.username.message)}</p>}
            </div>
            <div className="space-y-1">
              <Label>{t("users.editForm.role")}</Label>
              <Select
                value={editForm.watch("role")}
                onValueChange={(v) => editForm.setValue("role", v as "SuperAdmin" | "Admin" | "Staff")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">{t("users.roles.admin")}</SelectItem>
                  <SelectItem value="Staff">{t("users.roles.staff")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>{t("users.editForm.cancel")}</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("users.editForm.saving") : t("users.editForm.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Şifre değiştirme dialogu ── */}
      <Dialog open={!!passwordUser} onOpenChange={(open) => !open && setPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.passwordForm.title")} — {passwordUser?.fullName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={passwordForm.handleSubmit(handlePassword)} className="space-y-4">
            <div className="space-y-1">
              <Label>{t("users.passwordForm.newPassword")}</Label>
              <Input type="password" {...passwordForm.register("newPassword")} placeholder={t("users.passwordForm.placeholder")} />
              {passwordForm.formState.errors.newPassword && <p className="text-sm text-red-500">{validationMsg(passwordForm.formState.errors.newPassword.message)}</p>}
            </div>
            <div className="space-y-1">
              <Label>{t("users.passwordForm.confirmPassword")}</Label>
              <Input type="password" {...passwordForm.register("confirmPassword")} placeholder={t("users.passwordForm.confirmPlaceholder")} />
              {passwordForm.formState.errors.confirmPassword && <p className="text-sm text-red-500">{validationMsg(passwordForm.formState.errors.confirmPassword.message)}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordUser(null)}>{t("users.passwordForm.cancel")}</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("users.passwordForm.saving") : t("users.passwordForm.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Aktif/Pasif onay dialogu ── */}
      <ConfirmDialog
        open={!!toggleUser}
        onOpenChange={(open) => !open && setToggleUser(null)}
        title={toggleUser?.isActive ? t("users.toggleConfirm.deactivateTitle") : t("users.toggleConfirm.activateTitle")}
        description={
          toggleUser?.isActive
            ? `"${toggleUser?.fullName}" ${t("users.toggleConfirm.deactivateDesc")}`
            : `"${toggleUser?.fullName}" ${t("users.toggleConfirm.activateDesc")}`
        }
        confirmLabel={toggleUser?.isActive ? t("users.toggleConfirm.deactivateBtn") : t("users.toggleConfirm.activateBtn")}
        destructive={!!toggleUser?.isActive}
        onConfirm={handleToggle}
      />
    </div>
  );
}
