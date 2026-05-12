import { useGetTopDestinations, useGetTopClients, useGetRevenueByMonth, useGetDashboardStats, useGetBookingsByStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin, Users, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

const COLORS = [
  "hsl(43 73% 44%)", "hsl(142 71% 45%)", "hsl(217 91% 60%)",
  "hsl(280 65% 60%)", "hsl(0 84% 60%)",
];

const STATUS_AR: Record<string, string> = {
  confirmed: "مؤكد", pending: "معلق", cancelled: "ملغى", completed: "مكتمل",
};

const MONTH_AR: Record<string, string> = {
  "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
  "05": "مايو",  "06": "يونيو",  "07": "يوليو", "08": "أغسطس",
  "09": "سبتمبر","10": "أكتوبر","11": "نوفمبر","12": "ديسمبر",
};

function monthLabel(ym: string) {
  const [, m] = ym.split("-");
  return MONTH_AR[m] ?? ym;
}

function StatCard({ title, value, desc, icon: Icon, color }: { title: string; value: string | number; desc?: string; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${color}`}><Icon className="h-5 w-5 text-white" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: topDest,    isLoading: destLoading }   = useGetTopDestinations();
  const { data: topClients, isLoading: clientsLoading } = useGetTopClients();
  const { data: revenue,    isLoading: revLoading }     = useGetRevenueByMonth();
  const { data: byStatus,   isLoading: statusLoading }  = useGetBookingsByStatus();

  const cancelRate = stats
    ? Math.round((stats.cancelledBookings / Math.max(stats.totalBookings, 1)) * 100)
    : 0;
  const completionRate = stats
    ? Math.round(((stats.completedBookings + stats.confirmedBookings) / Math.max(stats.totalBookings, 1)) * 100)
    : 0;

  const statusData = byStatus?.map(d => ({ name: STATUS_AR[d.status] ?? d.status, value: d.count }));
  const revenueData = revenue?.map(r => ({ name: monthLabel(r.month), إيرادات: r.revenue, حجوزات: r.bookings }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">تحليل الأداء</h1>
        <p className="text-muted-foreground mt-1">إحصاءات وتحليلات متقدمة حول أداء الوكالة.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : <>
          <StatCard title="معدل الإلغاء" value={`${cancelRate}%`} desc={`${stats?.cancelledBookings} حجز ملغى`} icon={PieChartIcon} color="bg-red-500" />
          <StatCard title="معدل الإنجاز" value={`${completionRate}%`} desc="مؤكد + مكتمل" icon={TrendingUp} color="bg-green-500" />
          <StatCard title="إجمالي العملاء" value={stats?.totalClients ?? 0} icon={Users} color="bg-blue-500" />
          <StatCard title="الوجهات النشطة" value={stats?.totalDestinations ?? 0} icon={MapPin} color="bg-amber-500" />
        </>}
      </div>

      {/* Revenue chart + Status pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">الإيرادات الشهرية</CardTitle>
            <CardDescription>آخر 12 شهراً</CardDescription>
          </CardHeader>
          <CardContent>
            {revLoading ? <Skeleton className="h-56 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={revenueData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} $`, "الإيرادات"]} />
                  <Line type="monotone" dataKey="إيرادات" stroke="hsl(43 73% 44%)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">توزيع الحجوزات</CardTitle>
            <CardDescription>حسب الحالة</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {statusLoading ? <Skeleton className="h-56 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="45%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
                    {statusData?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Destinations + Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-500" /> أكثر الوجهات طلباً</CardTitle>
          </CardHeader>
          <CardContent>
            {destLoading ? <Skeleton className="h-48 w-full" /> : topDest?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">لا توجد بيانات بعد</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={topDest} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="destinationName" type="category" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v: any) => [v, "حجز"]} />
                    <Bar dataKey="bookingCount" fill="hsl(43 73% 44%)" radius={[0, 4, 4, 0]}>
                      {topDest?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-2">
                  {topDest?.map((d, i) => (
                    <div key={d.destinationId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span>{d.destinationName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Badge variant="outline">{d.bookingCount} حجز</Badge>
                        <span className="font-semibold text-foreground">{d.totalRevenue.toLocaleString()} $</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" /> أفضل العملاء</CardTitle>
          </CardHeader>
          <CardContent>
            {clientsLoading ? <Skeleton className="h-48 w-full" /> : topClients?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">لا توجد بيانات بعد</p>
            ) : (
              <div className="space-y-3">
                {topClients?.map((c, i) => (
                  <div key={c.clientId} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
                      style={{ background: COLORS[i % COLORS.length] }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{c.clientName}</div>
                      <div className="text-xs text-muted-foreground">{c.bookingCount} حجز</div>
                    </div>
                    <div className="font-bold text-sm text-amber-600 shrink-0">{c.totalSpent.toLocaleString()} $</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
