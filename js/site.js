/* ============================================================
   TELESTO 2026 — Landing page interactions
   ============================================================ */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* boot */
  if (location.search.includes('static')) document.documentElement.classList.add('force-in');
  Cosmos.starfield($('#starfield'));
  requestAnimationFrame(() => document.body.classList.add('loaded'));
  Cosmos.reveals();

  /* nav scrolled state */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  /* mobile menu */
  const toggle = $('#navToggle'), links = $('#navlinks');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  $$('#navlinks a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  /* ---------- Eclipse-phase spine ---------- */
  const SECTIONS = [
    { id: 'hero', label: 'Arrival', p: 0.05, dir: 1 },
    { id: 'about', label: 'The Singularity', p: 0.32, dir: 1 },
    { id: 'events', label: 'Events', p: 0.6, dir: 1 },
    { id: 'schedule', label: 'Totality', p: 1, dir: 1 },
    { id: 'rankings-teaser', label: 'Live Board', p: 0.58, dir: -1 },
    { id: 'sponsors', label: 'Partners', p: 0.26, dir: -1 }
  ];
  const spine = $('#spine');
  SECTIONS.forEach(s => {
    const b = document.createElement('button');
    b.className = 'ph';
    b.dataset.target = s.id;
    b.setAttribute('aria-label', s.label);
    b.innerHTML = Cosmos.phaseSVG(s.p, s.dir) + `<span class="tip">${s.label}</span>`;
    b.addEventListener('click', () => {
      const el = document.getElementById(s.id);
      if (el) el.scrollIntoView({ behavior: Cosmos.reduced ? 'auto' : 'smooth' });
    });
    spine.appendChild(b);
  });
  const phNodes = $$('.spine .ph');

  /* scrollspy for spine */
  const secEls = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean);
  function spy() {
    const mid = scrollY + innerHeight * 0.4;
    let active = 0;
    secEls.forEach((el, i) => { if (el.offsetTop <= mid) active = i; });
    phNodes.forEach((n, i) => {
      n.classList.toggle('active', i === active);
      n.classList.toggle('passed', i < active);
    });
  }
  spy();
  addEventListener('scroll', spy, { passive: true });

  /* ---------- Timeline phase markers ---------- */
  $$('#timeline .tl-row').forEach(row => {
    const p = parseFloat(row.dataset.phase || '0.5');
    const mark = $('.tl-mark', row);
    if (mark) mark.insertAdjacentHTML('afterbegin', Cosmos.phaseSVG(p, 1));
  });

  /* count-up for stat numbers */
  const nums = $$('.about-stats .n');
  if (!Cosmos.reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, end = parseInt(el.textContent, 10);
      if (isNaN(end)) { io.unobserve(el); return; }
      const pad = el.textContent.length, t0 = performance.now(), dur = 900;
      (function tick(t) {
        const k = Math.min(1, (t - t0) / dur);
        const v = Math.round(end * (1 - Math.pow(1 - k, 3)));
        el.textContent = String(v).padStart(pad, '0');
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
      io.unobserve(el);
    }), { threshold: 0.6 });
    nums.forEach(n => io.observe(n));
  }
})();
