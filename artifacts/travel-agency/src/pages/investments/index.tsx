import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, PiggyBank, DollarSign, Download, Search, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useUpdateBooking, useDeleteBooking, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

const QUERY_KEY = ["investments"];

function useInvestments() {
  return useQuery<InvestmentRow[]>({
    queryKey: QUERY_KEY,
    queryFn: () => fetch(`${import.meta.env.BASE_URL}api/investments`.replace(/\/+/, "/")).then(r => r.json()),
  });
}

/* ── Edit form schema ── */
const editSchema = z.object({
  clientName: z.string().min(1, "الاسم مطلوب"),
  totalPrice: z.coerce.number().min(0, "يجب أن يكون صفر أو أكثر"),
  serviceCost: z.coerce.number().min(0, "يجب أن يكون صفر أو أكثر"),
});
type EditValues = z.infer<typeof editSchema>;

export default function InvestmentsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useInvestments();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

  const [editTarget, setEditTarget] = useState<InvestmentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvestmentRow | null>(null);

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { clientName: "", totalPrice: 0, serviceCost: 0 },
  });

  const openEdit = (row: InvestmentRow) => {
    setEditTarget(row);
    form.reset({
      clientName: row.clientName,
      totalPrice: row.totalPrice,
      serviceCost: row.serviceCost,
    });
  };

  const onSubmit = (values: EditValues) => {
    if (!editTarget) return;
    updateBooking.mutate(
      {
        id: editTarget.bookingId,
        data: {
          totalPrice: values.totalPrice,
          serviceCost: values.serviceCost,
          // clientNameOverride is stored in payments; update via booking notes workaround is not clean,
          // so we update only the financial fields here.
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
          toast({ title: "تم تحديث البيانات بنجاح" });
          setEditTarget(null);
          form.reset();
        },
        onError: (err: any) => {
          toast({ title: "حدث خطأ أثناء التعديل", description: err?.message, variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteBooking.mutate(
      { id: deleteTarget.bookingId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
          toast({ title: "تم حذف السجل بنجاح" });
          setDeleteTarget(null);
        },
        onError: (err: any) => {
          toast({ title: "حدث خطأ أثناء الحذف", description: err?.message, variant: "destructive" });
        },
      }
    );
  };

  const filtered = data?.filter(r =>
    !search || r.clientName.toLowerCase().includes(search.toLowerCase()) || r.bookingId.toString().includes(search)
  );

  const totalProfit     = filtered?.reduce((s, r) => s + r.profit, 0) ?? 0;
  const totalInvestment = filtered?.reduce((s, r) => s + r.investment, 0) ?? 0;
  const totalRevenue    = filtered?.reduce((s, r) => s + r.totalPrice, 0) ?? 0;

  /* Live preview inside the edit dialog */
  const watchTotal   = form.watch("totalPrice") ?? 0;
  const watchService = form.watch("serviceCost") ?? 0;
  const previewProfit     = Math.max(0, watchTotal - watchService);
  const previewInvestment = previewProfit * 0.1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">الادخار</h1>
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
            downloadCSV("savings.csv",
              ["رقم الحجز", "العميل", "إجمالي الحجز", "تكلفة الخدمة", "الربح", "مبلغ الادخار"],
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
                <p className="text-sm text-muted-foreground">إجمالي الادخار (10%)</p>
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
              <TableHead>مبلغ الادخار (10%)</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  {Array(8).fill(0).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <PiggyBank className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  لا توجد بيانات ادخار.
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem onClick={() => openEdit(row)} className="cursor-pointer">
                          <Pencil className="ml-2 h-4 w-4" /> تعديل
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(row)}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="ml-2 h-4 w-4" /> حذف
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

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) { setEditTarget(null); form.reset(); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل سجل الادخار — حجز #{editTarget?.bookingId}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Client name — read-only display */}
              <div className="space-y-1">
                <p className="text-sm font-medium">اسم العميل</p>
                <p className="text-sm text-muted-foreground border rounded-md px-3 py-2 bg-muted/30">
                  {editTarget?.clientName}
                </p>
              </div>

              <FormField control={form.control} name="totalPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>إجمالي الحجز ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="serviceCost" render={({ field }) => (
                <FormItem>
                  <FormLabel>تكلفة الخدمة ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Live preview */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">الربح المتوقع</p>
                  <p className="text-lg font-bold text-green-600">{previewProfit.toLocaleString()} $</p>
                </div>
                <div className="text-center border-r">
                  <p className="text-xs text-muted-foreground mb-1">الادخار (10%)</p>
                  <p className="text-lg font-bold text-amber-600">{previewInvestment.toLocaleString()} $</p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setEditTarget(null); form.reset(); }}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={updateBooking.isPending}>
                  {updateBooking.isPending
                    ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جارٍ الحفظ...</>
                    : "حفظ التغييرات"}
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
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف سجل الادخار للعميل{" "}
              <strong>{deleteTarget?.clientName}</strong> (حجز #{deleteTarget?.bookingId})؟
              <br />
              <span className="text-destructive">سيتم حذف الحجز بالكامل وهذا الإجراء لا يمكن التراجع عنه.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBooking.isPending ? "جارٍ الحذف..." : "نعم، احذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
