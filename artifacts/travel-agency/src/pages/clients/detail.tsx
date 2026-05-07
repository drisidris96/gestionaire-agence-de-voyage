import { useParams } from "wouter";
import { useGetClient, useListBookings } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Phone, Mail, MapPin, Globe, CreditCard, Calendar } from "lucide-react";
import { Link } from "wouter";

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
    return <div>Client not found</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.fullName}</h1>
          <p className="text-muted-foreground mt-1">Client Details & History</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-sm border-none">
          <CardHeader>
            <CardTitle>Profile Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 p-2 rounded-full text-primary"><User className="h-4 w-4" /></div>
              <div>
                <div className="font-medium">Passport</div>
                <div className="text-muted-foreground">{client.passportNumber || 'N/A'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 p-2 rounded-full text-primary"><Globe className="h-4 w-4" /></div>
              <div>
                <div className="font-medium">Nationality</div>
                <div className="text-muted-foreground">{client.nationality || 'N/A'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 p-2 rounded-full text-primary"><Phone className="h-4 w-4" /></div>
              <div>
                <div className="font-medium">Phone</div>
                <div className="text-muted-foreground">{client.phone || 'N/A'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 p-2 rounded-full text-primary"><Mail className="h-4 w-4" /></div>
              <div>
                <div className="font-medium">Email</div>
                <div className="text-muted-foreground">{client.email || 'N/A'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 p-2 rounded-full text-primary"><MapPin className="h-4 w-4" /></div>
              <div>
                <div className="font-medium">Address</div>
                <div className="text-muted-foreground">{client.address || 'N/A'}</div>
              </div>
            </div>
            {client.notes && (
              <div className="pt-4 border-t mt-4">
                <div className="font-medium text-sm mb-1">Notes</div>
                <p className="text-sm text-muted-foreground">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-sm border-none">
          <CardHeader>
            <CardTitle>Booking History</CardTitle>
            <CardDescription>Past and upcoming trips for this client.</CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : bookings?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No bookings found for this client.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings?.map(booking => (
                  <div key={booking.id} className="flex flex-col sm:flex-row justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors bg-card">
                    <div className="space-y-1">
                      <Link href={`/bookings/${booking.id}`} className="font-semibold text-lg hover:underline text-primary">
                        {booking.destinationName} - {booking.packageName}
                      </Link>
                      <div className="flex items-center text-sm text-muted-foreground gap-4">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(booking.travelDate), 'MMM d, yyyy')}</span>
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {booking.numberOfPersons} pax</span>
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0 text-left sm:text-right flex flex-col sm:items-end justify-center">
                      <div className="font-bold text-lg">${booking.totalPrice.toLocaleString()}</div>
                      <Badge variant={booking.status === 'confirmed' ? 'default' : booking.status === 'pending' ? 'secondary' : 'outline'} className="mt-1">
                        {booking.status}
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