# 買える日本一（nihon-ichi.com）要件定義書

本書がこのプロダクトの仕様の唯一の出典である。設計判断に迷った場合は本書を参照する。

---

## 1. サービス概要

日本のインターネット上にあるものを、支払った金額の順に並べる公開ランキングボード。

100円から掲載でき、金額を上げると順位が上がる。支払った掲載は順位にかかわらず必ず掲載される。賞金・景品・抽選は一切ない。

掲載対象は限定しない。個人、個人開発者、Webサービス、アプリ、Xアカウント、YouTubeチャンネル、VTuber、ブログ、店、会社、ブランド、作品、コミュニティ、イベントなど、日本のネット上にあるものなら何でも掲載できる。

### 中核となる体験

```
ランキングを見る → 載せたいものを登録する → 払う → 順位が変わる
```

これだけである。機能を追加する判断は、この体験に必要かどうかで行う。

### 販売しているもの

ランキングボード上の**有料掲載枠**である。広告掲載であり、くじでも懸賞でもオークションでもない。

---

## 2. 用語と表記ルール

サイト上の文言、規約、決済事業者への説明のすべてで、以下の語彙を統一して使う。場所ごとに言い換えない。

| 使う | 使わない |
|---|---|
| 掲載する / 金額を上げる / 1位を取る | 入札する / 落札する / オークション |
| 掲載金額 | 入札額 |
| 掲載枠 | 権利 / チケット |
| ランキング / 部門 | 大会 / コンテスト |

「入札」「オークション」を避けるのは、決済事業者の禁止業種であるペニーオークションとの誤認を防ぐためである。本サービスは支払いに対して掲載を確実に提供するため該当しないが、語選びによる誤認には実害がある。

### サービス定義文

以下の文をサイト説明、規約、決済事業者への申請、OGP で共通して使う。

> 日本のインターネット上にあるものを、支払った金額の順に並べる公開ランキングボード。100円から掲載でき、金額を上げると順位が上がる。支払った掲載は順位にかかわらず必ず掲載される。賞金・景品・抽選は一切ない。

---

## 3. 機能要件

### 3.1 ランキング

- 各掲載は「現在の掲載金額」を持ち、その降順で並ぶ
- 同額の場合は先に掲載されたほうが上位
- 累計課金額、月間、年間、歴代といった別指標は持たない
- 時間経過による減衰はない。金額は自分が上げるか他人に抜かれるまで保持される
- 1ページ50件

### 3.2 カテゴリ

掲載は必ず1つのカテゴリに属する。カテゴリはDBに**スラッグ**で保存する。表示名を変更しても移行が発生しないようにするためである。

| スラッグ | 表示名 | 含むもの |
|---|---|---|
| `person` | 個人・開発者 | 個人アカウント、個人開発者、ブロガー |
| `vtuber` | VTuber・配信者 | VTuber、ストリーマー、YouTuber |
| `web` | Webサイト・サービス | SaaS、ツール、ブログ、メディア |
| `app` | アプリ | スマホ・デスクトップアプリ |
| `game` | ゲーム | 個人制作からコンシューマまで |
| `work` | 創作・作品 | 漫画、音楽、小説、イラスト、同人 |
| `shop` | 店・施設 | 飲食店、小売、施設 |
| `company` | 企業・ブランド | 会社、ブランド、製品 |
| `community` | コミュニティ・イベント | Discord、サークル、勉強会、即売会 |
| `other` | その他 | |

`all`（すべて）は表示上の擬似カテゴリであり、DBには保存しない。

カテゴリ定義は `src/lib/categories.ts` を唯一の定義元とし、チップ・セレクト・バリデーション・OGP がすべてここを参照する。

**粒度の原則は、後から統合はできるが分割はできない。** 迷ったら細かく切る。

#### カテゴリ内順位

**順位はカテゴリ内で振り直す。** ゲームで絞ればゲーム内の1位・2位・3位が並ぶ。

これにより、掲載がまだ無いカテゴリでは100円で1位を取れる。これがこのサービスの最も強い入口である。

`all` 表示のときだけ全体順位になる。

#### カテゴリの推測

確認画面のカテゴリ初期選択に使う。あくまで初期値であり、利用者が変更できる。

| パターン | 推測 |
|---|---|
| `youtube.com/@` `twitch.tv/` | `vtuber` |
| `apps.apple.com` `play.google.com` | `app` |
| `store.steampowered.com` `*.itch.io` | `game` |
| `booth.pm` `pixiv.net` | `work` |
| `github.com/` | `person` |
| 上記以外 | `web` |

### 3.3 掲載フロー

アカウント登録は行わない。ログイン機構を持たない。

```
トップ / カテゴリページ
  URLを入力・カテゴリを選択・金額を見出しのステッパーで決める
        ↓
確認画面
  表示名と説明が自動入力された状態で表示される（編集可能）
  請求額が表示される
        ↓
決済
        ↓
ランキングに反映
```

