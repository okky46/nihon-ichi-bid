/**
 * D1 バインディングの取り出し口。
 *
 * `astro dev` を platformProxy 無しで起動した場合や、まだ D1 を作成して
 * いない場合は binding が無い。その場合は null を返し、呼び出し側は
 * 空のランキングを描画する。ページが落ちるより空で出るほうがよい。
 */
export type Env = {
  DB?: D1Database;
  SITE_URL?: string;
  CONTACT_EMAIL?: string;
  PAYMENT_PROVIDER?: string;
};

type RuntimeLocals = { runtime?: { env?: Env; ctx?: { waitUntil(p: Promise<unknown>): void } } };

export function getEnv(locals: unknown): Env {
  return ((locals as RuntimeLocals | undefined)?.runtime?.env ?? {}) as Env;
}

export function getDb(locals: unknown): D1Database | null {
  return getEnv(locals).DB ?? null;
}

/** レスポンス後に処理を続ける。ctx が無い環境（dev）では false を返す。 */
export function waitUntil(locals: unknown, promise: Promise<unknown>): boolean {
  const ctx = (locals as RuntimeLocals | undefined)?.runtime?.ctx;
  if (!ctx?.waitUntil) return false;
  ctx.waitUntil(promise);
  return true;
}
