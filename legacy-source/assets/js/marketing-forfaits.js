/* =========================================================
   AK UNIVERSE — Page « Forfaits Marketing » (/marketing/forfaits.html)
   ---------------------------------------------------------
   Univers 100% séparé des abonnements Agents IA (agents-ia/tarifs.html).
   Composants : MarketingPricingPage, PricingCard, IncludedFeatures,
   CustomQuoteSection, ProjectButton.
   Les prix, textes et inclus viennent de window.AKU_CONFIG.marketing
   (assets/js/services-data.js) : à modifier là-bas pour les mettre à jour.
   Chargé après projet.js (store « Mon projet ») et avant main.js
   (qui transforme ensuite les <i data-i> en icônes).
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.AKU_CONFIG;
  const MK = CFG && CFG.marketing;
  const root = document.getElementById("forfaits-root");
  if (!MK || !root) return;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const euro = (n) => Math.round(n).toLocaleString("fr-FR") + " €";

  /* ---------- PricingCard ---------- */
  function PricingCard(p) {
    return `
      <article class="plan forfait${p.popular ? " featured" : ""}">
        ${p.popular ? `<span class="popular"><i data-i="star"></i> Le plus populaire</span>` : ""}
        <div class="plan-top">
          <h2>${esc(p.name)}</h2>
          <div class="amt">
            <span class="from">À partir de</span>
            <div class="price">${euro(p.price)}</div>
            <div class="per">HT / mois</div>
          </div>
        </div>
        <p class="desc">${esc(p.tagline)}</p>
        <ul class="feature-list">${p.features.map((f) => `<li><i data-i="check-circle"></i>${esc(f)}</li>`).join("")}</ul>
        <button type="button" class="btn btn-primary btn-block" data-choose-forfait="${esc(p.key)}">
          Choisir ce forfait <i data-i="arrow"></i>
        </button>
      </article>`;
  }

  /* ---------- IncludedFeatures (réutilisé pour les 4 bénéfices du hero
     et les 5 éléments inclus dans tous les forfaits) ---------- */
  function IncludedFeatures(items, extraClass = "") {
    return `<div class="perks ${extraClass}">${items.map((it) => `
      <div class="perk">
        <span class="icon-circle"><i data-i="${esc(it.icon)}"></i></span>
        <div><strong>${esc(it.title)}</strong><span>${esc(it.text)}</span></div>
      </div>`).join("")}</div>`;
  }

  /* ---------- CustomQuoteSection ---------- */
  function CustomQuoteSection(c) {
    return `
      <div class="cta-box">
        <h2>${esc(c.title)}</h2>
        <p class="cta-box-text">${esc(c.text)}</p>
        <div class="cta-row cta-row-center">
          <a href="informations.html" class="btn btn-primary btn-lg">${esc(c.primaryCta)} <i data-i="arrow"></i></a>
          <button type="button" class="btn btn-outline btn-lg" id="expert-cta">${esc(c.secondaryCta)}</button>
        </div>
      </div>`;
  }

  /* ---------- MarketingPricingPage ---------- */
  function MarketingPricingPage() {
    document.title = "Forfaits Marketing — AK Universe";
    root.innerHTML = `
      <section class="pricing stars">
        <div class="container">
          <nav class="crumbs crumbs-center" aria-label="Fil d'Ariane">
            <a href="marketing.html">Accueil</a><i data-i="chev-right"></i>
            <a href="marketing.html">Marketing</a><i data-i="chev-right"></i>
            <span aria-current="page">Forfaits</span>
          </nav>
          <div class="pricing-head">
            <h1>Forfaits <span class="gold">Marketing</span></h1>
            <p>Des solutions complètes pour booster votre visibilité, attirer plus de clients et développer votre activité grâce à des vidéos et stratégies marketing sur-mesure.</p>
          </div>
          ${IncludedFeatures(MK.benefits, "hero-perks")}
          <div class="plans forfaits-grid">${MK.plans.map(PricingCard).join("")}</div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <p class="eyebrow">Nos forfaits</p>
          <h2 class="section-title">Ce qui est inclus dans <span class="gold">tous nos forfaits</span></h2>
          ${IncludedFeatures(MK.included)}
          ${CustomQuoteSection(MK.customQuote)}
        </div>
      </section>`;
  }

  /* ---------- ProjectButton ----------
     Ajoute le forfait choisi à « Mon projet » (store partagé AKU_PROJET,
     voir assets/js/projet.js) SANS aller directement au paiement : le
     client peut ensuite voir son forfait, le modifier, ajouter des
     services vidéo, voir une estimation, demander un devis ou réserver
     avec un acompte depuis projet.html / informations.html / finaliser.html. */
  function wireProjectButtons() {
    root.addEventListener("click", (e) => {
      const chooseBtn = e.target.closest("[data-choose-forfait]");
      if (chooseBtn) {
        const key = chooseBtn.dataset.chooseForfait;
        const p = MK.plans.find((pl) => pl.key === key);
        if (!p || !window.AKU_PROJET) return;
        window.AKU_PROJET.add({ type: "forfait", key });
        if (typeof toast === "function") toast(`Forfait ${p.name} ajouté à votre projet.`);

        const original = chooseBtn.innerHTML;
        chooseBtn.disabled = true;
        chooseBtn.innerHTML = `<i data-i="check"></i> Ajouté à mon projet`;
        if (typeof renderIcons === "function") renderIcons(chooseBtn);
        setTimeout(() => {
          chooseBtn.disabled = false;
          chooseBtn.innerHTML = original;
          if (typeof renderIcons === "function") renderIcons(chooseBtn);
        }, 2200);
        return;
      }
      if (e.target.closest("#expert-cta")) {
        if (typeof toast === "function") toast("La prise de rendez-vous avec un expert sera bientôt disponible.");
      }
    });
  }

  MarketingPricingPage();
  wireProjectButtons();
})();
