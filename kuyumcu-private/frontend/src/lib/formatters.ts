import { format } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import i18n from "@/i18n";

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

/** Tarih formatla — 15 Ocak 2025 14:30 (veya 15 Jan 2025 14:30 İngilizce'de) */
export function formatDate(date: string | Date): string {
  const locale = i18n.language === "tr" ? tr : enUS;
  return format(new Date(date), "dd MMM yyyy HH:mm", { locale });
}

/** Kısa tarih — 15.01.2025 (veya 01/15/2025 İngilizce'de) */
export function formatDateShort(date: string | Date): string {
  if (i18n.language === "tr") {
    return format(new Date(date), "dd.MM.yyyy", { locale: tr });
  } else {
    return format(new Date(date), "MM/dd/yyyy", { locale: enUS });
  }
}

/** İşlem tipi çevirisi (i18n destekli) */
export function formatTransactionType(type: string, t?: (key: string) => string): string {
  const fallbackMap: Record<string, string> = {
    Deposit: "Yatırma",
    Withdrawal: "Çekme",
    Conversion: "Dönüşüm",
  };

  if (t) {
    const tMap: Record<string, string> = {
      Deposit: t("formatters.deposit"),
      Withdrawal: t("formatters.withdrawal"),
      Conversion: t("formatters.conversion"),
    };
    return tMap[type] ?? type;
  }

  return fallbackMap[type] ?? type;
}

/** Müşteri tipi çevirisi (i18n destekli) */
export function formatCustomerType(value: number, t?: (key: string) => string): string {
  const fallbackMap: Record<number, string> = {
    0: "Özel Müşteri",
    1: "Kuyumcu",
    2: "Tedarikçi",
  };

  if (t) {
    const tMap: Record<number, string> = {
      0: t("customerTypes.specialCustomer"),
      1: t("customerTypes.jeweler"),
      2: t("customerTypes.supplier"),
    };
    return tMap[value] ?? fallbackMap[value] ?? "Bilinmeyen";
  }

  return fallbackMap[value] ?? "Bilinmeyen";
}
