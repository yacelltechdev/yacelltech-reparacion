"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Plus, MessageSquare } from "lucide-react";

type Preset = { id: number; texto: string; orden: number };

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [nuevo, setNuevo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  const load = async () => {
    const res = await fetch("/api/observaciones-preset");
    setPresets(await res.json());
  };

  useEffect(() => { load(); }, []);

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevo.trim()) return;
    setLoading(true);
    const res = await fetch("/api/observaciones-preset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: nuevo.trim() }),
    });
    if (res.ok) {
      toast.success("Observación agregada");
      setNuevo("");
      load();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Error al agregar");
    }
    setLoading(false);
  };

  const eliminar = async (id: number) => {
    const res = await fetch("/api/observaciones-preset", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { toast.success("Eliminado"); load(); }
    else toast.error("Error al eliminar");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel Admin</h1>
        <p className="text-slate-500 text-sm">Configuración del sistema</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary text-md">
            <MessageSquare className="h-4 w-4" /> Observaciones Predefinidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={agregar} className="flex gap-2">
            <Input
              placeholder="Ej: Esta pelado, Pantalla astillada..."
              value={nuevo}
              onChange={e => setNuevo(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !nuevo.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </form>

          {presets.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No hay observaciones predefinidas aún.</p>
          ) : (
            <div className="space-y-2">
              {presets.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-2">
                  <span className="text-sm">{p.texto}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => eliminar(p.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
