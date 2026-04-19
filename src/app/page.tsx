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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Usuarios temporales solicitados por el USER
    const testUsers = {
      freddy: "1234",
      oscar: "1234",
      carlos: "1234",
      admin: "admin",
      caja: "1234"
    };

    const pass = (testUsers as any)[username.toLowerCase()];

    setTimeout(() => {
      if (pass && pass === password) {
        let role = "tech";
        if (username.toLowerCase() === "admin") role = "admin";
        if (username.toLowerCase() === "caja") role = "caja";
        
        login(username, role);
        toast.success(`¡Bienvenido de nuevo, ${username}!`);
        router.push(role === "tech" ? "/dashboard/technician" : role === "caja" ? "/dashboard/inbox" : "/dashboard");
      } else {
        toast.error("Usuario o contraseña incorrectos");
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 px-4">
      <div className="absolute top-0 right-0 p-8 text-4xl font-black text-slate-200/50 select-none">
        YACELLTECH
      </div>
      
      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden">
        <div className="h-2 bg-primary" />
        <CardHeader className="space-y-1 text-center pt-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center mb-2 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
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
                className="bg-slate-50 border-slate-200"
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
                  className="bg-slate-50 border-slate-200"
                />
                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-8">
            <Button className="w-full font-bold h-11" type="submit" disabled={isLoading}>
              {isLoading ? "Validando..." : "Entrar al Sistema"}
            </Button>
            <p className="text-center text-xs text-slate-500">
              © 2026 Yacelltech v2.0 Next.js Edition
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
