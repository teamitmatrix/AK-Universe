"use client";

import { usePathname, useRouter } from "next/navigation";

/** Month filter of "Mes ventes": changes ?mois= (the page is re-rendered on the server for that month). */
export function MonthSelect({ value, months }: { value: string; months: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const label = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return (
    <label className="com-month">
      <span>Mois</span>
      <select className="adm-select" value={value} onChange={(e) => router.push(`${pathname}?mois=${e.target.value}`)}>
        {months.map((m) => (
          <option key={m} value={m}>
            {label(m)}
          </option>
        ))}
      </select>
    </label>
  );
}
