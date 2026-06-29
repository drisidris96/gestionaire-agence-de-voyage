import { useState } from "react";
import {
  useListEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee,
  useListPayroll, useCreatePayroll, useUpdatePayroll, useDeletePayroll,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/use-agency";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus, MoreHorizontal, Pencil, Trash2, Users, Printer,
  FileText, Banknote, CheckCircle2, Clock, Loader2, Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

const employeeSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  position: z.string().min(1, "الوظيفة مطلوبة"),
  baseSalary: z.coerce.number().min(0, "الراتب يجب أن يكون صحيحاً"),
  phone: z.string().optional(),
  hireDate: z.string().min(1, "تاريخ التوظيف مطلوب"),
  isActive: z.boolean().default(true),
});
type EmployeeForm = z.infer<typeof employeeSchema>;

const payrollSchema = z.object({
  employeeId: z.coerce.number().min(1, "الموظف مطلوب"),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020),
  baseSalary: z.coerce.number().min(0),
  allowances: z.coerce.number().min(0).default(0),
  deductions: z.coerce.number().min(0).default(0),
  status: z.enum(["draft", "paid"]).default("draft"),
  notes: z.string().optional(),
});
type PayrollForm = z.infer<typeof payrollSchema>;

const PAYROLL_QUERY_KEY = ["listPayroll"];
const EMPLOYEE_QUERY_KEY = ["listEmployees"];

