"use client";
import { useEffect } from "react";
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
  Menu,
  User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuGroup,
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Protección de rutas simple
    const saved = localStorage.getItem('yacell_auth');
    if (!saved && !user) {
      router.push("/");
    }
  }, [user, router]);

  if (!user) return null;

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard", roles: ["admin"] },
    { name: "Recepción", icon: Smartphone, path: "/dashboard/new", roles: ["admin", "caja"] },
    { name: "Bandeja", icon: Inbox, path: "/dashboard/inbox", roles: ["admin", "caja"] },
    { name: "Taller", icon: Wrench, path: "/dashboard/technician", roles: ["admin", "tech"] },
    { name: "Historial", icon: History, path: "/dashboard/history", roles: ["admin", "caja", "tech"] },
    { name: "Cuadre", icon: BarChart3, path: "/dashboard/report", roles: ["admin", "caja"] },
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
            return (
              <Button
                key={item.path}
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start ${isActive ? "bg-primary/10 text-primary hover:bg-primary/15" : ""}`}
                onClick={() => router.push(item.path)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
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

      {/* Bottom Nav Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t bg-white lg:hidden">
        {filteredNav.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors ${
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
