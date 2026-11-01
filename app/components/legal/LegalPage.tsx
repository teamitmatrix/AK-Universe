import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { COMPANY, TODO } from "@/config/company";
import { getCurrentUser } from "@/lib/auth/session";

/** A company value, highlighted while it still has to be filled in (config/company.ts). */
export function Field({ value }: { value: string }) {
  return value === TODO ? <mark className="legal-todo">[{TODO}]</mark> : <>{value}</>;
}

export async function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <>
      <SiteHeader active="none" signedIn={!!user} />
      <main className="section stars legal">
        <div className="container legal-body">
          <p className="eyebrow">AK Universe</p>
          <h1 className="section-title">{title}</h1>
          <p className="legal-updated">Dernière mise à jour : {COMPANY.updatedAt}</p>
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
