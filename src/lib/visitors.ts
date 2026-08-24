/**
 * 訪問者計測。要件定義書 6.6。
 *
 * HTML には Set-Cookie を載せない。HTML は誰に対しても同一で完全に
 * キャッシュ可能に保ち、Cookie の発行は /api/ping だけが行う。
 */

export const SESSION_COOKIE = 'nib_sid';
export const SESSION_TTL_MS = 60 * 60 * 1000; // 1時間
export const ARCHIVED_COUNTER = 'visitors_archived';

export type VisitorStats = { online: number; total: number };

export function readSessionId(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) {
      const value = rest.join('=');
      return value ? value : null;
    }
  }
  return null;
}

export function sessionCookie(id: string, secure: boolean): string {
  const attrs = [
    `${SESSION_COOKIE}=${id}`,
    'Path=/',
    `Max-Age=${SESSION_TTL_MS / 1000}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

/** Cookie を持たない訪問者のみ1行 INSERT する。 */
export async function recordVisit(db: D1Database, id: string, now = Date.now()): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO sessions (id, seen_at) VALUES (?1, ?2)')
    .bind(id, now)
    .run();
}

/**
 * 閲覧中 = 直近1時間のユニークセッション数。
 * 累計 = visitors_archived + 現在の sessions 行数。
 * どちらも実測であり、大きく見せる処理は入れない。
 */
export async function loadVisitorStats(
  db: D1Database | null,
  now = Date.now(),
): Promise<VisitorStats> {
  if (!db) return { online: 0, total: 0 };

  const [online, live, archived] = await Promise.all([
    db
      .prepare('SELECT COUNT(*) AS n FROM sessions WHERE seen_at > ?1')
      .bind(now - SESSION_TTL_MS)
      .first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM sessions').first<{ n: number }>(),
    db
      .prepare('SELECT n FROM counters WHERE key = ?1')
      .bind(ARCHIVED_COUNTER)
      .first<{ n: number }>(),
  ]);

  return {
    online: online?.n ?? 0,
    total: (archived?.n ?? 0) + (live?.n ?? 0),
  };
}

/**
 * Cron から呼ぶ。1時間より古い行を削除し、削除件数を累計へ加算する。
 * 書き込みは1日1回しか増えない。
 */
export async function archiveExpiredSessions(db: D1Database, now = Date.now()): Promise<number> {
  const deleted = await db
    .prepare('DELETE FROM sessions WHERE seen_at <= ?1')
    .bind(now - SESSION_TTL_MS)
    .run();

  const changes = deleted.meta?.changes ?? 0;
  if (changes > 0) {
    await db
      .prepare(
        `INSERT INTO counters (key, n) VALUES (?1, ?2)
           ON CONFLICT(key) DO UPDATE SET n = n + excluded.n`,
      )
      .bind(ARCHIVED_COUNTER, changes)
      .run();
  }
  return changes;
}
