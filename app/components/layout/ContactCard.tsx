import { COMPANY, phoneHref, TODO } from "@/config/company";
import { Icon } from "@/components/ui/Icon";

/** Address, phone and e-mail from config/company.ts, under the "Contact" page form (/informations). */
export function ContactCard() {
  const rows = [
    {
      icon: "pin",
      label: "Adresse",
      value: COMPANY.address,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(COMPANY.address)}`,
    },
    { icon: "phone", label: "Téléphone", value: COMPANY.phone, href: phoneHref(COMPANY.phone) },
    { icon: "mail", label: "E-mail", value: COMPANY.email, href: `mailto:${COMPANY.email}` },
  ].filter((row) => row.value !== TODO);
  if (!rows.length) return null;

  return (
    <section className="container contact-section" aria-labelledby="contact-title">
      <div className="dark-card contact-card">
        <h2 id="contact-title">
          Nous <span className="gold">contacter</span>
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
                  className="notranslate"
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
