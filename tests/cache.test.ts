import { describe, expect, it } from 'vitest';
import { cacheControlFor, cacheKey, isCacheablePath } from '../src/lib/cache';

describe('キャッシュ対象', () => {
  it('一覧ページだけをキャッシュする', () => {
    expect(isCacheablePath('/')).toBe(true);
    expect(isCacheablePath('/c/game')).toBe(true);
    expect(isCacheablePath('/c/game/')).toBe(true);
  });

  it('API・法務ページはキャッシュしない', () => {
    for (const p of ['/api/ping', '/terms', '/rules', '/confirm', '/thanks', '/admin']) {
      expect(isCacheablePath(p), p).toBe(false);
    }
  });
});

describe('Cache-Control', () => {
  it('1ページ目は s-maxage=10', () => {
    expect(cacheControlFor(1)).toBe('public, s-maxage=10, stale-while-revalidate=60');
  });

  it('2ページ目以降は s-maxage=30', () => {
    expect(cacheControlFor(2)).toBe('public, s-maxage=30, stale-while-revalidate=60');
    expect(cacheControlFor(7)).toBe('public, s-maxage=30, stale-while-revalidate=60');
  });
});

describe('キャッシュキー', () => {
  const key = (u: string) => cacheKey(new URL(u)).url;

  it('p 以外のクエリを落とす', () => {
    expect(key('https://nihon-ichi.com/?utm_source=x')).toBe('https://nihon-ichi.com/');
    expect(key('https://nihon-ichi.com/c/game?utm_source=x&fbclid=y')).toBe('https://nihon-ichi.com/c/game');
  });

  it('p は保持する', () => {
    expect(key('https://nihon-ichi.com/?p=2&utm=x')).toBe('https://nihon-ichi.com/?p=2');
    expect(key('https://nihon-ichi.com/c/game?p=3')).toBe('https://nihon-ichi.com/c/game?p=3');
  });

  it('p=1 は既定なので落とす', () => {
    expect(key('https://nihon-ichi.com/?p=1')).toBe('https://nihon-ichi.com/');
  });

  it('末尾スラッシュの有無で別エントリにしない', () => {
    expect(key('https://nihon-ichi.com/c/game/')).toBe(key('https://nihon-ichi.com/c/game'));
  });

  it('ルートは / のまま', () => {
    expect(key('https://nihon-ichi.com/')).toBe('https://nihon-ichi.com/');
  });
});
