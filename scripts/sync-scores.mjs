/* ============================================================
   Telesto 2026 — BMT scoreboard sync
   Reads the BMT tab (scores + publish checkboxes) and the team
   credentials sheet, then rewrites data/scores.json with:
     • public standings — rank order + bar percentages only
       (raw points are never published)
     • per-team encrypted blobs (AES-256-GCM, key derived from the
       team's password) carrying their per-round + overall ranks
   Also keeps the credentials sheet's Username column in step with
   team renames in the BMT tab.
   Run continuously by .github/workflows/sync-scores.yml.
   ============================================================ */
import { createSign, createHash, pbkdf2Sync, createCipheriv, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BMT_ID = '1Rx5J8QOXJ2jcN30fG4OoEQKHFVBZd6vNBnDoTKqHOFw';
const CREDS_ID = '1OLi7MZ4lEAcZfnKeSgs2IW0115S3N6VXYMKRKowiaBs';
const ROUNDS = 19;                       // BMT columns C..U = Round 0..Round 18
const OUT = fileURLToPath(new URL('../data/scores.json', import.meta.url));

const key = JSON.parse(process.env.GCP_SA_KEY || readFileSync(process.env.GCP_SA_KEY_FILE, 'utf8'));

function b64url(buf) { return Buffer.from(buf).toString('base64url'); }

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${signer.sign(key.private_key, 'base64url')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

const token = await accessToken();
async function sheet(id, range, opts = '') {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE${opts}`,
    { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`sheets ${res.status}: ${await res.text()}`);
  return (await res.json()).values || [];
}

/* ---------- BMT tab ---------- */
const rows = await sheet(BMT_ID, 'BMT!A2:V34');
const publish = (rows[0] || []).slice(2, 2 + ROUNDS).map(v => v === true || v === 'TRUE');
/* rounds are 0-based: column C = Round 0 */
const liveRounds = publish.map((p, i) => p ? i : -1).filter(i => i >= 0);
const roundNum = liveRounds.length ? Math.max(...liveRounds) : null;

const teams = [];                        // {num, id, name, perRound[18], total}
for (let r = 2; r < rows.length; r++) {
  const row = rows[r] || [];
  const num = String(row[0] ?? '').trim();
  if (!num) continue;
  const name = String(row[1] ?? '').trim() || `Team ${num}`;
  const perRound = [];
  let total = 0;
  for (let c = 0; c < ROUNDS; c++) {
    const v = Number(row[c + 2]);
    const score = Number.isFinite(v) ? v : 0;
    perRound.push(score);
    if (publish[c]) total += score;
  }
  teams.push({ num, id: 't' + num, name, perRound, total: Math.round(total * 100) / 100 });
}

/* competition ranking (1,2,2,4) of `value` within `values` (desc) */
function rankOf(value, values) {
  return values.filter(v => v > value).length + 1;
}

/* ---------- credentials sheet: passwords in, usernames refreshed ---------- */
const creds = await sheet(CREDS_ID, 'Sheet1!A2:C40');
const passByNum = {};
const fixes = [];
creds.forEach((row, i) => {
  const num = String(row[0] ?? '').trim();
  if (!num) return;
  const pass = String(row[2] ?? '').trim();
  if (pass) passByNum[num] = pass;
  const team = teams.find(t => t.num === num);
  const uname = String(row[1] ?? '').trim();
  if (team && uname !== team.name) {
    fixes.push({ range: `Sheet1!B${i + 2}`, values: [[team.name]] });
  }
});
if (fixes.length) {
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CREDS_ID}/values:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ valueInputOption: 'RAW', data: fixes })
  });
  console.log(`refreshed ${fixes.length} usernames in the credentials sheet`);
}

/* ---------- public payload: order + relative bars, no points ---------- */
const ordered = [...teams].sort((a, b) => b.total - a.total);
const maxTotal = Math.max(1, ...teams.map(t => t.total));
const pub = ordered.map(t => ({
  id: t.id, name: t.name,
  pct: t.total > 0 ? Math.max(2, Math.round((t.total / maxTotal) * 100)) : 0
}));

/* ---------- private per-team blobs ---------- */
function teamPayload(t) {
  const rounds = liveRounds.map(r => {                 // r is 0-based (Round 0 = perRound[0])
    const roundScores = teams.map(x => x.perRound[r]);
    const cumTo = x => liveRounds.filter(lr => lr <= r).reduce((s, lr) => s + x.perRound[lr], 0);
    const cums = teams.map(cumTo);
    return {
      r,
      rr: rankOf(t.perRound[r], roundScores),
      or: rankOf(cumTo(t), cums)
    };
  });
  return { n: t.name, total: teams.length, rounds };
}

const plainSig = createHash('sha256').update(JSON.stringify({
  data: teams.map(t => [t.id, passByNum[t.num] || '', ...liveRounds.map(r => t.perRound[r])]),
  liveRounds
})).digest('hex').slice(0, 16);

/* skip rewrite (and IV churn) when nothing that matters changed */
let prev = null;
if (existsSync(OUT)) { try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch { } }
const pubStr = JSON.stringify({ roundNum, rounds: liveRounds, teams: pub });
if (prev && prev.sig === plainSig &&
    JSON.stringify({ roundNum: prev.roundNum, rounds: prev.rounds || [], teams: prev.teams }) === pubStr) {
  console.log('no change — skipping write');
  process.exit(0);
}

const access = [];
for (const t of teams) {
  const pass = passByNum[t.num];
  if (!pass) continue;
  const dkey = pbkdf2Sync(pass, 'telesto26:' + t.id, 150000, 32, 'sha256');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', dkey, iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(teamPayload(t)), 'utf8'), cipher.final()]);
  const blob = Buffer.concat([iv, ct, cipher.getAuthTag()]).toString('base64');
  access.push({ id: t.id, blob });
}

writeFileSync(OUT, JSON.stringify({
  roundNum, rounds: liveRounds, teams: pub, access, sig: plainSig,
  updated: new Date().toISOString()
}, null, 1) + '\n');
console.log(`wrote ${pub.length} teams (${access.length} logins), live through round ${roundNum ?? '—'}`);
