import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { AssetType, Balance, Customer, WithdrawalRequest } from "@/types";
import { transactionApi } from "@/api/transactions";
import { formatAmount } from "@/lib/formatters";

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

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customer: Customer;
  assetTypes: AssetType[];
  balances: Balance[];       // müşterinin mevcut bakiyeleri
  onSuccess: () => void;
}

// Onay ekranı
function ConfirmStep({
  customer,
  assetTypes,
  assetTypeId,
  amount,
  description,
  onBack,
  onConfirm,
  loading,
}: {
  customer: Customer;
  assetTypes: AssetType[];
  assetTypeId: string;
  amount: string;
  description: string;
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const asset = assetTypes.find((a) => a.id === assetTypeId);
  return (
    <div className="space-y-4 py-2">
      <p className="text-sm text-muted-foreground">İşlemi onaylıyor musunuz?</p>
      <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">İşlem:</span>
          <span className="font-medium">Çekme</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Müşteri:</span>
          <span className="font-medium">{customer.fullName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Varlık:</span>
          <span className="font-medium">{asset ? `${asset.name} (${asset.code})` : "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Miktar:</span>
          <span className="font-semibold text-red-700">
            -{asset ? formatAmount(parseFloat(amount.replace(",", ".")), asset.unitType) : amount}
          </span>
        </div>
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
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={loading}
          className="min-h-11"
        >
          {loading ? "Kaydediliyor..." : "✓ Onayla"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function WithdrawalDialog({
  open,
  onOpenChange,
  customer,
  assetTypes,
  balances,
  onSuccess,
}: WithdrawalDialogProps) {
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [assetTypeId, setAssetTypeId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setStep("form");
      setAssetTypeId("");
      setAmount("");
      setDescription("");
      setErrors({});
    }
  }, [open]);

  const selectedAsset = assetTypes.find((a) => a.id === assetTypeId);

  // Seçili varlık için bakiye
  const currentBalance = balances.find((b) => b.assetTypeId === assetTypeId);
  const balanceAmount = currentBalance?.amount ?? 0;

  // Pozitif bakiyesi olan varlık id'leri
  const positiveBalanceIds = balances
    .filter((b) => b.amount > 0)
    .map((b) => b.assetTypeId);

  // Sıfır veya negatif bakiyeli varlıklar disabled gösterilir
  const disabledIds = assetTypes
    .filter((a) => !positiveBalanceIds.includes(a.id))
    .map((a) => a.id);

  const getPlaceholder = () => {
    if (!selectedAsset) return "0";
    if (selectedAsset.unitType === "Currency") return "0,00";
    if (selectedAsset.unitType === "Gram") return "0,000";
    return "0";
  };

  const parsedAmount = parseFloat(amount.replace(",", "."));
  const exceedsBalance = !isNaN(parsedAmount) && parsedAmount > balanceAmount;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!assetTypeId) errs.assetTypeId = "Varlık birimi seçilmeli";
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0)
      errs.amount = "Geçerli bir miktar girin (> 0)";
    else if (exceedsBalance)
      errs.amount = "Miktar mevcut bakiyeyi aşamaz";
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
    const num = parseFloat(amount.replace(",", "."));
    const req: WithdrawalRequest = {
      customerId: customer.id,
      assetTypeId,
      amount: num,
      description: description || undefined,
    };
    try {
      setLoading(true);
      await transactionApi.withdraw(req);
      const assetLabel = selectedAsset
        ? `${formatAmount(num, selectedAsset.unitType)} ${selectedAsset.code}`
        : amount;
      toast.success(`${assetLabel} çekme işlemi başarılı`);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Çekme işlemi başarısız");
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Çekme İşlemi — {customer.fullName}</DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4 py-2">
            <AssetTypeSelect
              label="Varlık Birimi *"
              value={assetTypeId}
              onChange={(id) => {
                setAssetTypeId(id);
                setAmount("");
                setErrors((e) => ({ ...e, assetTypeId: "" }));
              }}
              assetTypes={assetTypes}
              disabledIds={disabledIds}
              error={errors.assetTypeId}
            />

            {/* Mevcut bakiye */}
            {assetTypeId && currentBalance && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm flex items-center justify-between">
                <span className="text-muted-foreground">Mevcut bakiye:</span>
                <span className="font-semibold">
                  {formatAmount(balanceAmount, currentBalance.unitType)}{" "}
                  {currentBalance.assetTypeCode}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Miktar *</Label>
                {assetTypeId && currentBalance && balanceAmount > 0 && (
                  <button
                    type="button"
                    className="text-xs text-primary underline"
                    onClick={() =>
                      setAmount(
                        balanceAmount.toLocaleString("tr-TR", {
                          maximumFractionDigits: 6,
                          useGrouping: false,
                        })
                      )
                    }
                  >
                    Tamamını Çek
                  </button>
                )}
              </div>
              <Input
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors((er) => ({ ...er, amount: "" }));
                }}
                placeholder={getPlaceholder()}
                inputMode="decimal"
                className="text-xl font-semibold min-h-12 text-center"
                autoFocus
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
              {!errors.amount && exceedsBalance && (
                <p className="text-xs text-destructive">Miktar mevcut bakiyeyi aşıyor</p>
              )}
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

            <DialogFooter>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => onOpenChange(false)}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                className="min-h-11"
                onClick={handleSubmit}
                disabled={exceedsBalance}
              >
                Çek
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <ConfirmStep
            customer={customer}
            assetTypes={assetTypes}
            assetTypeId={assetTypeId}
            amount={amount}
            description={description}
            onBack={() => setStep("form")}
            onConfirm={handleConfirm}
            loading={loading}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
