"use client";

import { useState, useTransition } from "react";
import { resetPricing, savePricing } from "@/lib/admin/actions";
import type { PricingOverrides, VideoConfig } from "@/lib/video-config";
import { textLang, useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";
import { ADMIN_TEXT } from "./adminText";

const num = (v: string) => Math.max(0, Number(v) || 0);

/** admin.html rebuilt: same tables, but prices are saved to Supabase instead of downloading a file. */
export function AdminPricing({ initial }: { initial: VideoConfig }) {
  const [cfg, setCfg] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [toast, toastNode] = useToast();
  const [lang] = useLang();
  const all = ADMIN_TEXT[textLang(lang)];
  const t = all.pricing;

  const update = (fn: (draft: VideoConfig) => void) => {
    setCfg((current) => {
      const draft = structuredClone(current);
      fn(draft);
      return draft;
    });
    setDirty(true);
  };

  function toOverrides(): PricingOverrides {
    return {
      depositPercent: cfg.depositPercent,
      qtyDiscounts: cfg.qtyDiscounts,
      options: Object.fromEntries(Object.entries(cfg.options).map(([id, o]) => [id, o.price])),
      services: Object.fromEntries(
        cfg.services.map((s) => [s.slug, { price: s.price, durations: s.durations?.map((d) => d.extra) }])
      ),
    };
  }

  function save() {
    startTransition(async () => {
      const result = await savePricing(toOverrides());
      if (!result.success) return toast(all.errors[result.error]);
      setCfg(result.config as VideoConfig);
      setDirty(false);
      toast(t.saved);
    });
  }

  function reset() {
    if (!confirm(t.resetConfirm)) return;
    startTransition(async () => {
      const result = await resetPricing();
      if (!result.success) return toast(all.errors[result.error]);
      setCfg(result.config as VideoConfig);
      setDirty(false);
      toast(t.resetDone);
    });
  }

  return (
    <main className="container admin notranslate" translate="no">
      <h1>
        {t.title[0]}
        <span className="gold">{t.title[1]}</span>
      </h1>
      <p className="admin-note">
        {t.note[0]}
        <b>{t.note[1]}</b>
        {t.note[2]}
        <code>config/services-data.js</code>.
      </p>

      <div className="admin-global dark-card">
        <label className="d-field">
          <span>{t.deposit}</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            id="deposit"
            value={cfg.depositPercent}
            onChange={(e) => update((d) => void (d.depositPercent = Math.min(100, num(e.target.value))))}
          />
        </label>
        <div id="discounts" className="admin-global" style={{ margin: 0 }}>
          {Object.entries(cfg.qtyDiscounts).map(([q, pct]) => (
            <label key={q} className="d-field">
              <span>{t.discount(Number(q))}</span>
              <input
                type="number"
                min={0}
                max={90}
                value={pct}
                onChange={(e) => update((d) => void (d.qtyDiscounts[q] = Math.min(90, num(e.target.value))))}
              />
            </label>
          ))}
        </div>
      </div>

      <h2 style={{ margin: "24px 0 10px" }}>{t.options}</h2>
      <table>
        <thead>
          <tr>
            <th>{t.option}</th>
            <th>{t.priceHT}</th>
            <th>{t.billed}</th>
          </tr>
        </thead>
        <tbody id="opts">
          {Object.entries(cfg.options).map(([id, o]) => (
            <tr key={id}>
              <td>{o.label}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={o.price}
                  onChange={(e) => update((d) => void (d.options[id].price = num(e.target.value)))}
                />{" "}
                €
              </td>
              <td>{o.per === "video" ? t.perVideo : t.perProject}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ margin: "24px 0 10px" }}>{t.services}</h2>
      <table>
        <thead>
          <tr>
            <th>{t.service}</th>
            <th>{t.from}</th>
            <th>{t.durations}</th>
          </tr>
        </thead>
        <tbody id="svcs">
          {cfg.services.map((s, si) => (
            <tr key={s.slug}>
              <td>
                <b>{s.name}</b>
                <br />
                <small style={{ color: "#a79d8f" }}>{s.unit}</small>
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={s.price}
                  onChange={(e) => update((d) => void (d.services[si].price = num(e.target.value)))}
                />{" "}
                €
              </td>
              <td>
                {s.durations ? (
                  s.durations.map((dur, di) => (
                    <div key={dur.label} className="opt-row">
                      {dur.label}{" "}
                      <span>
                        +{" "}
                        <input
                          type="number"
                          min={0}
                          step={10}
                          value={dur.extra}
                          onChange={(e) => update((d) => void (d.services[si].durations![di].extra = num(e.target.value)))}
                        />{" "}
                        €
                      </span>
                    </div>
                  ))
                ) : (
                  <small style={{ color: "#a79d8f" }}>{t.defaultDurations}</small>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="admin-actions">
        <button className="btn btn-primary" id="export" onClick={save} disabled={pending || !dirty}>
          <span key={String(pending)}>{pending ? t.saving : t.save}</span>
        </button>
        <button className="btn btn-outline" onClick={reset} disabled={pending}>
          {t.reset}
        </button>
        <a className="btn btn-outline" href="/services.html">
          {all.viewSite}
        </a>
      </div>
      {toastNode}
    </main>
  );
}
