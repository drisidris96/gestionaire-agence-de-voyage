import { useState } from "react";
import { Link } from "wouter";
import { useListPayments, getListPaymentsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { CreditCard, Filter, Search } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const { data: payments, isLoading } = useListPayments();

  // Basic client-side filtering since API doesn't support search natively on payments
  const filteredPayments = payments?.filter(p => 
    !search || 
    p.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    p.bookingId.toString().includes(search)
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments (المدفوعات)</h1>
          <p className="text-muted-foreground mt-1">View all financial transactions.</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by client or booking ID..." 
            className="pl-8" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Booking Ref</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(6).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : filteredPayments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  No payments found.
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments?.map((payment) => (
                <TableRow key={payment.id} className="group">
                  <TableCell>
                    {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payment.clientName}
                  </TableCell>
                  <TableCell>
                    <Link href={`/bookings/${payment.bookingId}`} className="font-mono text-sm text-primary hover:underline">
                      #{payment.bookingId}
                    </Link>
                  </TableCell>
                  <TableCell className="font-semibold text-chart-2">
                    ${payment.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {payment.method.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {payment.notes || "-"}
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