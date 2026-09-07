/* ============================================================
   Telesto 2026 — BMT scoreboard sync
   Reads the BMT tab of the official Google Sheet with a service
   account and rewrites data/scores.json when standings change.
   Run by .github/workflows/sync-scores.yml every 5 minutes.
   Zero npm dependencies (node:crypto JWT + fetch).
   ============================================================ */
import { createSign } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SHEET_ID = '1Rx5J8QOXJ2jcN30fG4OoEQKHFVBZd6vNBnDoTKqHOFw';
const RANGE = 'BMT!A2:R34';          // checkbox row + header + 31 team rows
const OUT = fileURLToPath(new URL('../data/scores.json', import.meta.url));

const key = JSON.parse(process.env.GCP_SA_KEY || readFileSync(process.env.GCP_SA_KEY_FILE, 'utf8'));

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${signer.sign(key.private_key, 'base64url')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

const token = await accessToken();
const res = await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?valueRenderOption=UNFORMATTED_VALUE`,
  { headers: { Authorization: `Bearer ${token}` } }
);
if (!res.ok) throw new Error(`sheets ${res.status}: ${await res.text()}`);
const rows = (await res.json()).values || [];

/* row 0 = publish checkboxes (cols C..Q → idx 2..16), row 1 = header, rows 2+ = teams */
const publish = (rows[0] || []).slice(2, 17).map(v => v === true || v === 'TRUE');
const liveRounds = publish.map((p, i) => p ? i + 1 : 0).filter(Boolean);
const roundNum = liveRounds.length ? Math.max(...liveRounds) : 0;

const teams = [];
for (let r = 2; r < rows.length; r++) {
  const row = rows[r] || [];
  const num = String(row[0] ?? '').trim();
  if (!num) continue;
  const name = String(row[1] ?? '').trim() || `Team ${num}`;
  let score = 0;
  for (let c = 2; c <= 16; c++) {
    if (!publish[c - 2]) continue;
    const v = Number(row[c]);
    if (Number.isFinite(v)) score += v;
  }
  teams.push({ id: 't' + num, name, score: Math.round(score) });
}

const payload = { roundNum, teams };

/* commit only when standings actually changed (timestamp excluded from diff) */
let previous = null;
if (existsSync(OUT)) {
  try {
    const p = JSON.parse(readFileSync(OUT, 'utf8'));
    previous = JSON.stringify({ roundNum: p.roundNum, teams: p.teams });
  } catch { /* rewrite on parse failure */ }
}
if (previous === JSON.stringify(payload)) {
  console.log('no change — skipping write');
  process.exit(0);
}

writeFileSync(OUT, JSON.stringify({
  ...payload,
  updated: new Date().toISOString()
}, null, 1) + '\n');
console.log(`wrote ${teams.length} teams, live through round ${roundNum || '—'}`);
