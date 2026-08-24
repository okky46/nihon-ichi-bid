import { defineMiddleware } from 'astro:middleware';
import { cacheControlFor, cacheKey, edgeCache, isCacheablePath } from './lib/cache';
import { waitUntil } from './lib/db';
import { pageFromUrl } from './lib/ranking';

/**
 * 一覧ページを Cache API に載せる。要件定義書 8.2。
 *
 * 無キャッシュで 10万PV/日 を捌くと D1 の読取が上限に張り付く。
 * 10秒キャッシュで実質1万行以下に落ちる。
 *
 * Set-Cookie の付いたレスポンスは共有キャッシュに入れてはならない。
 * HTML では Cookie を発行しない設計だが、保険として明示的に弾く。
 *
 * 注: Cloudflare のローカルエミュレータは Cache API を no-op として扱うため、
 * 実際のヒットはデプロイ後にしか観測できない。
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, locals } = context;

  if (request.method !== 'GET' || !isCacheablePath(url.pathname)) {
    return next();
  }

  const cache = edgeCache(locals);
  if (!cache) return next();

  const key = cacheKey(url);
  // キャッシュの不調でページを落とさない
  const hit = await cache.match(key).catch(() => undefined);
  if (hit) return hit;

  const response = await next();
  if (response.status !== 200 || response.headers.has('set-cookie')) {
    return response;
  }

  response.headers.set('Cache-Control', cacheControlFor(pageFromUrl(url)));
  const store = cache.put(key, response.clone()).catch(() => undefined);
  if (!waitUntil(locals, store)) await store;
  return response;
});
