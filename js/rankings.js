/* ============================================================
   TELESTO 2026 — The Gravity Board (live engine)
   Source of truth: data/scores.json, rebuilt every 5 minutes by
   .github/workflows/sync-scores.yml from the official BMT Google
   Sheet (publish checkboxes decide which rounds count).
   The browser only ever polls same-origin JSON — no credentials,
   no third-party calls, no local editing.
   ============================================================ */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = Cosmos.reduced;
  const POLL_MS = 60000;                 // re-check standings every minute

  let state = { roundNum: 0, teams: [] };
  let rosterKey = '';                    // id|name signature — rebuild rows when it changes
  let rankOf = {};                       // id -> previous rank
  let prevScores = null;                 // id -> score at last apply
  let rows = {};                         // id -> <li>
  let leaderId = null;

  /* ---------- boot ---------- */
  try { localStorage.removeItem('telesto_board_v1'); } catch (e) {}   // purge pre-v7 local data
  Cosmos.starfield($('#starfield'));
  const toggle = $('#navToggle'), links = $('#navlinks');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  init();

  async function init() {
    const data = await fetchJSON();
    if (data) apply(normalize(data), true);
    else showEmpty('Standings are syncing — check back in a moment.');
    setInterval(async () => {
      if (document.hidden) return;
      const d = await fetchJSON();
      if (d) apply(normalize(d));
    }, POLL_MS);
  }

  /* ---------- data ---------- */
  async function fetchJSON() {
    try {
      const r = await fetch('data/scores.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }
  function normalize(d) {
    return {
      roundNum: Number(d.roundNum) || 0,
      teams: Array.isArray(d.teams)
        ? d.teams.map(t => ({ id: String(t.id), name: String(t.name || t.id), score: Number(t.score) || 0 }))
        : []
    };
  }
  function ranked() { return [...state.teams].sort((a, b) => b.score - a.score); }

  function showEmpty(msg) {
    const board = $('#board');
    board.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'row row-empty';
    li.textContent = msg;
    board.appendChild(li);
  }

  /* ---------- rows ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function buildRows() {
    const board = $('#board');
    board.innerHTML = '';
    rows = {};
    state.teams.forEach(t => {
      const li = document.createElement('li');
      li.className = 'row';
      li.dataset.id = t.id;
      li.innerHTML =
        `<div class="rank" data-rank>—</div>
         <div class="delta same" data-delta>•</div>
         <div class="cell-main">
           <div class="name-line"><span class="tname">${esc(t.name)}</span></div>
           <div class="track"><div class="fill" data-fill></div></div>
         </div>
         <div class="score" data-score>0<span class="pts">pts</span></div>`;
      li.setAttribute('aria-label', t.name);
      board.appendChild(li);
      rows[t.id] = li;
    });
  }

  /* ---------- apply an update ---------- */
  function apply(data, first) {
    const key = data.teams.map(t => t.id + '|' + t.name).join('\n');
    const rebuilt = key !== rosterKey;
    if (rebuilt) {
      state = data; rosterKey = key;
      buildRows();
      rankOf = {}; prevScores = null;
      first = true;                       // fresh rows animate in from zero
    } else {
      state = data;
    }
    if (!state.teams.length) { showEmpty('No teams on the board yet.'); return; }

    const order = ranked();
    const board = $('#board');
    const mx = Math.max(1, ...state.teams.map(t => t.score));

    const before = {};
    if (!first && !reduced) order.forEach(t => { before[t.id] = rows[t.id].getBoundingClientRect().top; });
    order.forEach(t => board.appendChild(rows[t.id]));
    if (!first && !reduced) order.forEach(t => {
      const el = rows[t.id];
      const dy = before[t.id] - el.getBoundingClientRect().top;
      if (dy) {
        el.style.transition = 'none';
        el.style.transform = `translateY(${dy}px)`;
        requestAnimationFrame(() => { el.style.transition = ''; el.style.transform = ''; });
      }
    });

    order.forEach((t, i) => {
      const el = rows[t.id];
      $('[data-rank]', el).textContent = String(i + 1).padStart(2, '0');
      const prev = (t.id in rankOf) ? rankOf[t.id] : i;
      const d = $('[data-delta]', el);
      d.className = 'delta ' + (i < prev ? 'up' : i > prev ? 'down' : 'same');
      d.textContent = i < prev ? '▲' : i > prev ? '▼' : '•';
      if (!first && !reduced && i !== prev) {
        const cls = i < prev ? 'moved-up' : 'moved-down';
        el.classList.remove('moved-up', 'moved-down');
        void el.offsetWidth;
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), 1100);
      }
      el.classList.toggle('lead', i === 0 && t.score > 0);
      const pct = (t.score / mx) * 100;
      const fill = $('[data-fill]', el);
      if (first) { fill.style.width = '0%'; requestAnimationFrame(() => fill.style.width = pct.toFixed(1) + '%'); }
      else fill.style.width = pct.toFixed(1) + '%';
      const sc = $('[data-score]', el);
      countUp(sc, parseInt(sc.dataset.v || '0', 10), t.score, first);
    });

    rankOf = {};
    order.forEach((t, i) => rankOf[t.id] = i);
    prevScores = {};
    state.teams.forEach(t => prevScores[t.id] = t.score);

    renderPodium(order);
    $('#roundChip').textContent = 'Updated · Round ' + (state.roundNum || '—');

    if (order[0] && order[0].id !== leaderId) {
      if (leaderId !== null) {
        $('#live').textContent = `${order[0].name} takes the lead with ${order[0].score} points.`;
        if (!reduced) {
          const p1 = $('.pod.p1');
          if (p1) { p1.classList.add('crowned'); setTimeout(() => p1.classList.remove('crowned'), 1000); }
        }
      }
      leaderId = order[0].id;
    }
  }

  function countUp(el, from, to, instant) {
    el.dataset.v = to;
    const run = el._cuRun = (el._cuRun || 0) + 1;
    const write = v => el.firstChild.nodeValue = String(v);
    if (instant || reduced || from === to) { write(to); return; }
    el.classList.add('bump'); el.closest('.row').classList.add('bump');
    const t0 = performance.now(), dur = 700;
    requestAnimationFrame(function tick(t) {
      if (el._cuRun !== run) return;
      const k = Math.min(1, Math.max(0, (t - t0) / dur));
      write(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
      else setTimeout(() => { el.classList.remove('bump'); el.closest('.row').classList.remove('bump'); }, 300);
    });
  }

  function renderPodium(order) {
    const pod = $('#podium');
    const top = order.slice(0, 3);
    const slots = [top[1], top[0], top[2]];
    const cls = ['p2', 'p1', 'p3'];
    pod.innerHTML = slots.map((t, i) => t ? `
      <div class="pod ${cls[i]}">
        <div class="orb">${order.indexOf(t) + 1}</div>
        <div class="pod-name">${esc(t.name)}</div>
        <div class="pod-score">${t.score}</div>
      </div>` : `<div class="pod"></div>`).join('');
  }

  /* ---------- projector view (press P, or ?projector) ---------- */
  (function projector() {
    async function toggleProj() {
      const on = !document.body.classList.contains('projector');
      document.body.classList.toggle('projector', on);
      try {
        if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen();
        else if (!on && document.fullscreenElement) await document.exitFullscreen();
      } catch (e) { /* class-based mode still applies */ }
    }
    document.addEventListener('keydown', e => {
      if (e.key.toLowerCase() === 'p' && !e.metaKey && !e.ctrlKey &&
          !/^(input|textarea|select)$/i.test(document.activeElement.tagName)) toggleProj();
    });
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) document.body.classList.remove('projector');
    });
    if (location.search.includes('projector')) document.body.classList.add('projector');
  })();
})();
