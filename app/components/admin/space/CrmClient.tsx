"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calculator, CheckCheck, Search, Wallet } from "lucide-react";
import { useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";
import { assignProspect, assignSubscriptionCommercial, bulkMarkCommissionsPaid, generateCommissions, recordBalance, setCommissionStatus } from "@/lib/admin/finance-actions";
import { dashTextFor } from "./dashText";

type Option = { value: string; label: string };
type Field = { name: string; label: string; value: string; options: Option[] };

/**
 * Filters live in the URL (?statut=…&commercial=…), so the server renders the filtered list,
 * a filtered view can be bookmarked or shared, and the page works without JavaScript (submit button).
 */
export function FilterBar({ fields, search }: { fields: Field[]; search?: { name: string; value: string } }) {
  const [lang] = useLang();
  const t = dashTextFor(lang).crm.filters;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(search?.value ?? "");
  const [pending, start] = useTransition();

  const go = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  const active = fields.some((f) => f.value) || Boolean(search?.value);

  return (
    <form
      className={`adm-toolbar${pending ? " is-pending" : ""}`}
      action={pathname}
      onSubmit={(e) => {
        e.preventDefault();
        if (search) go(search.name, q.trim());
      }}
    >
      {search && (
        <label className="adm-search">
          <Search size={15} aria-hidden="true" />
          <input type="search" name={search.name} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} />
        </label>
      )}
      {fields.map((f) => (
        <select key={f.name} name={f.name} className="adm-select" value={f.value} aria-label={f.label} onChange={(e) => go(f.name, e.target.value)}>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      {search && (
        <button type="submit" className="adm-btn is-ghost">
          {t.apply}
        </button>
      )}
      {active && (
        <button
          type="button"
          className="adm-btn is-ghost"
          onClick={() => {
            setQ("");
            start(() => router.replace(pathname, { scroll: false }));
          }}
        >
          {t.reset}
        </button>
      )}
    </form>
  );
}

/** Assign the sales rep earning recurring commissions on a subscription. */
export function SubscriptionAssign({ subscriptionId, value, reps }: { subscriptionId: string; value: string | null; reps: Option[] }) {
  const [lang] = useLang();
  const t = dashTextFor(lang).crm;
  const [current, setCurrent] = useState(value ?? "");
  const [pending, start] = useTransition();
  const [toast, toastNode] = useToast();
  const router = useRouter();

  const change = (next: string) => {
    const previous = current;
    setCurrent(next);
    start(async () => {
      const res = await assignSubscriptionCommercial(subscriptionId, next || null);
      if (!res.success) {
        setCurrent(previous);
        return toast(t.errors[res.error] ?? t.errors.failed);
      }
      toast(t.prospects.assigned);
      router.refresh();
    });
  };

  return (
    <>
      <select className="adm-select sm" value={current} disabled={pending} aria-label={t.filters.allReps} onChange={(e) => change(e.target.value)}>
        <option value="">{t.filters.unassigned}</option>
        {reps.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {toastNode}
    </>
  );
}

/** Inline sales-rep select on a prospect row. */
export function ProspectAssign({ projectId, reference, value, reps }: { projectId: string; reference: string; value: string | null; reps: Option[] }) {
  const [lang] = useLang();
  const t = dashTextFor(lang).crm;
  const [current, setCurrent] = useState(value ?? "");
  const [pending, start] = useTransition();
  const [toast, toastNode] = useToast();
  const router = useRouter();

  const change = (next: string) => {
    const previous = current;
    setCurrent(next);
    start(async () => {
      const res = await assignProspect(projectId, next || null);
      if (!res.success) {
        setCurrent(previous);
        return toast(t.errors[res.error] ?? t.errors.failed);
      }
      toast(t.prospects.assigned);
      router.refresh();
    });
  };

  return (
    <>
      <select className="adm-select sm" value={current} onChange={(e) => change(e.target.value)} disabled={pending} aria-label={t.prospects.assign(reference)}>
        <option value="">{t.filters.unassigned}</option>
        {reps.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {toastNode}
    </>
  );
}

/** "Solde reçu": records the remaining balance of a video sale as collected (amount recomputed on the server). */
export function RecordBalanceButton({ projectId, reference, amountLabel }: { projectId: string; reference: string; amountLabel: string }) {
  const [lang] = useLang();
  const t = dashTextFor(lang).crm;
  const [pending, start] = useTransition();
  const [toast, toastNode] = useToast();
  const router = useRouter();

  const click = () => {
    if (!window.confirm(t.ventes.recordConfirm(amountLabel, reference))) return;
    start(async () => {
      const res = await recordBalance(projectId);
      if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      toast(t.ventes.recorded(amountLabel));
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" className="adm-btn is-ghost sm" onClick={click} disabled={pending}>
        <Wallet size={14} aria-hidden="true" />
        {t.ventes.recordBalance}
      </button>
      {toastNode}
    </>
  );
}

const NEXT_STATUS: Record<string, "validee" | "a_payer" | "payee" | undefined> = { en_attente: "validee", validee: "a_payer", a_payer: "payee" };

/** The one next step of a commission: Valider → Passer à payer → Marquer payée. */
export function CommissionAction({ id, status, amountLabel, commercial }: { id: string; status: string; amountLabel: string; commercial: string }) {
  const [lang] = useLang();
  const t = dashTextFor(lang).crm;
  const [pending, start] = useTransition();
  const [toast, toastNode] = useToast();
  const router = useRouter();
  const next = NEXT_STATUS[status];
  if (!next) return null;

  const click = () => {
    if (next === "payee" && !window.confirm(t.commissions.confirmPaid(amountLabel, commercial))) return;
    start(async () => {
      const res = await setCommissionStatus(id, next);
      if (!res.success) {
        toast(t.errors[res.error] ?? t.errors.failed);
        if (res.error === "staleStatus") router.refresh();
        return;
      }
      toast(t.commissions.done[next]);
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" className={`adm-btn sm${next === "payee" ? "" : " is-ghost"}`} onClick={click} disabled={pending}>
        {next === "payee" && <CheckCheck size={14} aria-hidden="true" />}
        {t.commissions.actions[next]}
      </button>
      {toastNode}
    </>
  );
}

export function GenerateCommissionsButton({ count }: { count: number }) {
  const [lang] = useLang();
  const t = dashTextFor(lang).crm;
  const [pending, start] = useTransition();
  const [toast, toastNode] = useToast();
  const router = useRouter();

  const click = () =>
    start(async () => {
      const res = await generateCommissions();
      if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      toast(t.commissions.generated(res.created));
      router.refresh();
    });

  return (
    <>
      <button type="button" className="adm-btn" onClick={click} disabled={pending || count === 0} title={t.commissions.generateHint}>
        <Calculator size={16} aria-hidden="true" />
        {t.commissions.generate(count)}
      </button>
      {toastNode}
    </>
  );
}

type CommissionBoardRow = {
  id: string;
  date: string;
  commercialId: string;
  commercial: string;
  reference: string;
  client: string;
  saleLabel: string;
  amountLabel: string;
  status: string;
  statusLabel: string;
  paidLabel: string;
};

const COMMISSION_CLASS: Record<string, string> = {
  en_attente: "is-warn",
  validee: "is-info",
  a_payer: "is-warn",
  payee: "is-ok",
};

/** Commission board with row selection + bulk “mark paid” for rows in status à payer. */
export function CommissionBoardTable({
  rows,
  labels,
  selectAllLabel,
  selectRowLabel,
}: {
  rows: CommissionBoardRow[];
  labels: { date: string; commercial: string; sale: string; saleAmount: string; amount: string; status: string; actions: string };
  selectAllLabel: string;
  selectRowLabel: string;
}) {
  const [lang] = useLang();
  const t = dashTextFor(lang).crm;
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, start] = useTransition();
  const [toast, toastNode] = useToast();
  const router = useRouter();
  const payableIds = rows.filter((r) => r.status === "a_payer").map((r) => r.id);
  const selectedPayable = payableIds.filter((id) => selected.has(id));
  const allPayableSelected = payableIds.length > 0 && payableIds.every((id) => selected.has(id));

  const toggle = (id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const toggleAllPayable = (on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of payableIds) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const bulkPay = () => {
    if (!selectedPayable.length || !window.confirm(t.commissions.bulkPayConfirm(selectedPayable.length))) return;
    start(async () => {
      const res = await bulkMarkCommissionsPaid(selectedPayable);
      if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      toast(t.commissions.bulkPaid(res.updated));
      setSelected(new Set());
      router.refresh();
    });
  };

  return (
    <>
      {payableIds.length > 0 && (
        <div className="adm-toolbar">
          <label className="adm-check">
            <input type="checkbox" checked={allPayableSelected} onChange={(e) => toggleAllPayable(e.target.checked)} />
            <span>{selectAllLabel}</span>
          </label>
          <button type="button" className="adm-btn" onClick={bulkPay} disabled={pending || selectedPayable.length === 0}>
            <CheckCheck size={16} aria-hidden="true" />
            {t.commissions.bulkPay(selectedPayable.length)}
          </button>
        </div>
      )}
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th scope="col" className="adm-check-col">
                <span className="sr-only">{selectRowLabel}</span>
              </th>
              <th scope="col">{labels.date}</th>
              <th scope="col">{labels.commercial}</th>
              <th scope="col">{labels.sale}</th>
              <th scope="col" className="num">
                {labels.saleAmount}
              </th>
              <th scope="col" className="num">
                {labels.amount}
              </th>
              <th scope="col">{labels.status}</th>
              <th scope="col">{labels.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-label={selectRowLabel}>
                  {r.status === "a_payer" ? (
                    <input type="checkbox" checked={selected.has(r.id)} onChange={(e) => toggle(r.id, e.target.checked)} aria-label={selectRowLabel} />
                  ) : (
                    <span className="adm-muted">—</span>
                  )}
                </td>
                <td data-label={labels.date}>{r.date}</td>
                <td data-label={labels.commercial}>
                  <a href={`/admin/commercial-detail?id=${r.commercialId}`} className="adm-person">
                    {r.commercial}
                  </a>
                </td>
                <td data-label={labels.sale}>
                  <span className="adm-stack">
                    <strong>{r.reference}</strong>
                    <span className="adm-person-mail">{r.client}</span>
                  </span>
                </td>
                <td data-label={labels.saleAmount} className="num">
                  {r.saleLabel}
                </td>
                <td data-label={labels.amount} className="num">
                  <strong>{r.amountLabel}</strong>
                </td>
                <td data-label={labels.status}>
                  <span className={`adm-badge ${COMMISSION_CLASS[r.status] ?? "is-info"}`}>{r.statusLabel}</span>
                </td>
                <td data-label={labels.actions}>
                  {r.status === "payee" ? (
                    <span className="adm-muted adm-small">{r.paidLabel}</span>
                  ) : (
                    <CommissionAction id={r.id} status={r.status} amountLabel={r.amountLabel} commercial={r.commercial} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toastNode}
    </>
  );
}
