import { useState, useRef } from "react";
import {
  useListDestinations, useCreateDestination, useUpdateDestination,
  useDeleteDestination, getListDestinationsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Image as ImageIcon, Upload, Loader2, DollarSign } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal } from "lucide-react";

const destSchema = z.object({
  name: z.string().min(2, "اسم الوجهة مطلوب"),
  country: z.string().min(2, "اسم الدولة مطلوب"),
  description: z.string().optional(),
  imageUrl: z.string().url("يجب أن يكون رابطًا صحيحًا").or(z.literal("")).optional(),
  price: z.coerce.number().min(0, "السعر يجب أن يكون موجباً").optional().nullable(),
});

type DestFormValues = z.infer<typeof destSchema>;

async function uploadImageToStorage(file: File): Promise<string> {
  const res = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) throw new Error("فشل طلب رابط الرفع");
  const { uploadURL, objectPath } = await res.json();

  const uploadRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) throw new Error("فشل رفع الصورة");

  return `/api/storage${objectPath}`;
}

export default function DestinationsPage() {
  const { data: destinations, isLoading } = useListDestinations();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createDest = useCreateDestination();
  const updateDest = useUpdateDestination();
  const deleteDest = useDeleteDestination();

  const form = useForm<DestFormValues>({
    resolver: zodResolver(destSchema),
    defaultValues: { name: "", country: "", description: "", imageUrl: "", price: null }
  });

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "يُسمح فقط بملفات الصور", variant: "destructive" });
      return;
    }
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setIsUploading(true);
    try {
      const url = await uploadImageToStorage(file);
      form.setValue("imageUrl", url);
      toast({ title: "تم رفع الصورة بنجاح" });
    } catch {
      toast({ title: "فشل رفع الصورة، حاول مرة أخرى", variant: "destructive" });
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (data: DestFormValues) => {
    const payload = { ...data, price: data.price ?? null };

    if (editingDest) {
      updateDest.mutate({ id: editingDest.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDestinationsQueryKey() });
          toast({ title: "تم تحديث الوجهة بنجاح" });
          closeForm();
        }
      });
    } else {
      createDest.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDestinationsQueryKey() });
          toast({ title: "تمت إضافة الوجهة" });
          closeForm();
        }
      });
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingDest(null);
    setImagePreview(null);
    form.reset({ name: "", country: "", description: "", imageUrl: "", price: null });
  };

  const openEdit = (dest: any) => {
    setEditingDest(dest);
    setImagePreview(dest.imageUrl || null);
    form.reset({
      name: dest.name,
      country: dest.country,
      description: dest.description || "",
      imageUrl: dest.imageUrl || "",
      price: dest.price ?? null,
    });
    setIsFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteDest.mutate({ id: deleteTarget.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDestinationsQueryKey() });
        toast({ title: "تم حذف الوجهة" });
        setDeleteTarget(null);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الوجهات</h1>
          <p className="text-muted-foreground mt-1">إدارة الوجهات السياحية المتاحة في الباقات.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} data-testid="button-add-destination">
          <Plus className="ml-2 h-4 w-4" /> إضافة وجهة
        </Button>
      </div>

      {/* Destination Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-xl" />)
        ) : destinations?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            لا توجد وجهات. أضف وجهة للبدء.
          </div>
        ) : (
          destinations?.map((dest) => (
            <Card
              key={dest.id}
              className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all group"
              data-testid={`card-destination-${dest.id}`}
            >
              <div className="aspect-video relative bg-muted flex items-center justify-center overflow-hidden">
                {dest.imageUrl ? (
                  <img
                    src={dest.imageUrl}
                    alt={dest.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <ImageIcon className="h-12 w-12 text-muted-foreground opacity-20" />
                )}
                <div className="absolute top-2 left-2">
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
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(dest)}
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="ml-2 h-4 w-4" /> حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {dest.price != null && (
                  <div className="absolute bottom-2 right-2">
                    <Badge className="bg-primary/90 text-primary-foreground text-xs font-bold px-2 py-1">
                      {dest.price.toLocaleString()} $
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg line-clamp-1">{dest.name}</h3>
                    <p className="text-muted-foreground text-sm font-medium mb-2">{dest.country}</p>
                  </div>
                  {dest.price != null && (
                    <div className="flex items-center gap-1 text-primary font-bold text-sm shrink-0">
                      <DollarSign className="h-3.5 w-3.5" />
                      {dest.price.toLocaleString()}
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{dest.description || 'لا يوجد وصف.'}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-[520px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingDest ? "تعديل الوجهة" : "إضافة وجهة جديدة"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الوجهة *</FormLabel>
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
              </div>

              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel>السعر الابتدائي (بالدولار)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pr-9"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                        data-testid="input-dest-price"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Image Upload Section */}
              <div className="space-y-2">
                <FormLabel>صورة الوجهة</FormLabel>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFile(file);
                    e.target.value = "";
                  }}
                />

                {imagePreview ? (
                  <div className="relative rounded-lg overflow-hidden border aspect-video bg-muted">
                    <img src={imagePreview} alt="معاينة" className="w-full h-full object-cover" />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                        <span className="text-white mr-2 text-sm">جارٍ الرفع...</span>
                      </div>
                    )}
                    {!isUploading && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 left-2 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3 w-3 ml-1" /> تغيير الصورة
                      </Button>
                    )}
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">اضغط لاختيار صورة من الجهاز</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP مدعوم</p>
                  </div>
                )}

                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">أو أدخل رابط الصورة مباشرة</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://..."
                        data-testid="input-dest-image"
                        onChange={(e) => {
                          field.onChange(e);
                          if (e.target.value) setImagePreview(e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف</FormLabel>
                  <FormControl><Textarea {...field} data-testid="input-dest-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>إلغاء</Button>
                <Button type="submit" disabled={createDest.isPending || updateDest.isPending || isUploading} data-testid="button-submit-destination">
                  {(createDest.isPending || updateDest.isPending) ? (
                    <><Loader2 className="h-4 w-4 ml-2 animate-spin" /> جارٍ الحفظ...</>
                  ) : editingDest ? "حفظ التغييرات" : "إنشاء الوجهة"}
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
            <AlertDialogTitle>تأكيد حذف الوجهة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف وجهة <strong>{deleteTarget?.name}</strong>؟
              لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDest.isPending ? "جارٍ الحذف..." : "نعم، احذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
