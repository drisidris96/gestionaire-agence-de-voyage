import { useState } from "react";
import { useListDestinations, useCreateDestination, useUpdateDestination, useDeleteDestination, getListDestinationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, MoreHorizontal, Pencil, Trash, Image as ImageIcon } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

const destSchema = z.object({
  name: z.string().min(2, "اسم الوجهة مطلوب"),
  country: z.string().min(2, "اسم الدولة مطلوب"),
  description: z.string().optional(),
  imageUrl: z.string().url("يجب أن يكون رابطًا صحيحًا").or(z.literal("")).optional(),
});

type DestFormValues = z.infer<typeof destSchema>;

export default function DestinationsPage() {
  const { data: destinations, isLoading } = useListDestinations();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<any>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createDest = useCreateDestination();
  const updateDest = useUpdateDestination();
  const deleteDest = useDeleteDestination();

  const form = useForm<DestFormValues>({
    resolver: zodResolver(destSchema),
    defaultValues: { name: "", country: "", description: "", imageUrl: "" }
  });

  const onSubmit = (data: DestFormValues) => {
    if (editingDest) {
      updateDest.mutate({ id: editingDest.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDestinationsQueryKey() });
          toast({ title: "تم تحديث الوجهة" });
          setIsAddOpen(false);
          setEditingDest(null);
        }
      });
    } else {
      createDest.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDestinationsQueryKey() });
          toast({ title: "تمت إضافة الوجهة" });
          setIsAddOpen(false);
          form.reset();
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذه الوجهة؟")) {
      deleteDest.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDestinationsQueryKey() });
          toast({ title: "تم حذف الوجهة" });
        }
      });
    }
  };

  const openEdit = (dest: any) => {
    setEditingDest(dest);
    form.reset({ name: dest.name, country: dest.country, description: dest.description || "", imageUrl: dest.imageUrl || "" });
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الوجهات</h1>
          <p className="text-muted-foreground mt-1">إدارة الوجهات السياحية المتاحة في الباقات.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) { setEditingDest(null); form.reset(); }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-destination"><Plus className="ml-2 h-4 w-4" /> إضافة وجهة</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDest ? "تعديل الوجهة" : "إضافة وجهة جديدة"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المدينة / الوجهة *</FormLabel>
                    <FormControl><Input {...field} data-testid="input-dest-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الدولة *</FormLabel>
                    <FormControl><Input {...field} data-testid="input-dest-country" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>رابط الصورة</FormLabel>
                    <FormControl><Input {...field} placeholder="https://..." data-testid="input-dest-image" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف</FormLabel>
                    <FormControl><Textarea {...field} data-testid="input-dest-description" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={createDest.isPending || updateDest.isPending} data-testid="button-submit-destination">
                    {editingDest ? "حفظ التغييرات" : "إنشاء الوجهة"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)
        ) : destinations?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            لا توجد وجهات. أضف وجهة للبدء.
          </div>
        ) : (
          destinations?.map((dest) => (
            <Card key={dest.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all group" data-testid={`card-destination-${dest.id}`}>
              <div className="aspect-video relative bg-muted flex items-center justify-center overflow-hidden">
                {dest.imageUrl ? (
                  <img src={dest.imageUrl} alt={dest.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <ImageIcon className="h-12 w-12 text-muted-foreground opacity-20" />
                )}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8 shadow-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => openEdit(dest)} className="cursor-pointer">
                        <Pencil className="ml-2 h-4 w-4" /> تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(dest.id)} className="text-destructive focus:text-destructive cursor-pointer">
                        <Trash className="ml-2 h-4 w-4" /> حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-bold text-lg line-clamp-1">{dest.name}</h3>
                <p className="text-muted-foreground text-sm font-medium mb-2">{dest.country}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{dest.description || 'لا يوجد وصف.'}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
