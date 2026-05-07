import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">إدارة تفضيلات الوكالة وإعدادات النظام.</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>بيانات الوكالة</CardTitle>
            <CardDescription>تحديث معلومات شركتك وبيانات التواصل.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agency-name">اسم الوكالة</Label>
                <Input id="agency-name" defaultValue="أطلس للسياحة - Atlas Travel" data-testid="input-agency-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">البريد الإلكتروني</Label>
                <Input id="contact-email" type="email" defaultValue="hello@atlastravel.com" data-testid="input-agency-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف الرئيسي</Label>
                <Input id="phone" defaultValue="+971 50 123 4567" data-testid="input-agency-phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">العملة الافتراضية</Label>
                <Select defaultValue="usd">
                  <SelectTrigger id="currency" data-testid="select-currency">
                    <SelectValue placeholder="اختر العملة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">دولار أمريكي (USD $)</SelectItem>
                    <SelectItem value="eur">يورو (EUR €)</SelectItem>
                    <SelectItem value="aed">درهم إماراتي (AED)</SelectItem>
                    <SelectItem value="sar">ريال سعودي (SAR)</SelectItem>
                    <SelectItem value="dzd">دينار جزائري (DZD)</SelectItem>
                    <SelectItem value="mad">درهم مغربي (MAD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="mt-4" data-testid="button-save-settings">حفظ التغييرات</Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>التفضيلات</CardTitle>
            <CardDescription>تخصيص طريقة عمل وعرض التطبيق.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">إشعارات البريد الإلكتروني</Label>
                <p className="text-sm text-muted-foreground">استقبال ملخص يومي للحجوزات الجديدة.</p>
              </div>
              <Switch defaultChecked data-testid="switch-notifications" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">واجهة عربية (RTL)</Label>
                <p className="text-sm text-muted-foreground">فرض تخطيط اليمين إلى اليسار لجميع المستخدمين.</p>
              </div>
              <Switch defaultChecked data-testid="switch-rtl" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">تأكيد تلقائي عند اكتمال الدفع</Label>
                <p className="text-sm text-muted-foreground">تحديث حالة الحجز تلقائيًا عند سداد المبلغ كاملًا.</p>
              </div>
              <Switch defaultChecked data-testid="switch-auto-confirm" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
