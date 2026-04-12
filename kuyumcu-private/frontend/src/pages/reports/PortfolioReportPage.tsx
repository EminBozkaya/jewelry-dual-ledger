import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Users, ArrowRight, Banknote, Coins, Scale } from "lucide-react";

import { reportApi } from "@/api/reports";
import type { PortfolioAsset, AssetDetailCustomer } from "@/types";

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

function groupPortfolioAssets(assets: PortfolioAsset[]): AssetGroup[] {
  const doviz = assets.filter((a) => a.unitType === "Currency");
  const altin = assets.filter((a) => a.unitType === "Piece" || (a.unitType === "Gram" && a.assetTypeCode !== "SILVER"));
  const diger = assets.filter((a) => a.unitType === "Gram" && a.assetTypeCode === "SILVER");

  const groups: AssetGroup[] = [];

  if (doviz.length > 0) {
    groups.push({ label: "Döviz", icon: Banknote, accentColor: "#4ade80", items: doviz });
  }
  if (altin.length > 0) {
    groups.push({ label: "Altın", icon: Coins, accentColor: "var(--color-gold)", items: altin });
  }
  if (diger.length > 0) {
    groups.push({ label: "Diğer", icon: Scale, accentColor: "#60a5fa", items: diger });
  }

  return groups;
}