確認画面までDBに一切書き込まない。決済が完了して初めて掲載が作られる。

### 3.4 料金

| 項目 | 値 |
|---|---|
| 最低掲載金額 | 100円 |
| 金額の単位 | 100円 |
| 上限 | 9,999,900円 |
| 新規掲載 | 設定額の全額を支払う |
| 増額 | **差額のみ**を支払う |
| 増額の条件 | 現在の自分の金額 + 100円以上 |
| カテゴリ内1位を取る額 | そのカテゴリの最高額 + 100円（掲載ゼロなら100円） |

差額課金により、既存掲載者ほど上位維持のコストが安くなる。5,000円で載っている掲載が10,000円の1位を抜くには5,100円で済むが、新規参入者は10,100円を全額払う必要がある。

**順位は保証しない。** 決済完了までに他の掲載額が変わりうるため、確定するのは金額のみであり、順位は決済完了時点の状況から決まる。

### 3.5 訪問者・掲載件数の表示

ページ上部に3項目を表示する。

| 表示 | 定義 |
|---|---|
| ◯人が閲覧中 | 直近1時間のユニークセッション数 |
| 累計◯人 | 累計ユニークセッション数 |
| 掲載◯件 | 掲載件数（実数） |

**数字を実測より大きく見せる処理は入れない。** 景品表示法の有利誤認にあたる可能性があり、決済事業者の審査でもサイト上の主張と実態の整合性が見られる。掲載者が実際の閲覧数を気にするサービスであるため、露見したときの損害も大きい。

集計窓を1時間に取ることは定義の選択であって誇張ではない。

### 3.6 管理

管理者が以下を行える。

- 掲載一覧の閲覧（状態を問わず全件、新しい順）
- 掲載の非表示・削除
- カテゴリの修正
- 金額の修正（返金対応時のみ)

削除の対象は、違法なコンテンツ、なりすまし、明確な詐欺、権利侵害、成人向け等の決済事業者上問題になるコンテンツ、その他運営上不適切と判断したもの。

大規模なモデレーションシステムは作らない。削除依頼は問い合わせメール経由の手動運用とする。

### 3.7 スコープ外

以下は作らない。

期間別ランキング（月間・年間・歴代）、累計課金額ランキング、いいね、コメント、フォロー、DM、SNS機能、プロフィールページ、バッジ、レベル、ポイント、ゲーミフィケーション、お気に入り、分析ダッシュボード、複雑な検索、レコメンド、AI機能、ランキングの定期リセット、クリック数の表示、収益カウンター。

---

## 4. 画面仕様

### 4.1 デザイントークン

```css
:root{
  --bg:#FAF8F5;           /* 温かいオフホワイト */
  --surface:#FFFFFF;
  --ink:#1A1A1A;
  --muted:#8C8A87;
  --line:#EBE7E2;
  --line-strong:#E2DDD6;
  --coral:#E9654C;        /* アクセント。金額とアクティブ状態 */
  --coral-btn:#F6B3A3;    /* ボタン地。hover で --coral */
  --coral-1:#FADCD1;      /* 1位カード地 */
  --coral-2:#FCEDE7;      /* 2位カード地 */
  --coral-3:#FDF6F2;      /* 3位カード地 */
  --chip:#F1EEE9;
  --green:#22A55B;        /* 閲覧中インジケータのみ */
  --gold:#C0951A;
  --silver:#8B9299;
  --bronze:#AC6E33;
  --r-card:26px;
}
```

金銀銅は**順位バッジのみ**に使う。カードの地色はコーラルの濃淡とする。

金額の文字色は全順位でコーラルに統一する。上位3件だけ金銀銅にすると4位以降との間に断絶ができ、金額の比較がしづらくなるためである。

緑は閲覧中インジケータの点にのみ使う。それ以外に寒色は使わない。

### 4.2 ブランド

| 項目 | 値 |
|---|---|
| サービス名 | 買える日本一 |
| ドメイン | nihon-ichi.com |
| タグライン | 100円から。金額の順に並ぶ、日本のインターネットのランキング |

#### ロゴタイプ

「買える」と「日本一」を**同じ級数・同じ太さ**（22px / weight 700）で組み、「買える」のみ `--coral`、「日本一」は `--ink` とする。

差別化しているのは「買える」であり、「日本一」は一般名詞である。強調は前半に置く。コーラルはサイト全体で金額とアクティブ状態に使う色なので、ロゴがそのまま配色の凡例として機能する。

#### ロゴマーク

降順の横棒3本。最上段が最も長く `--coral`、2段目が `--ink`、3段目が `#C8C4BE`。左揃え。

