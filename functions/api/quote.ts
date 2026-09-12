/**
 * POST /api/quote — lead capture for the quote form.
 *
 * Runs as a Cloudflare Pages Function (Workers runtime) alongside the static
 * build, so there is no server to keep warm and no cold start.
 *
 * Order of operations matters: cheap local checks first (honeypot, timing,
 * field validation), then the Turnstile round-trip, then the email send. That
 * keeps bot traffic from ever costing us an outbound request.
 */

interface Env {
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  LEAD_TO_EMAIL: string;
  LEAD_FROM_EMAIL: string;
  LEADS?: D1Database;
}

const FIELD_LIMITS = {
  name: 120,
  quoteType: 40,
  email: 200,
  phone: 40,
  city: 60,
  windows: 20,
  project: 60,
  timeframe: 40,
  message: 4000,
} as const;

type FieldName = keyof typeof FIELD_LIMITS;

interface Lead {
  name: string;
  quoteType: string;
  email: string;
  phone: string;
  city: string;
  windows: string;
  project: string;
  timeframe: string;
  message: string;
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const fail = (message: string, status = 400) => json({ ok: false, error: message }, status);

/** Bots that ignore our checks still get a 200 so they stop retrying. */
const silentOk = () => json({ ok: true }, 200);

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function readField(form: FormData, name: FieldName): string {
  const raw = form.get(name);
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, FIELD_LIMITS[name]);
}

function validate(lead: Lead): string | null {
  if (lead.name.length < 2) return 'Please enter your name.';
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(lead.email)) return 'Please enter a valid email address.';
  if (lead.phone.replace(/\D/g, '').length < 10) return 'Please enter a 10-digit phone number.';
  return null;
}

async function verifyTurnstile(token: string, secret: string, ip: string | null): Promise<boolean> {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  if (!response.ok) return false;

  const result = (await response.json()) as { success: boolean };
  return result.success === true;
}

function buildEmail(lead: Lead, meta: { ip: string | null; country: string | null; submittedAt: string }) {
  const rows: Array<[string, string]> = [
    ['Name', lead.name],
    ['Wants', lead.quoteType || '—'],
    ['Phone', lead.phone],
    ['Email', lead.email],
    ['City', lead.city || '—'],
    ['Windows', lead.windows || '—'],
    ['Project', lead.project || '—'],
    ['Timeframe', lead.timeframe || '—'],
    ['Message', lead.message || '—'],
    ['Submitted', meta.submittedAt],
    ['IP / Country', `${meta.ip ?? 'unknown'} / ${meta.country ?? 'unknown'}`],
  ];

  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  const html = `<h2 style="font:600 18px system-ui">New quote request — ${escapeHtml(lead.name)}</h2>
<table style="font:14px/1.6 system-ui;border-collapse:collapse">
${rows
  .map(
    ([label, value]) =>
      `<tr><td style="padding:4px 16px 4px 0;color:#667;vertical-align:top"><strong>${label}</strong></td><td style="padding:4px 0">${escapeHtml(value).replace(/\n/g, '<br>')}</td></tr>`,
  )
  .join('\n')}
</table>`;

  return { text, html };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const wantsJson = request.headers.get('accept')?.includes('application/json');

  let form: FormData;
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const payload = (await request.json()) as Record<string, string>;
      form = new FormData();
      for (const [key, value] of Object.entries(payload)) form.append(key, String(value));
    } else {
      form = await request.formData();
    }
  } catch {
    return fail('Could not read the submission.');
  }

  // Honeypot — a real user never sees this field.
  if (String(form.get('company') ?? '').length > 0) return silentOk();

  // Humans take longer than three seconds to fill this out.
  const renderedAt = Number(form.get('rendered_at'));
  if (Number.isFinite(renderedAt) && renderedAt > 0 && Date.now() - renderedAt < 3000) {
    return silentOk();
  }

  const lead: Lead = {
    name: readField(form, 'name'),
    quoteType: readField(form, 'quoteType'),
    email: readField(form, 'email'),
    phone: readField(form, 'phone'),
    city: readField(form, 'city'),
    windows: readField(form, 'windows'),
    project: readField(form, 'project'),
    timeframe: readField(form, 'timeframe'),
    message: readField(form, 'message'),
  };

  const invalid = validate(lead);
  if (invalid) return fail(invalid);

  const ip = request.headers.get('cf-connecting-ip');
  const country = request.headers.get('cf-ipcountry');

  if (env.TURNSTILE_SECRET_KEY) {
    const token = String(form.get('cf-turnstile-response') ?? '');
    if (!token || !(await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, ip))) {
      return fail('Spam check failed. Please reload the page and try again.', 403);
    }
  }

  const submittedAt = new Date().toISOString();

  // Persist first so a Resend outage can never lose a lead.
  if (env.LEADS) {
    try {
      await env.LEADS.prepare(
        `INSERT INTO leads (name, quote_type, email, phone, city, windows, project, timeframe, message, ip, country, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          lead.name,
          lead.quoteType,
          lead.email,
          lead.phone,
          lead.city,
          lead.windows,
          lead.project,
          lead.timeframe,
          lead.message,
          ip,
          country,
          submittedAt,
        )
        .run();
    } catch (error) {
      console.error('D1 insert failed', error);
    }
  }

  const { text, html } = buildEmail(lead, { ip, country, submittedAt });

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.LEAD_FROM_EMAIL,
      to: [env.LEAD_TO_EMAIL],
      reply_to: lead.email,
      subject: `New quote request — ${lead.name}${lead.city ? ` (${lead.city})` : ''}`,
      text,
      html,
    }),
  });

  if (!emailResponse.ok) {
    console.error('Resend failed', emailResponse.status, await emailResponse.text());
    // The lead is already in D1 when D1 is bound, so only hard-fail without it.
    if (!env.LEADS) {
      return fail('We could not send your request. Please call us and we will take it by phone.', 502);
    }
  }

  if (!wantsJson) {
    return Response.redirect(new URL('/thank-you/', request.url).href, 303);
  }

  return json({ ok: true }, 200);
};

/**
 * Without this, Pages falls back to the static asset handler and a GET to
 * /api/quote quietly serves the homepage HTML.
 */
export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method === 'POST') return fail('Unhandled POST.', 500);
  return new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
};
