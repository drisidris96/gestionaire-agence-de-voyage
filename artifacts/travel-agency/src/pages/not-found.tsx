import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="bg-primary/10 p-6 rounded-full">
        <MapPin className="h-12 w-12 text-primary opacity-50" />
      </div>
      <div>
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground mt-2">الصفحة غير موجودة</p>
        <p className="text-sm text-muted-foreground mt-1">تعذّر العثور على الصفحة التي تبحث عنها.</p>
      </div>
      <Button asChild>
        <Link href="/">العودة إلى لوحة القيادة</Link>
      </Button>
    </div>
  );
}