```svg
<svg viewBox="0 0 24 24">
  <rect x="2" y="4.5"  width="20"   height="3.6" rx="1.8" fill="#E9654C"/>
  <rect x="2" y="10.2" width="13.5" height="3.6" rx="1.8" fill="#1A1A1A"/>
  <rect x="2" y="15.9" width="7.5"  height="3.6" rx="1.8" fill="#C8C4BE"/>
</svg>
```

これはランキングそのものの縮図である。金額の降順で並ぶ一覧の構造と、最上段だけがコーラルである点が、実際の1位カードだけがコーラルの枠を持つことと一致する。横棒である以上、最上段は漢字の「一」でもある。

ヘッダーでは26px、ロゴタイプとの間隔は10px。

#### ファビコン

ロゴマークと同一図案。背景は `--bg`（#FAF8F5）、バーの余白をやや広げて16pxでも潰れないようにする。

```svg
<svg viewBox="0 0 24 24">
  <rect width="24" height="24" fill="#FAF8F5"/>
  <rect x="3" y="5.5"  width="18" height="3.4" rx="1.7" fill="#E9654C"/>
  <rect x="3" y="10.8" width="12" height="3.4" rx="1.7" fill="#1A1A1A"/>
  <rect x="3" y="16.1" width="6.5" height="3.4" rx="1.7" fill="#C8C4BE"/>
</svg>
```

### 4.3 書体

| 用途 | 書体 |
|---|---|
| 和文 | M PLUS 2 |
| 欧文・数字 | Outfit |

数字、`#1` などのラテン文字部分には `.lat` クラスを当てて Outfit に切り替える。和文と数字を同じ書体で組むと、金額の桁が揃わず比較しづらくなる。

Google Fonts から読み込む。両者とも幾何学的な骨格を持つため、和欧混植が破綻しない。

### 4.4 寸法

| 要素 | 値 |
|---|---|
| コンテナ | max-width 1040px / padding 0 24px |
| 見出し | 58px / weight 700 |
| 掲載名 | 21px / weight 700 |
| 金額 | 22px / weight 700 |
| 説明 | 17px / line-height 1.55 / **2行でクランプ** |
| メタ | 15px |
| 本文既定 | 17px |
| 入力・ボタン | 高さ64px / border-radius 999px |
| カード | padding 24px 28px / radius 26px |
| アイコン | 上位3件 64px（radius 16px）、4位以降 56px（radius 14px） |
| 統計ピル | padding 11px 26px / radius 999px / 15px |
| カテゴリチップ | padding 10px 18px / radius 999px / 16px |

説明文は自動取得により長さがまちまちになるため、2行クランプで省略記号を出す。

### 4.5 トップページの構成

```
ヘッダー
  ロゴマーク＋「買える日本一」（左） / ランキング・ルール・問い合わせ（右）
統計ピル
  ● 142人が閲覧中 · 累計 128,470人 · 掲載 1,199件
見出し
  1位を取るなら  −  10,100円  ＋
補足文
  掲載は100円から。1位の金額を下回っても、その金額で入れる順位にそのまま掲載されます。
フォーム
  [ URL または @ハンドル ] [ カテゴリ ▾ ] [ 掲載する ]
補足文
  すでに掲載されている場合は、同じURLを入力すると金額を上げられます。
カテゴリチップ（横スクロール）
  すべて / 個人・開発者 / VTuber・配信者 / …
上位3件
  カード形式。金銀銅バッジ。地色はコーラル濃淡
最新の動き
  すべて表示のときのみ、3位と4位の間に挿入
4位以降
  罫線区切りの行。順位はグレーの文字
ページネーション / 件数 / 更新ボタン
フッター
  免責文 + 法務リンク
```

### 4.6 インタラクション

**金額のステッパー。** 見出しの `−` `＋` で100円ずつ増減する。下限は100円。この金額がそのまま掲載金額になる。

**カテゴリチップ。** 押すと以下が同時に切り替わる。

- ランキングの内容（そのカテゴリのみ）
- 順位番号（カテゴリ内で1から振り直し）
- 見出しの文言（「ゲームで1位を取るなら」）
- 見出しの金額（そのカテゴリの1位 + 100円）
- フォームのカテゴリ選択

**フォームのカテゴリ選択**を変更した場合も、チップとランキングが連動する。

**空カテゴリ。** 掲載が1件もないカテゴリでは、一覧の代わりに以下を表示する。

> このカテゴリにはまだ何も掲載されていません。
> いま掲載すれば **100円** で「ゲーム」の1位です。

破線の枠で囲み、100円をコーラルで強調する。

**最新の動き**は `all` 表示のときだけ出す。カテゴリで絞ったときに全体の動きが混ざると部門の話でなくなり、かといってカテゴリ内に限ると掲載数の少ないカテゴリで空になるためである。

### 4.7 レスポンシブ

