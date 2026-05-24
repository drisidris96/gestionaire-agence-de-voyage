import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, MapPin, Package, BookOpenCheck, CreditCard, Settings, LogOut, FileText, TrendingUp, UserCog, ShoppingCart, Building2, UsersRound, Bell, CalendarDays, MessageSquare, BarChart3 } from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useAgency } from "@/hooks/use-agency";
import { useListReminders } from "@workspace/api-client-react";

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
  { name: "تحليل الأداء", href: "/analytics", icon: BarChart3 },
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
  const { data: reminders } = useListReminders();

  const todayReminders = reminders?.filter(r => {
    if (r.isCompleted) return false;
    const due = new Date(r.dueDate);
    const today = new Date();
    return due.toDateString() === today.toDateString() || due < today;
  }) ?? [];

  const logoSrc = settings.agencyLogoUrl || "/logo.jpg";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-muted/20 w-full" dir="rtl">
        <Sidebar className="border-l bg-sidebar text-sidebar-foreground" side="right" collapsible="icon">
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
                    const isReminders = item.href === "/reminders";
                    const badgeCount = isReminders && todayReminders.length > 0 ? todayReminders.length : 0;
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                          <Link href={item.href} className="flex items-center gap-3 w-full">
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1">{item.name}</span>
                            {badgeCount > 0 && (
                              <Badge className="h-4 min-w-4 px-1 text-[10px] bg-red-500 text-white border-0 rounded-full flex items-center justify-center">
                                {badgeCount}
                              </Badge>
                            )}
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
          <header className="h-12 border-b bg-sidebar flex items-center gap-2 px-3 md:hidden">
            <SidebarTrigger className="text-sidebar-foreground" />
            <div className="font-bold text-sidebar-primary text-sm truncate flex-1">{settings.agencyName}</div>
          </header>
          <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-8">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
