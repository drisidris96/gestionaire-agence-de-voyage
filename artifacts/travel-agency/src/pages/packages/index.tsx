import { useState } from "react";
import { 
  useListPackages, useCreatePackage, useUpdatePackage, useDeletePackage, getListPackagesQueryKey,
  useListDestinations
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, MoreHorizontal, Pencil, Trash, Clock, MapPin, DollarSign, Image as ImageIcon } from "lucide-react";
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
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const packageSchema = z.object({
  name: z.string().min(2, "Name is required"),
  destinationId: z.coerce.number().min(1, "Destination is required"),
  durationDays: z.coerce.number().min(1, "Duration must be at least 1 day"),
  pricePerPerson: z.coerce.number().min(0, "Price must be positive"),
  description: z.string().optional(),
  includes: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  isActive: z.boolean().default(true)
});

type PackageFormValues = z.infer<typeof packageSchema>;

export default function PackagesPage() {
  const [filterDestId, setFilterDestId] = useState<string>("all");
  const { data: packages, isLoading } = useListPackages(
    filterDestId !== "all" ? { destinationId: parseInt(filterDestId, 10) } : {}
  );
  const { data: destinations } = useListDestinations();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const deletePackage = useDeletePackage();

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: "",
      destinationId: 0,
      durationDays: 7,
      pricePerPerson: 0,
      description: "",
      includes: "",
      imageUrl: "",
      isActive: true
    }
  });

  const onSubmit = (data: PackageFormValues) => {
    if (editingPackage) {
      updatePackage.mutate({ id: editingPackage.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
          toast({ title: "Package updated" });
          setIsAddOpen(false);
          setEditingPackage(null);
        }
      });
    } else {
      createPackage.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
          toast({ title: "Package created" });
          setIsAddOpen(false);
          form.reset();
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this package?")) {
      deletePackage.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
          toast({ title: "Package deleted" });
        }
      });
    }
  };

  const openEdit = (pkg: any) => {
    setEditingPackage(pkg);
    form.reset({
      name: pkg.name,
      destinationId: pkg.destinationId,
      durationDays: pkg.durationDays,
      pricePerPerson: pkg.pricePerPerson,
      description: pkg.description || "",
      includes: pkg.includes || "",
      imageUrl: pkg.imageUrl || "",
      isActive: pkg.isActive
    });
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Packages (البرامج السياحية)</h1>
          <p className="text-muted-foreground mt-1">Manage travel packages and pricing.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={filterDestId} onValueChange={setFilterDestId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Destinations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Destinations</SelectItem>
              {destinations?.map(d => (
                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              setEditingPackage(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Package</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingPackage ? "Edit Package" : "Add New Package"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Package Name *</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <FormField control={form.control} name="destinationId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : undefined}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select Destination" /></SelectTrigger>
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
                        <FormLabel>Duration (Days) *</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="pricePerPerson" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Per Person ($) *</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="imageUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl><Input {...field} placeholder="https://..." /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <FormField control={form.control} name="includes" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Includes (What's included)</FormLabel>
                        <FormControl><Textarea {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createPackage.isPending || updatePackage.isPending}>
                      {editingPackage ? "Save Changes" : "Create Package"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-[380px] w-full rounded-xl" />
          ))
        ) : packages?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            No packages found.
          </div>
        ) : (
          packages?.map((pkg) => (
            <Card key={pkg.id} className="flex flex-col overflow-hidden border-none shadow-sm hover:shadow-md transition-all group">
              <div className="aspect-video relative bg-muted flex items-center justify-center overflow-hidden">
                {pkg.imageUrl ? (
                  <img src={pkg.imageUrl} alt={pkg.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <ImageIcon className="h-12 w-12 text-muted-foreground opacity-20" />
                )}
                <div className="absolute top-2 left-2">
                  <Badge variant={pkg.isActive ? "default" : "secondary"}>
                    {pkg.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8 shadow-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(pkg)} className="cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(pkg.id)} className="text-destructive focus:text-destructive cursor-pointer">
                        <Trash className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardContent className="p-4 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg line-clamp-1 flex-1 pr-2">{pkg.name}</h3>
                  <div className="font-bold text-primary flex items-center shrink-0">
                    <DollarSign className="h-4 w-4" />
                    {pkg.pricePerPerson}
                  </div>
                </div>
                <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {pkg.destinationName}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {pkg.durationDays} Days
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{pkg.description || 'No description provided.'}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}