| 幅 | 変更点 |
|---|---|
| 820px以下 | 本文16px、見出し38px、フォームを縦積み（各要素とも幅100%・高さ58px）、カード padding 20px・radius 22px、掲載名と金額を縦に並べる |
| 560px以下 | 見出し30px、ヘッダーの「ルール」を非表示 |

カテゴリチップと最新の動きは全幅で横スクロールする。

### 4.8 状態

- ボタン hover は `--coral-btn` から `--coral` へ 0.15s
- チップ hover は枠線と文字色のみ変化
- フォーカスリングは `2px solid var(--coral)` / offset 3px
- `prefers-reduced-motion: reduce` ではすべてのトランジションを無効化

### 4.9 ページ構成

| パス | 内容 |
|---|---|
| `/` | すべて・1ページ目 |
| `/?p=2` | すべて・2ページ目以降 |
| `/c/:slug` | カテゴリ別 |
| `/c/:slug?p=2` | カテゴリ別・2ページ目以降 |
| `/confirm` | 確認画面 |
| `/thanks` | 決済完了 |
| `/rules` | ルール |
| `/terms` `/privacy` `/tokushoho` `/contact` | 法務 |
| `/admin` | 管理画面 |

カテゴリをパスにすることで、カテゴリごとに固有の `<title>` と OGP を持てる。「ゲーム 日本一」での検索流入は掲載者への提供価値に直結する。

`<title>` は `ゲーム部門 — 買える日本一` の形式とする。

---

## 5. データモデル

```sql
CREATE TABLE listings (
  key           TEXT PRIMARY KEY,               -- 正規化キー。同一性判定の唯一の基準
  url           TEXT NOT NULL,                  -- 遷移先（クエリ除去済み）
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL DEFAULT 'other',
  amount        INTEGER NOT NULL,               -- 現在の掲載金額（円）
  status        TEXT NOT NULL DEFAULT 'active', -- active | hidden | removed
  owner_email   TEXT,                           -- 削除依頼時の本人照合用
  first_paid_at INTEGER NOT NULL,               -- 同額時の先着判定（epoch ms）
  updated_at    INTEGER NOT NULL
);

CREATE INDEX idx_rank_cat ON listings(category, amount DESC, first_paid_at ASC)
  WHERE status = 'active';
CREATE INDEX idx_rank_all ON listings(amount DESC, first_paid_at ASC)
  WHERE status = 'active';

CREATE TABLE payments (
  provider_event_id TEXT PRIMARY KEY,           -- 冪等性キー
  provider          TEXT NOT NULL,
  listing_key       TEXT NOT NULL,
  charged_amount    INTEGER NOT NULL,           -- 実際に請求した額（差額）
  target_amount     INTEGER NOT NULL,           -- 反映後の掲載金額
  created_at        INTEGER NOT NULL
);
CREATE INDEX idx_payments_recent ON payments(created_at DESC);

CREATE TABLE sessions (
  id      TEXT PRIMARY KEY,
  seen_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_seen ON sessions(seen_at);

CREATE TABLE counters (
  key TEXT PRIMARY KEY,
  n   INTEGER NOT NULL
);
INSERT INTO counters(key, n) VALUES ('visitors_archived', 0);
```

### 制約

- 順位カラムは持たない。並び順から算出する
- `amount` は単調増加のみ。減額する経路を作らない
- `first_paid_at` は既存掲載の更新時に変更しない
- `payments` は監査と「最新の動き」にのみ使い、ランキング計算には一切使わない

---

## 6. 処理仕様

### 6.1 順位の算出

```sql
SELECT key, url, title, description, amount, category, first_paid_at
FROM listings
WHERE status = 'active' AND (?1 = 'all' OR category = ?1)
ORDER BY amount DESC, first_paid_at ASC
LIMIT 50 OFFSET ?2;
```

**順位 = OFFSET + 行番号 + 1。** 別途 COUNT クエリを回す必要はない。

同額でも `first_paid_at` により順序が確定するため、順位番号は必ず別々に振られる。

カテゴリ内1位の金額は同じクエリの `LIMIT 1` で取る。該当なしなら 0 を返し、1位を取る額は 100円になる。

### 6.2 料金の算出

```ts
export const MIN_AMOUNT = 100;
export const STEP       = 100;
export const MAX_AMOUNT = 9_999_900;

/** カテゴリ内で1位を取るのに必要な額 */
export function priceForTop(categoryTop: number): number {
  return Math.max(categoryTop + STEP, MIN_AMOUNT);
}

/**
 * @param current 同一キーの既存掲載金額。新規なら null
 * @param target  利用者が設定した掲載金額
 */
export function quote(current: number | null, target: number): Quote {
  if (!Number.isInteger(target))  return { ok:false, reason:'金額が正しくありません' };
  if (target % STEP !== 0)        return { ok:false, reason:'100円単位で入力してください' };
  if (target > MAX_AMOUNT)        return { ok:false, reason:`上限は${MAX_AMOUNT.toLocaleString()}円です` };

  if (current === null) {
    if (target < MIN_AMOUNT)      return { ok:false, reason:'100円から掲載できます' };
    return { ok:true, chargedAmount: target, targetAmount: target, isRaise:false };
  }
  if (target < current + STEP) {
    return { ok:false, reason:`この掲載は現在${current.toLocaleString()}円です。${(current+STEP).toLocaleString()}円以上を設定してください` };
  }
  return { ok:true, chargedAmount: target - current, targetAmount: target, isRaise:true };
}
```

