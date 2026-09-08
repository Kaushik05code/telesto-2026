/* ============================================================
   TELESTO 2026 — The Gravity Board (live engine)
   Public: rank order + bars relative to the leader. No points.
   Team login: decrypts that team's per-round ranks in-browser
   (AES-256-GCM, key derived from the team password) — nothing is
   ever sent anywhere and no other team's data can be read.
   Data: data/scores.json, rebuilt each minute from the BMT sheet.
   ============================================================ */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = Cosmos.reduced;
  const POLL_MS = 60000;

  let state = { roundNum: 0, teams: [], access: [] };
  let rosterKey = '';
  let rankOf = {};
  let rows = {};
  let leaderId = null;
  let session = null;                    // {id, name, pass, payload, round}

  /* ---------- boot ---------- */
  try { localStorage.removeItem('telesto_board_v1'); localStorage.removeItem('telesto_login_v1'); } catch (e) {}
  Cosmos.starfield($('#starfield'));
  const toggle = $('#navToggle'), links = $('#navlinks');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  init();

  async function init() {
    wireLogin();
    const data = await fetchJSON();
    if (data) apply(normalize(data), true);
    else showEmpty('Standings are syncing — check back in a moment.');
    setInterval(async () => {
      if (document.hidden) return;
      const d = await fetchJSON();
      if (d) { apply(normalize(d)); refreshSession(); }
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
    let teams = Array.isArray(d.teams) ? d.teams : [];
    const maxScore = Math.max(1, ...teams.map(t => Number(t.score) || 0));
    teams = teams.map(t => ({
      id: String(t.id),
      name: String(t.name || t.id),
      pct: t.pct !== undefined ? Number(t.pct) || 0
        : Math.round(((Number(t.score) || 0) / maxScore) * 100)   // legacy shape
    }));
    return {
      roundNum: Number(d.roundNum) || 0,
      teams,
      access: Array.isArray(d.access) ? d.access : []
    };
  }

  function showEmpty(msg) {
    const board = $('#board');
    board.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'row row-empty';
    li.textContent = msg;
    board.appendChild(li);
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /* ---------- board ---------- */
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
         </div>`;
      li.setAttribute('aria-label', t.name);
      board.appendChild(li);
      rows[t.id] = li;
    });
  }

  function apply(data, first) {
    const key = data.teams.map(t => t.id + '|' + t.name).join('\n');
    if (key !== rosterKey) {
      state = data; rosterKey = key;
      buildRows();
      rankOf = {};
      first = true;
    } else {
      state = data;
    }
    if (!state.teams.length) { showEmpty('No teams on the board yet.'); return; }

    const order = state.teams;             // server-sorted, best first
    const board = $('#board');

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
      el.classList.toggle('lead', i === 0 && t.pct > 0);
      const fill = $('[data-fill]', el);
      if (first) { fill.style.width = '0%'; requestAnimationFrame(() => fill.style.width = t.pct + '%'); }
      else fill.style.width = t.pct + '%';
    });

    rankOf = {};
    order.forEach((t, i) => rankOf[t.id] = i);

    renderPodium(order);
    $('#roundChip').textContent = 'Updated · Round ' + (state.roundNum || '—');

    if (order[0] && order[0].id !== leaderId) {
      if (leaderId !== null) {
        $('#live').textContent = `${order[0].name} takes the lead.`;
        if (!reduced) {
          const p1 = $('.pod.p1');
          if (p1) { p1.classList.add('crowned'); setTimeout(() => p1.classList.remove('crowned'), 1000); }
        }
      }
      leaderId = order[0].id;
    }
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
      </div>` : `<div class="pod"></div>`).join('');
  }

  /* ---------- team login (all client-side, nothing transmitted) ---------- */
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  async function decryptBlob(blob, pass, id) {
    const raw = b64d(blob);
    const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    const dkey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode('telesto26:' + id), iterations: 150000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: raw.slice(0, 12) }, dkey, raw.slice(12));
    return JSON.parse(dec.decode(plain));
  }

  const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

  async function tryLogin(uname, pass) {
    const wanted = norm(uname);
    const candidates = state.teams.filter(t => norm(t.name) === wanted);
    for (const t of candidates) {
      const a = state.access.find(x => x.id === t.id);
      if (!a) continue;
      try {
        const payload = await decryptBlob(a.blob, pass, t.id);
        return { id: t.id, name: t.name, pass, payload };
      } catch (e) { /* wrong password for this candidate */ }
    }
    return null;
  }

  function wireLogin() {
    const host = $('#loginHost'), panel = $('#loginPanel');
    const open = v => { panel.classList.toggle('open', v); $('#loginChip').setAttribute('aria-expanded', v); if (v) $('#lgName').focus(); };
    $('#loginChip').addEventListener('click', () => open(!panel.classList.contains('open')));
    $('#lgClose').addEventListener('click', () => open(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
    if (location.hash === '#login') open(true);

    const eye = $('#lgEye'), pass = $('#lgPass');
    eye.addEventListener('click', () => {
      const show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      eye.setAttribute('aria-pressed', show);
      eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      pass.focus();
    });

    $('#lgForm').addEventListener('submit', async e => {
      e.preventDefault();
      const err = $('#lgErr');
      err.textContent = '';
      const btn = $('#lgGo');
      btn.disabled = true; btn.textContent = 'Checking…';
      const res = await tryLogin($('#lgName').value, $('#lgPass').value.trim());
      btn.disabled = false; btn.textContent = 'View my ranks';
      if (!res) {
        err.textContent = state.access.length
          ? 'No match — check your team name and password.'
          : 'Logins are still being provisioned. Try again in a minute.';
        return;
      }
      session = res;
      renderTeamView();
    });

    $('#lgLogout').addEventListener('click', () => {
      session = null;
      $('#lgResult').hidden = true;
      $('#lgForm').hidden = false;
      $('#lgPass').value = '';
    });
  }

  async function refreshSession() {
    if (!session) return;
    const a = state.access.find(x => x.id === session.id);
    if (!a) return;
    try {
      session.payload = await decryptBlob(a.blob, session.pass, session.id);
      session.name = session.payload.n;
      renderTeamView();
    } catch (e) { /* keep last good payload */ }
  }

  function renderTeamView() {
    const p = session.payload;
    $('#lgForm').hidden = true;
    $('#lgResult').hidden = false;
    $('#lgWho').textContent = p.n;
    const roundsEl = $('#lgRounds');
    if (!p.rounds.length) {
      roundsEl.innerHTML = '';
      $('#lgOut').innerHTML = '<p class="lg-wait">No rounds are live yet — ranks appear here as rounds are published.</p>';
      return;
    }
    if (!session.round || !p.rounds.some(r => r.r === session.round)) {
      session.round = p.rounds[p.rounds.length - 1].r;      // latest by default
    }
    roundsEl.innerHTML = p.rounds.map(r =>
      `<button class="rnd${r.r === session.round ? ' on' : ''}" data-r="${r.r}">R${r.r}</button>`).join('');
    $$('.rnd', roundsEl).forEach(b => b.addEventListener('click', () => {
      session.round = parseInt(b.dataset.r, 10);
      renderTeamView();
    }));
    const sel = p.rounds.find(r => r.r === session.round);
    $('#lgOut').innerHTML =
      `<div class="lg-rank"><span class="lg-num">#${sel.rr}</span><span class="lg-cap">Round ${sel.r} rank</span></div>
       <p class="lg-note">of ${p.total} teams</p>`;
  }

  /* ---------- projector view (press P, or ?projector) ---------- */
  (function projector() {
    async function toggleProj() {
      const on = !document.body.classList.contains('projector');
      document.body.classList.toggle('projector', on);
      try {
        if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen();
        else if (!on && document.fullscreenElement) await document.exitFullscreen();
      } catch (e) { }
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
