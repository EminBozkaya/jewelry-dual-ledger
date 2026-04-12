import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { breadcrumbLabelRegistry } from "@/lib/breadcrumb";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const segmentToTranslationKey: Record<string, string> = {
  customers: "breadcrumb.customers",
  reports: "breadcrumb.reports",
  portfolio: "breadcrumb.storeBalance",
  daily: "breadcrumb.customerTransactions",
  statement: "breadcrumb.customerStatement",
  admin: "breadcrumb.management",
  users: "breadcrumb.users",
  "asset-types": "breadcrumb.assetTypes",
};

export function BreadcrumbNav() {
  const location = useLocation();
  const { t } = useTranslation();
  const segments = location.pathname.split("/").filter(Boolean);
  const [, setTick] = useState(0);

  useEffect(() => {
    // Registry değişince (örn. sayfa yüklenince) breadcrumb'ı yeniden çiz
    return breadcrumbLabelRegistry.subscribe(() => setTick(tick => tick + 1));
  }, []);

  if (segments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{t("breadcrumb.storePortfolio")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1;
          const href = "/" + segments.slice(0, idx + 1).join("/");

          // Önce translation key, sonra registry, en son seg isminin kendisi
          const translationKey = segmentToTranslationKey[seg];
          const label = translationKey
            ? t(translationKey)
            : breadcrumbLabelRegistry.get(seg) ?? seg;

          return (
            <span key={href} className="flex items-center gap-1.5">
              {idx > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="max-w-[200px] truncate">{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
