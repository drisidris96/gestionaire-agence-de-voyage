import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    setError("");
    setIsLoading(true);
    const result = await login(username.trim(), password);
    setIsLoading(false);
    if (!result.success) {
      setError(result.error ?? "حدث خطأ غير متوقع");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      dir="rtl"
      style={{
        background: "linear-gradient(135deg, hsl(25 15% 9%) 0%, hsl(25 10% 14%) 40%, hsl(43 30% 18%) 100%)",
      }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10" style={{ background: "hsl(43 73% 50%)", filter: "blur(80px)", transform: "translate(-30%, -30%)" }} />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10" style={{ background: "hsl(43 73% 50%)", filter: "blur(80px)", transform: "translate(30%, 30%)" }} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-5" style={{ background: "hsl(43 73% 70%)", filter: "blur(60px)", transform: "translate(-50%, -50%)" }} />

      <div className="w-full max-w-md px-4 z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-52 rounded-2xl overflow-hidden shadow-2xl mb-4" style={{ boxShadow: "0 0 40px rgba(201, 162, 39, 0.3)" }}>
            <img src="/logo.jpg" alt="شويعر للسياحة والأسفار" className="w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white mt-2">شويعر للسياحة والأسفار</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(43 73% 60%)" }}>برنامج تسيير الوكالات السياحية</p>
        </div>

        {/* Card */}
        <Card className="border-0 shadow-2xl" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(201,162,39,0.2)" }}>
          <CardHeader className="pb-2 pt-6 px-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-0.5 flex-1 rounded" style={{ background: "linear-gradient(to left, hsl(43 73% 44%), transparent)" }} />
              <Lock className="h-4 w-4" style={{ color: "hsl(43 73% 55%)" }} />
              <div className="h-0.5 flex-1 rounded" style={{ background: "linear-gradient(to right, hsl(43 73% 44%), transparent)" }} />
            </div>
            <p className="text-center text-sm" style={{ color: "hsl(40 20% 65%)" }}>أدخل بياناتك للدخول إلى النظام</p>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium" style={{ color: "hsl(40 20% 80%)" }}>
                  اسم المستخدم
                </Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(40 20% 50%)" }} />
                  <Input
                    id="username"
                    type="text"
                    placeholder="أدخل اسم المستخدم"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(""); }}
                    className="pr-10 text-right"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(201,162,39,0.25)",
                      color: "white",
                    }}
                    data-testid="input-username"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium" style={{ color: "hsl(40 20% 80%)" }}>
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(40 20% 50%)" }} />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="أدخل كلمة المرور"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    className="pr-10 pl-10 text-right"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(201,162,39,0.25)",
                      color: "white",
                    }}
                    data-testid="input-password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: "hsl(40 20% 70%)" }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg" style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", color: "#fca5a5" }}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full font-bold text-base h-11 mt-2"
                style={{ background: "linear-gradient(135deg, hsl(43 73% 44%) 0%, hsl(43 73% 52%) 100%)", color: "#1a1200" }}
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin ml-2" /> جارٍ التحقق...</>
                ) : (
                  "دخول إلى النظام"
                )}
              </Button>
            </form>

            {/* Footer hint */}
            <div className="mt-5 pt-4 border-t text-center text-xs" style={{ borderColor: "rgba(201,162,39,0.15)", color: "hsl(40 20% 45%)" }}>
              للحصول على بيانات الدخول تواصل مع مدير النظام
            </div>
          </CardContent>
        </Card>

        <p className="text-center mt-6 text-xs" style={{ color: "hsl(40 15% 35%)" }}>
          © {new Date().getFullYear()} شويعر للسياحة والأسفار — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
