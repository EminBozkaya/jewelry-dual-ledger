import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatAmount } from "@/lib/formatters";
import type { AssetType, Balance } from "@/types";

export function OzetBakiyeModal({
  open,
  onOpenChange,
  balances,
  assetTypes,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  balances: Balance[];
  assetTypes: AssetType[];
}) {
  const { t } = useTranslation();
  const [rates, setRates] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<number | null>(null);
  const [loadingTcmb, setLoadingTcmb] = useState(false);
  const [rateType, setRateType] = useState<"Buying" | "Selling" | "Average">("Selling");
  const [magzaRateType, setMagzaRateType] = useState<"Buying" | "Average" | "Selling">("Selling");

  useEffect(() => {
    if (!open) {
      setRates({});
      setErrors({});
      setResult(null);
      return;
    }
    // TRY kurunu otomatik 1 olarak doldur
    const initial: Record<string, string> = {};
    for (const b of balances) {
      if (b.assetTypeCode === "TRY") initial[b.assetTypeId] = "1";
    }
    setRates(initial);
  }, [open, balances]);

  const handleFetchTcmb = async () => {
    setLoadingTcmb(true);
    try {
      const { ratesApi } = await import("@/api/rates");
      const data = await ratesApi.getAll(rateType);
      const newRates = { ...rates };
      let filled = 0;
      let skipped: string[] = [];

      const assetMap = new Map(assetTypes.map((a) => [a.id, a]));

      for (const b of balances) {
        const assetType = assetMap.get(b.assetTypeId);

        if (b.unitType === "Currency") {
          // Döviz: direkt TCMB kuru
          const rate = data.currencies[b.assetTypeCode];
          if (rate != null) {
            newRates[b.assetTypeId] = rate.toLocaleString("tr-TR", { maximumFractionDigits: 4, useGrouping: false });
            filled++;
          } else {
            skipped.push(b.assetTypeName);
          }
        } else if (assetType?.karat != null && data.goldGramTry24k != null) {
          // Altın — karat bilgisi var
          const purity = assetType.karat / 24;
          if (b.unitType === "Gram") {
            // Gram altın: 24k gram × saflık
            const rate = data.goldGramTry24k * purity;
            newRates[b.assetTypeId] = rate.toLocaleString("tr-TR", { maximumFractionDigits: 4, useGrouping: false });
            filled++;
          } else if (b.unitType === "Piece" && assetType.gramWeight != null) {
            // Adet altın: 24k gram × saflık × gram ağırlığı
            const rate = data.goldGramTry24k * purity * assetType.gramWeight;
            newRates[b.assetTypeId] = rate.toLocaleString("tr-TR", { maximumFractionDigits: 4, useGrouping: false });
            filled++;
          } else {
            // Adet altın ama gramWeight girilmemiş
            skipped.push(b.assetTypeName);
          }
        } else if (
          b.assetTypeCode === "XAG" ||
          b.assetTypeName.toLowerCase().includes("gümüş") ||
          b.assetTypeName.toLowerCase().includes("gumus")
        ) {
          // Gümüş: EVDS TP.GUMUS.S1 üzerinden gram fiyatı
          if (data.silverGramTry != null) {
            if (b.unitType === "Gram") {
              newRates[b.assetTypeId] = data.silverGramTry.toLocaleString("tr-TR", { maximumFractionDigits: 4, useGrouping: false });
              filled++;
            } else if (b.unitType === "Piece" && assetType?.gramWeight != null) {
              const rate = data.silverGramTry * assetType.gramWeight;
              newRates[b.assetTypeId] = rate.toLocaleString("tr-TR", { maximumFractionDigits: 4, useGrouping: false });
              filled++;
            } else {
              skipped.push(b.assetTypeName);
            }
          } else {
            skipped.push(b.assetTypeName);
          }
        } else if (b.assetTypeCode !== "TRY") {
          skipped.push(b.assetTypeName);
        }
      }

      setRates(newRates);
      setErrors({});
      setResult(null);

      if (skipped.length > 0) {
        const msg = t("rates.partialUpdate", { count: filled, skipped: skipped.join(", ") });
        toast.info(msg);
      } else {
        toast.success(t("rates.ratesUpdated"));
      }
    } catch {
      toast.error(t("rates.fetchError"));
    } finally {
      setLoadingTcmb(false);
    }
  };

  const assetMap = new Map(assetTypes.map((a) => [a.id, a]));
  const groups = [
    { titleKey: "currency", items: balances.filter((b) => b.unitType === "Currency") },
    { titleKey: "gold", items: balances.filter((b) => b.unitType !== "Currency" && assetMap.get(b.assetTypeId)?.karat != null) },
    { titleKey: "other", items: balances.filter((b) => b.unitType !== "Currency" && assetMap.get(b.assetTypeId)?.karat == null) },
  ].filter((g) => g.items.length > 0);

  const handleCalculate = () => {
    const errs: Record<string, string> = {};
    for (const b of balances) {
      const raw = rates[b.assetTypeId] ?? "";
      const num = parseFloat(raw.replace(",", "."));
      if (!raw || isNaN(num) || num <= 0) {
        errs[b.assetTypeId] = t("validation.rateRequired");
      }
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setResult(null);
      return;
    }
    setErrors({});
    let total = 0;
    for (const b of balances) {
      const rate = parseFloat(rates[b.assetTypeId].replace(",", "."));
      total += b.amount * rate;
    }
    setResult(Math.round(total * 100) / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("customerDetail.ozetBakiye.title")}</DialogTitle>
        </DialogHeader>

        {/* Tablo başlığı */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-xs font-semibold text-muted-foreground border-b pb-2">
          <span>{t("modal.assetName")}</span>
          <span className="text-right w-24">{t("modal.amount")}</span>
          <span className="text-right w-24">{t("modal.rate")}</span>
        </div>

        {/* Gruplar */}
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.titleKey}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1.5">
                {t(`modal.${g.titleKey}`)}
              </p>
              <div className="space-y-1">
                {g.items.map((b) => {
                  const isTRY = b.assetTypeCode === "TRY";
                  const isPos = b.amount >= 0;
                  return (
                    <div key={b.assetTypeId} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-start">
                      <span className="text-sm pt-1.5 truncate">{b.assetTypeName}</span>
                      <span className={`text-sm font-semibold tabular-nums text-right pt-1.5 w-24 ${isPos ? "text-green-600" : "text-red-600"}`}>
                        {isPos ? "+" : ""}{formatAmount(b.amount, b.unitType)}
                      </span>
                      <div className="w-24">
                        <Input
                          value={rates[b.assetTypeId] ?? ""}
                          onChange={(e) => {
                            setRates((r) => ({ ...r, [b.assetTypeId]: e.target.value }));
                            setErrors((er) => ({ ...er, [b.assetTypeId]: "" }));
                          }}
                          disabled={isTRY}
                          placeholder="0,00"
                          inputMode="decimal"
                          className={`h-8 text-right text-sm ${errors[b.assetTypeId] ? "border-destructive" : ""}`}
                        />
                        {errors[b.assetTypeId] && (
                          <p className="text-[10px] text-destructive mt-0.5 text-right">{errors[b.assetTypeId]}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sonuç */}
        {result !== null && (
          <div className={`flex items-center justify-between rounded-lg px-4 py-3 mt-1 ${result >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <span className="text-sm font-medium text-muted-foreground">{t("modal.totalTryEquivalent")}</span>
            <span
              className={`text-lg font-bold tabular-nums ${result >= 0 ? "text-green-600" : "text-red-600"}`}
              style={{ textShadow: result >= 0 ? "0 0 10px rgba(22,163,74,0.3)" : "0 0 10px rgba(220,38,38,0.3)" }}
            >
              {result >= 0 ? "+" : ""}
              {result.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
            </span>
          </div>
        )}

        {/* Footer — kur kaynakları + aksiyon butonları */}
        <div className="flex flex-col gap-3 pt-3 border-t">

          {/* Kur kaynağı kartları — yan yana */}
          <div className="grid grid-cols-2 gap-2">

            {/* Mağaza Kurları */}
            <div className="rounded-lg border bg-muted/20 p-3 flex flex-col gap-2.5 opacity-50 select-none">
              <p className="text-xs font-semibold text-center text-muted-foreground tracking-wide">
                {t("customerDetail.ozetBakiye.storeRateType")}
              </p>
              <div className="space-y-1.5">
                {(["Buying", "Average", "Selling"] as const).map((type) => {
                  const labels: Record<string, string> = {
                    Buying: t("customerDetail.ozetBakiye.buying"),
                    Average: t("customerDetail.ozetBakiye.average"),
                    Selling: t("customerDetail.ozetBakiye.selling")
                  };
                  const active = magzaRateType === type;
                  return (
                    <label key={type} onClick={() => setMagzaRateType(type)} className="flex items-center gap-2 cursor-not-allowed">
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-primary" : "border-muted-foreground/40"}`}>
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </span>
                      <span className={`text-xs ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {labels[type]}
                      </span>
                    </label>
                  );
                })}
              </div>
              <Button size="sm" variant="outline" disabled className="w-full h-7 text-xs mt-0.5">
                {t("modal.fetch")}
              </Button>
            </div>

            {/* Merkez Bankası Kurları */}
            <div className="rounded-lg border bg-muted/20 p-3 flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-center text-foreground tracking-wide">
                {t("modal.centralBankRates")}
              </p>
              <div className="space-y-1.5">
                {(["Buying", "Average", "Selling"] as const).map((type) => {
                  const labels: Record<string, string> = {
                    Buying: t("customerDetail.ozetBakiye.buying"),
                    Average: t("customerDetail.ozetBakiye.average"),
                    Selling: t("customerDetail.ozetBakiye.selling")
                  };
                  const active = rateType === type;
                  return (
                    <label
                      key={type}
                      onClick={() => setRateType(type)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${active ? "border-primary" : "border-muted-foreground/40"}`}>
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </span>
                      <span className={`text-xs transition-colors ${active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        {labels[type]}
                      </span>
                    </label>
                  );
                })}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleFetchTcmb}
                disabled={loadingTcmb}
                className="w-full h-7 text-xs mt-0.5 hover:text-foreground"
              >
                {loadingTcmb ? t("modal.fetching") : t("modal.fetch")}
              </Button>
            </div>
          </div>

          {/* Kapat / Hesapla — ortalanmış */}
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-10 px-8">
              {t("modal.close")}
            </Button>
            <Button onClick={handleCalculate} className="min-h-10 px-8">
              {t("modal.calculate")}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
