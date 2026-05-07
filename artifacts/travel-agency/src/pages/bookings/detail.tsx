import { useState } from "react";
import { useParams } from "wouter";
import {
  useGetBooking,
  useListPayments,
  useCreatePayment,
  useUpdateBooking,
  getGetBookingQueryKey,
  getListPaymentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { Calendar, User, CreditCard, Plane, FileText, CheckCircle2 } from "lucide-react";
import { statusAr, methodAr } from "@/lib/i18n";

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, "المبلغ مطلوب"),
  paymentDate: z.string().min(1, "التاريخ مطلوب"),
  method: z.enum(["cash", "card", "bank_transfer", "cheque"]),
  notes: z.string().optional()
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
  completed: "outline",
};

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const bookingId = parseInt(id, 10);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: booking, isLoading: bookingLoading } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) }
  });

  const { data: payments, isLoading: paymentsLoading } = useListPayments({ bookingId }, {
    query: { enabled: !!bookingId, queryKey: getListPaymentsQueryKey({ bookingId }) }
  });

  const createPayment = useCreatePayment();
  const updateBooking = useUpdateBooking();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      method: "cash",
      notes: ""
    }
  });

  const handleAddPayment = (data: PaymentFormValues) => {
    createPayment.mutate({
      data: { bookingId, amount: data.amount, paymentDate: data.paymentDate, method: data.method, notes: data.notes }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey({ bookingId }) });
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        toast({ title: "تم تسجيل الدفعة بنجاح" });
        setIsPaymentOpen(false);
        form.reset();
      }
    });
  };

  const handleStatusChange = (newStatus: "pending" | "confirmed" | "cancelled" | "completed") => {
    updateBooking.mutate({ id: bookingId, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        toast({ title: `تم تحديث حالة الحجز إلى: ${statusAr(newStatus)}` });
      }
    });
  };

  if (bookingLoading) {
    return <div className="space-y-6 animate-pulse">
      <Skeleton className="h-12 w-1/3" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>;
  }

  if (!booking) return <div className="text-center py-12 text-muted-foreground">الحجز غير موجود</div>;

  const remainingBalance = booking.totalPrice - (booking.paidAmount || 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">حجز رقم #{booking.id}</h1>
            <Badge variant={STATUS_VARIANT[booking.status] || "outline"} data-testid="status-badge">
              {statusAr(booking.status)}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            <Link href={`/clients/${booking.clientId}`} className="hover:underline text-primary">
              {booking.clientName}
            </Link> • {booking.packageName}
          </p>
        </div>

        <div className="flex gap-2">
          {booking.status !== 'confirmed' && booking.status !== 'completed' && booking.status !== 'cancelled' && (
            <Button onClick={() => handleStatusChange('confirmed')} variant="default" data-testid="button-confirm">تأكيد الحجز</Button>
          )}
          {booking.status === 'confirmed' && (
            <Button onClick={() => handleStatusChange('completed')} variant="outline" className="text-chart-3 border-chart-3" data-testid="button-complete">تمييز كمكتمل</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>تفاصيل الرحلة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                <div className="flex gap-3">
                  <div className="bg-primary/10 p-2 rounded-full h-fit text-primary"><Plane className="h-5 w-5" /></div>
                  <div>
                    <div className="text-sm text-muted-foreground">الوجهة</div>
                    <div className="font-medium text-lg">{booking.destinationName}</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="bg-primary/10 p-2 rounded-full h-fit text-primary"><Calendar className="h-5 w-5" /></div>
                  <div>
                    <div className="text-sm text-muted-foreground">تواريخ السفر</div>
                    <div className="font-medium">{format(new Date(booking.travelDate), 'd MMM yyyy', { locale: ar })}</div>
                    {booking.returnDate && (
                      <div className="text-sm text-muted-foreground">العودة: {format(new Date(booking.returnDate), 'd MMM yyyy', { locale: ar })}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="bg-primary/10 p-2 rounded-full h-fit text-primary"><User className="h-5 w-5" /></div>
                  <div>
                    <div className="text-sm text-muted-foreground">المسافرون</div>
                    <div className="font-medium">{booking.numberOfPersons} مسافر</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="bg-primary/10 p-2 rounded-full h-fit text-primary"><FileText className="h-5 w-5" /></div>
                  <div>
                    <div className="text-sm text-muted-foreground">ملاحظات</div>
                    <div className="font-medium text-sm">{booking.notes || "لا يوجد"}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>سجل المدفوعات</CardTitle>
                <CardDescription>جميع الدفعات المسجلة لهذا الحجز</CardDescription>
              </div>
              <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={remainingBalance <= 0} data-testid="button-add-payment">إضافة دفعة</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>تسجيل دفعة</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddPayment)} className="space-y-4">
                      <FormField control={form.control} name="amount" render={({ field }) => (
                        <FormItem>
                          <FormLabel>المبلغ ($)</FormLabel>
                          <FormControl><Input type="number" step="0.01" max={remainingBalance} {...field} data-testid="input-payment-amount" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="paymentDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>التاريخ</FormLabel>
                          <FormControl><Input type="date" {...field} data-testid="input-payment-date" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="method" render={({ field }) => (
                        <FormItem>
                          <FormLabel>طريقة الدفع</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="cash">نقدًا</SelectItem>
                              <SelectItem value="card">بطاقة ائتمان</SelectItem>
                              <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                              <SelectItem value="cheque">شيك</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>ملاحظات / رقم المرجع</FormLabel>
                          <FormControl><Textarea {...field} data-testid="input-payment-notes" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <DialogFooter>
                        <Button type="submit" disabled={createPayment.isPending} data-testid="button-submit-payment">تسجيل الدفعة</Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : payments?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                  لم تُسجَّل أي مدفوعات بعد.
                </div>
              ) : (
                <div className="space-y-3">
                  {payments?.map(payment => (
                    <div key={payment.id} className="flex justify-between items-center p-3 border rounded-md" data-testid={`payment-row-${payment.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/5 p-2 rounded-full"><CreditCard className="h-4 w-4 text-primary" /></div>
                        <div>
                          <div className="font-medium">{payment.amount.toLocaleString()} $</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(payment.paymentDate), 'd MMM yyyy', { locale: ar })} • {methodAr(payment.method)}
                          </div>
                        </div>
                      </div>
                      {payment.notes && <div className="text-sm text-muted-foreground max-w-[200px] truncate">{payment.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-primary-foreground/90">الملخص المالي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b border-primary-foreground/20 pb-2">
                <span className="text-primary-foreground/80">الإجمالي</span>
                <span className="font-semibold text-lg">{booking.totalPrice.toLocaleString()} $</span>
              </div>
              <div className="flex justify-between items-center border-b border-primary-foreground/20 pb-2">
                <span className="text-primary-foreground/80">المدفوع</span>
                <span className="font-semibold">{(booking.paidAmount || 0).toLocaleString()} $</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-medium">المتبقي</span>
                <span className="font-bold text-2xl" data-testid="text-remaining-balance">
                  {remainingBalance.toLocaleString()} $
                </span>
              </div>

              {remainingBalance <= 0 && (
                <div className="mt-4 bg-primary-foreground/20 rounded-md p-3 flex items-center justify-center gap-2 font-medium" data-testid="status-fully-paid">
                  <CheckCircle2 className="h-5 w-5" /> مدفوع بالكامل
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
