/**
 * ランキングの読み出し。要件定義書 6.1。
 *
 * 順位カラムは持たない。順位 = OFFSET + 行番号 + 1 で算出する。
 * 同額は first_paid_at の昇順、つまり先に掲載したほうが上位になる。
 */
import { ALL, type ViewSlug } from './categories';

export const PAGE_SIZE = 50;

export type Listing = {
  key: string;
  url: string;
  title: string;
  description: string | null;
  category: string;
  amount: number;
  first_paid_at: number;
  updated_at: number;
};

export type RankedListing = Listing & { rank: number };

export type Board = {
  items: RankedListing[];
  total: number;
  page: number;
  pages: number;
  categoryTop: number;
};

function clampPage(input: string | null): number {
  const n = Number.parseInt(input ?? '1', 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

export function pageFromUrl(url: URL): number {
  return clampPage(url.searchParams.get('p'));
}

/** カテゴリ内の最高額。該当なしなら 0。 */
export async function categoryTop(db: D1Database, view: ViewSlug): Promise<number> {
  const row = await db
    .prepare(
      `SELECT amount FROM listings
        WHERE status = 'active' AND (?1 = 'all' OR category = ?1)
        ORDER BY amount DESC, first_paid_at ASC
        LIMIT 1`,
    )
    .bind(view)
    .first<{ amount: number }>();
  return row?.amount ?? 0;
}

export async function countActive(db: D1Database, view: ViewSlug): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM listings
        WHERE status = 'active' AND (?1 = 'all' OR category = ?1)`,
    )
    .bind(view)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/**
 * 1ページ分のランキングを、順位を振った状態で返す。
 * 順位はカテゴリ内で 1 から振り直される（`all` のときだけ全体順位）。
 */
export async function loadBoard(
  db: D1Database | null,
  view: ViewSlug,
  page: number,
): Promise<Board> {
  if (!db) return { items: [], total: 0, page: 1, pages: 1, categoryTop: 0 };

  const offset = (page - 1) * PAGE_SIZE;

  const [rows, total, top] = await Promise.all([
    db
      .prepare(
        `SELECT key, url, title, description, amount, category, first_paid_at, updated_at
           FROM listings
          WHERE status = 'active' AND (?1 = 'all' OR category = ?1)
          ORDER BY amount DESC, first_paid_at ASC
          LIMIT ${PAGE_SIZE} OFFSET ?2`,
      )
      .bind(view, offset)
      .all<Listing>(),
    countActive(db, view),
    categoryTop(db, view),
  ]);

  const items = (rows.results ?? []).map((row, i) => ({ ...row, rank: offset + i + 1 }));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return { items, total, page, pages, categoryTop: top };
}

/** 統計ピルの「掲載◯件」は常にサイト全体の件数。 */
export async function countAllActive(db: D1Database | null): Promise<number> {
  return db ? countActive(db, ALL) : 0;
}
