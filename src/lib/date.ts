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
