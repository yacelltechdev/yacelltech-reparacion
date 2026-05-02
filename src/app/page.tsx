"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Lock } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push(user.role === "tech" ? "/dashboard/technician" : user.role === "caja" ? "/dashboard/inbox" : "/dashboard");
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Usuario o contraseña incorrectos");
        return;
      }

      login(username, data.role);
      toast.success(`¡Bienvenido de nuevo, ${username}!`);
      router.push(data.role === "tech" ? "/dashboard/technician" : data.role === "caja" ? "/dashboard/inbox" : "/dashboard");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 px-4">
      <div className="absolute top-0 right-0 p-8 text-4xl font-black text-slate-200/50 select-none">
        YACELLTECH
      </div>

      <Card className="w-full max-w-md overflow-hidden border-none shadow-2xl">
        <div className="h-2 bg-primary" />
        <CardHeader className="space-y-1 pt-8 text-center">
          <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <Image
              src="/logo.png"
              alt="Yacelltech Logo"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Acceso al Sistema</CardTitle>
          <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                placeholder="Ej: Oscar, Freddy..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border-slate-200 bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-slate-200 bg-slate-50"
                />
                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-8">
            <Button className="h-11 w-full font-bold" type="submit" disabled={isLoading}>
              {isLoading ? "Validando..." : "Entrar al Sistema"}
            </Button>
            <p className="text-center text-xs text-slate-500">© 2026 Yacelltech</p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
