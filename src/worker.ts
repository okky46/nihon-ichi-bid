import type { SSRManifest } from 'astro';
import { App } from 'astro/app';
import { handle } from '@astrojs/cloudflare/handler';
import type { Env } from './lib/db';
import { archiveExpiredSessions } from './lib/visitors';

/**
 * Astro が生成する Worker のエントリポイント。
 * fetch は Astro に委譲し、scheduled（Cron Trigger）だけを足す。
 */
export function createExports(manifest: SSRManifest) {
  const app = new App(manifest);

  const handler: ExportedHandler<Env> = {
    async fetch(request, env, ctx) {
      // @astrojs/cloudflare は自身が抱える workers-types で型付けされているため、
      // ルート側の workers-types とは名目上別の型になる。実体は同じ。
      return handle(manifest, app, request as never, env as never, ctx as never);
    },

    // 6.6: 1時間より古いセッション行を削除し、削除件数を累計へ加算する。
    async scheduled(_event, env, ctx) {
      if (!env.DB) return;
      ctx.waitUntil(archiveExpiredSessions(env.DB));
    },
  };

  return { default: handler };
}
