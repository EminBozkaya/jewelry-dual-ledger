import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Users,
  Activity,
  UserCheck,
  CalendarDays,
  TrendingUp,
  ArrowRight,
  Banknote,
  Coins,
  Scale,
  LayoutDashboard,
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
  const { t } = useTranslation();
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
      {formatTransactionType(type, t)}
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
            boxShadow: `0 4px 6px -1px rgba(0,0,0,0.05),  0 10px 15px -3px rgba(0,0,0,0.05),  0 8px 30px -4px color-mix(in srgb,  ${accent} 25%,  transparent)`
          }}>
      {/* Subtle glow background */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.2] dark:opacity-[0.06] blur-2xl rounded-full -translate-y-1/2 translate-x-1/3 group-hover:opacity-[0.3] dark:group-hover:opacity-[0.1] transition-opacity duration-300"
           style={{ background: accent }} />
           
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5 relative z-10">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">
          {title}
        </CardTitle>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-inner transition-transform duration-300 group-hover:scale-110"
             style={{ background: `color-mix(in srgb,  ${accent} 15%,  transparent)`,  border: `1px solid color-mix(in srgb,  ${accent} 30%,  transparent)` }}>
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

// ── Varlık grubu ─────────────────────────────────────────────
interface AssetGroup {
  label: string;
  icon: React.ElementType;
  accentColor: string;
  items: PortfolioAsset[];
}

function groupPortfolioAssets(assets: PortfolioAsset[], tFn: (key: string) => string): AssetGroup[] {
  const doviz = assets.filter((a) => a.unitType === "Currency");
  const altin = assets.filter((a) => a.unitType === "Piece" || (a.unitType === "Gram" && a.assetTypeCode !== "SILVER"));
  const diger = assets.filter((a) => a.unitType === "Gram" && a.assetTypeCode === "SILVER");

  const groups: AssetGroup[] = [];

  if (doviz.length > 0) {
    groups.push({ label: tFn("portfolio.groups.currency"), icon: Banknote, accentColor: "#4ade80", items: doviz });
  }
  if (altin.length > 0) {
    groups.push({ label: tFn("portfolio.groups.gold"), icon: Coins, accentColor: "var(--color-gold)", items: altin });
  }
  if (diger.length > 0) {
    groups.push({ label: tFn("portfolio.groups.other"), icon: Scale, accentColor: "#60a5fa", items: diger });
  }

  return groups;
}

function PortfolioRow({ asset, onClick }: { asset: PortfolioAsset; onClick: () => void }) {

  return (
    <button
      onClick={onClick}
      className="group/row w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-white/60 dark:hover:bg-white/[0.04] cursor-pointer border border-transparent hover:border-black/5 dark:hover:border-white/5"
    >
      {/* Asset code badge */}
      <div className="flex-shrink-0 w-16 text-left">
        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold tracking-wider bg-black/[0.04] dark:bg-white/[0.06] text-foreground/80 border border-black/[0.03] dark:border-white/[0.04]">
          {asset.assetTypeCode}
        </span>
      </div>

      {/* Asset name */}
      <span className="flex-1 text-sm font-medium text-foreground/80 text-left truncate group-hover/row:text-foreground transition-colors">
        {asset.assetTypeName}
      </span>

      {/* Customer count */}
      <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground/70 flex-shrink-0">
        <Users className="h-3 w-3" />
        {asset.customerCount}
      </span>

      {/* Net amount */}
      <div className="flex-shrink-0 text-right min-w-[120px]">
        <AmountDisplay
          value={asset.netAmount}
          unitType={asset.unitType}
          size="sm"
          invertPolarity={true}
          className="font-semibold tabular-nums"
        />
      </div>

      {/* Arrow indicator */}
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0 opacity-0 group-hover/row:opacity-100 transition-all transform group-hover/row:translate-x-0.5" />
    </button>
  );
}

function PortfolioGroupSection({ group }: { group: AssetGroup }) {
  const navigate = useNavigate();
  const Icon = group.icon;

  return (
    <div className="space-y-1">
      {/* Group header */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-1">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{
            background: `color-mix(in srgb,  ${group.accentColor} 12%,  transparent)`,
            border: `1px solid color-mix(in srgb,  ${group.accentColor} 20%,  transparent)`,
          }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: group.accentColor }} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
          {group.label}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-black/5 dark:from-white/5 to-transparent" />
      </div>

      {/* Asset rows */}
      <div className="space-y-0.5 px-1">
        {group.items.map((asset) => (
          <PortfolioRow
            key={asset.assetTypeId}
            asset={asset}
            onClick={() => navigate("/reports/portfolio")}
          />
        ))}
      </div>
    </div>
  );
}