### 6.3 URL正規化

同じ対象が別掲載として重複するとサービスが破綻する。ここは単体テストを厚く書く。

**基本正規化**

1. スキームがなければ `https://` を補い、`http://` は `https://` に統一
2. ホスト名を小文字化、先頭の `www.` を除去
3. クエリ文字列とフラグメントを全除去（後述の例外を除く）
4. 末尾スラッシュを除去
5. パーセントエンコードを正規化

**プラットフォーム別キー化**

| 対象 | 入力例 | key |
|---|---|---|
| X | `x.com/foo` `twitter.com/foo` | `x:foo` |
| YouTube | `youtube.com/@foo` | `youtube:@foo` |
| YouTube | `youtube.com/channel/UCxxx` | `youtube:UCxxx` |
| note | `note.com/foo` | `note:foo` |
| GitHub | `github.com/owner/repo` | `github:owner/repo` |
| pixiv | `pixiv.net/users/123` | `pixiv:123` |
| BOOTH | `foo.booth.pm` | `booth:foo` |
| ニコニコ | `nicovideo.jp/user/123` | `niconico:123` |
| TikTok | `tiktok.com/@foo` | `tiktok:@foo` |
| Instagram | `instagram.com/foo` | `instagram:foo` |
| App Store | `apps.apple.com/jp/app/xxx/id123` | `appstore:123` |
| Google Play | `play.google.com/store/apps/details?id=com.foo` | `play:com.foo` |
| その他 | `example.com/path` | `example.com/path` |

Google Play のみ、クエリ全除去の例外として `id` を保持する。

**拒否するもの**

- 短縮URL（`bit.ly` `t.co` `x.gd` `is.gd` `tinyurl.com` `lnkd.in` 等）→ 展開後のURLを入力するよう促す
- チャット招待リンク（`discord.gg` `line.me/ti` `t.me` 等）
- IPアドレス直指定、`localhost`、非標準ポート
- 既知のアダルトドメイン

短縮URLの自動展開は行わない。外部fetchのタイムアウトとリダイレクトループのリスクがあるため、拒否して利用者に展開させる。

**掲載リンクの属性**

```html
<a href={url} rel="sponsored nofollow noopener" target="_blank">
```

`rel="sponsored"` は必須。有料掲載リンクであり、付けないと検索エンジンのリンクスパムポリシー違反となりサイト全体の評価が落ちる。

### 6.4 メタ情報の自動取得

Cloudflare 組み込みの **HTMLRewriter** を使う。外部ライブラリ不要。

| 項目 | 取得順 |
|---|---|
| 表示名 | `og:site_name` → `og:title` → `<title>` → ホスト名 |
| 説明 | `og:description` → `meta[name=description]` → 空 |

**要件**

- フォーム送信時にのみ実行する。一覧の描画では外部fetchを行わない
- `</head>` に到達した時点でストリームを中断する
- タイムアウト4秒、リダイレクトは3回まで、レスポンス上限512KB
- 失敗しても処理を止めない。空欄のまま確認画面を出し、手入力してもらう

**SSRF対策**

- `https:` のみ許可
- プライベートIP帯（10/8、172.16/12、192.168/16、127/8、169.254/16）と `localhost` を拒否
- 非標準ポートを拒否
- リダイレクト先も同じ検査を通す

X・YouTube・Instagram は認証なしで og が返らないことが多い。失敗を前提に設計する。

### 6.5 確認画面のサーバ側再検証

確認画面のフォームは利用者が編集できるため、決済作成時に**すべて再検証する**。

- URLを再正規化してキーを再生成する。クライアントが送ってきたキーを信用しない
- カテゴリが定義済みスラッグに存在するか検証する
- `quote()` をDBの現在値に対して再実行し、**請求額はサーバ側で算出した値のみを使う**
- 表示名は40字、説明は120字に切り詰め、HTMLエスケープする

クライアントが送った請求額をそのまま使うと、100円で1位を買われる。

### 6.6 訪問者計測

**HTMLに `Set-Cookie` を載せない。** Cookie付きレスポンスは共有キャッシュに乗せられず、もし乗ればセッションIDが他人に配られる。

