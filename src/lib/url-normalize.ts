/**
 * URL の正規化とキー化。要件定義書 6.3。
 *
 * key は同一性判定の唯一の基準である。同じ対象が別掲載として重複すると
 * ランキングが破綻するため、表記のゆれはすべてここで吸収する。
 */

export type NormalizeResult =
  | { ok: true; key: string; url: string }
  | { ok: false; reason: string };

/** 短縮URL。展開後のURLを入力してもらう（自動展開はしない）。 */
const SHORTENERS = new Set([
  'bit.ly', 't.co', 'x.gd', 'is.gd', 'tinyurl.com', 'lnkd.in',
  'goo.gl', 'ow.ly', 'buff.ly', 'amzn.to', 'cutt.ly', 'rb.gy',
  'shorturl.at', 't.ly', 'bit.do', 'v.gd', 'ur0.jp', 'urx.blue',
]);

/** チャット招待リンク。掲載対象になりえない。 */
const CHAT_HOSTS = new Set(['discord.gg', 'lin.ee', 't.me', 'telegram.me', 'chat.whatsapp.com']);
const CHAT_PATHS: Array<[string, string]> = [
  ['discord.com', 'invite'],
  ['discordapp.com', 'invite'],
  ['line.me', 'ti'],
];

/** 既知のアダルトドメイン。決済事業者の禁止業種にあたる。 */
const ADULT_HOSTS = new Set([
  'pornhub.com', 'xvideos.com', 'xhamster.com', 'xnxx.com',
  'redtube.com', 'youporn.com', 'fanza.com', 'javdb.com',
]);

const X_HOSTS = new Set(['x.com', 'twitter.com', 'mobile.twitter.com', 'mobile.x.com']);
const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com']);

const X_RESERVED = new Set([
  'home', 'i', 'explore', 'notifications', 'messages', 'search', 'settings',
  'login', 'signup', 'intent', 'share', 'compose', 'hashtag', 'about',
  'tos', 'privacy', 'download',
]);
const GITHUB_RESERVED = new Set([
  'features', 'pricing', 'about', 'login', 'signup', 'settings', 'marketplace',
  'explore', 'topics', 'sponsors', 'orgs', 'organizations', 'notifications',
  'new', 'collections', 'events', 'trending', 'apps', 'security', 'enterprise',
  'contact', 'site', 'join', 'search', 'codespaces', 'issues', 'pulls', 'dashboard',
]);
const INSTAGRAM_RESERVED = new Set(['p', 'reel', 'reels', 'explore', 'stories', 'accounts', 'direct']);

const HOSTNAME_RE = /^([a-z0-9-]+\.)+[a-z]{2,}$/;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const LOCALE_RE = /^[a-z]{2}(-[a-z]{2})?$/;

/**
 * パスセグメントのパーセントエンコードを正規化する。
 * 非予約文字は素の文字へ、それ以外は大文字16進の %XX へ揃える。
 */
function normSegment(seg: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(seg);
  } catch {
    decoded = seg;
  }
  // encodeURIComponent は pchar として合法な sub-delims と ':' '@' も
  // 落としてしまうので戻す。key の見た目を URL に近く保つため。
  return encodeURIComponent(decoded).replace(
    /%(21|24|26|27|28|29|2A|2B|2C|3A|3B|3D|40)/g,
    (_, hex: string) => String.fromCharCode(parseInt(hex, 16)),
  );
}

