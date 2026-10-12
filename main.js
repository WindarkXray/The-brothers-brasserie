/* The Brothers Brasserie — animations & interactions */
(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = window.gsap;
  const ST = window.ScrollTrigger;
  const motion = !!(G && ST && !reduce);
  if (G && ST) G.registerPlugin(ST);
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const intro = !!$('.curtain--intro') && !root.classList.contains('visited');
  const startDelay = reduce ? 0 : (intro ? 1.55 : 0.45);

  /* ---------- défilement fluide ---------- */
  let lenis = null;
  if (motion && window.Lenis) {
    try {
      lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 1 });
      lenis.on('scroll', ST.update);
      G.ticker.add(t => lenis.raf(t * 1000));
      G.ticker.lagSmoothing(0);
    } catch (e) { lenis = null; }
  }
  const scrollToEl = (el, offset = 0) => {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.3 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduce ? 'auto' : 'smooth' });
  };

  /* ---------- horaires & statut ouvert/fermé (heure de Bruxelles) ---------- */
  const HOURS = { 0: [[720, 1320]], 1: [[720, 900], [1080, 1320]], 2: [[720, 900], [1080, 1320]], 3: [], 4: [[720, 900], [1080, 1320]], 5: [[720, 1320]], 6: [[720, 1320]] };
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const hm = m => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`;
  function brusselsNow() {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const g = t => parts.find(p => p.type === t).value;
    const d = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[g('weekday')];
    return { d, min: (+g('hour') % 24) * 60 + +g('minute'), iso: `${g('year')}-${g('month')}-${g('day')}` };
  }
  function openStatus() {
    const n = brusselsNow();
    for (const [a, b] of HOURS[n.d]) if (n.min >= a && n.min < b) return { open: true, text: `Ouvert · jusqu'à ${hm(b)}` };
    for (let i = 0; i < 8; i++) {
      const d = (n.d + i) % 7;
      for (const [a] of HOURS[d]) {
        if (i === 0 && a <= n.min) continue;
        const when = i === 0 ? 'à' : i === 1 ? 'demain à' : `${DAYS[d]} à`;
        return { open: false, text: `Fermé · ouvre ${when} ${hm(a)}` };
      }
    }
    return { open: false, text: 'Fermé' };
  }
  function paintStatus() {
    try {
      const s = openStatus();
      $$('[data-status]').forEach(el => { el.textContent = s.text; el.classList.toggle('is-open', s.open); });
      const today = brusselsNow().d;
      $$('.hours li[data-day]').forEach(li => li.classList.toggle('is-today', +li.dataset.day === today));
    } catch (e) { /* Intl indisponible : on laisse le texte par défaut */ }
  }
  paintStatus();
  setInterval(paintStatus, 60000);

  /* ---------- navigation ---------- */
  // l'en-tête reste toujours visible ; il prend juste une ombre quand on descend
  const nav = $('.nav');
  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 20);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('.burger');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    if (burger) burger.setAttribute('aria-expanded', String(open));
    const ov = $('.overlay');
    if (ov) ov.setAttribute('aria-hidden', String(!open));
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open && motion) G.fromTo('.overlay nav a span', { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .9, ease: 'expo.out', stagger: .06, delay: .25 });
  }
  if (burger) burger.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('menu-open')) setMenu(false); });

  /* ---------- transitions entre pages ---------- */
  const curtain = $('.curtain');
  function leaveTo(href) {
    if (!curtain || !motion) { window.location.href = href; return; }
    curtain.style.animation = 'none';
    G.fromTo(curtain, { yPercent: 101 }, { yPercent: 0, duration: .65, ease: 'power3.inOut', onComplete: () => { window.location.href = href; } });
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || a.target || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey || /^(https?:|mailto:|tel:|sms:|#)/i.test(href)) return;
    if (href.includes('#') && href.split('#')[0] === '') return;
    e.preventDefault();
    if (root.classList.contains('menu-open')) setMenu(false);
    leaveTo(href);
  });
  window.addEventListener('pageshow', e => {
    if (e.persisted && curtain) { curtain.style.animation = 'none'; if (G) G.set(curtain, { yPercent: -101 }); else curtain.style.transform = 'translateY(-101%)'; }
  });
  // liens d'ancre internes (#...) avec défilement fluide
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href'));
    if (t) { e.preventDefault(); scrollToEl(t, -150); }
  }));

  /* ---------- photos : essaie images/xxx.jpg, puis les sources de secours (séparées par |) ---------- */
  $$('.ph[data-img]').forEach(ph => {
    const srcs = ph.dataset.img.split('|').map(s => s.trim()).filter(Boolean);
    const inner = $('.ph-inner', ph);
    const tryNext = i => {
      if (i >= srcs.length) return;
      const img = new Image();
      img.onload = () => { inner.style.backgroundImage = `url("${srcs[i]}")`; ph.classList.add('has-img'); };
      img.onerror = () => tryNext(i + 1);
      img.src = srcs[i];
    };
    tryNext(0);
  });

  /* ---------- copier ---------- */
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', () => {
    const text = btn.dataset.copy;
    const done = () => { const old = btn.textContent; btn.textContent = 'Copié'; setTimeout(() => { btn.textContent = old; }, 1600); };
    const fallback = () => {
      const target = btn.closest('div') && $('dd', btn.closest('div'));
      if (target) { const r = document.createRange(); r.selectNodeContents(target); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
  }));

  /* ---------- découpage des titres en mots ---------- */
  function splitWords(node) {
    Array.from(node.childNodes).forEach(ch => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const o = document.createElement('span'); o.className = 'w';
          const i = document.createElement('span'); i.className = 'wi'; i.textContent = part;
          o.appendChild(i); frag.appendChild(o);
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1 && ch.tagName !== 'BR' && !ch.classList.contains('w')) splitWords(ch);
    });
  }

  /* ---------- page d'accueil : bulles ---------- */
  const canvas = $('#bubbles');
  if (canvas && !reduce) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), bubbles = [], running = true;
    const resize = () => {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, W / 14));
      bubbles = Array.from({ length: count }, () => mk(true));
    };
    const mk = (anywhere) => ({ x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10, r: .8 + Math.random() * 2.8, v: .25 + Math.random() * .9, a: .08 + Math.random() * .3, w: Math.random() * Math.PI * 2 });
    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (const b of bubbles) {
        b.y -= b.v; b.w += .02; const x = b.x + Math.sin(b.w) * 6;
        if (b.y < -10) Object.assign(b, mk(false));
        ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(227,154,34,${b.a})`; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = `rgba(255,248,232,${b.a * .6})`; ctx.fill();
      }
      requestAnimationFrame(tick);
    };
    resize(); window.addEventListener('resize', resize);
    new IntersectionObserver(([en]) => { const was = running; running = en.isIntersecting; if (running && !was) tick(); }).observe(canvas);
    tick();
  }

  /* ---------- page d'accueil : bière qui remplit le mot BROTHERS ---------- */
  const liquid = $('.liquid');
  if (liquid && motion) {
    G.set(liquid, { y: 240 });
    G.to(liquid, { y: 0, duration: 2.6, ease: 'power2.inOut', delay: startDelay });
    G.to('.wave--beer', { x: -1000, duration: 7, ease: 'none', repeat: -1 });
    G.to('.wave--foam', { x: -1000, duration: 11, ease: 'none', repeat: -1 });
    $$('.hw-bubble').forEach(b => {
      G.fromTo(b, { attr: { cy: 235 } }, { attr: { cy: 92 }, duration: 2.5 + Math.random() * 3, delay: startDelay + 1 + Math.random() * 3, repeat: -1, ease: 'none' });
    });
    // léger tangage au scroll
    G.to('.liquid-tilt', { rotation: -2.5, transformOrigin: '50% 50%', ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
  }

  if (!motion) return; /* ===== tout ce qui suit est de l'animation pure ===== */

  /* ---------- grande photo sous le hero : s'ouvre en grand au scroll ---------- */
  const media = $('.hero-media');
  if (media) {
    G.fromTo(media, { clipPath: 'inset(0% 7% 0% 7% round 4px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: media, start: 'top 95%', end: 'top 25%', scrub: true } });
    G.fromTo($('.ph-inner', media), { yPercent: -8, scale: 1.12 }, { yPercent: 8, scale: 1, ease: 'none', scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true } });
  }
  $$('.page-banner .ph-inner').forEach(el => {
    G.fromTo(el, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: el.closest('.page-banner'), start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- boutons magnétiques ---------- */
  if (window.matchMedia('(pointer:fine)').matches) {
    $$('[data-magnetic]').forEach(el => {
      const xTo = G.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1,.4)' });
      const yTo = G.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1,.4)' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * .35); yTo((e.clientY - r.top - r.height / 2) * .35);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- titres : mots qui montent ---------- */
  $$('[data-split]').forEach(el => {
    splitWords(el);
    const words = $$('.wi', el);
    const onLoad = el.dataset.split === 'load';
    G.from(words, {
      yPercent: 115, rotate: 4, duration: 1.2, ease: 'expo.out', stagger: .05,
      delay: onLoad ? startDelay + .15 : 0,
      scrollTrigger: onLoad ? undefined : { trigger: el, start: 'top 90%' }
    });
  });

  /* ---------- apparitions ---------- */
  $$('[data-reveal]').forEach(el => {
    const inHero = el.closest('.hero,.page-hero');
    G.from(el, {
      y: 46, opacity: 0, duration: 1.1, ease: 'power3.out',
      delay: inHero ? startDelay + .5 + (+el.dataset.reveal || 0) : (+el.dataset.reveal || 0),
      scrollTrigger: inHero ? undefined : { trigger: el, start: 'top 90%' }
    });
  });
  $$('[data-stagger]').forEach(group => {
    G.from(group.children, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: .08, scrollTrigger: { trigger: group, start: 'top 88%' } });
  });

  /* ---------- photos : révélation + parallaxe ---------- */
  $$('.ph[data-unveil]').forEach(ph => {
    G.fromTo(ph, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: ph, start: 'top 88%' } });
    G.from($('.ph-inner', ph), { scale: 1.3, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: ph, start: 'top 88%' } });
  });
  $$('.ph[data-parallax]').forEach(ph => {
    G.fromTo($('.ph-inner', ph), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: ph, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('[data-speed]').forEach(el => {
    G.to(el, { y: () => -(+el.dataset.speed) * 120, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
  });

  /* ---------- compteurs ---------- */
  $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count);
    const dec = (el.dataset.count.split('.')[1] || '').length;
    const o = { v: 0 };
    G.to(o, {
      v: end, duration: 2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: () => { el.textContent = o.v.toFixed(dec).replace('.', ','); }
    });
  });

  /* ---------- bandeau défilant qui penche avec la vitesse ---------- */
  const skews = $$('.marquee-skew');
  if (skews.length) {
    const setters = skews.map(s => G.quickTo(s, 'skewX', { duration: .5, ease: 'power3' }));
    ST.create({ onUpdate: self => { const v = G.utils.clamp(-10, 10, self.getVelocity() / -260); setters.forEach(f => f(v)); } });
  }

  /* ---------- défilement horizontal des plats ---------- */
  const mm = G.matchMedia();
  mm.add('(min-width: 900px)', () => {
    $$('[data-hscroll]').forEach(sec => {
      const track = $('.hs-track', sec), vp = $('.hs-viewport', sec), bar = $('.hs-progress i', sec);
      const dist = () => Math.max(0, track.scrollWidth - vp.clientWidth + parseFloat(getComputedStyle(vp).paddingLeft) * 2);
      const tl = G.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
      tl.to(track, { x: () => -dist(), ease: 'none' }, 0);
      if (bar) tl.to(bar, { scaleX: 1, ease: 'none' }, 0);
      $$('.dish', track).forEach((d, i) => tl.from($('.ph-inner', d), { xPercent: 12, ease: 'none' }, 0));
    });
  });

  /* ---------- grand mot du pied de page ---------- */
  const fw = $('.foot-word');
  if (fw) {
    splitWords(fw);
    G.from($$('.wi', fw), { yPercent: 100, duration: 1.3, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: fw, start: 'top 95%' } });
  }

  window.addEventListener('load', () => ST.refresh());
})();

/* ===================================================================
   Modules par page (fonctionnent même sans animation)
   =================================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const G = window.gsap;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* ===== RÉGLAGE À COMPLÉTER =====
     Clé Web3Forms (gratuite sur https://web3forms.com) pour recevoir réservations et demandes par e-mail. */
  const WEB3FORMS_KEY = 'VOTRE_CLE_WEB3FORMS';

  /* ---------- carte : onglets de catégories ---------- */
  const tabs = $('.cat-tabs');
  if (tabs) {
    const links = $$('a', tabs), ink = $('.cat-ink', tabs);
    const moveInk = a => {
      links.forEach(l => l.classList.toggle('is-active', l === a));
      ink.style.left = a.offsetLeft + 'px'; ink.style.width = a.offsetWidth + 'px';
      const sc = $('.cat-scroll');
      if (sc) sc.scrollTo({ left: a.offsetLeft - sc.clientWidth / 2 + a.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
    };
    const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { const a = map.get(en.target.id); if (a) moveInk(a); } });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((a, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    if (links[0]) moveInk(links[0]);
    window.addEventListener('resize', () => { const a = $('.is-active', tabs); if (a) moveInk(a); });
  }

  /* ---------- bar : taille de verre ---------- */
  const toggle = $('.size-toggle');
  if (toggle) {
    const btns = $$('button', toggle), sink = $('.size-ink', toggle);
    const LEVEL = { '25': .38, '50': .66, '100': .94 };
    const setSize = (b, instant) => {
      btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      sink.style.left = b.offsetLeft + 'px'; sink.style.width = b.offsetWidth + 'px';
      const size = b.dataset.size;
      $$('.tap').forEach(tap => {
        const prices = JSON.parse(tap.dataset.prices);
        const y = 152 - LEVEL[size] * 138;
        const fill = $('.tap-liquid', tap), priceEl = $('.tprice', tap), vol = $('.tvol', tap);
        if (G && !reduce && !instant) {
          G.to(fill, { attr: { y }, duration: 1.1, ease: 'power3.inOut' });
          const o = { v: parseFloat(priceEl.dataset.v || prices[size]) };
          G.to(o, { v: prices[size], duration: .9, ease: 'power2.out', onUpdate: () => { priceEl.textContent = Math.round(o.v) + ' €'; } });
        } else { fill.setAttribute('y', y); priceEl.textContent = prices[size] + ' €'; }
        priceEl.dataset.v = prices[size];
        vol.textContent = size === '100' ? '1 litre' : size + ' cl';
      });
    };
    btns.forEach(b => b.addEventListener('click', () => setSize(b)));
    setSize(btns[0], true);
    window.addEventListener('resize', () => { const b = $('[aria-pressed="true"]', toggle); sink.style.left = b.offsetLeft + 'px'; sink.style.width = b.offsetWidth + 'px'; });
  }

  /* ---------- bar : tri des bouteilles ---------- */
  const sorter = $('.sorter');
  if (sorter) {
    const list = $('.bottles');
    $$('button', sorter).forEach(b => b.addEventListener('click', () => {
      $$('button', sorter).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const rows = $$('.bottle', list);
      const first = new Map(rows.map(r => [r, r.getBoundingClientRect().top]));
      const key = b.dataset.sort;
      rows.sort((a, c) => key === 'name' ? a.dataset.name.localeCompare(c.dataset.name, 'fr') : key === 'abv-desc' ? c.dataset.abv - a.dataset.abv : a.dataset.abv - c.dataset.abv);
      rows.forEach(r => list.appendChild(r));
      if (G && !reduce) rows.forEach(r => { const dy = first.get(r) - r.getBoundingClientRect().top; if (dy) G.fromTo(r, { y: dy }, { y: 0, duration: .7, ease: 'power3.out' }); });
    }));
  }

  /* ---------- envoi de formulaire (Web3Forms) ---------- */
  async function send(form, subject) {
    const fd = new FormData(form);
    fd.append('access_key', WEB3FORMS_KEY);
    fd.append('subject', subject);
    fd.append('from_name', 'Site The Brothers Brasserie');
    if (WEB3FORMS_KEY.startsWith('VOTRE')) return { demo: true };
    try {
      const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { Accept: 'application/json' }, body: fd });
      const j = await r.json();
      return { ok: !!j.success, msg: j.message };
    } catch (e) { return { ok: false }; }
  }
  const fmtDate = iso => { try { return new Intl.DateTimeFormat('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso + 'T12:00:00')); } catch (e) { return iso; } };

  /* ---------- réservation : parcours en 4 étapes ---------- */
  const rf = $('#resa-form');
  if (rf) {
    const HOURS = { 0: [[720, 1320]], 1: [[720, 900], [1080, 1320]], 2: [[720, 900], [1080, 1320]], 3: [], 4: [[720, 900], [1080, 1320]], 5: [[720, 1320]], 6: [[720, 1320]] };
    const DW = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
    const MS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const state = { guests: 2, date: '', time: '' };
    const dateIn = $('#resa-date'), timeIn = $('#resa-time'), guestsIn = $('#resa-guests-input');
    const daysBox = $('#resa-days'), otherIn = $('#resa-date-other');
    const slotsBox = $('#resa-slots'), slotHint = $('#resa-slot-hint');
    const err = $('#resa-error'), bigBox = $('#resa-big'), out = $('#resa-guests');
    const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const hmFr = t => t ? t.replace(':', 'h') : '';
    const parse = iso => new Date(iso + 'T12:00:00');
    const addDays = (iso, n) => { const d = parse(iso); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const longDate = iso => { try { return new Intl.DateTimeFormat('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }).format(parse(iso)); } catch (e) { return iso; } };
    const shortDate = iso => { const d = parse(iso); return `${DW[d.getDay()]} ${d.getDate()} ${MS[d.getMonth()]}`; };

    let todayIso, nowMin;
    try {
      const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      const g = t => p.find(x => x.type === t).value;
      todayIso = `${g('year')}-${g('month')}-${g('day')}`; nowMin = (+g('hour') % 24) * 60 + +g('minute');
    } catch (e) { const d = new Date(); todayIso = addDays(d.toISOString().slice(0, 10), 0); nowMin = d.getHours() * 60 + d.getMinutes(); }
    otherIn.min = todayIso;

    const slotsFor = iso => {
      const list = [];
      (HOURS[parse(iso).getDay()] || []).forEach(([a, b]) => {
        for (let m = a; m <= b - 30; m += 30) if (!(iso === todayIso && m < nowMin + 30)) list.push(m);
      });
      return list;
    };
    const markStep = (id, done) => { const f = $('#' + id); if (f) f.classList.toggle('is-done', done); };

    /* résumé en direct */
    function updateSummary() {
      const g = `${state.guests} ${state.guests > 1 ? 'personnes' : 'personne'}`;
      const parts = [g];
      if (state.date) parts.push(longDate(state.date));
      if (state.time) parts.push(hmFr(state.time));
      $('#resa-summary').textContent = parts.join(' · ');
      const short = [`${state.guests} pers.`];
      if (state.date) short.push(shortDate(state.date));
      if (state.time) short.push(hmFr(state.time));
      $('#resa-bar-sum').textContent = short.join(' · ');
      const ready = state.date && state.time;
      $('#resa-bar-btn').textContent = !state.date ? 'Choisir le jour' : !state.time ? 'Choisir l\'heure' : 'Continuer';
      markStep('step-date', !!state.date); markStep('step-time', !!state.time);
      const info = ['#resa-name', '#resa-phone', '#resa-email'].every(s => $(s).value.trim());
      markStep('step-info', info);
      if (ready && info) $('#resa-bar-btn').textContent = 'Envoyer';
    }

    /* 1. couverts */
    const chips = $$('.gchips button', rf);
    function setGuests(n, fromChip) {
      state.guests = Math.max(1, Math.min(40, n)); guestsIn.value = state.guests; out.textContent = state.guests;
      const big = state.guests >= 9;
      chips.forEach(c => c.setAttribute('aria-pressed', String(big ? c.dataset.n === '9' : +c.dataset.n === state.guests)));
      bigBox.hidden = !big;
      if (big && fromChip && G && !reduce) G.from(bigBox, { y: -8, opacity: 0, duration: .4 });
      updateSummary();
    }
    chips.forEach(c => c.addEventListener('click', () => setGuests(+c.dataset.n, true)));
    $('#resa-minus').addEventListener('click', () => setGuests(state.guests - 1));
    $('#resa-plus').addEventListener('click', () => setGuests(state.guests + 1));

    /* 2. jour : bande des 14 prochains jours */
    function renderDays() {
      daysBox.innerHTML = '';
      for (let i = 0; i < 14; i++) {
        const iso = addDays(todayIso, i), d = parse(iso);
        const closed = !(HOURS[d.getDay()] || []).length;
        const full = !closed && !slotsFor(iso).length;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'day'; b.dataset.iso = iso;
        b.setAttribute('aria-pressed', String(iso === state.date));
        if (closed || full) { b.disabled = true; }
        b.setAttribute('aria-label', `${longDate(iso)}${closed ? ', fermé' : full ? ', complet pour aujourd\'hui' : ''}`);
        b.innerHTML = `<span class="dw">${i === 0 ? 'Auj.' : i === 1 ? 'Dem.' : DW[d.getDay()]}</span><span class="dn">${d.getDate()}</span><span class="dm">${closed ? 'Fermé' : full ? 'Passé' : MS[d.getMonth()]}</span>`;
        b.addEventListener('click', () => setDate(iso));
        daysBox.appendChild(b);
      }
    }
    function setDate(iso) {
      if (!iso) return;
      state.date = iso; dateIn.value = iso; state.time = ''; timeIn.value = '';
      const inStrip = $$('.day', daysBox).some(b => b.dataset.iso === iso);
      $$('.day', daysBox).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.iso === iso)));
      otherIn.classList.toggle('is-set', !inStrip);
      if (inStrip) otherIn.value = '';
      renderSlots(); updateSummary(); err.hidden = true;
    }
    otherIn.addEventListener('change', () => { if (otherIn.value) setDate(otherIn.value); });

    /* 3. heure */
    function renderSlots() {
      slotsBox.innerHTML = '';
      if (!state.date) { slotHint.textContent = 'Choisissez d\'abord un jour.'; slotHint.className = 'hint'; return; }
      const day = parse(state.date).getDay();
      const ranges = HOURS[day];
      if (!ranges.length) { slotHint.textContent = 'Nous sommes fermés le mercredi. Choisissez un autre jour.'; slotHint.className = 'hint hint--warn'; return; }
      let count = 0;
      ranges.forEach(([a, b]) => {
        const box = document.createElement('div'); box.className = 'slots';
        for (let m = a; m <= b - 30; m += 30) {
          if (state.date === todayIso && m < nowMin + 30) continue;
          const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = hmFr(hm(m)); btn.setAttribute('aria-pressed', 'false');
          btn.addEventListener('click', () => {
            $$('button', slotsBox).forEach(x => x.setAttribute('aria-pressed', 'false')); btn.setAttribute('aria-pressed', 'true');
            state.time = hm(m); timeIn.value = state.time; err.hidden = true; updateSummary();
          });
          box.appendChild(btn); count++;
        }
        if (box.children.length) {
          const grp = document.createElement('div'); grp.className = 'slots-group';
          const lab = document.createElement('span'); lab.className = 'mono';
          lab.textContent = b <= 900 ? 'Midi' : a >= 1080 ? 'Soir' : 'Service continu';
          grp.append(lab, box); slotsBox.appendChild(grp);
        }
      });
      if (!count) { slotHint.textContent = 'Plus de créneau aujourd\'hui. Choisissez un autre jour ou appelez-nous.'; slotHint.className = 'hint hint--warn'; }
      else { slotHint.textContent = `${longDate(state.date).replace(/^./, c => c.toUpperCase())}`; slotHint.className = 'hint'; }
      if (G && !reduce) G.from($$('.slots button', slotsBox), { y: 10, opacity: 0, duration: .45, stagger: .012, ease: 'power2.out' });
    }

    ['#resa-name', '#resa-phone', '#resa-email'].forEach(s => $(s).addEventListener('input', updateSummary));

    /* barre fixe (téléphone) */
    const bar = $('#resa-bar'), barBtn = $('#resa-bar-btn');
    const goTo = el => { if (!el) return; const y = el.getBoundingClientRect().top + window.scrollY - 100; window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); };
    barBtn.addEventListener('click', () => {
      if (!state.date) return goTo($('#step-date'));
      if (!state.time) return goTo($('#step-time'));
      const empty = ['#resa-name', '#resa-phone', '#resa-email'].map(s => $(s)).find(i => !i.value.trim());
      if (empty) { goTo($('#step-info')); setTimeout(() => empty.focus({ preventScroll: true }), 500); return; }
      rf.requestSubmit ? rf.requestSubmit() : rf.dispatchEvent(new Event('submit', { cancelable: true }));
    });
    let footerIn = false, mainIn = true;
    const syncBar = () => { const on = mainIn && !footerIn && !rf.hidden; bar.classList.toggle('is-on', on); bar.setAttribute('aria-hidden', String(!on)); };
    const foot = $('.footer');
    if (foot) new IntersectionObserver(([e]) => { footerIn = e.isIntersecting; syncBar(); }).observe(foot);
    new IntersectionObserver(([e]) => { mainIn = e.isIntersecting; syncBar(); }, { rootMargin: '0px 0px -30% 0px' }).observe($('.resa-main'));

    /* envoi */
    rf.addEventListener('submit', async e => {
      e.preventDefault();
      err.hidden = true;
      const fail = (msg, el) => { err.textContent = msg; err.hidden = false; goTo(el); };
      if (!state.date) return fail('Choisissez un jour.', $('#step-date'));
      if (!state.time) return fail('Choisissez une heure.', $('#step-time'));
      const bad = ['#resa-name', '#resa-phone', '#resa-email'].map(s => $(s)).find(i => !i.checkValidity());
      if (bad) { bad.reportValidity(); return; }
      const btn = $('button[type="submit"]', rf); btn.disabled = true; $('.lbl', btn).textContent = 'Envoi…';
      const res = await send(rf, `Réservation · ${state.guests} pers. · ${state.date} ${state.time}`);
      btn.disabled = false; $('.lbl', btn).textContent = 'Envoyer la demande';
      if (res.demo || res.ok) {
        const box = $('#resa-success');
        $('#rs-name').textContent = ($('#resa-name').value || '').trim().split(' ')[0];
        $('#rs-guests').textContent = `${state.guests} ${state.guests > 1 ? 'personnes' : 'personne'}`;
        $('#rs-date').textContent = longDate(state.date).replace(/^./, c => c.toUpperCase());
        $('#rs-time').textContent = hmFr(state.time);
        $('#rs-demo').hidden = !res.demo;
        rf.hidden = true; box.hidden = false; syncBar();
        if (G && !reduce) G.from(box, { y: 30, opacity: 0, duration: .9, ease: 'power3.out' });
        goTo(box);
      } else {
        fail('L\'envoi n\'a pas abouti. Réessayez ou appelez le 02 889 02 10.', $('.resa-submit'));
      }
    });
    $('#resa-again').addEventListener('click', () => {
      rf.reset(); state.date = ''; state.time = ''; dateIn.value = ''; timeIn.value = '';
      setGuests(2); renderDays(); renderSlots(); updateSummary();
      $('#resa-success').hidden = true; rf.hidden = false; syncBar(); goTo($('.resa-main'));
    });

    renderDays(); setGuests(2); updateSummary();
  }

  /* ---------- demande d'événement & message de contact ---------- */
  const d = $('#ev-date'); if (d) d.min = new Date().toISOString().slice(0, 10);
  function bindForm(formSel, prefix, subject) {
    const f = $(formSel);
    if (!f) return;
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (!f.reportValidity()) return;
      const err = $(`#${prefix}-error`); err.hidden = true;
      const btn = $('button[type="submit"]', f); btn.disabled = true;
      const res = await send(f, subject());
      btn.disabled = false;
      if (res.demo || res.ok) {
        const box = $(`#${prefix}-success`); $(`#${prefix}-demo`).hidden = !res.demo;
        f.hidden = true; box.hidden = false;
        if (G && !reduce) G.from(box, { y: 30, opacity: 0, duration: .9, ease: 'power3.out' });
      } else { err.textContent = 'L\'envoi n\'a pas abouti. Réessayez ou écrivez-nous à thebrothersbrasserie@gmail.com.'; err.hidden = false; }
    });
  }
  bindForm('#event-form', 'ev', () => `Demande d'événement · ${$('#ev-type').value}`);
  bindForm('#contact-form', 'ct', () => `Message du site · ${$('#ct-subject').value}`);

  /* ---------- FAQ : ouverture en douceur ---------- */
  if (G && !reduce) {
    $$('.faq details').forEach(det => {
      const sum = $('summary', det), ans = $('.ans', det);
      sum.addEventListener('click', e => {
        e.preventDefault();
        if (det.open) {
          G.to(ans, { height: 0, opacity: 0, duration: .45, ease: 'power3.inOut', onComplete: () => { det.open = false; G.set(ans, { clearProps: 'height,opacity' }); } });
        } else {
          det.open = true;
          G.fromTo(ans, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: .55, ease: 'power3.out' });
        }
      });
    });
  }
})();
