import { useState, useRef } from "react";
import {
  useListPackages, useCreatePackage, useUpdatePackage, useDeletePackage, getListPackagesQueryKey,
  useListDestinations
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, MoreHorizontal, Pencil, Trash2, Clock, MapPin, DollarSign, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const packageSchema = z.object({
  name: z.string().min(2, "اسم الباقة مطلوب"),
  destinationId: z.coerce.number().min(1, "الوجهة مطلوبة"),
  durationDays: z.coerce.number().min(1, "المدة يجب أن تكون يوم واحد على الأقل"),
  pricePerPerson: z.coerce.number().min(0, "السعر يجب أن يكون موجبًا"),
  description: z.string().optional(),
  includes: z.string().optional(),
  imageUrl: z.string().url("يجب أن يكون رابطًا صحيحًا").or(z.literal("")).optional(),
  isActive: z.boolean().default(true),
});

type PackageFormValues = z.infer<typeof packageSchema>;

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

export default function PackagesPage() {
  const [filterDestId, setFilterDestId] = useState<string>("all");
  const { data: packages, isLoading } = useListPackages(
    filterDestId !== "all" ? { destinationId: parseInt(filterDestId, 10) } : {}
  );
  const { data: destinations } = useListDestinations();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const deletePackage = useDeletePackage();

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: { name: "", destinationId: 0, durationDays: 7, pricePerPerson: 0, description: "", includes: "", imageUrl: "", isActive: true },
  });

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "يُسمح فقط بملفات الصور", variant: "destructive" });
      return;
    }
    setImagePreview(URL.createObjectURL(file));
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

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingPackage(null);
    setImagePreview(null);
    form.reset({ name: "", destinationId: 0, durationDays: 7, pricePerPerson: 0, description: "", includes: "", imageUrl: "", isActive: true });
  };

  const openEdit = (pkg: any) => {
    setEditingPackage(pkg);
    setImagePreview(pkg.imageUrl || null);
    form.reset({
      name: pkg.name, destinationId: pkg.destinationId, durationDays: pkg.durationDays,
      pricePerPerson: pkg.pricePerPerson, description: pkg.description || "",
      includes: pkg.includes || "", imageUrl: pkg.imageUrl || "", isActive: pkg.isActive,
    });
    setIsFormOpen(true);
  };

  const onSubmit = (data: PackageFormValues) => {
    if (editingPackage) {
      updatePackage.mutate({ id: editingPackage.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
          toast({ title: "تم تحديث الباقة بنجاح" });
          closeForm();
        },
      });
    } else {
      createPackage.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
          toast({ title: "تمت إضافة الباقة" });
          closeForm();
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePackage.mutate({ id: deleteTarget.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
        toast({ title: "تم حذف الباقة" });
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">الباقات السياحية</h1>
          <p className="text-muted-foreground mt-1">إدارة الباقات السياحية وأسعارها.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={filterDestId} onValueChange={setFilterDestId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="كل الوجهات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الوجهات</SelectItem>
              {destinations?.map(d => (
                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsFormOpen(true)} data-testid="button-add-package">
            <Plus className="ml-2 h-4 w-4" /> إضافة باقة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-[380px] w-full rounded-xl" />)
        ) : packages?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">لا توجد باقات.</div>
        ) : (
          packages?.map((pkg) => (
            <Card key={pkg.id} className="flex flex-col overflow-hidden border-none shadow-sm hover:shadow-md transition-all group" data-testid={`card-package-${pkg.id}`}>
              <div className="aspect-video relative bg-muted flex items-center justify-center overflow-hidden">
                {pkg.imageUrl ? (
                  <img src={pkg.imageUrl} alt={pkg.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <ImageIcon className="h-12 w-12 text-muted-foreground opacity-20" />
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant={pkg.isActive ? "default" : "secondary"}>{pkg.isActive ? 'نشطة' : 'موقوفة'}</Badge>
                </div>
                <div className="absolute top-2 left-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8 shadow-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => openEdit(pkg)} className="cursor-pointer">
                        <Pencil className="ml-2 h-4 w-4" /> تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteTarget(pkg)} className="text-destructive focus:text-destructive cursor-pointer">
                        <Trash2 className="ml-2 h-4 w-4" /> حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardContent className="p-4 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg line-clamp-1 flex-1 pl-2">{pkg.name}</h3>
                  <div className="font-bold text-primary flex items-center shrink-0">
                    <DollarSign className="h-4 w-4" />{pkg.pricePerPerson.toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{pkg.destinationName}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{pkg.durationDays} يوم</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{pkg.description || 'لا يوجد وصف.'}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingPackage ? "تعديل الباقة" : "إضافة باقة جديدة"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>اسم الباقة *</FormLabel>
                    <FormControl><Input {...field} data-testid="input-package-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="destinationId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوجهة *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-destination"><SelectValue placeholder="اختر الوجهة" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {destinations?.map(d => (
                          <SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.country})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="durationDays" render={({ field }) => (
                  <FormItem>
                    <FormLabel>المدة (أيام) *</FormLabel>
                    <FormControl><Input type="number" min="1" {...field} data-testid="input-duration" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="pricePerPerson" render={({ field }) => (
                  <FormItem>
                    <FormLabel>السعر للشخص ($) *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" step="0.01" min="0" {...field} className="pr-9" data-testid="input-price" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة الباقة</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "true")} value={field.value ? "true" : "false"}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="true">نشطة</SelectItem>
                        <SelectItem value="false">موقوفة</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <FormLabel>صورة الباقة</FormLabel>
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
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                        <span className="text-white text-sm">جارٍ الرفع...</span>
                      </div>
                    )}
                    {!isUploading && (
                      <Button type="button" variant="secondary" size="sm" className="absolute bottom-2 left-2 text-xs" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-3 w-3 ml-1" /> تغيير الصورة
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">اضغط لاختيار صورة من الجهاز</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP مدعوم</p>
                  </div>
                )}
                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">أو أدخل رابط الصورة مباشرة</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." data-testid="input-package-image"
                        onChange={(e) => { field.onChange(e); if (e.target.value) setImagePreview(e.target.value); }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف</FormLabel>
                  <FormControl><Textarea {...field} data-testid="input-package-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="includes" render={({ field }) => (
                <FormItem>
                  <FormLabel>ما تشمله الباقة</FormLabel>
                  <FormControl><Textarea {...field} placeholder="فندق 5 نجوم، وجبات، نقل مطار..." data-testid="input-package-includes" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>إلغاء</Button>
                <Button type="submit" disabled={createPackage.isPending || updatePackage.isPending || isUploading} data-testid="button-submit-package">
                  {(createPackage.isPending || updatePackage.isPending) ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جارٍ الحفظ...</> : editingPackage ? "حفظ التغييرات" : "إنشاء الباقة"}
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
            <AlertDialogTitle>تأكيد حذف الباقة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف باقة <strong>{deleteTarget?.name}</strong>؟ لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletePackage.isPending ? "جارٍ الحذف..." : "نعم، احذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
