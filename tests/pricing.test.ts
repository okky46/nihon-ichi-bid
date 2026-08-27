import { describe, expect, it } from 'vitest';
import {
  MAX_AMOUNT,
  MIN_AMOUNT,
  STEP,
  priceForTop,
  quote,
} from '../src/lib/pricing';

describe('定数', () => {
  it('要件定義書 3.4 の値と一致する', () => {
    expect(MIN_AMOUNT).toBe(100);
    expect(STEP).toBe(100);
    expect(MAX_AMOUNT).toBe(9_999_900);
  });
});

describe('priceForTop', () => {
  it('掲載ゼロのカテゴリでは100円', () => {
    expect(priceForTop(0)).toBe(100);
  });

  it('カテゴリ最高額 + 100円', () => {
    expect(priceForTop(100)).toBe(200);
    expect(priceForTop(10_000)).toBe(10_100);
  });

  it('上限額の掲載があっても最高額 + 100円を返す（quote 側で弾く）', () => {
    expect(priceForTop(MAX_AMOUNT)).toBe(MAX_AMOUNT + STEP);
  });
});

describe('quote — 入力バリデーション', () => {
  it('整数でない金額を拒否する', () => {
    const q = quote(null, 150.5);
    expect(q.ok).toBe(false);
  });

  it('NaN を拒否する', () => {
    expect(quote(null, Number.NaN).ok).toBe(false);
  });

  it('100円単位でない金額を拒否する', () => {
    const q = quote(null, 150);
    expect(q).toMatchObject({ ok: false, reason: '100円単位で入力してください' });
  });

  it('上限を超える金額を拒否する', () => {
    const q = quote(null, MAX_AMOUNT + STEP);
    expect(q.ok).toBe(false);
    expect(q.ok === false && q.reason).toContain('9,999,900');
  });

  it('上限ちょうどは通る', () => {
    expect(quote(null, MAX_AMOUNT)).toMatchObject({ ok: true, chargedAmount: MAX_AMOUNT });
  });
});

describe('quote — 新規掲載', () => {
  it('最低額未満を拒否する', () => {
    expect(quote(null, 0)).toMatchObject({ ok: false, reason: '100円から掲載できます' });
    expect(quote(null, -100).ok).toBe(false);
  });

  it('設定額の全額を請求する', () => {
    expect(quote(null, 100)).toEqual({
      ok: true,
      chargedAmount: 100,
      targetAmount: 100,
      isRaise: false,
    });
    expect(quote(null, 10_100)).toEqual({
      ok: true,
      chargedAmount: 10_100,
      targetAmount: 10_100,
      isRaise: false,
    });
  });
});

describe('quote — 増額', () => {
  it('差額のみを請求する', () => {
    expect(quote(5_000, 10_100)).toEqual({
      ok: true,
      chargedAmount: 5_100,
      targetAmount: 10_100,
      isRaise: true,
    });
  });

  it('現在額 + 100円ちょうどは通る', () => {
    expect(quote(5_000, 5_100)).toMatchObject({ ok: true, chargedAmount: 100 });
  });

  it('現在額と同額を拒否する', () => {
    const q = quote(5_000, 5_000);
    expect(q.ok).toBe(false);
    expect(q.ok === false && q.reason).toContain('5,000円です');
    expect(q.ok === false && q.reason).toContain('5,100円以上');
  });

  it('減額を拒否する', () => {
    expect(quote(5_000, 4_900).ok).toBe(false);
  });

  it('増額でも上限は効く', () => {
    expect(quote(MAX_AMOUNT, MAX_AMOUNT + STEP).ok).toBe(false);
  });

  it('増額でも100円単位は効く', () => {
    expect(quote(5_000, 5_050)).toMatchObject({ ok: false, reason: '100円単位で入力してください' });
  });
});
