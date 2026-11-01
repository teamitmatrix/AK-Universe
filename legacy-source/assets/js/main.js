/* =========================================================
   AK UNIVERSE â€” Scripts
   ========================================================= */

/* ---------- IcÃ´nes (style Lucide) : <i data-i="nom"></i> ---------- */
var ICONS = window.__AK_ICONS || (window.__AK_ICONS = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  "arrow-left": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  "chev-down": '<path d="m6 9 6 6 6-6"/>',
  "chev-right": '<path d="m9 6 6 6-6 6"/>',
  "check-circle": '<circle cx="12" cy="12" r="9.5"/><path d="m8 12.2 2.7 2.7L16.2 9.4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor" stroke="none"/>',
  sparkle: '<path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="currentColor" stroke="none"/>',
  star: '<path d="m12 2.8 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z" fill="currentColor" stroke="none"/>',
  megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1z" fill="currentColor"/><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"/>',
  chart: '<path d="M5 20v-6M10 20V9M15 20v-9M20 20V4" stroke-width="3.2"/>',
  chat: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4.3A2.5 2.5 0 0 1 4 13.5z" fill="currentColor"/><circle cx="8.5" cy="9.5" r="1.2" fill="#111" stroke="none"/><circle cx="12" cy="9.5" r="1.2" fill="#111" stroke="none"/><circle cx="15.5" cy="9.5" r="1.2" fill="#111" stroke="none"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="currentColor"/><path d="M8 3v4M16 3v4" /><path d="M7 11h2M11 11h2M15 11h2M7 15h2M11 15h2" stroke="#111"/>',
  doc: '<path d="M6 3h9l4 4v14H6z" fill="currentColor"/><path d="M9 11h7M9 14.5h7M9 18h5" stroke="#111"/>',
  gear: '<path fill="currentColor" stroke="none" d="M19.4 13a7.7 7.7 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3.3h-4l-.3 2.7a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.4L6.6 11a7.7 7.7 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1a7.6 7.6 0 0 0 1.7 1l.3 2.7h4l.3-2.7a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/>',
  bulb: '<path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z" fill="currentColor"/>',
  rocket: `<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z" fill="currentColor" fill-opacity=".25"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>`,
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5" fill="currentColor"/><rect x="17" y="13" width="4" height="6" rx="1.5" fill="currentColor"/><path d="M19 19c0 1.5-2 2.5-5 2.5"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5M12 14.5v3"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  "eye-off": '<path d="M3 3l18 18M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.7M6.6 6.6A16.5 16.5 0 0 0 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.5 4.6-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  building: '<rect x="4" y="3" width="10" height="18" rx="1"/><path d="M14 9h5a1 1 0 0 1 1 1v11H14M7.5 7h3M7.5 11h3M7.5 15h3M16.5 13h1M16.5 17h1M3 21h18"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12.5h18"/>',
  phone: '<path d="M5 3.5h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 6.8 6.8l1.4-2.2 4.3 1.7V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.1 1.5 1.5 0 0 1 5 3.5z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.3L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.3l1.7-1.8M20 20v-4.5h-4.5"/>',
  crown: '<path d="M3.5 7.5 8 11l4-6 4 6 4.5-3.5-2 11h-13z" fill="currentColor"/><path d="M5.5 21h13" />',
  "crown-o": '<path d="M3.5 7.5 8 11l4-6 4 6 4.5-3.5-2 11h-13z"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  bars: '<path d="M5 20v-5M10 20V10M15 20v-7M20 20V5"/><path d="M3 20.5h18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.5"/>',
  tag: '<path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.7 8.7-8.8 8.8z"/><circle cx="8" cy="8" r="1.3"/>',
  calc: '<rect x="4.5" y="2.5" width="15" height="19" rx="2.5"/><rect x="7.5" y="5.5" width="9" height="4" rx="1"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" stroke-width="2.4"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="currentColor"/><path d="M2.5 9.5h19" stroke="#fff" stroke-width="2.2"/><path d="M5.5 15h4" stroke="#fff"/>',
  puzzle: '<path d="M9 4.5a2 2 0 0 1 4 0V6h4a1 1 0 0 1 1 1v4h1.5a2 2 0 0 1 0 4H18v4a1 1 0 0 1-1 1h-4v-1.5a2 2 0 0 0-4 0V20H5a1 1 0 0 1-1-1v-4h1.5a2 2 0 0 0 0-4H4V7a1 1 0 0 1 1-1h4z"/>',
  fullscreen: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" stroke-width="2.4"/>',
  linkedin: '<path fill="currentColor" stroke="none" d="M5.2 8.7h3.1V19H5.2zM6.7 3.8a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zM10.2 8.7h3v1.4c.4-.8 1.5-1.7 3.1-1.7 3.3 0 3.9 2.2 3.9 5V19h-3.1v-5c0-1.2 0-2.7-1.7-2.7s-1.9 1.3-1.9 2.6V19h-3.2z"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  apple: '<path fill="currentColor" stroke="none" d="M16.4 12.6c0-2.4 2-3.6 2-3.7-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.8 0-1.9-.8-3.1-.8-1.6 0-3 .9-3.9 2.3-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.7 2.5 3 2.4 1.2 0 1.6-.8 3.1-.8 1.4 0 1.8.8 3.1.8s2.1-1.2 2.9-2.3c.9-1.3 1.3-2.6 1.3-2.7 0 0-2.6-1-2.7-3.9zM14.1 5.5c.6-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4z"/>',
};

