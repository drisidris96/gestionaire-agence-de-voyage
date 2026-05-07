import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, MapPin, Package, BookOpenCheck, CreditCard, Settings, LogOut, FileText, TrendingUp, UserCog, ShoppingCart, Building2, UsersRound, Bell, CalendarDays, MessageSquare } from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useAgency } from "@/hooks/use-agency";

const navigation = [
  { name: "لوحة القيادة", href: "/", icon: LayoutDashboard },
  { name: "العملاء", href: "/clients", icon: Users },
  { name: "الوجهات", href: "/destinations", icon: MapPin },
  { name: "الباقات السياحية", href: "/packages", icon: Package },
  { name: "الحجوزات", href: "/bookings", icon: BookOpenCheck },
  { name: "المدفوعات", href: "/payments", icon: CreditCard },
];

const financeNavigation = [
  { name: "المستندات المالية", href: "/documents", icon: FileText },
  { name: "المالية والأرباح", href: "/finance", icon: TrendingUp },
  { name: "طلبيات الشراء", href: "/purchase-orders", icon: ShoppingCart },
  { name: "الإعدادات", href: "/settings", icon: Settings },
];

const hrNavigation = [
  { name: "الموظفون والرواتب", href: "/employees", icon: UserCog },
];

const operationsNavigation = [
  { name: "تقويم الرحلات", href: "/calendar", icon: CalendarDays },
  { name: "الحجوزات الجماعية", href: "/groups", icon: UsersRound },
  { name: "التذكيرات", href: "/reminders", icon: Bell },
  { name: "رسائل العملاء", href: "/messages", icon: MessageSquare },
  { name: "الموردون", href: "/suppliers", icon: Building2 },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, username } = useAuth();
  const { settings } = useAgency();

  const logoSrc = settings.agencyLogoUrl || "/logo.jpg";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-muted/20 w-full" dir="rtl">
        <Sidebar className="border-l bg-sidebar text-sidebar-foreground hidden md:flex" side="right">
          <SidebarHeader className="p-0 border-b border-sidebar-border">
            <div className="flex flex-col items-center justify-center gap-1 py-4 px-3">
              <img
                src={logoSrc}
                alt={settings.agencyName}
                className="w-full max-h-24 object-contain rounded-lg"
                onError={(e) => { (e.target as HTMLImageElement).src = "/logo.jpg"; }}
              />
              <div className="text-center mt-1">
                <div className="font-bold text-sm text-sidebar-primary leading-tight">{settings.agencyName}</div>
                <div className="text-[10px] text-sidebar-foreground/50 tracking-wide">{settings.agencyNameEn}</div>
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

            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs">المالية والمحاسبة</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {financeNavigation.map((item) => {
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

            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs">الموارد البشرية</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {hrNavigation.map((item) => {
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

            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs">أدوات التشغيل</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {operationsNavigation.map((item) => {
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

          <SidebarFooter className="border-t border-sidebar-border p-3">
            <div className="flex items-center gap-2 px-2 py-2 mb-1 rounded-md" style={{ background: "rgba(201,162,39,0.08)" }}>
              <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "hsl(43 73% 44%)", color: "#1a1200" }}>
                {username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-sidebar-foreground truncate">{username}</div>
                <div className="text-[10px] text-sidebar-foreground/50">مدير النظام</div>
              </div>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3"
                    style={{ color: "hsl(0 84% 65%)" }}
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 border-b bg-sidebar flex items-center justify-between gap-3 px-4 md:hidden">
            <div className="flex items-center gap-3">
              <img
                src={logoSrc}
                alt={settings.agencyName}
                className="h-9 w-auto object-contain rounded"
                onError={(e) => { (e.target as HTMLImageElement).src = "/logo.jpg"; }}
              />
              <div className="font-bold text-sidebar-primary text-sm">{settings.agencyName}</div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{ color: "hsl(0 84% 65%)", background: "rgba(220,38,38,0.1)" }}
            >
              <LogOut className="h-3.5 w-3.5" />
              خروج
            </button>
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
