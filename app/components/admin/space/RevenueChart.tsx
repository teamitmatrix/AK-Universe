"use client";

import { useId, useState } from "react";
import { localeOf } from "@/config/languages";
import { useLang } from "@/components/ui/LangSwitch";
import { dashTextFor } from "./dashText";

type Point = { month: string; cents: number; count: number };

const W = 640;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 16 };

/** Six-month revenue line from real paid payments, with a crosshair tooltip and a data-table fallback. */
export function RevenueChart({ series, label }: { series: Point[]; label?: string }) {
  const [lang] = useLang();
  const t = dashTextFor(lang).revenueChart;
  const locale = localeOf(lang);
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId();

  const euros = (cents: number) =>
    (cents / 100).toLocaleString(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const monthLabel = (iso: string, long = false) =>
    new Date(iso).toLocaleDateString(locale, { month: long ? "long" : "short", year: long ? "numeric" : undefined });

  const max = Math.max(...series.map((p) => p.cents), 1);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (series.length > 1 ? (i / (series.length - 1)) * innerW : innerW / 2);
  const y = (cents: number) => PAD.top + innerH - (cents / max) * innerH;
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.cents).toFixed(1)}`).join(" ");
  const area = `${line} L${x(series.length - 1).toFixed(1)},${PAD.top + innerH} L${x(0).toFixed(1)},${PAD.top + innerH} Z`;
  const empty = series.every((p) => p.cents === 0);
  const active = hover !== null ? series[hover] : null;

  return (
    <div className="adm-chart">
      <div className="adm-chart-plot" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label ?? `${t.title} — ${t.subtitle}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--adm-accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--adm-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH * (1 - f)} y2={PAD.top + innerH * (1 - f)} className="adm-chart-grid" />
          ))}
          <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} className="adm-chart-axis" />
          {!empty && <path d={area} fill={`url(#${gradientId})`} />}
          <path d={line} className="adm-chart-line" vectorEffect="non-scaling-stroke" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} className="adm-chart-cross" vectorEffect="non-scaling-stroke" />}
          {series.map((p, i) => (
            <g key={p.month}>
              {/* Wide invisible hit target per month, bigger than the mark. */}
              <rect
                x={x(i) - innerW / (series.length - 1 || 1) / 2}
                y={0}
                width={innerW / (series.length - 1 || 1)}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${monthLabel(p.month, true)} : ${euros(p.cents)}`}
              />
              <text x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} className="adm-chart-label">
                {monthLabel(p.month)}
              </text>
            </g>
          ))}
        </svg>
        {/* Point markers in HTML so they stay round when the SVG stretches. */}
        {series.map((p, i) => (
          <span
            key={p.month}
            className={`adm-chart-dot${hover === i || (hover === null && i === series.length - 1) ? " is-on" : ""}`}
            style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(p.cents) / H) * 100}%` }}
            aria-hidden="true"
          />
        ))}
        {active && hover !== null && (
          <div className="adm-tooltip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(active.cents) / H) * 100}%` }} role="status">
            <strong>{euros(active.cents)}</strong>
            <span>
              {monthLabel(active.month, true)} · {t.payments(active.count)}
            </span>
          </div>
        )}
        {empty && <p className="adm-chart-empty">{t.empty}</p>}
      </div>
      <details className="adm-chart-table">
        <summary>{t.table}</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{t.month}</th>
              <th scope="col">{t.amount}</th>
            </tr>
          </thead>
          <tbody>
            {series.map((p) => (
              <tr key={p.month}>
                <td>{monthLabel(p.month, true)}</td>
                <td>
                  {euros(p.cents)} <small>({t.payments(p.count)})</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
