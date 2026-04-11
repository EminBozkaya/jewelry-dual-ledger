import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportButtonsProps {
  onExcelExport?: () => void;
  onPdfExport?: () => void;
  disabled?: boolean;
}

export function ExportButtons({ onExcelExport, onPdfExport, disabled }: ExportButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      {onExcelExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExcelExport}
          disabled={disabled}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Excel
        </Button>
      )}
      {onPdfExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onPdfExport}
          disabled={disabled}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          PDF
        </Button>
      )}
    </div>
  );
}
