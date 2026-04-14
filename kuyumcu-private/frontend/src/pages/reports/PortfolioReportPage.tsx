import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { Users, ArrowRight, Banknote, Coins, Scale } from "lucide-react";

import { reportApi } from "@/api/reports";
import { assetTypeApi } from "@/api/asset-types";
import type { PortfolioAsset, AssetDetailCustomer, AssetType, Balance } from "@/types";
import { OzetBakiyeModal } from "@/components/shared/OzetBakiyeModal";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Varlık Grubu ve Satır Bileşenleri ──────────────────────────────
interface AssetGroup {
  label: string;
  icon: React.ElementType;
  accentColor: string;
  items: PortfolioAsset[];
}

type TFunction = (key: string) => string;

function groupPortfolioAssets(assets: PortfolioAsset[], t: TFunction): AssetGroup[] {
  const doviz = assets.filter((a) => a.unitType === "Currency");
  const altin = assets.filter((a) => a.unitType === "Piece" || (a.unitType === "Gram" && a.assetTypeCode !== "SILVER"));
  const diger = assets.filter((a) => a.unitType === "Gram" && a.assetTypeCode === "SILVER");

  const groups: AssetGroup[] = [];

  if (doviz.length > 0) {
    groups.push({ label: t("portfolio.groups.currency"), icon: Banknote, accentColor: "#4ade80", items: doviz });
  }
  if (altin.length > 0) {
    groups.push({ label: t("portfolio.groups.gold"), icon: Coins, accentColor: "var(--color-gold)", items: altin });
  }
  if (diger.length > 0) {
    groups.push({ label: t("portfolio.groups.other"), icon: Scale, accentColor: "#60a5fa", items: diger });
  }

  return groups;
}

function PortfolioRow({ asset, onClick }: { asset: PortfolioAsset; onClick: () => void }) {
  const { t } = useTranslation();
  // Mağaza perspektifi:
  // Müşterilerin (-) bakiyeleri (totalNegative) mağazanın Alacağıdır (Pozitif gösterilir)
  // Müşterilerin (+) bakiyeleri (totalPositive) mağazanın Borcudur/Vereceğidir (Negatif gösterilir)

  return (
    <button
      onClick={onClick}
      className="group/row w-full flex items-center gap-2 sm:gap-4 lg:gap-6 px-2 sm:px-3 md:px-4 py-3 rounded-xl transition-all duration-200 hover:bg-white/60 dark:hover:bg-white/[0.04] cursor-pointer border border-transparent hover:border-black/5 dark:hover:border-white/5"
    >
      {/* Varlık Kodu */}
      <div className="flex-shrink-0 w-16 sm:w-20 lg:w-28 text-left">
        <span className="inline-flex items-center justify-center px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs lg:text-sm font-bold tracking-wider bg-black/[0.04] dark:bg-white/[0.06] text-foreground/80 border border-black/[0.03] dark:border-white/[0.04]">
          {asset.assetTypeCode}
        </span>
      </div>

      {/* Varlık Adı */}
      <span className="flex-1 text-xs sm:text-sm lg:text-base font-medium text-foreground/80 text-left truncate group-hover/row:text-foreground transition-colors min-w-[60px] sm:min-w-[80px] lg:min-w-[120px]">
        {asset.assetTypeName}
      </span>

      {/* Müşteri Sayısı */}
      <span className="hidden md:flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground/70 flex-shrink-0 w-16 sm:w-20 lg:w-24">
        <Users className="h-3 w-3" />
        {asset.customerCount}
      </span>

      {/* Toplam Alacak (Müşteri Borcu) */}
      <div className="hidden lg:flex flex-col items-end flex-shrink-0 w-24 xl:w-32">
        <AmountDisplay
          value={Math.abs(asset.totalNegative)}
          unitType={asset.unitType}
          size="lg"
          className="font-medium text-[var(--color-alacak)]"
        />
      </div>

      {/* Toplam Verecek (Müşteri Alacağı) */}
      <div className="hidden lg:flex flex-col items-end flex-shrink-0 w-24 xl:w-32">
        <AmountDisplay
          value={Math.abs(asset.totalPositive)}
          unitType={asset.unitType}
          size="lg"
          className="font-medium text-[var(--color-borc)]"
        />
      </div>

      {/* Net Durum */}
      <div className="flex flex-col items-end flex-shrink-0 w-24 sm:w-28 lg:w-36">
        <AmountDisplay
          value={asset.netAmount}
          unitType={asset.unitType}
          size="lg"
          invertPolarity={true}
          className="font-semibold tabular-nums"
        />
      </div>

      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0 opacity-0 group-hover/row:opacity-100 transition-all transform group-hover/row:translate-x-0.5" />
    </button>
  );
}

