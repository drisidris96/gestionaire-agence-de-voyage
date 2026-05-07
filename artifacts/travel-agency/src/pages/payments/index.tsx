import { useState } from "react";
import { Link } from "wouter";
import { useListPayments } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CreditCard, Search, Download } from "lucide-react";
import { downloadCSV } from "@/lib/export-csv";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { methodAr } from "@/lib/i18n";

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const { data: payments, isLoading } = useListPayments();

  const filteredPayments = payments?.filter(p =>
    !search ||
    p.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    p.bookingId.toString().includes(search)
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المدفوعات</h1>
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
              ["#", "التاريخ", "العميل", "رقم الحجز", "المبلغ", "طريقة الدفع", "ملاحظات"],
              (filteredPayments ?? []).map(p => [p.id, p.date, p.clientName ?? "", p.bookingId, p.amount, p.method, p.notes ?? ""])
            );
          }} className="gap-1.5 shrink-0"><Download className="h-4 w-4" /> CSV</Button>
        </div>
      </div>

      <div className="border rounded-md bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>رقم الحجز</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>طريقة الدفع</TableHead>
              <TableHead>ملاحظات</TableHead>
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
                  لا توجد مدفوعات.
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments?.map((payment) => (
                <TableRow key={payment.id} className="group" data-testid={`row-payment-${payment.id}`}>
                  <TableCell>
                    {format(new Date(payment.paymentDate), 'd MMM yyyy', { locale: ar })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payment.clientName}
                  </TableCell>
                  <TableCell>
                    <Link href={`/bookings/${payment.bookingId}`} className="font-mono text-sm text-primary hover:underline">
                      #{payment.bookingId}
                    </Link>
                  </TableCell>
                  <TableCell className="font-semibold text-chart-2" data-testid={`text-amount-${payment.id}`}>
                    {payment.amount.toLocaleString()} $
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {methodAr(payment.method)}
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
