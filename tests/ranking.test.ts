import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { ALL } from '../src/lib/categories';
import { loadBoard, PAGE_SIZE } from '../src/lib/ranking';
import { archiveExpiredSessions, loadVisitorStats, recordVisit, SESSION_TTL_MS } from '../src/lib/visitors';

/** node:sqlite を D1 の呼び出し形に合わせる最小のシム。 */
function asD1(db: DatabaseSync): D1Database {
  return {
    prepare(sql: string) {
      const stmt = db.prepare(sql);
      let args: unknown[] = [];
      const api = {
        bind(...a: unknown[]) {
          args = a;
          return api;
        },
        async all() {
          return { results: stmt.all(...(args as never[])) };
        },
        async first() {
          return stmt.get(...(args as never[])) ?? null;
        },
        async run() {
          const r = stmt.run(...(args as never[]));
          return { meta: { changes: Number(r.changes) } };
        },
      };
      return api;
    },
  } as unknown as D1Database;
}

const schema = readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8');
const seed = readFileSync(new URL('../seed/seed.sql', import.meta.url), 'utf8');

let raw: DatabaseSync;
let db: D1Database;

beforeEach(() => {
  raw = new DatabaseSync(':memory:');
  raw.exec(schema);
  db = asD1(raw);
});

function insert(key: string, amount: number, category: string, firstPaidAt: number) {
  raw
    .prepare(
      `INSERT INTO listings (key,url,title,description,category,amount,status,first_paid_at,updated_at)
       VALUES (?,?,?,?,?,?,'active',?,?)`,
    )
    .run(key, `https://${key}`, key, null, category, amount, firstPaidAt, firstPaidAt);
}

describe('マイグレーション', () => {
  it('0001_init.sql がそのまま適用できる', () => {
    const tables = raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => r['name']);
    expect(tables).toEqual(['counters', 'listings', 'payments', 'sessions']);
  });

  it('visitors_archived が 0 で入っている', () => {
    expect(raw.prepare("SELECT n FROM counters WHERE key='visitors_archived'").get()).toEqual({ n: 0 });
  });

  it('シードデータが適用できる', () => {
    raw.exec(seed);
    expect(raw.prepare('SELECT COUNT(*) AS n FROM listings').get()).toEqual({ n: 14 });
  });
});

describe('順位の算出', () => {
  it('金額の降順に並ぶ', async () => {
    insert('a', 100, 'game', 1);
    insert('b', 900, 'game', 2);
    insert('c', 500, 'game', 3);

    const board = await loadBoard(db, ALL, 1);
    expect(board.items.map((i) => [i.rank, i.key])).toEqual([
      [1, 'b'],
      [2, 'c'],
      [3, 'a'],
    ]);
  });

  it('同額の2件は先に掲載されたほうが上位', async () => {
    insert('later', 300, 'work', 2_000);
    insert('earlier', 300, 'work', 1_000);

    const board = await loadBoard(db, ALL, 1);
    expect(board.items.map((i) => i.key)).toEqual(['earlier', 'later']);
  });

  it('hidden と removed はランキングに出ない', async () => {
    insert('shown', 100, 'game', 1);
    insert('hidden', 900, 'game', 2);
    insert('removed', 800, 'game', 3);
    raw.prepare("UPDATE listings SET status='hidden' WHERE key='hidden'").run();
    raw.prepare("UPDATE listings SET status='removed' WHERE key='removed'").run();

    const board = await loadBoard(db, ALL, 1);
    expect(board.items.map((i) => i.key)).toEqual(['shown']);
    expect(board.total).toBe(1);
    expect(board.categoryTop).toBe(100);
  });

  it('カテゴリで絞ると順位が1から振り直される', async () => {
    insert('web1', 10_000, 'web', 1);
    insert('web2', 9_000, 'web', 2);
    insert('game1', 800, 'game', 3);
    insert('game2', 400, 'game', 4);

    const all = await loadBoard(db, ALL, 1);
    expect(all.items.map((i) => [i.rank, i.key])).toEqual([
      [1, 'web1'],
      [2, 'web2'],
      [3, 'game1'],
      [4, 'game2'],
    ]);

    const game = await loadBoard(db, 'game', 1);
    expect(game.items.map((i) => [i.rank, i.key])).toEqual([
      [1, 'game1'],
      [2, 'game2'],
    ]);
    expect(game.total).toBe(2);
  });

  it('カテゴリ内の最高額を返す（見出しの金額の元になる）', async () => {
    insert('web1', 10_000, 'web', 1);
    insert('game1', 800, 'game', 2);

    expect((await loadBoard(db, ALL, 1)).categoryTop).toBe(10_000);
    expect((await loadBoard(db, 'game', 1)).categoryTop).toBe(800);
  });

  it('掲載ゼロのカテゴリは空・最高額0（100円で1位）', async () => {
    insert('web1', 10_000, 'web', 1);

    const board = await loadBoard(db, 'vtuber', 1);
    expect(board.items).toEqual([]);
    expect(board.total).toBe(0);
    expect(board.categoryTop).toBe(0);
  });

  it('DB が無い環境では空のランキングを返す', async () => {
    const board = await loadBoard(null, ALL, 1);
    expect(board).toEqual({ items: [], total: 0, page: 1, pages: 1, categoryTop: 0 });
  });
});

