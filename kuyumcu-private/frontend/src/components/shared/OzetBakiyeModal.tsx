import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatAmount } from "@/lib/formatters";
import type { AssetType, Balance } from "@/types";
import type { StoreRatesMap, StoreRateUpsertPayload } from "@/api/store-rates";

// ── OzetBakiyeModal ──────────────────────────────────────────────────────────

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
  const [rates, setRates] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<number | null>(null);

  // TCMB
  const [loadingTcmb, setLoadingTcmb]   = useState(false);
  const [rateType, setRateType]          = useState<"Buying" | "Selling" | "Average">("Selling");

  // Mağaza kurları
  const [storeRates, setStoreRates]     = useState<StoreRatesMap>({});
  const [magzaRateType, setMagzaRateType] = useState<"Buying" | "Average" | "Selling">("Selling");
  const [loadingStore, setLoadingStore]  = useState(false);
  const [savingStore, setSavingStore]    = useState(false);

  // ── Yükleme ────────────────────────────────────────────────────────────────

  const loadStoreRates = useCallback(async () => {
    try {
      const { storeRatesApi } = await import("@/api/store-rates");
      const data = await storeRatesApi.getAll();
      setStoreRates(data);
    } catch {
      // sessiz hata
    }
  }, []);

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
    loadStoreRates();
  }, [open, balances, loadStoreRates]);

  // ── TCMB Kurları ─────────────────────────────────────────────────────────

  const handleFetchTcmb = async () => {
    setLoadingTcmb(true);
    try {
      const { ratesApi } = await import("@/api/rates");
      const data = await ratesApi.getAll(rateType);
      const newRates = { ...rates };
      let filled = 0;
      const skipped: string[] = [];
      const assetMap = new Map(assetTypes.map((a) => [a.id, a]));

      for (const b of balances) {
        const assetType = assetMap.get(b.assetTypeId);

        if (b.unitType === "Currency") {
          const rate = data.currencies[b.assetTypeCode];
          if (rate != null) {
            newRates[b.assetTypeId] = rate.toLocaleString("tr-TR", { maximumFractionDigits: 4, useGrouping: false });
            filled++;
          } else {
            skipped.push(b.assetTypeName);
          }
        } else if (assetType?.karat != null && data.goldGramTry24k != null) {
          const purity = assetType.karat / 24;
          if (b.unitType === "Gram") {
            newRates[b.assetTypeId] = (data.goldGramTry24k * purity).toLocaleString("tr-TR", { maximumFractionDigits: 4, useGrouping: false });
            filled++;
          } else if (b.unitType === "Piece" && assetType.gramWeight != null) {
            newRates[b.assetTypeId] = (data.goldGramTry24k * purity * assetType.gramWeight).toLocaleString("tr-TR", { maximumFractionDigits: 4, useGrouping: false });
            filled++;
          } else {
            skipped.push(b.assetTypeName);
          }
        } else if (
          b.assetTypeCode === "XAG" ||
          b.assetTypeName.toLowerCase().includes("gümüş") ||
          b.assetTypeName.toLowerCase().includes("gumus")
        ) {
          if (data.silverGramTry != null) {
            const assetType2 = assetMap.get(b.assetTypeId);
            if (b.unitType === "Gram") {
              newRates[b.assetTypeId] = data.silverGramTry.toLocaleString("tr-TR", { maximumFractionDigits: 4, useGrouping: false });
              filled++;
            } else if (b.unitType === "Piece" && assetType2?.gramWeight != null) {
              newRates[b.assetTypeId] = (data.silverGramTry * assetType2.gramWeight).toLocaleString("tr-TR", { maximumFractionDigits: 4, useGrouping: false });
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
        toast.info(`${filled} kur güncellendi. Manuel girilmesi gereken: ${skipped.join(", ")}`);
      } else {
        toast.success("Tüm kurlar Merkez Bankası verisiyle güncellendi.");
      }
    } catch {
      toast.error("Kurlar alınamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoadingTcmb(false);
    }
  };

  // ── Mağaza Kurları — Çek ────────────────────────────────────────────────

  const handleFetchStore = async () => {
    setLoadingStore(true);
    try {
      // Güncel mağaza kurlarını çek (cache yenileme)
      const { storeRatesApi } = await import("@/api/store-rates");
      const data = await storeRatesApi.getAll();
      setStoreRates(data);

      const newRates = { ...rates };
      let filled = 0;
      const skipped: string[] = [];
      const assetMap = new Map(assetTypes.map((a) => [a.id, a]));

      for (const b of balances) {
        if (b.assetTypeCode === "TRY") continue;
        const storeRate = data[b.assetTypeCode];
        if (!storeRate) { skipped.push(b.assetTypeName); continue; }

        let baseRate: number | null = null;
        if (magzaRateType === "Buying") {
          baseRate = storeRate.buyingRate;
        } else if (magzaRateType === "Selling") {
          baseRate = storeRate.sellingRate;
        } else {
          // Average
          const b2 = storeRate.buyingRate, s = storeRate.sellingRate;
          if (b2 != null && s != null) baseRate = (b2 + s) / 2;
          else baseRate = b2 ?? s;
        }

        if (baseRate == null) { skipped.push(b.assetTypeName); continue; }

        // baseRate: 1 birim varlık için TL karşılığı (doğrudan kullanılır)
        // — Currency için direkt kur, Gram/Piece için gram/adet başına TL
        const assetType = assetMap.get(b.assetTypeId);
        let finalRate = baseRate;

        if (b.unitType === "Piece" && assetType?.gramWeight != null) {
          // Mağaza kuru genellikle birim başına girilir, gramWeight zaten dahil
          // Eğer varlık "gram" bazında tanımlanmış bir adet ise gramWeight çarp
          // Ancak mağaza kullanıcısının adet başına kur girdiği varsayımıyla doğrudan kullanılır
          finalRate = baseRate;
        }

        newRates[b.assetTypeId] = finalRate.toLocaleString("tr-TR", { maximumFractionDigits: 4, useGrouping: false });
        filled++;
      }

      setRates(newRates);
      setErrors({});
      setResult(null);

      if (skipped.length > 0) {
        toast.info(`${filled} mağaza kuru uygulandı. Eksik kurlar: ${skipped.join(", ")}`);
      } else if (filled > 0) {
        toast.success("Mağaza kurları uygulandı.");
      } else {
        toast.warning("Kayıtlı mağaza kuru bulunamadı. Önce mağaza kurlarını kaydedin.");
      }
    } catch {
      toast.error("Mağaza kurları alınamadı.");
    } finally {
      setLoadingStore(false);
    }
  };

  // ── Mağaza Kurları — Kaydet (mevcut kurlardan kaydet) ──────────────────

  const handleSaveCurrentAsStore = async () => {
    // Mevcut rate inputlarından Mağaza Kurlarına kaydet
    const payload: StoreRateUpsertPayload = {};
    let hasAny = false;

    for (const b of balances) {
      if (b.assetTypeCode === "TRY") continue;
      const raw = rates[b.assetTypeId] ?? "";
      const num = parseFloat(raw.replace(",", "."));
      if (!raw || isNaN(num) || num <= 0) continue;

      // Mevcut kuru hem alış hem satış olarak kaydeder
      // Kullanıcı önce TCMB veya manuel girip sonra "Kaydet" der
      const existing = storeRates[b.assetTypeCode];
      payload[b.assetTypeCode] = {
        buyingRate:  magzaRateType === "Buying"  ? num : (existing?.buyingRate  ?? null),
        sellingRate: magzaRateType === "Selling" ? num : (existing?.sellingRate ?? null),
      };
      // Average seçiliyse hem alış hem satış'ı güncelle
      if (magzaRateType === "Average") {
        payload[b.assetTypeCode] = { buyingRate: num, sellingRate: num };
      }
      hasAny = true;
    }

    if (!hasAny) {
      toast.warning("Kaydedilecek kur bulunamadı. Önce kurları girin.");
      return;
    }

    setSavingStore(true);
    try {
      const { storeRatesApi } = await import("@/api/store-rates");
      await storeRatesApi.saveAll(payload);
      await loadStoreRates();
      toast.success("Mağaza kurları kaydedildi.");
    } catch {
      toast.error("Mağaza kurları kaydedilemedi.");
    } finally {
      setSavingStore(false);
    }
  };

  // ── Hesap ────────────────────────────────────────────────────────────────

  const assetMap = new Map(assetTypes.map((a) => [a.id, a]));
  const groups = [
    { title: "Döviz", items: balances.filter((b) => b.unitType === "Currency") },
    { title: "Altın", items: balances.filter((b) => b.unitType !== "Currency" && assetMap.get(b.assetTypeId)?.karat != null) },
    { title: "Diğer", items: balances.filter((b) => b.unitType !== "Currency" && assetMap.get(b.assetTypeId)?.karat == null) },
  ].filter((g) => g.items.length > 0);

  const handleCalculate = () => {
    const errs: Record<string, string> = {};
    for (const b of balances) {
      const raw = rates[b.assetTypeId] ?? "";
      const num = parseFloat(raw.replace(",", "."));
      if (!raw || isNaN(num) || num <= 0) {
        errs[b.assetTypeId] = "Kur girilmeli";
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

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Genel Bakiye Hesapla</DialogTitle>
        </DialogHeader>

        {/* Tablo başlığı */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-xs font-semibold text-muted-foreground border-b pb-2">
          <span>Varlık</span>
          <span className="text-right w-24">Miktar</span>
          <span className="text-right w-24">TL Kuru</span>
        </div>

        {/* Gruplar */}
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1.5">
                {g.title}
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
          <div className={`flex items-center justify-between rounded-lg px-4 py-3 mt-1 ${result >= 0 ? "bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800"}`}>
            <span className="text-sm font-medium text-muted-foreground">Toplam TL Karşılığı</span>
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
            <div className="rounded-lg border bg-muted/20 p-3 flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-center text-foreground tracking-wide">
                Mağaza Kurları
              </p>
              <div className="space-y-1.5">
                {(["Buying", "Average", "Selling"] as const).map((type) => {
                  const labels: Record<string, string> = { Buying: "Alış Kuru", Average: "Ortalama", Selling: "Satış Kuru" };
                  const active = magzaRateType === type;
                  return (
                    <label
                      key={type}
                      onClick={() => setMagzaRateType(type)}
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
              <div className="flex flex-col gap-1 mt-0.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFetchStore}
                  disabled={loadingStore || savingStore}
                  className="w-full h-7 text-xs hover:text-foreground"
                >
                  {loadingStore ? "Yükleniyor..." : "Çek"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveCurrentAsStore}
                  disabled={loadingStore || savingStore}
                  className="w-full h-6 text-[10px] text-muted-foreground hover:text-foreground"
                  title="Mevcut kurları mağaza kurları olarak kaydet"
                >
                  {savingStore ? "Kaydediliyor..." : "↑ Kurları Kaydet"}
                </Button>
              </div>
            </div>

            {/* Merkez Bankası Kurları */}
            <div className="rounded-lg border bg-muted/20 p-3 flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-center text-foreground tracking-wide">
                Merkez Bankası
              </p>
              <div className="space-y-1.5">
                {(["Buying", "Average", "Selling"] as const).map((type) => {
                  const labels: Record<string, string> = { Buying: "Alış Kuru", Average: "Ortalama", Selling: "Satış Kuru" };
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
                {loadingTcmb ? "Yükleniyor..." : "Çek"}
              </Button>
            </div>
          </div>

          {/* Kapat / Hesapla — ortalanmış */}
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-10 px-8">
              Kapat
            </Button>
            <Button onClick={handleCalculate} className="min-h-10 px-8">
              Hesapla
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

