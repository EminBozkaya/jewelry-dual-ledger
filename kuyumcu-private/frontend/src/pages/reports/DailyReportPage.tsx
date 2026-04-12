import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, subMonths, startOfYear } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Calendar, ArrowDown, ArrowUp, ArrowLeftRight } from "lucide-react";

import { reportApi } from "@/api/reports";
import type { DailyReport, Transaction, CustomerType } from "@/types";
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
function buildColumns(navigate: (path: string) => void): ColumnDef<Transaction>[] {
  return [
    {
      accessorKey: "createdAt",
      header: "Tarih",
      cell: ({ getValue }) => (
        <span className="text-sm font-mono">{format(new Date(getValue<string>()), "dd.MM.yyyy HH:mm")}</span>
      ),
    },
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
      accessorKey: "type",
      header: "İşlem Türü",
      cell: ({ getValue }) => {
        const type = getValue<string>();
        const map: Record<string, string> = {
          Deposit: "bg-green-100 text-green-800",
          Withdrawal: "bg-red-100 text-red-800",
          Conversion: "bg-blue-100 text-blue-800",
        };
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[type] ?? "bg-muted text-muted-foreground"}`}>
            {formatTransactionType(type)}
          </span>
        );
      },
    },
    {
      id: "asset",
      header: "Varlık",
      cell: ({ row }) => {
        const t = row.original;
        if (t.type === "Conversion" && t.conversion) {
          return <span className="text-sm">{t.conversion.fromAssetCode} → {t.conversion.toAssetCode}</span>;
        }
        return <span className="text-sm">{t.assetTypeName ?? "—"}</span>;
      },
    },
    {
      id: "amount",
      header: "Miktar",
      cell: ({ row }) => {
        const t = row.original;
        if (t.type === "Conversion" && t.conversion) {
          return (
            <span className="text-sm text-muted-foreground">
              {t.conversion.fromAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} → {t.conversion.toAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
            </span>
          );
        }
        const cls = t.type === "Deposit" ? "text-[var(--color-alacak)]" : "text-[var(--color-borc)]";
        return <span className={`font-medium text-sm ${cls}`}>{t.amount?.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 6 }) ?? "—"}</span>;
      },
    },
    {
      accessorKey: "description",
      header: "Açıklama",
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue<string>() || "—"}</span>,
    },
    {
      accessorKey: "createdByFullName",
      header: "İşlemi Yapan",
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue<string>()}</span>,
    },
    {
      id: "status",
      header: "Durum",
      cell: ({ row }) =>
        row.original.isCancelled
          ? <Badge className="bg-red-100 text-red-800 hover:bg-red-100">İptal</Badge>
          : <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Tamamlandı</Badge>,
    },
  ];
}

// ── DailyReportPage ───────────────────────────────────────────
export function DailyReportPage() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [activeShortcut, setActiveShortcut] = useState<"today" | "week" | "month" | "year" | null>("today");
  const [txTypeFilter, setTxTypeFilter] = useState<"all" | "Deposit" | "Withdrawal" | "Conversion">("all");
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<CustomerType[]>([]);

  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = (from: Date, to: Date) => {
    setLoading(true);
    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");
    reportApi
      .getDaily(fromStr, toStr)
      .then(setReport)
      .catch(() => toast.error("İşlem raporları yüklenemedi"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Eğer fromDate toDate'den büyükse toDate'i de fromDate'e eşitle (opsiyonel güvenlik)
    if (fromDate > toDate) {
      setToDate(fromDate);
    }
    fetchReport(fromDate, toDate);
  }, [fromDate, toDate]);

  const txData = useMemo(() => {
    if (!report?.transactions) return [];
    let list = report.transactions;
    
    // İşlem Tipi Filtresi
    if (txTypeFilter !== "all") list = list.filter(t => t.type === txTypeFilter);
    
    // Müşteri Tipi Filtresi
    if (selectedCustomerTypes.length > 0) {
      list = list.filter(t => {
        const typeValue = t.customerType === "Standard" ? 0 
                       : t.customerType === "Jeweler" ? 1 
                       : t.customerType === "Supplier" ? 2 
                       : Number(t.customerType);
        return selectedCustomerTypes.includes(typeValue as CustomerType);
      });
    }
    
    return list;
  }, [report, txTypeFilter, selectedCustomerTypes]);

  const reportExportSummary = useMemo(() => {
    if (!report) return undefined;
    const sections: any[] = [];
    
    if (report.deposits.length > 0) {
      sections.push({
        title: "Yatırma İşlemleri",
        items: report.deposits.map(d => ({ label: d.assetTypeName, value: d.totalAmount.toLocaleString("tr-TR") }))
      });
    }
    if (report.withdrawals.length > 0) {
      sections.push({
        title: "Çekme İşlemleri",
        items: report.withdrawals.map(w => ({ label: w.assetTypeName, value: w.totalAmount.toLocaleString("tr-TR") }))
      });
    }
    if (report.conversions.length > 0) {
      sections.push({
        title: "Dönüşüm İşlemleri",
        items: report.conversions.map(c => ({ label: `${c.fromAssetCode} -> ${c.toAssetCode}`, value: `${c.count} işlem` }))
      });
    }
    return sections;
  }, [report]);

  const columns = buildColumns(navigate);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Müşteri İşlemleri"
        description="Seçilen tarih aralığındaki işlemlerin özeti"
      />

      {/* Tarih seçici */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-40 justify-start text-left font-normal gap-2">
              <Calendar className="h-4 w-4" />
              {format(fromDate, "dd MMMM yyyy", { locale: tr })}
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
              locale={tr}
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground hidden sm:inline-block">-</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-40 justify-start text-left font-normal gap-2">
              <Calendar className="h-4 w-4" />
              {format(toDate, "dd MMMM yyyy", { locale: tr })}
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
              locale={tr}
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
                {btn("today", "Bugün", () => {
                  const today = new Date();
                  setFromDate(today);
                  setToDate(today);
                })}
                {btn("week", "Son Hafta", () => {
                  const today = new Date();
                  setFromDate(subDays(today, 7));
                  setToDate(today);
                })}
                {btn("month", "Son 1 Ay", () => {
                  const today = new Date();
                  setFromDate(subMonths(today, 1));
                  setToDate(today);
                })}
                {btn("year", "Bu Sene", () => {
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
            <CardTitle className="flex items-center gap-2 text-sm text-[var(--color-alacak)]">
              <ArrowDown className="h-4 w-4" />
              Yatırma İşlemleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <p className="text-2xl font-bold text-[var(--color-alacak)]">
                  {report?.deposits.reduce((s, d) => s + d.count, 0) ?? 0} işlem
                </p>
                <ul className="mt-2 space-y-1">
                  {report?.deposits.map((d) => (
                    <li key={d.assetTypeCode} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{d.assetTypeName}</span>
                      <span className="font-medium">{d.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                    </li>
                  ))}
                  {report?.deposits.length === 0 && <li className="text-sm text-muted-foreground">İşlem yok</li>}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* Çekme */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-[var(--color-borc)]">
              <ArrowUp className="h-4 w-4" />
              Çekme İşlemleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <p className="text-2xl font-bold text-[var(--color-borc)]">
                  {report?.withdrawals.reduce((s, d) => s + d.count, 0) ?? 0} işlem
                </p>
                <ul className="mt-2 space-y-1">
                  {report?.withdrawals.map((d) => (
                    <li key={d.assetTypeCode} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{d.assetTypeName}</span>
                      <span className="font-medium">{d.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                    </li>
                  ))}
                  {report?.withdrawals.length === 0 && <li className="text-sm text-muted-foreground">İşlem yok</li>}
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
              Dönüşüm İşlemleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <p className="text-2xl font-bold text-blue-600">
                  {report?.conversions.reduce((s, d) => s + d.count, 0) ?? 0} işlem
                </p>
                <ul className="mt-2 space-y-1">
                  {report?.conversions.map((d, i) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{d.fromAssetCode} → {d.toAssetCode}</span>
                      <span className="font-medium">{d.count} adet</span>
                    </li>
                  ))}
                  {report?.conversions.length === 0 && <li className="text-sm text-muted-foreground">İşlem yok</li>}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* İşlem tablosu */}
      <div>
        {(() => {
          const depositCount = report?.transactions.filter((t) => t.type === "Deposit").length ?? 0;
          const withdrawalCount = report?.transactions.filter((t) => t.type === "Withdrawal").length ?? 0;
          const conversionCount = report?.transactions.filter((t) => t.type === "Conversion").length ?? 0;
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
                İşlem Listesi{" "}
                {report && (
                  <Badge variant="secondary" className="ml-2">
                    {totalCount} işlem
                  </Badge>
                )}
              </h2>
              <div className="flex flex-wrap gap-2">
                {renderFilterBtn("all", "Tüm İşlemler", totalCount, "grey")}
                {renderFilterBtn("Deposit", "Yatırma", depositCount, "green")}
                {renderFilterBtn("Withdrawal", "Çekme", withdrawalCount, "red")}
                {renderFilterBtn("Conversion", "Dönüşümler", conversionCount, "blue")}
              </div>
            </div>
          );
        })()}

        <DataTable
          columns={columns}
          data={txData}
          headerActions={
            <CustomerTypeFilter 
              selectedTypes={selectedCustomerTypes} 
              onChange={setSelectedCustomerTypes} 
            />
          }
          isLoading={loading}
          searchPlaceholder="Müşteri veya açıklama ara..."
          emptyMessage="Bu tarihler arasında işlem bulunmuyor"
          exportFilename={`islem-raporu-${format(fromDate, "yyyy-MM-dd")}-to-${format(toDate, "yyyy-MM-dd")}`}
          exportSummary={reportExportSummary}
          exportColumns={[
            { accessor: "createdAt", header: "Tarih/Saat" },
            { accessor: "customerFullName", header: "Müşteri" },
            { accessor: "type", header: "İşlem Türü", formatter: (val) => formatTransactionType(val as string) },
            { accessor: "assetTypeName", header: "Varlık" },
            { accessor: "amount", header: "Miktar", formatter: (val) => (val as number)?.toLocaleString("tr-TR") ?? "0" },
            { accessor: "description", header: "Açıklama" },
            { accessor: "createdByFullName", header: "İşlemi Yapan" },
          ]}
        />
      </div>
    </div>
  );
}
