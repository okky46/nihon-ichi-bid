import type { APIRoute } from 'astro';
import { getDb, waitUntil } from '../../lib/db';
import { readSessionId, recordVisit, sessionCookie } from '../../lib/visitors';

/**
 * 訪問者計測のビーコン。要件定義書 6.6。
 *
 * Cookie を持つ訪問者に対しては何も書き込まない。JSを実行しないクローラは
 * ここに到達しないので、UA による bot 除外リストが要らなくなる。
 */
export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });

  if (readSessionId(request)) {
    return new Response(JSON.stringify({ ok: true, new: false }), { headers });
  }

  const db = getDb(locals);
  const id = crypto.randomUUID();

  if (db) {
    const write = recordVisit(db, id);
    if (!waitUntil(locals, write)) await write;
  }

  headers.append('Set-Cookie', sessionCookie(id, new URL(request.url).protocol === 'https:'));
  return new Response(JSON.stringify({ ok: true, new: true }), { headers });
};
