import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { breadcrumbLabelRegistry } from "@/lib/breadcrumb";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  "": "Mağaza Portföyü",
  customers: "Müşteriler",
  reports: "Raporlar",
  portfolio: "Mağaza Bakiye",
  daily: "Müşteri İşlemleri",
  statement: "Müşteri Ekstre",
  admin: "Yönetim",
  users: "Kullanıcılar",
  "asset-types": "Varlık Tipleri",
};

export function BreadcrumbNav() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  const [, setTick] = useState(0);

  useEffect(() => {
    // Registry değişince (örn. sayfa yüklenince) breadcrumb'ı yeniden çiz
    return breadcrumbLabelRegistry.subscribe(() => setTick(t => t + 1));
  }, []);

  if (segments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Mağaza Portföyü</BreadcrumbPage>
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
          
          // Önce routeLabels, sonra registry, en son seg isminin kendisi
          const label = routeLabels[seg] ?? breadcrumbLabelRegistry.get(seg) ?? seg;

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