function PortfolioGroupSection({ group, onDetail }: { group: AssetGroup; onDetail: (a: PortfolioAsset) => void }) {
  const Icon = group.icon;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{
            background: `color-mix(in srgb, ${group.accentColor} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${group.accentColor} 20%, transparent)`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: group.accentColor }} />
        </div>
        <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/80">
          {group.label}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-black/5 dark:from-white/5 to-transparent" />
      </div>
      <div className="space-y-0.5 px-1">
        {group.items.map((asset) => (
          <PortfolioRow key={asset.assetTypeId} asset={asset} onClick={() => onDetail(asset)} />
        ))}
      </div>
    </div>
  );
}

// ── PortfolioReportPage ───────────────────────────────────────
export function PortfolioReportPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAsset, setSelectedAsset] = useState<PortfolioAsset | null>(null);
  const [assetDetail, setAssetDetail] = useState<AssetDetailCustomer[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [ozetOpen, setOzetOpen] = useState(false);

  useEffect(() => {
    assetTypeApi.getAll().then(list => setAssetTypes(list.filter(a => a.isActive))).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    reportApi
      .getPortfolio()
      .then(setPortfolio)
      .catch(() => toast.error(t("portfolio.loadError")))
      .finally(() => setLoading(false));
  }, []);

  const openDetail = (asset: PortfolioAsset) => {
    setSelectedAsset(asset);
    setDetailLoading(true);
    reportApi
      .getAssetDetail(asset.assetTypeId)
      .then(setAssetDetail)
      .catch(() => toast.error(t("portfolio.detailLoadError")))
      .finally(() => setDetailLoading(false));
  };

  const groups = groupPortfolioAssets(portfolio, t);

  const portfolioColumns: ColumnDef<PortfolioAsset>[] = [
    { accessorKey: "assetTypeCode", header: t("portfolio.columns.code") },
    { accessorKey: "assetTypeName", header: t("portfolio.columns.assetName") },
    {
      accessorKey: "unitType",
      header: t("portfolio.columns.unit"),
      cell: ({ getValue }) => {
        const map: Record<string, string> = {
          Currency: t("portfolio.units.Currency"),
          Piece: t("portfolio.units.Piece"),
          Gram: t("portfolio.units.Gram"),
        };
        return <span className="text-muted-foreground">{map[getValue<string>()] ?? getValue<string>()}</span>;
      },
    },
    {
      accessorKey: "totalNegative",
      header: t("portfolio.storeReceivable"),
      cell: ({ row }) => (
        <AmountDisplay value={Math.abs(row.original.totalNegative)} unitType={row.original.unitType} className="text-[var(--color-alacak)]" />
      ),
    },
    {
      accessorKey: "totalPositive",
      header: t("portfolio.storePayable"),
      cell: ({ row }) => (
        <AmountDisplay value={Math.abs(row.original.totalPositive)} unitType={row.original.unitType} className="text-[var(--color-borc)]" />
      ),
    },
    {
      accessorKey: "netAmount",
      header: t("portfolio.netStatus"),
      cell: ({ row }) => (
        <AmountDisplay value={row.original.netAmount} unitType={row.original.unitType} invertPolarity={true} />
      ),
    },
    {
      accessorKey: "customerCount",
      header: t("portfolio.customerCount"),
      cell: ({ getValue }) => (
        <Badge variant="secondary">{getValue<number>()} {t("portfolio.columns.customers")}</Badge>
      ),
    },
  ];

  const assetDetailColumns = (nav: (path: string) => void): ColumnDef<AssetDetailCustomer>[] => [
    {
      accessorKey: "customerFullName",
      header: t("portfolio.columns.customer"),
      cell: ({ row }) => (
        <button
          className="font-medium hover:underline text-left"
          onClick={() => nav(`/customers/${row.original.customerId}`)}
        >
          {row.original.customerFullName}
        </button>
      ),
    },
    {
      accessorKey: "amount",
      header: t("portfolio.customerBalance"),
      cell: ({ getValue }) => {
        const v = getValue<number>();
        // Tabloda müşterinin bakiyesini tam tersine (mağaza perspektifinden) gösteriyoruz
        const storeV = v * -1;
        const cls = storeV > 0 ? "text-[var(--color-alacak)]" : storeV < 0 ? "text-[var(--color-borc)]" : "text-muted-foreground";
        return <span className={`font-medium tabular-nums ${cls}`}>{Math.abs(storeV).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>;
      },
    },
    {
      id: "status",
      header: t("portfolio.storeStatus"),
      cell: ({ row }) => {
        const storeV = row.original.amount * -1;
        if (storeV === 0) return <Badge className="bg-gray-100 text-gray-800">{t("portfolio.zero")}</Badge>;
        return storeV > 0
          ? <Badge className="bg-[rgba(74,222,128,0.1)] text-[#4ade80] border-[#4ade80]/20">{t("portfolio.receivable")}</Badge>
          : <Badge className="bg-[rgba(248,113,113,0.1)] text-[#f87171] border-[#f87171]/20">{t("portfolio.payable")}</Badge>;
      },
    },
  ];

  const mainExportSummary = useMemo(() => {
    return groups.map(g => ({
      title: g.label,
      items: g.items.map(a => ({
        label: a.assetTypeName,
        value: `${(a.netAmount ?? 0).toLocaleString("tr-TR")} ${a.netAmount >= 0 ? `(${t("portfolio.payable")})` : `(${t("portfolio.receivable")})`}`
      }))
    }));
  }, [groups, t]);

  const detailExportSummary = useMemo(() => {
    if (!selectedAsset) return undefined;
    return [{
      title: t("portfolio.export.assetInfo"),
      items: [
        { label: t("portfolio.export.asset"), value: selectedAsset.assetTypeName },
        { label: t("portfolio.export.code"), value: selectedAsset.assetTypeCode },
        { label: t("portfolio.export.totalNet"), value: (selectedAsset.netAmount ?? 0).toLocaleString("tr-TR") }
      ]
    }];
  }, [selectedAsset, t]);

  const portfolioBalances = useMemo((): Balance[] => {
    return portfolio.map((p) => ({
      assetTypeId: p.assetTypeId,
      assetTypeCode: p.assetTypeCode,
      assetTypeName: p.assetTypeName,
      unitType: p.unitType,
      amount: p.netAmount,
    }));
  }, [portfolio]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("portfolio.title")}
        description={t("portfolio.description")}
      />

      {/* Özet Gruplu Liste Görünümü (Dashboard stili) */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[--color-gold-glow] to-transparent opacity-30 dark:opacity-15 -z-10 rounded-3xl blur-2xl" />

        <div className="bg-card/50 dark:bg-card/30 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/[0.04] shadow-xl shadow-black/5 overflow-hidden pb-4">
          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl bg-black/[0.03] dark:bg-white/[0.03]" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">{t("portfolio.noBalance")}</p>
            </div>
          ) : (
            <>
              {/* Sütun başlıkları */}
              <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 px-2 sm:px-3 md:px-4 pt-3 pb-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="flex-shrink-0 w-16 sm:w-20 lg:w-28" />
                <div className="flex-1 min-w-[60px] sm:min-w-[80px] lg:min-w-[120px]" />
                <div className="hidden md:block flex-shrink-0 w-16 sm:w-20 lg:w-24" />
                <div className="hidden lg:flex flex-shrink-0 w-24 xl:w-32 justify-end">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-alacak)]">{t("portfolio.storeReceivable")}</span>
                </div>
                <div className="hidden lg:flex flex-shrink-0 w-24 xl:w-32 justify-end">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-borc)]">{t("portfolio.storePayable")}</span>
                </div>
                <div className="flex flex-shrink-0 w-24 sm:w-28 lg:w-36 justify-end">
                  <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: "var(--color-gold)" }}>{t("portfolio.netStatus")}</span>
                </div>
                <div className="w-3.5 flex-shrink-0" />
              </div>
              <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                {groups.map((group) => (
                  <PortfolioGroupSection key={group.label} group={group} onDetail={openDetail} />
                ))}
              </div>
            </>
          )}

          {portfolio.length > 0 && !loading && (
            <div className="mt-2 p-5 border-t border-black/[0.03] dark:border-white/[0.03] flex justify-center">
              <button
                onClick={() => setOzetOpen(true)}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300"
                style={{
                  color: "var(--color-gold)",
                  background: "rgba(212,164,55,0.06)",
                  border: "1px solid rgba(212,164,55,0.3)",
                  boxShadow: "0 0 0 1px rgba(212,164,55,0.15), 0 2px 8px rgba(212,164,55,0.12), inset 0 1px 0 rgba(245,209,110,0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(212,164,55,0.12)";
                  e.currentTarget.style.borderColor = "rgba(212,164,55,0.6)";
                  e.currentTarget.style.boxShadow = "0 0 0 1px rgba(212,164,55,0.4), 0 4px 16px rgba(212,164,55,0.3), 0 0 28px rgba(212,164,55,0.15), inset 0 1px 0 rgba(245,209,110,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(212,164,55,0.06)";
                  e.currentTarget.style.borderColor = "rgba(212,164,55,0.3)";
                  e.currentTarget.style.boxShadow = "0 0 0 1px rgba(212,164,55,0.15), 0 2px 8px rgba(212,164,55,0.12), inset 0 1px 0 rgba(245,209,110,0.15)";
                }}
              >
                <span style={{ fontSize: "1rem", lineHeight: 1 }}>₺</span>
                {t("dashboard.calculateGeneralBalance") || "Mağaza Bakiye Hesapla"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Genel tablo */}
      <div>
        <h2 className="mb-3 text-base font-semibold px-1">{t("portfolio.tableView")}</h2>
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 shadow-xl shadow-black/5 overflow-hidden">
          <DataTable
            columns={portfolioColumns}
            data={portfolio}
            isLoading={loading}
            searchPlaceholder={t("portfolio.searchAsset")}
            emptyMessage={t("portfolio.noData")}
            exportFilename="magaza-bakiye-ozeti"
            exportSummary={mainExportSummary}
            exportColumns={[
              { accessor: "assetTypeCode", header: t("portfolio.export.code") },
              { accessor: "assetTypeName", header: t("portfolio.export.assetName") },
              { accessor: "unitType", header: t("portfolio.export.unit") },
              { accessor: "totalNegative", header: t("portfolio.export.storeReceivable"), formatter: (val) => Math.abs(val as number).toLocaleString("tr-TR") },
              { accessor: "totalPositive", header: t("portfolio.export.storePayable"), formatter: (val) => Math.abs(val as number).toLocaleString("tr-TR") },
              { accessor: "netAmount", header: t("portfolio.export.netStatus"), formatter: (val) => (val as number).toLocaleString("tr-TR") },
              { accessor: "customerCount", header: t("portfolio.export.customerCount") },
            ]}
          />
        </div>
      </div>

      {/* Varlık detay dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col p-4 sm:p-6">
          <DialogHeader className="mb-2 flex-shrink-0">
            <DialogTitle>
              {selectedAsset?.assetTypeName} — {t("portfolio.affectedCustomers")}
            </DialogTitle>
          </DialogHeader>

          <DataTable
            columns={assetDetailColumns(navigate)}
            data={assetDetail}
            isLoading={detailLoading}
            searchPlaceholder={t("portfolio.searchCustomer")}
            emptyMessage={t("portfolio.noCustomerBalance")}
            exportFilename={`${selectedAsset?.assetTypeCode?.toLowerCase()}-dagilimi`}
            exportSummary={detailExportSummary}
            exportColumns={[
              { accessor: "customerFullName", header: t("portfolio.export.customer") },
              { accessor: "amount", header: t("portfolio.export.customerBalance"), formatter: (val) => (val as number).toLocaleString("tr-TR") },
            ]}
          />
        </DialogContent>
      </Dialog>

      <OzetBakiyeModal
        open={ozetOpen}
        onOpenChange={setOzetOpen}
        balances={portfolioBalances}
        assetTypes={assetTypes}
      />
    </div>
  );
}
