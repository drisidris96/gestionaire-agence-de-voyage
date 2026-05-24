import { useState } from "react";
import {
  useListPurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder, useDeletePurchaseOrder,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/use-agency";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus, MoreHorizontal, Pencil, Trash2, Printer, ShoppingCart, Phone,
  PackageOpen, Loader2, X, Mail, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OrderItem { description: string; quantity: number; unitPrice: number; total: number; }

const STATUS_AR: Record<string, { label: string; variant: any }> = {
  pending:   { label: "معلق",     variant: "secondary" },
  approved:  { label: "معتمد",    variant: "default" },
  delivered: { label: "مُسلَّم",  variant: "outline" },
  cancelled: { label: "ملغى",     variant: "destructive" },
};

const orderSchema = z.object({
  supplierName: z.string().min(2, "اسم المورد مطلوب"),
  supplierPhone: z.string().optional(),
  date: z.string().min(1, "التاريخ مطلوب"),
  status: z.enum(["pending", "approved", "delivered", "cancelled"]).default("pending"),
  notes: z.string().optional(),
});
type OrderForm = z.infer<typeof orderSchema>;

const QUERY_KEY = ["listPurchaseOrders"];

function POPrint({ order, agency }: { order: any; agency: any }) {
  const logoSrc = agency.agencyLogoUrl || "/logo.jpg";
  const total = order.items.reduce((s: number, i: OrderItem) => s + i.total, 0);
  return (
    <div id="print-area" className="bg-white p-8 max-w-[750px] mx-auto border rounded-xl shadow-lg print:shadow-none print:border-none">
      <div className="flex items-start justify-between border-b-2 pb-4 mb-5" style={{ borderColor: "#C9A227" }}>
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt={agency.agencyName} className="h-16 w-auto object-contain rounded"
            onError={(e) => { (e.target as HTMLImageElement).src = "/logo.jpg"; }} />
          <div>
            <div className="text-lg font-black" style={{ color: "#C9A227" }}>{agency.agencyName}</div>
            <div className="text-xs tracking-widest text-gray-500 uppercase">{agency.agencyNameEn}</div>
            {agency.agencyPhone && <div className="text-xs text-gray-500 mt-1">{agency.agencyPhone}</div>}
          </div>
        </div>
        <div className="text-left border-2 rounded-lg px-4 py-2 text-center" style={{ borderColor: "#C9A227" }}>
          <div className="text-sm font-bold" style={{ color: "#C9A227" }}>وصل طلبية شراء</div>
          <div className="text-xs text-gray-500 mt-0.5">{order.orderNumber}</div>
          <div className="text-xs text-gray-500">{format(new Date(order.date), "d MMMM yyyy", { locale: ar })}</div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-5 border-r-4 text-sm" style={{ borderColor: "#C9A227" }}>
        <div className="font-bold text-gray-700 mb-2">بيانات المورد</div>
        <div className="grid grid-cols-2 gap-1">
          <div><span className="text-gray-500">المورد: </span><span className="font-semibold">{order.supplierName}</span></div>
          {order.supplierPhone && <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-gray-400" /><span>{order.supplierPhone}</span></div>}
        </div>
      </div>

      <table className="w-full text-sm mb-5 border-collapse">
        <thead>
          <tr style={{ backgroundColor: "#C9A227", color: "white" }}>
            <th className="p-2.5 text-right font-semibold rounded-tr-md">البيان / الصنف</th>
            <th className="p-2.5 text-center font-semibold">الكمية</th>
            <th className="p-2.5 text-center font-semibold">سعر الوحدة ($)</th>
            <th className="p-2.5 text-center font-semibold rounded-tl-md">الإجمالي ($)</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item: OrderItem, idx: number) => (
            <tr key={idx} className={`border-b border-gray-200 ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}>
              <td className="p-2.5 font-medium">{item.description}</td>
              <td className="p-2.5 text-center">{item.quantity}</td>
              <td className="p-2.5 text-center">{item.unitPrice.toLocaleString()}</td>
              <td className="p-2.5 text-center font-semibold">{item.total.toLocaleString()}</td>
            </tr>
          ))}
          <tr style={{ backgroundColor: "#C9A22710" }}>
            <td className="p-2.5 font-bold" colSpan={3}>المجموع الإجمالي</td>
            <td className="p-2.5 text-center font-bold text-lg" style={{ color: "#C9A227" }}>{total.toLocaleString()} $</td>
          </tr>
        </tbody>
      </table>

      {order.notes && (
        <div className="p-3 bg-blue-50 rounded-lg text-sm text-gray-700 mb-4">
          <span className="font-semibold">ملاحظات: </span>{order.notes}
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-8">
          <div><div className="text-sm font-semibold text-gray-700 mb-6">توقيع المورد</div>
            <div className="border-b-2 border-dashed border-gray-300 w-40"></div></div>
          <div className="text-left rtl:text-right"><div className="text-sm font-semibold text-gray-700 mb-6">توقيع المسؤول</div>
            <div className="border-b-2 border-dashed border-gray-300 w-40 mr-auto rtl:ml-auto rtl:mr-0"></div></div>
        </div>
        <div className="mt-6 text-center text-[10px] text-gray-400 border-t pt-3">
          {agency.agencyName} — {agency.agencyNameEn}
        </div>
      </div>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const { settings: agency } = useAgency();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orders, isLoading } = useListPurchaseOrders();
  const createOrder = useCreatePurchaseOrder();
  const updateOrder = useUpdatePurchaseOrder();
  const deleteOrder = useDeletePurchaseOrder();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [printOrder, setPrintOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);

  const form = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: { supplierName: "", supplierPhone: "", date: new Date().toISOString().split("T")[0], status: "pending", notes: "" },
  });

  const addItem = () => setItems(prev => [...prev, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof OrderItem, value: string | number) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        updated.total = Number(updated.quantity) * Number(updated.unitPrice);
      }
      return updated;
    }));
  };

  const grandTotal = items.reduce((s, i) => s + (i.total || 0), 0);

  const openEdit = (order: any) => {
    setEditingOrder(order);
    setItems(order.items?.length ? order.items : [{ description: "", quantity: 1, unitPrice: 0, total: 0 }]);
    form.reset({ supplierName: order.supplierName, supplierPhone: order.supplierPhone || "", date: order.date, status: order.status, notes: order.notes || "" });
    setIsFormOpen(true);
  };
  const closeForm = () => { setIsFormOpen(false); setEditingOrder(null); setItems([{ description: "", quantity: 1, unitPrice: 0, total: 0 }]); form.reset(); };

  const onSubmit = (data: OrderForm) => {
    const validItems = items.filter(i => i.description.trim());
    const payload = { ...data, items: validItems, totalAmount: grandTotal };
    const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

    if (editingOrder) {
      updateOrder.mutate({ id: editingOrder.id, data: payload as any }, {
        onSuccess: () => { invalidate(); toast({ title: "تم تحديث طلبية الشراء" }); closeForm(); },
      });
    } else {
      createOrder.mutate({ data: payload as any }, {
        onSuccess: () => { invalidate(); toast({ title: "تم إنشاء طلبية الشراء" }); closeForm(); },
      });
    }
  };

  return (
    <>
      <style>{`@media print { body * { visibility: hidden !important; } #print-area, #print-area * { visibility: visible !important; } #print-area { position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; background: white !important; } }`}</style>

      {printOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:bg-transparent print:inset-auto print:p-0">
          <div className="bg-white rounded-xl max-h-[90vh] overflow-y-auto max-w-3xl w-full print:max-h-none print:overflow-visible">
            <div className="flex items-center justify-between p-4 border-b print:hidden">
              <h2 className="font-bold text-lg">معاينة طلبية الشراء — {printOrder.orderNumber}</h2>
              <div className="flex gap-2">
                <Button onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> طباعة</Button>
                <Button variant="outline" onClick={() => setPrintOrder(null)}>إغلاق</Button>
              </div>
            </div>
            <div className="p-4 print:p-0"><POPrint order={printOrder} agency={agency} /></div>
          </div>
        </div>
      )}

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">طلبيات الشراء</h1>
            <p className="text-muted-foreground mt-1">إدارة وصولات طلبيات الشراء من الموردين.</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> طلبية جديدة
          </Button>
        </div>

        <div className="border rounded-md bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلبية</TableHead>
                <TableHead>المورد</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>عدد الأصناف</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array(3).fill(0).map((_, i) => (
                <TableRow key={i}>{Array(7).fill(0).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              )) : orders?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <PackageOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />لا توجد طلبيات شراء.
                </TableCell></TableRow>
              ) : orders?.map(order => {
                const s = STATUS_AR[order.status] ?? STATUS_AR.pending;
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-semibold text-sm">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium">{order.supplierName}</div>
                      {order.supplierPhone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{order.supplierPhone}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(order.date), "d MMM yyyy", { locale: ar })}</TableCell>
                    <TableCell>{(order.items as any[]).length} صنف</TableCell>
                    <TableCell className="font-semibold text-primary">{order.totalAmount.toLocaleString()} $</TableCell>
                    <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <DropdownMenuItem onClick={() => setPrintOrder(order)} className="cursor-pointer"><Printer className="ml-2 h-4 w-4" /> طباعة الوصل</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEdit(order)} className="cursor-pointer"><Pencil className="ml-2 h-4 w-4" /> تعديل</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteTarget(order)} className="text-destructive focus:text-destructive cursor-pointer"><Trash2 className="ml-2 h-4 w-4" /> حذف</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editingOrder ? "تعديل الطلبية" : "طلبية شراء جديدة"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="supplierName" render={({ field }) => (
                  <FormItem><FormLabel>اسم المورد *</FormLabel>
                    <FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="supplierPhone" render={({ field }) => (
                  <FormItem><FormLabel>هاتف المورد</FormLabel>
                    <FormControl><Input {...field} dir="ltr" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>تاريخ الطلبية *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>الحالة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="pending">معلق</SelectItem>
                        <SelectItem value="approved">معتمد</SelectItem>
                        <SelectItem value="delivered">مُسلَّم</SelectItem>
                        <SelectItem value="cancelled">ملغى</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">أصناف الطلبية</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
                    <Plus className="h-3.5 w-3.5" /> إضافة صنف
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-right font-medium">البيان / الصنف</th>
                        <th className="p-2 text-center font-medium w-24">الكمية</th>
                        <th className="p-2 text-center font-medium w-32">سعر الوحدة ($)</th>
                        <th className="p-2 text-center font-medium w-28">الإجمالي ($)</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-1.5">
                            <Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="اسم الصنف..." className="h-8 text-sm" />
                          </td>
                          <td className="p-1.5">
                            <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 1)} className="h-8 text-sm text-center" />
                          </td>
                          <td className="p-1.5">
                            <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)} className="h-8 text-sm text-center" />
                          </td>
                          <td className="p-1.5 text-center font-semibold text-primary">{item.total.toLocaleString()}</td>
                          <td className="p-1.5 text-center">
                            {items.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(i)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-primary/5">
                      <tr>
                        <td colSpan={3} className="p-2.5 font-bold text-left rtl:text-right">المجموع الإجمالي</td>
                        <td className="p-2.5 text-center font-bold text-lg text-primary">{grandTotal.toLocaleString()} $</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>ملاحظات</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>إلغاء</Button>
                <Button type="submit" disabled={createOrder.isPending || updateOrder.isPending}>
                  {(createOrder.isPending || updateOrder.isPending) ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جارٍ الحفظ...</> : editingOrder ? "حفظ التغييرات" : "إنشاء الطلبية"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>حذف الطلبية</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف الطلبية <strong>{deleteTarget?.orderNumber}</strong>؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteOrder.mutate({ id: deleteTarget.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: QUERY_KEY }); toast({ title: "تم حذف الطلبية" }); setDeleteTarget(null); } }); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
