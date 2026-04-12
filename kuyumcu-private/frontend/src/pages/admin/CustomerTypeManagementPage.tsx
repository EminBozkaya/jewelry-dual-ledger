import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, PowerOff, Power, Trash2, GripVertical } from "lucide-react";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { customerTypeApi } from "@/api/customer-types";
import type { CustomerTypeConfigCreateRequest, CustomerTypeConfigUpdateRequest } from "@/api/customer-types";
import type { CustomerTypeConfig } from "@/types";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
const typeSchema = z.object({
  value: z.coerce.number().int().min(0, "Değer 0 veya daha büyük olmalı"),
  name: z.string().min(1, "Ad zorunludur").max(50, "Ad en fazla 50 karakter"),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Geçerli bir HEX renk girin (#rrggbb)")
    .optional()
    .or(z.literal("")),
});

type TypeForm = z.infer<typeof typeSchema>;

// ── Badge preview ──────────────────────────────────────────────
function TypeBadge({ name, colorHex }: { name: string; colorHex: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: colorHex + "22",
        color: colorHex,
        border: `1px solid ${colorHex}44`,
      }}
    >
      {name}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Aktif</Badge>
  ) : (
    <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400">Pasif</Badge>
  );
}

// ── Sürüklenebilir satır ─────────────────────────────────────
interface SortableRowProps {
  id: string;
  disabled: boolean;
  children: (dragHandleProps: React.HTMLAttributes<HTMLButtonElement> | undefined) => React.ReactNode;
}

function SortableRow({ id, disabled, children }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : undefined,
        position: isDragging ? "relative" : undefined,
      }}
      className={isDragging ? "bg-muted shadow-md" : undefined}
      {...attributes}
    >
      {children(disabled ? undefined : listeners)}
    </TableRow>
  );
}

