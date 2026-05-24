import { useState } from "react";
import { useListBookings } from "@workspace/api-client-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { ar } from "date-fns/locale";
import { ChevronRight, ChevronLeft, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-500",
  pending:   "bg-amber-500",
  cancelled: "bg-red-400",
  completed: "bg-blue-500",
};
const STATUS_AR: Record<string, string> = {
  confirmed: "مؤكد", pending: "معلق", cancelled: "ملغى", completed: "مكتمل",
};

export default function CalendarPage() {
  const { data: bookings, isLoading } = useListBookings({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayBookings, setSelectedDayBookings] = useState<any[]>([]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start so week starts on Sunday
  const startPad = monthStart.getDay();
  const paddedDays: (Date | null)[] = [...Array(startPad).fill(null), ...days];
  while (paddedDays.length % 7 !== 0) paddedDays.push(null);

  const getBookingsForDay = (day: Date) =>
    bookings?.filter(b => {
      const dep = b.travelDate ? new Date(b.travelDate) : null;
      const ret = b.returnDate ? new Date(b.returnDate) : null;
      if (dep && isSameDay(dep, day)) return true;
      if (ret && isSameDay(ret, day)) return true;
      return false;
    }) ?? [];

  const openDay = (day: Date) => {
    const dayBookings = getBookingsForDay(day);
    if (dayBookings.length > 0) {
      setSelectedDay(day);
      setSelectedDayBookings(dayBookings);
    }
  };

  // Upcoming bookings (next 30 days)
  const today = new Date();
  const upcoming = bookings?.filter(b => {
    const dep = b.travelDate ? new Date(b.travelDate) : null;
    if (!dep) return false;
    const diff = (dep.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30 && b.status !== "cancelled";
  }).sort((a, b) => new Date(a.travelDate!).getTime() - new Date(b.travelDate!).getTime()) ?? [];

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">تقويم الرحلات</h1>
            <p className="text-muted-foreground mt-1">عرض مواعيد الحجوزات والرحلات السياحية.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <span className="font-semibold text-base min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: ar })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Calendar */}
          <div className="flex-1 border rounded-xl bg-card shadow-sm overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {DAYS_AR.map(d => (
                <div key={d} className="p-2.5 text-center text-xs font-semibold text-muted-foreground border-l last:border-l-0">{d}</div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7">
              {isLoading
                ? Array(35).fill(0).map((_, i) => <div key={i} className="h-20 border-b border-l last-in-row:border-l-0 p-1"><Skeleton className="h-6 w-6 rounded-full" /></div>)
                : paddedDays.map((day, idx) => {
                    if (!day) return <div key={idx} className="h-20 bg-muted/30 border-b border-l" />;
                    const dayBks = getBookingsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isCurrentDay = isToday(day);
                    return (
                      <div
                        key={idx}
                        onClick={() => openDay(day)}
                        className={`min-h-[5rem] border-b border-l p-1.5 transition-colors ${isCurrentMonth ? "bg-card" : "bg-muted/20"} ${dayBks.length > 0 ? "cursor-pointer hover:bg-primary/5" : ""}`}
                      >
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-sm font-medium mb-1 ${isCurrentDay ? "bg-primary text-primary-foreground" : isCurrentMonth ? "" : "text-muted-foreground"}`}>
                          {format(day, "d")}
                        </div>
                        <div className="space-y-0.5">
                          {dayBks.slice(0, 2).map((b, bi) => (
                            <div key={bi} className={`text-[10px] px-1.5 py-0.5 rounded text-white truncate ${STATUS_COLORS[b.status] ?? "bg-gray-400"}`}>
                              {b.clientName}
                            </div>
                          ))}
                          {dayBks.length > 2 && (
                            <div className="text-[10px] text-muted-foreground px-1">+{dayBks.length - 2} أخرى</div>
                          )}
                        </div>
                      </div>
                    );
                  })
              }
            </div>
            {/* Legend */}
            <div className="p-3 border-t flex gap-4 flex-wrap text-xs text-muted-foreground">
              {Object.entries(STATUS_COLORS).map(([st, color]) => (
                <div key={st} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
                  {STATUS_AR[st]}
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming sidebar */}
          <div className="lg:w-72 space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">الرحلات القادمة (30 يوم)</h2>
            {upcoming.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                لا توجد رحلات قادمة.
              </div>
            ) : upcoming.map(b => {
              const dep = new Date(b.travelDate!);
              const daysLeft = Math.ceil((dep.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={b.id} className="bg-card border rounded-xl p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-sm leading-tight">{b.clientName}</div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {daysLeft === 0 ? "اليوم" : `${daysLeft}ي`}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">{b.packageName}</div>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${STATUS_COLORS[b.status]}`} />
                    <span className="text-xs">{format(dep, "d MMM yyyy", { locale: ar })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day detail dialog */}
      <Dialog open={!!selectedDay} onOpenChange={o => { if (!o) { setSelectedDay(null); setSelectedDayBookings([]); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>حجوزات {selectedDay ? format(selectedDay, "EEEE d MMMM yyyy", { locale: ar }) : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {selectedDayBookings.map(b => {
              const isDep = b.travelDate && isSameDay(new Date(b.travelDate), selectedDay!);
              return (
                <div key={b.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border">
                  <div className={`mt-1 h-3 w-3 rounded-full shrink-0 ${STATUS_COLORS[b.status]}`} />
                  <div>
                    <div className="font-semibold">{b.clientName}</div>
                    <div className="text-sm text-muted-foreground">{b.packageName}</div>
                    <div className="text-xs mt-1">
                      <Badge variant="outline" className="mr-1">{isDep ? "انطلاق" : "عودة"}</Badge>
                      <Badge variant="secondary">{STATUS_AR[b.status]}</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
