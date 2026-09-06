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
    { id: 'events', label: 'Events', p: 0.55, dir: 1 },
    { id: 'prizes', label: 'Prizes & Fees', p: 0.78, dir: 1 },
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

  /* ---------- Hero depth: pointer + scroll parallax ---------- */
  const eclipse = $('.hero-eclipse');
  if (eclipse && !Cosmos.reduced) {
    const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
    if (fine) addEventListener('pointermove', e => {
      eclipse.style.setProperty('--px', ((e.clientX / innerWidth - 0.5) * -18).toFixed(1) + 'px');
      eclipse.style.setProperty('--py', ((e.clientY / innerHeight - 0.5) * -12).toFixed(1) + 'px');
    }, { passive: true });
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const k = Math.min(1, scrollY / innerHeight);
        eclipse.style.setProperty('--sy', (k * 90).toFixed(1) + 'px');
        eclipse.style.opacity = (1 - k * 0.85).toFixed(3);
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- Event-card tilt (fine pointers only) ---------- */
  if (!Cosmos.reduced && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    $$('.ev').forEach(card => {
      card.addEventListener('pointerenter', () => card.classList.add('tilting'));
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -5;
        const ry = ((e.clientX - r.left) / r.width - 0.5) * 5;
        card.style.transform = `perspective(700px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-6px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('tilting');
        card.style.transform = '';
      });
    });
  }

  /* ---------- Countdown to first contact ---------- */
  (function countdown() {
    const box = $('#countdown');
    if (!box) return;
    const start = new Date('2026-09-09T08:00:00+05:30').getTime();
    const end = new Date('2026-09-10T17:00:00+05:30').getTime();
    const cells = {
      d: $('[data-cd="d"]', box), h: $('[data-cd="h"]', box),
      m: $('[data-cd="m"]', box), s: $('[data-cd="s"]', box)
    };
    function tick() {
      const now = Date.now();
      if (now >= start && now <= end) {
        box.classList.add('live-now');
        box.innerHTML = '◐ The Singularity is live — <a href="rankings.html">follow the board</a>';
        return;
      }
      if (now > end) { box.remove(); return; }
      let t = Math.floor((start - now) / 1000);
      const d = Math.floor(t / 86400); t -= d * 86400;
      const h = Math.floor(t / 3600); t -= h * 3600;
      const m = Math.floor(t / 60), s = t - m * 60;
      cells.d.textContent = String(d).padStart(2, '0');
      cells.h.textContent = String(h).padStart(2, '0');
      cells.m.textContent = String(m).padStart(2, '0');
      cells.s.textContent = String(s).padStart(2, '0');
      if (!Cosmos.reduced) {               // micro-fade on each second
        cells.s.classList.remove('tick');
        void cells.s.offsetWidth;
        cells.s.classList.add('tick');
      }
      setTimeout(tick, 1000);
    }
    tick();
  })();

  /* count-up for stat numbers */
  const nums = $$('.about-stats .n');
  if (!Cosmos.reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      if (!/^\d+$/.test(el.textContent)) { io.unobserve(el); return; }  // skip 115+, ₹2.5L
      const end = parseInt(el.textContent, 10);
      const pad = el.textContent.length, t0 = performance.now(), dur = 900;
      requestAnimationFrame(function tick(t) {
        const k = Math.min(1, Math.max(0, (t - t0) / dur));
        const v = Math.round(end * (1 - Math.pow(1 - k, 3)));
        el.textContent = String(v).padStart(pad, '0');
        if (k < 1) requestAnimationFrame(tick);
      });
      io.unobserve(el);
    }), { threshold: 0.6 });
    nums.forEach(n => io.observe(n));
  }
})();
