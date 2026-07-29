import { useQuery } from "@tanstack/react-query";
import { TrendingUp, PiggyBank, DollarSign, Download, Search } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/export-csv";

interface InvestmentRow {
  bookingId: number;
  clientName: string;
  totalPrice: number;
  serviceCost: number;
  profit: number;
  investment: number;
  createdAt: string;
}

function useInvestments() {
  return useQuery<InvestmentRow[]>({
    queryKey: ["investments"],
    queryFn: () => fetch(`${import.meta.env.BASE_URL}api/investments`.replace(/\/+/, "/")).then(r => r.json()),
  });
}

export default function InvestmentsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useInvestments();

  const filtered = data?.filter(r =>
    !search || r.clientName.toLowerCase().includes(search.toLowerCase()) || r.bookingId.toString().includes(search)
  );

  const totalProfit     = filtered?.reduce((s, r) => s + r.profit, 0) ?? 0;
  const totalInvestment = filtered?.reduce((s, r) => s + r.investment, 0) ?? 0;
  const totalRevenue    = filtered?.reduce((s, r) => s + r.totalPrice, 0) ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">الاستثمار</h1>
          <p className="text-muted-foreground mt-1">10% من صافي الربح لكل حجز.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث باسم العميل أو رقم الحجز..."
              className="pr-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            downloadCSV("investments.csv",
              ["رقم الحجز", "العميل", "إجمالي الحجز", "تكلفة الخدمة", "الربح", "مبلغ الاستثمار"],
              (filtered ?? []).map(r => [r.bookingId, r.clientName, r.totalPrice, r.serviceCost, r.profit, r.investment])
            );
          }} className="gap-1.5 shrink-0">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {isLoading ? "..." : totalRevenue.toLocaleString()} $
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {isLoading ? "..." : totalProfit.toLocaleString()} $
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الاستثمار (10%)</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {isLoading ? "..." : totalInvestment.toLocaleString()} $
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="border rounded-md bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الحجز</TableHead>
              <TableHead>اسم العميل</TableHead>
              <TableHead>إجمالي الحجز</TableHead>
              <TableHead>تكلفة الخدمة</TableHead>
              <TableHead>الربح</TableHead>
              <TableHead>مبلغ الاستثمار (10%)</TableHead>
              <TableHead>التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  {Array(7).fill(0).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <PiggyBank className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  لا توجد بيانات استثمار.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.bookingId}>
                  <TableCell className="font-mono text-sm text-primary">#{row.bookingId}</TableCell>
                  <TableCell className="font-medium">{row.clientName}</TableCell>
                  <TableCell className="font-semibold">{row.totalPrice.toLocaleString()} $</TableCell>
                  <TableCell className="text-muted-foreground">{row.serviceCost.toLocaleString()} $</TableCell>
                  <TableCell className="font-semibold text-green-600">{row.profit.toLocaleString()} $</TableCell>
                  <TableCell className="font-bold text-amber-600">{row.investment.toLocaleString()} $</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(row.createdAt), "d MMM yyyy", { locale: ar })}
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
