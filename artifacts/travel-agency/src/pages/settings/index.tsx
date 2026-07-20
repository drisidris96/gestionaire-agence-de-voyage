import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAgency, AGENCY_QUERY_KEY, type AgencySettings } from "@/hooks/use-agency";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Phone, Mail, MapPin, Globe, Image as ImageIcon,
  Upload, Loader2, Shield, Lock, CheckCircle2, Banknote
} from "lucide-react";

const agencySchema = z.object({
  agencyName: z.string().min(2, "اسم الوكالة مطلوب"),
  agencyNameEn: z.string().min(2, "الاسم بالإنجليزية مطلوب"),
  agencyPhone: z.string().optional(),
  agencyEmail: z.union([z.string().email("بريد إلكتروني غير صحيح"), z.literal(""), z.undefined()]).optional(),
  agencyAddress: z.string().optional(),
  agencyLogoUrl: z.string().optional(),
  payrollDay: z.coerce.number().min(1).max(31).optional().nullable(),
});
type AgencyFormValues = z.infer<typeof agencySchema>;

async function uploadLogoToStorage(file: File): Promise<string> {
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
  if (!uploadRes.ok) throw new Error("فشل رفع الشعار");
  return `/api/storage${objectPath}`;
}

export default function SettingsPage() {
  const { username } = useAuth();
  const { settings, isLoading } = useAgency();
  const isAdmin = username === "admin";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AgencyFormValues>({
    resolver: zodResolver(agencySchema),
    values: {
      agencyName: settings.agencyName,
      agencyNameEn: settings.agencyNameEn,
      agencyPhone: settings.agencyPhone ?? "",
      agencyEmail: settings.agencyEmail ?? "",
      agencyAddress: settings.agencyAddress ?? "",
      agencyLogoUrl: settings.agencyLogoUrl ?? "",
      payrollDay: settings.payrollDay ?? null,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<AgencySettings>) =>
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENCY_QUERY_KEY });
      toast({ title: "تم حفظ الإعدادات بنجاح" });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: () => {
      toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" });
    },
  });

  const handleLogoFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "يُسمح فقط بملفات الصور", variant: "destructive" });
      return;
    }
    setLogoPreview(URL.createObjectURL(file));
    setIsUploading(true);
    try {
      const url = await uploadLogoToStorage(file);
      form.setValue("agencyLogoUrl", url);
      toast({ title: "تم رفع الشعار بنجاح" });
    } catch {
      toast({ title: "فشل رفع الشعار، حاول مرة أخرى", variant: "destructive" });
      setLogoPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (data: AgencyFormValues) => {
    mutation.mutate(data as Partial<AgencySettings>);
  };

  const currentLogo = logoPreview || settings.agencyLogoUrl || "/logo.jpg";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">الإعدادات</h1>
          <p className="text-muted-foreground mt-1">إدارة هوية الوكالة ومعلومات التواصل.</p>
        </div>
        {isAdmin ? (
          <Badge className="gap-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
            <Shield className="h-3.5 w-3.5" /> صلاحيات المدير
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1.5">
            <Lock className="h-3.5 w-3.5" /> عرض فقط
          </Badge>
        )}
      </div>

      {/* Read-only notice for non-admin */}
      {!isAdmin && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <Lock className="h-4 w-4 shrink-0" />
          <span>يمكنك عرض إعدادات الوكالة فقط. تواصل مع حساب <strong>admin</strong> لتعديلها.</span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Agency Identity Card */}
          <Card className="border-none shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" /> هوية الوكالة
              </CardTitle>
              <CardDescription>
                {isAdmin ? "اسم الوكالة وشعارها يظهران في جميع المستندات والواجهة." : "بيانات الوكالة الرسمية."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="space-y-3">
                  {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <>
                  {/* Logo Section */}
                  <div className="space-y-3">
                    <FormLabel className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> شعار الوكالة</FormLabel>
                    <div className="flex items-start gap-5">
                      {/* Logo Preview */}
                      <div className="relative w-32 h-32 rounded-xl border-2 border-dashed overflow-hidden bg-muted flex items-center justify-center shrink-0"
                        style={isAdmin ? { borderColor: "#C9A227", cursor: "pointer" } : {}}
                        onClick={() => isAdmin && fileInputRef.current?.click()}>
                        <img
                          src={currentLogo}
                          alt="شعار الوكالة"
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/logo.jpg"; }}
                        />
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                            <span className="text-white text-[10px]">جارٍ الرفع...</span>
                          </div>
                        )}
                        {isAdmin && !isUploading && (
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                            <Upload className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex-1 space-y-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoFile(file);
                              e.target.value = "";
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            <Upload className="h-4 w-4" />
                            رفع شعار جديد
                          </Button>
                          <p className="text-xs text-muted-foreground">اضغط على الشعار أو الزر لرفع صورة من الجهاز أو الهاتف. PNG, JPG, SVG مدعوم.</p>

                          <FormField control={form.control} name="agencyLogoUrl" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">أو أدخل رابط الشعار</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="https://..."
                                  className="h-8 text-xs"
                                  data-testid="input-logo-url"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    if (e.target.value) setLogoPreview(e.target.value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="agencyName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> اسم الوكالة (عربي) *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isAdmin} data-testid="input-agency-name"
                            className={!isAdmin ? "bg-muted cursor-not-allowed" : ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="agencyNameEn" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Agency Name (English) *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isAdmin} dir="ltr" data-testid="input-agency-name-en"
                            className={!isAdmin ? "bg-muted cursor-not-allowed" : ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="agencyPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> رقم الهاتف</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isAdmin} dir="ltr" data-testid="input-agency-phone"
                            className={!isAdmin ? "bg-muted cursor-not-allowed" : ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="agencyEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> البريد الإلكتروني</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} disabled={!isAdmin} dir="ltr" data-testid="input-agency-email"
                            className={!isAdmin ? "bg-muted cursor-not-allowed" : ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="agencyAddress" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> العنوان</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isAdmin} data-testid="input-agency-address"
                            className={!isAdmin ? "bg-muted cursor-not-allowed" : ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="payrollDay" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><Banknote className="h-3.5 w-3.5" /> يوم صرف الرواتب (1-31)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={31}
                            placeholder="مثال: 30"
                            disabled={!isAdmin}
                            className={!isAdmin ? "bg-muted cursor-not-allowed" : ""}
                            value={field.value ?? ""}
                            onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <Button
                        type="submit"
                        disabled={mutation.isPending || isUploading}
                        data-testid="button-save-settings"
                        className="gap-2"
                      >
                        {mutation.isPending ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ الحفظ...</>
                        ) : saved ? (
                          <><CheckCircle2 className="h-4 w-4" /> تم الحفظ</>
                        ) : (
                          "حفظ التغييرات"
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        تُطبَّق التغييرات فوراً على الشريط الجانبي وجميع المستندات المطبوعة.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* Live Preview */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>معاينة رأس المستند</CardTitle>
          <CardDescription>هكذا سيظهر اسم وشعار الوكالة في الفواتير ووصولات الاستلام.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl p-5 bg-white">
            <div className="flex items-center justify-between border-b-2 pb-4" style={{ borderColor: "#C9A227" }}>
              <div className="flex items-center gap-3">
                <img
                  src={currentLogo}
                  alt="شعار"
                  className="h-16 w-auto object-contain rounded"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/logo.jpg"; }}
                />
                <div>
                  <div className="text-lg font-black" style={{ color: "#C9A227" }}>
                    {form.watch("agencyName") || settings.agencyName}
                  </div>
                  <div className="text-xs tracking-widest text-gray-500 uppercase">
                    {form.watch("agencyNameEn") || settings.agencyNameEn}
                  </div>
                  {form.watch("agencyPhone") && (
                    <div className="text-xs text-gray-500 mt-1">{form.watch("agencyPhone")}</div>
                  )}
                  {form.watch("agencyEmail") && (
                    <div className="text-xs text-gray-500">{form.watch("agencyEmail")}</div>
                  )}
                </div>
              </div>
              <div className="border-2 rounded-lg px-4 py-2 text-center" style={{ borderColor: "#C9A227" }}>
                <div className="text-xs font-bold" style={{ color: "#C9A227" }}>فـاتـورة</div>
                <div className="text-[10px] text-gray-400">INV-0001</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
