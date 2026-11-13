import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TODO } from "@/config/company";
import { getCompany } from "@/lib/company";
import { getCurrentUser } from "@/lib/auth/session";
import { getT } from "@/i18n/server";

/** A company value, highlighted while it still has to be filled in (config/company.ts). */
export function Field({ value }: { value: string }) {
  return value === TODO ? <mark className="legal-todo">[{TODO}]</mark> : <>{value}</>;
}

export async function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  const COMPANY = await getCompany();
  const [user, t] = await Promise.all([getCurrentUser(), getT()]);
  return (
    <>
      <SiteHeader active="none" signedIn={!!user} />
      <main className="section stars legal">
        <div className="container legal-body">
          <p className="eyebrow">AK Universe</p>
          <h1 className="section-title">{title}</h1>
          <p className="legal-updated">{t("Dernière mise à jour : {date}", { date: t.data(COMPANY.updatedAt) })}</p>
          {t.lang !== "fr" && (
            <p className="legal-updated">{t("Traduction fournie à titre informatif : seule la version française fait foi.")}</p>
          )}
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
