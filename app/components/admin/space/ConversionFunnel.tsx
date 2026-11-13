"use client";

import { useRef } from "react";
import { ChevronRight, CircleCheck, CreditCard, Inbox, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { localeOf } from "@/config/languages";
import { useLang } from "@/components/ui/LangSwitch";
import { dashTextFor } from "./dashText";

/**
 * Aggregates only — this component's props are numbers, so no visitor identity can ever reach the browser
 * from this screen (RGPD). The server computes them in lib/admin/dashboard.ts.
 */
export type FunnelCounts = { requests: number; checkouts: number; abandoned: number; paid: number };
export type AbandonedCartsSummary = {
  checkouts: number;
  abandoned: number;
  rate: number | null;
  deposits: { count: number; valueCents: number };
  subscriptions: { count: number; monthlyCents: number };
  hours: number;
};

export function ConversionFunnel({ funnel, carts }: { funnel: FunnelCounts; carts: AbandonedCartsSummary }) {
  const [lang] = useLang();
  const all = dashTextFor(lang);
  const t = all.funnel;
  const c = all.carts;
  const locale = localeOf(lang);
  const dialog = useRef<HTMLDialogElement>(null);

  const pct = (n: number) => (funnel.requests > 0 ? Math.round((n / funnel.requests) * 1000) / 10 : 0);
  const euros = (cents: number) => (cents / 100).toLocaleString(locale, { style: "currency", currency: "EUR" });
  const num = (n: number) => n.toLocaleString(locale);

  const steps = [
    { key: "requests", label: t.requests, value: funnel.requests, Icon: Inbox },
    { key: "checkouts", label: t.checkouts, value: funnel.checkouts, Icon: CreditCard },
    { key: "abandoned", label: t.abandoned, value: funnel.abandoned, Icon: TriangleAlert },
    { key: "paid", label: t.paid, value: funnel.paid, Icon: CircleCheck },
  ] as const;

  return (
    <>
      <ol className="adm-funnel">
        {steps.map(({ key, label, value, Icon }) => {
          const body = (
            <>
              <span className={`adm-funnel-ic${key === "abandoned" ? " is-warn" : ""}`} aria-hidden="true">
                <Icon size={15} />
              </span>
              <span className="adm-funnel-body">
                <span className="adm-funnel-top">
                  <strong>{label}</strong>
                  <span>
                    {num(value)} · {pct(value).toLocaleString(locale)} %
                  </span>
                </span>
                <span className="adm-bar" aria-hidden="true">
                  <span className={key === "abandoned" ? "is-warn" : undefined} style={{ width: `${Math.max(pct(value), value > 0 ? 2 : 0)}%` }} />
                </span>
              </span>
            </>
          );
          return (
            <li key={key}>
              {key === "abandoned" ? (
                <button type="button" className="adm-funnel-step is-link" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog" title={t.open}>
                  {body}
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              ) : (
                <div className="adm-funnel-step">{body}</div>
              )}
            </li>
          );
        })}
      </ol>

      <dialog ref={dialog} className="adm-modal" aria-labelledby="adm-carts-title" onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <div className="adm-modal-card">
          <header>
            <h2 id="adm-carts-title">{c.title}</h2>
            <button type="button" className="adm-icon-btn" onClick={() => dialog.current?.close()} aria-label={c.close}>
              <X size={18} />
            </button>
          </header>
          <p className="adm-muted">{c.intro(carts.hours)}</p>
          <div className="adm-modal-stats">
            <div>
              <span>{c.checkouts}</span>
              <strong>{num(carts.checkouts)}</strong>
            </div>
            <div>
              <span>{c.abandoned}</span>
              <strong>{num(carts.abandoned)}</strong>
            </div>
            <div>
              <span>{c.rate}</span>
              <strong>{carts.rate === null ? "—" : `${carts.rate.toLocaleString(locale)} %`}</strong>
            </div>
          </div>
          <table className="adm-modal-table">
            <thead>
              <tr>
                <th scope="col"></th>
                <th scope="col">{c.abandoned}</th>
                <th scope="col">{c.value}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{c.deposits}</th>
                <td>{num(carts.deposits.count)}</td>
                <td>{euros(carts.deposits.valueCents)}</td>
              </tr>
              <tr>
                <th scope="row">{c.subscriptions}</th>
                <td>{num(carts.subscriptions.count)}</td>
                <td>
                  {euros(carts.subscriptions.monthlyCents)} {c.perMonth}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="adm-callout">
            <ShieldCheck size={18} aria-hidden="true" />
            <div>
              <strong>{c.rgpdTitle}</strong>
              <p>{c.rgpd}</p>
            </div>
          </div>
          <div className="adm-modal-actions">
            <button type="button" className="adm-btn" onClick={() => dialog.current?.close()}>
              {c.close}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
