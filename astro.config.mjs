// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    // Gives `Astro.locals.runtime.env` a miniflare-backed D1 during `astro dev`.
    platformProxy: { enabled: true },
    // Custom entry so the Worker can also expose a `scheduled` handler (Cron Trigger).
    workerEntryPoint: { path: 'src/worker.ts' },
  }),
  site: 'https://nihon-ichi.com',
});