function decodeSegment(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

const reject = (reason: string): NormalizeResult => ({ ok: false, reason });

export function normalizeUrl(input: string): NormalizeResult {
  const raw = (input ?? '').trim();
  if (!raw) return reject('URLを入力してください');

  // 1. スキームの補完と統一
  let candidate: string;
  if (/^https?:\/\//i.test(raw)) {
    candidate = raw;
  } else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    return reject('httpsのURLを入力してください');
  } else if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !raw.slice(0, raw.indexOf(':')).includes('.')) {
    return reject('httpsのURLを入力してください');
  } else {
    candidate = `https://${raw}`;
  }

  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    return reject('URLの形式が正しくありません');
  }
  u.protocol = 'https:';

  // 2. ホスト名の正規化
  const hostname = u.hostname.toLowerCase();
  const host = hostname.startsWith('www.') ? hostname.slice(4) : hostname;

  if (host === 'localhost' || host.endsWith('.localhost')) return reject('このURLは掲載できません');
  if (host.startsWith('[') || IPV4_RE.test(host)) return reject('IPアドレスでは掲載できません');
  if (!HOSTNAME_RE.test(host)) return reject('URLの形式が正しくありません');
  if (u.port) return reject('このURLは掲載できません');

  if (SHORTENERS.has(host)) {
    return reject('短縮URLは掲載できません。展開後のURLを入力してください');
  }
  if (ADULT_HOSTS.has(host)) return reject('このURLは掲載できません');

  // 3/4/5. クエリとフラグメントの除去、末尾スラッシュの除去、エンコードの正規化
  const rawSegments = u.pathname.split('/').filter((s) => s.length > 0);
  const segs = rawSegments.map(decodeSegment);
  const encSegs = rawSegments.map(normSegment);
  const path = encSegs.length ? `/${encSegs.join('/')}` : '';

  if (CHAT_HOSTS.has(host)) return reject('チャットの招待リンクは掲載できません');
  for (const [chatHost, first] of CHAT_PATHS) {
    if (host === chatHost && segs[0] === first) return reject('チャットの招待リンクは掲載できません');
  }

  const generic = (): NormalizeResult => ({ ok: true, key: `${host}${path}`, url: `https://${host}${path}` });
  const platform = (key: string, url: string): NormalizeResult => ({ ok: true, key, url });

  // X
  if (X_HOSTS.has(host) && segs.length > 0) {
    const handle = segs[0]!.replace(/^@/, '').toLowerCase();
    if (X_RESERVED.has(handle) || !handle) {
      return reject('アカウントのURLを入力してください');
    }
    return platform(`x:${handle}`, `https://x.com/${handle}`);
  }

  // YouTube
  if (YOUTUBE_HOSTS.has(host) && segs.length > 0) {
    if (segs[0]!.startsWith('@')) {
      const handle = segs[0]!.toLowerCase();
      return platform(`youtube:${handle}`, `https://www.youtube.com/${handle}`);
    }
    if (segs[0] === 'channel' && segs[1]) {
      // チャンネルIDは大文字小文字を区別する
      return platform(`youtube:${segs[1]}`, `https://www.youtube.com/channel/${segs[1]}`);
    }
  }

  // note
  if (host === 'note.com' && segs[0]) {
    const user = segs[0].toLowerCase();
    return platform(`note:${user}`, `https://note.com/${user}`);
  }

  // GitHub
  if (host === 'github.com' && segs[0] && !GITHUB_RESERVED.has(segs[0].toLowerCase())) {
    const owner = segs[0].toLowerCase();
    const repo = segs[1]?.toLowerCase();
    const tail = repo ? `${owner}/${repo}` : owner;
    return platform(`github:${tail}`, `https://github.com/${tail}`);
  }

  // pixiv
  if (host === 'pixiv.net') {
    const p = segs[0] && LOCALE_RE.test(segs[0]) ? segs.slice(1) : segs;
    if (p[0] === 'users' && p[1]) {
      return platform(`pixiv:${p[1]}`, `https://www.pixiv.net/users/${p[1]}`);
    }
  }

  // BOOTH
  if (host.endsWith('.booth.pm')) {
    const sub = host.slice(0, -'.booth.pm'.length);
    if (sub && !sub.includes('.') && sub !== 'accounts' && sub !== 'manage') {
      return platform(`booth:${sub}`, `https://${sub}.booth.pm`);
    }
  }

  // ニコニコ
  if (host === 'nicovideo.jp' && segs[0] === 'user' && segs[1]) {
    return platform(`niconico:${segs[1]}`, `https://www.nicovideo.jp/user/${segs[1]}`);
  }

  // TikTok
  if (host === 'tiktok.com' && segs[0]?.startsWith('@')) {
    const handle = segs[0].toLowerCase();
    return platform(`tiktok:${handle}`, `https://www.tiktok.com/${handle}`);
  }

  // Instagram
  if (host === 'instagram.com' && segs[0] && !INSTAGRAM_RESERVED.has(segs[0].toLowerCase())) {
    const user = segs[0].toLowerCase();
    return platform(`instagram:${user}`, `https://www.instagram.com/${user}`);
  }

  // App Store
  if (host === 'apps.apple.com' || host === 'itunes.apple.com') {
    const idSeg = segs.find((s) => /^id\d+$/.test(s));
    if (idSeg) {
      const id = idSeg.slice(2);
      const locale = segs[0] && LOCALE_RE.test(segs[0]) ? segs[0] : 'jp';
      return platform(`appstore:${id}`, `https://apps.apple.com/${locale}/app/id${id}`);
    }
  }

  // Google Play — クエリ全除去の唯一の例外として id を保持する
  if (host === 'play.google.com' && segs[0] === 'store' && segs[1] === 'apps' && segs[2] === 'details') {
    const id = u.searchParams.get('id');
    if (id) {
      return platform(`play:${id}`, `https://play.google.com/store/apps/details?id=${encodeURIComponent(id)}`);
    }
  }

  return generic();
}
