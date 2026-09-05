/* ============================================================
   TELESTO 2026 — The Gravity Board (live engine)
   Data source priority:
     1. Judge Console edits (saved in localStorage)      → live, per-browser
     2. data/scores.json (polled every few seconds)      → real backend hook
     3. embedded DEFAULTS (works when opened via file://)
   Swap fetchJSON() for a real API / Supabase call to go fully live.
   ============================================================ */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = Cosmos.reduced;
  const LS_KEY = 'telesto_board_v1';
  const POLL_MS = 4000;
  const demoParam = location.search.includes('demo');

  /* fallback so the page works with no server */
  const DEFAULTS = {
    round: 'Business Quiz · Finals',
    updated: '2026-09-10T14:22:00+05:30',
    teams: [
      { id: 'nova', name: 'Nova Syndicate', tag: 'T-01 · MBA Fin', score: 482 },
      { id: 'quasar', name: 'Quasar Capital', tag: 'T-02 · MBA Mktg', score: 441 },
      { id: 'horizon', name: 'Event Horizon', tag: 'T-03 · BBA', score: 418 },
      { id: 'redshift', name: 'Redshift Partners', tag: 'T-04 · MBA Ops', score: 370 },
      { id: 'orion', name: 'Orion Ventures', tag: 'T-05 · MBA Fin', score: 344 },
      { id: 'perihel', name: 'Perihelion', tag: 'T-06 · BBA', score: 305 },
      { id: 'lagrange', name: 'Lagrange Point', tag: 'T-07 · MBA HR', score: 288 },
      { id: 'zenith', name: 'Zenith Collective', tag: 'T-08 · MBA Mktg', score: 261 },
      { id: 'pulsar', name: 'Pulsar Group', tag: 'T-09 · BBA', score: 224 },
      { id: 'vela', name: 'Vela Analytics', tag: 'T-10 · MBA Ops', score: 197 }
    ]
  };

  let state = null;           // current data
  let rankOf = {};            // id -> previous rank (0-based)
  let prevScores = null;      // id -> score at last apply (for the transmission log)
  let rows = {};              // id -> row element
  let leaderId = null;
  let usingLocal = false;
  let simTimer = null;

  const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('telesto-board') : null;

  /* ---------- boot ---------- */
  Cosmos.starfield($('#starfield'));
  const toggle = $('#navToggle'), links = $('#navlinks');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  init();

  async function init() {
    const local = loadLocal();
    if (local) { usingLocal = true; state = local; }
    else state = await fetchJSON() || clone(DEFAULTS);
    buildRows();
    apply(state, true);
    buildConsole();
    updateSrcNote();
    if (!usingLocal) poll();
    if (bc) bc.onmessage = (e) => {
      if (e.data && e.data.type === 'scores') { state = e.data.payload; apply(state); usingLocal = true; updateSrcNote(); }
    };
    if (demoParam) setSim(true);
  }

  /* ---------- data helpers ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function loadLocal() {
    try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }
  function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }
  async function fetchJSON() {
    try {
      const r = await fetch('data/scores.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }
  function ranked() { return [...state.teams].sort((a, b) => b.score - a.score); }
  function maxScore() { return Math.max(1, ...state.teams.map(t => t.score)); }

  /* ---------- build rows once ---------- */
  function buildRows() {
    const board = $('#board');
    board.innerHTML = '';
    state.teams.forEach(t => {
      const li = document.createElement('li');
      li.className = 'row';
      li.dataset.id = t.id;
      li.innerHTML =
        `<div class="rank" data-rank>—</div>
         <div class="delta same" data-delta>•</div>
         <div class="cell-main">
           <div class="name-line"><span class="tname">${esc(t.name)}</span><span class="ttag">${esc(t.tag)}</span></div>
           <div class="track"><div class="fill" data-fill></div></div>
         </div>
         <div class="score" data-score>0<span class="pts">pts</span></div>`;
      li.setAttribute('aria-label', t.name);
      board.appendChild(li);
      rows[t.id] = li;

      // hover tooltip via title (lightweight, accessible)
      li.addEventListener('pointerenter', () => {
        const r = ranked().findIndex(x => x.id === t.id) + 1;
        li.title = `${t.name} — rank ${r}, ${t.score} pts`;
      });
    });
  }

  /* ---------- apply an update ---------- */
  function apply(data, first) {
    state = data;
    const order = ranked();
    const board = $('#board');

    // FLIP: capture positions before reorder
    const before = {};
    if (!first && !reduced) order.forEach(t => { before[t.id] = rows[t.id].getBoundingClientRect().top; });

    // reorder DOM to new ranking
    order.forEach(t => board.appendChild(rows[t.id]));

    // FLIP: invert & play
    if (!first && !reduced) order.forEach(t => {
      const el = rows[t.id];
      const dy = before[t.id] - el.getBoundingClientRect().top;
      if (dy) {
        el.style.transition = 'none';
        el.style.transform = `translateY(${dy}px)`;
        requestAnimationFrame(() => { el.style.transition = ''; el.style.transform = ''; });
      }
    });

    const mx = maxScore();
    order.forEach((t, i) => {
      const el = rows[t.id];
      // rank
      $('[data-rank]', el).textContent = String(i + 1).padStart(2, '0');
      // delta vs previous rank
      const prev = (t.id in rankOf) ? rankOf[t.id] : i;
      const d = $('[data-delta]', el);
      d.className = 'delta ' + (i < prev ? 'up' : i > prev ? 'down' : 'same');
      d.textContent = i < prev ? '▲' : i > prev ? '▼' : '•';
      // leader styling
      el.classList.toggle('lead', i === 0);
      // fill width
      const pct = (t.score / mx) * 100;
      const fill = $('[data-fill]', el);
      if (first) { fill.style.width = '0%'; requestAnimationFrame(() => fill.style.width = pct.toFixed(1) + '%'); }
      else fill.style.width = pct.toFixed(1) + '%';
      // score count-up
      const sc = $('[data-score]', el);
      const oldVal = parseInt(sc.dataset.v || '0', 10);
      countUp(sc, oldVal, t.score, first);
    });

    // remember ranks for next delta
    rankOf = {};
    order.forEach((t, i) => rankOf[t.id] = i);

    // podium + meta
    renderPodium(order, mx);
    $('#roundChip').textContent = 'Round: ' + (state.round || '—');
    $('#updatedAt').textContent = fmtTime(state.updated);

    // announce leader changes
    if (order[0] && order[0].id !== leaderId) {
      if (leaderId !== null) {
        $('#live').textContent = `${order[0].name} takes the lead with ${order[0].score} points.`;
        logTx(`<b>${esc(order[0].name)}</b> takes the event horizon`, null);
      }
      leaderId = order[0].id;
    }

    // transmission log — diff scores vs the previous apply
    if (prevScores) {
      state.teams.forEach(t => {
        const old = prevScores[t.id];
        if (old !== undefined && old !== t.score) {
          const d = t.score - old;
          logTx(`<b>${esc(t.name)}</b> ${d > 0 ? 'scores' : 'penalised'}`, d);
        }
      });
    }
    prevScores = {};
    state.teams.forEach(t => prevScores[t.id] = t.score);
  }

  function logTx(msgHTML, delta) {
    const list = $('#txlist');
    if (!list) return;
    const empty = list.querySelector('.tx.empty');
    if (empty) empty.remove();
    const li = document.createElement('li');
    li.className = 'tx fresh';
    li.innerHTML =
      `<span class="tx-t">${fmtTime(null)}</span>` +
      `<span class="tx-msg">${msgHTML}</span>` +
      (delta === null ? '<span class="tx-pts">◐</span>'
        : `<span class="tx-pts${delta < 0 ? ' neg' : ''}">${delta > 0 ? '+' : ''}${delta}</span>`);
    list.prepend(li);
    while (list.children.length > 30) list.lastElementChild.remove();
  }

  function countUp(el, from, to, instant) {
    el.dataset.v = to;
    const run = el._cuRun = (el._cuRun || 0) + 1;   // cancel any in-flight run
    const write = v => el.firstChild.nodeValue = String(v);
    if (instant || reduced || from === to) { write(to); return; }
    el.classList.add('bump'); el.closest('.row').classList.add('bump');
    const t0 = performance.now(), dur = 700;
    requestAnimationFrame(function tick(t) {
      if (el._cuRun !== run) return;
      const k = Math.min(1, Math.max(0, (t - t0) / dur));  // clamp both ends
      write(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
      else setTimeout(() => { el.classList.remove('bump'); el.closest('.row').classList.remove('bump'); }, 300);
    });
  }

  function renderPodium(order, mx) {
    const pod = $('#podium');
    const top = order.slice(0, 3);
    const slots = [top[1], top[0], top[2]];   // 2 · 1 · 3 visual order
    const cls = ['p2', 'p1', 'p3'];
    pod.innerHTML = slots.map((t, i) => t ? `
      <div class="pod ${cls[i]}">
        ${cls[i] === 'p1' ? '<div class="crown">Champion</div>' : ''}
        <div class="orb">${order.indexOf(t) + 1}</div>
        <div class="pod-name">${esc(t.name)}</div>
        <div class="pod-score">${t.score}</div>
        <div class="pod-tag">${esc(t.tag)}</div>
      </div>` : `<div class="pod"></div>`).join('');
  }

  /* ---------- polling ---------- */
  function poll() {
    setInterval(async () => {
      if (usingLocal || document.hidden) return;
      const data = await fetchJSON();
      if (data && changed(data)) apply(data);
    }, POLL_MS);
  }
  function changed(data) {
    return JSON.stringify(data.teams.map(t => [t.id, t.score]).sort())
        !== JSON.stringify(state.teams.map(t => [t.id, t.score]).sort());
  }

  /* ---------- mutate + broadcast ---------- */
  function bump(id, delta) {
    const t = state.teams.find(x => x.id === id);
    if (!t) return;
    t.score = Math.max(0, t.score + delta);
    state.updated = nowISO();
    usingLocal = true;
    saveLocal();
    apply(state);
    updateSrcNote();
    if (bc) bc.postMessage({ type: 'scores', payload: state });
  }

  /* ---------- judge console ---------- */
  function buildConsole() {
    const list = $('#jlist');
    list.innerHTML = state.teams.map(t => `
      <div class="jrow">
        <div class="jn">${esc(t.name)}<small>${esc(t.tag)}</small></div>
        <div class="jbtns">
          <button class="minus" data-id="${t.id}" data-d="-5">−5</button>
          <button data-id="${t.id}" data-d="5">+5</button>
          <button data-id="${t.id}" data-d="10">+10</button>
          <button data-id="${t.id}" data-d="25">+25</button>
        </div>
      </div>`).join('');
    list.addEventListener('click', e => {
      const b = e.target.closest('button[data-id]');
      if (b) bump(b.dataset.id, parseInt(b.dataset.d, 10));
    });

    const btn = $('#consoleBtn'), panel = $('#console');
    const open = v => { panel.classList.toggle('open', v); btn.setAttribute('aria-expanded', v); };
    btn.addEventListener('click', () => open(!panel.classList.contains('open')));
    $('#consoleClose').addEventListener('click', () => open(false));
    if (location.hash === '#console') open(true);   // deep-link to open the console

    const sim = $('#simToggle');
    sim.addEventListener('click', () => setSim(!sim.classList.contains('on')));

    $('#resetBtn').addEventListener('click', async () => {
      try { localStorage.removeItem(LS_KEY); } catch (e) {}
      usingLocal = false; setSim(false);
      const data = await fetchJSON() || clone(DEFAULTS);
      state = data; apply(state); updateSrcNote();
      if (bc) bc.postMessage({ type: 'scores', payload: state });
    });
  }

  function setSim(on) {
    const sim = $('#simToggle');
    sim.classList.toggle('on', on);
    sim.setAttribute('aria-checked', on);
    let chip = $('.chip.demo');
    if (on && !chip) { chip = el('span', 'chip demo', 'Simulating'); $('#status').appendChild(chip); }
    if (!on && chip) chip.remove();
    if (simTimer) { clearInterval(simTimer); simTimer = null; }
    if (on) {
      simTimer = setInterval(() => {
        const n = 1 + Math.floor(rnd() * 2);
        for (let i = 0; i < n; i++) {
          const t = state.teams[Math.floor(rnd() * state.teams.length)];
          t.score += 3 + Math.floor(rnd() * 22);
        }
        state.updated = nowISO(); usingLocal = true; saveLocal(); apply(state); updateSrcNote();
        if (bc) bc.postMessage({ type: 'scores', payload: state });
      }, 2600);
    }
  }

  function updateSrcNote() {
    $('#srcNote').textContent = usingLocal ? 'Source: Judge Console (local)' : 'Source: scores.json';
  }

  /* ---------- projector mode ---------- */
  (function projector() {
    const btn = $('#projBtn');
    if (!btn) return;
    async function toggleProj() {
      const on = !document.body.classList.contains('projector');
      document.body.classList.toggle('projector', on);
      btn.textContent = on ? '⛶ Exit projector' : '⛶ Projector';
      try {
        if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen();
        else if (!on && document.fullscreenElement) await document.exitFullscreen();
      } catch (e) { /* fullscreen may be blocked; class-based mode still applies */ }
    }
    btn.addEventListener('click', toggleProj);
    if (location.search.includes('projector')) {       // boot straight into projector view
      document.body.classList.add('projector');
      btn.textContent = '⛶ Exit projector';
    }
    document.addEventListener('keydown', e => {
      if (e.key.toLowerCase() === 'p' && !e.metaKey && !e.ctrlKey &&
          !/^(input|textarea|select)$/i.test(document.activeElement.tagName)) toggleProj();
    });
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && document.body.classList.contains('projector')) {
        document.body.classList.remove('projector');
        btn.textContent = '⛶ Projector';
      }
    });
  })();

  /* ---------- utils ---------- */
  let seed = 20260910;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function el(tag, cls, txt) { const e = document.createElement(tag); e.className = cls; e.textContent = txt; return e; }
  function nowISO() { return new Date().toISOString(); }
  function fmtTime(iso) {
    try {
      const d = iso ? new Date(iso) : new Date();
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) { return '—'; }
  }
})();
