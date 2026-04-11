import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Calendar, ArrowDown, ArrowUp, ArrowLeftRight } from "lucide-react";

import { reportApi } from "@/api/reports";
import type { DailyReport, Transaction } from "@/types";
import { formatTransactionType } from "@/lib/formatters";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
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
      header: "Saat",
      cell: ({ getValue }) => (
        <span className="text-sm font-mono">{format(new Date(getValue<string>()), "HH:mm")}</span>
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const fetchReport = (date: Date) => {
    setLoading(true);
    const dateStr = format(date, "yyyy-MM-dd");
    reportApi
      .getDaily(dateStr)
      .then(setReport)
      .catch(() => toast.error("Günlük rapor yüklenemedi"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate]);

  const goDay = (delta: number) => setSelectedDate((d) => (delta > 0 ? addDays(d, 1) : subDays(d, 1)));

  const columns = buildColumns(navigate);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Günlük Rapor"
        description="Seçilen günün işlem özeti"
      />

      {/* Tarih seçici */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => goDay(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-40 gap-2">
              <Calendar className="h-4 w-4" />
              {format(selectedDate, "dd MMMM yyyy", { locale: tr })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) { setSelectedDate(d); setCalendarOpen(false); }
              }}
              locale={tr}
            />
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="icon" onClick={() => goDay(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
          Bugün
        </Button>
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
        <h2 className="mb-3 text-base font-semibold">
          Günlük İşlem Listesi{" "}
          {report && (
            <Badge variant="secondary" className="ml-2">
              {report.totalTransactions} işlem
            </Badge>
          )}
        </h2>
        <DataTable
          columns={columns}
          data={report?.transactions ?? []}
          isLoading={loading}
          searchPlaceholder="Müşteri veya açıklama ara..."
          emptyMessage="Bu tarihte işlem bulunmuyor"
          exportFilename={`gunluk-rapor-${format(selectedDate, "yyyy-MM-dd")}`}
          exportColumns={[
            { accessor: "createdAt", header: "Tarih/Saat" },
            { accessor: "customerFullName", header: "Müşteri" },
            { accessor: "type", header: "İşlem Türü" },
            { accessor: "assetTypeName", header: "Varlık" },
            { accessor: "amount", header: "Miktar" },
            { accessor: "description", header: "Açıklama" },
            { accessor: "createdByFullName", header: "İşlemi Yapan" },
          ]}
        />
      </div>
    </div>
  );
}