function renderIcons(root = document) {
  root.querySelectorAll("i[data-i]").forEach((el) => {
    const name = el.dataset.i;
    const body = ICONS[name] || (window.EXTRA_ICONS || {})[name];
    if (!body) return;
    const svg = `<svg class="ic ${el.className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
    el.outerHTML = svg;
  });
}

/* ---------- Utilitaires ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const eur = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " â‚¬";
const store = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function toast(msg) {
  let t = $(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 3200);
}

/* ---------- Navigation : menus dÃ©roulants + burger ---------- */
function initNav() {
  const desktop = () => window.matchMedia("(min-width: 981px)").matches;

  $$(".has-dropdown").forEach((item) => {
    const trigger = $(".nav-link", item);
    let closeTimer;
    const open = () => {
      clearTimeout(closeTimer);
      $$(".has-dropdown.open").forEach((o) => o !== item && o.classList.remove("open"));
      item.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
    };
    const close = () => {
      item.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    };
    item.addEventListener("mouseenter", () => desktop() && open());
    item.addEventListener("mouseleave", () => { if (desktop()) closeTimer = setTimeout(close, 120); });
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      item.classList.contains("open") ? close() : open();
    });
    item.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { close(); trigger.focus(); }
    });
    // Bouton de fermeture visible en mobile/tablette dans le panneau du mega-menu.
    const closeBtn = $("[data-mega-close]", item);
    if (closeBtn) closeBtn.addEventListener("click", (e) => { e.preventDefault(); close(); trigger.focus(); });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".has-dropdown")) $$(".has-dropdown.open").forEach((o) => o.classList.remove("open"));
  });

  const burger = $(".burger");
  const menu = $(".nav-menu");
  if (burger && menu) {
    burger.addEventListener("click", () => {
      const isOpen = menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(isOpen));
      burger.innerHTML = `<i data-i="${isOpen ? "close" : "menu"}"></i>`;
      renderIcons(burger);
    });
  }
}

/* ---------- SÃ©lecteur de langue ---------- */
function initLang() {
  $$(".lang").forEach((lang) => {
    const btn = $(".lang-btn", lang);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const o = lang.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(o));
    });
    $$(".lang-menu button", lang).forEach((opt) =>
      opt.addEventListener("click", () => {
        $(".lang-label", lang).textContent = opt.dataset.label;
        $(".flag", btn).outerHTML = $(".flag", opt).outerHTML;
        lang.classList.remove("open");
        if (opt.dataset.label !== "FranÃ§ais") toast("La traduction anglaise sera ajoutÃ©e prochainement.");
      })
    );
  });
  document.addEventListener("click", () => $$(".lang.open").forEach((l) => l.classList.remove("open")));
}

/* ---------- Lecteur vidÃ©o (page Marketing) ---------- */
function initVideo() {
  const card = $(".video-card");
  if (!card) return;
  const video = $("video", card);
  const bar = $(".progress span", card);
  const time = $(".video-time", card);
  const msg = $(".video-msg", card);
  const toggleBtn = $(".v-toggle", card);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const fail = () => {
    card.classList.remove("playing");
    msg.textContent = "VidÃ©o Ã  venir â€” ajoutez le fichier : " + video.getAttribute("src");
    msg.classList.add("show");
    setTimeout(() => msg.classList.remove("show"), 3500);
  };
  const setIcon = (name) => { toggleBtn.innerHTML = `<i data-i="${name}"></i>`; renderIcons(toggleBtn); };

  const toggle = () => {
    if (video.paused) {
      card.classList.add("playing");
      video.play().then(() => setIcon("pause")).catch(fail);
    } else {
      video.pause();
      setIcon("play");
    }
  };
  $(".video-big-play", card).addEventListener("click", toggle);
  toggleBtn.addEventListener("click", toggle);
  video.addEventListener("click", toggle);
  video.addEventListener("error", fail, true);
  video.addEventListener("timeupdate", () => {
    if (!video.duration) return;
    bar.style.width = (video.currentTime / video.duration) * 100 + "%";
    time.textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;
  });
  $(".progress", card).addEventListener("click", (e) => {
    if (!video.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    video.currentTime = ((e.clientX - r.left) / r.width) * video.duration;
  });
  $(".v-full", card).addEventListener("click", () => (card.requestFullscreen ? card.requestFullscreen() : null));
}

/* ---------- Personnalisation de l'abonnement ---------- */
const PLAN = { name: "AK Universe Pro", price: 79.9 };
const USER_PRICE = 9.9;
const ANNUAL_DISCOUNT = 0.2;

function initAbonnement() {
  const root = $("#abonnement");
  if (!root) return;
  const saved = store.get("aku-order") || {};
  let cycle = saved.cycle || "mensuel";
  let users = saved.users || 0;
  const opts = $$(".option input", root);
  if (saved.options) opts.forEach((o) => (o.checked = saved.options.includes(o.name)));

  const render = () => {
    const k = cycle === "annuel" ? 1 - ANNUAL_DISCOUNT : 1;
    const plan = PLAN.price * k;
    const usersTotal = users * USER_PRICE * k;
    const checked = opts.filter((o) => o.checked);
    const optsTotal = checked.reduce((s, o) => s + parseFloat(o.dataset.price), 0) * k;
    const total = plan + usersTotal + optsTotal;

    $$("[data-cycle]", root).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cycle === cycle)));
    $("#users-count").textContent = users;
    $("#r-plan").textContent = eur(plan);
    $("#plan-price").textContent = eur(plan);
    $("#r-users-n").textContent = users;
    $("#r-users").textContent = eur(usersTotal);
    $("#r-opts-n").textContent = checked.length;
    $("#r-opts").textContent = eur(optsTotal);
    $("#r-total").textContent = eur(total);
    $("#r-total-note").textContent = cycle === "annuel" ? `/ mois, soit ${eur(total * 12)} / an` : "/ mois";

    store.set("aku-order", { cycle, users, options: checked.map((o) => o.name), total, plan: PLAN.name });
  };

  $$("[data-cycle]", root).forEach((b) => b.addEventListener("click", () => { cycle = b.dataset.cycle; render(); }));
  $("#users-minus").addEventListener("click", () => { users = Math.max(0, users - 1); render(); });
  $("#users-plus").addEventListener("click", () => { users = Math.min(500, users + 1); render(); });
  opts.forEach((o) => o.addEventListener("change", render));
  render();
}

/* ---------- Paiement ---------- */
function initPaiement() {
  const root = $("#paiement");
  if (!root) return;
  const order = store.get("aku-order") || { cycle: "mensuel", total: PLAN.price, plan: PLAN.name };
  const annual = order.cycle === "annuel";
  const due = annual ? order.total * 12 : order.total;

  $("#p-plan-price").textContent = eur(order.total);
  $("#p-billing-note").textContent = annual ? "FacturÃ© tous les ans" : "FacturÃ© tous les mois";
  $$(".p-due").forEach((el) => (el.textContent = eur(due)));

  const email = store.get("aku-email");
  if (email) $("#pay-email").value = email;

  $("#promo-toggle").addEventListener("click", () => {
    $("#promo-form").classList.toggle("show");
    $("#promo-code").focus();
  });
  $("#promo-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const m = $("#promo-msg");
    m.textContent = $("#promo-code").value.trim() ? "Ce code promotionnel n'est pas valide." : "Saisissez un code.";
    m.className = "promo-msg err";
  });

  $(".apple-pay").addEventListener("click", () => toast("Apple Pay sera disponible aprÃ¨s l'intÃ©gration Stripe."));
  $("#pay-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const mail = $("#pay-email");
    if (!mail.checkValidity()) { mail.reportValidity(); return; }
    const method = $('input[name="method"]:checked').dataset.label;
    toast(`Paiement par ${method} : Ã  connecter Ã  Stripe Checkout (voir README).`);
  });
}

/* ---------- Formulaires d'authentification ---------- */
function initPasswordToggles() {
  $$(".pw-toggle").forEach((btn) =>
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Masquer le mot de passe" : "Afficher le mot de passe");
      btn.innerHTML = `<i data-i="${show ? "eye-off" : "eye"}"></i>`;
      renderIcons(btn);
    })
  );
}

function initSignup() {
  const form = $("#signup-form");
  if (!form) return;
  const pw = $("#pw");
  const rules = {
    len: (v) => v.length >= 8,
    upper: (v) => /[A-Z]/.test(v),
    digit: (v) => /\d/.test(v),
    lower: (v) => /[a-z]/.test(v),
  };
  const check = () => {
    let ok = true;
    for (const [k, fn] of Object.entries(rules)) {
      const pass = fn(pw.value);
      $(`.rule[data-rule="${k}"]`).classList.toggle("ok", pass);
      ok = ok && pass;
    }
    return ok;
  };
  pw.addEventListener("input", check);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (!check()) { pw.focus(); toast("Le mot de passe ne respecte pas encore toutes les rÃ¨gles."); return; }
    store.set("aku-email", $("#email").value.trim());
    location.href = "verification.html";
  });
}

function initLogin() {
  const form = $("#login-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    store.set("aku-email", $("#email").value.trim());
    location.href = "verification.html";
  });
  $("#forgot").addEventListener("click", (e) => {
    e.preventDefault();
    toast("La rÃ©initialisation du mot de passe sera branchÃ©e avec le backend.");
  });
}

function initGoogleButtons() {
  $$(".google-btn").forEach((b) => b.addEventListener("click", () => toast("Connexion Google : Ã  brancher (OAuth).")));
}

/* Boutons de connexion sociale additionnels (page de connexion) : mÃªme logique
   Â« placeholder Â» que le bouton Google existant, en attendant le branchement OAuth. */
function initSocialPlaceholders() {
  $$(".apple-btn").forEach((b) => b.addEventListener("click", () => toast("Connexion Apple : Ã  brancher (OAuth).")));
  $$(".microsoft-btn").forEach((b) => b.addEventListener("click", () => toast("Connexion Microsoft : Ã  brancher (OAuth).")));
}

/* Switch visuel Â« Compte client / Compte entreprise Â» sur la page de connexion.
   Purement prÃ©sentationnel : ne modifie pas la logique d'authentification. */
function initAccountSwitch() {
  const group = $(".account-switch");
  if (!group) return;
  $$(".account-switch-btn", group).forEach((btn) =>
    btn.addEventListener("click", () => {
      $$(".account-switch-btn", group).forEach((b) => { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
    })
  );
}

function initOtp() {
  const wrap = $(".otp");
  if (!wrap) return;
  const inputs = $$("input", wrap);
  const email = store.get("aku-email");
  if (email) $("#otp-email").textContent = email;

  inputs.forEach((inp, i) => {
    inp.addEventListener("input", () => {
      inp.value = inp.value.replace(/\D/g, "").slice(-1);
      if (inp.value && i < inputs.length - 1) inputs[i + 1].focus();
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !inp.value && i > 0) inputs[i - 1].focus();
      if (e.key === "ArrowLeft" && i > 0) inputs[i - 1].focus();
      if (e.key === "ArrowRight" && i < inputs.length - 1) inputs[i + 1].focus();
    });
    inp.addEventListener("paste", (e) => {
      const digits = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
      if (!digits) return;
      e.preventDefault();
      digits.split("").forEach((d, j) => inputs[j] && (inputs[j].value = d));
      inputs[Math.min(digits.length, inputs.length - 1)].focus();
    });
  });
  inputs[0].focus();

  $("#otp-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = inputs.map((i) => i.value).join("");
    if (code.length < 6) { toast("Saisissez les 6 chiffres du code."); inputs.find((i) => !i.value).focus(); return; }
    location.href = "organisation.html";
  });

  const resend = $("#resend");
  resend.addEventListener("click", () => {
    let s = 30;
    resend.disabled = true;
    toast("Un nouveau code a Ã©tÃ© envoyÃ©.");
    const tick = () => {
      resend.textContent = s > 0 ? `Renvoyer un code (${s}s)` : "Renvoyer un code";
      if (s-- > 0) setTimeout(tick, 1000); else resend.disabled = false;
    };
    tick();
  });
}

function initOrganisation() {
  const form = $("#org-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    store.set("aku-org", { name: $("#org-name").value.trim(), sector: $("#org-sector").value, size: $("#org-size").value });
    location.href = "abonnement.html";
  });
}

/* ---------- DÃ©marrage ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderIcons();
  initNav();
  initLang();
  initVideo();
  initAbonnement();
  initPaiement();
  initPasswordToggles();
  initSignup();
  initLogin();
  initGoogleButtons();
  initSocialPlaceholders();
  initAccountSwitch();
  initOtp();
  initOrganisation();
  $$(".year").forEach((y) => (y.textContent = new Date().getFullYear()));
});

