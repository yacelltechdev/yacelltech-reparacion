const TZ = "America/Santo_Domingo";

/** "2024-01-15T14:30:00" — hora local RD para guardar en DB */
export function nowRD(): string {
  return new Date().toLocaleString("sv-SE", { timeZone: TZ }).replace(" ", "T");
}

/** "2024-01-15" — fecha de hoy en RD */
export function todayRD(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

/** "2024-01-14" — fecha de ayer en RD */
export function yesterdayRD(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA");
}

/**
 * Helpers de formateo — TODOS usan America/Santo_Domingo (UTC-4 fijo, sin DST).
 *
 * Por qué importan: el `toLocaleString` / `toLocaleDateString` inline que estaba
 * en el proyecto dependía del timezone del navegador del usuario o del server
 * (Vercel corre en UTC). Resultado: a las 8pm RD se veía como "12:00 AM del
 * día siguiente" porque se renderizaba en UTC. Estos helpers centralizan el
 * timezone y evitan la sorpresa.
 */

/** "15 ene 2024" — fecha corta en español RD */
export function formatDateShort(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-DO", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "15 de enero de 2024" — fecha larga en español RD */
export function formatDateLong(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-DO", {
    timeZone: TZ,
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** "15/01/2024" — fecha con barras, locale neutro */
export function formatDateSlash(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-DO", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** "15/01/24, 08:30 PM" — fecha+hora corta (estilo ticket) */
export function formatDateTimeShort(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("es-DO", {
    timeZone: TZ,
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** "15/01/2024, 20:30" — fecha+hora 24h */
export function formatDateTime24(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("es-DO", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "01/15, 08:30 PM" — mes/día + hora 12h, compacto (history/inbox) */
export function formatDateTimeCompact(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    timeZone: TZ,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** "miércoles, 15 de enero de 2024" — para cabeceras tipo dashboard */
export function formatDateHeader(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-DO", {
    timeZone: TZ,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Devuelve la fecha de hoy en RD formateada para cabecera (acepta 0 args) */
export function formatTodayHeader(): string {
  return formatDateHeader(new Date());
}

/**
 * Regla de negocio "cuadre dominical":
 *   - Domingo (0) → devuelve la fecha del LUNES siguiente
 *   - Cualquier otro día → devuelve todayRD()
 *
 * Contexto: la chica de caja no trabaja los domingos. Las facturas
 * despachadas el domingo se agrupan en el cuadre del lunes para que
 * el cierre de caja sea consistente. Esto aplica tanto a la fecha
 * de despacho auto-asignada como al default del filtro del cuadre.
 *
 * NO afecta fecha_despacho en la BD cuando se cambia manualmente
 * desde /admin (esos siguen su valor real).
 */
export function cuadreDateRD(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  if (d.getDay() === 0) {
    d.setDate(d.getDate() + 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Devuelve true si la fecha YYYY-MM-DD cae en domingo en RD. */
export function isSundayRD(iso: string): boolean {
  const [y, m, day] = iso.split("-").map(Number);
  // Crear fecha a mediodía UTC para evitar boundary issues con DST
  const d = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
  return d.getUTCDay() === 0;
}
