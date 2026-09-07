/* ============================================================
   Shared cosmic utilities — starfield, eclipse-phase glyphs
   ============================================================ */
window.Cosmos = (function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Starfield ---------- */
  function starfield(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, dpr, stars = [], t = 0, mx = 0, my = 0, raf;
    let meteors = [], nextMeteor = 60;     // frames until next shooting star

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = innerWidth * dpr;
      h = canvas.height = innerHeight * dpr;
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
      const count = Math.min(230, Math.floor((innerWidth * innerHeight) / 8200));
      stars = Array.from({ length: count }, () => {
        const depth = Math.random();               // 0 far … 1 near
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          z: depth,
          r: (depth * 1.5 + 0.25) * dpr,
          tw: Math.random() * Math.PI * 2,
          sp: 0.4 + Math.random() * 0.9,
          hue: Math.random() < 0.16 ? 'g' : (Math.random() < 0.24 ? 'v' : 'w')
        };
      });
    }
    const tint = { w: '255,255,255', g: '230,187,126', v: '179,141,227' };

    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const flick = reduced ? 0.7 : 0.5 + 0.5 * Math.sin(t * 0.02 * s.sp + s.tw);
        const px = s.x + mx * s.z * 14 * dpr;
        const py = s.y + my * s.z * 14 * dpr;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${tint[s.hue]},${(0.25 + flick * 0.65).toFixed(3)})`;
        ctx.fill();
        if (s.hue !== 'w' && s.r > 1.2 * dpr) {         // faint glow on colored stars
          ctx.beginPath();
          ctx.arc(px, py, s.r * 2.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${tint[s.hue]},${(flick * 0.06).toFixed(3)})`;
          ctx.fill();
        }
        if (!reduced) { s.y += s.sp * 0.12 * dpr; if (s.y > h + 4) s.y = -4; }
      }

      /* shooting stars — frequent, up to a few at once, shallow diagonals with fading tails */
      if (!reduced) {
        if (meteors.length < 2 && --nextMeteor <= 0) {
          const fromLeft = Math.random() < 0.5;
          meteors.push({
            x: fromLeft ? -40 * dpr : w * (0.3 + Math.random() * 0.7),
            y: h * Math.random() * 0.55,
            vx: (fromLeft ? 1 : -1) * (14 + Math.random() * 8) * dpr,
            vy: (5 + Math.random() * 4) * dpr,
            life: 1
          });
          nextMeteor = 120;                         // one every 2s at 60fps
        }
        for (const m of meteors) {
          const tail = 12;
          const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail);
          g.addColorStop(0, `rgba(230,187,126,${(0.85 * m.life).toFixed(3)})`);
          g.addColorStop(1, 'rgba(230,187,126,0)');
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.4 * dpr;
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail);
          ctx.stroke();
          m.x += m.vx; m.y += m.vy; m.life *= 0.985;
        }
        meteors = meteors.filter(m =>
          m.x > -60 * dpr && m.x < w + 60 * dpr && m.y < h * 0.85 && m.life > 0.05);
      }
      t++;
      raf = requestAnimationFrame(frame);
    }
    resize();
    frame();
    addEventListener('resize', resize, { passive: true });
    if (!reduced) addEventListener('pointermove', e => {
      mx = (e.clientX / innerWidth - 0.5) * 2;
      my = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf); else frame();
    });
  }

  /* ---------- Eclipse-phase glyph (occultation model) ----------
     p: 0 = fully eclipsed (dark) … 1 = full light
     dir: +1 waxing (lit limb right) … -1 waning
  ------------------------------------------------------------- */
  let uid = 0;
  function phaseSVG(p, dir) {
    dir = dir || 1;
    const id = 'ph' + (uid++);
    const dx = 12 + dir * (1 - p) * 20;   // offset of lit disc
    return `<svg viewBox="0 0 24 24" aria-hidden="true">
      <defs><clipPath id="${id}"><circle cx="12" cy="12" r="10"/></clipPath></defs>
      <circle class="ring-o" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-opacity=".28" stroke-width="1"/>
      <g clip-path="url(#${id})">
        <circle class="disc" cx="12" cy="12" r="10"/>
        <circle class="lit" cx="${dx.toFixed(2)}" cy="12" r="10"/>
      </g>
    </svg>`;
  }

  /* ---------- Reveal on scroll ---------- */
  function reveals(sel) {
    const els = document.querySelectorAll(sel || '.reveal');
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(e => e.classList.add('in')); return;
    }
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e, i) => {
        if (e.isIntersecting) {
          const sibs = [...e.target.parentElement.children].filter(c => c.classList.contains('reveal'));
          const idx = sibs.indexOf(e.target);
          e.target.style.transitionDelay = Math.min(idx, 6) * 70 + 'ms';
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(e => io.observe(e));
  }

  /* ---------- Dev: layout-overflow diagnostic (?diag) ---------- */
  if (location.search.includes('diag')) {
    addEventListener('load', () => setTimeout(() => {
      const vw = document.documentElement.clientWidth;
      const bad = [];
      document.querySelectorAll('body *').forEach(el => {
        if (el.id === 'starfield') return;
        if (getComputedStyle(el).visibility === 'hidden') return;
        const r = el.getBoundingClientRect();
        if (r.width && r.right > vw + 1) {
          bad.push(`+${Math.round(r.right - vw)} ${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).split(' ')[0]}`);
        }
      });
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#000;color:#0f0;font:12px/1.5 monospace;padding:4px 8px;white-space:pre-wrap';
      const sw = document.documentElement.scrollWidth, bw = document.body.scrollWidth;
      d.textContent = `W${vw} SW${sw} BW${bw} ${bad.length ? 'FLAG: ' + bad.slice(0, 6).join(' | ') : 'CLEAN'}`;
      document.body.appendChild(d);
    }, 400));
  }

  return { reduced, starfield, phaseSVG, reveals };
})();
