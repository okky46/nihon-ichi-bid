import { describe, expect, it } from 'vitest';
import { normalizeUrl } from '../src/lib/url-normalize';

/** 成功前提で key を取り出す。 */
function key(input: string): string {
  const r = normalizeUrl(input);
  if (!r.ok) throw new Error(`expected ok for ${input}: ${r.reason}`);
  return r.key;
}

/** 成功前提で url を取り出す。 */
function url(input: string): string {
  const r = normalizeUrl(input);
  if (!r.ok) throw new Error(`expected ok for ${input}: ${r.reason}`);
  return r.url;
}

describe('基本正規化', () => {
  it('スキームがなければ https を補う', () => {
    expect(key('example.com/path')).toBe('example.com/path');
    expect(url('example.com/path')).toBe('https://example.com/path');
  });

  it('http は https に統一する', () => {
    expect(key('http://example.com/path')).toBe('example.com/path');
    expect(url('http://example.com/path')).toBe('https://example.com/path');
  });

  it('ホスト名を小文字化する', () => {
    expect(key('https://EXAMPLE.com/Path')).toBe('example.com/Path');
  });

  it('先頭の www. を除去する', () => {
    expect(key('https://www.example.com/path')).toBe('example.com/path');
  });

  it('クエリとフラグメントを全除去する', () => {
    expect(key('https://example.com/path?utm_source=x&a=1#frag')).toBe('example.com/path');
    expect(url('https://example.com/path?utm_source=x#frag')).toBe('https://example.com/path');
  });

  it('末尾スラッシュを除去する', () => {
    expect(key('https://example.com/path/')).toBe('example.com/path');
    expect(key('https://example.com/')).toBe('example.com');
    expect(key('https://example.com')).toBe('example.com');
  });

  it('パーセントエンコードを正規化する', () => {
    expect(key('https://example.com/%7Euser')).toBe(key('https://example.com/~user'));
    expect(key('https://example.com/a%2fb')).toBe(key('https://example.com/a%2Fb'));
    expect(key('https://example.com/日本')).toBe(key('https://example.com/%E6%97%A5%E6%9C%AC'));
  });

  it('前後の空白を無視する', () => {
    expect(key('  https://example.com/path  ')).toBe('example.com/path');
  });

  it('同じ対象を指す複数の表記が同一キーになる', () => {
    const forms = [
      'http://WWW.Example.com/path/?utm_campaign=a#x',
      'https://example.com/path',
      'example.com/path/',
    ];
    const keys = new Set(forms.map(key));
    expect(keys.size).toBe(1);
  });
});

describe('プラットフォーム別キー化', () => {
  it('X', () => {
    expect(key('https://x.com/foo')).toBe('x:foo');
    expect(key('https://twitter.com/foo')).toBe('x:foo');
    expect(key('https://www.twitter.com/Foo/')).toBe('x:foo');
    expect(key('https://mobile.twitter.com/foo')).toBe('x:foo');
    expect(url('https://twitter.com/foo')).toBe('https://x.com/foo');
  });

  it('YouTube ハンドル', () => {
    expect(key('https://youtube.com/@foo')).toBe('youtube:@foo');
    expect(key('https://www.youtube.com/@Foo/videos')).toBe('youtube:@foo');
    expect(url('https://youtube.com/@foo')).toBe('https://www.youtube.com/@foo');
  });

  it('YouTube チャンネルID（大文字小文字を保つ）', () => {
    expect(key('https://youtube.com/channel/UCxxx')).toBe('youtube:UCxxx');
    expect(url('https://youtube.com/channel/UCxxx')).toBe('https://www.youtube.com/channel/UCxxx');
  });

  it('note', () => {
    expect(key('https://note.com/foo')).toBe('note:foo');
    expect(key('https://note.com/foo/n/n123')).toBe('note:foo');
  });

  it('GitHub', () => {
    expect(key('https://github.com/owner/repo')).toBe('github:owner/repo');
    expect(key('https://github.com/Owner/Repo/')).toBe('github:owner/repo');
    expect(key('https://github.com/owner')).toBe('github:owner');
    expect(url('https://github.com/owner/repo')).toBe('https://github.com/owner/repo');
  });

  it('pixiv', () => {
    expect(key('https://pixiv.net/users/123')).toBe('pixiv:123');
    expect(key('https://www.pixiv.net/en/users/123')).toBe('pixiv:123');
  });

  it('BOOTH', () => {
    expect(key('https://foo.booth.pm')).toBe('booth:foo');
    expect(key('https://foo.booth.pm/items/123')).toBe('booth:foo');
    expect(url('https://foo.booth.pm/items/123')).toBe('https://foo.booth.pm');
  });

  it('ニコニコ', () => {
    expect(key('https://www.nicovideo.jp/user/123')).toBe('niconico:123');
  });

  it('TikTok', () => {
    expect(key('https://www.tiktok.com/@foo')).toBe('tiktok:@foo');
  });

  it('Instagram', () => {
    expect(key('https://instagram.com/foo')).toBe('instagram:foo');
    expect(key('https://www.instagram.com/Foo/')).toBe('instagram:foo');
  });

  it('App Store', () => {
    expect(key('https://apps.apple.com/jp/app/xxx/id123')).toBe('appstore:123');
    expect(key('https://apps.apple.com/us/app/yyy/id123?mt=8')).toBe('appstore:123');
    expect(url('https://apps.apple.com/jp/app/xxx/id123')).toBe('https://apps.apple.com/jp/app/id123');
  });

  it('Google Play は id クエリのみ保持する', () => {
    expect(key('https://play.google.com/store/apps/details?id=com.foo')).toBe('play:com.foo');
    expect(key('https://play.google.com/store/apps/details?id=com.foo&hl=ja&gl=JP')).toBe('play:com.foo');
    expect(url('https://play.google.com/store/apps/details?id=com.foo&hl=ja')).toBe(
      'https://play.google.com/store/apps/details?id=com.foo',
    );
  });

  it('その他はホスト + パス', () => {
    expect(key('https://example.com/path')).toBe('example.com/path');
  });

  it('プラットフォームのトップページ自体は通常URLとして扱う', () => {
    expect(key('https://x.com')).toBe('x.com');
    expect(key('https://github.com')).toBe('github.com');
  });

  it('プラットフォームの予約パスはハンドルにしない', () => {
    expect(normalizeUrl('https://x.com/home').ok).toBe(false);
    expect(normalizeUrl('https://x.com/i/flow/login').ok).toBe(false);
  });
});

