/**
 * Worker entry for the deployed site.
 *
 * The site is a static Astro build served from the ASSETS binding; this exists only
 * so the quote endpoint has somewhere to run. Cloudflare serves a matching file from
 * ./dist before the Worker is consulted, so in practice this handles /api/quote and
 * nothing else.
 *
 * The handler itself still lives in functions/api/quote.ts in Pages-Function shape.
 * It only ever reads `request` and `env` off its context, so it is called directly
 * rather than duplicated here — one copy of the validation, Turnstile check and
 * Resend call, whichever way the project is deployed.
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
      // The Pages context carries params/data/next as well; the handler reads
      // neither, so a cast keeps this to the two fields it actually uses.
      const context = { request, env, ctx } as unknown as Parameters<typeof onRequestPost>[0];
      return request.method === 'POST' ? onRequestPost(context) : onRequest(context);
    }

    return env.ASSETS.fetch(request);
  },
};
