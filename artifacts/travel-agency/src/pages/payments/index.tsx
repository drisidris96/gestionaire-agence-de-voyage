import { useState } from "react";
import { Link } from "wouter";
import { useListPayments } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CreditCard, Search, Download, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { downloadCSV } from "@/lib/export-csv";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { methodAr } from "@/lib/i18n";

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const { data: payments, isLoading } = useListPayments();

  const filteredPayments = payments?.filter(p =>
    !search ||
    p.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    p.bookingId.toString().includes(search)
  );

  const totalCollected = filteredPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const totalBookingAmount = payments
    ? [...new Map(payments.map(p => [p.bookingId, p])).values()]
        .reduce((sum, p) => sum + (p.totalPrice ?? 0), 0)
    : 0;
  const totalRemaining = payments
    ? [...new Map(payments.map(p => [p.bookingId, p])).values()]
        .reduce((sum, p) => sum + (p.remainingAmount ?? 0), 0)
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">المدفوعات</h1>
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
              ["#", "التاريخ", "العميل", "رقم الحجز", "المبلغ المدفوع", "الإجمالي", "المتبقي", "طريقة الدفع", "ملاحظات"],
              (filteredPayments ?? []).map(p => [p.id, p.paymentDate, p.clientName ?? "", p.bookingId, p.amount, p.totalPrice ?? 0, p.remainingAmount ?? 0, p.method, p.notes ?? ""])
            );
          }} className="gap-1.5 shrink-0"><Download className="h-4 w-4" /> CSV</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الحجوزات</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {isLoading ? "..." : totalBookingAmount.toLocaleString()} $
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المدفوع</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {isLoading ? "..." : totalCollected.toLocaleString()} $
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المتبقي</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {isLoading ? "..." : totalRemaining.toLocaleString()} $
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-md bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>رقم الحجز</TableHead>
              <TableHead>المبلغ المدفوع</TableHead>
              <TableHead>إجمالي الحجز</TableHead>
              <TableHead>المدفوع للحجز</TableHead>
              <TableHead>المتبقي</TableHead>
              <TableHead>طريقة الدفع</TableHead>
              <TableHead>ملاحظات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(6).fill(0).map((_, i) => (
                <TableRow key={i}>
                  {Array(9).fill(0).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredPayments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  لا توجد مدفوعات.
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments?.map((payment) => {
                const remaining = payment.remainingAmount ?? 0;
                return (
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
                    <TableCell className="font-semibold text-green-600" data-testid={`text-amount-${payment.id}`}>
                      {payment.amount.toLocaleString()} $
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {(payment.totalPrice ?? 0).toLocaleString()} $
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      {(payment.paidAmount ?? 0).toLocaleString()} $
                    </TableCell>
                    <TableCell className={`font-semibold ${remaining > 0 ? "text-amber-600" : "text-green-600"}`}>
                      {remaining.toLocaleString()} $
                      {remaining === 0 && <span className="mr-1 text-xs">✓</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {methodAr(payment.method)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                      {payment.notes || "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
