import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAgency, AGENCY_QUERY_KEY, type AgencySettings } from "@/hooks/use-agency";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Phone, Mail, MapPin, Globe, Image as ImageIcon,
  Upload, Loader2, Shield, Lock, CheckCircle2, Banknote
} from "lucide-react";

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

  // Simple controlled form state
  const [agencyName, setAgencyName] = useState("");
  const [agencyNameEn, setAgencyNameEn] = useState("");
  const [agencyPhone, setAgencyPhone] = useState("");
  const [agencyEmail, setAgencyEmail] = useState("");
  const [agencyAddress, setAgencyAddress] = useState("");
  const [agencyLogoUrl, setAgencyLogoUrl] = useState("");
  const [payrollDay, setPayrollDay] = useState<string>("");

  // Sync from settings once loaded
  useEffect(() => {
    if (!isLoading) {
      setAgencyName(settings.agencyName ?? "");
      setAgencyNameEn(settings.agencyNameEn ?? "");
      setAgencyPhone(settings.agencyPhone ?? "");
      setAgencyEmail(settings.agencyEmail ?? "");
      setAgencyAddress(settings.agencyAddress ?? "");
      setAgencyLogoUrl(settings.agencyLogoUrl ?? "");
      setPayrollDay(settings.payrollDay != null ? String(settings.payrollDay) : "");
    }
  }, [isLoading, settings]);

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
      setAgencyLogoUrl(url);
      toast({ title: "تم رفع الشعار بنجاح" });
    } catch {
      toast({ title: "فشل رفع الشعار، حاول مرة أخرى", variant: "destructive" });
      setLogoPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const day = payrollDay !== "" ? parseInt(payrollDay, 10) : null;
    mutation.mutate({
      agencyName,
      agencyNameEn,
      agencyPhone,
      agencyEmail,
      agencyAddress,
      agencyLogoUrl,
      payrollDay: day && !isNaN(day) && day >= 1 && day <= 31 ? day : null,
    } as Partial<AgencySettings>);
  };

  const currentLogo = logoPreview || agencyLogoUrl || settings.agencyLogoUrl || "/logo.jpg";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
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

      {!isAdmin && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <Lock className="h-4 w-4 shrink-0" />
          <span>يمكنك عرض إعدادات الوكالة فقط. تواصل مع حساب <strong>admin</strong> لتعديلها.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
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
            {/* Logo Section */}
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium leading-none">
                <ImageIcon className="h-4 w-4" /> شعار الوكالة
              </p>
              <div className="flex items-start gap-5">
                <div
                  className="relative w-32 h-32 rounded-xl border-2 border-dashed overflow-hidden bg-muted flex items-center justify-center shrink-0"
                  style={isAdmin ? { borderColor: "#C9A227", cursor: "pointer" } : {}}
                  onClick={() => isAdmin && fileInputRef.current?.click()}
                >
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
                </div>

                {isAdmin && (
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
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
                    <p className="text-xs text-muted-foreground">PNG، JPG، SVG مدعوم.</p>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">أو أدخل رابط الشعار</Label>
                      <Input
                        value={agencyLogoUrl}
                        onChange={e => { setAgencyLogoUrl(e.target.value); if (e.target.value) setLogoPreview(e.target.value); }}
                        placeholder="https://..."
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> اسم الوكالة (عربي) *</Label>
                <Input value={agencyName} onChange={e => setAgencyName(e.target.value)} disabled={!isAdmin} className={!isAdmin ? "bg-muted cursor-not-allowed" : ""} />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Agency Name (English) *</Label>
                <Input value={agencyNameEn} onChange={e => setAgencyNameEn(e.target.value)} disabled={!isAdmin} dir="ltr" className={!isAdmin ? "bg-muted cursor-not-allowed" : ""} />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> رقم الهاتف</Label>
                <Input value={agencyPhone} onChange={e => setAgencyPhone(e.target.value)} disabled={!isAdmin} dir="ltr" className={!isAdmin ? "bg-muted cursor-not-allowed" : ""} />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> البريد الإلكتروني</Label>
                <Input type="email" value={agencyEmail} onChange={e => setAgencyEmail(e.target.value)} disabled={!isAdmin} dir="ltr" className={!isAdmin ? "bg-muted cursor-not-allowed" : ""} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> العنوان</Label>
                <Input value={agencyAddress} onChange={e => setAgencyAddress(e.target.value)} disabled={!isAdmin} className={!isAdmin ? "bg-muted cursor-not-allowed" : ""} />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-2"><Banknote className="h-3.5 w-3.5" /> يوم صرف الرواتب (1-31)</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="مثال: 30"
                  value={payrollDay}
                  onChange={e => setPayrollDay(e.target.value)}
                  disabled={!isAdmin}
                  className={!isAdmin ? "bg-muted cursor-not-allowed" : ""}
                />
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-3 pt-2 border-t">
                <Button type="submit" disabled={mutation.isPending || isUploading} className="gap-2">
                  {mutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ الحفظ...</>
                  ) : saved ? (
                    <><CheckCircle2 className="h-4 w-4" /> تم الحفظ</>
                  ) : (
                    "حفظ التغييرات"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">تُطبَّق التغييرات فوراً على الشريط الجانبي وجميع المستندات.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </form>

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
                    {agencyName || settings.agencyName}
                  </div>
                  <div className="text-xs tracking-widest text-gray-500 uppercase">
                    {agencyNameEn || settings.agencyNameEn}
                  </div>
                  {agencyPhone && <div className="text-xs text-gray-500 mt-1">{agencyPhone}</div>}
                  {agencyEmail && <div className="text-xs text-gray-500">{agencyEmail}</div>}
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
