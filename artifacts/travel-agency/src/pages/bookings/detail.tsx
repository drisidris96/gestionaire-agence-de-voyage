import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetBooking, useListPayments, useCreatePayment, useUpdateBooking,
  useListPackages, useListClients,
  getGetBookingQueryKey, getListPaymentsQueryKey, getListBookingsQueryKey,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { Calendar, User, CreditCard, Plane, FileText, CheckCircle2, ArrowRight, Pencil, XCircle, Hotel, Building2, Loader2 } from "lucide-react";
import { statusAr, methodAr } from "@/lib/i18n";

const BOOKING_TYPE_AR: Record<string, { label: string; icon: any }> = {
  hotel:        { label: "حجز فندقي",            icon: Hotel },
  flight:       { label: "حجز طيران",             icon: Plane },
  hotel_flight: { label: "حجز فندق + طيران",     icon: Building2 },
};

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, "المبلغ مطلوب"),
  paymentDate: z.string().min(1, "التاريخ مطلوب"),
  method: z.enum(["cash", "card", "bank_transfer", "cheque"]),
  notes: z.string().optional(),
});

const editSchema = z.object({
  clientId: z.coerce.number().min(1, "العميل مطلوب"),
  packageId: z.coerce.number().min(1, "الباقة مطلوبة"),
  bookingType: z.enum(["hotel", "flight", "hotel_flight"]).default("flight"),
  travelDate: z.string().min(1, "تاريخ السفر مطلوب"),
  returnDate: z.string().optional(),
  numberOfPersons: z.coerce.number().min(1, "يجب أن يكون شخص واحد على الأقل"),
  totalPrice: z.coerce.number().min(0),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;
type EditFormValues = z.infer<typeof editSchema>;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary", confirmed: "default", cancelled: "destructive", completed: "outline",
};

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const bookingId = parseInt(id, 10);
  const [, navigate] = useLocation();

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: booking, isLoading: bookingLoading } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) },
  });
  const { data: payments, isLoading: paymentsLoading } = useListPayments({ bookingId }, {
    query: { enabled: !!bookingId, queryKey: getListPaymentsQueryKey({ bookingId }) },
  });
  const { data: clients } = useListClients();
  const { data: packages } = useListPackages();

  const createPayment = useCreatePayment();
  const updateBooking = useUpdateBooking();

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 0, paymentDate: new Date().toISOString().split("T")[0], method: "cash", notes: "" },
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      clientId: 0, packageId: 0, bookingType: "flight", travelDate: "", returnDate: "",
      numberOfPersons: 1, totalPrice: 0, status: "pending", notes: "",
    },
  });

  const openEdit = () => {
    if (!booking) return;
    editForm.reset({
      clientId: booking.clientId,
      packageId: booking.packageId,
      bookingType: (booking.bookingType as any) ?? "flight",
      travelDate: booking.travelDate.split("T")[0],
      returnDate: booking.returnDate ? booking.returnDate.split("T")[0] : "",
      numberOfPersons: booking.numberOfPersons,
      totalPrice: booking.totalPrice,
      status: booking.status as any,
      notes: booking.notes || "",
    });
    setIsEditOpen(true);
  };

  const onEditSubmit = (data: EditFormValues) => {
    updateBooking.mutate({ id: bookingId, data: data as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        toast({ title: "تم تحديث الحجز بنجاح" });
        setIsEditOpen(false);
      },
    });
  };

  const handleAddPayment = (data: PaymentFormValues) => {
    createPayment.mutate({
      data: { bookingId, amount: data.amount, paymentDate: data.paymentDate, method: data.method, notes: data.notes },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey({ bookingId }) });
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        toast({ title: "تم تسجيل الدفعة بنجاح" });
        setIsPaymentOpen(false);
        paymentForm.reset();
      },
    });
  };

  const handleStatusChange = (newStatus: "confirmed" | "cancelled" | "completed") => {
    updateBooking.mutate({ id: bookingId, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        toast({ title: `تم تحديث حالة الحجز إلى: ${statusAr(newStatus)}` });
        setIsCancelOpen(false);
      },
    });
  };

  if (bookingLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!booking) return <div className="text-center py-12 text-muted-foreground">الحجز غير موجود</div>;

  const remainingBalance = booking.totalPrice - (booking.paidAmount || 0);
  const typeInfo = BOOKING_TYPE_AR[booking.bookingType ?? "flight"] ?? BOOKING_TYPE_AR.flight;
  const TypeIcon = typeInfo.icon;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/bookings" className="hover:text-primary flex items-center gap-1">
              <ArrowRight className="h-3.5 w-3.5" /> الحجوزات
            </Link>
            <span>/</span>
            <span className="text-foreground">حجز #{booking.id}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">حجز رقم #{booking.id}</h1>
            <Badge variant={STATUS_VARIANT[booking.status] ?? "outline"} data-testid="status-badge">
              {statusAr(booking.status)}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground border rounded-full px-2.5 py-0.5">
              <TypeIcon className="h-3.5 w-3.5" />
              {typeInfo.label}
            </div>
          </div>
          <p className="text-muted-foreground mt-1">
            <Link href={`/clients/${booking.clientId}`} className="hover:underline text-primary">{booking.clientName}</Link>
            {" • "}{booking.packageName}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openEdit} data-testid="button-edit-booking">
            <Pencil className="h-4 w-4 ml-2" /> تعديل
          </Button>
          {booking.status !== "confirmed" && booking.status !== "completed" && booking.status !== "cancelled" && (
            <Button onClick={() => handleStatusChange("confirmed")} data-testid="button-confirm">
              <CheckCircle2 className="h-4 w-4 ml-2" /> تأكيد الحجز
            </Button>
          )}
          {booking.status === "confirmed" && (
            <Button variant="outline" onClick={() => handleStatusChange("completed")} className="border-green-500 text-green-600 hover:bg-green-50" data-testid="button-complete">
              <CheckCircle2 className="h-4 w-4 ml-2" /> تمييز كمكتمل
            </Button>
          )}
          {booking.status !== "cancelled" && booking.status !== "completed" && (
            <Button variant="destructive" onClick={() => setIsCancelOpen(true)} data-testid="button-cancel">
              <XCircle className="h-4 w-4 ml-2" /> إلغاء الحجز
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Details */}
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>تفاصيل الرحلة</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                <InfoItem icon={TypeIcon} label="نوع الحجز" value={typeInfo.label} />
                <InfoItem icon={Plane} label="الوجهة" value={booking.destinationName ?? "—"} />
                <InfoItem icon={Calendar} label="تواريخ السفر"
                  value={format(new Date(booking.travelDate), "d MMM yyyy", { locale: ar })}
                  sub={booking.returnDate ? `العودة: ${format(new Date(booking.returnDate), "d MMM yyyy", { locale: ar })}` : undefined}
                />
                <InfoItem icon={User} label="المسافرون" value={`${booking.numberOfPersons} مسافر`} />
                <InfoItem icon={FileText} label="ملاحظات" value={booking.notes || "لا يوجد"} />
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>سجل المدفوعات</CardTitle>
                <CardDescription>جميع الدفعات المسجلة لهذا الحجز</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsPaymentOpen(true)} disabled={remainingBalance <= 0} data-testid="button-add-payment">
                إضافة دفعة
              </Button>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : payments?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">لم تُسجَّل أي مدفوعات بعد.</div>
              ) : (
                <div className="space-y-3">
                  {payments?.map(payment => (
                    <div key={payment.id} className="flex justify-between items-center p-3 border rounded-md" data-testid={`payment-row-${payment.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/5 p-2 rounded-full"><CreditCard className="h-4 w-4 text-primary" /></div>
                        <div>
                          <div className="font-medium">{payment.amount.toLocaleString()} $</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(payment.paymentDate), "d MMM yyyy", { locale: ar })} • {methodAr(payment.method)}
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

        {/* Financial Summary */}
        <div>
          <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardHeader><CardTitle className="text-primary-foreground/90">الملخص المالي</CardTitle></CardHeader>
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
                <span className="font-bold text-2xl" data-testid="text-remaining-balance">{remainingBalance.toLocaleString()} $</span>
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) setIsEditOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>تعديل الحجز #{booking.id}</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="clientId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>العميل *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger></FormControl>
                      <SelectContent>{clients?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.fullName}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={editForm.control} name="packageId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الباقة *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر الباقة" /></SelectTrigger></FormControl>
                      <SelectContent>{packages?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={editForm.control} name="bookingType" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>نوع الحجز *</FormLabel>
                    <div className="grid grid-cols-3 gap-3">
                      {(["hotel", "flight", "hotel_flight"] as const).map((type) => {
                        const info = BOOKING_TYPE_AR[type];
                        const Icon = info.icon;
                        const active = field.value === type;
                        return (
                          <button key={type} type="button" onClick={() => field.onChange(type)}
                            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all cursor-pointer ${active ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}>
                            <Icon className="h-5 w-5" />{info.label}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={editForm.control} name="travelDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ السفر *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={editForm.control} name="returnDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ العودة</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={editForm.control} name="numberOfPersons" render={({ field }) => (
                  <FormItem>
                    <FormLabel>عدد المسافرين *</FormLabel>
                    <FormControl><Input type="number" min="1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={editForm.control} name="totalPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>السعر الإجمالي ($) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={editForm.control} name="status" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>الحالة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="pending">معلق</SelectItem>
                        <SelectItem value="confirmed">مؤكد</SelectItem>
                        <SelectItem value="completed">مكتمل</SelectItem>
                        <SelectItem value="cancelled">ملغى</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={editForm.control} name="notes" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>ملاحظات</FormLabel>
                    <FormControl><Textarea {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={updateBooking.isPending}>
                  {updateBooking.isPending ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جارٍ الحفظ...</> : "حفظ التغييرات"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تسجيل دفعة</DialogTitle></DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handleAddPayment)} className="space-y-4">
              <FormField control={paymentForm.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ ($)</FormLabel>
                  <FormControl><Input type="number" step="0.01" max={remainingBalance} {...field} data-testid="input-payment-amount" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={paymentForm.control} name="paymentDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>التاريخ</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-payment-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={paymentForm.control} name="method" render={({ field }) => (
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
              <FormField control={paymentForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات / رقم المرجع</FormLabel>
                  <FormControl><Textarea {...field} data-testid="input-payment-notes" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={createPayment.isPending} data-testid="button-submit-payment">تسجيل الدفعة</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إلغاء الحجز</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء حجز #{booking.id} للعميل <strong>{booking.clientName}</strong>؟ يمكن تأكيده مستقبلاً إن لزم.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusChange("cancelled")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {updateBooking.isPending ? "جارٍ الإلغاء..." : "نعم، ألغِ الحجز"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="flex gap-3">
      <div className="bg-primary/10 p-2 rounded-full h-fit text-primary"><Icon className="h-5 w-5" /></div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="font-medium text-lg">{value}</div>
        {sub && <div className="text-sm text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
