import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HelpCenter } from "@/components/client/SupportClient";
import { requireClient } from "@/lib/client/session";
import { isHelpCategory } from "@/lib/client/support-content";

export const metadata: Metadata = { title: { absolute: "Centre d'aide — AK Universe" } };

/** Help centre: searchable articles by category. `?q=` search, `?categorie=` filter. */
export default async function HelpPage({ searchParams }: { searchParams: Promise<{ q?: string; categorie?: string }> }) {
  await requireClient("/dashboard/support/aide");
  const { q, categorie } = await searchParams;
  return (
    <main className="cs-page">
      <header className="cs-hello">
        <p className="cs-eyebrow">Espace client · Support</p>
        <h1>Centre d&apos;aide</h1>
        <p>Les réponses aux questions les plus fréquentes sur votre espace client.</p>
      </header>
      <div className="cs-narrow">
        <HelpCenter initialQuery={typeof q === "string" ? q.slice(0, 80) : ""} initialCategory={isHelpCategory(categorie) ? categorie : null} />
        <p className="cs-back">
          <Link href="/dashboard/support" className="cs-link-btn">
            <ArrowLeft size={14} aria-hidden="true" /> Retour au support
          </Link>
          {" · "}
          <Link href="/dashboard/support?demande=1" className="cs-link-btn">
            Contacter le support
          </Link>
        </p>
      </div>
    </main>
  );
}