// ── Son işlemler sütunları — t fonksiyonu bileşen içinde kullanılacak ────────────────────────────────────
function buildRecentColumns(t: (key: string) => string): ColumnDef<Transaction>[] {
  return [
    {
      accessorKey: "createdAt",
      header: t("dashboard.overview") === "Overview" ? "Date" : "Tarih",
      cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span>,
    },
    {
      accessorKey: "customerFullName",
      header: t("customers.columns.name"),
      cell: ({ getValue }) => <span className="font-medium text-sm">{getValue<string>()}</span>,
    },
    {
      accessorKey: "type",
      header: t("customerDetail.columns.type"),
      cell: ({ getValue }) => <TxTypeBadge type={getValue<string>()} />,
    },
    {
      id: "asset",
      header: t("customerDetail.columns.asset"),
      enableSorting: false,
      cell: ({ row }) => {
        const tx = row.original;
        if (tx.type === "Conversion" && tx.conversion) {
          return <span className="text-sm text-muted-foreground">{tx.conversion.fromAssetCode} → {tx.conversion.toAssetCode}</span>;
        }
        return <span className="text-sm text-muted-foreground">{tx.assetTypeName ?? "—"}</span>;
      },
    },
    {
      accessorKey: "createdByFullName",
      header: t("customerDetail.columns.by"),
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="hidden md:block text-sm text-muted-foreground">{getValue<string>()}</span>
      ),
    },
  ];
}

// ── DashboardPage ─────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .getSummary()
      .then(setSummary)
      .catch(() => toast.error(t("dashboard.loadError")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPortfolioLoading(true);
    reportApi
      .getPortfolio()
      .then(setPortfolio)
      .catch(() => {})
      .finally(() => setPortfolioLoading(false));
  }, []);

  const filteredRecentTransactions = summary?.recentTransactions ?? [];

  const today = new Date();
  const groups = groupPortfolioAssets(portfolio, t);
  const recentColumns = buildRecentColumns(t);
  const locale = i18n.language === "tr" ? "tr-TR" : "en-GB";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      {/* ── Genel Bakış ── */}
      <div>
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="p-2 rounded-lg bg-[--color-gold-glow] border border-[--color-gold]/20">
            <LayoutDashboard className="h-4 w-4" style={{ color: "var(--color-gold)" }} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-0.5">{t("dashboard.overview")}</h2>
            <p className="text-sm text-muted-foreground">{t("dashboard.overviewSubtitle")}</p>
          </div>
        </div>

        {/* Özet Kartlar */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title={t("dashboard.totalCustomers")}
            value={summary?.totalCustomers ?? 0}
            icon={Users}
            accentColor="var(--color-gold)"
            loading={loading}
          />
          <SummaryCard
            title={t("dashboard.activeUsers")}
            value={summary?.totalActiveUsers ?? 0}
            icon={UserCheck}
            accentColor="#4ade80"
            loading={loading}
          />
          <SummaryCard
            title={t("dashboard.todayTransactions")}
            value={summary?.todayTransactionCount ?? 0}
            icon={Activity}
            accentColor="#60a5fa"
            loading={loading}
          />
          <SummaryCard
            title={t("dashboard.date")}
            value={today.toLocaleDateString(locale, { day: "numeric",  month: "long",  year: "numeric" })}
            icon={CalendarDays}
            accentColor="#c084fc"
            loading={false}
          />
        </div>
      </div>

      {/* ── Varlık Durumu — Gruplu kompakt tablo ── */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[--color-gold-glow] to-transparent opacity-30 dark:opacity-15 -z-10 rounded-3xl blur-2xl" />

        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[--color-gold-glow] border border-[--color-gold]/20">
              <TrendingUp className="h-4 w-4" style={{ color: "var(--color-gold)" }} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground mb-0.5">{t("dashboard.assetStatus")}</h2>
              <p className="text-sm text-muted-foreground">{t("dashboard.assetStatusSubtitle")}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/reports/portfolio")}
          >
            {t("dashboard.detailedReport")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="bg-card/50 dark:bg-card/30 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/[0.04] shadow-xl shadow-black/5 overflow-hidden pb-2">
          {portfolioLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl bg-black/[0.03] dark:bg-white/[0.03]" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">{t("dashboard.noBalance")}</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
              {groups.map((group) => (
                <PortfolioGroupSection key={group.label} group={group} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Son İşlemler */}
      <div className="mt-2 relative">
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="p-2 rounded-lg bg-[--color-gold-glow] border border-[--color-gold]/20">
            <Activity className="h-4 w-4" style={{ color: "var(--color-gold)" }} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-0.5">{t("dashboard.recentTransactions")}</h2>
            <p className="text-sm text-muted-foreground">{t("dashboard.recentTransactionsSubtitle")}</p>
          </div>
        </div>
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 shadow-xl shadow-black/5 overflow-hidden">
          <DataTable
            columns={recentColumns}
            data={filteredRecentTransactions}
            isLoading={loading}
            searchPlaceholder={t("dashboard.searchTransactions")}
            emptyMessage={t("dashboard.noTransactions")}
            onRowClick={(tx) => navigate(`/customers/${tx.customerId}`)}
          />
        </div>
      </div>
    </div>
  );
}