```
1. HTMLは誰に対しても同一（完全にキャッシュ可能）
2. ページ読み込み後、JSが fetch('/api/ping') を1回叩く
3. /api/ping がCookieを確認
   ・なければ乱数IDを発行 → sessions に1行 INSERT → Cookieを1時間で設定
   ・あれば何もしない
4. 表示値は SELECT COUNT(*) FROM sessions WHERE seen_at > now - 3600
5. 毎日Cronで1時間より古い行を削除し、削除件数を counters に加算
```

ビーコンに分離することで、JSを実行しないクローラが自動的に計測から外れる。UAによるbot除外リストが不要になる。

**累計訪問者数**

```
表示値 = counters['visitors_archived'] + COUNT(*) FROM sessions
```

Cronの削除時に削除件数を `visitors_archived` へ加算する。書き込みは1日1回しか増えない。

---

## 7. 決済

### 7.1 抽象化

決済事業者を後から差し替えられる構造にする。

```ts
export interface CheckoutInput {
  listingKey: string;
  chargedAmount: number;   // サーバ側で算出した値
  targetAmount: number;
  category: string;
  title: string;
  url: string;
  description?: string;
}

export interface PaymentProvider {
  createCheckout(input: CheckoutInput): Promise<{ redirectUrl: string }>;
  verifyWebhook(req: Request): Promise<WebhookResult>;
}
```

`src/payments/stripe.ts` だけが Stripe を import する。上位のページとAPIルートは `PaymentProvider` 型しか知らない。

### 7.2 反映フロー

```
POST /api/checkout
  正規化 → 既存判定 → quote() → metadata に listingKey / targetAmount / category を格納
        ↓
Checkout へリダイレクト（日本円・単発決済）
        ↓
webhook: checkout.session.completed
  署名検証 → payments に INSERT（PK重複なら即200を返して終了）
  → listings を条件付きUPSERT
        ↓
/thanks
```

### 7.3 冪等性と競合

```sql
INSERT OR IGNORE INTO payments (...) VALUES (...);

INSERT INTO listings (key,url,title,description,category,amount,owner_email,first_paid_at,updated_at)
VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?8)
ON CONFLICT(key) DO UPDATE SET
  amount      = excluded.amount,
  title       = excluded.title,
  description = excluded.description,
  category    = excluded.category,
  updated_at  = excluded.updated_at
WHERE excluded.amount > listings.amount;
```

`WHERE excluded.amount > listings.amount` により、webhookが逆順に届いても金額が下がらない。

### 7.4 Cloudflare Workers 固有の注意

同期版 `constructEvent` は Workers で動かない。必ず `constructEventAsync` を使う。

```ts
const event = await stripe.webhooks.constructEventAsync(
  await req.text(),
  req.headers.get('stripe-signature')!,
  env.STRIPE_WEBHOOK_SECRET,
  undefined,
  Stripe.createSubtleCryptoProvider()
);
```

---

## 8. 非機能要件

### 8.1 無料運用

固定費はドメイン代のみとする。1日10万リクエストを超えた場合のみ有料プラン（月$5）へ移行する。

| 制約 | 対処 |
|---|---|
| D1 書込 10万行/日 | PVごとに書かない。セッション初回のみ書く。累計は1日1回のみ加算 |
| D1 読取 500万行/日 | 一覧をエッジキャッシュする |
| Workers CPU 10ms | メタ取得は `</head>` で打ち切る |
| KV 書込 1000/日 | 使用しない |

### 8.2 キャッシュ

```
1ページ目：Cache-Control: public, s-maxage=10, stale-while-revalidate=60
2ページ目以降：s-maxage=30
```

無キャッシュで10万PV/日を捌くとD1読取が約500万行に達し上限に張り付く。10秒キャッシュで実質1万行以下に落ちる。

`stale-while-revalidate` により、キャッシュ失効の瞬間にアクセスが集中する問題も避けられる。

`/thanks` は自分の掲載を直接クエリしてキャッシュを迂回し、反映遅れによる不安を避ける。

### 8.3 セキュリティ

- 管理画面は Cloudflare Access で保護する。アプリ側に認証コードを書かない
- メタ取得はプライベートIPへ到達しない
- 確認画面から送られた値をすべて再検証する
- CSRF対策としてフォームにトークンを持たせる

### 8.4 アクセシビリティ

- キーボードのみで掲載フォームを完了できる
- フォーカスリングを可視化する
- カテゴリチップは `aria-pressed` で状態を伝える
- 金額ステッパーに `aria-label` を付ける
- `prefers-reduced-motion` を尊重する

---

## 9. 技術構成

| レイヤ | 採用 |
|---|---|
| フレームワーク | Astro 5（SSR） |
| ランタイム | Cloudflare Workers |
| 静的アセット | Workers Static Assets |
| DB | Cloudflare D1 |
| 定期実行 | Cron Triggers |
| 管理画面認証 | Cloudflare Access |
| 問い合わせ | Cloudflare Email Routing |
| 決済 | Stripe（抽象化の背後） |
| CI/CD | GitHub Actions + Wrangler |

