import { useState } from "react";
import { useListExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, getListExpensesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Plus, MoreHorizontal,
  Pencil, Trash2, Loader2, AlertCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector
} from "recharts";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const EXPENSE_CATEGORIES: { value: string; label: string; color: string }[] = [
  { value: "office_rent",   label: "إيجار المكتب",       color: "#6366f1" },
  { value: "salaries",      label: "رواتب الموظفين",     color: "#f59e0b" },
  { value: "marketing",     label: "تسويق وإعلان",       color: "#10b981" },
  { value: "commissions",   label: "عمولات",              color: "#3b82f6" },
  { value: "transport",     label: "نقل ومواصلات",       color: "#ef4444" },
  { value: "utilities",     label: "فواتير الخدمات",     color: "#8b5cf6" },
  { value: "other",         label: "مصاريف أخرى",        color: "#6b7280" },
];

const MONTH_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function categoryAr(cat: string) {
  return EXPENSE_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}
function categoryColor(cat: string) {
  return EXPENSE_CATEGORIES.find(c => c.value === cat)?.color ?? "#6b7280";
}

interface FinanceSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  monthly: { month: string; revenue: number; expenses: number }[];
  byCategory: { category: string; total: number }[];
}

const expenseSchema = z.object({
  category: z.string().min(1, "الفئة مطلوبة"),
  description: z.string().min(2, "الوصف مطلوب"),
  amount: z.coerce.number().min(0.01, "المبلغ يجب أن يكون موجبًا"),
  date: z.string().min(1, "التاريخ مطلوب"),
  reference: z.string().optional(),
});
type ExpenseFormValues = z.infer<typeof expenseSchema>;

