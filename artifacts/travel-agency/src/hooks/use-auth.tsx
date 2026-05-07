import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const ADMIN_CREDENTIALS = [
  { username: "admin", password: "Admin@2024" },
  { username: "chouiaar", password: "Chouiaar@2024" },
];

const AUTH_KEY = "chouiaar_auth";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      try {
        const { user, expiry } = JSON.parse(stored);
        if (expiry > Date.now()) {
          setIsAuthenticated(true);
          setUsername(user);
        } else {
          localStorage.removeItem(AUTH_KEY);
        }
      } catch {
        localStorage.removeItem(AUTH_KEY);
      }
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise(r => setTimeout(r, 600));
    const match = ADMIN_CREDENTIALS.find(c => c.username === username && c.password === password);
    if (match) {
      const expiry = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
      localStorage.setItem(AUTH_KEY, JSON.stringify({ user: username, expiry }));
      setIsAuthenticated(true);
      setUsername(username);
      return { success: true };
    }
    return { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