function PayslipPrint({ record, agency }: { record: any; agency: any }) {
  const logoSrc = agency.agencyLogoUrl || "/logo.jpg";
  return (
    <div id="print-area" className="bg-white p-8 max-w-[700px] mx-auto border rounded-xl shadow-lg print:shadow-none print:border-none">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 pb-4 mb-5" style={{ borderColor: "#C9A227" }}>
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt={agency.agencyName} className="h-16 w-auto object-contain rounded"
            onError={(e) => { (e.target as HTMLImageElement).src = "/logo.jpg"; }} />
          <div>
            <div className="text-lg font-black" style={{ color: "#C9A227" }}>{agency.agencyName}</div>
            <div className="text-xs tracking-widest text-gray-500 uppercase">{agency.agencyNameEn}</div>
          </div>
        </div>
        <div className="text-left border-2 rounded-lg px-4 py-2 text-center" style={{ borderColor: "#C9A227" }}>
          <div className="text-sm font-bold" style={{ color: "#C9A227" }}>كشف الراتب</div>
          <div className="text-xs text-gray-500">{MONTHS_AR[record.month - 1]} {record.year}</div>
        </div>
      </div>

      {/* Employee Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-5 border-r-4" style={{ borderColor: "#C9A227" }}>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-gray-500">الموظف: </span><span className="font-bold">{record.employeeName}</span></div>
          <div><span className="text-gray-500">الوظيفة: </span><span className="font-medium">{record.position}</span></div>
          <div><span className="text-gray-500">الشهر: </span><span className="font-medium">{MONTHS_AR[record.month - 1]} {record.year}</span></div>
          <div><span className="text-gray-500">الحالة: </span>
            <span className={`font-medium ${record.status === "paid" ? "text-green-600" : "text-amber-600"}`}>
              {record.status === "paid" ? "مدفوع" : "مسودة"}
            </span>
          </div>
        </div>
      </div>

      {/* Salary Table */}
      <table className="w-full text-sm mb-5 border-collapse">
        <thead>
          <tr style={{ backgroundColor: "#C9A227", color: "white" }}>
            <th className="p-2.5 text-right font-semibold rounded-tr-md">البيان</th>
            <th className="p-2.5 text-center font-semibold rounded-tl-md">المبلغ ($)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-200">
            <td className="p-2.5 font-medium">الراتب الأساسي</td>
            <td className="p-2.5 text-center">{record.baseSalary.toLocaleString()}</td>
          </tr>
          <tr className="border-b border-gray-200 bg-green-50/50">
            <td className="p-2.5 font-medium text-green-700">+ العلاوات والمكافآت</td>
            <td className="p-2.5 text-center text-green-600">+ {record.allowances.toLocaleString()}</td>
          </tr>
          <tr className="border-b border-gray-200 bg-red-50/50">
            <td className="p-2.5 font-medium text-red-700">- الخصومات</td>
            <td className="p-2.5 text-center text-red-600">- {record.deductions.toLocaleString()}</td>
          </tr>
          <tr style={{ backgroundColor: "#C9A22710" }}>
            <td className="p-2.5 font-bold text-lg">صافي الراتب</td>
            <td className="p-2.5 text-center font-bold text-xl" style={{ color: "#C9A227" }}>{record.netSalary.toLocaleString()} $</td>
          </tr>
        </tbody>
      </table>

      {record.notes && (
        <div className="p-3 bg-blue-50 rounded-lg text-sm text-gray-700 mb-4">
          <span className="font-semibold">ملاحظات: </span>{record.notes}
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-8">
          <div><div className="text-sm font-semibold text-gray-700 mb-6">توقيع الموظف</div>
            <div className="border-b-2 border-dashed border-gray-300 w-40"></div></div>
          <div className="text-left rtl:text-right"><div className="text-sm font-semibold text-gray-700 mb-6">توقيع المسؤول</div>
            <div className="border-b-2 border-dashed border-gray-300 w-40 mr-auto rtl:ml-auto rtl:mr-0"></div></div>
        </div>
        <div className="mt-6 text-center text-[10px] text-gray-400 border-t pt-3">
          {agency.agencyName} — {agency.agencyNameEn}
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const { settings: agency } = useAgency();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: employees, isLoading: empLoading } = useListEmployees();
  const { data: payrollRecords, isLoading: payLoading } = useListPayroll({});
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const createPayroll = useCreatePayroll();
  const updatePayroll = useUpdatePayroll();
  const deletePayroll = useDeletePayroll();

  const [tab, setTab] = useState<"employees" | "payroll">("employees");
  const [isEmpOpen, setIsEmpOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);
  const [deleteEmpTarget, setDeleteEmpTarget] = useState<any>(null);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [editingPay, setEditingPay] = useState<any>(null);
  const [deletePayTarget, setDeletePayTarget] = useState<any>(null);
  const [printRecord, setPrintRecord] = useState<any>(null);

  const now = new Date();
  const empForm = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: "", position: "", baseSalary: 0, phone: "", hireDate: "", isActive: true },
  });
  const payForm = useForm<PayrollForm>({
    resolver: zodResolver(payrollSchema),
    defaultValues: { employeeId: 0, month: now.getMonth() + 1, year: now.getFullYear(), baseSalary: 0, allowances: 0, deductions: 0, status: "draft", notes: "" },
  });

  const watchedEmpId = payForm.watch("employeeId");
  const watchedBase = payForm.watch("baseSalary");
  const watchedAllowances = payForm.watch("allowances");
  const watchedDeductions = payForm.watch("deductions");
  const computedNet = (Number(watchedBase) || 0) + (Number(watchedAllowances) || 0) - (Number(watchedDeductions) || 0);

  const openEditEmp = (emp: any) => {
    setEditingEmp(emp);
    empForm.reset({ name: emp.name, position: emp.position, baseSalary: emp.baseSalary, phone: emp.phone || "", hireDate: emp.hireDate, isActive: emp.isActive });
    setIsEmpOpen(true);
  };
  const closeEmp = () => { setIsEmpOpen(false); setEditingEmp(null); empForm.reset(); };

  const openAddPayroll = (emp?: any) => {
    setEditingPay(null);
    payForm.reset({
      employeeId: emp?.id || 0, month: now.getMonth() + 1, year: now.getFullYear(),
      baseSalary: emp?.baseSalary || 0, allowances: 0, deductions: 0, status: "draft", notes: "",
    });
    setIsPayOpen(true);
  };
  const openEditPay = (rec: any) => {
    setEditingPay(rec);
    payForm.reset({ employeeId: rec.employeeId, month: rec.month, year: rec.year, baseSalary: rec.baseSalary, allowances: rec.allowances, deductions: rec.deductions, status: rec.status, notes: rec.notes || "" });
    setIsPayOpen(true);
  };
  const closePay = () => { setIsPayOpen(false); setEditingPay(null); payForm.reset(); };

  const onSubmitEmp = (data: EmployeeForm) => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: EMPLOYEE_QUERY_KEY });
    if (editingEmp) {
      updateEmployee.mutate({ id: editingEmp.id, data }, { onSuccess: () => { invalidate(); toast({ title: "تم تحديث الموظف" }); closeEmp(); } });
    } else {
      createEmployee.mutate({ data }, { onSuccess: () => { invalidate(); toast({ title: "تمت إضافة الموظف" }); closeEmp(); } });
    }
  };

  const onSubmitPay = (data: PayrollForm) => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: PAYROLL_QUERY_KEY });
    if (editingPay) {
      updatePayroll.mutate({ id: editingPay.id, data }, { onSuccess: () => { invalidate(); toast({ title: "تم تحديث كشف الراتب" }); closePay(); } });
    } else {
      createPayroll.mutate({ data: data as any }, { onSuccess: () => { invalidate(); toast({ title: "تم إنشاء كشف الراتب" }); closePay(); } });
    }
  };

  return (
    <>
      <style>{`@media print { body * { visibility: hidden !important; } #print-area, #print-area * { visibility: visible !important; } #print-area { position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; background: white !important; } }`}</style>

      {printRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:bg-transparent print:inset-auto print:p-0">
          <div className="bg-white rounded-xl max-h-[90vh] overflow-y-auto max-w-3xl w-full print:max-h-none print:overflow-visible">
            <div className="flex items-center justify-between p-4 border-b print:hidden">
              <h2 className="font-bold text-lg">معاينة كشف الراتب</h2>
              <div className="flex gap-2">
                <Button onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> طباعة</Button>
                <Button variant="outline" onClick={() => setPrintRecord(null)}>إغلاق</Button>
              </div>
            </div>
            <div className="p-4 print:p-0">
              <PayslipPrint record={printRecord} agency={agency} />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">الموظفون والرواتب</h1>
            <p className="text-muted-foreground mt-1">إدارة بيانات الموظفين وكشوف رواتبهم الشهرية.</p>
          </div>
        </div>

        {(() => {
          const payDay = agency.payrollDay;
          if (!payDay) return null;
          const today = new Date();
          const year = today.getFullYear();
          const month = today.getMonth();
          const dueThisMonth = new Date(year, month, payDay);
          const dueDate = dueThisMonth < today
            ? new Date(year, month + 1, payDay)
            : dueThisMonth;
          const dd = String(dueDate.getDate()).padStart(2, "0");
          const mm = String(dueDate.getMonth() + 1).padStart(2, "0");
          const yyyy = dueDate.getFullYear();
          const daysLeft = Math.ceil((dueDate.getTime() - today.setHours(0,0,0,0)) / 86400000);
          const isToday = daysLeft === 0;
          const isUrgent = daysLeft <= 3;
          return (
            <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${isToday ? "bg-red-50 border-red-200 text-red-800" : isUrgent ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
              <Banknote className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">موعد صرف الرواتب: </span>
                <span className="font-bold">{`${dd}-${mm}-${yyyy}`}</span>
                {isToday
                  ? <span className="mr-2 font-bold text-red-600">— اليوم!</span>
                  : <span className="mr-2 text-muted-foreground">{` (بعد ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"})`}</span>
                }
              </div>
            </div>
          );
        })()}

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="employees" className="gap-2"><Users className="h-4 w-4" /> الموظفون</TabsTrigger>
            <TabsTrigger value="payroll" className="gap-2"><Banknote className="h-4 w-4" /> كشوف الرواتب</TabsTrigger>
          </TabsList>

          {/* ── Employees Tab ── */}
          <TabsContent value="employees">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setIsEmpOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> إضافة موظف
              </Button>
            </div>
            <div className="border rounded-md bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الوظيفة</TableHead>
                    <TableHead>الراتب الأساسي</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>تاريخ التوظيف</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empLoading ? Array(3).fill(0).map((_, i) => (
                    <TableRow key={i}>{Array(8).fill(0).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  )) : employees?.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا يوجد موظفون.</TableCell></TableRow>
                  ) : employees?.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">#{emp.id}</TableCell>
                      <TableCell className="font-semibold">{emp.name}</TableCell>
                      <TableCell>{emp.position}</TableCell>
                      <TableCell className="font-semibold text-primary">{emp.baseSalary.toLocaleString()} $</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{emp.phone || "—"}</TableCell>
                      <TableCell className="text-sm">{emp.hireDate}</TableCell>
                      <TableCell><Badge variant={emp.isActive ? "default" : "secondary"}>{emp.isActive ? "نشط" : "غير نشط"}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuItem onClick={() => { openAddPayroll(emp); setTab("payroll"); }} className="cursor-pointer">
                              <Banknote className="ml-2 h-4 w-4" /> إضافة راتب شهري
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditEmp(emp)} className="cursor-pointer"><Pencil className="ml-2 h-4 w-4" /> تعديل</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteEmpTarget(emp)} className="text-destructive focus:text-destructive cursor-pointer"><Trash2 className="ml-2 h-4 w-4" /> حذف</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Payroll Tab ── */}
          <TabsContent value="payroll">
            <div className="flex justify-end mb-4">
              <Button onClick={() => openAddPayroll()} className="gap-2">
                <Plus className="h-4 w-4" /> إنشاء كشف راتب
              </Button>
            </div>
            <div className="border rounded-md bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>الموظف</TableHead>
                    <TableHead>الوظيفة</TableHead>
                    <TableHead>الشهر</TableHead>
                    <TableHead>الراتب الأساسي</TableHead>
                    <TableHead>علاوات</TableHead>
                    <TableHead>خصومات</TableHead>
                    <TableHead>صافي الراتب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payLoading ? Array(3).fill(0).map((_, i) => (
                    <TableRow key={i}>{Array(10).fill(0).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  )) : payrollRecords?.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">لا توجد كشوف رواتب.</TableCell></TableRow>
                  ) : payrollRecords?.map(rec => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">#{rec.id}</TableCell>
                      <TableCell className="font-semibold">{rec.employeeName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rec.position}</TableCell>
                      <TableCell className="text-sm">{MONTHS_AR[rec.month - 1]} {rec.year}</TableCell>
                      <TableCell>{rec.baseSalary.toLocaleString()} $</TableCell>
                      <TableCell className="text-green-600">+{rec.allowances.toLocaleString()}</TableCell>
                      <TableCell className="text-red-500">-{rec.deductions.toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-primary">{rec.netSalary.toLocaleString()} $</TableCell>
                      <TableCell>
                        <Badge variant={rec.status === "paid" ? "default" : "secondary"} className="gap-1">
                          {rec.status === "paid" ? <><CheckCircle2 className="h-3 w-3" /> مدفوع</> : <><Clock className="h-3 w-3" /> مسودة</>}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuItem onClick={() => setPrintRecord(rec)} className="cursor-pointer"><Printer className="ml-2 h-4 w-4" /> طباعة كشف الراتب</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditPay(rec)} className="cursor-pointer"><Pencil className="ml-2 h-4 w-4" /> تعديل</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeletePayTarget(rec)} className="text-destructive focus:text-destructive cursor-pointer"><Trash2 className="ml-2 h-4 w-4" /> حذف</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Employee Form Dialog */}
      <Dialog open={isEmpOpen} onOpenChange={(o) => { if (!o) closeEmp(); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>{editingEmp ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}</DialogTitle></DialogHeader>
          <Form {...empForm}>
            <form onSubmit={empForm.handleSubmit(onSubmitEmp)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={empForm.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>الاسم الكامل *</FormLabel>
                    <FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={empForm.control} name="position" render={({ field }) => (
                  <FormItem><FormLabel>الوظيفة *</FormLabel>
                    <FormControl><Input {...field} placeholder="مدير، موظف استقبال..." /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={empForm.control} name="baseSalary" render={({ field }) => (
                  <FormItem><FormLabel>الراتب الأساسي ($) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={empForm.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>رقم الهاتف</FormLabel>
                    <FormControl><Input {...field} dir="ltr" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={empForm.control} name="hireDate" render={({ field }) => (
                  <FormItem><FormLabel>تاريخ التوظيف *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={empForm.control} name="isActive" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>الحالة</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "true")} value={field.value ? "true" : "false"}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="true">نشط</SelectItem><SelectItem value="false">غير نشط</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeEmp}>إلغاء</Button>
                <Button type="submit" disabled={createEmployee.isPending || updateEmployee.isPending}>
                  {(createEmployee.isPending || updateEmployee.isPending) ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جارٍ الحفظ...</> : editingEmp ? "حفظ التغييرات" : "إضافة الموظف"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payroll Form Dialog */}
      <Dialog open={isPayOpen} onOpenChange={(o) => { if (!o) closePay(); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>{editingPay ? "تعديل كشف الراتب" : "إنشاء كشف راتب جديد"}</DialogTitle></DialogHeader>
          <Form {...payForm}>
            <form onSubmit={payForm.handleSubmit(onSubmitPay)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={payForm.control} name="employeeId" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>الموظف *</FormLabel>
                    <Select onValueChange={(v) => {
                      field.onChange(v);
                      const emp = employees?.find(e => e.id.toString() === v);
                      if (emp) payForm.setValue("baseSalary", emp.baseSalary);
                    }} value={field.value ? field.value.toString() : undefined} disabled={!!editingPay}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger></FormControl>
                      <SelectContent>{employees?.filter(e => e.isActive).map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.name} — {e.position}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={payForm.control} name="month" render={({ field }) => (
                  <FormItem><FormLabel>الشهر *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{MONTHS_AR.map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={payForm.control} name="year" render={({ field }) => (
                  <FormItem><FormLabel>السنة *</FormLabel>
                    <FormControl><Input type="number" min="2020" max="2030" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={payForm.control} name="baseSalary" render={({ field }) => (
                  <FormItem><FormLabel>الراتب الأساسي ($) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={payForm.control} name="allowances" render={({ field }) => (
                  <FormItem><FormLabel>العلاوات ($)</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={payForm.control} name="deductions" render={({ field }) => (
                  <FormItem><FormLabel>الخصومات ($)</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="col-span-2 bg-primary/5 rounded-lg p-3 flex items-center justify-between border border-primary/20">
                  <span className="font-semibold">صافي الراتب:</span>
                  <span className="text-xl font-bold text-primary">{computedNet.toLocaleString()} $</span>
                </div>
                <FormField control={payForm.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>الحالة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="draft">مسودة</SelectItem><SelectItem value="paid">مدفوع</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={payForm.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>ملاحظات</FormLabel>
                    <FormControl><Textarea {...field} className="h-20" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closePay}>إلغاء</Button>
                <Button type="submit" disabled={createPayroll.isPending || updatePayroll.isPending}>
                  {(createPayroll.isPending || updatePayroll.isPending) ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جارٍ الحفظ...</> : editingPay ? "حفظ التغييرات" : "إنشاء كشف الراتب"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Employee */}
      <AlertDialog open={!!deleteEmpTarget} onOpenChange={(o) => { if (!o) setDeleteEmpTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>حذف الموظف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف <strong>{deleteEmpTarget?.name}</strong>؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteEmployee.mutate({ id: deleteEmpTarget.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: EMPLOYEE_QUERY_KEY }); toast({ title: "تم حذف الموظف" }); setDeleteEmpTarget(null); } }); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Payroll */}
      <AlertDialog open={!!deletePayTarget} onOpenChange={(o) => { if (!o) setDeletePayTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>حذف كشف الراتب</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف كشف راتب <strong>{deletePayTarget?.employeeName}</strong> لشهر {deletePayTarget ? MONTHS_AR[deletePayTarget.month - 1] : ""} {deletePayTarget?.year}؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deletePayroll.mutate({ id: deletePayTarget.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: PAYROLL_QUERY_KEY }); toast({ title: "تم حذف كشف الراتب" }); setDeletePayTarget(null); } }); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