describe('拒否するもの', () => {
  it('短縮URL', () => {
    for (const u of [
      'https://bit.ly/abc',
      'https://t.co/abc',
      'https://x.gd/abc',
      'https://is.gd/abc',
      'https://tinyurl.com/abc',
      'https://lnkd.in/abc',
    ]) {
      const r = normalizeUrl(u);
      expect(r.ok, u).toBe(false);
      expect(r.ok === false && r.reason).toContain('短縮URL');
    }
  });

  it('チャット招待リンク', () => {
    for (const u of [
      'https://discord.gg/abc',
      'https://discord.com/invite/abc',
      'https://line.me/ti/p/abc',
      'https://t.me/foo',
    ]) {
      expect(normalizeUrl(u).ok, u).toBe(false);
    }
  });

  it('IPアドレス直指定', () => {
    expect(normalizeUrl('https://192.168.0.1/').ok).toBe(false);
    expect(normalizeUrl('https://8.8.8.8/').ok).toBe(false);
    expect(normalizeUrl('https://[::1]/').ok).toBe(false);
  });

  it('localhost', () => {
    expect(normalizeUrl('https://localhost/').ok).toBe(false);
    expect(normalizeUrl('http://localhost:3000/').ok).toBe(false);
  });

  it('非標準ポート', () => {
    expect(normalizeUrl('https://example.com:8080/').ok).toBe(false);
    expect(normalizeUrl('https://example.com:443/').ok).toBe(true);
  });

  it('既知のアダルトドメイン', () => {
    expect(normalizeUrl('https://pornhub.com/foo').ok).toBe(false);
    expect(normalizeUrl('https://www.xvideos.com/foo').ok).toBe(false);
  });

  it('https 以外のスキーム', () => {
    for (const u of ['ftp://example.com', 'javascript:alert(1)', 'data:text/html,x', 'mailto:a@b.com']) {
      expect(normalizeUrl(u).ok, u).toBe(false);
    }
  });

  it('空文字・URLとして壊れている入力', () => {
    expect(normalizeUrl('').ok).toBe(false);
    expect(normalizeUrl('   ').ok).toBe(false);
    expect(normalizeUrl('https://').ok).toBe(false);
    expect(normalizeUrl('ただの文字列').ok).toBe(false);
  });

  it('TLD のないホスト', () => {
    expect(normalizeUrl('https://example/foo').ok).toBe(false);
  });
});

describe('key の性質', () => {
  it('key は常に非空でスキームを含まない', () => {
    for (const u of [
      'example.com',
      'https://x.com/foo',
      'https://github.com/a/b',
      'https://play.google.com/store/apps/details?id=com.foo',
    ]) {
      const k = key(u);
      expect(k.length).toBeGreaterThan(0);
      expect(k.startsWith('http')).toBe(false);
    }
  });

  it('url は常に https で始まりクエリを持たない（Google Play を除く）', () => {
    for (const u of ['example.com/a?b=1', 'https://x.com/foo', 'https://note.com/foo']) {
      const v = url(u);
      expect(v.startsWith('https://')).toBe(true);
      expect(v).not.toContain('?');
    }
  });
});
