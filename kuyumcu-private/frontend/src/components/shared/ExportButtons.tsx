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

interface ExportButtonsProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string; // uzantısız
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
  filename: string
) {
  const headers = columns.map((c) => c.header);
  const rows = toRows(data, columns);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
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
  filename: string
) {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const title = `${filename} — ${new Date().toLocaleDateString("tr-TR")}`;
  doc.setFontSize(13);
  doc.text(title, 14, 16);

  autoTable(doc, {
    head: [columns.map((c) => c.header)],
    body: toRows(data, columns),
    startY: 22,
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

export function ExportButtons({ data, columns, filename }: ExportButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportExcel(data, columns, filename)}
        disabled={data.length === 0}
        className="gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        <span className="hidden sm:inline">Excel</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportPdf(data, columns, filename)}
        disabled={data.length === 0}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        <span className="hidden sm:inline">PDF</span>
      </Button>
    </div>
  );
}
