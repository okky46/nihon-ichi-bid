/** 表示用の整形。 */

export function yen(n: number): string {
  return `${n.toLocaleString('ja-JP')}円`;
}

export function num(n: number): string {
  return n.toLocaleString('ja-JP');
}

/** 掲載カードのメタ欄に出す相対時刻。 */
export function relativeTime(epochMs: number, now = Date.now()): string {
  const diff = Math.max(0, now - epochMs);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min}分前`;

  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;

  const day = Math.floor(hour / 24);
  if (day === 1) return '昨日';
  if (day < 7) return `${day}日前`;

  const week = Math.floor(day / 7);
  if (week < 5) return `${week}週間前`;

  const month = Math.floor(day / 30);
  if (month < 12) return `${month}か月前`;

  return `${Math.floor(day / 365)}年前`;
}
