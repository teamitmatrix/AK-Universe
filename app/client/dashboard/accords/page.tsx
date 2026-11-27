import type { Metadata } from "next";
import { AgreementsTable } from "@/components/client/AgreementsTable";
import { listMyAgreements } from "@/lib/client/agreements";
import { requireClient } from "@/lib/client/session";

export const metadata: Metadata = { title: { absolute: "Acceptations enregistrées — AK Universe" } };

/** The signed-in customer's own accepted terms and privacy policy. */
export default async function AgreementsPage() {
  const me = await requireClient("/client/dashboard/accords");
  const rows = await listMyAgreements(me.id);
  return (
    <main className="cs-page">
      <AgreementsTable rows={rows} />
    </main>
  );
}
