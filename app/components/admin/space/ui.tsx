import { Info, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import type { DashText } from "./dashText";

/** Small building blocks shared by every admin space screen (KPI tiles, deltas, notes, number formats). */

export type Fmt = ReturnType<typeof formatters>;
export const formatters = (locale: string) => ({
  euros: (cents: number) => (cents / 100).toLocaleString(locale, { style: "currency", currency: "EUR" }),
  num: (n: number) => n.toLocaleString(locale),
  pct: (n: number | null) => (n === null ? "—" : `${n.toLocaleString(locale)} %`),
  date: (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(locale),
});

/** Workload badge colour per load level. */
export const LOAD_CLASS = { overloaded: "is-danger", normal: "is-info", available: "is-ok", inactive: "is-muted" } as const;

export function Delta({ value, locale, label, points }: { value: number | null; locale: string; label: string; points?: boolean }) {
  if (value === null) return null;
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`adm-delta ${up ? "is-up" : "is-down"}`} title={label}>
      <Icon size={13} aria-hidden="true" />
      {up ? "+" : ""}
      {value.toLocaleString(locale)}
      {points ? " pt" : " %"}
      <span className="adm-sr">{label}</span>
    </span>
  );
}

export function Kpi({
  Icon,
  label,
  hint,
  value,
  children,
  hero,
}: {
  Icon: LucideIcon;
  label: string;
  hint?: string;
  value: string;
  children?: React.ReactNode;
  hero?: boolean;
}) {
  return (
    <div className={`adm-kpi${hero ? " is-hero" : ""}`} title={hint}>
      <span className="adm-kpi-ic" aria-hidden="true">
        <Icon size={16} />
      </span>
      <strong>{value}</strong>
      <span className="adm-kpi-label">{label}</span>
      {children}
    </div>
  );
}

export function MigrationNote({ t }: { t: DashText }) {
  return (
    <p className="adm-note">
      <Info size={15} aria-hidden="true" />
      {t.migration}
    </p>
  );
}

/** Page title row under the shell header: title, subtitle and an optional action button. */
export function PageHead({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="adm-pagehead">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
