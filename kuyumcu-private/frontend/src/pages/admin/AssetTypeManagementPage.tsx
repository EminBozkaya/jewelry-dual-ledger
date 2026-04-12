import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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

import { assetTypeApi } from "@/api/asset-types";
import type { AssetTypeCreateRequest, AssetTypeUpdateRequest } from "@/api/asset-types";
import type { AssetType } from "@/types";

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
const createSchema = z.object({
  code: z
    .string()
    .min(2, "Kod en az 2 karakter")
    .max(10, "Kod en fazla 10 karakter")
    .regex(/^[A-Za-z0-9]+$/, "Sadece harf ve rakam kullanılabilir"),
  name: z.string().min(2, "Ad en az 2 karakter").max(50, "Ad en fazla 50 karakter"),
  unitType: z.enum(["Currency", "Piece", "Gram"], {
    error: "Birim tipi seçiniz",
  }),
  karat: z.coerce.number().int().min(1).max(24).optional().or(z.literal("")),
  gramWeight: z.coerce.number().positive().optional().or(z.literal("")),
});

const editSchema = z.object({
  code: z
    .string()
    .min(2, "Kod en az 2 karakter")
    .max(10, "Kod en fazla 10 karakter")
    .regex(/^[A-Za-z0-9]+$/, "Sadece harf ve rakam kullanılabilir"),
  name: z.string().min(2, "Ad en az 2 karakter").max(50, "Ad en fazla 50 karakter"),
  unitType: z.enum(["Currency", "Piece", "Gram"], {
    error: "Birim tipi seçiniz",
  }),
  karat: z.coerce.number().int().min(1).max(24).optional().or(z.literal("")),
  gramWeight: z.coerce.number().positive().optional().or(z.literal("")),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

// ── Helper'lar ───────────────────────────────────────────────
const unitTypeLabels: Record<string, string> = {
  Currency: "Para Birimi",
  Piece: "Adet",
  Gram: "Gram",
};

function UnitTypeBadge({ unitType }: { unitType: string }) {
  const colors: Record<string, string> = {
    Currency: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400",
    Piece: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
    Gram: "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  };
  return (
    <Badge className={colors[unitType] ?? "bg-gray-100 text-gray-800"}>
      {unitTypeLabels[unitType] ?? unitType}
    </Badge>
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

// ── AssetTypeManagementPage ──────────────────────────────────
export function AssetTypeManagementPage() {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<AssetType | null>(null);
  const [toggleItem, setToggleItem] = useState<AssetType | null>(null);
  const [deleteItem, setDeleteItem] = useState<AssetType | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [reordering, setReordering] = useState(false);

  // Drag sırasında search/filter'ı geçici kapatmak için ref
  const isDraggingRef = useRef(false);

  const loadData = () => {
    setLoading(true);
    assetTypeApi
      .getAllIncludingInactive()
      .then(setAssetTypes)
      .catch(() => toast.error("Varlık tipleri yüklenemedi"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── DnD sensörleri ────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ── Sürükle-bırak işlemi ──────────────────────────────────
  const handleDragEnd = async (event: DragEndEvent) => {
    isDraggingRef.current = false;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Sadece "Tümü" görünümünde sıralama izni var
    if (statusFilter !== "all") return;

    const oldIndex = assetTypes.findIndex((a) => a.id === active.id);
    const newIndex = assetTypes.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(assetTypes, oldIndex, newIndex);
    const withNewOrder = reordered.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));

    // Optimistik güncelleme
    setAssetTypes(withNewOrder);
    setReordering(true);

    try {
      await assetTypeApi.reorder(withNewOrder.map((a) => ({ id: a.id, sortOrder: a.sortOrder })));
      toast.success("Sıralama kaydedildi");
    } catch {
      toast.error("Sıralama kaydedilemedi");
      loadData(); // geri al
    } finally {
      setReordering(false);
    }
  };

  // ── Yeni varlık tipi formu ─────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createForm = useForm<CreateForm, any, CreateForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createSchema) as any,
    defaultValues: { code: "", name: "", unitType: undefined, karat: "", gramWeight: "" },
  });

  const handleCreate = async (data: CreateForm) => {
    setSubmitting(true);
    try {
      const payload: AssetTypeCreateRequest = {
        code: data.code.toUpperCase(),
        name: data.name,
        unitType: data.unitType,
        karat: data.karat !== "" && data.karat != null ? Number(data.karat) : null,
        gramWeight: data.gramWeight !== "" && data.gramWeight != null ? Number(data.gramWeight) : null,
      };
      await assetTypeApi.create(payload);
      toast.success("Varlık tipi oluşturuldu");
      setCreateOpen(false);
      createForm.reset();
      loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? "Varlık tipi oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Düzenleme formu ────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editForm = useForm<EditForm, any, EditForm>({ resolver: zodResolver(editSchema) as any });

  const openEdit = (item: AssetType) => {
    setEditItem(item);
    editForm.reset({
      code: item.code,
      name: item.name,
      unitType: item.unitType,
      karat: item.karat ?? "",
      gramWeight: item.gramWeight ?? "",
    });
  };

  const handleEdit = async (data: EditForm) => {
    if (!editItem) return;
    setSubmitting(true);
    try {
      const payload: AssetTypeUpdateRequest = {
        code: data.code.toUpperCase(),
        name: data.name,
        unitType: data.unitType,
        karat: data.karat !== "" && data.karat != null ? Number(data.karat) : null,
        gramWeight: data.gramWeight !== "" && data.gramWeight != null ? Number(data.gramWeight) : null,
        sortOrder: editItem.sortOrder,
      };
      await assetTypeApi.update(editItem.id, payload);
      toast.success("Varlık tipi güncellendi");
      setEditItem(null);
      loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? "Güncelleme başarısız");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle aktif/pasif ────────────────────────────────────
  const handleToggle = async () => {
    if (!toggleItem) return;
    setSubmitting(true);
    try {
      await assetTypeApi.toggleActive(toggleItem.id);
      toast.success(
        toggleItem.isActive ? "Varlık tipi pasife alındı" : "Varlık tipi aktif edildi"
      );
      setToggleItem(null);
      loadData();
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Silme ──────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteItem) return;
    setSubmitting(true);
    try {
      const result = await assetTypeApi.delete(deleteItem.id);
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

  // ── Filtrelenmiş + arama uygulanmış veri ─────────────────
  const displayedItems = assetTypes.filter((a) => {
    if (statusFilter === "active" && !a.isActive) return false;
    if (statusFilter === "inactive" && a.isActive) return false;
    if (searchQuery) {
      const q = searchQuery.toLocaleLowerCase("tr-TR");
      return (
        a.code.toLocaleLowerCase("tr-TR").includes(q) ||
        a.name.toLocaleLowerCase("tr-TR").includes(q)
      );
    }
    return true;
  });

  const dragEnabled = statusFilter === "all" && !searchQuery;

  // ── Form alanları (ortak) ─────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderFormFields = (form: ReturnType<typeof useForm<any>>) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Kod *</Label>
          <Input {...form.register("code")} placeholder="Örn: CEYREK" className="uppercase" />
          {form.formState.errors.code && (
            <p className="text-sm text-red-500">{String(form.formState.errors.code.message ?? "")}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Ad *</Label>
          <Input {...form.register("name")} placeholder="Örn: Çeyrek Altın" />
          {form.formState.errors.name && (
            <p className="text-sm text-red-500">{String(form.formState.errors.name.message ?? "")}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Birim Tipi *</Label>
        <Controller
          control={form.control}
          name="unitType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Birim tipi seçin..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Currency">Para Birimi (TL, USD, EUR...)</SelectItem>
                <SelectItem value="Piece">Adet (Çeyrek, Yarım, Tam...)</SelectItem>
                <SelectItem value="Gram">Gram (22 Ayar, 24 Ayar, Gümüş...)</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.unitType && (
          <p className="text-sm text-red-500">{String(form.formState.errors.unitType.message ?? "")}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Ayar (Karat)</Label>
          <Input
            type="number"
            {...form.register("karat")}
            placeholder="Örn: 22"
            min={1}
            max={24}
          />
          <p className="text-xs text-muted-foreground">Altın türleri için (opsiyonel)</p>
        </div>
        <div className="space-y-1">
          <Label>Gram Ağırlık</Label>
          <Input
            type="number"
            step="0.01"
            {...form.register("gramWeight")}
            placeholder="Örn: 1.75"
            min={0}
          />
          <p className="text-xs text-muted-foreground">Referans ağırlık (opsiyonel)</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Varlık Tipleri"
        description="Sistemde tanımlı varlık birimlerini yönetin — Para birimleri, altın türleri ve diğer varlıklar"
        actions={
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü ({assetTypes.length})</SelectItem>
                <SelectItem value="active">Aktif ({assetTypes.filter(a => a.isActive).length})</SelectItem>
                <SelectItem value="inactive">Pasif ({assetTypes.filter(a => !a.isActive).length})</SelectItem>
              </SelectContent>
            </Select>
            <Button className="gap-2" onClick={() => { setCreateOpen(true); createForm.reset(); }}>
              <Plus className="h-4 w-4" />
              Yeni Varlık Tipi
            </Button>
          </div>
        }
      />

      {/* ── Sürükle-bırak tablosu ── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Varlık tipi ara..."
            className="w-full sm:max-w-xs"
          />
          {!dragEnabled && !loading && (
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "Arama sırasında sıralama devre dışı"
                : "Sıralama için «Tümü» görünümünü seçin"}
            </p>
          )}
          {dragEnabled && !loading && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <GripVertical className="h-4 w-4" />
              Satırları tutup sürükleyerek sıralamayı değiştirin
              {reordering && " · kaydediliyor..."}
            </p>
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
                  <TableHead>Kod</TableHead>
                  <TableHead>Ad</TableHead>
                  <TableHead>Birim Tipi</TableHead>
                  <TableHead>Ayar</TableHead>
                  <TableHead>Gram Ağırlık</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : displayedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      Henüz varlık tipi eklenmemiş
                    </TableCell>
                  </TableRow>
                ) : (
                  <SortableContext
                    items={displayedItems.map((a) => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {displayedItems.map((item) => (
                      <SortableRow
                        key={item.id}
                        id={item.id}
                        disabled={!dragEnabled}
                      >
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
                              <span className="font-bold tracking-wide">{item.code}</span>
                            </TableCell>
                            <TableCell className="py-3">
                              <span className="font-medium">{item.name}</span>
                            </TableCell>
                            <TableCell className="py-3">
                              <UnitTypeBadge unitType={item.unitType} />
                            </TableCell>
                            <TableCell className="py-3">
                              {item.karat ? (
                                <span className="font-medium">{item.karat} Ayar</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              {item.gramWeight ? (
                                <span className="font-medium">{item.gramWeight} g</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
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
          <p className="text-sm text-muted-foreground">
            {displayedItems.length} kayıt gösteriliyor
          </p>
        )}
      </div>

      {/* ── Yeni varlık tipi dialogu ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Yeni Varlık Tipi</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate as unknown as Parameters<typeof createForm.handleSubmit>[0])} className="space-y-4">
            {renderFormFields(createForm)}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Kaydediliyor..." : "Oluştur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Düzenleme dialogu ── */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              Varlık Tipi Düzenle — {editItem?.code}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit as unknown as Parameters<typeof editForm.handleSubmit>[0])} className="space-y-4">
            {renderFormFields(editForm)}

            <div className="rounded-lg border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                <strong>Not:</strong> Ayar ve gram ağırlık değişiklikleri sadece yeni işlemler için geçerli olur. Daha önce kaydedilmiş işlemlerin tutarları bundan etkilenmez.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
                İptal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Kaydediliyor..." : "Güncelle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Aktif/Pasif onay dialogu ── */}
      <ConfirmDialog
        open={!!toggleItem}
        onOpenChange={(open) => !open && setToggleItem(null)}
        title={toggleItem?.isActive ? "Varlık Tipini Pasife Al" : "Varlık Tipini Aktif Et"}
        description={
          toggleItem?.isActive
            ? `"${toggleItem?.name}" (${toggleItem?.code}) pasif yapılacak. Yeni işlemlerde seçilemez hale gelir ancak mevcut kayıtlar korunur.`
            : `"${toggleItem?.name}" (${toggleItem?.code}) tekrar aktif edilecek ve yeni işlemlerde seçilebilir olacak.`
        }
        confirmLabel={toggleItem?.isActive ? "Pasife Al" : "Aktif Et"}
        destructive={!!toggleItem?.isActive}
        onConfirm={handleToggle}
      />

      {/* ── Silme onay dialogu ── */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title="Varlık Tipini Sil"
        description={
          `"${deleteItem?.name}" (${deleteItem?.code}) silinecek. Eğer herhangi bir müşteri bakiyesinde veya işlemde kullanılıyorsa, kalıcı olarak silinmez — bunun yerine otomatik olarak pasife alınır.`
        }
        confirmLabel="Sil"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
