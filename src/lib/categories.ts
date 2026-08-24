/**
 * カテゴリ定義の唯一の出典。要件定義書 3.2。
 *
 * チップ・セレクト・バリデーション・OGP はすべてここを参照する。
 * DB にはスラッグだけを保存する。表示名を変えても移行が起きないようにするため。
 */

export const CATEGORIES = [
  { slug: 'person', label: '個人・開発者' },
  { slug: 'vtuber', label: 'VTuber・配信者' },
  { slug: 'web', label: 'Webサイト・サービス' },
  { slug: 'app', label: 'アプリ' },
  { slug: 'game', label: 'ゲーム' },
  { slug: 'work', label: '創作・作品' },
  { slug: 'shop', label: '店・施設' },
  { slug: 'company', label: '企業・ブランド' },
  { slug: 'community', label: 'コミュニティ・イベント' },
  { slug: 'other', label: 'その他' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

/** `all` は表示上の擬似カテゴリであり、DB には保存しない。 */
export const ALL = 'all';
export type ViewSlug = CategorySlug | typeof ALL;

/** チップの並び。先頭が「すべて」。 */
export const VIEWS: ReadonlyArray<{ slug: ViewSlug; label: string }> = [
  { slug: ALL, label: 'すべて' },
  ...CATEGORIES,
];

const BY_SLUG = new Map<string, string>(VIEWS.map((v) => [v.slug, v.label]));

/** フォームの初期選択。`all` はカテゴリではないので既定値を持つ。 */
export const DEFAULT_CATEGORY: CategorySlug = 'web';

export function isCategory(slug: string | undefined | null): slug is CategorySlug {
  return !!slug && slug !== ALL && BY_SLUG.has(slug);
}

export function isView(slug: string | undefined | null): slug is ViewSlug {
  return !!slug && BY_SLUG.has(slug);
}

export function labelOf(slug: ViewSlug): string {
  return BY_SLUG.get(slug) ?? 'その他';
}

/** 「ゲームで1位を取るなら」／「1位を取るなら」 */
export function heroLabel(view: ViewSlug): string {
  return view === ALL ? '1位を取るなら' : `${labelOf(view)}で1位を取るなら`;
}

/** `ゲーム部門 — 買える日本一` */
export function pageTitle(view: ViewSlug): string {
  return view === ALL
    ? '買える日本一 — 100円から。金額の順に並ぶ、日本のインターネットのランキング'
    : `${labelOf(view)}部門 — 買える日本一`;
}

/** チップとページャの遷移先。 */
export function viewPath(view: ViewSlug, page = 1): string {
  const base = view === ALL ? '/' : `/c/${view}`;
  return page > 1 ? `${base}?p=${page}` : base;
}
