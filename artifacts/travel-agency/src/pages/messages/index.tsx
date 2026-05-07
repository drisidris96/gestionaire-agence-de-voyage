import { useState } from "react";
import { MessageSquare, Copy, CheckCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Template {
  id: string;
  title: string;
  category: "booking" | "payment" | "reminder" | "welcome" | "followup";
  text: string;
  placeholders: string[];
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  booking:   { label: "تأكيد حجز",    color: "bg-blue-100 text-blue-800" },
  payment:   { label: "مدفوعات",       color: "bg-green-100 text-green-800" },
  reminder:  { label: "تذكير",         color: "bg-amber-100 text-amber-800" },
  welcome:   { label: "ترحيب",         color: "bg-purple-100 text-purple-800" },
  followup:  { label: "متابعة",        color: "bg-gray-100 text-gray-700" },
};

const TEMPLATES: Template[] = [
  {
    id: "t1", category: "booking", title: "تأكيد الحجز",
    placeholders: ["اسم العميل", "اسم الباقة", "تاريخ الانطلاق", "السعر الإجمالي"],
    text: `السلام عليكم ورحمة الله وبركاته
عزيزي/ي [اسم العميل] 🌟

يسعدنا إبلاغكم بتأكيد حجزكم لدى وكالة شويعر للسياحة والأسفار.

📋 تفاصيل الحجز:
• الباقة: [اسم الباقة]
• تاريخ الانطلاق: [تاريخ الانطلاق]
• المبلغ الإجمالي: [السعر الإجمالي] $

للاستفسار أو أي معلومات إضافية، لا تترددوا في التواصل معنا.

رحلة سعيدة ومباركة 🙏
وكالة شويعر للسياحة والأسفار`,
  },
  {
    id: "t2", category: "payment", title: "تأكيد استلام الدفع",
    placeholders: ["اسم العميل", "المبلغ", "رقم الحجز"],
    text: `السلام عليكم
عزيزي/ي [اسم العميل] ✅

نؤكد استلام مبلغ [المبلغ] $ الخاص بحجزكم رقم [رقم الحجز].

شكراً لثقتكم بوكالة شويعر للسياحة والأسفار.
نتمنى لكم رحلة موفقة ومميزة 🌍`,
  },
  {
    id: "t3", category: "reminder", title: "تذكير بموعد الرحلة",
    placeholders: ["اسم العميل", "تاريخ الانطلاق", "ساعة الانطلاق", "مكان التجمع"],
    text: `السلام عليكم
عزيزي/ي [اسم العميل] ⏰

تذكير بأن موعد رحلتكم:
📅 التاريخ: [تاريخ الانطلاق]
⏰ الساعة: [ساعة الانطلاق]
📍 مكان التجمع: [مكان التجمع]

يُرجى الحضور قبل الموعد بـ 30 دقيقة.
نتطلع إلى رحلة ممتعة معكم 😊

وكالة شويعر للسياحة والأسفار`,
  },
  {
    id: "t4", category: "reminder", title: "تذكير بسداد المبلغ المتبقي",
    placeholders: ["اسم العميل", "المبلغ المتبقي", "تاريخ الاستحقاق"],
    text: `السلام عليكم
عزيزي/ي [اسم العميل]

نود تذكيركم بأن المبلغ المتبقي من حجزكم يبلغ: [المبلغ المتبقي] $

تاريخ الاستحقاق: [تاريخ الاستحقاق]

يُرجى التكرم بتسديد المبلغ في أقرب وقت لضمان الحجز.
لأي استفسار تواصلوا معنا.

شكراً لتعاملكم 🙏
وكالة شويعر للسياحة والأسفار`,
  },
  {
    id: "t5", category: "welcome", title: "ترحيب بعميل جديد",
    placeholders: ["اسم العميل"],
    text: `السلام عليكم ورحمة الله
عزيزي/ي [اسم العميل] 🌟

أهلاً وسهلاً بكم في عائلة وكالة شويعر للسياحة والأسفار!

نحن سعداء بانضمامكم إلينا، وسنكون دائماً في خدمتكم لتوفير أفضل الرحلات وأجملها.

لا تترددوا في التواصل معنا في أي وقت.

وكالة شويعر للسياحة والأسفار 🌍✈️`,
  },
  {
    id: "t6", category: "followup", title: "متابعة بعد العودة من الرحلة",
    placeholders: ["اسم العميل", "اسم الرحلة"],
    text: `السلام عليكم
عزيزي/ي [اسم العميل] 😊

نتمنى أن تكونوا وصلتم بالسلامة من رحلة [اسم الرحلة].

يسعدنا معرفة رأيكم وتقييمكم للخدمة المقدمة، رأيكم يهمنا لتحسين خدماتنا.

نتطلع إلى رؤيتكم في رحلات قادمة إن شاء الله 🌟

وكالة شويعر للسياحة والأسفار`,
  },
  {
    id: "t7", category: "booking", title: "عرض سياحي خاص",
    placeholders: ["اسم العميل", "اسم العرض", "السعر", "تاريخ انتهاء العرض"],
    text: `السلام عليكم
عزيزي/ي [اسم العميل] 🎉

يسعدنا تقديم عرض خاص لكم:

🌟 [اسم العرض]
💰 السعر المميز: [السعر] $
⏳ العرض ساري حتى: [تاريخ انتهاء العرض]

لا تفوتوا هذه الفرصة الرائعة! تواصلوا معنا الآن لتأكيد الحجز.

وكالة شويعر للسياحة والأسفار ✈️`,
  },
  {
    id: "t8", category: "followup", title: "طلب التقييم",
    placeholders: ["اسم العميل"],
    text: `السلام عليكم
عزيزي/ي [اسم العميل]

شكراً لاختياركم وكالة شويعر للسياحة والأسفار 🙏

نرجو منكم تقييم خدماتنا والتعبير عن رأيكم، فرأيكم يساعدنا على التطوير والتحسين المستمر.

نشكر لكم وقتكم الثمين ونتطلع إلى خدمتكم مجدداً.

وكالة شويعر للسياحة والأسفار`,
  },
];

function TemplateCard({ t }: { t: Template }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(t.text);
    setCopied(true);
    toast({ title: "تم نسخ الرسالة" });
    setTimeout(() => setCopied(false), 2000);
  };

  const cat = CATEGORIES[t.category];

  return (
    <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{t.title}</h3>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
              {t.placeholders.map(p => (
                <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">[{p}]</span>
              ))}
            </div>
          </div>
          <Button variant={copied ? "default" : "outline"} size="sm" onClick={copy} className="gap-1.5 shrink-0">
            {copied ? <><CheckCheck className="h-3.5 w-3.5" /> تم النسخ</> : <><Copy className="h-3.5 w-3.5" /> نسخ</>}
          </Button>
        </div>
      </div>
      <div className="p-4">
        <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed" dir="rtl">{t.text}</pre>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = TEMPLATES.filter(t => {
    const matchCat = tab === "all" || t.category === tab;
    const matchSearch = !search || t.title.includes(search) || t.text.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">رسائل العملاء</h1>
          <p className="text-muted-foreground mt-1">قوالب رسائل جاهزة للتواصل مع العملاء عبر واتساب أو SMS.</p>
        </div>
        <Badge variant="outline" className="text-sm gap-2">
          <MessageSquare className="h-4 w-4" /> {TEMPLATES.length} قالب
        </Badge>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>كيفية الاستخدام:</strong> انسخ الرسالة المناسبة بزر "نسخ"، ثم استبدل الكلمات بين الأقواس [] بالمعلومات الحقيقية للعميل.
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input placeholder="🔍 بحث في الرسائل..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">الكل ({TEMPLATES.length})</TabsTrigger>
          {Object.entries(CATEGORIES).map(([k, { label }]) => (
            <TabsTrigger key={k} value={k}>{label} ({TEMPLATES.filter(t => t.category === k).length})</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>لا توجد قوالب مطابقة.</p>
              </div>
            ) : filtered.map(t => <TemplateCard key={t.id} t={t} />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
