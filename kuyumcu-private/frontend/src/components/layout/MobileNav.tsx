import { SidebarTrigger } from "@/components/ui/sidebar";

// Mobil navigasyon — SidebarTrigger ile sidebar'ı açar
// AppHeader içinde zaten SidebarTrigger kullanılıyor,
// bu bileşen gerekirse bağımsız kullanım için export edilmiştir.
export function MobileNav() {
  return <SidebarTrigger />;
}
