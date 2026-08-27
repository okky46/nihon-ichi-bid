# 買える日本一（nihon-ichi.com）

仕様の唯一の出典は [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)。
確定済みのデザインは [`docs/design-reference.html`](docs/design-reference.html)。

Astro 5（SSR）+ Cloudflare Workers + D1。

## セットアップ

```bash
npm install
```

D1 を作成し、`wrangler.toml` の `database_id` を埋める。

```bash
npx wrangler d1 create nihon-ichi
```

マイグレーションとシードを適用する。

```bash
# ローカル
npx wrangler d1 execute nihon-ichi --local --file=./migrations/0001_init.sql
npx wrangler d1 execute nihon-ichi --local --file=./seed/seed.sql

# 本番
npx wrangler d1 migrations apply nihon-ichi --remote
```

## 開発

```bash
npm run dev     # astro dev（platformProxy 経由でローカル D1 に繋がる）
npm run build   # dist/_worker.js を生成
npm test        # Vitest
npm run check   # astro check（型）
```

Cache API は Cloudflare のローカルエミュレータでは no-op のため、
一覧のキャッシュヒットはデプロイ後にしか観測できない。

## GitHub Actions から公開

CloudflareでD1データベース `nihon-ichi` を作成し、GitHubリポジトリに次を登録する。

| 種別 | 名前 | 内容 |
|---|---|---|
| Actions variable | `CLOUDFLARE_D1_DATABASE_ID` | 作成したD1のdatabase ID |
| Actions secret | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| Actions secret | `CLOUDFLARE_API_TOKEN` | Workers・D1を更新できるAPI token |

`main`へのpushで、テスト・型チェック・ビルド後にD1マイグレーションと
Workerのデプロイが順に実行される。初回はActionsの
`Deploy to Cloudflare`を手動実行してもよい。

デプロイ成功後、Cloudflare DashboardのWorker設定で
`nihon-ichi.com`をCustom Domainとして追加する。DNSレコードはこの操作で自動作成される。

Pull Requestでは `.github/workflows/ci.yml` の検証だけが動き、Cloudflareへの変更は行わない。

## 実装状況

Phase 0（要件定義書 11章）まで。GitHub Actionsによる公開経路を含む。
決済まわり（`/confirm`、`metadata.ts`、
`PaymentProvider`、webhook、`/thanks`、管理画面）は Phase 1 で実装する。
掲載フォームの送信先 `/confirm` はまだ存在しない。