function PortfolioRow({ asset, onClick }: { asset: PortfolioAsset; onClick: () => void }) {
  // Mağaza perspektifi:
  // Müşterilerin (-) bakiyeleri (totalNegative) mağazanın Alacağıdır (Pozitif gösterilir)
  // Müşterilerin (+) bakiyeleri (totalPositive) mağazanın Borcudur/Vereceğidir (Negatif gösterilir)

  return (
    <button
      onClick={onClick}
      className="group/row w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-white/60 dark:hover:bg-white/[0.04] cursor-pointer border border-transparent hover:border-black/5 dark:hover:border-white/5"
    >
      {/* Varlık Kodu */}
      <div className="flex-shrink-0 w-16 text-left">
        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold tracking-wider bg-black/[0.04] dark:bg-white/[0.06] text-foreground/80 border border-black/[0.03] dark:border-white/[0.04]">
          {asset.assetTypeCode}
        </span>
      </div>

      {/* Varlık Adı */}
      <span className="flex-1 text-sm font-medium text-foreground/80 text-left truncate group-hover/row:text-foreground transition-colors min-w-[100px]">
        {asset.assetTypeName}
      </span>

      {/* Müşteri Sayısı */}
      <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground/70 flex-shrink-0 w-24">
        <Users className="h-3 w-3" />
        {asset.customerCount}
      </span>

      {/* Toplam Alacak (Müşteri Borcu) */}
      <div className="hidden md:flex flex-col items-end flex-shrink-0 w-32">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Mağaza Alacağı</span>
        <AmountDisplay
          value={Math.abs(asset.totalNegative)}
          unitType={asset.unitType}
          size="sm"
          className="font-medium text-[var(--color-alacak)]"
        />
      </div>

      {/* Toplam Verecek (Müşteri Alacağı) */}
      <div className="hidden md:flex flex-col items-end flex-shrink-0 w-32">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Mağaza Vereceği</span>
        <AmountDisplay
          value={Math.abs(asset.totalPositive)}
          unitType={asset.unitType}
          size="sm"
          className="font-medium text-[var(--color-borc)]"
        />
      </div>

      {/* Net Durum */}
      <div className="flex flex-col items-end flex-shrink-0 w-32">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground md:hidden">Net Durum</span>
        <AmountDisplay
          value={asset.netAmount}
          unitType={asset.unitType}
          size="sm"
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

// ── Portföy genel tablosu sütunları ──────────────────────────
const portfolioColumns: ColumnDef<PortfolioAsset>[] = [
  { accessorKey: "assetTypeCode", header: "Kod" },
  { accessorKey: "assetTypeName", header: "Varlık Adı" },
  {
    accessorKey: "unitType",
    header: "Birim",
    cell: ({ getValue }) => {
      const map: Record<string, string> = { Currency: "Para", Piece: "Adet", Gram: "Gram" };
      return <span className="text-muted-foreground">{map[getValue<string>()] ?? getValue<string>()}</span>;
    },
  },
  {
    accessorKey: "totalNegative",
    header: "Mağaza Alacağı",
    cell: ({ row }) => (
      <AmountDisplay value={Math.abs(row.original.totalNegative)} unitType={row.original.unitType} className="text-[var(--color-alacak)]" />
    ),
  },
  {
    accessorKey: "totalPositive",
    header: "Mağaza Vereceği",
    cell: ({ row }) => (
      <AmountDisplay value={Math.abs(row.original.totalPositive)} unitType={row.original.unitType} className="text-[var(--color-borc)]" />
    ),
  },
  {
    accessorKey: "netAmount",
    header: "Net Durum",
    cell: ({ row }) => (
      <AmountDisplay value={row.original.netAmount} unitType={row.original.unitType} invertPolarity={true} />
    ),
  },
  {
    accessorKey: "customerCount",
    header: "Müşteri Sayısı",
    cell: ({ getValue }) => (
      <Badge variant="secondary">{getValue<number>()} müşteri</Badge>
    ),
  },
];

// ── Varlık detay dialog sütunları ────────────────────────────
function assetDetailColumns(navigate: (path: string) => void): ColumnDef<AssetDetailCustomer>[] {
  return [
    {
      accessorKey: "customerFullName",
      header: "Müşteri",
      cell: ({ row }) => (
        <button
          className="font-medium hover:underline text-left"
          onClick={() => navigate(`/customers/${row.original.customerId}`)}
        >
          {row.original.customerFullName}
        </button>
      ),
    },
    {
      accessorKey: "amount",
      header: "Müşteri Bakiyesi",
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
      header: "Mağaza Durumu",
      cell: ({ row }) => {
        const storeV = row.original.amount * -1;
        if (storeV === 0) return <Badge className="bg-gray-100 text-gray-800">Sıfır</Badge>;
        return storeV > 0
          ? <Badge className="bg-[rgba(74,222,128,0.1)] text-[#4ade80] border-[#4ade80]/20">Alacak</Badge>
          : <Badge className="bg-[rgba(248,113,113,0.1)] text-[#f87171] border-[#f87171]/20">Verecek</Badge>;
      },
    },
  ];
}

// ── PortfolioReportPage ───────────────────────────────────────
export function PortfolioReportPage() {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAsset, setSelectedAsset] = useState<PortfolioAsset | null>(null);
  const [assetDetail, setAssetDetail] = useState<AssetDetailCustomer[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    reportApi
      .getPortfolio()
      .then(setPortfolio)
      .catch(() => toast.error("Portföy verileri yüklenemedi"))
      .finally(() => setLoading(false));
  }, []);

  const openDetail = (asset: PortfolioAsset) => {
    setSelectedAsset(asset);
    setDetailLoading(true);
    reportApi
      .getAssetDetail(asset.assetTypeId)
      .then(setAssetDetail)
      .catch(() => toast.error("Detay verileri yüklenemedi"))
      .finally(() => setDetailLoading(false));
  };

  const groups = groupPortfolioAssets(portfolio);

  const mainExportSummary = useMemo(() => {
    return groups.map(g => ({
      title: g.label,
      items: g.items.map(a => ({
        label: a.assetTypeName,
        value: `${(a.netAmount ?? 0).toLocaleString("tr-TR")} ${a.netAmount >= 0 ? "(Borçlu/Verecek)" : "(Alacaklı)"}`
      }))
    }));
  }, [groups]);

  const detailExportSummary = useMemo(() => {
    if (!selectedAsset) return undefined;
    return [{
      title: "Varlık Bilgisi",
      items: [
        { label: "Varlık", value: selectedAsset.assetTypeName },
        { label: "Kod", value: selectedAsset.assetTypeCode },
        { label: "Toplam Net", value: (selectedAsset.netAmount ?? 0).toLocaleString("tr-TR") }
      ]
    }];
  }, [selectedAsset]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mağaza Bakiye Özeti"
        description="Mağazanın varlık bazındaki toplam alacak ve verecek durumu"
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
              <p className="text-sm text-muted-foreground">Henüz kayıtlı bakiye bulunmuyor.</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
              {groups.map((group) => (
                <PortfolioGroupSection key={group.label} group={group} onDetail={openDetail} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Genel tablo */}
      <div>
        <h2 className="mb-3 text-base font-semibold px-1">Tablo Görünümü</h2>
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 shadow-xl shadow-black/5 overflow-hidden">
          <DataTable
            columns={portfolioColumns}
            data={portfolio}
            isLoading={loading}
            searchPlaceholder="Varlık ara..."
            emptyMessage="Portföy verisi bulunamadı"
            exportFilename="magaza-bakiye-ozeti"
            exportSummary={mainExportSummary}
            exportColumns={[
              { accessor: "assetTypeCode", header: "Kod" },
              { accessor: "assetTypeName", header: "Varlık Adı" },
              { accessor: "unitType", header: "Birim" },
              { accessor: "totalNegative", header: "Mağaza Alacağı", formatter: (val) => Math.abs(val as number).toLocaleString("tr-TR") },
              { accessor: "totalPositive", header: "Mağaza Vereceği", formatter: (val) => Math.abs(val as number).toLocaleString("tr-TR") },
              { accessor: "netAmount", header: "Net Durum", formatter: (val) => (val as number).toLocaleString("tr-TR") },
              { accessor: "customerCount", header: "Müşteri Sayısı" },
            ]}
          />
        </div>
      </div>

      {/* Varlık detay dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col p-4 sm:p-6">
          <DialogHeader className="mb-2 flex-shrink-0">
            <DialogTitle>
              {selectedAsset?.assetTypeName} — Etkilenen Müşteriler
            </DialogTitle>
          </DialogHeader>
          
          <DataTable
            columns={assetDetailColumns(navigate)}
            data={assetDetail}
            isLoading={detailLoading}
            searchPlaceholder="Müşteri ara..."
            emptyMessage="Bu varlıkta bakiyesi olan müşteri yok"
            exportFilename={`${selectedAsset?.assetTypeCode?.toLowerCase()}-dagilimi`}
            exportSummary={detailExportSummary}
            exportColumns={[
              { accessor: "customerFullName", header: "Müşteri" },
              { accessor: "amount", header: "Müşteri Bakiyesi", formatter: (val) => (val as number).toLocaleString("tr-TR") },
            ]}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