### ディレクトリ構成

```
nihon-ichi-bid/
├─ wrangler.toml
├─ astro.config.mjs
├─ migrations/0001_init.sql
├─ public/                        … Static Assets
├─ docs/
│  ├─ REQUIREMENTS.md             … 本書
│  └─ design-reference.html       … デザインの実物
├─ src/
│  ├─ styles/tokens.css
│  ├─ layouts/Base.astro
│  ├─ components/
│  │  ├─ Hero.astro               … 見出し＋ステッパー＋フォーム
│  │  ├─ CategoryChips.astro
│  │  ├─ ListingCard.astro        … 上位3件
│  │  ├─ ListingRow.astro         … 4位以降
│  │  ├─ ActivityFeed.astro
│  │  ├─ EmptyState.astro
│  │  └─ Pagination.astro
│  ├─ lib/
│  │  ├─ db.ts
│  │  ├─ categories.ts            … カテゴリ定義の唯一の出典
│  │  ├─ ranking.ts
│  │  ├─ url-normalize.ts         … 要テスト
│  │  ├─ pricing.ts               … 要テスト
│  │  ├─ metadata.ts
│  │  ├─ visitors.ts
│  │  └─ cache.ts
│  ├─ payments/
│  │  ├─ types.ts
│  │  └─ stripe.ts                … 唯一 Stripe を知るファイル
│  └─ pages/
│     ├─ index.astro
│     ├─ c/[slug].astro
│     ├─ confirm.astro
│     ├─ thanks.astro
│     ├─ rules.astro
│     ├─ terms.astro
│     ├─ privacy.astro
│     ├─ tokushoho.astro
│     ├─ contact.astro
│     ├─ admin/index.astro
│     └─ api/
│        ├─ ping.ts
│        ├─ checkout.ts
│        └─ webhook/[provider].ts
└─ tests/
   ├─ url-normalize.test.ts
   └─ pricing.test.ts
```

### 環境変数

| 変数 | 保管 |
|---|---|
| `PAYMENT_PROVIDER` | wrangler.toml |
| `SITE_URL` | wrangler.toml |
| `CONTACT_EMAIL` | wrangler.toml |
| `STRIPE_SECRET_KEY` | `wrangler secret put` |
| `STRIPE_WEBHOOK_SECRET` | `wrangler secret put` |

---

## 10. 法務・コンプライアンス

### 10.1 特定商取引法に基づく表記

| 項目 | 内容 |
|---|---|
| 販売事業者 / 所在地 / 電話番号 | 請求があった場合、遅滞なく開示します |
| 連絡先 | メールアドレス（省略不可） |
| 販売価格 | 100円以上、100円単位。掲載時に画面に表示 |
| 商品代金以外の必要料金 | なし（通信費は利用者負担） |
| 支払方法 | クレジットカード |
| 支払時期 | 掲載手続き時に即時決済 |
| 役務の提供時期 | 決済完了後、ただちにランキングへ反映 |
| 返品・キャンセル | デジタル役務の性質上、決済完了後の返金・キャンセルは受け付けません。規約違反により掲載を削除した場合も返金しません |

「遅滞なく開示」で省略できるのは氏名・住所・電話番号の3つのみ。連絡先・価格・支払時期・提供時期・返品特約は省略できない。返品特約の記載を欠くとクーリングオフを拒否できなくなる。

### 10.2 利用規約に含める条項

1. 提供するのは有料掲載枠であり、賞金・景品・抽選は一切ない
2. 順位は掲載金額のみで決定し、品質・人気・実績の評価ではない
3. カテゴリ内順位はそのカテゴリ内での金額順位であり、全体の順位ではない
4. 決済完了後の返金は行わない
5. 掲載可能な内容と禁止事項
6. 運営は理由を問わず掲載を非表示・削除でき、その場合も返金しない
7. 決済のタイミングにより順位は変動しうる。特定の順位を保証しない
8. 掲載期間は無期限。サービス終了時の取扱い
9. 本人からの削除依頼の窓口
10. 免責、準拠法、管轄裁判所

### 10.3 プライバシーポリシー

取得情報は、掲載内容（URL・表示名・説明・カテゴリ）、決済経由のメールアドレス、アクセスログ、セッションIDのみ。カード情報はサイトを経由せず決済事業者が直接処理する旨を明記する。メールアドレスの利用目的は掲載に関する連絡および削除依頼時の本人確認に限定する。セッションIDは訪問者数の集計にのみ使い1時間で削除する旨を記載する。

### 10.4 順位表示に関する配慮

カテゴリ内順位を持つため、サイト上には11個の「1位」が存在する。掲載者が対外的に「1位」と主張できてしまう構造である。

以下の4層で対応する。

