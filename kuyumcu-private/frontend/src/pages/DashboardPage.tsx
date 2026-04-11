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
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { dashboardApi, type DashboardSummary } from "@/api/dashboard";
import { reportApi } from "@/api/reports";
import type { Transaction, PortfolioAsset } from "@/types";
import { formatDate, formatTransactionType } from "@/lib/formatters";

import { PageHeader } from "@/components/shared/PageHeader";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/shared/DataTable";

// ── İşlem tipi badge ─────────────────────────────────────────
function TxTypeBadge({ type }: { type: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    Deposit: { bg: "rgba(74, 222, 128, 0.1)", text: "#4ade80" },
    Withdrawal: { bg: "rgba(248, 113, 113, 0.1)", text: "#f87171" },
    Conversion: { bg: "rgba(96, 165, 250, 0.1)", text: "#60a5fa" },
  };
  const colors = map[type] ?? { bg: "var(--muted)", text: "var(--muted-foreground)" };
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ background: colors.bg, color: colors.text }}
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
  accentColor,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  accentColor?: string;
  loading: boolean;
}) {
  const accent = accentColor ?? "var(--color-gold)";
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 bg-card/60 dark:bg-card/40 backdrop-blur-xl border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
          style={{ 
            borderTop: `2px solid ${accent}`,
            boxShadow: `0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.05), 0 8px 30px -4px color-mix(in srgb, ${accent} 25%, transparent)`
          }}>
      {/* Subtle glow background */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.2] dark:opacity-[0.06] blur-2xl rounded-full -translate-y-1/2 translate-x-1/3 group-hover:opacity-[0.3] dark:group-hover:opacity-[0.1] transition-opacity duration-300"
           style={{ background: accent }} />
           
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5 relative z-10">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">
          {title}
        </CardTitle>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-inner transition-transform duration-300 group-hover:scale-110"
             style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)` }}>
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 relative z-10">
        {loading ? (
          <Skeleton className="h-9 w-24 bg-black/5 dark:bg-white/5" />
        ) : (
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
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
          accentColor="var(--color-gold)"
          loading={loading}
        />
        <SummaryCard
          title="Aktif Kullanıcı"
          value={summary?.totalActiveUsers ?? 0}
          icon={UserCheck}
          accentColor="#4ade80"
          loading={loading}
        />
        <SummaryCard
          title="Bugünkü İşlem"
          value={summary?.todayTransactionCount ?? 0}
          icon={Activity}
          accentColor="#60a5fa"
          loading={loading}
        />
        <SummaryCard
          title="Tarih"
          value={today.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
          icon={CalendarDays}
          accentColor="#c084fc"
          loading={false}
        />
      </div>

      {/* Hızlı Erişim */}
      <div className="flex flex-col gap-3 sm:flex-row flex-wrap items-center bg-card/20 p-2 rounded-2xl border border-white/5 backdrop-blur-md">
        <Button
          className="gap-2 min-h-11 text-sm rounded-xl font-medium shadow-md transition-all hover:scale-[1.02] cursor-pointer"
          style={{ background: "linear-gradient(135deg, #f5d16e, var(--color-gold), #b8860b)", color: "#0c0d12", border: "none" }}
          onClick={() => navigate("/customers")}
        >
          <Plus className="h-4 w-4" />
          Yeni Müşteri Ekle
        </Button>
        <Button
          variant="outline"
          className="gap-2 min-h-11 text-sm rounded-xl font-medium border-black/10 dark:border-white/10 bg-white dark:bg-card/40 hover:bg-black/5 dark:hover:bg-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer text-foreground"
          onClick={() => navigate("/customers")}
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          Müşterilerde Ara
        </Button>
        <Button
          variant="outline"
          className="gap-2 min-h-11 text-sm rounded-xl font-medium border-black/10 dark:border-white/10 bg-white dark:bg-card/40 hover:bg-black/5 dark:hover:bg-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer text-foreground"
          onClick={() => navigate("/reports/daily")}
        >
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Günlük Rapor
        </Button>
      </div>

      {/* Mini Portföy — en fazla bakiyesi olan 5 varlık */}
      {(portfolioLoading || portfolio.length > 0) && (
        <div className="relative mt-8">
          <div className="absolute inset-0 bg-gradient-to-b from-[--color-gold-glow] to-transparent opacity-40 dark:opacity-20 -z-10 rounded-3xl blur-xl" />
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="p-2 rounded-lg bg-[--color-gold-glow] border border-[--color-gold]/20">
              <TrendingUp className="h-4 w-4" style={{ color: "var(--color-gold)" }} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground mb-0.5">Varlık Durumu</h2>
              <p className="text-sm text-muted-foreground">Portföyünüzün güncel özeti</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {portfolioLoading
              ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-black/5 dark:bg-white/5" />)
              : portfolio.map((asset) => (
                  <Card
                    key={asset.assetTypeId}
                    className="cursor-pointer transition-all duration-300 hover:-translate-y-1 group bg-card/60 dark:bg-card/40 backdrop-blur-xl border-black/5 dark:border-white/5"
                    style={{
                      borderLeft: `4px solid ${asset.netAmount >= 0 ? "var(--color-alacak)" : "var(--color-borc)"}`,
                      boxShadow: `0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 20px -5px color-mix(in srgb, ${asset.netAmount >= 0 ? "var(--color-alacak)" : "var(--color-borc)"} 25%, transparent)`
                    }}
                    onClick={() => navigate("/reports/portfolio")}
                  >
                    <CardHeader className="pb-1 pt-4 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{asset.assetTypeName}</CardTitle>
                        <div className="h-6 w-6 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                          <ArrowRight className="h-3 w-3 text-foreground" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="mt-1">
                        <AmountDisplay value={asset.netAmount} unitType={asset.unitType} size="md" />
                      </div>
                      <p className="text-sm text-muted-foreground/80 mt-2 font-medium">{asset.customerCount} aktif müşteri</p>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </div>
      )}

      {/* Son İşlemler */}
      <div className="mt-8 relative">
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="p-2 rounded-lg bg-[--color-gold-glow] border border-[--color-gold]/20">
            <Activity className="h-4 w-4" style={{ color: "var(--color-gold)" }} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-0.5">Son İşlemler</h2>
            <p className="text-sm text-muted-foreground">Sistemdeki en güncel hareketler</p>
          </div>
        </div>
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 shadow-xl shadow-black/5 overflow-hidden">
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
    </div>
  );
}
