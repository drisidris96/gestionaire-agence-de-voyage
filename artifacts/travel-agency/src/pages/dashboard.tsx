import { useGetDashboardStats, useGetRecentBookings, useGetRevenueByMonth, useGetBookingsByStatus, useListPayroll } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, BookOpenCheck, CreditCard, Package, Banknote, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAgency } from "@/hooks/use-agency";
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
  const { settings } = useAgency();
  const { data: payrollRecords } = useListPayroll({});

  const payDay = settings.payrollDay;
  if (!payDay) return null;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const dueThisMonth = new Date(year, month, payDay);
  const isPastThisMonth = dueThisMonth < today;
  const dueDate = isPastThisMonth ? new Date(year, month + 1, payDay) : dueThisMonth;

  const daysLeft = Math.ceil((dueDate.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  const isToday = daysLeft === 0;
  const isOverdue = isPastThisMonth;

  const currentMonthPaid = payrollRecords?.some(
    r => r.month === month + 1 && r.year === year && r.status === "paid"
  );

  if (currentMonthPaid && !isOverdue) return null;
  if (!isToday && daysLeft > 3 && !isOverdue) return null;

  const dd = String(dueDate.getDate()).padStart(2, "0");
  const mm = String(dueDate.getMonth() + 1).padStart(2, "0");
  const yyyy = dueDate.getFullYear();

  if (isOverdue && !currentMonthPaid) {
    return (
      <Link href="/employees">
        <div className="flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 cursor-pointer hover:bg-red-100 transition-colors">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <span className="font-bold">⚠️ رواتب الشهر لم تُصرف بعد!</span>
            <span className="mr-2 text-red-600">كان موعد الصرف {`${dd}-${mm}-${yyyy}`} — اضغط للانتقال لصفحة الموظفين</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href="/employees">
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer hover:opacity-90 transition-colors ${isToday ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
        <Banknote className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <span className="font-semibold">موعد صرف الرواتب: </span>
          <span className="font-bold">{`${dd}-${mm}-${yyyy}`}</span>
          {isToday
            ? <span className="mr-2 font-bold text-red-600"> — اليوم!</span>
            : <span className="mr-2">{` (بعد ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"})`}</span>
          }
          {currentMonthPaid && <span className="mr-2 text-green-600 font-semibold flex-inline items-center gap-1">✓ تم الصرف هذا الشهر</span>}
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentBookings, isLoading: recentLoading } = useGetRecentBookings();
  const { data: revenueData, isLoading: revenueLoading } = useGetRevenueByMonth();
  const { data: statusData, isLoading: statusLoading } = useGetBookingsByStatus();

  const statusDataAr = statusData?.map(d => ({ ...d, name: statusAr(d.status) }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">لوحة القيادة</h1>
        <p className="text-muted-foreground mt-1">نظرة عامة على أداء وكالتك السياحية.</p>
      </div>

      <PayrollBanner />

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
