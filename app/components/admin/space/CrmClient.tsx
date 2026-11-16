"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calculator, CheckCheck, Search, Wallet } from "lucide-react";
import { useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";
import { assignProspect, generateCommissions, recordBalance, setCommissionStatus } from "@/lib/admin/finance-actions";
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
