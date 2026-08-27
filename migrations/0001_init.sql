-- 要件定義書 5章 データモデル

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
