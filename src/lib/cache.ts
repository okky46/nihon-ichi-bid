/**
 * エッジキャッシュ。要件定義書 8.2。
 *
 * 無キャッシュで 10万PV/日 を捌くと D1 の読取が上限に張り付く。
 * 一覧は Cache API に載せ、D1 へ到達するリクエストを 10秒に1回へ落とす。
 */

/** 一覧ページだけをキャッシュする。 */
export function isCacheablePath(pathname: string): boolean {
  return pathname === '/' || /^\/c\/[a-z]+\/?$/.test(pathname);
}

export function cacheControlFor(page: number): string {
  return page <= 1
    ? 'public, s-maxage=10, stale-while-revalidate=60'
    : 'public, s-maxage=30, stale-while-revalidate=60';
}

/**
 * キャッシュキー。`p` 以外のクエリは順位に影響しないので落とす。
 * これがないと utm 付きリンクごとに別エントリになりヒット率が落ちる。
 */
export function cacheKey(url: URL): Request {
  const key = new URL(url.origin);
  key.pathname = url.pathname.replace(/(.)\/$/, '$1');
  const p = Number.parseInt(url.searchParams.get('p') ?? '1', 10);
  if (Number.isFinite(p) && p > 1) key.searchParams.set('p', String(p));
  return new Request(key.toString(), { method: 'GET' });
}

type MaybeCaches = { default?: Cache } | undefined;
type RuntimeLocals = { runtime?: { caches?: MaybeCaches } } | undefined;

/**
 * Cache API を取り出す。Cloudflare 上でも `astro dev`（platformProxy）でも
 * locals.runtime.caches から取れる。どちらでも無ければ null を返して素通しする。
 */
export function edgeCache(locals?: unknown): Cache | null {
  const fromLocals = (locals as RuntimeLocals)?.runtime?.caches?.default;
  if (fromLocals) return fromLocals;
  return (globalThis as { caches?: MaybeCaches }).caches?.default ?? null;
}
