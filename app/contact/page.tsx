import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { Icon } from "@/components/ui/Icon";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { COMPANY } from "@/config/company";
import { quoteServiceOptions } from "@/lib/contact/services";
import { isContactSubject } from "@/lib/contact/subjects";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { absolute: "Contact — AK Universe" },
  description:
    "Une idée, une question ou un projet à lancer ? Écrivez à AK Universe.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sujet?: string; service?: string }>;
}) {
  const user = await getCurrentUser();
  const email = COMPANY.email;
  const params = await searchParams;
  const services = quoteServiceOptions();
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
              <h1>
                Parlons de votre <span className="gold">projet.</span>
              </h1>
              <p className="contact-intro-lead">
                Une idée, une question ou un projet à lancer ? Écrivez-nous.
              </p>
              <a href={`mailto:${email}`} className="btn btn-outline-gold">
                <Icon name="mail" /> Nous écrire par e-mail
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