describe('ページネーション', () => {
  beforeEach(() => {
    for (let i = 0; i < 120; i++) insert(`k${i}`, (120 - i) * 100, 'web', i);
  });

  it('1ページ50件', async () => {
    const p1 = await loadBoard(db, ALL, 1);
    expect(p1.items).toHaveLength(PAGE_SIZE);
    expect(p1.total).toBe(120);
    expect(p1.pages).toBe(3);
    expect(p1.items[0]!.rank).toBe(1);
  });

  it('順位 = OFFSET + 行番号 + 1', async () => {
    const p2 = await loadBoard(db, ALL, 2);
    expect(p2.items[0]!.rank).toBe(51);
    expect(p2.items.at(-1)!.rank).toBe(100);

    const p3 = await loadBoard(db, ALL, 3);
    expect(p3.items).toHaveLength(20);
    expect(p3.items[0]!.rank).toBe(101);
  });
});

describe('シードデータの並び', () => {
  beforeEach(() => raw.exec(seed));

  it('全体の上位3件が金額の降順で並ぶ', async () => {
    const board = await loadBoard(db, ALL, 1);
    expect(board.items.slice(0, 3).map((i) => [i.rank, i.title, i.amount])).toEqual([
      [1, '量子将棋', 10_000],
      [2, '非公開化ウォッチ', 5_000],
      [3, '駅名タイピング', 1_500],
    ]);
  });

  it('ゲームで絞ると1位が量子将棋になり順位が振り直される', async () => {
    const board = await loadBoard(db, 'game', 1);
    expect(board.items.map((i) => [i.rank, i.title])).toEqual([
      [1, '量子将棋'],
      [2, '駅名タイピング'],
      [3, '競艇メダルゲーム'],
    ]);
    expect(board.categoryTop).toBe(10_000);
  });

  it('同額300円の2件は先着が上位', async () => {
    const work = await loadBoard(db, 'work', 1);
    const person = await loadBoard(db, 'person', 1);
    const both = [...work.items, ...person.items].filter((i) => i.amount === 300);
    expect(both).toHaveLength(2);

    const all = await loadBoard(db, ALL, 1);
    const idx = all.items.filter((i) => i.amount === 300).map((i) => i.title);
    expect(idx).toEqual(['深夜のドット絵', 'individual dev blog']);
  });

  it('掲載のないカテゴリが存在する（空状態の確認用）', async () => {
    for (const slug of ['vtuber', 'company', 'other'] as const) {
      expect((await loadBoard(db, slug, 1)).total, slug).toBe(0);
    }
  });
});

describe('訪問者計測', () => {
  const now = 1_800_000_000_000;

  it('閲覧中は直近1時間、累計は archived + 現在の行数', async () => {
    await recordVisit(db, 'fresh', now - 10 * 60_000);
    await recordVisit(db, 'old', now - 2 * 60 * 60_000);

    expect(await loadVisitorStats(db, now)).toEqual({ online: 1, total: 2 });
  });

  it('同じIDを二重に記録しても増えない', async () => {
    await recordVisit(db, 'same', now);
    await recordVisit(db, 'same', now);
    expect(await loadVisitorStats(db, now)).toEqual({ online: 1, total: 1 });
  });

  it('Cron が古い行を削除し visitors_archived に加算する', async () => {
    await recordVisit(db, 'fresh', now - 10 * 60_000);
    await recordVisit(db, 'old1', now - 3 * 60 * 60_000);
    await recordVisit(db, 'old2', now - 30 * 60 * 60_000);

    const deleted = await archiveExpiredSessions(db, now);
    expect(deleted).toBe(2);

    expect(raw.prepare("SELECT n FROM counters WHERE key='visitors_archived'").get()).toEqual({ n: 2 });
    // 削除しても累計は減らない
    expect(await loadVisitorStats(db, now)).toEqual({ online: 1, total: 3 });
  });

  it('削除対象が無ければ counters を書き換えない', async () => {
    await recordVisit(db, 'fresh', now - SESSION_TTL_MS / 2);
    expect(await archiveExpiredSessions(db, now)).toBe(0);
    expect(raw.prepare("SELECT n FROM counters WHERE key='visitors_archived'").get()).toEqual({ n: 0 });
  });

  it('DB が無い環境では 0 を返す', async () => {
    expect(await loadVisitorStats(null, now)).toEqual({ online: 0, total: 0 });
  });
});
