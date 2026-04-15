import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, subMonths, startOfYear } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { Calendar, ArrowDown, ArrowUp, ArrowLeftRight } from "lucide-react";

import { reportApi } from "@/api/reports";
import { customerTypeApi } from "@/api/customer-types";
import type { DailyReport, Transaction, CustomerType, CustomerTypeConfig } from "@/types";
import { formatTransactionType } from "@/lib/formatters";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { CustomerTypeFilter } from "@/components/shared/CustomerTypeFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ── İşlem tablosu sütunları ───────────────────────────────────
type TFunction = (key: string) => string;

function buildColumns(navigate: (path: string) => void, t: TFunction): ColumnDef<Transaction>[] {
  return [
    {
      accessorKey: "createdAt",
      header: t("dailyReport.columns.date"),
      cell: ({ getValue }) => (
        <span className="text-sm font-mono">{format(new Date(getValue<string>()), "dd.MM.yyyy HH:mm")}</span>
      ),
    },
    {
      accessorKey: "customerFullName",
      header: t("dailyReport.columns.customer"),
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
      id: "type",
      accessorFn: (row) => formatTransactionType(row.type, t),
      header: t("dailyReport.columns.type"),
      cell: ({ getValue, row }) => {
        const displayValue = getValue<string>();
        const map: Record<string, string> = {
          Deposit: "bg-green-100 text-green-800",
          Withdrawal: "bg-red-100 text-red-800",
          Conversion: "bg-blue-100 text-blue-800",
        };
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[row.original.type] ?? "bg-muted text-muted-foreground"}`}>
            {displayValue}
          </span>
        );
      },
    },
    {
      id: "asset",
      accessorFn: (row) => {
        if (row.type === "Conversion" && row.conversion) {
          return `${row.conversion.fromAssetCode} → ${row.conversion.toAssetCode}`;
        }
        return row.assetTypeName ?? "—";
      },
      header: t("dailyReport.columns.asset"),
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
    },
    {
      id: "amount",
      accessorFn: (row) => {
        if (row.type === "Conversion" && row.conversion) {
          return `${row.conversion.fromAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} → ${row.conversion.toAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
        }
        return row.amount?.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 6 }) ?? "—";
      },
      header: t("dailyReport.columns.amount"),
      cell: ({ getValue, row }) => {
        const displayValue = getValue<string>();
        if (row.original.type === "Conversion") {
          return <span className="text-sm text-muted-foreground">{displayValue}</span>;
        }
        const cls = row.original.type === "Deposit" ? "text-[var(--color-alacak)]" : "text-[var(--color-borc)]";
        return <span className={`font-medium text-sm ${cls}`}>{displayValue}</span>;
      },
    },
    {
      accessorKey: "description",
      header: t("dailyReport.columns.description"),
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue<string>() || "—"}</span>,
    },
    {
      accessorKey: "createdByFullName",
      header: t("dailyReport.columns.by"),
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue<string>()}</span>,
    },
    {
      id: "status",
      accessorFn: (row) => row.isCancelled ? t("dailyReport.status.cancelled") : t("dailyReport.status.completed"),
      header: t("dailyReport.columns.status"),
      cell: ({ getValue, row }) =>
        row.original.isCancelled
          ? <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{getValue<string>()}</Badge>
          : <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{getValue<string>()}</Badge>,
    },
  ];
}

