import { useState } from "react";
import { Link } from "wouter";
import { useListPayments, useUpdatePayment, useDeletePayment, getListPaymentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CreditCard, Search, Download, TrendingUp, CheckCircle, Clock, Pencil, Trash2, MoreHorizontal, Loader2 } from "lucide-react";
import { downloadCSV } from "@/lib/export-csv";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { methodAr } from "@/lib/i18n";

const PAYMENT_METHODS = [
  { value: "cash",          label: "نقداً" },
  { value: "card",          label: "بطاقة بنكية" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "cheque",        label: "شيك" },
];

const editSchema = z.object({
  bookingId:           z.coerce.number().int().min(1, "رقم الحجز مطلوب"),
  bookingTotalPrice:   z.coerce.number().min(0, "المبلغ الإجمالي يجب أن يكون موجباً").optional(),
  bookingServiceCost:  z.coerce.number().min(0, "سعر الخدمة يجب أن يكون موجباً").optional(),
  amount:              z.coerce.number().min(0.01, "المبلغ يجب أن يكون موجباً"),
  paymentDate:         z.string().min(1, "التاريخ مطلوب"),
  method:              z.enum(["cash", "card", "bank_transfer", "cheque"]),
  clientNameOverride:  z.string().optional(),
  notes:               z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

const QUERY_KEY = getListPaymentsQueryKey();

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: payments, isLoading } = useListPayments();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { bookingId: 0, bookingTotalPrice: 0, bookingServiceCost: 0, amount: 0, paymentDate: "", method: "cash", clientNameOverride: "", notes: "" },
  });

  const openEdit = (payment: any) => {
    setEditTarget(payment);
    form.reset({
      bookingId:          payment.bookingId,
      bookingTotalPrice:  payment.totalPrice ?? 0,
      bookingServiceCost: 0,
      amount:             payment.amount,
      paymentDate:        payment.paymentDate?.split("T")[0] ?? "",
      method:             payment.method,
      clientNameOverride: payment.clientName ?? "",
      notes:              payment.notes ?? "",
    });
  };

  const closeEdit = () => { setEditTarget(null); form.reset(); };

  const onSubmit = (data: EditForm) => {
    const payload: EditForm = {
      ...data,
      paymentDate: new Date(data.paymentDate).toISOString(),
    };
    // Only send bookingTotalPrice / bookingServiceCost if they differ from current values
    const tpChanged = data.bookingTotalPrice !== undefined && data.bookingTotalPrice !== (editTarget?.totalPrice ?? 0);
    const scChanged = data.bookingServiceCost !== undefined && data.bookingServiceCost !== (editTarget?.serviceCost ?? 0);
    if (!tpChanged) delete payload.bookingTotalPrice;
    if (!scChanged) delete payload.bookingServiceCost;

    updatePayment.mutate(
      { id: editTarget.id, data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
          toast({ title: "تم تعديل الدفعة بنجاح" });
          closeEdit();
        },
        onError: (err: any) => {
          const serverMsg = err?.data?.error || err?.message || "";
          toast({
            title: "حدث خطأ أثناء التعديل",
            description: serverMsg || undefined,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePayment.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
          toast({ title: "تم حذف الدفعة" });
          setDeleteTarget(null);
        },
        onError: () => toast({ title: "حدث خطأ أثناء الحذف", variant: "destructive" }),
      }
    );
  };

  const filteredPayments = payments?.filter(p =>
    !search ||
    p.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    p.bookingId.toString().includes(search)
  );

  const totalCollected    = filteredPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const totalBookingAmount = payments
    ? [...new Map(payments.map(p => [p.bookingId, p])).values()].reduce((sum, p) => sum + (p.totalPrice ?? 0), 0)
    : 0;
  const totalRemaining = payments
    ? [...new Map(payments.map(p => [p.bookingId, p])).values()].reduce((sum, p) => sum + (p.remainingAmount ?? 0), 0)
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">المدفوعات</h1>
          <p className="text-muted-foreground mt-1">عرض جميع المعاملات المالية.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث باسم العميل أو رقم الحجز..."
              className="pr-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-payments"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            downloadCSV("payments.csv",
              ["#", "التاريخ", "العميل", "رقم الحجز", "المبلغ المدفوع", "الإجمالي", "المتبقي", "طريقة الدفع", "ملاحظات"],
              (filteredPayments ?? []).map(p => [p.id, p.paymentDate, p.clientName ?? "", p.bookingId, p.amount, p.totalPrice ?? 0, p.remainingAmount ?? 0, p.method, p.notes ?? ""])
            );
          }} className="gap-1.5 shrink-0">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الحجوزات</p>
                <p className="text-2xl font-bold text-primary mt-1">{isLoading ? "..." : totalBookingAmount.toLocaleString()} $</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المدفوع</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{isLoading ? "..." : totalCollected.toLocaleString()} $</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المتبقي</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{isLoading ? "..." : totalRemaining.toLocaleString()} $</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="border rounded-md bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>رقم الحجز</TableHead>
              <TableHead>المبلغ المدفوع</TableHead>
              <TableHead>إجمالي الحجز</TableHead>
              <TableHead>المدفوع للحجز</TableHead>
              <TableHead>المتبقي</TableHead>
              <TableHead>طريقة الدفع</TableHead>
              <TableHead>ملاحظات</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(6).fill(0).map((_, i) => (
                <TableRow key={i}>
                  {Array(10).fill(0).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredPayments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  لا توجد مدفوعات.
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments?.map((payment) => {
                const remaining = payment.remainingAmount ?? 0;
                return (
                  <TableRow key={payment.id} className="group" data-testid={`row-payment-${payment.id}`}>
                    <TableCell>{format(new Date(payment.paymentDate), 'd MMM yyyy', { locale: ar })}</TableCell>
                    <TableCell className="font-medium">{payment.clientName}</TableCell>
                    <TableCell>
                      <Link href={`/bookings/${payment.bookingId}`} className="font-mono text-sm text-primary hover:underline">
                        #{payment.bookingId}
                      </Link>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600" data-testid={`text-amount-${payment.id}`}>
                      {payment.amount.toLocaleString()} $
                    </TableCell>
                    <TableCell className="font-semibold text-primary">{(payment.totalPrice ?? 0).toLocaleString()} $</TableCell>
                    <TableCell className="font-semibold text-blue-600">{(payment.paidAmount ?? 0).toLocaleString()} $</TableCell>
                    <TableCell className={`font-semibold ${remaining > 0 ? "text-amber-600" : "text-green-600"}`}>
                      {remaining.toLocaleString()} $
                      {remaining === 0 && <span className="mr-1 text-xs">✓</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{methodAr(payment.method)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                      {payment.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(payment)} title="تعديل">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setDeleteTarget(payment)} title="حذف">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) closeEdit(); }}>
        <DialogContent dir="rtl" className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>تعديل الدفعة #{editTarget?.id}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 space-y-4 px-1 pb-2">
              <FormField control={form.control} name="bookingId" render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الحجز *</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="bookingTotalPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ الإجمالي للحجز ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="bookingServiceCost" render={({ field }) => (
                <FormItem>
                  <FormLabel>سعر الخدمة / التكلفة ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="clientNameOverride" render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم العميل</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="اسم العميل..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ المدفوع ($) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="paymentDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ الدفع *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="method" render={({ field }) => (
                <FormItem>
                  <FormLabel>طريقة الدفع *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="h-20" placeholder="ملاحظة اختيارية..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              </div>
              <DialogFooter className="gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={closeEdit}>إلغاء</Button>
                <Button type="submit" disabled={updatePayment.isPending}>
                  {updatePayment.isPending
                    ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" /> جارٍ الحفظ...</>
                    : "حفظ التغييرات"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الدفعة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف دفعة <strong>{deleteTarget?.clientName}</strong> بمبلغ <strong>{deleteTarget?.amount?.toLocaleString()} $</strong>؟
              سيتم خصم هذا المبلغ من المدفوعات تلقائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePayment.isPending ? "جارٍ الحذف..." : "نعم، احذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
