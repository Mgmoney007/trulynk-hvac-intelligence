// Shared helpers: timestamps, slugs, bounded retries, per-host rate limiting, JSONL logging.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
export const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

export function loadPlaywright() {
  // ESM import cannot see the environment's global Playwright install; require() can.
  return createRequire(import.meta.url)('playwright');
}

export const nowIso = () => new Date().toISOString();
export const today = () => nowIso().slice(0, 10);
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export async function appendJsonl(file, obj) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, JSON.stringify(obj) + '\n');
}

export async function readJsonl(file) {
  try {
    const t = await fs.readFile(file, 'utf8');
    return t.split('\n').filter(Boolean).map(l => JSON.parse(l));
  } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}

export async function writeJson(file, obj) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(obj, null, 2));
}

export async function readJson(file, fallback = undefined) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT' && fallback !== undefined) return fallback; throw e; }
}

// Bounded retry. Only retries when shouldRetry(err|result) says so. Linear backoff.
export async function withRetry(fn, { retries = 1, backoffMs = 2000, shouldRetry = () => true } = {}) {
  let last;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fn(attempt);
      if (attempt < retries && shouldRetry(null, r)) { last = r; await sleep(backoffMs * (attempt + 1)); continue; }
      return r;
    } catch (e) {
      last = e;
      if (attempt >= retries || !shouldRetry(e, null)) throw e;
      await sleep(backoffMs * (attempt + 1));
    }
  }
  if (last instanceof Error) throw last;
  return last;
}

// Per-host minimum spacing between requests.
const lastHit = new Map();
export async function hostThrottle(url, minGapMs = 1200) {
  let host;
  try { host = new URL(url).host; } catch { return; }
  for (;;) {
    const prev = lastHit.get(host) || 0;
    const wait = prev + minGapMs - Date.now();
    if (wait <= 0) { lastHit.set(host, Date.now()); return; }
    await sleep(wait);
  }
}

// GET with timeout + throttle. Never throws; returns a classified result.
export async function probeUrl(url, { timeoutMs = 15000, method = 'GET' } = {}) {
  await hostThrottle(url);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const r = await fetch(url, { method, redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': UA_DESKTOP, accept: 'text/html,application/xhtml+xml,*/*' } });
    // Drain a little so the connection closes cleanly.
    let snippet = '';
    try { snippet = (await r.text()).slice(0, 3000); } catch {}
    return { url, finalUrl: r.url, status: r.status, ok: r.ok, ms: Date.now() - started, snippet, error: null };
  } catch (e) {
    return { url, finalUrl: null, status: null, ok: false, ms: Date.now() - started, snippet: '', error: (e.cause?.code || e.name || 'error') + ': ' + (e.cause?.message || e.message) };
  } finally { clearTimeout(t); }
}

// Simple concurrency pool.
export async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await worker(items[idx], idx); }
  });
  await Promise.all(runners);
  return out;
}
