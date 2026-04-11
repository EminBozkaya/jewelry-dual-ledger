import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Activity,
  UserCheck,
  CalendarDays,
  Plus,
  Search,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { dashboardApi, type DashboardSummary } from "@/api/dashboard";
import { reportApi } from "@/api/reports";
import type { Transaction, PortfolioAsset } from "@/types";
import { formatDate, formatTransactionType, formatAmount } from "@/lib/formatters";

import { PageHeader } from "@/components/shared/PageHeader";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/shared/DataTable";

// ── İşlem tipi badge ─────────────────────────────────────────
function TxTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    Deposit: "bg-green-100 text-green-800",
    Withdrawal: "bg-red-100 text-red-800",
    Conversion: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[type] ?? "bg-muted text-muted-foreground"}`}
    >
      {formatTransactionType(type)}
    </span>
  );
}

// ── Özet kart ────────────────────────────────────────────────
function SummaryCard({
  title,
  value,
  icon: Icon,
  colorClass,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  colorClass?: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${colorClass ?? "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className={`text-2xl font-bold ${colorClass ?? ""}`}>{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Son işlemler sütunları ────────────────────────────────────
const recentColumns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "createdAt",
    header: "Tarih",
    cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span>,
  },
  {
    accessorKey: "customerFullName",
    header: "Müşteri",
    cell: ({ getValue }) => <span className="font-medium text-sm">{getValue<string>()}</span>,
  },
  {
    accessorKey: "type",
    header: "İşlem",
    cell: ({ getValue }) => <TxTypeBadge type={getValue<string>()} />,
  },
  {
    id: "asset",
    header: "Varlık",
    enableSorting: false,
    cell: ({ row }) => {
      const t = row.original;
      if (t.type === "Conversion" && t.conversion) {
        return <span className="text-sm text-muted-foreground">{t.conversion.fromAssetCode} → {t.conversion.toAssetCode}</span>;
      }
      return <span className="text-sm text-muted-foreground">{t.assetTypeName ?? "—"}</span>;
    },
  },
  {
    accessorKey: "createdByFullName",
    header: "İşlemi Yapan",
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="hidden md:block text-sm text-muted-foreground">{getValue<string>()}</span>
    ),
  },
];

// ── DashboardPage ─────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getSummary()
      .then(setSummary)
      .catch(() => toast.error("Dashboard verileri yüklenemedi"))
      .finally(() => setLoading(false));

    reportApi
      .getPortfolio()
      .then((data) => setPortfolio(data.slice(0, 5))) // En çok hareket gören 5 varlık
      .catch(() => {})
      .finally(() => setPortfolioLoading(false));
  }, []);

  // Bugün toplam işlem adedi (son 7 gün placeholder)
  const today = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gösterge Paneli"
        description="Genel bakış — müşteri ve işlem özeti"
      />

      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Toplam Müşteri"
          value={summary?.totalCustomers ?? 0}
          icon={Users}
          loading={loading}
        />
        <SummaryCard
          title="Aktif Kullanıcı"
          value={summary?.totalActiveUsers ?? 0}
          icon={UserCheck}
          loading={loading}
        />
        <SummaryCard
          title="Bugünkü İşlem"
          value={summary?.todayTransactionCount ?? 0}
          icon={Activity}
          loading={loading}
        />
        <SummaryCard
          title="Tarih"
          value={today.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
          icon={CalendarDays}
          loading={false}
        />
      </div>

      {/* Hızlı Erişim */}
      <div className="flex flex-col gap-3 sm:flex-row flex-wrap">
        <Button
          className="flex-1 gap-2 min-h-12 text-base sm:flex-none sm:min-h-11 sm:text-sm"
          onClick={() => navigate("/customers")}
        >
          <Plus className="h-4 w-4" />
          Yeni Müşteri Ekle
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2 min-h-12 text-base sm:flex-none sm:min-h-11 sm:text-sm"
          onClick={() => navigate("/customers")}
        >
          <Search className="h-4 w-4" />
          Müşteri Ara
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2 min-h-12 text-base sm:flex-none sm:min-h-11 sm:text-sm"
          onClick={() => navigate("/reports/daily")}
        >
          <BarChart3 className="h-4 w-4" />
          Günlük Rapor
        </Button>
      </div>

      {/* Mini Portföy — en fazla bakiyesi olan 5 varlık */}
      {(portfolioLoading || portfolio.length > 0) && (
        <div>
          <h2 className="mb-3 text-base font-semibold">Varlık Durumu</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {portfolioLoading
              ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
              : portfolio.map((asset) => (
                  <Card
                    key={asset.assetTypeId}
                    className={`cursor-pointer border-t-4 hover:shadow-md transition-shadow ${asset.netAmount >= 0 ? "border-t-[var(--color-alacak)]" : "border-t-[var(--color-borc)]"}`}
                    onClick={() => navigate("/reports/portfolio")}
                  >
                    <CardHeader className="pb-1 pt-3 px-3">
                      <CardTitle className="text-xs text-muted-foreground">{asset.assetTypeName}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                      <AmountDisplay value={asset.netAmount} unitType={asset.unitType} size="sm" />
                      <p className="text-xs text-muted-foreground mt-1">{asset.customerCount} müşteri</p>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </div>
      )}

      {/* Son İşlemler */}
      <div>
        <h2 className="mb-3 text-base font-semibold">Son İşlemler</h2>
        <DataTable
          columns={recentColumns}
          data={summary?.recentTransactions ?? []}
          isLoading={loading}
          searchPlaceholder="İşlemlerde ara..."
          emptyMessage="Henüz işlem yapılmamış"
          onRowClick={(t) => navigate(`/customers/${t.customerId}`)}
        />
      </div>
    </div>
  );
}
