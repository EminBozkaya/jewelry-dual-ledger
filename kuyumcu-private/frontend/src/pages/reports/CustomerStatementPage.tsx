import { useEffect, useState, useMemo } from "react";

import { format, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Calendar } from "lucide-react";

import { reportApi } from "@/api/reports";
import { customerApi } from "@/api/customers";
import type { Customer, CustomerStatement, Transaction, Balance } from "@/types";
import { formatDate, formatTransactionType } from "@/lib/formatters";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CustomerType } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// ── İşlem tablosu sütunları ───────────────────────────────────
const txColumns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "createdAt",
    header: "Tarih",
    cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue<string>())}</span>,
  },
  {
    accessorKey: "type",
    header: "Tür",
    cell: ({ getValue }) => {
      const type = getValue<string>();
      const map: Record<string, string> = {
        Deposit: "bg-green-100 text-green-800",
        Withdrawal: "bg-red-100 text-red-800",
        Conversion: "bg-blue-100 text-blue-800",
      };
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[type] ?? "bg-muted"}`}>
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
      if (t.type === "Conversion" && t.conversion)
        return <span className="text-sm">{t.conversion.fromAssetCode} → {t.conversion.toAssetCode}</span>;
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
            {t.conversion.fromAmount.toLocaleString("tr-TR", { maximumFractionDigits: 6 })} → {t.conversion.toAmount.toLocaleString("tr-TR", { maximumFractionDigits: 6 })}
          </span>
        );
      }
      const cls = t.type === "Deposit" ? "text-[var(--color-alacak)]" : "text-[var(--color-borc)]";
      return <span className={`font-medium text-sm ${cls}`}>{t.amount?.toLocaleString("tr-TR", { maximumFractionDigits: 6 }) ?? "—"}</span>;
    },
  },
  {
    accessorKey: "description",
    header: "Açıklama",
    cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue<string>() || "—"}</span>,
  },
];

// ── Bakiye satırı ─────────────────────────────────────────────
function BalanceRow({ balance }: { balance: Balance }) {
  if (balance.amount === 0) return null;
  return (
    <div className="flex justify-between items-center py-1 border-b last:border-0">
      <span className="text-sm">{balance.assetTypeName}</span>
      <div className="flex items-center gap-2">
        <AmountDisplay value={balance.amount} unitType={balance.unitType} size="sm" />
        <Badge
          className={balance.amount >= 0
            ? "bg-green-100 text-green-800 hover:bg-green-100 text-xs"
            : "bg-red-100 text-red-800 hover:bg-red-100 text-xs"}
        >
          {balance.amount >= 0 ? "Alacak" : "Borç"}
        </Badge>
      </div>
    </div>
  );
}

// ── CustomerStatementPage ─────────────────────────────────────
export function CustomerStatementPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);

  const filteredCustomers = customers;

  const today = new Date();
  const [fromDate, setFromDate] = useState<Date>(startOfMonth(today));
  const [toDate, setToDate] = useState<Date>(today);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    customerApi.getAll().then((data) => {
      setCustomers(data);
    }).catch(() => toast.error("Müşteriler yüklenemedi"));
  }, []);

  const generateReport = () => {
    if (!selectedCustomer) return;
    setLoading(true);
    reportApi
      .getStatement(
        selectedCustomer.id,
        format(fromDate, "yyyy-MM-dd"),
        format(toDate, "yyyy-MM-dd")
      )
      .then(setStatement)
      .catch(() => toast.error("Ekstre yüklenemedi"))
      .finally(() => setLoading(false));
  };

  const statementExportSummary = useMemo(() => {
    if (!statement) return undefined;
    return [
      {
        title: "Müşteri Bilgileri",
        items: [
          { label: "Müşteri", value: statement.customer.fullName },
          { label: "Telefon", value: statement.customer.phone },
          { label: "Tarih Aralığı", value: `${format(new Date(statement.period.from), "dd.MM.yyyy")} - ${format(new Date(statement.period.to), "dd.MM.yyyy")}` }
        ]
      },
      {
        title: "Açılış Bakiyeleri",
        items: statement.openingBalances.filter(b => b.amount !== 0).map(b => ({
          label: b.assetTypeName,
          value: `${b.amount.toLocaleString("tr-TR")} (${b.amount >= 0 ? "Alacak" : "Borç"})`
        }))
      },
      {
        title: "Kapanış Bakiyeleri",
        items: statement.closingBalances.filter(b => b.amount !== 0).map(b => ({
          label: b.assetTypeName,
          value: `${b.amount.toLocaleString("tr-TR")} (${b.amount >= 0 ? "Alacak" : "Borç"})`
        }))
      }
    ];
  }, [statement]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Müşteri Ekstre Raporu"
        description="Belirli tarih aralığında müşteri hareketleri ve bakiyeleri"
      />

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
            {/* Müşteri seçici */}
            <div className="flex-1 min-w-[250px] flex flex-col gap-1.5">
              <label className="text-sm font-medium">Müşteri</label>
              <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal cursor-pointer">
                    {selectedCustomer ? selectedCustomer.fullName : "Müşteri seçin..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Müşteri ara..." />
                    <CommandList>
                      <CommandEmpty>Müşteri bulunamadı</CommandEmpty>
                      <CommandGroup>
                        {filteredCustomers.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.fullName}
                            onSelect={() => {
                              setSelectedCustomer(c);
                              setCustomerOpen(false);
                              setStatement(null);
                            }}
                          >
                            {c.fullName}
                            <span className="ml-auto text-xs text-muted-foreground">{c.phone}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Başlangıç tarihi */}
            <div className="flex flex-col gap-1.5 w-full md:w-auto">
              <label className="text-sm font-medium">Başlangıç</label>
              <Popover open={fromOpen} onOpenChange={setFromOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 w-full md:w-40 cursor-pointer">
                    <Calendar className="h-4 w-4" />
                    {format(fromDate, "dd.MM.yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={fromDate}
                    onSelect={(d) => { if (d) { setFromDate(d); setFromOpen(false); } }}
                    locale={tr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Bitiş tarihi */}
            <div className="flex flex-col gap-1.5 w-full md:w-auto">
              <label className="text-sm font-medium">Bitiş</label>
              <Popover open={toOpen} onOpenChange={setToOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 w-full md:w-40 cursor-pointer">
                    <Calendar className="h-4 w-4" />
                    {format(toDate, "dd.MM.yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={toDate}
                    onSelect={(d) => { if (d) { setToDate(d); setToOpen(false); } }}
                    locale={tr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-[1_1_100%] xl:flex-[0_1_auto] flex justify-center xl:justify-start mt-2 xl:mt-0">
              <Button
                className="gap-2 min-h-10 w-full sm:w-64 xl:w-auto cursor-pointer"
                onClick={generateReport}
                disabled={!selectedCustomer || loading}
              >
                <FileText className="h-4 w-4" />
                Rapor Oluştur
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ekstre görünümü */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {!loading && statement && (
        <div className="space-y-4">
          {/* Müşteri başlık */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Müşteri Ekstresi — {statement.customer.fullName}</span>
                <Badge variant="outline">
                  {format(new Date(statement.period.from), "dd.MM.yyyy")} —{" "}
                  {format(new Date(statement.period.to), "dd.MM.yyyy")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Telefon</p>
                <p className="font-medium">{statement.customer.phone}</p>
              </div>
              {statement.customer.email && (
                <div>
                  <p className="text-sm text-muted-foreground">E-posta</p>
                  <p className="font-medium">{statement.customer.email}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Açılış & Kapanış bakiyeleri */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Devreden Bakiyeler ({format(new Date(statement.period.from), "dd.MM.yyyy")})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statement.openingBalances.filter((b) => b.amount !== 0).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Dönem başında bakiye yok</p>
                ) : (
                  statement.openingBalances.map((b) => (
                    <BalanceRow key={b.assetTypeId} balance={b} />
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Kapanış Bakiyeleri ({format(new Date(statement.period.to), "dd.MM.yyyy")})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statement.closingBalances.filter((b) => b.amount !== 0).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Dönem sonunda bakiye yok</p>
                ) : (
                  statement.closingBalances.map((b) => (
                    <BalanceRow key={b.assetTypeId} balance={b} />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* İşlem geçmişi */}
          <div>
            <h2 className="mb-3 text-base font-semibold">
              İşlem Geçmişi{" "}
              <Badge variant="secondary" className="ml-2">
                {statement.transactions.length} işlem
              </Badge>
            </h2>
            <DataTable
              columns={txColumns}
              data={statement.transactions}
              isLoading={false}
              searchPlaceholder="İşlem ara..."
              emptyMessage="Bu dönemde işlem bulunmuyor"
              exportFilename={`ekstre-${statement.customer.fullName.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(statement.period.from), "yyyy-MM")}`}
              exportSummary={statementExportSummary}
              exportColumns={[
                { accessor: "createdAt", header: "Tarih", formatter: (val) => formatDate(val as string) },
                { accessor: "type", header: "Tür", formatter: (val) => formatTransactionType(val as string) },
                { accessor: "assetTypeName", header: "Varlık" },
                { accessor: "amount", header: "Miktar", formatter: (val) => (val as number)?.toLocaleString("tr-TR") ?? "0" },
                { accessor: "description", header: "Açıklama" },
              ]}
            />
          </div>
        </div>
      )}

      {!loading && !statement && selectedCustomer && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Rapor oluşturmak için yukarıdaki "Rapor Oluştur" butonuna tıklayın.
          </p>
        </div>
      )}

      {!loading && !statement && !selectedCustomer && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Ekstre almak istediğiniz müşteriyi seçin.</p>
        </div>
      )}
    </div>
  );
}