1. **サービス名を「買える日本一」とする。** 名称自体が仕組みを開示しているため、掲載者がスクリーンショットを掲出しても「買える日本一で1位」となり、主張が自己限定される。免責文に頼らず名前が説明を果たす
2. 絞り込み時の見出しを「ゲームで1位を取るなら」とし、部門の話であることを画面上で明示する
3. 掲載のメタ欄に部門名を出す
4. フッターに常設で「順位は掲載金額のみで決まります。品質や実績の評価ではありません。」を置き、利用規約にも条項として入れる

サイト名を単に「日本一」とせず「買える」を冠しているのは、この配慮を名称の段階で織り込むためである。ロゴでも「買える」をコーラルで強調し、最初に読まれる語にする。

リリース前に一度専門家の確認を取ることを推奨する。

### 10.5 決済事業者への申請

稼働中のサイトを見て審査されるため、ランキングが表示され決済導線がテストモードで動く状態まで作ってから申請する。既存の審査済みアカウントには相乗りせず新規アカウントを作る。

申請時の事業説明は以下を使う。

> 日本のインターネット上のサービス・作品・アカウント等を掲載できる公開ランキングボードです。利用者は自分が掲載したい対象のURLと種別を登録し、掲載枠の料金を支払います。ランキングの表示順は支払った掲載金額の降順で決まります。
>
> 販売しているのはランキングボード上の有料掲載枠（広告掲載）です。支払いを行った掲載はすべてランキング上に表示されます。賞金・景品・抽選・くじの要素は一切なく、支払いに対して掲載という役務を確実に提供します。
>
> 最低料金は100円、100円単位での単発決済です。継続課金はありません。

---

## 11. 実装フェーズ

### Phase 0 — 土台と公開

1. `npm create astro` → `@astrojs/cloudflare`、`wrangler.toml`
2. D1作成、マイグレーション適用、シードデータ投入
3. `categories.ts`
4. `url-normalize.ts` + テスト
5. `pricing.ts` + テスト
6. `tokens.css`、`Base.astro`
7. `/` と `/c/[slug]`（一覧・カテゴリ内順位・ページネーション・キャッシュ）
8. 見出しのステッパーとフォーム（カテゴリ選択の同期）
9. 空状態
10. `/api/ping` と訪問者計測、Cron Trigger
11. 法務4ページ、Email Routing
12. GitHub Actionsデプロイ、`nihon-ichi.com` 接続

この時点でサイトが公開状態になる。

### Phase 1 — 決済導線（テストモード）

13. `metadata.ts`（HTMLRewriter・SSRF対策）
14. `/confirm`（メタ自動入力・請求額表示・サーバ側再検証）
15. `PaymentProvider` 定義 → `stripe.ts` → `/api/checkout`
16. `/api/webhook/stripe`
17. `/thanks`、最新の動き
18. 管理画面 + Cloudflare Access

### Phase 2 — 決済事業者の審査

19. 新規アカウント登録・申請。待ち時間中も Phase 1 の作りこみを継続する

### Phase 3 — 公開

20. 本番キーを secret に投入、webhookを本番登録
21. 100円で実決済テスト
22. OGP画像（カテゴリ別）、`robots.txt`、`sitemap.xml`
23. 公開

---

## 12. 受入基準

**課金と順位**
- [ ] 100円単位・最低額・上限のバリデーションがサーバ側でも効く
- [ ] 確認画面で金額やキーを改竄しても、サーバ側の再算出が優先される
- [ ] webhookを二重送信しても金額が二重加算されない
- [ ] webhookが逆順に到着しても金額が下がらない
- [ ] 同額の2件で先着が上位に来る
- [ ] カテゴリを絞ると順位が1から振り直される
- [ ] カテゴリを絞ると見出しの文言と金額が連動する
- [ ] 掲載ゼロのカテゴリで「100円で1位」が表示される
- [ ] 増額時に既存のカテゴリが引き継がれる

**無料運用**
- [ ] HTMLに `Set-Cookie` が付いていない
- [ ] 1ページ目がキャッシュされ、連続アクセスでD1を叩かない
- [ ] `/api/ping` がCookie保持者に対して書き込まない
- [ ] Cronの削除が動き、`visitors_archived` が加算される

**セキュリティ**
- [ ] メタ取得がプライベートIPへ到達しない
- [ ] 管理画面がCloudflare Accessなしでアクセスできない
- [ ] 掲載リンクに `rel="sponsored nofollow noopener"` が付く

**表示**
- [ ] 特商法ページに連絡先・価格・支払時期・提供時期・返品特約がすべてある
- [ ] フッターの免責が全ページにある
- [ ] カテゴリ絞り込み時の見出しに部門名が入る
- [ ] 説明文が2行でクランプされる

**品質**
- [ ] 820px以下でフォームが縦積みになり破綻しない
- [ ] キーボードのみで掲載フォームを完了できる
