/*
 * Questions visitors ask the site chatbot, with answers taken from the site itself
 * (pages, config/services-data.js, config/pricing.ts, /cgv, /confidentialite).
 * Each entry becomes one searchable chunk (lib/chatbot/corpus.ts), so keep one topic per entry.
 * Admin-editable numbers (video prices, deposit, discounts) are NOT written here: the corpus
 * generates them from the live catalogue. Change an answer here when the matching page changes.
 */

import { agents } from "./agents";
import { COMPANY } from "./company";

export type FaqEntry = { q: string; a: string; url?: string };

export const CHATBOT_FAQ: { topic: string; entries: FaqEntry[] }[] = [
  {
    topic: "AK Universe",
    entries: [
      {
        q: "Qu'est-ce que AK Universe ? Que faites-vous ?",
        a: "AK Universe aide les entreprises sur deux univers séparés : des agents IA par abonnement qui automatisent les ventes, le support, le marketing et la productivité (disponibles 24/7), et la production de vidéos professionnelles (entreprise, événementiel, réseaux sociaux, drone, mariage, immobilier…) avec des forfaits marketing mensuels.",
        url: "/",
      },
      {
        q: "Pourquoi choisir AK Universe ?",
        a: "Pour les agents IA : gagner du temps en automatisant les tâches répétitives, augmenter ses revenus (plus de prospects, plus de clients), offrir un support toujours disponible et une solution sur-mesure adaptée à son activité. Pour la vidéo : tournage avec matériel professionnel, montage sur-mesure, formats adaptés à tous les supports et accompagnement de la stratégie à la diffusion.",
      },
      {
        q: "Dans quelles langues le site et l'assistant sont-ils disponibles ?",
        a: "Le site est en français et en anglais ; d'autres langues (dont l'hindi et l'ourdou) sont proposées via la traduction automatique Google (à titre indicatif, seule la version française fait foi). L'assistant répond dans la langue choisie sur le site, y compris à la voix.",
      },
      {
        q: "Comment contacter AK Universe ? Adresse, téléphone, e-mail ?",
        a: `Par téléphone au ${COMPANY.phone}, par e-mail à ${COMPANY.email}, ou à notre adresse : ${COMPANY.address}. Une demande de devis se fait directement sur /contact, sans créer de projet au préalable.`,
        url: "/contact",
      },
      {
        q: "Avec quels clients avez-vous travaillé ? Avez-vous des références ?",
        a: "La page des réalisations (/marketing/realisations) regroupera les projets et campagnes déjà réalisés. Cette sélection n'est pas encore publiée. Pour des références liées à votre secteur, demandez-les lors de votre demande de devis.",
        url: "/marketing/realisations",
      },
    ],
  },
  {
    topic: "Agents IA",
    entries: [
      {
        q: "Quels agents IA proposez-vous ?",
        a: `${agents.length} agents spécialisés : ${agents.map((agent) => `${agent.name} (${agent.menu})`).join(", ")}. Chaque agent a sa page avec ses fonctionnalités, intégrations, langues et tarifs sur /agents-ia.`,
        url: "/agents-ia",
      },
      {
        q: "Combien de temps faut-il pour mettre en place / livrer un agent IA ?",
        a: "La mise en place est simple et rapide : vous choisissez votre agent, vous le configurez en quelques minutes (nous vous guidons pas à pas) et l'accès est immédiat — vos agents IA sont activés dès la confirmation du paiement. Pour une solution sur mesure (offre Sur devis, intégrations spécifiques), le calendrier est défini avec vous lors de l'échange sur votre projet.",
        url: "/agents-ia#tarifs",
      },
      {
        q: "Comment fonctionnent les agents IA ? Comment ça marche ?",
        a: "En 3 étapes : 1) choisissez l'agent adapté à vos besoins, 2) configurez-le en quelques minutes avec notre accompagnement, 3) obtenez des résultats : vos agents IA travaillent pour vous 24/7. Vous les gérez depuis votre espace client, au sein de votre organisation.",
        url: "/",
      },
      {
        q: "Les agents IA sont-ils disponibles 24h/24 ?",
        a: "Oui, les agents IA travaillent 24/7. L'option Téléphonie IA permet même à un agent de répondre à vos appels 24h/24.",
      },
      {
        q: "Puis-je essayer les agents IA gratuitement ?",
        a: "Oui, vous pouvez tester gratuitement nos agents IA en créant votre compte sur /inscription (boutons « Essayer gratuitement » / « Commencer gratuitement »).",
        url: "/inscription",
      },
      {
        q: "Les agents IA s'intègrent-ils à mon CRM ou à mes outils ?",
        a: "Oui : l'offre Pro inclut des intégrations (CRM, outils…), Pro Business des intégrations avancées et l'offre Sur devis des intégrations spécifiques. L'Agent Technique est dédié aux automatisations et intégrations.",
        url: "/agents-ia#tarifs",
      },
      {
        q: "Les agents IA sont-ils adaptés à mon secteur ?",
        a: "Les agents sont conçus comme une solution sur-mesure adaptée à votre activité et à vos objectifs, pour tous types d'entreprises : commerce et e-commerce, conseil, immobilier, santé, restauration, industrie et BTP, technologie, éducation…",
      },
      {
        q: "Dois-je vérifier ce que produisent les agents IA ?",
        a: "Oui : les agents IA produisent des contenus automatisés que vous devez vérifier avant toute utilisation engageante (contrat, devis, communication officielle), comme le prévoient les CGV.",
        url: "/cgv",
      },
      {
        q: "Peut-on avoir plusieurs utilisateurs ou toute une équipe ?",
        a: "Oui. Vous créez une organisation pour collaborer avec votre équipe, et vous pouvez ajouter des utilisateurs supplémentaires à votre abonnement (jusqu'à 500), facturés par utilisateur et par mois.",
        url: "/abonnement",
      },
    ],
  },
  {
    topic: "Agents IA — compte et abonnement",
    entries: [
      {
        q: "Comment créer un compte et m'abonner aux agents IA ?",
        a: "1) Créez votre compte sur /inscription (e-mail et mot de passe, ou Google). 2) Saisissez le code à 6 chiffres reçu par e-mail (il expire après 15 minutes). 3) Créez votre organisation (nom, secteur, taille). 4) Personnalisez votre abonnement sur /abonnement (période, utilisateurs, options). 5) Payez sur /paiement : l'activation est immédiate.",
        url: "/inscription",
      },
      {
        q: "Je n'ai pas reçu le code de vérification / le code a expiré.",
        a: "Le code à 6 chiffres expire après 15 minutes. Sur la page de vérification, demandez un nouveau code (attendez une minute entre deux demandes) et vérifiez vos courriers indésirables.",
        url: "/verification",
      },
      {
        q: "J'ai oublié mon mot de passe.",
        a: "Sur /connexion, cliquez sur « Mot de passe oublié ? » et saisissez votre e-mail : un lien de réinitialisation vous est envoyé. Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.",
        url: "/connexion",
      },
      {
        q: "L'abonnement est-il sans engagement ? Comment résilier ?",
        a: "Oui, l'abonnement est sans engagement : vous pouvez résilier à tout moment depuis « Mon compte » → « Gérer mon abonnement ». La résiliation prend effet à la fin de la période en cours, déjà payée, sans remboursement au prorata.",
        url: "/compte",
      },
      {
        q: "Quels moyens de paiement acceptez-vous pour l'abonnement ?",
        a: "Le paiement est sécurisé par Stripe : carte bancaire, prélèvement automatique SEPA, et Apple Pay (proposé automatiquement sur la page de paiement par carte). Vous pouvez aussi ajouter un code promotionnel.",
        url: "/paiement",
      },
      {
        q: "Mensuel ou annuel : quelle différence ?",
        a: "L'abonnement se paie d'avance au mois ou à l'année et se renouvelle automatiquement à chaque échéance. Le paiement annuel donne une remise (voir le montant exact sur /abonnement) et est facturé en une fois pour 12 mois.",
        url: "/abonnement",
      },
      {
        q: "Comment changer de carte, voir mes factures ou modifier mon abonnement ?",
        a: "Depuis « Mon compte » (/compte), le bouton « Gérer mon abonnement » ouvre l'espace sécurisé Stripe : changement de carte, factures et résiliation.",
        url: "/compte",
      },
      {
        q: "Y a-t-il des frais de mise en place ?",
        a: "Oui, selon l'offre choisie, des frais de mise en place s'appliquent (montants « à partir de » sur /agents-ia#tarifs, sur devis pour l'offre Sur devis). Ils sont dus à la commande.",
        url: "/agents-ia#tarifs",
      },
      {
        q: "Les prix incluent-ils la TVA ?",
        a: "Non, les prix sont indiqués en euros hors taxes (HT). La TVA applicable est ajoutée au moment du paiement ou sur la facture (elle peut être non applicable ou autoliquidée selon votre statut).",
        url: "/cgv",
      },
      {
        q: "Quand mes agents IA sont-ils activés après le paiement ?",
        a: "Immédiatement : vos agents IA sont activés dès la confirmation du paiement, et un reçu vous est envoyé par e-mail.",
      },
    ],
  },
  {
    topic: "Vidéo — commander",
    entries: [
      {
        q: "Comment commander une vidéo / demander un devis ?",
        a: "Pour un devis : ouvrez /contact (sujet « Demande de devis ») et décrivez votre projet. Aucun service ni projet n'est obligatoire. Depuis une fiche ou une carte de service, le formulaire est déjà rempli avec ce service, que vous pouvez changer. Pour composer plusieurs services et réserver une date avec un acompte, utilisez « Mon projet » (/projet, puis /projet/informations).",
        url: "/contact",
      },
      {
        q: "Le devis est-il gratuit ? Est-ce que je m'engage ?",
        a: "Oui, toute demande de devis est gratuite et sans engagement, sans paiement immédiat. La commande n'est ferme qu'à l'acceptation du devis ou au paiement de l'acompte.",
        url: "/cgv",
      },
      {
        q: "En combien de temps recevrai-je mon devis ?",
        a: "Vous recevez une réponse sous 24 à 48 h, avec une étude personnalisée de votre projet et un prix final adapté à vos besoins.",
        url: "/contact",
      },
      {
        q: "Le prix affiché est-il définitif ?",
        a: "Non : les prix « à partir de » et l'estimation de votre projet sont indicatifs. Le prix final est confirmé dans votre devis, après un échange sur votre projet (durée, lieu, options, complexité).",
        url: "/projet",
      },
      {
        q: "Puis-je commander plusieurs services vidéo dans un même projet ?",
        a: "Oui, vous pouvez ajouter plusieurs services à votre projet, les modifier ou les retirer, puis demander un seul devis ou réserver avec un seul acompte.",
        url: "/projet",
      },
      {
        q: "Puis-je modifier mon projet après l'envoi ?",
        a: "Oui, tant que le devis n'est pas validé. Nous ajustons ensemble chaque détail.",
      },
      {
        q: "Que se passe-t-il après ma demande ?",
        a: "Vous recevez un e-mail récapitulatif avec une référence, puis : 1) analyse de votre projet, 2) proposition d'un devis personnalisé, 3) échange pour valider les détails, 4) organisation du tournage, 5) création et livraison des vidéos. Si vous étiez connecté, vous suivez le statut dans « Mon compte ».",
        url: "/confirmation",
      },
      {
        q: "Comment suivre l'avancement de mon projet vidéo ?",
        a: "Si vous étiez connecté lors de votre demande, le statut apparaît dans « Mon compte » : demande reçue, acompte en attente, acompte payé, en cours, terminé (ou annulé).",
        url: "/compte",
      },
      {
        q: "Puis-je demander un projet vidéo sur-mesure qui n'est pas dans la liste ?",
        a: "Oui, nous créons aussi des packs sur-mesure selon vos besoins. Demandez un devis sur /contact en décrivant votre projet : aucun service ni projet n'est obligatoire. Depuis une page de service, le formulaire est déjà rempli avec ce service.",
        url: "/contact",
      },
    ],
  },
  {
    topic: "Vidéo — tournage et livraison",
    entries: [
      {
        q: "Quels sont les délais de livraison d'une vidéo ?",
        a: "En général 2 à 3 semaines après le tournage. L'option « Livraison express » réduit ce délai à 3 à 5 jours. Le délai exact de votre projet est indiqué dans le devis.",
      },
      {
        q: "Où se déroule le tournage ? Vous déplacez-vous ?",
        a: "Le tournage a lieu chez vous, sur site ou en studio, à la date et au lieu convenus. Les frais de déplacement éventuels sont précisés dans le devis. Certains formats (réseaux sociaux, témoignages) peuvent aussi être réalisés à distance.",
      },
      {
        q: "Combien de retouches / révisions sont incluses ?",
        a: "Une série de retouches est incluse sauf mention contraire ; selon le service, 1 à 3 révisions sont incluses (indiqué sur chaque page de service). Vous pouvez ajouter l'option « Révision supplémentaire ».",
        url: "/cgv",
      },
      {
        q: "Puis-je utiliser librement les vidéos ? Qui détient les droits ?",
        a: "Après paiement complet, vous pouvez utiliser librement les vidéos livrées pour votre communication. AK Universe peut présenter les réalisations dans son portfolio, sauf demande contraire écrite de votre part. La musique utilisée est libre de droits.",
        url: "/cgv",
      },
      {
        q: "Le pilote de drone est-il certifié ?",
        a: "Oui, les vidéos drone sont réalisées par un télépilote certifié et assuré, avec du matériel professionnel, des prises de vues en 4K et dans le respect de la réglementation en vigueur.",
        url: "/services/video-drone",
      },
      {
        q: "Livrez-vous des formats pour les réseaux sociaux (vertical, carré) ?",
        a: "Oui : les vidéos sont adaptées à vos supports (web, réseaux sociaux, salons…) et l'option « Formats réseaux sociaux (vertical, carré) » décline vos vidéos pour Reels, TikTok, Shorts, Stories ou LinkedIn.",
      },
      {
        q: "Proposez-vous la voix-off et les sous-titres ?",
        a: "Oui, en option : voix-off professionnelle et sous-titres (inclus d'office sur certains services comme les témoignages clients ou les forfaits marketing).",
      },
      {
        q: "Quel matériel utilisez-vous ?",
        a: "Un matériel haut de gamme et une équipe professionnelle : tournage multi-caméras (caméra supplémentaire en option), son de qualité broadcast pour les interviews, drone 4K, étalonnage et montage cinématographique.",
      },
    ],
  },
  {
    topic: "Vidéo — paiement, acompte et annulation",
    entries: [
      {
        q: "Comment payer l'acompte ? Quels moyens de paiement ?",
        a: "L'acompte se paie en ligne, de façon sécurisée par Stripe : carte bancaire (Visa, Mastercard, CB, Amex), Apple Pay / Google Pay, ou par virement bancaire (la réservation est alors confirmée à réception du virement). AK Universe n'a jamais accès à vos données bancaires.",
        url: "/acompte",
      },
      {
        q: "Quand dois-je payer le solde ?",
        a: "Le solde est payable à la livraison des vidéos, selon le devis final validé ensemble.",
        url: "/cgv",
      },
      {
        q: "Puis-je annuler ou reporter mon tournage ?",
        a: "Un report à une nouvelle date, demandé au moins 48 h à l'avance, est possible sans frais selon les disponibilités. En cas d'annulation de votre part moins de 7 jours avant la date de tournage, l'acompte est conservé.",
        url: "/cgv",
      },
      {
        q: "Ai-je un droit de rétractation ?",
        a: "Les clients particuliers disposent de 14 jours à compter de la commande pour se rétracter. Si vous demandez que la prestation commence avant la fin de ce délai, vous payez la part déjà exécutée. Ce droit ne s'applique pas aux prestations entièrement exécutées ni aux prestations de loisirs à date déterminée, ni aux clients professionnels.",
        url: "/cgv",
      },
    ],
  },
  {
    topic: "Forfaits Marketing",
    entries: [
      {
        q: "Qu'est-ce que les forfaits marketing ?",
        a: "Des abonnements mensuels de marketing local et de contenu pour développer votre visibilité : gestion des réseaux sociaux (Instagram, Facebook, TikTok), publications, Reels et Stories, fiche Google Business Profile, réponses aux avis clients, reporting, et tournages vidéo selon le forfait. Ils sont séparés des abonnements Agents IA. Choisissez un forfait sur /marketing/forfaits : il est ajouté à votre projet, puis vous demandez un devis ou réservez.",
        url: "/marketing/forfaits",
      },
      {
        q: "Quelle est la différence entre les forfaits marketing et les agents IA ?",
        a: "Ce sont deux univers séparés : les forfaits marketing sont une gestion mensuelle de vos réseaux sociaux, de votre fiche Google et de vos contenus (photos, Reels, vidéos) réalisée par notre équipe (/marketing/forfaits) ; les agents IA sont des assistants automatisés par abonnement logiciel (/agents-ia#tarifs).",
      },
      {
        q: "Puis-je avoir un échange avec un expert marketing ?",
        a: "La prise de rendez-vous en ligne avec un expert sera bientôt disponible. En attendant, demandez un devis sur /contact en décrivant vos objectifs.",
        url: "/contact",
      },
    ],
  },
  {
    topic: "Données personnelles et sécurité",
    entries: [
      {
        q: "Que faites-vous de mes données personnelles ?",
        a: "Vos données servent uniquement à traiter votre demande, gérer votre compte, la facturation et vous informer du suivi. Elles ne sont jamais vendues ni utilisées à des fins publicitaires. Durées de conservation : 3 ans après le dernier contact pour les demandes de devis, 10 ans pour les données de facturation (obligation comptable).",
        url: "/confidentialite",
      },
      {
        q: "Utilisez-vous des cookies publicitaires ?",
        a: "Non. Le site n'utilise ni cookie publicitaire ni outil de mesure d'audience, seulement les éléments nécessaires (session, langue, projet en cours, paiement Stripe).",
        url: "/confidentialite#cookies",
      },
      {
        q: "Le paiement est-il sécurisé ?",
        a: "Oui : les paiements sont traités par Stripe, certifié PCI-DSS niveau 1, et vos données bancaires ne transitent jamais par nos serveurs. Les échanges sont chiffrés (HTTPS) et les mots de passe ne sont jamais stockés en clair.",
        url: "/confidentialite",
      },
      {
        q: "Comment exercer mes droits (accès, suppression de mes données) ?",
        a: "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Écrivez à AK Universe (adresse sur /confidentialite) : réponse sous un mois. Vous pouvez aussi saisir la CNIL.",
        url: "/confidentialite",
      },
    ],
  },
];
