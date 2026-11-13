"use client";

import { useRouter } from "next/navigation";
import { AlarmClock, ChevronLeft, ChevronRight, Globe, History, Plus, Trash2, UserCheck, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { localeOf } from "@/config/languages";
import { useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";
import {
  convertProspect,
  createProspect,
  deleteProspect,
  getProspectHistory,
  moveProspect,
  updateProspect,
  type ProspectInput,
} from "@/lib/commercial/prospect-actions";
import { OPEN_STAGES, SOURCES, STAGES, type ProspectCard, type ProspectEvent, type Stage } from "@/lib/commercial/stages";
import { TZ, toLocalInputParis } from "@/lib/commercial/time";
import { comTextFor } from "./comText";

/**
 * Kanban pipeline (commercial/prospects.html, handoff pages 05–06): 7 columns, cards moved by drag-and-drop or by
 * the ‹ › buttons (keyboard / touch friendly). Every move is sent to the server, which checks ownership and logs it;
 * the card moves at once on screen and the server answer is the final word (router.refresh()).
 */
export function ProspectsBoard({ cards, now }: { cards: ProspectCard[]; now: number }) {
  const router = useRouter();
  const [lang] = useLang();
  const t = comTextFor(lang).pipeline;
  const locale = localeOf(lang);
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  // Optimistic stage per card id, until the refreshed server data arrives.
  const [moved, setMoved] = useState<Record<string, Stage>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; id: string } | null>(null);

  const euros = (cents: number) => (cents / 100).toLocaleString(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
  const view = cards.map((c) => (moved[c.id] ? { ...c, stage: moved[c.id] } : c));
  const editing = dialog?.mode === "edit" ? (view.find((c) => c.id === dialog.id) ?? null) : null;

  function move(card: ProspectCard, to: Stage) {
    if (card.stage === to) return;
    if (card.convertedAt) return toast(t.convert.locked);
    let reason: string | undefined;
    if (to === "perdu") {
      const answer = window.prompt(t.form.lostReason, card.lostReason ?? "");
      if (answer === null) return;
      reason = answer;
    }
    setMoved((m) => ({ ...m, [card.id]: to }));
    start(async () => {
      const res = await moveProspect(card.id, to, reason);
      if (!res.success) {
        setMoved((m) => {
          const next = { ...m };
          delete next[card.id];
          return next;
        });
        return toast(t.errors[res.error] ?? t.errors.failed);
      }
      toast(t.moved(t.stages[to]));
      router.refresh();
      // The refreshed server data now carries the new stage: drop the optimistic copy.
      setMoved((m) => {
        const next = { ...m };
        delete next[card.id];
        return next;
      });
    });
  }

  return (
    <>
      <div className="com-board-bar">
        <p className="com-widget-sub">{t.dragHint}</p>
        <button type="button" className="adm-btn" onClick={() => setDialog({ mode: "create" })}>
          <Plus size={16} aria-hidden="true" /> {t.newProspect}
        </button>
      </div>

      <div className="com-board" aria-busy={pending}>
        {STAGES.map((stage, si) => {
          const list = view.filter((c) => c.stage === stage);
          const total = list.reduce((s, c) => s + (c.budgetCents ?? 0), 0);
          return (
            <section
              key={stage}
              className={`com-col is-${stage}${over === stage ? " is-over" : ""}`}
              aria-labelledby={`col-${stage}`}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (over !== stage) setOver(stage);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || dragId;
                const card = view.find((c) => c.id === id);
                setOver(null);
                setDragId(null);
                if (card) move(card, stage);
              }}
            >
              <header className="com-col-head">
                <h3 id={`col-${stage}`}>{t.stages[stage]}</h3>
                <span className="com-col-count">{list.length}</span>
                <small>{euros(total)}</small>
              </header>
              <ul className="com-col-list">
                {list.length === 0 && <li className="com-col-empty">{dragId ? t.dropHere : t.empty}</li>}
                {list.map((c) => {
                  const late = OPEN_STAGES.includes(c.stage) && c.nextFollowupAt && new Date(c.nextFollowupAt).getTime() < now;
                  const prev = STAGES[si - 1];
                  const next = STAGES[si + 1];
                  return (
                    <li
                      key={c.id}
                      className={`com-card${dragId === c.id ? " is-dragging" : ""}${c.convertedAt ? " is-converted" : ""}`}
                      draggable={!c.convertedAt}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", c.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(c.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOver(null);
                      }}
                    >
                      <div className="com-card-top">
                        <strong>{c.company || c.name}</strong>
                        {c.budgetCents !== null && <span className="com-card-budget">{euros(c.budgetCents)}</span>}
                      </div>
                      {c.company && <span className="com-card-sub">{c.name}</span>}
                      {c.need && <p className="com-card-need">{c.need}</p>}
                      <div className="com-card-tags">
                        {c.convertedAt && (
                          <span className="adm-badge is-ok">
                            <UserCheck size={12} aria-hidden="true" /> {t.client}
                          </span>
                        )}
                        {c.projectReference && (
                          <span className="adm-badge is-info" title={c.projectReference}>
                            <Globe size={12} aria-hidden="true" /> {t.fromWebsite}
                          </span>
                        )}
                        {!c.projectReference && c.source && <span className="adm-badge is-muted">{t.sources[c.source] ?? c.source}</span>}
                        {late && (
                          <span className="adm-badge is-danger">
                            <AlarmClock size={12} aria-hidden="true" /> {t.late}
                          </span>
                        )}
                        {!late && c.nextFollowupAt && OPEN_STAGES.includes(c.stage) && <span className="adm-badge is-muted">{date(c.nextFollowupAt)}</span>}
                      </div>
                      {c.nextAction && <p className="com-card-next">→ {c.nextAction}</p>}
                      <div className="com-card-actions">
                        <button
                          type="button"
                          className="adm-icon-btn sm"
                          disabled={!prev || !!c.convertedAt || pending}
                          aria-label={prev ? t.prev(t.stages[prev]) : undefined}
                          title={prev ? t.prev(t.stages[prev]) : undefined}
                          onClick={() => prev && move(c, prev)}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button type="button" className="adm-btn is-ghost sm" onClick={() => setDialog({ mode: "edit", id: c.id })}>
                          {t.open}
                        </button>
                        <button
                          type="button"
                          className="adm-icon-btn sm"
                          disabled={!next || !!c.convertedAt || pending}
                          aria-label={next ? t.next(t.stages[next]) : undefined}
                          title={next ? t.next(t.stages[next]) : undefined}
                          onClick={() => next && move(c, next)}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {dialog && (
        <ProspectDialog
          key={dialog.mode === "edit" ? dialog.id : "new"}
          card={editing}
          onClose={() => setDialog(null)}
          onMove={(to) => editing && move(editing, to)}
          toast={toast}
        />
      )}
      {toastNode}
    </>
  );
}

const toLocalInput = (iso: string | null) => (iso ? toLocalInputParis(iso) : "");

function ProspectDialog({
  card,
  onClose,
  onMove,
  toast,
}: {
  card: ProspectCard | null;
  onClose: () => void;
  onMove: (to: Stage) => void;
  toast: (message: string) => void;
}) {
  const router = useRouter();
  const [lang] = useLang();
  const t = comTextFor(lang).pipeline;
  const locale = localeOf(lang);
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [history, setHistory] = useState<ProspectEvent[] | null>(null);
  const [form, setForm] = useState<ProspectInput>(() => ({
    name: card?.name ?? "",
    company: card?.company ?? "",
    email: card?.email ?? "",
    phone: card?.phone ?? "",
    source: card?.source ?? "",
    need: card?.need ?? "",
    budgetEuros: card?.budgetCents != null ? String(card.budgetCents / 100) : "",
    nextAction: card?.nextAction ?? "",
    nextFollowupAt: toLocalInput(card?.nextFollowupAt ?? null),
    notes: card?.notes ?? "",
  }));
  const set = (k: keyof ProspectInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const cardId = card?.id;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    if (!cardId) return;
    let stale = false;
    void getProspectHistory(cardId).then((res) => {
      if (!stale) setHistory(res.success ? res.events : []);
    });
    return () => {
      stale = true;
    };
  }, [cardId, card?.stage, card?.convertedAt]);

  const close = () => {
    ref.current?.close();
    onClose();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const payload = { ...form, nextFollowupAt: form.nextFollowupAt ? new Date(form.nextFollowupAt).toISOString() : "" };
    start(async () => {
      const res = card ? await updateProspect(card.id, payload) : await createProspect(payload);
      if (!res.success) return setError(t.errors[res.error] ?? t.errors.failed);
      toast(card ? t.saved : t.created);
      router.refresh();
      close();
    });
  };

  const convert = () => {
    if (!card) return;
    if (card.stage === "perdu") return setError(t.convert.lostFirst);
    if (!window.confirm(t.convert.confirm(card.company || card.name))) return;
    start(async () => {
      const res = await convertProspect(card.id);
      if (!res.success) return setError(t.errors[res.error] ?? t.errors.failed);
      toast(t.convert.done);
      router.refresh();
    });
  };

  const remove = () => {
    if (!card || !window.confirm(t.form.deleteConfirm(card.company || card.name))) return;
    start(async () => {
      const res = await deleteProspect(card.id);
      if (!res.success) return setError(t.errors[res.error] ?? t.errors.failed);
      toast(t.deleted);
      router.refresh();
      close();
    });
  };

  const when = (iso: string) => new Date(iso).toLocaleString(locale, { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const stageName = (s: string | null) => (s ? (t.stages[s] ?? s) : "—");

  return (
    <dialog ref={ref} className="adm-modal com-prospect-modal" aria-labelledby="com-prospect-title" onClose={onClose}>
      <form className="adm-modal-card" onSubmit={submit}>
        <header>
          <h2 id="com-prospect-title">{card ? t.form.editTitle : t.form.createTitle}</h2>
          <button type="button" className="adm-icon-btn" onClick={close} aria-label={t.form.close}>
            <X size={18} />
          </button>
        </header>

        {card && (
          <div className="com-prospect-status">
            {card.convertedAt ? (
              <p className="adm-badge is-ok">
                <UserCheck size={13} aria-hidden="true" /> {t.convert.already(new Date(card.convertedAt).toLocaleDateString(locale))}
              </p>
            ) : (
              <label className="adm-field">
                <span>{t.form.stage}</span>
                <select className="adm-select" value={card.stage} disabled={pending} onChange={(e) => onMove(e.target.value as Stage)}>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {t.stages[s]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!card.convertedAt && (
              <button type="button" className="adm-btn" disabled={pending || card.stage === "perdu"} title={card.stage === "perdu" ? t.convert.lostFirst : undefined} onClick={convert}>
                <UserCheck size={16} aria-hidden="true" /> {t.convert.button}
              </button>
            )}
          </div>
        )}
        {card?.stage === "perdu" && card.lostReason && <p className="adm-muted">« {card.lostReason} »</p>}

        <div className="adm-form-grid">
          <label className="adm-field">
            <span>{t.form.name} *</span>
            <input required maxLength={120} value={form.name} onChange={set("name")} />
          </label>
          <label className="adm-field">
            <span>{t.form.company}</span>
            <input maxLength={160} value={form.company} onChange={set("company")} />
          </label>
          <label className="adm-field">
            <span>{t.form.email}</span>
            <input type="email" maxLength={254} value={form.email} onChange={set("email")} />
          </label>
          <label className="adm-field">
            <span>{t.form.phone}</span>
            <input type="tel" maxLength={40} value={form.phone} onChange={set("phone")} />
          </label>
          <label className="adm-field">
            <span>{t.form.source}</span>
            <select className="adm-select" value={form.source} onChange={set("source")}>
              <option value="">{t.form.sourceNone}</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {t.sources[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-field">
            <span>{t.form.budget}</span>
            <input inputMode="decimal" maxLength={12} value={form.budgetEuros} onChange={set("budgetEuros")} />
          </label>
          <label className="adm-field is-wide">
            <span>{t.form.need}</span>
            <input maxLength={500} value={form.need} onChange={set("need")} />
          </label>
          <label className="adm-field">
            <span>{t.form.nextAction}</span>
            <input maxLength={200} value={form.nextAction} onChange={set("nextAction")} />
          </label>
          <label className="adm-field">
            <span>{t.form.nextFollowup}</span>
            <input type="datetime-local" value={form.nextFollowupAt} onChange={set("nextFollowupAt")} />
          </label>
          <label className="adm-field is-wide">
            <span>{t.form.notes}</span>
            <textarea rows={3} maxLength={4000} value={form.notes} onChange={set("notes")} />
          </label>
        </div>

        {error && (
          <p className="adm-note" role="alert">
            {error}
          </p>
        )}

        <div className="adm-form-actions com-prospect-actions">
          {card && !card.convertedAt && (
            <button type="button" className="adm-btn is-ghost com-danger" disabled={pending} onClick={remove}>
              <Trash2 size={15} aria-hidden="true" /> {t.form.delete}
            </button>
          )}
          <button type="button" className="adm-btn is-ghost" onClick={close}>
            {t.form.cancel}
          </button>
          <button type="submit" className="adm-btn" disabled={pending}>
            {card ? t.form.save : t.form.create}
          </button>
        </div>

        {card && (
          <section className="com-history" aria-labelledby="com-history-title">
            <h3 id="com-history-title">
              <History size={15} aria-hidden="true" /> {t.history.title}
            </h3>
            {history === null ? (
              <p className="adm-muted">…</p>
            ) : history.length === 0 ? (
              <p className="adm-muted">{t.history.empty}</p>
            ) : (
              <ol>
                {history.map((h) => (
                  <li key={h.id}>
                    <strong>
                      {h.kind === "created"
                        ? `${t.history.created} · ${stageName(h.toStage)}`
                        : h.kind === "converted"
                          ? t.history.converted
                          : h.kind === "reassigned"
                            ? t.history.reassigned
                            : t.history.stage(stageName(h.fromStage), stageName(h.toStage))}
                    </strong>
                    <small>
                      {when(h.at)} · {h.actor ?? t.history.system}
                    </small>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </form>
    </dialog>
  );
}
