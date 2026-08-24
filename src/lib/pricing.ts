/**
 * 料金の算出。要件定義書 3.4 / 6.2。
 *
 * 請求額を決めるのはこのモジュールだけである。確認画面から送られてきた
 * 請求額は一切信用せず、決済作成時にサーバ側で quote() を再実行する。
 */

export const MIN_AMOUNT = 100;
export const STEP = 100;
export const MAX_AMOUNT = 9_999_900;

export type Quote =
  | { ok: true; chargedAmount: number; targetAmount: number; isRaise: boolean }
  | { ok: false; reason: string };

/** カテゴリ内で1位を取るのに必要な額。掲載ゼロなら 100円。 */
export function priceForTop(categoryTop: number): number {
  return Math.max(categoryTop + STEP, MIN_AMOUNT);
}

/**
 * @param current 同一キーの既存掲載金額。新規なら null
 * @param target  利用者が設定した掲載金額
 */
export function quote(current: number | null, target: number): Quote {
  if (!Number.isInteger(target)) return { ok: false, reason: '金額が正しくありません' };
  if (target % STEP !== 0) return { ok: false, reason: '100円単位で入力してください' };
  if (target > MAX_AMOUNT) return { ok: false, reason: `上限は${MAX_AMOUNT.toLocaleString('ja-JP')}円です` };

  if (current === null) {
    if (target < MIN_AMOUNT) return { ok: false, reason: '100円から掲載できます' };
    return { ok: true, chargedAmount: target, targetAmount: target, isRaise: false };
  }

  if (target < current + STEP) {
    return {
      ok: false,
      reason:
        `この掲載は現在${current.toLocaleString('ja-JP')}円です。` +
        `${(current + STEP).toLocaleString('ja-JP')}円以上を設定してください`,
    };
  }

  return { ok: true, chargedAmount: target - current, targetAmount: target, isRaise: true };
}
