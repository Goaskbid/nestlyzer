import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../src/more/politics.js', import.meta.url), 'utf8');
const lines = src.split('\n').filter((l) => /^(var POL_KEEP|function polStore(Put|Get))/.test(l)).join('\n');

function sandbox(now) {
  const m = new Map();
  const ls = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i], get length() { return m.size; } };
  const ctx = { localStorage: ls, JSON, Date: { now: () => now.t }, Math };
  vm.createContext(ctx); vm.runInContext(lines, ctx); return { ctx, m };
}

test('politics: stored per place, only the needed claims, reused within 30 days, expires after', () => {
  const now = { t: 1e12 }; const { ctx, m } = sandbox(now);
  ctx.polStorePut('Q72', { labels: { en: { value: 'Zurich' }, de: { value: 'Zürich' } }, claims: { P6: [1], P194: [2], P18: [3] } });
  const raw = JSON.parse(m.get('nzpol:Q72'));
  assert.deepEqual(Object.keys(raw.e.claims).sort(), ['P194', 'P6']);
  assert.equal(raw.e.labels.de, undefined);
  assert.equal(ctx.polStoreGet('Q72').labels.en.value, 'Zurich');
  now.t += 29 * 864e5; assert.ok(ctx.polStoreGet('Q72'));
  now.t += 2 * 864e5; assert.equal(ctx.polStoreGet('Q72'), null);
  assert.equal(ctx.polStoreGet('Q1'), null);
});

test('politics: broken storage never throws', () => {
  const ctx = { localStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); }, key() { return null; }, length: 0, removeItem() {} }, JSON, Date, Math };
  vm.createContext(ctx); vm.runInContext(lines, ctx);
  assert.doesNotThrow(() => ctx.polStorePut('Q72', { claims: {} }));
  assert.equal(ctx.polStoreGet('Q72'), null);
});
