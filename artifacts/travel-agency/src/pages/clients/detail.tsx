import { useParams } from "wouter";
import { useGetClient, useListBookings } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Phone, Mail, MapPin, Globe, Calendar } from "lucide-react";
import { Link } from "wouter";
import { statusAr } from "@/lib/i18n";

const STATUS_VARIANT: Record<string, string> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
  completed: "outline",
};

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id, 10);

  const { data: client, isLoading: clientLoading } = useGetClient(clientId, {
    query: { enabled: !!clientId }
  });

  const { data: bookings, isLoading: bookingsLoading } = useListBookings({ clientId }, {
    query: { enabled: !!clientId }
  });

  if (clientLoading) {
    return <div className="space-y-6"><Skeleton className="h-32 w-full" /></div>;
  }

  if (!client) {
    return <div className="text-center py-12 text-muted-foreground">العميل غير موجود</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.fullName}</h1>
          <p className="text-muted-foreground mt-1">تفاصيل العميل وسجل حجوزاته</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-sm border-none">
          <CardHeader>
            <CardTitle>البيانات الشخصية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 p-2 rounded-full text-primary"><User className="h-4 w-4" /></div>
              <div>
                <div className="font-medium">جواز السفر</div>
                <div className="text-muted-foreground">{client.passportNumber || 'غير محدد'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 p-2 rounded-full text-primary"><Globe className="h-4 w-4" /></div>
              <div>
                <div className="font-medium">الجنسية</div>
                <div className="text-muted-foreground">{client.nationality || 'غير محدد'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 p-2 rounded-full text-primary"><Phone className="h-4 w-4" /></div>
              <div>
                <div className="font-medium">رقم الهاتف</div>
                <div className="text-muted-foreground">{client.phone || 'غير محدد'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 p-2 rounded-full text-primary"><Mail className="h-4 w-4" /></div>
              <div>
                <div className="font-medium">البريد الإلكتروني</div>
                <div className="text-muted-foreground">{client.email || 'غير محدد'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 p-2 rounded-full text-primary"><MapPin className="h-4 w-4" /></div>
              <div>
                <div className="font-medium">العنوان</div>
                <div className="text-muted-foreground">{client.address || 'غير محدد'}</div>
              </div>
            </div>
            {client.notes && (
              <div className="pt-4 border-t mt-4">
                <div className="font-medium text-sm mb-1">ملاحظات</div>
                <p className="text-sm text-muted-foreground">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

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
                  <div key={booking.id} className="flex flex-col sm:flex-row justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors bg-card" data-testid={`booking-row-${booking.id}`}>
                    <div className="space-y-1">
                      <Link href={`/bookings/${booking.id}`} className="font-semibold text-lg hover:underline text-primary">
                        {booking.destinationName} - {booking.packageName}
                      </Link>
                      <div className="flex items-center text-sm text-muted-foreground gap-4">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(booking.travelDate), 'd MMM yyyy', { locale: ar })}</span>
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {booking.numberOfPersons} مسافر</span>
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0 text-right flex flex-col sm:items-start justify-center">
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
    </div>
  );
}
