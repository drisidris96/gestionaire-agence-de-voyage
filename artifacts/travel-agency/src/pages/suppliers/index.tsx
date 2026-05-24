import { useState } from "react";
import { useListSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, Building2, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const SUPPLIER_TYPES: Record<string, { label: string; color: string }> = {
  hotel:      { label: "فندق",      color: "bg-blue-100 text-blue-800" },
  airline:    { label: "طيران",     color: "bg-sky-100 text-sky-800" },
  transport:  { label: "نقل",       color: "bg-orange-100 text-orange-800" },
  restaurant: { label: "مطعم",      color: "bg-green-100 text-green-800" },
  other:      { label: "أخرى",      color: "bg-gray-100 text-gray-700" },
};

const schema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  type: z.enum(["hotel", "airline", "transport", "restaurant", "other"]),
  phone: z.string().optional(),
  email: z.string().email("بريد إلكتروني غير صحيح").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const QK = ["listSuppliers"];

export default function SuppliersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: suppliers, isLoading } = useListSuppliers();
  const create = useCreateSupplier();
  const update = useUpdateSupplier();
  const del = useDeleteSupplier();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [search, setSearch] = useState("");

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { name: "", type: "other", phone: "", email: "", address: "", notes: "", isActive: true } });

  const openEdit = (s: any) => { setEditing(s); form.reset({ name: s.name, type: s.type, phone: s.phone || "", email: s.email || "", address: s.address || "", notes: s.notes || "", isActive: s.isActive }); setIsOpen(true); };
  const close = () => { setIsOpen(false); setEditing(null); form.reset(); };

  const onSubmit = (data: FormData) => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: QK });
    const payload = { ...data, phone: data.phone || null, email: data.email || null, address: data.address || null, notes: data.notes || null };
    if (editing) {
      update.mutate({ id: editing.id, data: payload }, { onSuccess: () => { invalidate(); toast({ title: "تم تحديث المورد" }); close(); } });
    } else {
      create.mutate({ data: payload as any }, { onSuccess: () => { invalidate(); toast({ title: "تمت إضافة المورد" }); close(); } });
    }
  };

  const filtered = suppliers?.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.type.includes(search));

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">الموردون والشركاء</h1>
            <p className="text-muted-foreground mt-1">إدارة الفنادق وشركات الطيران والموردين.</p>
          </div>
          <Button onClick={() => setIsOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> إضافة مورد</Button>
        </div>

        <div className="flex gap-3">
          <Input placeholder="بحث عن مورد..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />) :
          filtered?.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>لا يوجد موردون.</p>
            </div>
          ) : filtered?.map(s => {
            const t = SUPPLIER_TYPES[s.type] ?? SUPPLIER_TYPES.other;
            return (
              <div key={s.id} className="bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-base leading-tight">{s.name}</h3>
                      {!s.isActive && <Badge variant="secondary" className="text-xs">غير نشط</Badge>}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.color}`}>{t.label}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => openEdit(s)} className="cursor-pointer"><Pencil className="ml-2 h-4 w-4" /> تعديل</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteTarget(s)} className="text-destructive cursor-pointer"><Trash2 className="ml-2 h-4 w-4" /> حذف</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {s.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{s.phone}</div>}
                  {s.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{s.email}</div>}
                  {s.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /><span className="truncate">{s.address}</span></div>}
                  {s.notes && <div className="text-xs italic truncate border-t pt-1.5 mt-1.5">{s.notes}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={o => { if (!o) close(); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "تعديل المورد" : "إضافة مورد جديد"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>اسم المورد *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>النوع *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{Object.entries(SUPPLIER_TYPES).map(([v, { label }]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem><FormLabel>الحالة</FormLabel>
                    <Select onValueChange={v => field.onChange(v === "true")} value={field.value ? "true" : "false"}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="true">نشط</SelectItem><SelectItem value="false">غير نشط</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>الهاتف</FormLabel><FormControl><Input {...field} dir="ltr" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>البريد الإلكتروني</FormLabel><FormControl><Input {...field} dir="ltr" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>العنوان</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>ملاحظات</FormLabel><FormControl><Textarea {...field} className="h-20" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>إلغاء</Button>
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {(create.isPending || update.isPending) ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جارٍ الحفظ...</> : editing ? "حفظ التغييرات" : "إضافة المورد"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>حذف المورد</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف <strong>{deleteTarget?.name}</strong>؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => del.mutate({ id: deleteTarget.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: QK }); toast({ title: "تم حذف المورد" }); setDeleteTarget(null); } })}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
