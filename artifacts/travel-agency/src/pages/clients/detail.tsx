import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetClient, useListBookings, useUpdateClient, useDeleteClient,
  getListClientsQueryKey, getGetClientQueryKey, getListBookingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { User, Phone, Mail, MapPin, Globe, Calendar, Pencil, Trash2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { statusAr } from "@/lib/i18n";

const STATUS_VARIANT: Record<string, string> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
  completed: "outline",
};

const clientSchema = z.object({
  fullName: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(5, "رقم الهاتف مطلوب"),
  email: z.string().email("البريد الإلكتروني غير صحيح").or(z.literal("")),
  address: z.string().optional(),
  passportNumber: z.string().optional(),
  nationality: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id, 10);
  const [, navigate] = useLocation();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const { data: client, isLoading: clientLoading } = useGetClient(clientId, {
    query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId) }
  });

  const { data: bookings, isLoading: bookingsLoading } = useListBookings({ clientId }, {
    query: { enabled: !!clientId, queryKey: getListBookingsQueryKey({ clientId }) }
  });

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      fullName: "", phone: "", email: "", address: "",
      passportNumber: "", nationality: "", notes: "",
    }
  });

  const openEdit = () => {
    if (!client) return;
    form.reset({
      fullName: client.fullName,
      phone: client.phone,
      email: client.email || "",
      address: client.address || "",
      passportNumber: client.passportNumber || "",
      nationality: client.nationality || "",
      notes: client.notes || "",
    });
    setIsEditOpen(true);
  };

  const onSubmit = (data: ClientFormValues) => {
    updateClient.mutate({ id: clientId, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["getClient", clientId] });
        toast({ title: "تم تحديث بيانات العميل بنجاح" });
        setIsEditOpen(false);
      }
    });
  };

  const handleDelete = () => {
    deleteClient.mutate({ id: clientId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        toast({ title: "تم حذف العميل بنجاح" });
        navigate("/clients");
      }
    });
  };

  if (clientLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!client) {
    return <div className="text-center py-12 text-muted-foreground">العميل غير موجود</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/clients" className="hover:text-primary flex items-center gap-1">
              <ArrowRight className="h-3.5 w-3.5" />
              العملاء
            </Link>
            <span>/</span>
            <span className="text-foreground">{client.fullName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{client.fullName}</h1>
          <p className="text-muted-foreground mt-1">تفاصيل العميل وسجل حجوزاته</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Button */}
          <Button variant="outline" onClick={openEdit} data-testid="button-edit-client">
            <Pencil className="h-4 w-4 ml-2" />
            تعديل البيانات
          </Button>

          {/* Delete Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-delete-client">
                <Trash2 className="h-4 w-4 ml-2" />
                حذف العميل
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد حذف العميل</AlertDialogTitle>
                <AlertDialogDescription>
                  هل أنت متأكد من حذف العميل <strong>{client.fullName}</strong>؟
                  لا يمكن التراجع عن هذه العملية وستُحذف جميع بيانات العميل نهائيًا.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  {deleteClient.isPending ? "جارٍ الحذف..." : "نعم، احذف العميل"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-1 shadow-sm border-none">
          <CardHeader>
            <CardTitle>البيانات الشخصية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={User} label="جواز السفر" value={client.passportNumber} />
            <InfoRow icon={Globe} label="الجنسية" value={client.nationality} />
            <InfoRow icon={Phone} label="رقم الهاتف" value={client.phone} />
            <InfoRow icon={Mail} label="البريد الإلكتروني" value={client.email} />
            <InfoRow icon={MapPin} label="العنوان" value={client.address} />
            {client.notes && (
              <div className="pt-4 border-t mt-4">
                <div className="font-medium text-sm mb-1">ملاحظات</div>
                <p className="text-sm text-muted-foreground">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bookings Card */}
        <Card className="md:col-span-2 shadow-sm border-none">
          <CardHeader>
            <CardTitle>سجل الحجوزات</CardTitle>
            <CardDescription>الرحلات السابقة والقادمة لهذا العميل.</CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : bookings?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>لا توجد حجوزات لهذا العميل.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings?.map(booking => (
                  <div
                    key={booking.id}
                    className="flex flex-col sm:flex-row justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors bg-card"
                    data-testid={`booking-row-${booking.id}`}
                  >
                    <div className="space-y-1">
                      <Link href={`/bookings/${booking.id}`} className="font-semibold text-lg hover:underline text-primary">
                        {booking.destinationName} - {booking.packageName}
                      </Link>
                      <div className="flex items-center text-sm text-muted-foreground gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {booking.travelDate ? format(new Date(booking.travelDate), 'd MMMM yyyy', { locale: ar }) : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {booking.numberOfPersons} مسافر
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0 flex flex-col sm:items-start justify-center">
                      <div className="font-bold text-lg">{booking.totalPrice.toLocaleString()} $</div>
                      <Badge variant={STATUS_VARIANT[booking.status] as any} className="mt-1">
                        {statusAr(booking.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) form.reset(); }}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات العميل</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>الاسم الكامل *</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-fullname" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف *</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl><Input {...field} type="email" data-testid="input-edit-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="nationality" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الجنسية</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-nationality" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="passportNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم جواز السفر</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-passport" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>العنوان</FormLabel>
                    <FormControl><Input {...field} data-testid="input-edit-address" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>ملاحظات</FormLabel>
                    <FormControl><Textarea {...field} data-testid="input-edit-notes" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={updateClient.isPending} data-testid="button-save-client">
                  {updateClient.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="bg-primary/10 p-2 rounded-full text-primary shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-muted-foreground">{value || 'غير محدد'}</div>
      </div>
    </div>
  );
}
