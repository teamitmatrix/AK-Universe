"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { localeOf } from "@/config/languages";
import { useLang } from "@/components/ui/LangSwitch";
import type { CommercialRow, VideasteRow } from "@/lib/admin/team";
import { dashTextFor } from "./dashText";
import { initialsOf } from "./initials";

type Dir = "asc" | "desc";
type Col<R> = {
  key: string;
  label: string;
  /** Value used for sorting (null sorts last). */
  sort: (r: R) => string | number | null;
  cell: (r: R) => React.ReactNode;
  num?: boolean;
};

const LOAD_ORDER = { overloaded: 3, normal: 2, available: 1, inactive: 0 } as const;
const LOAD_CLASS = { overloaded: "is-danger", normal: "is-info", available: "is-ok", inactive: "is-muted" } as const;

/** Sortable, filterable roster table; on phones every row becomes a labelled card (admin.css). */
function RosterTable<R extends { id: string; name: string; email: string; active: boolean }>({
  rows,
  cols,
  initialSort,
  href,
  openLabel,
}: {
  rows: R[];
  cols: Col<R>[];
  initialSort: { key: string; dir: Dir };
  href: (r: R) => string;
  openLabel: (name: string) => string;
}) {
  const [lang] = useLang();
  const t = dashTextFor(lang);
  const [sort, setSort] = useState(initialSort);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const col = cols.find((c) => c.key === sort.key) ?? cols[0]!;
    return rows
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
      .filter((r) => !status || (status === "active") === r.active)
      .sort((a, b) => {
        const x = col.sort(a);
        const y = col.sort(b);
        if (x === y) return a.name.localeCompare(b.name);
        if (x === null) return 1;
        if (y === null) return -1;
        const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), localeOf(lang));
        return sort.dir === "asc" ? cmp : -cmp;
      });
  }, [rows, cols, sort, query, status, lang]);

  const toggle = (key: string, num?: boolean) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: num ? "desc" : "asc" }));

  return (
    <>
      <div className="adm-toolbar">
        <label className="adm-search">
          <Search size={15} aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.roster.search} aria-label={t.roster.search} />
        </label>
        <select className="adm-select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label={t.roster.allStatuses}>
          <option value="">{t.roster.allStatuses}</option>
          <option value="active">{t.team.active}</option>
          <option value="inactive">{t.team.inactive}</option>
        </select>
      </div>
      {visible.length === 0 ? (
        <p className="adm-empty">{t.roster.noMatch}</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                {cols.map((c) => {
                  const on = sort.key === c.key;
                  const Icon = !on ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                  return (
                    <th key={c.key} scope="col" className={c.num ? "num" : undefined} aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                      <button type="button" className={`adm-sort${on ? " is-on" : ""}`} onClick={() => toggle(c.key, c.num)} title={t.roster.sortBy(c.label)}>
                        {c.label}
                        <Icon size={12} aria-hidden="true" />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className={r.active ? undefined : "is-inactive"}>
                  {cols.map((c, i) => (
                    <td key={c.key} data-label={c.label} className={c.num ? "num" : undefined}>
                      {i === 0 ? (
                        <span className="adm-person-cell">
                          <span className="adm-avatar sm" aria-hidden="true">
                            {initialsOf(r.name)}
                          </span>
                          <span>
                            <span>
                              <Link href={href(r)} className="adm-person" aria-label={openLabel(r.name)}>
                                {r.name}
                              </Link>
                              {!r.active && <StatusBadge active={false} />}
                            </span>
                            <a href={"mailto:" + r.email} className="adm-person-mail">
                              {r.email.split("@")[0]}@<wbr />
                              {r.email.split("@").slice(1).join("@")}
                            </a>
                          </span>
                        </span>
                      ) : (
                        c.cell(r)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const [lang] = useLang();
  const t = dashTextFor(lang).team;
  return <span className={`adm-badge ${active ? "is-ok" : "is-muted"}`}>{active ? t.active : t.inactive}</span>;
}

export function CommerciauxRoster({ rows }: { rows: CommercialRow[] }) {
  const [lang] = useLang();
  const t = dashTextFor(lang);
  const c = t.commerciaux.cols;
  const locale = localeOf(lang);
  const euros = (cents: number) => (cents / 100).toLocaleString(locale, { style: "currency", currency: "EUR" });
  const pct = (n: number | null) => (n === null ? "—" : `${n.toLocaleString(locale)} %`);

  const cols: Col<CommercialRow>[] = [
    { key: "name", label: c.name, sort: (r) => r.name, cell: (r) => r.name },
    { key: "sales", label: c.sales, num: true, sort: (r) => r.salesMonth, cell: (r) => r.salesMonth.toLocaleString(locale) },
    { key: "ca", label: c.ca, num: true, sort: (r) => r.caMonth, cell: (r) => euros(r.caMonth) },
    { key: "quotes", label: c.quotes, num: true, sort: (r) => r.quotesOpen, cell: (r) => r.quotesOpen.toLocaleString(locale) },
    { key: "conversion", label: c.conversion, num: true, sort: (r) => r.conversion, cell: (r) => pct(r.conversion) },
    {
      key: "target",
      label: c.target,
      sort: (r) => r.progress,
      cell: (r) =>
        r.target === null ? (
          "—"
        ) : (
          <span className="adm-progress" title={euros(r.target)}>
            <span className="adm-bar" aria-hidden="true">
              <span style={{ width: `${Math.min(100, r.progress ?? 0)}%` }} />
            </span>
            {r.progress}%
          </span>
        ),
    },
    { key: "commission", label: c.commission, num: true, sort: (r) => r.commissionMonth, cell: (r) => (r.commissionMonth === null ? "—" : euros(r.commissionMonth)) },
  ];

  return (
    <RosterTable
      rows={rows}
      cols={cols}
      initialSort={{ key: "ca", dir: "desc" }}
      href={(r) => `/admin/commercial-detail?id=${r.id}`}
      openLabel={t.team.open}
    />
  );
}

export function VideastesRoster({ rows, sortByLoad, hasRevisions }: { rows: VideasteRow[]; sortByLoad?: boolean; hasRevisions: boolean }) {
  const [lang] = useLang();
  const t = dashTextFor(lang);
  const c = t.videastes.cols;
  const locale = localeOf(lang);
  const n = (v: number) => v.toLocaleString(locale);

  const cols: Col<VideasteRow>[] = [
    { key: "name", label: c.name, sort: (r) => r.name, cell: (r) => r.name },
    { key: "active", label: c.active, num: true, sort: (r) => r.activeProjects, cell: (r) => n(r.activeProjects) },
    { key: "delivered", label: c.delivered, num: true, sort: (r) => r.delivered, cell: (r) => n(r.delivered) },
    {
      key: "late",
      label: c.late,
      num: true,
      sort: (r) => r.late,
      cell: (r) => (r.late > 0 ? <span className="adm-badge is-danger">{n(r.late)}</span> : n(r.late)),
    },
    ...(hasRevisions
      ? [{ key: "revisions", label: c.revisions, num: true, sort: (r: VideasteRow) => r.revisions, cell: (r: VideasteRow) => n(r.revisions ?? 0) }]
      : []),
    {
      key: "load",
      label: c.load,
      sort: (r) => LOAD_ORDER[r.load] * 1000 + r.activeProjects,
      cell: (r) => <span className={`adm-badge ${LOAD_CLASS[r.load]}`}>{t.team.loads[r.load]}</span>,
    },
  ];

  return (
    <RosterTable
      rows={rows}
      cols={cols}
      initialSort={sortByLoad ? { key: "load", dir: "desc" } : { key: "active", dir: "desc" }}
      href={(r) => `/admin/videaste-detail?id=${r.id}`}
      openLabel={t.team.open}
    />
  );
}
