import { useState } from "react";
import { useListReminders, useCreateReminder, useUpdateReminder, useDeleteReminder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";
import { Plus, Trash2, CheckCircle2, Circle, Bell, Loader2, Calendar, AlarmClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const TYPES: Record<string, { label: string; color: string }> = {
  booking: { label: "حجز", color: "bg-blue-100 text-blue-800" },
  payment: { label: "دفع", color: "bg-green-100 text-green-800" },
  client:  { label: "عميل", color: "bg-purple-100 text-purple-800" },
  general: { label: "عام", color: "bg-gray-100 text-gray-700" },
};

const schema = z.object({
  title: z.string().min(2, "العنوان مطلوب"),
  description: z.string().optional(),
  dueDate: z.string().min(1, "التاريخ مطلوب"),
  type: z.enum(["booking", "payment", "general", "client"]).default("general"),
});
type FormData = z.infer<typeof schema>;

const QK = ["listReminders"];

export default function RemindersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: reminders, isLoading } = useListReminders();
  const create = useCreateReminder();
  const update = useUpdateReminder();
  const del = useDeleteReminder();

  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [tab, setTab] = useState<"pending" | "done">("pending");

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { title: "", description: "", dueDate: new Date().toISOString().split("T")[0], type: "general" } });

  const close = () => { setIsOpen(false); form.reset(); };

  const onSubmit = (data: FormData) => {
    create.mutate({ data: { ...data, description: data.description || null, isCompleted: false } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: QK }); toast({ title: "تمت إضافة التذكير" }); close(); },
    });
  };

  const toggle = (r: any) => {
    update.mutate({ id: r.id, data: { isCompleted: !r.isCompleted } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: QK }),
    });
  };

  const pending = reminders?.filter(r => !r.isCompleted) ?? [];
  const done = reminders?.filter(r => r.isCompleted) ?? [];

  const getDueBadge = (dueDate: string) => {
    const d = new Date(dueDate);
    if (isPast(d) && !isToday(d)) return <Badge variant="destructive" className="text-xs gap-1"><AlarmClock className="h-3 w-3" /> متأخر</Badge>;
    if (isToday(d)) return <Badge className="text-xs bg-amber-500">اليوم</Badge>;
    const days = differenceInDays(d, new Date());
    if (days <= 3) return <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">بعد {days} أيام</Badge>;
    return null;
  };

  const ReminderCard = ({ r }: { r: any }) => {
    const t = TYPES[r.type] ?? TYPES.general;
    return (
      <div className={`flex items-start gap-3 p-4 rounded-xl border bg-card transition-all ${r.isCompleted ? "opacity-60" : "hover:shadow-sm"}`}>
        <button onClick={() => toggle(r)} className="mt-0.5 shrink-0 text-primary hover:scale-110 transition-transform">
          {r.isCompleted ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`font-semibold ${r.isCompleted ? "line-through text-muted-foreground" : ""}`}>{r.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${t.color}`}>{t.label}</span>
            {!r.isCompleted && getDueBadge(r.dueDate)}
          </div>
          {r.description && <p className="text-sm text-muted-foreground mb-1">{r.description}</p>}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(r.dueDate), "EEEE d MMMM yyyy", { locale: ar })}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => setDeleteTarget(r)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">التذكيرات والمواعيد</h1>
            <p className="text-muted-foreground mt-1">تتبع المواعيد والمهام المهمة.</p>
          </div>
          <Button onClick={() => setIsOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> تذكير جديد</Button>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-card border rounded-xl p-4">
            <div className="text-2xl font-bold text-primary">{pending.length}</div>
            <div className="text-xs text-muted-foreground mt-1">تذكير معلق</div>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <div className="text-2xl font-bold text-destructive">{pending.filter(r => isPast(new Date(r.dueDate)) && !isToday(new Date(r.dueDate))).length}</div>
            <div className="text-xs text-muted-foreground mt-1">متأخر</div>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <div className="text-2xl font-bold text-green-500">{done.length}</div>
            <div className="text-xs text-muted-foreground mt-1">مكتمل</div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="pending">المعلقة ({pending.length})</TabsTrigger>
            <TabsTrigger value="done">المكتملة ({done.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-3 mt-4">
            {isLoading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) :
             pending.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>لا توجد تذكيرات معلقة.</p>
              </div>
            ) : pending.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(r => <ReminderCard key={r.id} r={r} />)}
          </TabsContent>
          <TabsContent value="done" className="space-y-3 mt-4">
            {done.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><p>لا توجد تذكيرات مكتملة.</p></div>
            ) : done.map(r => <ReminderCard key={r.id} r={r} />)}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isOpen} onOpenChange={o => { if (!o) close(); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>تذكير جديد</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>العنوان *</FormLabel><FormControl><Input {...field} placeholder="مثال: تأكيد حجز العميل أحمد..." /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem><FormLabel>التاريخ *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>النوع</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{Object.entries(TYPES).map(([v, { label }]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>التفاصيل</FormLabel><FormControl><Textarea {...field} className="h-20" /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>إلغاء</Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جارٍ الحفظ...</> : "إضافة التذكير"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>حذف التذكير</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف <strong>{deleteTarget?.title}</strong>؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => del.mutate({ id: deleteTarget.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: QK }); toast({ title: "تم حذف التذكير" }); setDeleteTarget(null); } })}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
