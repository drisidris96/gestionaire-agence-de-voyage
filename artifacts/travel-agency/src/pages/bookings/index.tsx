import { useState } from "react";
import { Link } from "wouter";
import {
  useListBookings, useCreateBooking, useUpdateBooking, useDeleteBooking, getListBookingsQueryKey,
  useListClients, useListPackages
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Plus, MoreHorizontal, Pencil, Trash2, FileText, Filter, CheckCircle, XCircle, Hotel, Plane, Building2, Loader2, Download, Printer } from "lucide-react";
import { downloadCSV } from "@/lib/export-csv";
import { InvoiceModal } from "@/components/InvoiceModal";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { statusAr } from "@/lib/i18n";

const BOOKING_TYPE_AR: Record<string, { label: string; icon: any }> = {
  hotel:        { label: "فندقي",          icon: Hotel },
  flight:       { label: "طيران",           icon: Plane },
  hotel_flight: { label: "فندق + طيران",   icon: Building2 },
};

const bookingSchema = z.object({
  clientId: z.coerce.number().min(1, "العميل مطلوب"),
  packageId: z.coerce.number().min(1, "الباقة مطلوبة"),
  bookingType: z.enum(["hotel", "flight", "hotel_flight"]).default("flight"),
  travelDate: z.string().min(1, "تاريخ السفر مطلوب"),
  returnDate: z.string().optional(),
  numberOfPersons: z.coerce.number().min(1, "يجب أن يكون شخص واحد على الأقل"),
  totalPrice: z.coerce.number().min(0, "السعر الإجمالي يجب أن يكون صحيحًا"),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
  completed: "outline",
};

export default function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: bookings, isLoading } = useListBookings(
    statusFilter !== "all" ? { status: statusFilter } : {}
  );
  const { data: clients } = useListClients();
  const { data: packages } = useListPackages();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [invoiceBooking, setInvoiceBooking] = useState<any>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      clientId: 0, packageId: 0, bookingType: "flight", travelDate: "", returnDate: "",
      numberOfPersons: 1, totalPrice: 0, status: "pending", notes: "",
    },
  });

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBooking(null);
    form.reset();
  };

  const openEdit = (booking: any) => {
    setEditingBooking(booking);
    form.reset({
      clientId: booking.clientId,
      packageId: booking.packageId,
      bookingType: booking.bookingType ?? "flight",
      travelDate: booking.travelDate.split("T")[0],
      returnDate: booking.returnDate ? booking.returnDate.split("T")[0] : "",
      numberOfPersons: booking.numberOfPersons,
      totalPrice: booking.totalPrice,
      status: booking.status,
      notes: booking.notes || "",
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: BookingFormValues) => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
    if (editingBooking) {
      updateBooking.mutate({ id: editingBooking.id, data: data as any }, {
        onSuccess: () => { invalidate(); toast({ title: "تم تحديث الحجز بنجاح" }); closeForm(); },
      });
    } else {
      createBooking.mutate({ data: data as any }, {
        onSuccess: () => { invalidate(); toast({ title: "تم إنشاء الحجز بنجاح" }); closeForm(); },
      });
    }
  };

  const quickStatus = (id: number, status: "confirmed" | "cancelled") => {
    updateBooking.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        toast({ title: status === "confirmed" ? "تم تأكيد الحجز" : "تم إلغاء الحجز" });
      },
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteBooking.mutate({ id: deleteTarget.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        toast({ title: "تم حذف الحجز" });
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">الحجوزات</h1>
          <p className="text-muted-foreground mt-1">إدارة جميع حجوزات رحلات العملاء.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 ml-2" /><SelectValue placeholder="تصفية الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="pending">معلق</SelectItem>
              <SelectItem value="confirmed">مؤكد</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="cancelled">ملغى</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => {
            const filtered2 = filteredBookings ?? [];
            downloadCSV("bookings.csv",
              ["#", "العميل", "الباقة", "تاريخ السفر", "تاريخ العودة", "الإجمالي", "الحالة"],
              filtered2.map(b => [b.id, b.clientName, b.packageName, b.departureDate ?? "", b.returnDate ?? "", b.totalPrice, b.status])
            );
          }} className="gap-1.5"><Download className="h-4 w-4" /> تصدير CSV</Button>
          <Button onClick={() => setIsFormOpen(true)} data-testid="button-add-booking">
            <Plus className="ml-2 h-4 w-4" /> إضافة حجز
          </Button>
        </div>
      </div>

      <div className="border rounded-md bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>الباقة</TableHead>
              <TableHead>نوع الحجز</TableHead>
              <TableHead>تاريخ السفر</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  {Array(8).fill(0).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : bookings?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا توجد حجوزات.</TableCell>
              </TableRow>
            ) : (
              bookings?.map((booking) => {
                const typeInfo = BOOKING_TYPE_AR[booking.bookingType ?? "flight"] ?? BOOKING_TYPE_AR.flight;
                const TypeIcon = typeInfo.icon;
                return (
                  <TableRow key={booking.id} className="group" data-testid={`row-booking-${booking.id}`}>
                    <TableCell className="font-mono text-sm text-muted-foreground">#{booking.id}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/clients/${booking.clientId}`} className="hover:underline text-primary">{booking.clientName}</Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium line-clamp-1">{booking.packageName}</div>
                      <div className="text-xs text-muted-foreground">{booking.numberOfPersons} مسافر</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <TypeIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>{typeInfo.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(booking.travelDate), "d MMM yyyy", { locale: ar })}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {booking.totalPrice.toLocaleString()} $
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[booking.status] ?? "outline"} data-testid={`status-booking-${booking.id}`}>
                        {statusAr(booking.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`menu-booking-${booking.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/bookings/${booking.id}`} className="cursor-pointer flex items-center">
                              <FileText className="ml-2 h-4 w-4" /> تفاصيل الحجز
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setInvoiceBooking(booking)} className="cursor-pointer">
                            <Printer className="ml-2 h-4 w-4" /> طباعة الفاتورة
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(booking)} className="cursor-pointer">
                            <Pencil className="ml-2 h-4 w-4" /> تعديل
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {booking.status !== "confirmed" && booking.status !== "completed" && booking.status !== "cancelled" && (
                            <DropdownMenuItem onClick={() => quickStatus(booking.id, "confirmed")} className="cursor-pointer text-green-600 focus:text-green-600">
                              <CheckCircle className="ml-2 h-4 w-4" /> تأكيد الحجز
                            </DropdownMenuItem>
                          )}
                          {booking.status !== "cancelled" && booking.status !== "completed" && (
                            <DropdownMenuItem onClick={() => quickStatus(booking.id, "cancelled")} className="cursor-pointer text-amber-600 focus:text-amber-600">
                              <XCircle className="ml-2 h-4 w-4" /> إلغاء الحجز
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteTarget(booking)} className="text-destructive focus:text-destructive cursor-pointer">
                            <Trash2 className="ml-2 h-4 w-4" /> حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingBooking ? "تعديل الحجز" : "إضافة حجز جديد"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="clientId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>العميل *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : undefined}>
                      <FormControl><SelectTrigger data-testid="select-client"><SelectValue placeholder="اختر العميل" /></SelectTrigger></FormControl>
                      <SelectContent>{clients?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.fullName}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="packageId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الباقة *</FormLabel>
                    <Select onValueChange={(val) => {
                      field.onChange(val);
                      const pkg = packages?.find(p => p.id.toString() === val);
                      if (pkg) form.setValue("totalPrice", pkg.pricePerPerson * (form.getValues("numberOfPersons") || 1));
                    }} value={field.value ? field.value.toString() : undefined}>
                      <FormControl><SelectTrigger data-testid="select-package"><SelectValue placeholder="اختر الباقة" /></SelectTrigger></FormControl>
                      <SelectContent>{packages?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} - {p.pricePerPerson}$/مسافر</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Booking Type — full width */}
                <FormField control={form.control} name="bookingType" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>نوع الحجز *</FormLabel>
                    <div className="grid grid-cols-3 gap-3">
                      {(["hotel", "flight", "hotel_flight"] as const).map((type) => {
                        const info = BOOKING_TYPE_AR[type];
                        const Icon = info.icon;
                        const active = field.value === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => field.onChange(type)}
                            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all cursor-pointer ${active ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
                          >
                            <Icon className="h-5 w-5" />
                            {info.label}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="travelDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ السفر *</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="input-travel-date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="returnDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ العودة</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value || ""} data-testid="input-return-date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="numberOfPersons" render={({ field }) => (
                  <FormItem>
                    <FormLabel>عدد المسافرين *</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} data-testid="input-persons"
                        onChange={(e) => {
                          field.onChange(e);
                          const pkg = packages?.find(p => p.id === form.getValues("packageId"));
                          if (pkg) form.setValue("totalPrice", pkg.pricePerPerson * parseInt(e.target.value || "0", 10));
                        }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="totalPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>السعر الإجمالي ($) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} data-testid="input-total-price" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>الحالة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger></FormControl>
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

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>ملاحظات</FormLabel>
                    <FormControl><Textarea {...field} data-testid="input-booking-notes" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>إلغاء</Button>
                <Button type="submit" disabled={createBooking.isPending || updateBooking.isPending} data-testid="button-submit-booking">
                  {(createBooking.isPending || updateBooking.isPending) ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جارٍ الحفظ...</> : editingBooking ? "حفظ التغييرات" : "إنشاء الحجز"}
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
            <AlertDialogTitle>تأكيد حذف الحجز</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الحجز <strong>#{deleteTarget?.id}</strong> للعميل <strong>{deleteTarget?.clientName}</strong>؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteBooking.isPending ? "جارٍ الحذف..." : "نعم، احذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InvoiceModal
        booking={invoiceBooking}
        open={!!invoiceBooking}
        onClose={() => setInvoiceBooking(null)}
      />
    </div>
  );
}
