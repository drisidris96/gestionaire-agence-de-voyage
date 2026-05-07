import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, MapPin, Package, BookOpenCheck, CreditCard, Settings, LogOut } from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";

const navigation = [
  { name: "لوحة القيادة", href: "/", icon: LayoutDashboard },
  { name: "العملاء", href: "/clients", icon: Users },
  { name: "الوجهات", href: "/destinations", icon: MapPin },
  { name: "الباقات السياحية", href: "/packages", icon: Package },
  { name: "الحجوزات", href: "/bookings", icon: BookOpenCheck },
  { name: "المدفوعات", href: "/payments", icon: CreditCard },
  { name: "الإعدادات", href: "/settings", icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-muted/20 w-full" dir="rtl">
        <Sidebar className="border-l bg-sidebar text-sidebar-foreground hidden md:flex" side="right">
          <SidebarHeader className="p-0 border-b border-sidebar-border">
            <div className="flex flex-col items-center justify-center gap-1 py-4 px-3">
              <img
                src="/logo.jpg"
                alt="شويعر للسياحة والأسفار"
                className="w-full max-h-24 object-contain rounded-lg"
              />
              <div className="text-center mt-1">
                <div className="font-bold text-sm text-sidebar-primary leading-tight">شويعر للسياحة والأسفار</div>
                <div className="text-[10px] text-sidebar-foreground/50 tracking-wide">CHOUIAAR TRAVEL AGENCY</div>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs">القائمة الرئيسية</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => {
                    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                          <Link href={item.href} className="flex items-center gap-3 w-full">
                            <item.icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button className="w-full flex items-center gap-3 text-destructive hover:text-destructive/80">
                    <LogOut className="h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 border-b bg-sidebar flex items-center gap-3 px-4 md:hidden">
            <img src="/logo.jpg" alt="شويعر" className="h-9 w-auto object-contain rounded" />
            <div className="font-bold text-sidebar-primary">شويعر للسياحة والأسفار</div>
          </header>
          <div className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
