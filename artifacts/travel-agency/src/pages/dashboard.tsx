import { useGetDashboardStats, useGetRecentBookings, useGetRevenueByMonth, useGetBookingsByStatus, useListPayroll, useListEmployees } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, BookOpenCheck, CreditCard, Package, Banknote, AlertTriangle, ShieldCheck, Receipt } from "lucide-react";
import { useAgency } from "@/hooks/use-agency";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Link } from "wouter";
import { statusAr } from "@/lib/i18n";

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(var(--chart-2))",
  confirmed: "hsl(var(--chart-1))",
  cancelled: "hsl(var(--destructive))",
  completed: "hsl(var(--chart-3))",
};

const STATUS_VARIANT: Record<string, string> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
  completed: "outline",
};

function PayrollBanner() {
  const { data: employees } = useListEmployees({});
  const { data: payrollRecords } = useListPayroll({});

  if (!employees || employees.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const activeEmployees = employees.filter(e => e.isActive);
  if (activeEmployees.length === 0) return null;

  const alerts: { name: string; dueDate: Date; daysLeft: number; paid: boolean }[] = [];

  for (const emp of activeEmployees) {
    if (!emp.hireDate) continue;
    const hireDay = new Date(emp.hireDate).getDate();

    const dueThisMonth = new Date(year, month - 1, hireDay);
    const isPast = dueThisMonth.getTime() < todayMs;
    const daysLeft = Math.ceil((dueThisMonth.getTime() - todayMs) / 86400000);

    const paidThisMonth = payrollRecords?.some(
      r => r.employeeId === emp.id && r.month === month && r.year === year && r.status === "paid"
    ) ?? false;

    if (isPast && !paidThisMonth) {
      alerts.push({ name: emp.name, dueDate: dueThisMonth, daysLeft, paid: false });
    } else if (!isPast && daysLeft <= 3) {
      alerts.push({ name: emp.name, dueDate: dueThisMonth, daysLeft, paid: paidThisMonth });
    }
  }

  if (alerts.length === 0) return null;

  const overdueAlerts = alerts.filter(a => a.daysLeft < 0 && !a.paid);
  const upcomingAlerts = alerts.filter(a => a.daysLeft >= 0);

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;

  return (
    <div className="space-y-2">
      {overdueAlerts.map(a => (
        <Link key={a.name} href="/employees">
          <div className="flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 cursor-pointer hover:bg-red-100 transition-colors">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1">
              <span className="font-bold">⚠️ لم يُصرف راتب {a.name} بعد!</span>
              <span className="mr-2">كان موعده {fmt(a.dueDate)} — اضغط للانتقال لصفحة الموظفين</span>
            </div>
          </div>
        </Link>
      ))}
      {upcomingAlerts.map(a => (
        <Link key={a.name} href="/employees">
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer hover:opacity-90 transition-colors ${a.daysLeft === 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
            <Banknote className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">موعد راتب {a.name}: </span>
              <span className="font-bold">{fmt(a.dueDate)}</span>
              {a.daysLeft === 0
                ? <span className="mr-2 font-bold text-red-600"> — اليوم!</span>
                : <span className="mr-2"> (بعد {a.daysLeft} {a.daysLeft === 1 ? "يوم" : "أيام"})</span>
              }
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function DayOfMonthBanner({
  day,
  labelUpcoming,
  labelOverdue,
  labelToday,
  icon: Icon,
  color,
  href,
}: {
  day: number | null;
  labelUpcoming: (days: number) => string;
  labelOverdue: string;
  labelToday: string;
  icon: React.ElementType;
  color: "amber" | "blue" | "purple";
  href: string;
}) {
  if (!day) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const year = today.getFullYear();
  const month = today.getMonth();

  const dueThisMonth = new Date(year, month, day);
  const daysLeft = Math.ceil((dueThisMonth.getTime() - todayMs) / 86400000);

  const overdue = daysLeft < 0;
  const isToday = daysLeft === 0;
  const upcoming = !overdue && !isToday && daysLeft <= 5;

  if (!overdue && !isToday && !upcoming) return null;

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;

  const colorMap = {
    amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", hover: "hover:bg-amber-100" },
    blue:  { bg: "bg-blue-50",  border: "border-blue-200",  text: "text-blue-800",  hover: "hover:bg-blue-100"  },
    purple:{ bg: "bg-purple-50",border: "border-purple-200",text: "text-purple-800",hover: "hover:bg-purple-100"},
  };
  const dangerStyle = "bg-red-50 border-red-300 text-red-800 hover:bg-red-100";
  const c = overdue || isToday ? dangerStyle : `${colorMap[color].bg} ${colorMap[color].border} ${colorMap[color].text} ${colorMap[color].hover}`;

  const message = overdue
    ? labelOverdue
    : isToday
    ? `${labelToday} — ${fmt(dueThisMonth)}`
    : `${labelUpcoming(daysLeft)} — ${fmt(dueThisMonth)} (بعد ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"})`;

  return (
    <Link href={href}>
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer transition-colors ${c}`}>
        <Icon className="h-5 w-5 shrink-0" />
        <span className="font-semibold">{message}</span>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentBookings, isLoading: recentLoading } = useGetRecentBookings();
  const { data: revenueData, isLoading: revenueLoading } = useGetRevenueByMonth();
  const { data: statusData, isLoading: statusLoading } = useGetBookingsByStatus();
  const { settings } = useAgency();

  const statusDataAr = statusData?.map(d => ({ ...d, name: statusAr(d.status) }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">لوحة القيادة</h1>
        <p className="text-muted-foreground mt-1">نظرة عامة على أداء وكالتك السياحية.</p>
      </div>

      <div className="space-y-2">
        <PayrollBanner />
        <DayOfMonthBanner
          day={settings.insuranceDay}
          labelUpcoming={(days) => `موعد دفع التأمينات الاجتماعية`}
          labelOverdue="⚠️ لم تُدفع التأمينات الاجتماعية بعد!"
          labelToday="موعد التأمينات الاجتماعية اليوم!"
          icon={ShieldCheck}
          color="blue"
          href="/settings"
        />
        <DayOfMonthBanner
          day={settings.taxDay}
          labelUpcoming={(days) => `موعد دفع الضرائب`}
          labelOverdue="⚠️ لم تُدفع الضرائب بعد!"
          labelToday="موعد الضرائب اليوم!"
          icon={Receipt}
          color="purple"
          href="/settings"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="إجمالي العملاء" value={stats?.totalClients} icon={Users} loading={statsLoading} />
        <StatCard title="إجمالي الحجوزات" value={stats?.totalBookings} icon={BookOpenCheck} loading={statsLoading} />
        <StatCard title="إجمالي الإيرادات" value={stats ? `${stats.totalRevenue.toLocaleString()} $` : undefined} icon={CreditCard} loading={statsLoading} />
        <StatCard title="الباقات النشطة" value={stats?.totalPackages} icon={Package} loading={statsLoading} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none shadow-md">
          <CardHeader>
            <CardTitle>الإيرادات الشهرية</CardTitle>
            <CardDescription>توزيع الإيرادات خلال الأشهر الماضية.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {revenueLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}$`} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => [`${value.toLocaleString()} $`, 'الإيرادات']}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-md">
          <CardHeader>
            <CardTitle>حالات الحجوزات</CardTitle>
            <CardDescription>توزيع الحجوزات حسب الحالة.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {statusLoading ? <Skeleton className="h-[200px] w-[200px] rounded-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDataAr}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="name"
                  >
                    {statusData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || "hsl(var(--muted))"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle>آخر الحجوزات</CardTitle>
          <CardDescription>أحدث الرحلات المؤكدة والمعلقة.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings?.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors" data-testid={`booking-row-${booking.id}`}>
                  <div>
                    <Link href={`/bookings/${booking.id}`} className="font-semibold hover:underline">
                      {booking.clientName}
                    </Link>
                    <div className="text-sm text-muted-foreground">{booking.packageName}</div>
                  </div>
                  <div className="text-left">
                    <Badge variant={STATUS_VARIANT[booking.status] as any || "outline"}>
                      {statusAr(booking.status)}
                    </Badge>
                    <div className="text-sm mt-1 text-muted-foreground">{booking.travelDate ? format(new Date(booking.travelDate), 'd MMMM yyyy', { locale: ar }) : "—"}</div>
                  </div>
                </div>
              ))}
              {recentBookings?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">لا توجد حجوزات حديثة.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, loading }: { title: string, value?: string | number, icon: any, loading: boolean }) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-primary" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value ?? '-'}</div>
        )}
      </CardContent>
    </Card>
  );
}
