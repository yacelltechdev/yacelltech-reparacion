"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import {
  LayoutDashboard,
  Inbox,
  Wrench,
  History,
  BarChart3,
  LogOut,
  Smartphone,
  KeyRound,
  User as UserIcon,
  BadgeDollarSign,
  Settings,
  ShieldCheck,
  Bell,
  MessageCircle,
  ClipboardList,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { Repair } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [entregaRecepcionCount, setEntregaRecepcionCount] = useState(0);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error("Las contraseñas no coinciden"); return; }
    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user?.username, currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Error al cambiar contraseña"); return; }
      toast.success("Contraseña actualizada correctamente");
      setChangePwOpen(false);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setPwLoading(false);
    }
  };

  useEffect(() => {
    // Protección de rutas simple
    const saved = localStorage.getItem('yacell_auth');
    if (!saved && !user) {
      router.push("/");
    }
  }, [user, router]);

  // Cerrar el sheet "Más" cuando cambia la ruta
  useEffect(() => {
    setMoreSheetOpen(false);
  }, [pathname]);

  // Polling del contador de equipos en "Entregado a recepción" para el badge
  // del sidebar. Solo activo para roles que ven la Bandeja (admin/caja).
  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "caja")) return;
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/repairs?status=" + encodeURIComponent("Entregado a recepción"));
        const data: Repair[] = await res.json();
        setEntregaRecepcionCount(Array.isArray(data) ? data.length : 0);
      } catch {
        // Silencioso: el badge solo es informativo
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 8000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard", roles: ["admin"] },
    { name: "Recepción", icon: Smartphone, path: "/dashboard/new", roles: ["admin", "caja"] },
    { name: "Bandeja", icon: Inbox, path: "/dashboard/inbox", roles: ["admin", "caja"] },
    { name: "Taller", icon: Wrench, path: "/dashboard/technician", roles: ["admin", "tech"] },
    { name: "Historial", icon: History, path: "/dashboard/history", roles: ["admin", "caja", "tech"] },
    { name: "Cuadre", icon: BarChart3, path: "/dashboard/report", roles: ["admin", "caja"] },
    { name: "Avisos Retiro", icon: Bell, path: "/dashboard/avisos-retiro", roles: ["admin", "caja"] },
    { name: "Seguimiento", icon: MessageCircle, path: "/dashboard/seguimiento-clientes", roles: ["admin", "caja"] },
    { name: "Pago Técnico", icon: BadgeDollarSign, path: "/dashboard/cuadre-tecnico", roles: ["admin"] },
    { name: "Inventario Técnicos", icon: ClipboardList, path: "/dashboard/inventario-tecnicos", roles: ["admin"] },
    { name: "Auditoría", icon: ShieldCheck, path: "/dashboard/auditoria", roles: ["admin"] },
    { name: "Admin", icon: Settings, path: "/dashboard/admin", roles: ["admin"] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 border-r bg-white lg:block">
        <div className="flex h-16 items-center border-b px-6 gap-2">
          <Image src="/logo.png" alt="Logo" width={32} height={32} />
          <span className="text-lg font-bold tracking-tight">YACELLTECH</span>
        </div>
        <nav className="space-y-1 p-4">
          {filteredNav.map((item) => {
            const isActive = pathname === item.path;
            const isBandeja = item.path === "/dashboard/inbox";
            const bandejaBadge = isBandeja && entregaRecepcionCount > 0 ? entregaRecepcionCount : null;
            return (
              <Button
                key={item.path}
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start ${isActive ? "bg-primary/10 text-primary hover:bg-primary/15" : ""}`}
                onClick={() => router.push(item.path)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                <span className="flex-1 text-left">{item.name}</span>
                {bandejaBadge !== null && (
                  <span
                    title="Equipos en mi poder (entregados a recepción, pendientes de despachar)"
                    className="ml-2 min-w-[22px] h-[22px] flex items-center justify-center text-[11px] font-black px-1.5 rounded-full bg-red-500 text-white shadow-sm"
                  >
                    {bandejaBadge}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navbar */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
          <div className="flex items-center lg:hidden">
            <Smartphone className="mr-2 h-6 w-6 text-primary" />
            <span className="text-lg font-bold font-black">YACELLTECH</span>
          </div>
          
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{user.username}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <UserIcon className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setChangePwOpen(true)}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Cambiar Contraseña
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-700">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-10 lg:pb-10">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Nav Mobile — solo 5 esenciales + sheet "Más" para el resto */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t bg-white lg:hidden">
        {(() => {
          // Los 5 items que siempre van en el bottom-nav (los más usados)
          const PRIMARY_MOBILE_PATHS = new Set([
            "/dashboard",
            "/dashboard/new",
            "/dashboard/inbox",
            "/dashboard/history",
          ]);
          const primaryItems = filteredNav.filter(item => PRIMARY_MOBILE_PATHS.has(item.path));
          const moreItems = filteredNav.filter(item => !PRIMARY_MOBILE_PATHS.has(item.path));
          const primaryWithMore = [...primaryItems, {
            name: "Más", icon: Menu, path: "__more__", roles: ["admin", "caja", "tech"],
          } as (typeof filteredNav)[number]];

          return primaryWithMore.map((item) => {
            const isMore = item.path === "__more__";
            const isActive = !isMore && pathname === item.path;
            const isBandeja = item.path === "/dashboard/inbox";
            const bandejaBadge = isBandeja && entregaRecepcionCount > 0 ? entregaRecepcionCount : null;

            if (isMore) {
              return (
                <button
                  key="__more__"
                  onClick={() => setMoreSheetOpen(true)}
                  className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors text-muted-foreground"
                >
                  <item.icon className="h-5 w-5" />
                  <span>Más</span>
                </button>
              );
            }

            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors ${
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                <span className="relative">
                  <item.icon className="h-5 w-5" />
                  {bandejaBadge !== null && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-black px-1 rounded-full bg-red-500 text-white shadow-sm">
                      {bandejaBadge}
                    </span>
                  )}
                </span>
                <span>{item.name}</span>
              </button>
            );
          });
        })()}
      </nav>

      {/* Sheet "Más" — bottom sheet con los items restantes */}
      {moreSheetOpen && (
        <div
          className="fixed inset-0 z-[80] lg:hidden"
          onClick={() => setMoreSheetOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Más opciones</h2>
                <p className="text-xs text-slate-500">Todas las funciones disponibles para {user.role}</p>
              </div>
              <button
                onClick={() => setMoreSheetOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 space-y-1">
              {filteredNav
                .filter(item => !["/dashboard", "/dashboard/new", "/dashboard/inbox", "/dashboard/history"].includes(item.path))
                .map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        setMoreSheetOpen(false);
                        router.push(item.path);
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? "bg-primary/15" : "bg-slate-100"
                      }`}>
                        <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-slate-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{item.name}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {item.path.replace("/dashboard/", "/").replace("/", " · ")}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                    </button>
                  );
                })}
            </div>
            <div className="p-3 border-t">
              <button
                onClick={() => {
                  setMoreSheetOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left text-red-600 hover:bg-red-50 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-red-50">
                  <LogOut className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">Cerrar Sesión</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={changePwOpen} onOpenChange={setChangePwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="current-pw">Contraseña actual</Label>
              <Input id="current-pw" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-pw">Nueva contraseña</Label>
              <Input id="new-pw" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={4} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm-pw">Confirmar nueva contraseña</Label>
              <Input id="confirm-pw" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required minLength={4} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pwLoading} className="w-full">
                {pwLoading ? "Guardando..." : "Actualizar Contraseña"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