// ── DailyReportPage ───────────────────────────────────────────
export function DailyReportPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "tr" ? tr : enUS;

  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [activeShortcut, setActiveShortcut] = useState<"today" | "week" | "month" | "year" | null>("today");
  const [txTypeFilter, setTxTypeFilter] = useState<"all" | "Deposit" | "Withdrawal" | "Conversion">("all");
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<CustomerType[]>([]);

  const [report, setReport] = useState<DailyReport | null>(null);
  const [customerTypes, setCustomerTypes] = useState<CustomerTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    // Eğer fromDate toDate'den büyükse toDate'i de fromDate'e eşitle (opsiyonel güvenlik)
    if (fromDate > toDate) {
      setToDate(fromDate);
    }

    // Rapor ve tipi bilgilerini paralel çek
    setLoading(true);
    Promise.all([
      reportApi.getDaily(format(fromDate, "yyyy-MM-dd"), format(toDate, "yyyy-MM-dd")),
      customerTypeApi.getAll()
    ]).then(([r, ct]) => {
      setReport(r);
      setCustomerTypes(ct);
    }).catch(() => {
      toast.error(t("dailyReport.loadError"));
    }).finally(() => {
      setLoading(false);
    });
  }, [fromDate, toDate]);

  const txData = useMemo(() => {
    if (!report?.transactions) return [];
    let list = report.transactions;

    // İşlem Tipi Filtresi
    if (txTypeFilter !== "all") list = list.filter(tx => tx.type === txTypeFilter);

    // Müşteri Tipi Filtresi
    if (selectedCustomerTypes.length > 0) {
      list = list.filter(tx => {
        // tx.customerType zaten number (CustomerType)
        return selectedCustomerTypes.includes(Number(tx.customerType) as CustomerType);
      });
    }

    return list;
  }, [report, txTypeFilter, selectedCustomerTypes]);

  const reportExportSummary = useMemo(() => {
    if (!report) return undefined;
    const sections: any[] = [];

    if (report.deposits.length > 0) {
      sections.push({
        title: t("dailyReport.export.depositSummary"),
        items: report.deposits.map(d => ({ label: d.assetTypeName, value: d.totalAmount.toLocaleString("tr-TR") }))
      });
    }
    if (report.withdrawals.length > 0) {
      sections.push({
        title: t("dailyReport.export.withdrawalSummary"),
        items: report.withdrawals.map(w => ({ label: w.assetTypeName, value: w.totalAmount.toLocaleString("tr-TR") }))
      });
    }
    if (report.conversions.length > 0) {
      sections.push({
        title: t("dailyReport.export.conversionSummary"),
        items: report.conversions.map(c => ({ label: `${c.fromAssetCode} -> ${c.toAssetCode}`, value: `${c.count} ${t("dailyReport.transactions")}` }))
      });
    }
    return sections;
  }, [report, t]);

  const columns = buildColumns(navigate, t);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dailyReport.title")}
        description={t("dailyReport.description")}
      />

      {/* Tarih seçici */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-40 justify-start text-left font-normal gap-2">
              <Calendar className="h-4 w-4" />
              {format(fromDate, "dd MMMM yyyy", { locale: dateLocale })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="single"
              selected={fromDate}
              onSelect={(d) => {
                if (d) {
                  setFromDate(d);
                  setActiveShortcut(null);
                }
              }}
              locale={dateLocale}
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground hidden sm:inline-block">-</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-40 justify-start text-left font-normal gap-2">
              <Calendar className="h-4 w-4" />
              {format(toDate, "dd MMMM yyyy", { locale: dateLocale })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="single"
              selected={toDate}
              onSelect={(d) => {
                if (d) {
                  setToDate(d);
                  setActiveShortcut(null);
                }
              }}
              locale={dateLocale}
            />
          </PopoverContent>
        </Popover>

        <div className="flex flex-wrap items-center gap-1.5 sm:ml-2">
          {(() => {
            const btn = (id: "today" | "week" | "month" | "year", label: string, onClick: () => void) => {
              const isActive = activeShortcut === id;
              return (
                <Button
                  key={id}
                  variant={isActive ? "default" : "secondary"}
                  size="sm"
                  className={isActive ? "shadow bg-primary text-primary-foreground" : "bg-black/[0.04] dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/10"}
                  onClick={() => {
                    setActiveShortcut(id);
                    onClick();
                  }}
                >
                  {label}
                </Button>
              );
            };

            return (
              <>
                {btn("today", t("dailyReport.today"), () => {
                  const today = new Date();
                  setFromDate(today);
                  setToDate(today);
                })}
                {btn("week", t("dailyReport.lastWeek"), () => {
                  const today = new Date();
                  setFromDate(subDays(today, 7));
                  setToDate(today);
                })}
                {btn("month", t("dailyReport.lastMonth"), () => {
                  const today = new Date();
                  setFromDate(subMonths(today, 1));
                  setToDate(today);
                })}
                {btn("year", t("dailyReport.thisYear"), () => {
                  const today = new Date();
                  setFromDate(startOfYear(today));
                  setToDate(today);
                })}
              </>
            );
          })()}
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Yatırma */}
        <Card>
          <CardHeader className="pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg text-[var(--color-alacak)]">
                {t("dailyReport.depositsHeading")}
              </CardTitle>
              <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-alacak)] opacity-80">
                <ArrowDown className="h-4 w-4" />
                {t("dailyReport.deposits")}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <p className="text-2xl font-bold text-[var(--color-alacak)]">
                  {report?.deposits.reduce((s, d) => s + d.count, 0) ?? 0} {t("dailyReport.transactions")}
                </p>
                <ul className="mt-2 space-y-1">
                  {report?.deposits.map((d) => (
                    <li key={d.assetTypeCode} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{d.assetTypeName}</span>
                      <span className="font-medium">{d.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                    </li>
                  ))}
                  {report?.deposits.length === 0 && <li className="text-sm text-muted-foreground">{t("dailyReport.noTransactions")}</li>}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* Çekme */}
        <Card>
          <CardHeader className="pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg text-[var(--color-borc)]">
                {t("dailyReport.withdrawalsHeading")}
              </CardTitle>
              <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-borc)] opacity-80">
                <ArrowUp className="h-4 w-4" />
                {t("dailyReport.withdrawals")}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <p className="text-2xl font-bold text-[var(--color-borc)]">
                  {report?.withdrawals.reduce((s, d) => s + d.count, 0) ?? 0} {t("dailyReport.transactions")}
                </p>
                <ul className="mt-2 space-y-1">
                  {report?.withdrawals.map((d) => (
                    <li key={d.assetTypeCode} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{d.assetTypeName}</span>
                      <span className="font-medium">{d.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                    </li>
                  ))}
                  {report?.withdrawals.length === 0 && <li className="text-sm text-muted-foreground">{t("dailyReport.noTransactions")}</li>}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dönüşüm */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-blue-600">
              <ArrowLeftRight className="h-4 w-4" />
              {t("dailyReport.conversions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <p className="text-2xl font-bold text-blue-600">
                  {report?.conversions.reduce((s, d) => s + d.count, 0) ?? 0} {t("dailyReport.transactions")}
                </p>
                <ul className="mt-2 space-y-1">
                  {report?.conversions.map((d, i) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{d.fromAssetCode} → {d.toAssetCode}</span>
                      <span className="font-medium">{d.count} {t("dailyReport.pieces")}</span>
                    </li>
                  ))}
                  {report?.conversions.length === 0 && <li className="text-sm text-muted-foreground">{t("dailyReport.noTransactions")}</li>}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* İşlem tablosu */}
      <div>
        {(() => {
          const depositCount = report?.transactions.filter((tx) => tx.type === "Deposit").length ?? 0;
          const withdrawalCount = report?.transactions.filter((tx) => tx.type === "Withdrawal").length ?? 0;
          const conversionCount = report?.transactions.filter((tx) => tx.type === "Conversion").length ?? 0;
          const totalCount = report?.transactions.length ?? 0;

          const renderFilterBtn = (
            key: typeof txTypeFilter,
            label: string,
            count: number,
            color: "grey" | "green" | "red" | "blue"
          ) => {
            const isActive = txTypeFilter === key;
            const colorMap = {
              grey:  { text: "text-slate-600",  activeBg: "bg-slate-50",  badge: "bg-slate-200 text-slate-600",  idleBorder: "rgba(100,116,139,0.35)", activeShadow: "0 0 0 1.5px rgba(100,116,139,0.55), 0 3px 12px rgba(100,116,139,0.22), inset 0 1px 0 rgba(255,255,255,0.5)" },
              green: { text: "text-green-600",  activeBg: "bg-green-50",  badge: "bg-green-100 text-green-700",  idleBorder: "rgba(22,163,74,0.35)",    activeShadow: "0 0 0 1.5px rgba(22,163,74,0.65), 0 3px 14px rgba(22,163,74,0.30), 0 0 22px rgba(22,163,74,0.14), inset 0 1px 0 rgba(134,239,172,0.35)" },
              red:   { text: "text-red-600",    activeBg: "bg-red-50",    badge: "bg-red-100 text-red-700",      idleBorder: "rgba(220,38,38,0.35)",    activeShadow: "0 0 0 1.5px rgba(220,38,38,0.65), 0 3px 14px rgba(220,38,38,0.28), 0 0 22px rgba(220,38,38,0.13), inset 0 1px 0 rgba(252,165,165,0.35)" },
              blue:  { text: "text-blue-600",   activeBg: "bg-blue-50",   badge: "bg-blue-100 text-blue-700",    idleBorder: "rgba(37,99,235,0.35)",    activeShadow: "0 0 0 1.5px rgba(37,99,235,0.65), 0 3px 14px rgba(37,99,235,0.28), 0 0 22px rgba(37,99,235,0.13), inset 0 1px 0 rgba(147,197,253,0.35)" },
            }[color];
            return (
              <button
                key={key}
                onClick={() => setTxTypeFilter(key)}
                style={{
                  boxShadow: isActive
                    ? colorMap.activeShadow
                    : `0 0 0 1px ${colorMap.idleBorder}`,
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border-0 transition-all duration-200 ${
                  isActive
                    ? `${colorMap.activeBg} ${colorMap.text}`
                    : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive ? colorMap.badge : "bg-muted text-muted-foreground"
                }`}>
                  {count}
                </span>
              </button>
            );
          };

          return (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
              <h2 className="text-base font-semibold">
                {t("dailyReport.transactionList")}{" "}
                {report && (
                  <Badge variant="secondary" className="ml-2">
                    {totalCount} {t("dailyReport.transactions")}
                  </Badge>
                )}
              </h2>
              <div className="flex flex-wrap gap-2">
                {renderFilterBtn("all", t("dailyReport.allTransactions"), totalCount, "grey")}
                {renderFilterBtn("Deposit", t("dailyReport.deposit"), depositCount, "green")}
                {renderFilterBtn("Withdrawal", t("dailyReport.withdrawal"), withdrawalCount, "red")}
                {renderFilterBtn("Conversion", t("dailyReport.conversionFilter"), conversionCount, "blue")}
              </div>
            </div>
          );
        })()}

        <DataTable
          columns={columns}
          data={txData}
          headerActions={
            <CustomerTypeFilter
              types={customerTypes}
              selectedTypes={selectedCustomerTypes}
              onChange={setSelectedCustomerTypes}
            />
          }
          isLoading={loading}
          searchPlaceholder={t("dailyReport.searchPlaceholder")}
          emptyMessage={t("dailyReport.noData")}
          exportFilename={`islem-raporu-${format(fromDate, "yyyy-MM-dd")}-to-${format(toDate, "yyyy-MM-dd")}`}
          exportSummary={reportExportSummary}
          exportColumns={[
            { accessor: "createdAt", header: t("dailyReport.export.dateTime") },
            { accessor: "customerFullName", header: t("dailyReport.export.customer") },
            { accessor: "type", header: t("dailyReport.export.type"), formatter: (val) => formatTransactionType(val as string) },
            { accessor: "assetTypeName", header: t("dailyReport.export.asset") },
            { accessor: "amount", header: t("dailyReport.export.amount"), formatter: (val) => (val as number)?.toLocaleString("tr-TR") ?? "0" },
            { accessor: "description", header: t("dailyReport.export.description") },
            { accessor: "createdByFullName", header: t("dailyReport.export.by") },
          ]}
        />
      </div>
    </div>
  );
}
