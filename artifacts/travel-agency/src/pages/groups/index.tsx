import { useState } from "react";
import {
  useListGroups, useCreateGroup, useUpdateGroup, useDeleteGroup,
  useGetGroup, useAddGroupMember, useRemoveGroupMember, getGetGroupQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, Users, UserPlus, X, CheckCircle2, Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const STATUS: Record<string, { label: string; variant: any }> = {
  open:       { label: "مفتوح",    variant: "default" },
  confirmed:  { label: "مؤكد",     variant: "outline" },
  completed:  { label: "مكتمل",    variant: "secondary" },
  cancelled:  { label: "ملغى",     variant: "destructive" },
};

const groupSchema = z.object({
  name: z.string().min(2, "اسم المجموعة مطلوب"),
  packageName: z.string().min(1, "اسم الباقة مطلوب"),
  departureDate: z.string().min(1, "تاريخ الانطلاق مطلوب"),
  returnDate: z.string().optional(),
  maxCapacity: z.coerce.number().min(1).default(10),
  totalPrice: z.coerce.number().min(0).default(0),
  status: z.enum(["open", "confirmed", "completed", "cancelled"]).default("open"),
  description: z.string().optional(),
  notes: z.string().optional(),
});
type GroupForm = z.infer<typeof groupSchema>;

const memberSchema = z.object({
  clientName: z.string().min(2, "الاسم مطلوب"),
  clientPhone: z.string().optional(),
  pricePaid: z.coerce.number().min(0).default(0),
  isPaid: z.boolean().default(false),
  notes: z.string().optional(),
});
type MemberForm = z.infer<typeof memberSchema>;

const QK = ["listGroups"];

function GroupCard({ g, onEdit, onDelete }: { g: any; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: detail } = useGetGroup(g.id, { query: { enabled: open, queryKey: getGetGroupQueryKey(g.id) } });
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [addingMember, setAddingMember] = useState(false);
  const mForm = useForm<MemberForm>({ resolver: zodResolver(memberSchema), defaultValues: { clientName: "", clientPhone: "", pricePaid: 0, isPaid: false, notes: "" } });

  const s = STATUS[g.status] ?? STATUS.open;
  const members = detail?.members ?? [];
  const paidCount = members.filter((m: any) => m.isPaid).length;
  const totalPaid = members.reduce((sum: number, m: any) => sum + m.pricePaid, 0);

  const onAddMember = (data: MemberForm) => {
    addMember.mutate({ id: g.id, data: { ...data, clientPhone: data.clientPhone || null, notes: data.notes || null } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["getGroup", g.id] });
        queryClient.invalidateQueries({ queryKey: QK });
        toast({ title: "تمت إضافة العضو" });
        mForm.reset();
        setAddingMember(false);
      },
    });
  };

  const onRemoveMember = (memberId: number) => {
    removeMember.mutate({ id: g.id, memberId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["getGroup", g.id] });
        toast({ title: "تم حذف العضو" });
      },
    });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-xl bg-card shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-base">{g.name}</h3>
              <Badge variant={s.variant}>{s.label}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">{g.packageName}</div>
            <div className="flex gap-4 mt-2 text-sm">
              <span>📅 {format(new Date(g.departureDate), "d MMM yyyy", { locale: ar })}</span>
              {g.returnDate && <span>🔁 {format(new Date(g.returnDate), "d MMM yyyy", { locale: ar })}</span>}
              <span>👥 {members.length} / {g.maxCapacity}</span>
              {g.totalPrice > 0 && <span className="font-semibold text-primary">💰 {g.totalPrice.toLocaleString()} $</span>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={onEdit} className="cursor-pointer"><Pencil className="ml-2 h-4 w-4" /> تعديل</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive cursor-pointer"><Trash2 className="ml-2 h-4 w-4" /> حذف</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
      </div>

      <CollapsibleContent>
        <div className="border-t p-4 space-y-4 bg-muted/20">
          {/* Member stats */}
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-card rounded-lg p-2 border"><div className="font-bold text-base">{members.length}</div><div className="text-muted-foreground text-xs">إجمالي الأعضاء</div></div>
            <div className="bg-card rounded-lg p-2 border"><div className="font-bold text-base text-green-600">{paidCount}</div><div className="text-muted-foreground text-xs">دفعوا</div></div>
            <div className="bg-card rounded-lg p-2 border"><div className="font-bold text-base text-primary">{totalPaid.toLocaleString()} $</div><div className="text-muted-foreground text-xs">مبلغ محصّل</div></div>
          </div>

          {/* Members table */}
          {members.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow><TableHead>الاسم</TableHead><TableHead>الهاتف</TableHead><TableHead>المبلغ</TableHead><TableHead>الدفع</TableHead><TableHead className="w-8"></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.clientName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.clientPhone || "—"}</TableCell>
                    <TableCell className="font-semibold">{m.pricePaid.toLocaleString()} $</TableCell>
                    <TableCell>{m.isPaid ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-amber-400" />}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveMember(m.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Add member form */}
          {addingMember ? (
            <Form {...mForm}>
              <form onSubmit={mForm.handleSubmit(onAddMember)} className="border rounded-lg p-3 space-y-3 bg-card">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={mForm.control} name="clientName" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">اسم العضو *</FormLabel><FormControl><Input {...field} className="h-8" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={mForm.control} name="clientPhone" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">الهاتف</FormLabel><FormControl><Input {...field} dir="ltr" className="h-8" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={mForm.control} name="pricePaid" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">المبلغ ($)</FormLabel><FormControl><Input type="number" min="0" step="0.01" {...field} className="h-8" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={mForm.control} name="isPaid" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">حالة الدفع</FormLabel>
                      <Select onValueChange={v => field.onChange(v === "true")} value={field.value ? "true" : "false"}>
                        <FormControl><SelectTrigger className="h-8"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="true">دفع</SelectItem><SelectItem value="false">لم يدفع</SelectItem></SelectContent>
                      </Select></FormItem>
                  )} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={addMember.isPending}>
                    {addMember.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "إضافة"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAddingMember(false)}>إلغاء</Button>
                </div>
              </form>
            </Form>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAddingMember(true)} className="gap-2 w-full">
              <UserPlus className="h-3.5 w-3.5" /> إضافة عضو
            </Button>
          )}

          {g.notes && <div className="text-sm text-muted-foreground italic border-t pt-3">{g.notes}</div>}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function GroupsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: groups, isLoading } = useListGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const form = useForm<GroupForm>({ resolver: zodResolver(groupSchema), defaultValues: { name: "", packageName: "", departureDate: "", returnDate: "", maxCapacity: 10, totalPrice: 0, status: "open", description: "", notes: "" } });

  const openEdit = (g: any) => { setEditing(g); form.reset({ name: g.name, packageName: g.packageName, departureDate: g.departureDate, returnDate: g.returnDate || "", maxCapacity: g.maxCapacity, totalPrice: g.totalPrice, status: g.status, description: g.description || "", notes: g.notes || "" }); setIsOpen(true); };
  const close = () => { setIsOpen(false); setEditing(null); form.reset(); };

  const onSubmit = (data: GroupForm) => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: QK });
    const payload = { ...data, returnDate: data.returnDate || null, description: data.description || null, notes: data.notes || null };
    if (editing) {
      updateGroup.mutate({ id: editing.id, data: payload }, { onSuccess: () => { invalidate(); toast({ title: "تم تحديث المجموعة" }); close(); } });
    } else {
      createGroup.mutate({ data: payload as any }, { onSuccess: () => { invalidate(); toast({ title: "تمت إضافة المجموعة" }); close(); } });
    }
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">الحجوزات الجماعية</h1>
            <p className="text-muted-foreground mt-1">إدارة رحلات المجموعات وأعضائها.</p>
          </div>
          <Button onClick={() => setIsOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> مجموعة جديدة</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {["open", "confirmed", "completed", "cancelled"].map(st => {
            const count = groups?.filter(g => g.status === st).length ?? 0;
            const s = STATUS[st];
            return (
              <div key={st} className="bg-card border rounded-xl p-4">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          {isLoading ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />) :
           groups?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>لا توجد مجموعات حتى الآن.</p>
            </div>
          ) : groups?.map(g => (
            <GroupCard key={g.id} g={g} onEdit={() => openEdit(g)} onDelete={() => setDeleteTarget(g)} />
          ))}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={o => { if (!o) close(); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "تعديل المجموعة" : "مجموعة جديدة"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>اسم المجموعة *</FormLabel><FormControl><Input {...field} placeholder="مثال: رحلة مكة 2025" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="packageName" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>الباقة السياحية *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="departureDate" render={({ field }) => (
                  <FormItem><FormLabel>تاريخ الانطلاق *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="returnDate" render={({ field }) => (
                  <FormItem><FormLabel>تاريخ العودة</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="maxCapacity" render={({ field }) => (
                  <FormItem><FormLabel>السعة القصوى</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="totalPrice" render={({ field }) => (
                  <FormItem><FormLabel>سعر الفرد ($)</FormLabel><FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>الحالة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{Object.entries(STATUS).map(([v, { label }]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}</SelectContent>
                    </Select></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>ملاحظات</FormLabel><FormControl><Textarea {...field} className="h-20" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>إلغاء</Button>
                <Button type="submit" disabled={createGroup.isPending || updateGroup.isPending}>
                  {(createGroup.isPending || updateGroup.isPending) ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جارٍ الحفظ...</> : editing ? "حفظ التغييرات" : "إنشاء المجموعة"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>حذف المجموعة</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف مجموعة <strong>{deleteTarget?.name}</strong> وجميع أعضائها؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteGroup.mutate({ id: deleteTarget.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: QK }); toast({ title: "تم حذف المجموعة" }); setDeleteTarget(null); } })}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
