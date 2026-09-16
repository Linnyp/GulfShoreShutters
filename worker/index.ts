/**
 * Worker entry for the deployed site.
 *
 * The site is a static Astro build served from the ASSETS binding; this exists only
 * so the quote endpoint has somewhere to run. Cloudflare serves a matching file from
 * ./dist before the Worker is consulted, so in practice this handles /api/quote and
 * nothing else.
 *
 * The handler itself lives in functions/api/quote.ts, still using the Pages Function
 * signature from when the site was deployed to Pages. It only ever reads `request` and
 * `env` off its context, so it is called directly from here instead of being rewritten.
 *
 * Bindings (`LEADS`) are declared in wrangler.jsonc and secrets are set with
 * `wrangler secret put`. Anything added only in the dashboard is lost on the next
 * `wrangler deploy`.
 */
import { onRequestPost, onRequest } from '../functions/api/quote';

interface Env {
  ASSETS: Fetcher;
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  LEAD_TO_EMAIL: string;
  LEAD_FROM_EMAIL: string;
  LEADS?: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/quote') {
      // PagesFunction's context type also expects params/data/next; the handler
      // reads none of them, so a cast keeps this to the fields it actually uses.
      const context = { request, env, ctx } as unknown as Parameters<typeof onRequestPost>[0];
      return request.method === 'POST' ? onRequestPost(context) : onRequest(context);
    }

    return env.ASSETS.fetch(request);
  },
};
