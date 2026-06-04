import { useState } from "react";
import { Link } from "wouter";
import { useListClients, useCreateClient, useUpdateClient, useDeleteClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Plus, Search, MoreHorizontal, Pencil, Trash, FileText, Download } from "lucide-react";
import { downloadCSV } from "@/lib/export-csv";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const clientSchema = z.object({
  fullName: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(5, "رقم الهاتف مطلوب"),
  email: z.string().email("البريد الإلكتروني غير صحيح").or(z.literal("")).optional(),
  address: z.string().optional(),
  passportNumber: z.string().optional(),
  nationality: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const { data: clients, isLoading } = useListClients({ search });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [deletingClient, setDeletingClient] = useState<any>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      address: "",
      passportNumber: "",
      nationality: "",
      notes: "",
    }
  });

  const onSubmit = (data: ClientFormValues) => {
    const payload = {
      ...data,
      email: data.email && data.email.trim() !== "" ? data.email : null,
    };
    if (editingClient) {
      updateClient.mutate({ id: editingClient.id, data: payload as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          toast({ title: "تم تحديث بيانات العميل بنجاح" });
          setIsAddOpen(false);
          setEditingClient(null);
        },
        onError: () => {
          toast({ title: "حدث خطأ أثناء التحديث", variant: "destructive" });
        }
      });
    } else {
      createClient.mutate({ data: payload as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          toast({ title: "تمت إضافة العميل بنجاح" });
          setIsAddOpen(false);
          form.reset();
        },
        onError: () => {
          toast({ title: "حدث خطأ أثناء الإضافة", variant: "destructive" });
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!deletingClient) return;
    deleteClient.mutate({ id: deletingClient.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        toast({ title: "تم حذف العميل" });
        setDeletingClient(null);
      },
      onError: () => {
        toast({ title: "حدث خطأ أثناء الحذف", variant: "destructive" });
        setDeletingClient(null);
      }
    });
  };

  const openEdit = (client: any) => {
    setEditingClient(client);
    form.reset({
      fullName: client.fullName,
      phone: client.phone,
      email: client.email || "",
      address: client.address || "",
      passportNumber: client.passportNumber || "",
      nationality: client.nationality || "",
      notes: client.notes || "",
    });
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">العملاء</h1>
          <p className="text-muted-foreground mt-1">إدارة عملاء الوكالة السياحية.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن عميل..."
              className="pr-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-clients"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            const rows = clients?.filter(c =>
              !search ||
              c.fullName?.toLowerCase().includes(search.toLowerCase()) ||
              c.phone?.includes(search) ||
              c.email?.toLowerCase().includes(search.toLowerCase())
            ) ?? [];
            downloadCSV("clients.csv",
              ["#", "الاسم", "الهاتف", "البريد الإلكتروني", "الجنسية", "تاريخ الإضافة"],
              rows.map(c => [c.id, c.fullName, c.phone ?? "", c.email ?? "", c.nationality ?? "", c.createdAt])
            );
          }} className="gap-1.5 shrink-0"><Download className="h-4 w-4" /> CSV</Button>

          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              setEditingClient(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-client"><Plus className="ml-2 h-4 w-4" /> إضافة عميل</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingClient ? "تعديل بيانات العميل" : "إضافة عميل جديد"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>الاسم الكامل *</FormLabel>
                        <FormControl><Input {...field} data-testid="input-full-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الهاتف *</FormLabel>
                        <FormControl><Input {...field} data-testid="input-phone" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>البريد الإلكتروني</FormLabel>
                        <FormControl><Input {...field} type="email" data-testid="input-email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="nationality" render={({ field }) => (
                      <FormItem>
                        <FormLabel>الجنسية</FormLabel>
                        <FormControl><Input {...field} data-testid="input-nationality" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="passportNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم جواز السفر</FormLabel>
                        <FormControl><Input {...field} data-testid="input-passport" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>العنوان</FormLabel>
                        <FormControl><Input {...field} data-testid="input-address" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>ملاحظات</FormLabel>
                        <FormControl><Textarea {...field} data-testid="input-notes" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditingClient(null); form.reset(); }}>
                      إلغاء
                    </Button>
                    <Button type="submit" disabled={createClient.isPending || updateClient.isPending} data-testid="button-submit-client">
                      {editingClient ? "حفظ التغييرات" : "إنشاء العميل"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-md bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>بيانات التواصل</TableHead>
              <TableHead>الجنسية</TableHead>
              <TableHead>جواز السفر</TableHead>
              <TableHead>تاريخ الإضافة</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : clients?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  لا يوجد عملاء.
                </TableCell>
              </TableRow>
            ) : (
              clients?.map((client) => (
                <TableRow key={client.id} className="group" data-testid={`row-client-${client.id}`}>
                  <TableCell className="font-medium">
                    <Link href={`/clients/${client.id}`} className="hover:underline hover:text-primary">
                      {client.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{client.phone}</div>
                    <div className="text-xs text-muted-foreground">{client.email}</div>
                  </TableCell>
                  <TableCell>{client.nationality || '-'}</TableCell>
                  <TableCell>{client.passportNumber || '-'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(client.createdAt), 'd MMM yyyy', { locale: ar })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`menu-client-${client.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}`} className="cursor-pointer flex items-center">
                            <FileText className="ml-2 h-4 w-4" /> عرض التفاصيل
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(client)} className="cursor-pointer">
                          <Pencil className="ml-2 h-4 w-4" /> تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingClient(client)}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash className="ml-2 h-4 w-4" /> حذف
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingClient} onOpenChange={(open) => { if (!open) setDeletingClient(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف العميل <span className="font-semibold text-foreground">"{deletingClient?.fullName}"</span>؟
              <br />
              سيتم حذف جميع بيانات هذا العميل ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteClient.isPending}
            >
              {deleteClient.isPending ? "جارٍ الحذف..." : "نعم، احذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
