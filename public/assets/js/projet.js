/* =========================================================
   AK UNIVERSE — Services vidéo & parcours « Mon projet »
   Composants : SiteHeader, ServicePage (ServiceHero, VideoPreview,
   Benefits, Included, Examples), ServiceOptions (configurateur),
   MonProjet, ProjectSummary, CustomerForm, QuoteOrDeposit,
   Payment, Confirmation.
   Chargé AVANT main.js : le rendu est synchrone, main.js
   transforme ensuite les <i data-i> en icônes et branche les menus.
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.AKU_CONFIG;
  if (!CFG) return;

  /* ---------- Icônes supplémentaires (lues par renderIcons de main.js) ---------- */
  window.EXTRA_ICONS = {
    diamond: '<path d="M6 3h12l3.5 6L12 21 2.5 9z"/><path d="M2.5 9h19M9 3l3 18 3-18M6 3l3 6M18 3l-3 6"/>',
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5M10 20v-5.5h4V20"/>',
    video: '<rect x="2.5" y="6" width="13.5" height="12" rx="2.5"/><path d="m16 10.5 5.5-3.5v10L16 13.5"/>',
    heart: '<path d="M12 20s-7.5-4.6-9-9.3C2 7.4 4.1 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.1 0 5.2 2.9 4.2 6.2C19.5 15.4 12 20 12 20z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m21 16-5.5-5.5L6 20"/>',
    box: '<path d="m12 2.8 8.5 4.6v9.2L12 21.2l-8.5-4.6V7.4z"/><path d="M3.5 7.4 12 12l8.5-4.6M12 12v9.2"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h3l2.4 11.5h11l2-8H6.6"/>',
    "play-square": '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M10 8.5v7l5.5-3.5z" fill="currentColor"/>',
    "megaphone-o": '<path d="M3.5 10v4a1 1 0 0 0 1 1h2.5l7 4.5v-15L7 9H4.5a1 1 0 0 0-1 1z"/><path d="M17.5 9a4.5 4.5 0 0 1 0 6M7.5 15l1.2 5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/><path d="m12 12 7-7M16.5 3.5 19 5l1.5 2.5"/>',
    "calendar-o": '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h1M11.5 14h1M15 14h1M8 17h1M11.5 17h1"/>',
    utensils: '<path d="M6 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M8 3v18M17 21V3c-2 0-3.5 2.5-3.5 6s1.5 4 3.5 4"/>',
    cloche: '<path d="M3 17.5h18M4.5 17.5a7.5 7.5 0 0 1 15 0M12 7V5.5M10.5 5.5h3M3 20h18"/>',
    leaf: '<path d="M20 4C9.5 4 4 9 4 15.5c0 2 .6 3.5.6 3.5S6 20 8.5 20C15 20 20 14.5 20 4z"/><path d="M4.5 19.5c3-5 7-8.5 11-10.5"/>',
    smartphone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    drone: '<circle cx="5" cy="5" r="2.2"/><circle cx="19" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><rect x="9" y="9" width="6" height="6" rx="1.5"/><path d="M6.6 6.6 9 9M17.4 6.6 15 9M6.6 17.4 9 15M17.4 17.4 15 15"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    fourk: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M6.5 9v3.5h3M9 9v6M13 9v6M17.5 9l-3 3 3 3"/>',
    cap: '<path d="M2 9.5 12 5l10 4.5-10 4.5z"/><path d="M6 11.3V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.7M22 9.5V15"/>',
    "gear-o": '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    message: '<path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5 5 16.1A8.5 8.5 0 1 1 20.5 11.5z"/>',
    handshake: '<path d="m11 17 2 2a1.4 1.4 0 0 0 2-2M13 15l2.5 2.5a1.4 1.4 0 0 0 2-2l-3-3M9.5 6.5 12 4l3 3M2.5 12l4-6 3 1.5L14 12l1 1M21.5 12l-4-6-3 1"/><path d="M8.5 13.5 11 16a1.4 1.4 0 0 1-2 2l-2.5-2.5"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>',
    car: '<path d="M5 17H3.5v-4.5l2-5A2 2 0 0 1 7.4 6h9.2a2 2 0 0 1 1.9 1.5l2 5V17H19"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5M3.5 12.5h17"/>',
    film: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M7.5 3v18M16.5 3v18M3 8h4.5M3 12h18M3 16h4.5M16.5 8H21M16.5 16H21"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    voice: '<path d="M12 3v18M8 7v10M4 10v4M16 6v12M20 10v4"/>',
    subtitles: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M6.5 12.5h3M12 12.5h5.5M6.5 15.5h7M15.5 15.5h2"/>',
    trash: '<path d="M4 6.5h16M9.5 6.5V4.5h5v2M6 6.5l1 13.5h10l1-13.5M10 10.5v6M14 10.5v6"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    clapper: '<path d="M3.5 10h17v9.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M3.5 10 3 6.5l15.8-3 .7 3.8L3.5 10zM7.5 5.7l2.3 3.2M12.5 4.8l2.3 3.2"/>',
    "credit-card": '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6 15h4"/>',
    "file-text": '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 12.5h6M9 16h6M9 9h2"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
  };

  /* ---------- Utilitaires ---------- */
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const euro = (n) => Math.round(n).toLocaleString("fr-FR") + " €";
  const icons = (root) => { if (typeof renderIcons === "function") renderIcons(root); };
  const say = (msg) => { if (typeof toast === "function") toast(msg); };

  const ls = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const ss = {
    get(k, d) { try { return JSON.parse(sessionStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  /* ---------- Données & calcul des prix ---------- */
  const SERVICES = CFG.services;
  const svc = (slug) => SERVICES.find((s) => s.slug === slug);
  const serviceUrl = (s) => `services/${s.slug}.html`;

  /* Forfaits Marketing (abonnements mensuels, univers séparé des services vidéo
     à l'unité et des abonnements Agents IA — voir marketing/forfaits.html) */
  const PLANS = (CFG.marketing && CFG.marketing.plans) || [];
  const plan = (key) => PLANS.find((p) => p.key === key);
  const isForfait = (item) => !!item && item.type === "forfait";

  const optionsOf = (s) => (s.options || []).map((o) => {
    const ref = typeof o === "string" ? { id: o } : o;
    const base = CFG.options[ref.id] || {};
    return { ...base, ...ref, per: ref.per || base.per || "projet" };
  }).filter((o) => o.label);
  const durationsOf = (s) => s.durations || CFG.defaultDurations;
  const qtyChoicesOf = (s) => s.qtyChoices || Object.keys(s.qtyDiscounts || CFG.qtyDiscounts).map(Number);
  const discountOf = (s, qty) => ((s.qtyDiscounts || CFG.qtyDiscounts)[qty] || 0);
  const qtyLabelOf = (s) => s.qtyLabel || "Nombre de vidéos";
  const qtyWord = (s, n) => {
    const plural = qtyLabelOf(s).replace(/^Nombre de /, "");
    if (n > 1) return `${n} ${plural}`;
    const p = plural.split(" ");
    p[0] = p[0].replace(/s$/, "");
    return `${n} ${p.join(" ")}`;
  };

  function priceOf(item) {
    if (isForfait(item)) { const p = plan(item.key); return p ? p.price : 0; }
    const s = svc(item.slug);
    if (!s) return 0;
    const durs = durationsOf(s);
    const dur = durs[item.dur] || durs[0];
    const opts = optionsOf(s).filter((o) => item.opts.includes(o.id));
    const perVideo = opts.filter((o) => o.per === "video").reduce((a, o) => a + o.price, 0);
    const perProjet = opts.filter((o) => o.per !== "video").reduce((a, o) => a + o.price, 0);
    const videos = (s.price + (dur?.extra || 0) + perVideo) * item.qty * (1 - discountOf(s, item.qty) / 100);
    return Math.round(videos + perProjet);
  }
  function summaryOf(item) {
    if (isForfait(item)) { const p = plan(item.key); return p ? `Abonnement mensuel • ${p.tagline}` : "Abonnement mensuel"; }
    const s = svc(item.slug);
    const durs = durationsOf(s);
    const parts = [qtyWord(s, item.qty), (durs[item.dur] || durs[0]).label];
    optionsOf(s).filter((o) => item.opts.includes(o.id)).forEach((o) => parts.push(o.label.replace(/ \(.*\)$/, "")));
    return parts.join(" • ");
  }
  /* Nom, URL et vignette d'un item du projet, qu'il s'agisse d'un service
     vidéo à l'unité ou d'un forfait marketing (abonnement). */
  function itemName(item) {
    if (isForfait(item)) { const p = plan(item.key); return p ? `Forfait ${p.name}` : "Forfait"; }
    const s = svc(item.slug);
    return s ? s.name : "";
  }
  function itemUrl(item) {
    if (isForfait(item)) return "marketing/forfaits.html";
    const s = svc(item.slug);
    return s ? serviceUrl(s) : "services.html";
  }
  function itemThumb(item, region, extraClass = "") {
    if (isForfait(item)) {
      const r = REGIONS[region];
      return `<div class="ph ph-empty ${extraClass}" style="--w:${r.w};--h:${r.h}" aria-hidden="true"><i data-i="crown"></i></div>`;
    }
    return crop(svc(item.slug), region, extraClass);
  }

  /* ---------- Store « Mon projet » (persiste entre les pages) ---------- */
  const KEY = "aku-projet";
  const Projet = {
    items() { return ls.get(KEY, []).filter((i) => (isForfait(i) ? !!plan(i.key) : !!svc(i.slug))); },
    save(items) { ls.set(KEY, items); updateBadges(); },
    add(item) {
      // Un seul forfait (abonnement) actif à la fois : en choisir un nouveau remplace le précédent.
      const it = this.items().filter((i) => !(isForfait(item) && isForfait(i)));
      it.push({ ...item, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) });
      this.save(it);
    },
    update(id, patch) { this.save(this.items().map((i) => (i.id === id ? { ...i, ...patch } : i))); },
    remove(id) { this.save(this.items().filter((i) => i.id !== id)); },
    clear() { this.save([]); },
    total() { return this.items().reduce((a, i) => a + priceOf(i), 0); },
    deposit() { return Math.round(this.total() * CFG.depositPercent / 100); },
  };
  window.AKU_PROJET = Projet;

  function updateBadges() {
    const n = Projet.items().length;
    qa(".projet-badge").forEach((b) => { b.textContent = n; b.hidden = n === 0; });
  }
  window.addEventListener("storage", (e) => e.key === KEY && updateBadges());

  /* ---------- Images (découpes temporaires des maquettes) ---------- */
  const REGIONS = {
    poster: { x: 862, y: 118, w: 688, h: 328 },
    side: { x: 185, y: 639, w: 431, h: 236 },
    thumb: { x: 290, y: 639, w: 236, h: 236 },
  };
  function crop(s, region, extraClass = "") {
    if (!s.mockup) return `<div class="ph ph-empty ${extraClass}" style="--w:${REGIONS[region].w};--h:${REGIONS[region].h}" aria-hidden="true"><i data-i="clapper"></i></div>`;
    const r = REGIONS[region];
    return `<div class="ph ${extraClass}" aria-hidden="true" style="background-image:url(assets/img/maquettes/${s.mockup}.webp);--iw:1672;--ih:941;--x:${r.x};--y:${r.y};--w:${r.w};--h:${r.h}"></div>`;
  }

  /* ---------- SiteHeader (site vidéo) ---------- */
  function renderHeader() {
    const h = q('header[data-nav="video"]');
    if (!h) return;
    const active = h.dataset.active || "";
    const cur = document.body.dataset.service;
    const links = SERVICES.map((s) => `<li><a href="${serviceUrl(s)}"${s.slug === cur ? ' aria-current="page" class="current"' : ""}>${esc(s.name)} <i data-i="chev-right"></i></a></li>`).join("");
    h.className = "site-header";
    h.innerHTML = `
      <div class="container nav nav-video">
        <a href="index.html" class="logo" aria-label="AK Universe — retour à l'accueil"><img src="/assets/img/logo.svg" alt=""><span><span class="ak">AK</span> UNIVERSE</span></a>
        <a href="projet.html" class="projet-link projet-link-mobile" aria-label="Mon projet" title="Mon projet"><i data-i="clapper"></i><span class="projet-badge" hidden>0</span></a>
        <button class="burger" aria-label="Ouvrir le menu" aria-expanded="false"><i data-i="menu"></i></button>
        <div class="nav-menu">
          <ul class="nav-links">
            <li><a href="index.html" class="nav-link">Accueil</a></li>
            <li class="has-dropdown">
              <button class="nav-link${active === "services" ? " active" : ""}" aria-expanded="false" aria-haspopup="true">Services <i data-i="chev-down" class="chev"></i></button>
              <div class="dropdown services-dd">
                <ul class="dropdown-list">${links}</ul>
                <a href="services.html" class="dd-all">Voir tous les services <i data-i="arrow"></i></a>
              </div>
            </li>
            <li><a href="services.html#realisations" class="nav-link${active === "realisations" ? " active" : ""}">Réalisation</a></li>
          </ul>
          <div class="nav-actions">
            <a href="projet.html" class="projet-link${active === "projet" ? " active" : ""}"><i data-i="clapper"></i><span class="projet-count-label">Mon projet</span><span class="projet-badge" hidden>0</span></a>
            <a href="services.html" class="btn btn-primary">Devis gratuit <i data-i="arrow"></i></a>
            <a href="#" class="social" aria-label="LinkedIn"><i data-i="linkedin"></i></a>
            <a href="#" class="social" aria-label="Instagram"><i data-i="instagram"></i></a>
          </div>
        </div>
      </div>`;
  }

  function renderFooter() {
    const f = q("footer[data-footer]");
    if (!f) return;
    f.className = "site-footer";
    f.innerHTML = `<div class="container">
      <a href="marketing.html" class="logo"><img src="/assets/img/logo.svg" alt=""><span><span class="ak">AK</span> UNIVERSE</span></a>
      <nav class="footer-links" aria-label="Liens de pied de page">
        <a href="services.html">Services vidéo</a><a href="projet.html">Mon projet</a><a href="marketing/forfaits.html">Forfaits</a><a href="index.html">Agents IA</a>
      </nav>
      <span>© ${new Date().getFullYear()} AK Universe</span>
      <nav class="footer-legal" aria-label="Informations légales">
        <a href="mentions-legales.html">Mentions légales</a><a href="confidentialite.html">Confidentialité</a><a href="cgv.html">CGV</a>
      </nav></div>`;
  }

  /* ---------- Stepper ---------- */
  function stepper(n) {
    const steps = ["Mon projet", "Mes informations", "Validation"];
    return `<ol class="flow-steps" aria-label="Étapes">${steps.map((l, i) => {
      const st = i + 1 < n ? "done" : i + 1 === n ? "current" : "";
      return `<li class="${st}"${i + 1 === n ? ' aria-current="step"' : ""}><span class="n">${i + 1 < n ? '<i data-i="check"></i>' : i + 1}</span>${l}</li>`;
    }).join("")}</ol>`;
  }

  /* ---------- ServicePage ---------- */
  function renderServicePage() {
    const root = q("#service-root");
    if (!root) return;
    const s = svc(document.body.dataset.service);
    if (!s) { root.innerHTML = `<div class="container empty-state"><h1>Service introuvable</h1><a class="btn btn-primary" href="services.html">Voir tous les services</a></div>`; return; }
    document.title = `${s.name} — AK Universe`;
    const top = s.titleTop || "Vidéo";

    root.innerHTML = `
      <section class="svc-hero stars">
        <div class="container svc-hero-grid">
          <div class="svc-copy">
            <a href="marketing.html" class="back-link"><i data-i="arrow-left"></i> Retour</a>
            <nav class="crumbs" aria-label="Fil d'Ariane"><a href="marketing.html">Accueil</a><i data-i="chev-right"></i><a href="services.html">Services</a><i data-i="chev-right"></i><span aria-current="page">${esc(s.name)}</span></nav>
            <h1 class="svc-title">${esc(top)}<br><span class="gold">${esc(s.gold)}</span></h1>
            <p class="svc-lead">${esc(s.description)}</p>
            <ul class="benefits">${s.benefits.map(([ic, t]) => `<li><span class="benefit-ic"><i data-i="${ic}"></i></span>${esc(t)}</li>`).join("")}</ul>
            <div class="cta-row">
              <button class="btn btn-primary btn-lg" data-add="${s.slug}"><i data-i="plus"></i> Ajouter à mon projet</button>
              <button class="btn btn-outline-gold btn-lg" data-quote="${s.slug}">Demander un devis</button>
            </div>
          </div>
          <div class="video-card">
            <div class="video-stage">
              ${crop(s, "poster", "svc-poster")}
              <video src="assets/video/${s.slug}.mp4" preload="none" playsinline></video>
              <button class="video-big-play svc-play" aria-label="Lire la vidéo"><i data-i="play"></i></button>
            </div>
            <div class="video-controls">
              <button class="v-toggle" aria-label="Lecture / pause"><i data-i="play"></i></button>
              <div class="progress" role="presentation"><span></span></div>
              <span class="video-time">0:00 / ${esc(s.duration)}</span>
              <button class="v-full" aria-label="Plein écran"><i data-i="fullscreen"></i></button>
            </div>
            <div class="video-msg" role="status"></div>
          </div>
        </div>
      </section>

      ${CFG.clients?.length ? `<section class="clients" aria-label="Ils nous font confiance"><div class="container clients-row"><span class="clients-title">Ils nous font confiance</span>${CFG.clients.map((c) => `<span class="client">${esc(c)}</span>`).join("")}</div></section>` : ""}

      <section class="container svc-included">
        ${crop(s, "side", "svc-side")}
        <div class="included-copy">
          <h2>${esc(s.includesTitle[0])} <span class="gold">${esc(s.includesTitle[1])}</span></h2>
          <p>${esc(s.includesText)}</p>
          <ul class="gold-checks">${s.includes.map((t) => `<li><i data-i="check-circle"></i>${esc(t)}</li>`).join("")}</ul>
        </div>
        <aside class="price-card">
          <span class="from">À partir de</span>
          <div class="price-line"><strong>${euro(s.price)}</strong> <span>${esc(s.unit)}</span></div>
          <p class="price-note">${esc(s.priceNote)} Prix indicatif selon les besoins du projet.</p>
          <ul class="gold-checks small">${s.priceList.map((t) => `<li><i data-i="check-circle"></i>${esc(t)}</li>`).join("")}</ul>
          <button class="btn btn-primary btn-block" data-add="${s.slug}">Ajouter à mon projet <i data-i="arrow"></i></button>
          <button class="btn btn-outline-gold btn-block" data-quote="${s.slug}">Demander un devis</button>
        </aside>
      </section>

      <section class="container svc-examples" id="realisations">
        <div class="examples-head">
          <h2>Nos réalisations <span class="gold">${esc(s.realisations)}</span></h2>
          <a href="services.html#realisations" class="link-gold">Voir toutes les réalisations <i data-i="arrow"></i></a>
        </div>
        <div class="examples-grid">${examplesHtml(s)}</div>
      </section>`;
  }

  function examplesHtml(s) {
    return `
      <article class="example"><div class="example-media">${crop(s, "poster")}<span class="example-play"><i data-i="play"></i></span></div><h3>${esc(s.name)} — extrait</h3><p>Aperçu du rendu final</p></article>
      <article class="example"><div class="example-media">${crop(s, "side")}</div><h3>Coulisses du tournage</h3><p>Matériel et équipe professionnels</p></article>
      <button class="example example-cta" data-add="${s.slug}"><span class="icon-circle"><i data-i="plus"></i></span><h3>Votre projet ici ?</h3><p>Configurez votre ${esc(s.name.toLowerCase())} en quelques clics.</p></button>`;
  }

  /* ---------- Liste des services (étape 1 : choix) ---------- */
  function renderServicesList() {
    const root = q("#services-list");
    if (!root) return;
    root.innerHTML = SERVICES.map((s) => `
      <article class="svc-card">
        <a href="${serviceUrl(s)}" class="svc-card-media">${crop(s, "poster")}</a>
        <div class="svc-card-body">
          <h3><a href="${serviceUrl(s)}">${esc(s.name)}</a></h3>
          <p>${esc(s.description)}</p>
          <div class="svc-card-foot">
            <span class="from-price">À partir de <strong>${euro(s.price)}</strong> ${esc(s.unit)}</span>
            <div class="svc-card-actions">
              <a href="${serviceUrl(s)}" class="btn btn-outline btn-sm">Découvrir</a>
              <button class="btn btn-primary btn-sm" data-add="${s.slug}"><i data-i="plus"></i> Ajouter</button>
            </div>
          </div>
        </div>
      </article>`).join("");
  }

  /* ---------- ServiceOptions : configurateur (modale) ---------- */
  function openConfigurator(slug, { editId = null, mode = "add" } = {}) {
    const s = svc(slug);
    if (!s) return;
    const existing = editId ? Projet.items().find((i) => i.id === editId) : null;
    const qtys = qtyChoicesOf(s);
    const state = existing ? { ...existing, opts: [...existing.opts] } : { slug, qty: qtys[0], dur: 0, opts: [] };
    const durs = durationsOf(s);
    const opts = optionsOf(s);
    const lastFocus = document.activeElement;

    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="cfg-title">
        <button class="modal-close" aria-label="Fermer"><i data-i="x"></i></button>
        <div class="tabs" role="tablist">
          <button role="tab" aria-selected="true" data-tab="options">Options</button>
          <button role="tab" aria-selected="false" data-tab="exemples">Exemples</button>
          <button role="tab" aria-selected="false" data-tab="faq">FAQ</button>
        </div>
        <div class="tab-panel" data-panel="options">
          <h2 id="cfg-title">Personnalisez votre ${esc(s.name.toLowerCase())}</h2>
          ${qtys.length > 1 ? `
          <div class="cfg-group"><span class="cfg-label">${esc(qtyLabelOf(s))}</span>
            <div class="seg" role="radiogroup" aria-label="${esc(qtyLabelOf(s))}">${qtys.map((n) => `<button role="radio" data-qty="${n}">${qtyWord(s, n)}${discountOf(s, n) ? ` <span class="pill">-${discountOf(s, n)}%</span>` : ""}</button>`).join("")}</div>
          </div>` : ""}
          <div class="cfg-group"><span class="cfg-label">${s.durations ? "Format / durée" : "Durée par vidéo"}</span>
            <div class="seg" role="radiogroup" aria-label="Durée">${durs.map((d, i) => `<button role="radio" data-dur="${i}">${esc(d.label)}${d.extra ? ` <small>+${euro(d.extra)}</small>` : ""}</button>`).join("")}</div>
          </div>
          <ul class="cfg-options">${opts.map((o) => `
            <li><label class="cfg-opt">
              <i data-i="${o.icon || "sparkle"}"></i>
              <span>${esc(o.label)}</span>
              <span class="cfg-price">+ ${euro(o.price)}${o.per === "video" && qtys.length > 1 ? " / unité" : ""}</span>
              <span class="switch dark"><input type="checkbox" data-opt="${o.id}"><span></span></span>
            </label></li>`).join("")}</ul>
          <button class="btn btn-primary btn-block btn-lg cfg-submit"><i data-i="cart"></i> <span class="cfg-submit-label"></span></button>
          <p class="cfg-note">Prix indicatif, ajusté selon vos besoins.</p>
        </div>
        <div class="tab-panel" data-panel="exemples" hidden><div class="examples-grid compact">${examplesHtml(s)}</div></div>
        <div class="tab-panel" data-panel="faq" hidden>
          ${CFG.faq.map((f) => `<details class="faq"><summary>${esc(f.q)}<i data-i="chev-down"></i></summary><p>${esc(f.a)}</p></details>`).join("")}
        </div>
        <div class="cfg-done" hidden>
          <span class="done-ic"><i data-i="check"></i></span>
          <h2>${editId ? "Service mis à jour" : "Ajouté à votre projet"}</h2>
          <p class="done-summary"></p>
          <div class="cta-row center">
            <a href="projet.html" class="btn btn-primary">Voir mon projet <i data-i="arrow"></i></a>
            <a href="services.html" class="btn btn-outline">Ajouter un autre service</a>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    document.body.classList.add("modal-open");
    icons(wrap);

    const modal = q(".modal", wrap);
    const render = () => {
      qa("[data-qty]", modal).forEach((b) => b.setAttribute("aria-checked", String(+b.dataset.qty === state.qty)));
      qa("[data-dur]", modal).forEach((b) => b.setAttribute("aria-checked", String(+b.dataset.dur === state.dur)));
      qa("[data-opt]", modal).forEach((c) => (c.checked = state.opts.includes(c.dataset.opt)));
      const verb = editId ? "Mettre à jour" : mode === "quote" ? "Continuer vers mon devis" : "Ajouter à mon projet";
      q(".cfg-submit-label", modal).textContent = `${verb} – ${euro(priceOf(state))}`;
    };
    const close = () => { wrap.remove(); document.body.classList.remove("modal-open"); lastFocus?.focus?.(); };

    modal.addEventListener("click", (e) => {
      const t = e.target.closest("button, input");
      if (!t) return;
      if (t.dataset.qty) { state.qty = +t.dataset.qty; render(); }
      else if (t.dataset.dur !== undefined) { state.dur = +t.dataset.dur; render(); }
      else if (t.dataset.tab) {
        qa("[role=tab]", modal).forEach((b) => b.setAttribute("aria-selected", String(b === t)));
        qa(".tab-panel", modal).forEach((p) => (p.hidden = p.dataset.panel !== t.dataset.tab));
      } else if (t.dataset.add) { qa("[role=tab]", modal)[0].click(); }
    });
    modal.addEventListener("change", (e) => {
      const c = e.target.closest("[data-opt]");
      if (!c) return;
      state.opts = c.checked ? [...state.opts, c.dataset.opt] : state.opts.filter((x) => x !== c.dataset.opt);
      render();
    });
    q(".cfg-submit", modal).addEventListener("click", () => {
      const data = { slug: s.slug, qty: state.qty, dur: state.dur, opts: state.opts };
      if (editId) Projet.update(editId, data); else Projet.add(data);
      if (mode === "quote") { location.href = "informations.html"; return; }
      if (editId) { close(); document.dispatchEvent(new CustomEvent("projet:change")); return; }
      qa(".tabs, .tab-panel", modal).forEach((el) => (el.hidden = true));
      q(".cfg-done", modal).hidden = false;
      q(".done-summary", modal).textContent = `${s.name} — ${summaryOf(state)} — ${euro(priceOf(state))} HT`;
      q(".cfg-done .btn", modal).focus();
    });
    q(".modal-close", wrap).addEventListener("click", close);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") { // piège de focus simple
        const f = qa("button:not([hidden]), a, input", modal).filter((el) => el.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    render();
    q(".modal-close", wrap).focus();
  }
  window.AKU_CONFIGURATOR = openConfigurator;

  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    const quote = e.target.closest("[data-quote]");
    if (add && !add.closest(".modal")) { e.preventDefault(); openConfigurator(add.dataset.add); }
    else if (quote) { e.preventDefault(); openConfigurator(quote.dataset.quote, { mode: "quote" }); }
  });

  /* ---------- ProjectSummary (récapitulatif compact) ---------- */
  function summaryHtml({ editable = false } = {}) {
    const items = Projet.items();
    return `
      <div class="recap-head"><h2>Mon projet</h2>${editable ? '<a href="projet.html" class="link-gold">Modifier</a>' : ""}</div>
      <ul class="recap-list">${items.map((i) =>
        `<li>${itemThumb(i, "thumb", "recap-thumb")}<div><strong>${esc(itemName(i))}</strong><small>${esc(summaryOf(i))}</small></div><b>${euro(priceOf(i))}</b></li>`
      ).join("")}</ul>
      <div class="recap-total"><span>Estimation totale</span><strong>${euro(Projet.total())} <small>HT</small></strong></div>
      <p class="muted-note">Prix indicatif, ajusté selon vos besoins.</p>`;
  }
  const emptyHtml = `<div class="empty-state">
      <span class="icon-circle big"><i data-i="clapper"></i></span>
      <h2>Votre projet est vide</h2>
      <p>Choisissez un ou plusieurs services vidéo pour composer votre projet.</p>
      <a href="services.html" class="btn btn-primary btn-lg">Choisir mes services <i data-i="arrow"></i></a>
    </div>`;

  /* ---------- MonProjet ---------- */
  function renderProjet() {
    const root = q("#projet-root");
    if (!root) return;
    const items = Projet.items();
    if (!items.length) { root.innerHTML = stepper(1) + emptyHtml; icons(root); return; }
    root.innerHTML = `${stepper(1)}
      <div class="projet-card">
        <div class="projet-head">
          <div><h1>Mon projet</h1><p>${items.length} prestation${items.length > 1 ? "s" : ""} sélectionnée${items.length > 1 ? "s" : ""}</p></div>
          <button class="text-btn" id="vider"><i data-i="trash"></i> Vider le projet</button>
        </div>
        <ul class="projet-items">${items.map((i) => {
          const forfait = isForfait(i);
          const name = itemName(i);
          return `<li class="projet-item">
            <a href="${itemUrl(i)}">${itemThumb(i, "thumb", "projet-thumb")}</a>
            <div class="pi-info"><h3>${esc(name)}</h3><p>${esc(summaryOf(i))}</p>
              <div class="pi-actions"><button class="text-btn" data-edit="${i.id}"><i data-i="edit"></i> Modifier</button><button class="text-btn" data-remove="${i.id}"><i data-i="trash"></i> Retirer</button></div></div>
            <div class="pi-qty" aria-label="Quantité">${forfait ? "Abonnement mensuel" : qtyWord(svc(i.slug), i.qty)}</div>
            <strong class="pi-price">${euro(priceOf(i))}</strong>
            <button class="pi-x" data-remove="${i.id}" aria-label="Retirer ${esc(name)}"><i data-i="x"></i></button>
          </li>`;
        }).join("")}</ul>
        <a href="services.html" class="add-more"><i data-i="plus"></i> Ajouter un autre service</a>
        <div class="estimate">
          <div class="estimate-row"><h2>Estimation de votre projet</h2><div class="estimate-price"><span>À partir de</span><strong>${euro(Projet.total())}</strong> <small>HT</small></div></div>
          <ul class="estimate-badges"><li><i data-i="info"></i> Prix indicatif</li><li><i data-i="file-text"></i> Devis personnalisé après échange</li><li><i data-i="shield"></i> Aucun engagement</li></ul>
          <p class="muted-note">Cette estimation n'est pas un devis définitif : le prix final est confirmé après étude de votre projet.</p>
          <div class="cta-row">
            <a href="informations.html" class="btn btn-outline-gold btn-lg" style="flex:1"><i data-i="mail"></i> Demander un devis</a>
            <a href="informations.html" class="btn btn-primary btn-lg" style="flex:1"><i data-i="lock"></i> Réserver et payer un acompte</a>
          </div>
        </div>
      </div>`;
    icons(root);
  }
  document.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-remove]");
    const ed = e.target.closest("[data-edit]");
    if (rm) { Projet.remove(rm.dataset.remove); renderProjet(); say("Service retiré de votre projet."); }
    else if (ed) {
      const it = Projet.items().find((i) => i.id === ed.dataset.edit);
      if (!it) return;
      if (isForfait(it)) location.href = "marketing/forfaits.html";
      else openConfigurator(it.slug, { editId: it.id });
    }
    else if (e.target.closest("#vider")) {
      // Confirmation en deux clics (pas de confirm() : bloqué dans certains navigateurs intégrés)
      const b = e.target.closest("#vider");
      if (b.dataset.armed) { Projet.clear(); renderProjet(); return; }
      b.dataset.armed = "1";
      b.textContent = "Confirmer : tout vider ?";
      setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.innerHTML = '<i data-i="trash"></i> Vider le projet'; icons(b); } }, 4000);
    }
  });
  document.addEventListener("projet:change", renderProjet);

  /* ---------- CustomerForm ---------- */
  function renderInfos() {
    const root = q("#infos-root");
    if (!root) return;
    if (!Projet.items().length) { root.innerHTML = stepper(2) + emptyHtml; icons(root); return; }
    const c = ss.get("aku-client", {});
    const v = (k) => esc(c[k] || "");
    const today = new Date().toISOString().slice(0, 10);
    root.innerHTML = `${stepper(2)}
      <div class="flow-grid">
        <aside class="dark-card recap">${summaryHtml({ editable: true })}</aside>
        <form class="dark-card" id="client-form" novalidate>
          <h2>Vos informations</h2>
          <div class="d-row">
            <label class="d-field"><span>Prénom *</span><input name="prenom" required autocomplete="given-name" value="${v("prenom")}" placeholder="Jean"></label>
            <label class="d-field"><span>Nom *</span><input name="nom" required autocomplete="family-name" value="${v("nom")}" placeholder="Dupont"></label>
          </div>
          <label class="d-field"><span>Entreprise</span><input name="entreprise" autocomplete="organization" value="${v("entreprise")}" placeholder="Nom de votre société (facultatif)"></label>
          <div class="d-row">
            <label class="d-field"><span>E-mail *</span><input name="email" type="email" required autocomplete="email" value="${v("email")}" placeholder="jean@entreprise.fr"></label>
            <label class="d-field"><span>Téléphone *</span><input name="tel" type="tel" required autocomplete="tel" pattern="\\+?[0-9 .]{8,}" value="${v("tel")}" placeholder="06 12 34 56 78"></label>
          </div>
          <div class="d-row">
            <label class="d-field"><span>Ville / lieu du tournage *</span><input name="lieu" required autocomplete="address-level2" value="${v("lieu")}" placeholder="Paris"></label>
            <label class="d-field"><span>Date souhaitée</span><input name="date" type="date" min="${today}" value="${v("date")}"></label>
          </div>
          <label class="d-field"><span>Votre message (optionnel)</span><textarea name="message" rows="3" placeholder="Décrivez votre projet, vos objectifs, etc.">${v("message")}</textarea></label>
          <button class="btn btn-primary btn-block">Continuer <i data-i="arrow"></i></button>
          <p class="muted-note">* Champs obligatoires. Vos données servent uniquement à traiter votre demande.</p>
        </form>
      </div>`;
    icons(root);
    const form = q("#client-form");
    form.addEventListener("input", () => ss.set("aku-client", Object.fromEntries(new FormData(form))));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      ss.set("aku-client", Object.fromEntries(new FormData(form)));
      location.href = "finaliser.html";
    });
  }

  /* ---------- QuoteOrDeposit ---------- */
  function renderFinaliser() {
    const root = q("#finaliser-root");
    if (!root) return;
    const c = ss.get("aku-client", null);
    if (!Projet.items().length) { root.innerHTML = stepper(3) + emptyHtml; icons(root); return; }
    if (!c?.email) { location.replace("informations.html"); return; }
    const pct = CFG.depositPercent;
    root.innerHTML = `${stepper(3)}
      <h1 class="flow-title">Comment souhaitez-vous finaliser ?</h1>
      <p class="flow-sub">Estimation de votre projet : <strong class="gold">${euro(Projet.total())} HT</strong></p>
      <div class="choice-grid">
        <div class="choice">
          <span class="choice-ic"><i data-i="file-text"></i></span>
          <h2>Recevoir un devis personnalisé</h2>
          <ul class="gold-checks"><li><i data-i="check-circle"></i>Étude personnalisée du projet</li><li><i data-i="check-circle"></i>Prix final adapté aux besoins</li><li><i data-i="check-circle"></i>Réponse sous 24 à 48h</li><li><i data-i="check-circle"></i>Aucun paiement immédiat</li></ul>
          <button class="btn btn-outline-gold btn-block btn-lg" id="send-quote"><i data-i="mail"></i> Demander mon devis</button>
        </div>
        <div class="choice featured">
          <span class="choice-ic"><i data-i="credit-card"></i></span>
          <h2>Réserver avec un acompte</h2>
          <ul class="gold-checks"><li><i data-i="check-circle"></i>Réservation sécurisée de votre date</li><li><i data-i="check-circle"></i>Acompte de ${pct} % : <strong>${euro(Projet.deposit())} HT</strong></li><li><i data-i="check-circle"></i>Confirmation immédiate</li><li><i data-i="check-circle"></i>Solde selon le devis final</li></ul>
          <a href="acompte.html" class="btn btn-primary btn-block btn-lg">Payer un acompte <i data-i="arrow"></i></a>
        </div>
      </div>`;
    icons(root);
    q("#send-quote").addEventListener("click", (e) => {
      e.currentTarget.disabled = true;
      e.currentTarget.textContent = "Envoi en cours…";
      finish("devis");
    });
  }

  const siteLang = () => { try { return localStorage.getItem("aku-language") || "fr"; } catch { return "fr"; } };

  /* Envoie le projet au serveur (POST /api/projects), qui recalcule les prix,
     l'enregistre et, pour un acompte, renvoie l'URL du paiement Stripe. */
  async function submitProjet(type, payment) {
    const client = ss.get("aku-client", {});
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // lang: the Stripe payment page opens in the language picked on the site.
      body: JSON.stringify({ kind: type, payment, client, items: Projet.items(), lang: siteLang() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Une erreur est survenue. Veuillez réessayer.");
    ss.set("aku-derniere-demande", {
      type, ref: data.ref, date: new Date().toISOString(), client,
      total: data.total, acompte: data.acompte, depositPercent: CFG.depositPercent,
    });
    return data;
  }

  async function finish(type) {
    const btn = q("#send-quote");
    try {
      await submitProjet(type);
      location.href = "confirmation.html";
    } catch (err) {
      say(err.message);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-i="mail"></i> Demander mon devis'; icons(btn); }
    }
  }

  /* ---------- Payment (acompte) ---------- */
  function renderAcompte() {
    const root = q("#acompte-root");
    if (!root) return;
    const c = ss.get("aku-client", null);
    if (!Projet.items().length) { root.innerHTML = stepper(3) + emptyHtml; icons(root); return; }
    if (!c?.email) { location.replace("informations.html"); return; }
    const pct = CFG.depositPercent;
    root.innerHTML = `${stepper(3)}
      <h1 class="flow-title">Paiement de l'acompte</h1>
      <div class="flow-grid">
        <aside class="stack-dark">
          <div class="dark-card recap">${summaryHtml({ editable: true })}
            <div class="deposit-box"><span>Acompte (${pct} %) à régler aujourd'hui</span><strong>${euro(Projet.deposit())} <small>HT</small></strong></div>
            <p class="muted-note">Le solde sera réglé selon le devis final, après validation des détails.</p>
          </div>
          <div class="dark-card">
            <div class="recap-head"><h2>Vos informations</h2><a href="informations.html" class="link-gold">Modifier</a></div>
            <dl class="client-dl">
              <dt>Nom</dt><dd>${esc(c.prenom)} ${esc(c.nom)}${c.entreprise ? " — " + esc(c.entreprise) : ""}</dd>
              <dt>Contact</dt><dd>${esc(c.email)} · ${esc(c.tel)}</dd>
              <dt>Tournage</dt><dd>${esc(c.lieu)}${c.date ? " · " + new Date(c.date).toLocaleDateString("fr-FR") : ""}</dd>
            </dl>
          </div>
        </aside>
        <form class="dark-card" id="pay-deposit" novalidate>
          <h2>Moyen de paiement</h2>
          <div class="pay-methods" role="radiogroup" aria-label="Moyen de paiement">
            <label class="pay-method"><input type="radio" name="pm" value="carte" checked><i data-i="credit-card"></i><span>Carte bancaire</span><small>Visa, Mastercard, CB, Amex</small></label>
            <label class="pay-method"><input type="radio" name="pm" value="wallet"><i data-i="smartphone"></i><span>Apple Pay / Google Pay</span></label>
            <label class="pay-method"><input type="radio" name="pm" value="virement"><i data-i="file-text"></i><span>Virement bancaire</span><small>Réservation confirmée à réception</small></label>
          </div>
          <div class="stripe-slot" id="stripe-element">
            <i data-i="lock"></i>
            <p>Le formulaire de paiement sécurisé Stripe s'affichera ici.</p>
          </div>
          <label class="cgv"><input type="checkbox" required> <span>J'accepte les <a href="cgv.html" target="_blank" rel="noopener">conditions générales de vente</a> et je comprends que l'acompte réserve ma date.</span></label>
          <button class="btn btn-primary btn-block btn-lg" id="pay-btn"><i data-i="lock"></i> Payer ${euro(Projet.deposit())} d'acompte</button>
          <p class="secure-dark"><i data-i="shield"></i><span>Paiement 100 % sécurisé par <b>Stripe</b>. Vos données bancaires ne transitent jamais par nos serveurs.</span></p>
        </form>
      </div>`;
    icons(root);
    q("#pay-deposit").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      if (!f.reportValidity()) return;
      const btn = q("#pay-btn");
      btn.disabled = true;
      btn.textContent = "Paiement en cours…";
      const reset = (msg) => {
        const paymentMessage = q("#stripe-element p");
        if (paymentMessage) {
          paymentMessage.textContent = msg;
          paymentMessage.setAttribute("role", "alert");
        }
        btn.disabled = false;
        btn.innerHTML = `<i data-i="lock"></i> Payer ${euro(Projet.deposit())} d'acompte`;
        icons(btn);
        say(msg);
      };
      if (q('input[name="pm"]:checked').value === "virement") {
        // Virement : la demande est enregistrée, la réservation est confirmée à réception.
        submitProjet("acompte", "virement").then(() => (location.href = "confirmation.html")).catch((err) => reset(err.message));
        return;
      }
      submitProjet("acompte")
        .then((data) => { location.href = data.checkoutUrl; })
        .catch((err) => reset(err.message));
    });
  }

  /* ---------- Confirmation ---------- */
  function renderConfirmation() {
    const root = q("#confirmation-root");
    if (!root) return;
    const d = ss.get("aku-derniere-demande", null);
    const paid = new URLSearchParams(location.search).get("paid") === "1";
    if (d && (d.type !== "acompte" || paid)) Projet.clear(); // le projet est enregistré : on repart d'un projet vide
    const steps = ["Analyse de votre projet", "Proposition d'un devis personnalisé", "Échange pour valider les détails", "Organisation du tournage", "Création et livraison des vidéos"];
    root.innerHTML = `
      <div class="confirm">
        <span class="confirm-ic"><i data-i="check"></i></span>
        <h1>Votre projet est bien enregistré !</h1>
        <p>Nous vous remercions pour votre confiance.${d?.client?.email ? `<br>Un e-mail récapitulatif va être envoyé à <strong>${esc(d.client.email)}</strong>.` : ""}</p>
        ${d ? `<div class="confirm-ref">
          <span>Référence <strong>${esc(d.ref)}</strong></span>
          <span>${d.type === "acompte" ? (paid ? `Acompte réglé : <strong>${euro(d.acompte)} HT</strong>` : `Acompte en attente : <strong>${euro(d.acompte)} HT</strong>`) : "Demande de devis"}</span>
          <span>Estimation : <strong>${euro(d.total)} HT</strong></span>
        </div>` : ""}
        <div class="next-steps">
          <h2><i data-i="calendar-o"></i> Prochaines étapes</h2>
          <ol>${steps.map((s, i) => `<li><span class="n">${i + 1}</span>${s}</li>`).join("")}</ol>
        </div>
        <a href="marketing.html" class="btn btn-primary btn-lg">Retour à l'accueil</a>
      </div>`;
  }

  /* ---------- Démarrage (synchrone, avant main.js) ---------- */
  renderHeader();
  renderFooter();
  renderServicePage();
  renderServicesList();
  renderProjet();
  renderInfos();
  renderFinaliser();
  renderAcompte();
  renderConfirmation();
  updateBadges();
})();

