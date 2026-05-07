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
import { Calendar, User, CreditCard, Clock, Plane, FileText, CheckCircle2 } from "lucide-react";

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, "Amount is required"),
  paymentDate: z.string().min(1, "Date is required"),
  method: z.enum(["cash", "card", "bank_transfer", "cheque"]),
  notes: z.string().optional()
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

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
      method: "card",
      notes: ""
    }
  });

  const handleAddPayment = (data: PaymentFormValues) => {
    createPayment.mutate({
      data: {
        bookingId,
        amount: data.amount,
        paymentDate: data.paymentDate,
        method: data.method,
        notes: data.notes
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey({ bookingId }) });
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        toast({ title: "Payment recorded successfully" });
        setIsPaymentOpen(false);
        form.reset();
      }
    });
  };

  const handleStatusChange = (newStatus: "pending" | "confirmed" | "cancelled" | "completed") => {
    updateBooking.mutate({
      id: bookingId,
      data: { status: newStatus }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        toast({ title: `Booking marked as ${newStatus}` });
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

  if (!booking) return <div>Booking not found</div>;

  const remainingBalance = booking.totalPrice - (booking.paidAmount || 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Booking #{booking.id}</h1>
            <Badge variant={
              booking.status === 'confirmed' ? 'default' : 
              booking.status === 'pending' ? 'secondary' : 
              booking.status === 'cancelled' ? 'destructive' : 'outline'
            }>
              {booking.status}
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
            <Button onClick={() => handleStatusChange('confirmed')} variant="default">Confirm Booking</Button>
          )}
          {booking.status === 'confirmed' && (
            <Button onClick={() => handleStatusChange('completed')} variant="outline" className="text-chart-3 border-chart-3">Mark Completed</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Trip Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                <div className="flex gap-3">
                  <div className="bg-primary/10 p-2 rounded-full h-fit text-primary"><Plane className="h-5 w-5" /></div>
                  <div>
                    <div className="text-sm text-muted-foreground">Destination</div>
                    <div className="font-medium text-lg">{booking.destinationName}</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="bg-primary/10 p-2 rounded-full h-fit text-primary"><Calendar className="h-5 w-5" /></div>
                  <div>
                    <div className="text-sm text-muted-foreground">Travel Dates</div>
                    <div className="font-medium">{format(new Date(booking.travelDate), 'MMM d, yyyy')}</div>
                    {booking.returnDate && (
                      <div className="text-sm text-muted-foreground">Return: {format(new Date(booking.returnDate), 'MMM d, yyyy')}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="bg-primary/10 p-2 rounded-full h-fit text-primary"><User className="h-5 w-5" /></div>
                  <div>
                    <div className="text-sm text-muted-foreground">Passengers</div>
                    <div className="font-medium">{booking.numberOfPersons} Person(s)</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="bg-primary/10 p-2 rounded-full h-fit text-primary"><FileText className="h-5 w-5" /></div>
                  <div>
                    <div className="text-sm text-muted-foreground">Notes</div>
                    <div className="font-medium text-sm">{booking.notes || "None"}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>All transactions for this booking</CardDescription>
              </div>
              <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={remainingBalance <= 0}>Add Payment</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddPayment)} className="space-y-4">
                      <FormField control={form.control} name="amount" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ($)</FormLabel>
                          <FormControl><Input type="number" step="0.01" max={remainingBalance} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="paymentDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="method" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Credit Card</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes / Ref Number</FormLabel>
                          <FormControl><Textarea {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <DialogFooter>
                        <Button type="submit" disabled={createPayment.isPending}>Record Payment</Button>
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
                  No payments recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {payments?.map(payment => (
                    <div key={payment.id} className="flex justify-between items-center p-3 border rounded-md">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/5 p-2 rounded-full"><CreditCard className="h-4 w-4 text-primary" /></div>
                        <div>
                          <div className="font-medium">${payment.amount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(payment.paymentDate), 'MMM d, yyyy')} • {payment.method.replace('_', ' ')}</div>
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
              <CardTitle className="text-primary-foreground/90">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b border-primary-foreground/20 pb-2">
                <span className="text-primary-foreground/80">Total Amount</span>
                <span className="font-semibold text-lg">${booking.totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-b border-primary-foreground/20 pb-2">
                <span className="text-primary-foreground/80">Amount Paid</span>
                <span className="font-semibold">${(booking.paidAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-medium">Balance Due</span>
                <span className="font-bold text-2xl">
                  ${remainingBalance.toLocaleString()}
                </span>
              </div>
              
              {remainingBalance <= 0 && (
                <div className="mt-4 bg-primary-foreground/20 rounded-md p-3 flex items-center justify-center gap-2 font-medium">
                  <CheckCircle2 className="h-5 w-5" /> Fully Paid
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}