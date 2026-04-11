import { format } from "date-fns";
import { tr } from "date-fns/locale";

/** Para birimi formatla — 1.234,56 */
export function formatMoney(value: number, decimals = 2): string {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Adet formatla — 13,06 (ondalıklı adet) */
export function formatPiece(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/** Gram formatla — 125,750 g */
export function formatGram(value: number): string {
  return (
    value.toLocaleString("tr-TR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) + " g"
  );
}

/** Varlık tipine göre otomatik formatla */
export function formatAmount(value: number, unitType: string): string {
  switch (unitType) {
    case "Currency":
      return formatMoney(value);
    case "Gram":
      return formatGram(value);
    case "Piece":
      return formatPiece(value);
    default:
      return value.toString();
  }
}

/** Tarih formatla — 15 Ocak 2025 14:30 */
export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd MMM yyyy HH:mm", { locale: tr });
}

/** Kısa tarih — 15.01.2025 */
export function formatDateShort(date: string | Date): string {
  return format(new Date(date), "dd.MM.yyyy", { locale: tr });
}

/** İşlem tipi Türkçe karşılık */
export function formatTransactionType(type: string): string {
  const map: Record<string, string> = {
    Deposit: "Yatırma",
    Withdrawal: "Çekme",
    Conversion: "Dönüşüm",
  };
  return map[type] ?? type;
}
