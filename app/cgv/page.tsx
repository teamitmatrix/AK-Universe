import type { Metadata } from "next";
import { Field, LegalPage } from "@/components/legal/LegalPage";
import { COMPANY } from "@/config/company";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: "Conditions générales de vente — AK Universe",
  description: "Conditions générales de vente des abonnements Agents IA et des prestations vidéo AK Universe.",
};

export default async function CgvPage() {
  const { depositPercent } = await getVideoConfig();

  return (
    <LegalPage title="Conditions générales de vente">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions générales de vente (CGV) s&apos;appliquent à toute commande passée auprès de{" "}
        <Field value={COMPANY.legalName} /> (« AK Universe ») sur ce site, pour :
      </p>
      <ul>
        <li>les abonnements aux agents IA (« Abonnements ») ;</li>
        <li>les prestations de production vidéo et les forfaits marketing (« Prestations vidéo »).</li>
      </ul>
      <p>Toute commande implique l&apos;acceptation sans réserve des présentes CGV.</p>

      <h2>2. Prix</h2>
      <p>
        Les prix sont indiqués en euros hors taxes (HT) ; la TVA applicable est ajoutée au moment du paiement ou sur la
        facture. Les prix des Prestations vidéo affichés sur le site sont des estimations : le devis envoyé par AK
        Universe fait foi.
      </p>

      <h2>3. Abonnements Agents IA</h2>
      <p>
        L&apos;abonnement est souscrit au mois ou à l&apos;année et payé d&apos;avance par carte, prélèvement SEPA ou
        les autres moyens proposés via Stripe. Il est reconduit automatiquement à chaque échéance. Il peut être résilié
        à tout moment depuis la page « Mon compte » ; la résiliation prend effet à la fin de la période en cours, déjà
        payée, sans remboursement au prorata. Les frais de mise en place éventuels sont dus à la commande.
      </p>

      <h2>4. Prestations vidéo</h2>
      <p>
        <strong>Devis.</strong> Toute demande de devis est gratuite et sans engagement. La commande est ferme à
        l&apos;acceptation du devis ou au paiement de l&apos;acompte.
      </p>
      <p>
        <strong>Acompte.</strong> Un acompte de {depositPercent} % du montant total est demandé pour réserver la date
        de tournage. Il est payable en ligne par carte (Stripe) ou par virement bancaire ; dans ce dernier cas, la
        réservation est confirmée à réception du virement. Le solde est payable à la livraison des vidéos.
      </p>
      <p>
        <strong>Réalisation et livraison.</strong> Le tournage a lieu à la date et au lieu convenus. Les délais de
        livraison sont indiqués dans le devis ; une série de retouches est incluse sauf mention contraire.
      </p>
      <p>
        <strong>Annulation et report.</strong> Toute annulation à l&apos;initiative du client moins de 7 jours avant la
        date de tournage entraîne la conservation de l&apos;acompte. Un report à une nouvelle date, demandé au moins 48 h
        à l&apos;avance, est possible sans frais selon les disponibilités.
      </p>
      <p>
        <strong>Droits d&apos;utilisation.</strong> Après paiement complet, le client peut utiliser librement les vidéos
        livrées pour sa communication. AK Universe peut présenter les réalisations dans son portfolio, sauf demande
        contraire écrite du client.
      </p>

      <h2>5. Paiement sécurisé</h2>
      <p>
        Les paiements en ligne sont traités par Stripe. AK Universe n&apos;a jamais accès à vos données bancaires.
      </p>

      <h2>6. Droit de rétractation (clients particuliers)</h2>
      <p>
        Le client consommateur dispose d&apos;un délai de 14 jours à compter de la commande pour se rétracter, en
        écrivant à <Field value={COMPANY.email} />. Si le client demande expressément que la prestation commence avant
        la fin de ce délai, il paie la part déjà exécutée. Le droit de rétractation ne s&apos;applique pas aux
        prestations entièrement exécutées, ni aux prestations de loisirs fournies à une date déterminée (art. L221-28
        du Code de la consommation). Les clients professionnels ne bénéficient pas de ce droit.
      </p>

      <h2>7. Responsabilité</h2>
      <p>
        AK Universe est tenue d&apos;une obligation de moyens. Sa responsabilité envers un client professionnel est
        limitée au montant payé pour la prestation concernée. Les agents IA produisent des contenus automatisés que le
        client doit vérifier avant toute utilisation engageante.
      </p>

      <h2>8. Données personnelles</h2>
      <p>
        Voir notre <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>9. Réclamations et médiation</h2>
      <p>
        Pour toute réclamation : <Field value={COMPANY.email} />. Le client consommateur peut recourir gratuitement au
        médiateur de la consommation : <Field value={COMPANY.mediator} />, ou à la plateforme européenne de règlement
        des litiges en ligne.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Les présentes CGV sont soumises au droit français. À défaut d&apos;accord amiable, les tribunaux compétents sont
        ceux du siège d&apos;AK Universe pour les clients professionnels.
      </p>
    </LegalPage>
  );
}
