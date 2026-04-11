import { useEffect, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { toast } from "sonner";

import type { AssetType, Balance, Customer, ConversionRequest } from "@/types";
import { transactionApi } from "@/api/transactions";
import { formatAmount, formatMoney } from "@/lib/formatters";

import { AssetTypeSelect } from "./AssetTypeSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface ConversionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customer: Customer;
  assetTypes: AssetType[];
  balances: Balance[];
  onSuccess: () => void;
}

// Onay ekranı
function ConfirmStep({
  customer,
  assetTypes,
  fromAssetTypeId,
  fromAmount,
  fromRateTry,
  toAssetTypeId,
  toRateTry,
  toAmount,
  tryEquivalent,
  description,
  rateNote,
  onBack,
  onConfirm,
  loading,
}: {
  customer: Customer;
  assetTypes: AssetType[];
  fromAssetTypeId: string;
  fromAmount: string;
  fromRateTry: string;
  toAssetTypeId: string;
  toRateTry: string;
  toAmount: number;
  tryEquivalent: number;
  description: string;
  rateNote: string;
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const fromAsset = assetTypes.find((a) => a.id === fromAssetTypeId);
  const toAsset = assetTypes.find((a) => a.id === toAssetTypeId);
  const fromNum = parseFloat(fromAmount.replace(",", "."));
  return (
    <div className="space-y-4 py-2">
      <p className="text-sm text-muted-foreground">Dönüşümü onaylıyor musunuz?</p>
      <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">İşlem:</span>
          <span className="font-medium">Dönüşüm</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Müşteri:</span>
          <span className="font-medium">{customer.fullName}</span>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span className="text-muted-foreground">Verilecek:</span>
          <span className="font-semibold text-red-700">
            -{fromAsset ? formatAmount(fromNum, fromAsset.unitType) : fromAmount}{" "}
            {fromAsset?.code}
          </span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Kuru ({fromAsset?.code}/TL):</span>
          <span>{formatMoney(parseFloat(fromRateTry.replace(",", ".")))} ₺</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">TL Karşılığı:</span>
          <span className="font-medium">{formatMoney(tryEquivalent)} ₺</span>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span className="text-muted-foreground">Alınacak:</span>
          <span className="font-semibold text-green-700">
            +{toAsset ? formatAmount(toAmount, toAsset.unitType) : toAmount.toFixed(4)}{" "}
            {toAsset?.code}
          </span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Kuru ({toAsset?.code}/TL):</span>
          <span>{formatMoney(parseFloat(toRateTry.replace(",", ".")))} ₺</span>
        </div>
        {rateNote && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">Kur Notu:</span>
            <span className="text-right">{rateNote}</span>
          </div>
        )}
        {description && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">Açıklama:</span>
            <span className="text-right">{description}</span>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={loading} className="min-h-11">
          Geri
        </Button>
        <Button onClick={onConfirm} disabled={loading} className="min-h-11">
          {loading ? "Kaydediliyor..." : "🔄 Dönüşümü Uygula"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function ConversionDialog({
  open,
  onOpenChange,
  customer,
  assetTypes,
  balances,
  onSuccess,
}: ConversionDialogProps) {
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [fromAssetTypeId, setFromAssetTypeId] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [fromRateTry, setFromRateTry] = useState("");
  const [toAssetTypeId, setToAssetTypeId] = useState("");
  const [toRateTry, setToRateTry] = useState("");
  const [description, setDescription] = useState("");
  const [rateNote, setRateNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setStep("form");
      setFromAssetTypeId("");
      setFromAmount("");
      setFromRateTry("");
      setToAssetTypeId("");
      setToRateTry("");
      setDescription("");
      setRateNote("");
      setErrors({});
    }
  }, [open]);

  const fromNum = parseFloat(fromAmount.replace(",", "."));
  const fromRate = parseFloat(fromRateTry.replace(",", "."));
  const toRate = parseFloat(toRateTry.replace(",", "."));

  // Otomatik hesaplama
  const tryEquivalent =
    !isNaN(fromNum) && !isNaN(fromRate) && fromRate > 0 ? fromNum * fromRate : 0;
  const toAmount =
    tryEquivalent > 0 && !isNaN(toRate) && toRate > 0 ? tryEquivalent / toRate : 0;

  const fromAsset = assetTypes.find((a) => a.id === fromAssetTypeId);
  const toAsset = assetTypes.find((a) => a.id === toAssetTypeId);

  const fromBalance = balances.find((b) => b.assetTypeId === fromAssetTypeId);
  const fromBalanceAmount = fromBalance?.amount ?? 0;

  // Pozitif bakiyesi olanlar önce; sıfır/negatif disabled
  const fromDisabledIds = assetTypes
    .filter((a) => {
      const bal = balances.find((b) => b.assetTypeId === a.id);
      return !bal || bal.amount <= 0;
    })
    .map((a) => a.id);

  const exceedsBalance =
    !isNaN(fromNum) && fromNum > 0 && fromNum > fromBalanceAmount;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fromAssetTypeId) errs.fromAssetTypeId = "Kaynak varlık seçilmeli";
    if (!toAssetTypeId) errs.toAssetTypeId = "Hedef varlık seçilmeli";
    if (fromAssetTypeId && toAssetTypeId && fromAssetTypeId === toAssetTypeId)
      errs.toAssetTypeId = "Kaynak ve hedef aynı olamaz";

    if (!fromAmount || isNaN(fromNum) || fromNum <= 0)
      errs.fromAmount = "Geçerli miktar girin (> 0)";
    else if (exceedsBalance)
      errs.fromAmount = "Miktar mevcut bakiyeyi aşamaz";

    if (!fromRateTry || isNaN(fromRate) || fromRate <= 0)
      errs.fromRateTry = "Kaynak kuru girin (> 0)";
    if (!toRateTry || isNaN(toRate) || toRate <= 0)
      errs.toRateTry = "Hedef kuru girin (> 0)";
    if (toAmount <= 0 && !errs.fromAmount && !errs.fromRateTry && !errs.toRateTry)
      errs.toRateTry = "Hesaplanan hedef miktar sıfır olamaz";

    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep("confirm");
  };

  const handleConfirm = async () => {
    const req: ConversionRequest = {
      customerId: customer.id,
      fromAssetTypeId,
      fromAmount: fromNum,
      fromRateTry: fromRate,
      toAssetTypeId,
      toRateTry: toRate,
      description: description || undefined,
      rateNote: rateNote || undefined,
    };
    try {
      setLoading(true);
      await transactionApi.convert(req);
      toast.success(
        `Dönüşüm başarılı: ${fromAsset?.code} → ${toAsset?.code}`
      );
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Dönüşüm işlemi başarısız");
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dönüşüm İşlemi — {customer.fullName}</DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4 py-2">
            {/* KAYNAK */}
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                Kaynak (Verilecek)
              </p>

              <AssetTypeSelect
                label="Varlık Birimi *"
                value={fromAssetTypeId}
                onChange={(id) => {
                  setFromAssetTypeId(id);
                  setFromAmount("");
                  setErrors((e) => ({ ...e, fromAssetTypeId: "" }));
                }}
                assetTypes={assetTypes}
                exclude={toAssetTypeId ? [toAssetTypeId] : []}
                disabledIds={fromDisabledIds}
                error={errors.fromAssetTypeId}
              />

              {/* Bakiye göster */}
              {fromAssetTypeId && fromBalance && (
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm">
                  <span className="text-muted-foreground">Mevcut bakiye:</span>
                  <button
                    type="button"
                    className="font-semibold text-primary underline"
                    onClick={() =>
                      setFromAmount(
                        fromBalanceAmount.toLocaleString("tr-TR", {
                          maximumFractionDigits: 6,
                          useGrouping: false,
                        })
                      )
                    }
                  >
                    {formatAmount(fromBalanceAmount, fromBalance.unitType)}{" "}
                    {fromBalance.assetTypeCode}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Miktar *</Label>
                  <Input
                    value={fromAmount}
                    onChange={(e) => {
                      setFromAmount(e.target.value);
                      setErrors((er) => ({ ...er, fromAmount: "" }));
                    }}
                    placeholder="0"
                    inputMode="decimal"
                    className="text-lg font-semibold min-h-11"
                  />
                  {errors.fromAmount && (
                    <p className="text-xs text-destructive">{errors.fromAmount}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>
                    TL Kuru *{" "}
                    {fromAsset && (
                      <span className="text-muted-foreground font-normal">
                        ({fromAsset.code}/TL)
                      </span>
                    )}
                  </Label>
                  <Input
                    value={fromRateTry}
                    onChange={(e) => {
                      setFromRateTry(e.target.value);
                      setErrors((er) => ({ ...er, fromRateTry: "" }));
                    }}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="min-h-11"
                  />
                  {errors.fromRateTry && (
                    <p className="text-xs text-destructive">{errors.fromRateTry}</p>
                  )}
                </div>
              </div>

              {/* TL Karşılığı — otomatik */}
              {tryEquivalent > 0 && (
                <div className="flex items-center justify-between rounded-md bg-blue-50 px-3 py-1.5 text-sm border border-blue-200">
                  <span className="text-blue-700">TL Karşılığı:</span>
                  <span className="font-semibold text-blue-800">
                    {formatMoney(tryEquivalent)} ₺
                  </span>
                </div>
              )}
            </div>

            {/* Ayraç */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm">
                <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* HEDEF */}
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                Hedef (Alınacak)
              </p>

              <AssetTypeSelect
                label="Varlık Birimi *"
                value={toAssetTypeId}
                onChange={(id) => {
                  setToAssetTypeId(id);
                  setErrors((e) => ({ ...e, toAssetTypeId: "" }));
                }}
                assetTypes={assetTypes}
                exclude={fromAssetTypeId ? [fromAssetTypeId] : []}
                error={errors.toAssetTypeId}
              />

              <div className="space-y-1.5">
                <Label>
                  TL Kuru *{" "}
                  {toAsset && (
                    <span className="text-muted-foreground font-normal">
                      ({toAsset.code}/TL)
                    </span>
                  )}
                </Label>
                <Input
                  value={toRateTry}
                  onChange={(e) => {
                    setToRateTry(e.target.value);
                    setErrors((er) => ({ ...er, toRateTry: "" }));
                  }}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="min-h-11"
                />
                {errors.toRateTry && (
                  <p className="text-xs text-destructive">{errors.toRateTry}</p>
                )}
              </div>

              {/* Hesaplanan miktar — otomatik */}
              {toAmount > 0 && (
                <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-1.5 text-sm border border-green-200">
                  <span className="text-green-700">Hesaplanan Miktar:</span>
                  <span className="font-semibold text-green-800">
                    {toAsset
                      ? formatAmount(toAmount, toAsset.unitType)
                      : toAmount.toFixed(6)}{" "}
                    {toAsset?.code}
                  </span>
                </div>
              )}
            </div>

            {/* Ek alanlar */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Kur Notu</Label>
                <Input
                  value={rateNote}
                  onChange={(e) => setRateNote(e.target.value)}
                  placeholder="Örn: Kapalıçarşı kuru, müşteri anlaşması..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Açıklama</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="İsteğe bağlı..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => onOpenChange(false)}
              >
                İptal
              </Button>
              <Button className="min-h-11" onClick={handleSubmit}>
                Dönüştür
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <ConfirmStep
            customer={customer}
            assetTypes={assetTypes}
            fromAssetTypeId={fromAssetTypeId}
            fromAmount={fromAmount}
            fromRateTry={fromRateTry}
            toAssetTypeId={toAssetTypeId}
            toRateTry={toRateTry}
            toAmount={toAmount}
            tryEquivalent={tryEquivalent}
            description={description}
            rateNote={rateNote}
            onBack={() => setStep("form")}
            onConfirm={handleConfirm}
            loading={loading}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
