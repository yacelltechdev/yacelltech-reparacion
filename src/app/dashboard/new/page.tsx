"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, User, ClipboardList, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Repair } from "@/lib/types";
import PrintTicket from "@/components/PrintTicket";
import PatternLock from "@/components/PatternLock";

export default function NewRepairPage() {
  const router = useRouter();
  const [savedRepair, setSavedRepair] = useState<Repair | null>(null);
  const [catalogs, setCatalogs] = useState({
    marcas: [],
    models: [],
    colores: []
  });

  const [formData, setFormData] = useState<Partial<Repair>>({
    cliente: "",
    telefono: "",
    cedula: "",
    marca: "",
    modelo: "",
    color: "",
    serie: "",
    sintoma: "",
    observacion: "",
    costo: 0,
    estadoInicial: "Encendido",
    tipoClave: "sin clave",
    claveTexto: "",
    tecnico: "Oscar",
    checklist: {
      tactil: null,
      imagen: null,
      señal: null,
      wifi: null,
      camara: null,
      microfono: null,
      altavoz: null,
      carga: null,
      botones: null,
      faceid: null,
      flash: null
    }
  });

  useEffect(() => {
    const fetchJson = (url: string) =>
      fetch(url).then(res => {
        if (!res.ok) return [];
        return res.json().catch(() => []);
      }).catch(() => []);

    Promise.all([
      fetchJson("/api/catalogs/marcas"),
      fetchJson("/api/catalogs/models"),
      fetchJson("/api/catalogs/colores"),
    ]).then(([marcas, models, colores]) => {
      setCatalogs({ marcas, models, colores });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.estadoInicial === "Apagado" && !formData.observacion?.trim()) {
      toast.error("El equipo fue recibido apagado. Debe ingresar una observación sobre su estado físico.");
      return;
    }

    if (formData.estadoInicial === "Encendido") {
      const incomplete = Object.values(formData.checklist || {}).some(v => v === null);
      if (incomplete) {
        toast.error("Complete todos los puntos del checklist de revisión antes de continuar.");
        return;
      }
    }

    // Generación de código simple
    const codigo = `REP-${Date.now().toString().slice(-6)}`;
    
    const repairData = {
      ...formData,
      codigo,
      status: "En reparación",
      fecha: new Date().toISOString(),
      cargosAdicionales: []
    };

    try {
      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(repairData)
      });
      
      if (res.ok) {
        const { id } = await res.json();
        // Guardar nuevos valores al catálogo
        const saves = [];
        if (formData.marca?.trim()) saves.push(fetch("/api/catalogs/marcas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: formData.marca.trim() }) }));
        if (formData.modelo?.trim()) saves.push(fetch("/api/catalogs/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: formData.modelo.trim() }) }));
        if (formData.color?.trim()) saves.push(fetch("/api/catalogs/colores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: formData.color.trim() }) }));
        await Promise.all(saves);
        const fullRepair: Repair = { ...repairData, id } as Repair;
        setSavedRepair(fullRepair);
        toast.success("¡Reparación registrada con éxito!");
        setTimeout(() => {
          window.print();
          router.push("/dashboard/inbox");
        }, 300);
      }
    } catch (error) {
      toast.error("Error al guardar la reparación");
    }
  };

  const toggleCheck = (key: string) => {
    setFormData(prev => {
      const current = prev.checklist?.[key];
      let next;
      if (current === null) next = true;      // Pasa a Funcionando (Verde)
      else if (current === true) next = false; // Pasa a NO Funciona (Rojo)
      else next = null;                        // Vuelve a Sin Revisar (Gris)
      
      return {
        ...prev,
        checklist: { ...prev.checklist, [key]: next }
      };
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Recepción</h1>
          <p className="text-slate-500 text-sm">Registro obligatorio de equipos y diagnóstico inicial.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Columna Cliente */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary text-md">
                <User className="h-4 w-4" /> Datos del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Nombre Completo</Label>
                <Input 
                  id="cliente" 
                  placeholder="Nombre y Apellido"
                  value={formData.cliente} 
                  onChange={e => setFormData({...formData, cliente: e.target.value})} 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input 
                    id="telefono" 
                    placeholder="809-xxx-xxxx"
                    value={formData.telefono} 
                    onChange={e => setFormData({...formData, telefono: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cedula">Cédula</Label>
                  <Input 
                    id="cedula" 
                    placeholder="001-xxxxxxx-x"
                    value={formData.cedula} 
                    onChange={e => setFormData({...formData, cedula: e.target.value})} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Columna Equipo */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary text-md">
                <Smartphone className="h-4 w-4" /> Información del Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marca">Marca</Label>
                    <input
                      id="marca"
                      list="marca-list"
                      placeholder="Ej: Apple, Samsung..."
                      value={formData.marca}
                      onChange={e => setFormData({...formData, marca: e.target.value})}
                      required
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <datalist id="marca-list">
                      {catalogs.marcas.map((m: any) => <option key={m.id} value={m.nombre} />)}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modelo">Modelo</Label>
                    <input
                      id="modelo"
                      list="modelo-list"
                      placeholder="Ej: iPhone 15, Galaxy S24..."
                      value={formData.modelo}
                      onChange={e => setFormData({...formData, modelo: e.target.value})}
                      required
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <datalist id="modelo-list">
                      {catalogs.models.map((m: any) => <option key={m.id} value={m.nombre} />)}
                    </datalist>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serie">IMEI / Serie</Label>
                  <Input
                    id="serie"
                    placeholder="Número de serie"
                    value={formData.serie}
                    onChange={e => setFormData({...formData, serie: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <input
                    id="color"
                    list="color-list"
                    placeholder="Ej: Negro, Blanco..."
                    value={formData.color}
                    onChange={e => setFormData({...formData, color: e.target.value})}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <datalist id="color-list">
                    {catalogs.colores.map((m: any) => <option key={m.id} value={m.nombre} />)}
                  </datalist>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Diagnóstico y Detalles */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary text-md">
              <ClipboardList className="h-4 w-4" /> Diagnóstico y Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sintoma">Síntoma o Falla Reportada</Label>
                <Textarea
                  id="sintoma"
                  placeholder="Describe el problema detalladamente..."
                  className="min-h-[80px]"
                  value={formData.sintoma}
                  onChange={e => setFormData({...formData, sintoma: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacion">
                  Observación
                  {formData.estadoInicial === "Apagado" && (
                    <span className="ml-2 text-xs text-red-600 font-semibold">* Requerido (equipo apagado)</span>
                  )}
                </Label>
                <Textarea
                  id="observacion"
                  placeholder={formData.estadoInicial === "Apagado" ? "Requerido: estado físico del equipo (pantalla, carcasa, etc.)..." : "Ej: Pantalla astillada, rayones..."}
                  className={`min-h-[80px] ${formData.estadoInicial === "Apagado" ? "border-red-300 bg-red-50 focus:ring-red-400" : ""}`}
                  value={formData.observacion}
                  onChange={e => setFormData({...formData, observacion: e.target.value})}
                />
              </div>
            </div>

            {/* Seguridad */}
            <div className="space-y-3">
              <Label className="font-bold text-slate-700">Seguridad del Equipo</Label>
              <div className="flex gap-2">
                {["sin clave", "texto", "patron"].map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, tipoClave: tipo as any, claveTexto: "", patronArray: [] }))}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                      formData.tipoClave === tipo
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-slate-600 border-slate-200 hover:border-primary"
                    }`}
                  >
                    {tipo === "sin clave" ? "Sin clave" : tipo === "texto" ? "PIN / Texto" : "Patrón"}
                  </button>
                ))}
              </div>
              {formData.tipoClave === "texto" && (
                <Input
                  placeholder="Ingresa el PIN o contraseña"
                  value={formData.claveTexto || ""}
                  onChange={e => setFormData(p => ({ ...p, claveTexto: e.target.value }))}
                  className="max-w-xs"
                />
              )}
              {formData.tipoClave === "patron" && (
                <div className="flex flex-col gap-2">
                  <PatternLock
                    pattern={formData.patronArray || []}
                    onChange={p => setFormData(prev => ({ ...prev, patronArray: p }))}
                    size={150}
                  />
                  {(formData.patronArray?.length ?? 0) > 0 && (
                    <button type="button" onClick={() => setFormData(p => ({ ...p, patronArray: [] }))} className="text-xs text-slate-400 hover:text-red-500 w-fit">
                      Limpiar patrón
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Estado Inicial (Obligatorio)</Label>
                <Tabs defaultValue="Encendido" className="w-full" onValueChange={v => setFormData({...formData, estadoInicial: v as any})}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="Encendido">Encendido</TabsTrigger>
                    <TabsTrigger value="Apagado">Apagado</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label>Asignar Técnico</Label>
                <Select defaultValue="Oscar" onValueChange={v => setFormData({...formData, tecnico: v ?? undefined})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Oscar">Oscar</SelectItem>
                    <SelectItem value="Freddy">Freddy</SelectItem>
                    <SelectItem value="Carlos">Carlos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="costo">Precio de Reparación (RD$)</Label>
                <Input
                  id="costo"
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={formData.costo || ""}
                  onChange={e => setFormData({...formData, costo: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              {formData.estadoInicial === "Apagado" ? (
                <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 font-semibold">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>Equipo recibido APAGADO — se omite el checklist de revisión. Complete la observación arriba.</span>
                </div>
              ) : (
                <>
                  <Label className="mb-4 block font-bold text-slate-700">Checklist de Revisión (Clic para cambiar estado)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    {Object.entries(formData.checklist || {}).map(([key, val]) => (
                      <div
                        key={key}
                        onClick={() => toggleCheck(key)}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer border transition-all ${
                          val === true ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                          val === false ? "bg-red-50 border-red-200 text-red-700" :
                          "bg-white border-slate-200 text-slate-400 opacity-60"
                        }`}
                      >
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          val === true ? "bg-emerald-500 border-emerald-500 text-white" :
                          val === false ? "bg-red-500 border-red-200 text-white" :
                          "border-slate-300"
                        }`}>
                          {val === true && <Check className="h-4 w-4" />}
                          {val === false && <AlertCircle className="h-4 w-4" />}
                        </div>
                        <span className="text-xs font-bold capitalize select-none">
                          {key === 'faceid' ? 'FaceID' : key}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1 text-emerald-600"><Check className="h-3 w-3" /> Funciona</div>
                    <div className="flex items-center gap-1 text-red-600"><AlertCircle className="h-3 w-3" /> Falla</div>
                    <div className="flex items-center gap-1 text-slate-400">◯ Sin Revisar</div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="submit" size="lg" className="w-full md:w-auto px-12 font-bold h-12 shadow-lg shadow-primary/20">
            <Check className="mr-2 h-5 w-5" /> Crear Orden de Servicio
          </Button>
        </div>
      </form>

      {savedRepair && (
        <div className="print-only">
          <PrintTicket repair={savedRepair} copies={2} />
        </div>
      )}
    </div>
  );
}