// ── CustomerTypeManagementPage ───────────────────────────────
export function CustomerTypeManagementPage() {
  const [types, setTypes] = useState<CustomerTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<CustomerTypeConfig | null>(null);
  const [toggleItem, setToggleItem] = useState<CustomerTypeConfig | null>(null);
  const [deleteItem, setDeleteItem] = useState<CustomerTypeConfig | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [reordering, setReordering] = useState(false);

  const isDraggingRef = useRef(false);

  const loadData = () => {
    setLoading(true);
    customerTypeApi
      .getAllIncludingInactive()
      .then(setTypes)
      .catch(() => toast.error("Müşteri tipleri yüklenemedi"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── DnD sensörleri ────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    isDraggingRef.current = false;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (statusFilter !== "all") return;

    const oldIndex = types.findIndex((t) => t.id === active.id);
    const newIndex = types.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(types, oldIndex, newIndex);
    const withNewOrder = reordered.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));

    setTypes(withNewOrder);
    setReordering(true);

    try {
      await customerTypeApi.reorder(withNewOrder.map((t) => ({ id: t.id, sortOrder: t.sortOrder })));
      toast.success("Sıralama kaydedildi");
    } catch {
      toast.error("Sıralama kaydedilemedi");
      loadData();
    } finally {
      setReordering(false);
    }
  };

  // ── Form ─────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createForm = useForm<TypeForm, any, TypeForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(typeSchema) as any,
    defaultValues: { value: undefined, name: "", colorHex: "#6b7280" },
  });

  const handleCreate = async (data: TypeForm) => {
    setSubmitting(true);
    try {
      const payload: CustomerTypeConfigCreateRequest = {
        value: data.value,
        name: data.name,
        colorHex: data.colorHex || "#6b7280",
      };
      await customerTypeApi.create(payload);
      toast.success("Müşteri tipi oluşturuldu");
      setCreateOpen(false);
      createForm.reset();
      loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? "Müşteri tipi oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editForm = useForm<TypeForm, any, TypeForm>({ resolver: zodResolver(typeSchema) as any });

  const openEdit = (item: CustomerTypeConfig) => {
    setEditItem(item);
    editForm.reset({
      value: item.value,
      name: item.name,
      colorHex: item.colorHex,
    });
  };

  const handleEdit = async (data: TypeForm) => {
    if (!editItem) return;
    setSubmitting(true);
    try {
      const payload: CustomerTypeConfigUpdateRequest = {
        value: data.value,
        name: data.name,
        colorHex: data.colorHex || "#6b7280",
      };
      await customerTypeApi.update(editItem.id, payload);
      toast.success("Müşteri tipi güncellendi");
      setEditItem(null);
      loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? "Güncelleme başarısız");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async () => {
    if (!toggleItem) return;
    setSubmitting(true);
    try {
      await customerTypeApi.toggleActive(toggleItem.id);
      toast.success(toggleItem.isActive ? "Pasife alındı" : "Aktif edildi");
      setToggleItem(null);
      loadData();
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSubmitting(true);
    try {
      const result = await customerTypeApi.delete(deleteItem.id);
      toast.success(result.message);
      setDeleteItem(null);
      loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? "Silme işlemi başarısız");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtre + arama ─────────────────────────────────────────
  const displayedItems = types.filter((t) => {
    if (statusFilter === "active" && !t.isActive) return false;
    if (statusFilter === "inactive" && t.isActive) return false;
    if (searchQuery) {
      const q = searchQuery.toLocaleLowerCase("tr-TR");
      return t.name.toLocaleLowerCase("tr-TR").includes(q);
    }
    return true;
  });

  const dragEnabled = statusFilter === "all" && !searchQuery;

  // ── Form alanları ──────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderFormFields = (form: ReturnType<typeof useForm<any>>, isCreate = false) => {
    const watchColor = form.watch("colorHex") as string;
    const watchName = form.watch("name") as string;
    return (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Değer (Value) *</Label>
            <Input
              type="number"
              {...form.register("value")}
              placeholder="Örn: 3"
              min={0}
              disabled={!isCreate}
            />
            <p className="text-xs text-muted-foreground">
              {isCreate ? "Benzersiz tam sayı — Customer.Type karşılığı" : "Değer değiştirilemez"}
            </p>
            {form.formState.errors.value && (
              <p className="text-sm text-red-500">{String(form.formState.errors.value.message ?? "")}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Ad *</Label>
            <Input {...form.register("name")} placeholder="Örn: Toptancı" />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">{String(form.formState.errors.name.message ?? "")}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label>Renk (HEX)</Label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Input
                {...form.register("colorHex")}
                placeholder="#3b82f6"
                className="pr-10"
              />
              <span
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border border-black/10"
                style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(watchColor ?? "") ? watchColor : "#6b7280" }}
              />
            </div>
            {watchName && /^#[0-9A-Fa-f]{6}$/.test(watchColor ?? "") && (
              <TypeBadge name={watchName} colorHex={watchColor} />
            )}
          </div>
          {form.formState.errors.colorHex && (
            <p className="text-sm text-red-500">{String(form.formState.errors.colorHex.message ?? "")}</p>
          )}
          <p className="text-xs text-muted-foreground">Badge rengi — boş bırakılırsa gri kullanılır</p>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Müşteri Tipleri"
        description="Sistemde tanımlı müşteri kategorilerini yönetin — Özel müşteri, kuyumcu, tedarikçi ve diğerleri"
        actions={
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü ({types.length})</SelectItem>
                <SelectItem value="active">Aktif ({types.filter(t => t.isActive).length})</SelectItem>
                <SelectItem value="inactive">Pasif ({types.filter(t => !t.isActive).length})</SelectItem>
              </SelectContent>
            </Select>
            <Button className="gap-2" onClick={() => { setCreateOpen(true); createForm.reset({ value: undefined, name: "", colorHex: "#6b7280" }); }}>
              <Plus className="h-4 w-4" />
              Yeni Müşteri Tipi
            </Button>
          </div>
        }
      />

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Müşteri tipi ara..."
            className="w-full sm:max-w-xs"
          />
          {!dragEnabled && !loading ? (
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Arama sırasında sıralama devre dışı" : "Sıralama için «Tümü» görünümünü seçin"}
            </p>
          ) : (
            !loading && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <GripVertical className="h-4 w-4" />
                Satırları tutup sürükleyerek sıralamayı değiştirin
                {reordering && " · kaydediliyor..."}
              </p>
            )
          )}
        </div>

        <div className="overflow-x-auto rounded-md border">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => { isDraggingRef.current = true; }}
            onDragEnd={handleDragEnd}
            onDragCancel={() => { isDraggingRef.current = false; }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Değer</TableHead>
                  <TableHead>Ad</TableHead>
                  <TableHead>Görünüm</TableHead>
                  <TableHead>Renk</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : displayedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Henüz müşteri tipi eklenmemiş
                    </TableCell>
                  </TableRow>
                ) : (
                  <SortableContext
                    items={displayedItems.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {displayedItems.map((item) => (
                      <SortableRow key={item.id} id={item.id} disabled={!dragEnabled}>
                        {(dragHandleProps) => (
                          <>
                            <TableCell className="w-10 py-3">
                              <button
                                className={
                                  dragHandleProps
                                    ? "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                                    : "cursor-default text-muted-foreground/20"
                                }
                                {...dragHandleProps}
                                tabIndex={-1}
                              >
                                <GripVertical className="h-4 w-4" />
                              </button>
                            </TableCell>
                            <TableCell className="py-3">
                              <span className="font-mono text-sm text-muted-foreground">{item.value}</span>
                            </TableCell>
                            <TableCell className="py-3">
                              <span className="font-medium">{item.name}</span>
                            </TableCell>
                            <TableCell className="py-3">
                              <TypeBadge name={item.name} colorHex={item.colorHex} />
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-4 w-4 rounded-full border border-black/10 flex-shrink-0"
                                  style={{ backgroundColor: item.colorHex }}
                                />
                                <span className="font-mono text-xs text-muted-foreground">{item.colorHex}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <StatusBadge isActive={item.isActive} />
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Düzenle</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={`h-8 w-8 ${item.isActive ? "text-red-500 hover:text-red-600" : "text-green-600 hover:text-green-700"}`}
                                      onClick={() => setToggleItem(item)}
                                    >
                                      {item.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{item.isActive ? "Pasife Al" : "Aktif Et"}</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-500 hover:text-red-600"
                                      onClick={() => setDeleteItem(item)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Sil</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </>
                        )}
                      </SortableRow>
                    ))}
                  </SortableContext>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>

        {!loading && displayedItems.length > 0 && (
          <p className="text-sm text-muted-foreground">{displayedItems.length} kayıt gösteriliyor</p>
        )}
      </div>

      {/* ── Yeni tip dialogu ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Yeni Müşteri Tipi</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit(handleCreate as unknown as Parameters<typeof createForm.handleSubmit>[0])}
            className="space-y-4"
          >
            {renderFormFields(createForm, true)}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Kaydediliyor..." : "Oluştur"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Düzenleme dialogu ── */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Müşteri Tipi Düzenle — {editItem?.name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit(handleEdit as unknown as Parameters<typeof editForm.handleSubmit>[0])}
            className="space-y-4"
          >
            {renderFormFields(editForm, false)}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditItem(null)}>İptal</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Kaydediliyor..." : "Güncelle"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Toggle onay dialogu ── */}
      <ConfirmDialog
        open={!!toggleItem}
        onOpenChange={(open) => !open && setToggleItem(null)}
        title={toggleItem?.isActive ? "Müşteri Tipini Pasife Al" : "Müşteri Tipini Aktif Et"}
        description={
          toggleItem?.isActive
            ? `"${toggleItem?.name}" pasif yapılacak. Yeni müşterilerde seçilemez hale gelir.`
            : `"${toggleItem?.name}" tekrar aktif edilecek.`
        }
        confirmLabel={toggleItem?.isActive ? "Pasife Al" : "Aktif Et"}
        destructive={!!toggleItem?.isActive}
        onConfirm={handleToggle}
      />

      {/* ── Silme onay dialogu ── */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title="Müşteri Tipini Sil"
        description={`"${deleteItem?.name}" silinecek. Eğer bu tipte kayıtlı müşteri varsa kalıcı olarak silinmez — otomatik olarak pasife alınır.`}
        confirmLabel="Sil"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
