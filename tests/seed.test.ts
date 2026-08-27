import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizeUrl } from '../src/lib/url-normalize';

it('seed の key は url-normalize の出力と一致する', () => {
  const sql = readFileSync(new URL('../seed/seed.sql', import.meta.url), 'utf8');
  const rows = [...sql.matchAll(/\('([^']+)', '(https:[^']+)'/g)];
  expect(rows.length).toBe(14);
  for (const [, key, url] of rows) {
    const r = normalizeUrl(url!);
    expect(r.ok, url).toBe(true);
    expect(r.ok && r.key, url).toBe(key);
    expect(r.ok && r.url, url).toBe(url);
  }
});
