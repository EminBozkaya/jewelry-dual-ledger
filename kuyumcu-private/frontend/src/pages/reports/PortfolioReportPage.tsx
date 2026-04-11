import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { TrendingUp, TrendingDown, Users, ChevronRight } from "lucide-react";

import { reportApi } from "@/api/reports";
import type { PortfolioAsset, AssetDetailCustomer } from "@/types";
import { formatAmount } from "@/lib/formatters";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Varlık özet kartı ─────────────────────────────────────────
function AssetCard({
  asset,
  onDetail,
}: {
  asset: PortfolioAsset;
  onDetail: (asset: PortfolioAsset) => void;
}) {
  const isPositiveNet = asset.netAmount >= 0;

  return (
    <Card
      className={`border-t-4 ${isPositiveNet ? "border-t-[var(--color-alacak)]" : "border-t-[var(--color-borc)]"}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{asset.assetTypeName}</span>
          <Badge variant="outline" className="text-xs font-mono">
            {asset.assetTypeCode}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-[var(--color-alacak)]" />
            Toplam Alacak
          </span>
          <span className="font-medium text-[var(--color-alacak)]">
            {formatAmount(asset.totalPositive, asset.unitType)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <TrendingDown className="h-3.5 w-3.5 text-[var(--color-borc)]" />
            Toplam Borç
          </span>
          <span className="font-medium text-[var(--color-borc)]">
            {formatAmount(asset.totalNegative, asset.unitType)}
          </span>
        </div>
        <div className="border-t pt-2 flex justify-between text-sm font-semibold">
          <span>Net Durum</span>
          <AmountDisplay value={asset.netAmount} unitType={asset.unitType} />
        </div>
        <div className="flex justify-between items-center pt-1">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {asset.customerCount} müşteri
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onDetail(asset)}
          >
            Detay Gör
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
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
    accessorKey: "totalPositive",
    header: "Toplam Alacak",
    cell: ({ row }) => (
      <AmountDisplay value={row.original.totalPositive} unitType={row.original.unitType} />
    ),
  },
  {
    accessorKey: "totalNegative",
    header: "Toplam Borç",
    cell: ({ row }) => (
      <span className="text-[var(--color-borc)]">
        {formatAmount(row.original.totalNegative, row.original.unitType)}
      </span>
    ),
  },
  {
    accessorKey: "netAmount",
    header: "Net Durum",
    cell: ({ row }) => (
      <AmountDisplay value={row.original.netAmount} unitType={row.original.unitType} />
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
      header: "Bakiye",
      cell: ({ getValue }) => {
        // unitType dialog state'den gelecek, burada basit göster
        const v = getValue<number>();
        const cls = v >= 0 ? "text-[var(--color-alacak)]" : "text-[var(--color-borc)]";
        return <span className={`font-medium ${cls}`}>{Math.abs(v).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>;
      },
    },
    {
      id: "status",
      header: "Durum",
      cell: ({ row }) => (
        row.original.amount >= 0
          ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Alacak</Badge>
          : <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Borç</Badge>
      ),
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Genel Portföy Raporu"
        description="Tüm müşterilerin varlık bazında özet durumu"
      />

      {/* Varlık kartları */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : portfolio.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          Henüz kayıtlı bakiye bulunmuyor.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {portfolio.map((asset) => (
            <AssetCard key={asset.assetTypeId} asset={asset} onDetail={openDetail} />
          ))}
        </div>
      )}

      {/* Genel tablo */}
      <div>
        <h2 className="mb-3 text-base font-semibold">Tablo Görünümü</h2>
        <DataTable
          columns={portfolioColumns}
          data={portfolio}
          isLoading={loading}
          searchPlaceholder="Varlık ara..."
          emptyMessage="Portföy verisi bulunamadı"
          exportFilename="genel-portfoy-raporu"
          exportColumns={[
            { accessor: "assetTypeCode", header: "Kod" },
            { accessor: "assetTypeName", header: "Varlık Adı" },
            { accessor: "unitType", header: "Birim" },
            { accessor: "totalPositive", header: "Toplam Alacak" },
            { accessor: "totalNegative", header: "Toplam Borç" },
            { accessor: "netAmount", header: "Net Durum" },
            { accessor: "customerCount", header: "Müşteri Sayısı" },
          ]}
        />
      </div>

      {/* Varlık detay dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAsset?.assetTypeName} — Müşteri Dağılımı
            </DialogTitle>
          </DialogHeader>
          <DataTable
            columns={assetDetailColumns(navigate)}
            data={assetDetail}
            isLoading={detailLoading}
            searchPlaceholder="Müşteri ara..."
            emptyMessage="Bu varlıkta bakiyesi olan müşteri yok"
            exportFilename={`${selectedAsset?.assetTypeCode?.toLowerCase()}-dagilimi`}
            exportColumns={[
              { accessor: "customerFullName", header: "Müşteri" },
              { accessor: "amount", header: "Bakiye" },
            ]}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
