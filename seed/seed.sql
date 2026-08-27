-- シードデータ（開発・審査用）。
-- 掲載金額は降順、同額の 300円 2件は first_paid_at の先着順で並ぶ。
-- 適用: wrangler d1 execute nihon-ichi --local --file=./seed/seed.sql

DELETE FROM listings;

INSERT INTO listings
  (key, url, title, description, category, amount, status, owner_email, first_paid_at, updated_at)
VALUES
  ('ryo-shogi.example.jp/quantum', 'https://ryo-shogi.example.jp/quantum', '量子将棋', '駒の動きが観測されるまで確定しない将棋。すべての駒が複数の可能性を同時に持ったまま盤上を動きます。', 'game', 10000, 'active', NULL, 1784116800000, 1787497200000),
  ('hikokai-watch.example.jp', 'https://hikokai-watch.example.jp', '非公開化ウォッチ', '上場企業のMBO・TOBに関する観測情報を集めた公開データベース。断片的な情報を一箇所にまとめています。', 'web', 5000, 'active', NULL, 1784289600000, 1787497200000),
  ('ekimei-typing.example.jp', 'https://ekimei-typing.example.jp', '駅名タイピング', '全国の地下鉄の駅名をひたすら打ち込むタイピングゲーム。路線ごとに順番に出題されます。', 'game', 1500, 'active', NULL, 1784980800000, 1787479200000),
  ('live-seat.example.jp', 'https://live-seat.example.jp', 'ライブ座席シミュレータ', '日本のライブ会場の座席から見える景色を3Dで確認できるサービス。チケットを取る前に視界を確かめられます。', 'web', 1200, 'active', NULL, 1785067200000, 1787468400000),
  ('appstore:6480000001', 'https://apps.apple.com/jp/app/id6480000001', '脱ドパ', 'ショート動画の視聴時間を削るためのアプリ。使いすぎた分だけ次に開くまでの待ち時間が伸びていきます。', 'app', 900, 'active', NULL, 1785326400000, 1787400000000),
  ('kyotei-medal.example.jp', 'https://kyotei-medal.example.jp', '競艇メダルゲーム', '実際のレース映像を使って遊ぶブラウザのメダルゲーム。賭けではなく、あくまでメダルだけが増減します。', 'game', 800, 'active', NULL, 1785499200000, 1787565600000),
  ('x:okky46', 'https://x.com/okky46', '@okky46', '個人開発者。Webサービスとゲームをつくっています。', 'person', 700, 'active', NULL, 1785672000000, 1787313600000),
  ('tosu-machichuka.example.jp', 'https://tosu-machichuka.example.jp', '鳥栖の町中華リスト', '佐賀県鳥栖市の町中華を全店まわって記録しているサイト。営業時間と定休日を毎月確認しています。', 'shop', 600, 'active', NULL, 1785844800000, 1787227200000),
  ('kessan-screening.example.jp', 'https://kessan-screening.example.jp', '決算跨ぎスクリーニング', '決算発表をまたぐ銘柄を独自の指標で絞り込むスクリーニングツール。過去の反応も同時に確認できます。', 'web', 500, 'active', NULL, 1786017600000, 1787140800000),
  ('maruyama-fan.example.jp', 'https://maruyama-fan.example.jp', '丸山製作所ファン', '農機メーカーを勝手に応援している非公式コミュニティ。年に一度オフ会があります。', 'community', 400, 'active', NULL, 1786190400000, 1787119200000),
  ('pixiv:9000001', 'https://www.pixiv.net/users/9000001', '深夜のドット絵', '毎晩1枚ずつドット絵を投稿しているアカウント。テーマは主に夜の街と自販機です。', 'work', 300, 'active', NULL, 1786363200000, 1787054400000),
  ('indie-dev-blog.example.jp', 'https://indie-dev-blog.example.jp', 'individual dev blog', '個人開発の収支と失敗を包み隠さず書いているブログ。月次で数字を公開しています。', 'person', 300, 'active', NULL, 1786536000000, 1787040000000),
  ('analog-ban.example.jp', 'https://analog-ban.example.jp', 'アナログ盤の店', '中古レコードの実店舗。在庫はすべてオンラインで検索できます。', 'shop', 200, 'active', NULL, 1786708800000, 1786881600000),
  ('shumatsu-photo.example.jp', 'https://shumatsu-photo.example.jp', '週末の写真', '週末に撮った写真だけを載せているサイト。更新は不定期です。', 'work', 100, 'active', NULL, 1786881600000, 1786795200000);
