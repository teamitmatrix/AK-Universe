import { phoneHref, TODO } from "@/config/company";
import { getCompany } from "@/lib/company";
import { getT } from "@/i18n/server";
import { Icon } from "@/components/ui/Icon";

/** Address, phone and e-mail from config/company.ts, under the project details step (/projet/informations). */
export async function ContactCard() {
  const COMPANY = await getCompany();
  const t = await getT();
  const rows = [
    {
      icon: "pin",
      label: t("Adresse"),
      value: COMPANY.address,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(COMPANY.address)}`,
    },
    { icon: "phone", label: t("Téléphone"), value: COMPANY.phone, href: phoneHref(COMPANY.phone) },
    { icon: "mail", label: t("E-mail"), value: COMPANY.email, href: `mailto:${COMPANY.email}` },
  ].filter((row) => row.value !== TODO);
  if (!rows.length) return null;

  return (
    <section className="container contact-section" aria-labelledby="contact-title">
      <div className="dark-card contact-card">
        <h2 id="contact-title">
          {t.rich("Nous <gold>contacter</gold>")}
        </h2>
        <ul className="contact-list">
          {rows.map((row) => (
            <li key={row.label}>
              <span className="icon-circle">
                <Icon name={row.icon} />
              </span>
              <div>
                <small>{row.label}</small>
                <a
                  href={row.href}
                                    {...(row.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {row.value}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
