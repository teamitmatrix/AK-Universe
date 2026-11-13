import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { ContactForm } from "@/components/contact/ContactForm";
import { Icon } from "@/components/ui/Icon";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getCompany } from "@/lib/company";
import { quoteServiceOptions } from "@/lib/contact/services";
import { isContactSubject } from "@/lib/contact/subjects";
import { getCurrentUser } from "@/lib/auth/session";
import { localized } from "@/i18n/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Contact — AK Universe") },
    description: t("Une idée, une question ou un projet à lancer ? Écrivez à AK Universe."),
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sujet?: string; service?: string }>;
}) {
  const [user, t, params, services] = await Promise.all([
    getCurrentUser(),
    getT(),
    searchParams,
    // Labels in the visitor's language; ids stay the French names the form and e-mail expect.
    localized(quoteServiceOptions()),
  ]);
  const email = (await getCompany()).email;
  const initialSubject = params.sujet && isContactSubject(params.sujet) ? params.sujet : "";
  const initialService =
    params.service && services.some((service) => service.id === params.service) ? params.service : "";

  return (
    <>
      <SiteHeader active="contact" signedIn={!!user} />
      <main>
        <section className="contact-page stars">
          <div className="container contact-page-grid">
            <div className="contact-intro">
              <h1>{t.rich("Parlons de votre <gold>projet.</gold>")}</h1>
              <p className="contact-intro-lead">{t("Une idée, une question ou un projet à lancer ? Écrivez-nous.")}</p>
              <a href={`mailto:${email}`} className="btn btn-outline-gold">
                <Icon name="mail" /> {t("Nous écrire par e-mail")}
              </a>
              <div className="contact-wave" aria-hidden="true" />
            </div>

            <ContactForm services={services} initialSubject={initialSubject} initialService={initialService} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
