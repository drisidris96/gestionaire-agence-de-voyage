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
import { Plus, MoreHorizontal, Pencil, Trash, FileText, Filter } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { statusAr } from "@/lib/i18n";

const bookingSchema = z.object({
  clientId: z.coerce.number().min(1, "العميل مطلوب"),
  packageId: z.coerce.number().min(1, "الباقة مطلوبة"),
  travelDate: z.string().min(1, "تاريخ السفر مطلوب"),
  returnDate: z.string().optional(),
  numberOfPersons: z.coerce.number().min(1, "يجب أن يكون شخص واحد على الأقل"),
  totalPrice: z.coerce.number().min(0, "السعر الإجمالي يجب أن يكون صحيحًا"),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

const STATUS_VARIANT: Record<string, string> = {
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

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      clientId: 0, packageId: 0, travelDate: "", returnDate: "",
      numberOfPersons: 1, totalPrice: 0, status: "pending", notes: "",
    }
  });

  const onSubmit = (data: BookingFormValues) => {
    if (editingBooking) {
      updateBooking.mutate({ id: editingBooking.id, data: data as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
          toast({ title: "تم تحديث الحجز بنجاح" });
          setIsAddOpen(false);
          setEditingBooking(null);
        }
      });
    } else {
      createBooking.mutate({ data: data as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
          toast({ title: "تم إنشاء الحجز بنجاح" });
          setIsAddOpen(false);
          form.reset();
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا الحجز؟")) {
      deleteBooking.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
          toast({ title: "تم حذف الحجز" });
        }
      });
    }
  };

  const openEdit = (booking: any) => {
    setEditingBooking(booking);
    form.reset({
      clientId: booking.clientId,
      packageId: booking.packageId,
      travelDate: booking.travelDate.split('T')[0],
      returnDate: booking.returnDate ? booking.returnDate.split('T')[0] : "",
      numberOfPersons: booking.numberOfPersons,
      totalPrice: booking.totalPrice,
      status: booking.status,
      notes: booking.notes || "",
    });
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الحجوزات</h1>
          <p className="text-muted-foreground mt-1">إدارة جميع حجوزات رحلات العملاء.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-52">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder="تصفية الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="confirmed">مؤكد</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="cancelled">ملغى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) { setEditingBooking(null); form.reset(); }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-booking"><Plus className="ml-2 h-4 w-4" /> إضافة حجز</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingBooking ? "تعديل الحجز" : "إضافة حجز جديد"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="clientId" render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-1">
                        <FormLabel>العميل *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-client"><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients?.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.fullName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="packageId" render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-1">
                        <FormLabel>الباقة *</FormLabel>
                        <Select onValueChange={(val) => {
                          field.onChange(val);
                          const pkg = packages?.find(p => p.id.toString() === val);
                          if (pkg) {
                            form.setValue("totalPrice", pkg.pricePerPerson * (form.getValues("numberOfPersons") || 1));
                          }
                        }} value={field.value ? field.value.toString() : undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-package"><SelectValue placeholder="اختر الباقة" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {packages?.map(p => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.name} - {p.pricePerPerson}$/مسافر</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <FormControl><Input type="date" {...field} value={field.value || ''} data-testid="input-return-date" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="numberOfPersons" render={({ field }) => (
                      <FormItem>
                        <FormLabel>عدد المسافرين *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            data-testid="input-persons"
                            onChange={(e) => {
                              field.onChange(e);
                              const pkg = packages?.find(p => p.id === form.getValues("packageId"));
                              if (pkg) {
                                form.setValue("totalPrice", pkg.pricePerPerson * parseInt(e.target.value || "0", 10));
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="totalPrice" render={({ field }) => (
                      <FormItem>
                        <FormLabel>السعر الإجمالي ($) *</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} data-testid="input-total-price" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>الحالة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status"><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
                          </FormControl>
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
                    <Button type="submit" disabled={createBooking.isPending || updateBooking.isPending} data-testid="button-submit-booking">
                      {editingBooking ? "حفظ التغييرات" : "إنشاء الحجز"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-md bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الحجز</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>الباقة</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : bookings?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  لا توجد حجوزات.
                </TableCell>
              </TableRow>
            ) : (
              bookings?.map((booking) => (
                <TableRow key={booking.id} className="group" data-testid={`row-booking-${booking.id}`}>
                  <TableCell className="font-mono text-sm text-muted-foreground">#{booking.id}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/clients/${booking.clientId}`} className="hover:underline text-primary">
                      {booking.clientName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium line-clamp-1">{booking.packageName}</div>
                    <div className="text-xs text-muted-foreground">{booking.numberOfPersons} مسافر</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{format(new Date(booking.travelDate), 'd MMM yyyy', { locale: ar })}</div>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    {booking.totalPrice.toLocaleString()} $
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[booking.status] as any || "outline"} data-testid={`status-booking-${booking.id}`}>
                      {statusAr(booking.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" data-testid={`menu-booking-${booking.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem asChild>
                          <Link href={`/bookings/${booking.id}`} className="cursor-pointer flex items-center">
                            <FileText className="ml-2 h-4 w-4" /> إدارة الحجز
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(booking)} className="cursor-pointer">
                          <Pencil className="ml-2 h-4 w-4" /> تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(booking.id)} className="text-destructive focus:text-destructive cursor-pointer">
                          <Trash className="ml-2 h-4 w-4" /> حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