function StatCard({ title, value, sub, icon: Icon, positive, color }: {
  title: string; value: string; sub?: string; icon: any; positive?: boolean; color?: string;
}) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1" style={color ? { color } : {}}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="p-2.5 rounded-full" style={{ background: color ? `${color}18` : "hsl(var(--muted))" }}>
            <Icon className="h-5 w-5" style={color ? { color } : {}} />
          </div>
        </div>
        {positive !== undefined && (
          <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${positive ? "text-green-600" : "text-red-500"}`}>
            {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {positive ? "ربح صافي" : "خسارة"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const month = label ? MONTH_AR[parseInt(label.split("-")[1]) - 1] + " " + label.split("-")[0] : "";
    return (
      <div className="bg-white border rounded-lg shadow-lg p-3 text-sm min-w-[160px]" dir="rtl">
        <p className="font-semibold mb-2">{month}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex justify-between gap-4">
            <span style={{ color: entry.color }}>{entry.name === "revenue" ? "إيرادات" : "مصاريف"}</span>
            <span className="font-medium">{Number(entry.value).toLocaleString()} $</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function FinancePage() {
  const { data: expenses, isLoading: expLoading } = useListExpenses();
  const { data: summary, isLoading: summLoading } = useQuery<FinanceSummary>({
    queryKey: ["finance-summary"],
    queryFn: () => fetch("/api/finance/summary").then(r => r.json()),
    staleTime: 30_000,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [yearFilter, setYearFilter] = useState<string>(String(new Date().getFullYear()));

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { category: "other", description: "", amount: 0, date: new Date().toISOString().split("T")[0], reference: "" },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
  };

  const openEdit = (exp: any) => {
    setEditingExpense(exp);
    form.reset({
      category: exp.category, description: exp.description,
      amount: exp.amount, date: exp.date.split("T")[0], reference: exp.reference ?? "",
    });
    setIsFormOpen(true);
  };

  const closeForm = () => { setIsFormOpen(false); setEditingExpense(null); form.reset(); };

  const onSubmit = (data: ExpenseFormValues) => {
    const payload = { ...data, date: new Date(data.date).toISOString() };
    if (editingExpense) {
      updateExpense.mutate({ id: editingExpense.id, data: payload as any }, {
        onSuccess: () => { invalidate(); toast({ title: "تم تحديث المصروف" }); closeForm(); },
      });
    } else {
      createExpense.mutate({ data: payload as any }, {
        onSuccess: () => { invalidate(); toast({ title: "تم تسجيل المصروف" }); closeForm(); },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteExpense.mutate({ id: deleteTarget.id }, {
      onSuccess: () => { invalidate(); toast({ title: "تم حذف المصروف" }); setDeleteTarget(null); },
    });
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2].map(y => String(y));

  const filteredExpenses = expenses?.filter(e =>
    !yearFilter || new Date(e.date).getFullYear() === parseInt(yearFilter)
  );

  const monthlyData = summary?.monthly?.map(m => ({
    ...m,
    monthLabel: MONTH_AR[parseInt(m.month.split("-")[1]) - 1]?.slice(0, 3) ?? m.month,
  })) ?? [];

  const pieData = (summary?.byCategory ?? []).map(c => ({
    name: categoryAr(c.category),
    value: Number(c.total),
    color: categoryColor(c.category),
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">المالية والأرباح</h1>
          <p className="text-muted-foreground mt-1">مراقبة الإيرادات والمصاريف وصافي الأرباح.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} data-testid="button-add-expense">
          <Plus className="ml-2 h-4 w-4" /> تسجيل مصروف
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)
        ) : (
          <>
            <StatCard title="إجمالي الإيرادات" value={`${(summary?.totalRevenue ?? 0).toLocaleString()} $`} icon={TrendingUp} color="#10b981" sub="من المدفوعات المُسجّلة" />
            <StatCard title="إجمالي المصاريف" value={`${(summary?.totalExpenses ?? 0).toLocaleString()} $`} icon={TrendingDown} color="#ef4444" sub="كل أنواع المصاريف" />
            <StatCard title="صافي الربح" value={`${(summary?.netProfit ?? 0).toLocaleString()} $`} icon={DollarSign} positive={(summary?.netProfit ?? 0) >= 0} color={(summary?.netProfit ?? 0) >= 0 ? "#6366f1" : "#ef4444"} />
            <StatCard title="هامش الربح" value={`${summary?.profitMargin ?? 0}%`} icon={BarChart3} color="#f59e0b" sub="نسبة الربح من الإيرادات" />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>الإيرادات مقابل المصاريف</CardTitle>
            <CardDescription>آخر 12 شهراً</CardDescription>
          </CardHeader>
          <CardContent>
            {summLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(v) => v === "revenue" ? "إيرادات" : "مصاريف"}
                    wrapperStyle={{ fontSize: 12, direction: "rtl" }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="revenue" />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="expenses" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>المصاريف حسب الفئة</CardTitle>
            <CardDescription>توزيع المصاريف الإجمالية</CardDescription>
          </CardHeader>
          <CardContent>
            {summLoading ? <Skeleton className="h-64 w-full" /> : pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                <AlertCircle className="h-8 w-8 opacity-40" />
                <p className="text-sm">لا توجد مصاريف بعد</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} $`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value.toLocaleString()} $</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>سجل المصاريف</CardTitle>
            <CardDescription>إدارة جميع مصاريف الوكالة</CardDescription>
          </div>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>الفئة</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>المرجع</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(6).fill(0).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : filteredExpenses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    لا توجد مصاريف مسجّلة. اضغط "تسجيل مصروف" لإضافة واحد.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses?.map(exp => (
                  <TableRow key={exp.id} className="group" data-testid={`row-expense-${exp.id}`}>
                    <TableCell className="text-sm">{format(new Date(exp.date), "d MMM yyyy", { locale: ar })}</TableCell>
                    <TableCell>
                      <Badge variant="outline" style={{ borderColor: categoryColor(exp.category), color: categoryColor(exp.category), background: `${categoryColor(exp.category)}12` }}>
                        {categoryAr(exp.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{exp.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{exp.reference ?? "—"}</TableCell>
                    <TableCell className="font-semibold text-red-500">{exp.amount.toLocaleString()} $</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => openEdit(exp)} className="cursor-pointer">
                            <Pencil className="ml-2 h-4 w-4" /> تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteTarget(exp)} className="text-destructive focus:text-destructive cursor-pointer">
                            <Trash2 className="ml-2 h-4 w-4" /> حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "تعديل المصروف" : "تسجيل مصروف جديد"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>الفئة *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-expense-category"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c.color }} />
                            {c.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="وصف مختصر للمصروف" data-testid="input-expense-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ ($) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} data-testid="input-expense-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>التاريخ *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-expense-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="reference" render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم المرجع / الفاتورة</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="اختياري — رقم وثيقة أو فاتورة" data-testid="input-expense-reference" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>إلغاء</Button>
                <Button type="submit" disabled={createExpense.isPending || updateExpense.isPending} data-testid="button-submit-expense">
                  {(createExpense.isPending || updateExpense.isPending) ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جارٍ الحفظ...</> : editingExpense ? "حفظ التغييرات" : "تسجيل المصروف"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف المصروف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف مصروف <strong>{deleteTarget?.description}</strong> بمبلغ <strong>{deleteTarget?.amount}$</strong>؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteExpense.isPending ? "جارٍ الحذف..." : "نعم، احذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
