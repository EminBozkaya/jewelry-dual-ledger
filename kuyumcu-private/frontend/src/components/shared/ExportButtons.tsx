import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportColumn {
  header: string;
  accessor: string;
  formatter?: (val: unknown) => string;
}

export interface ExportSummaryItem {
  label: string;
  value: string | number;
}

export interface ExportSummarySection {
  title?: string;
  items: ExportSummaryItem[];
}

interface ExportButtonsProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string; // uzantısız
  exportSummary?: ExportSummarySection[];
}

function toRows(data: Record<string, unknown>[], columns: ExportColumn[]) {
  return data.map((row) =>
    columns.map((col) => {
      const val = row[col.accessor];
      return col.formatter ? col.formatter(val) : val != null ? String(val) : "";
    })
  );
}

function exportExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  exportSummary?: ExportSummarySection[]
) {
  const wsRows: any[] = [];

  // Summary section
  if (exportSummary && exportSummary.length > 0) {
    exportSummary.forEach((section) => {
      if (section.title) {
        wsRows.push([section.title.toUpperCase()]);
      }
      section.items.forEach((item) => {
        wsRows.push([item.label, item.value]);
      });
      wsRows.push([]); // Boş satır
    });
    wsRows.push(["--- TABLO DÖKÜMÜ ---"]);
    wsRows.push([]);
  }

  const headers = columns.map((c) => c.header);
  const rows = toRows(data, columns);
  
  wsRows.push(headers);
  rows.forEach(row => wsRows.push(row));

  const ws = XLSX.utils.aoa_to_sheet(wsRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Veri");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
    `${filename}.xlsx`
  );
}

function exportPdf(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  exportSummary?: ExportSummarySection[]
) {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const title = `${filename.replace(/-/g, " ").toUpperCase()} — ${new Date().toLocaleDateString("tr-TR")}`;
  
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 14, 15);

  let finalY = 20;

  // Summary sections as small tables
  if (exportSummary && exportSummary.length > 0) {
    exportSummary.forEach((section) => {
      if (section.title) {
        doc.setFontSize(12);
        doc.text(section.title, 14, finalY + 5);
        finalY += 8;
      }
      
      autoTable(doc, {
        body: section.items.map(i => [i.label, i.value]),
        startY: finalY,
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 } },
        theme: "plain",
      });
      
      finalY = (doc as any).lastAutoTable.finalY + 5;
    });
    
    doc.setFontSize(11);
    doc.text("İŞLEM DETAYLARI", 14, finalY + 5);
    finalY += 10;
  }

  autoTable(doc, {
    head: [columns.map((c) => c.header)],
    body: toRows(data, columns),
    startY: finalY,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [40, 40, 40] },
    didDrawPage: (info) => {
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Sayfa ${info.pageNumber} / ${pageCount}`,
        doc.internal.pageSize.getWidth() - 30,
        doc.internal.pageSize.getHeight() - 8
      );
    },
  });

  doc.save(`${filename}.pdf`);
}

export function ExportButtons({ data, columns, filename, exportSummary }: ExportButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportExcel(data, columns, filename, exportSummary)}
        disabled={data.length === 0}
        className="gap-2 border-green-200/60 bg-green-50/50 hover:bg-green-100 dark:border-green-900/30 dark:bg-green-950/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-500 hover:text-green-800 dark:hover:text-green-400 shadow-sm cursor-pointer transition-all hover:scale-105"
      >
        <FileSpreadsheet className="h-4 w-4" />
        <span className="hidden sm:inline font-semibold">Excel</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportPdf(data, columns, filename, exportSummary)}
        disabled={data.length === 0}
        className="gap-2 border-red-200/60 bg-red-50/50 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-950/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 shadow-sm cursor-pointer transition-all hover:scale-105"
      >
        <FileText className="h-4 w-4" />
        <span className="hidden sm:inline font-semibold">PDF</span>
      </Button>
    </div>
  );
}

