import { connected, fingerprint, messageType, ownsChannel, requestBody, submit, type Credentials, type Media, type Snapshot } from './zawa.ts';
import { verifyWorkerProof } from './worker-auth.ts';

type Environment = { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string; WA_MARKETING_WORKER_SECRET?: string; WA_MARKETING_ALLOWED_ORIGINS?: string };
type Job = { id: string; run_id: string; campaign_id: string; claim_token: string; snapshot: Snapshot & { media_duration_seconds?: number }; session_fingerprint: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class ServiceError extends Error {
  code: string;
  status: number;
  constructor(code: string, status = 400) { super(code); this.code = code; this.status = status; }
}
const safeCode = (value: unknown) => typeof value === 'string' && /^(wa_[a-z_]+|provider_[a-z_]+|[a-z_]+_required|unsupported_[a-z_]+|invalid_[a-z_]+|channel_not_owned|connection_not_configured|text_too_long|media_mimetype_mismatch|status_document_unsupported)$/.test(value) ? value : 'wa_operation_failed';

export function createHandler(env: Environment, fetcher: typeof fetch = fetch) {
  const base = env.SUPABASE_URL?.replace(/\/$/, '');
  const origins = (env.WA_MARKETING_ALLOWED_ORIGINS || 'https://badai.vercel.app,http://localhost:3000,http://127.0.0.1:3000').split(',').map(s => s.trim());
  const apiHeaders = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' };

  async function internal(path: string, options: RequestInit = {}) {
    if (!base || !env.SUPABASE_SERVICE_ROLE_KEY) throw new ServiceError('wa_backend_not_configured', 503);
    let response: Response;
    try {
      response = await fetcher(base + path, { ...options, headers: { ...apiHeaders, ...options.headers }, redirect: 'error', signal: AbortSignal.timeout(15000) });
    } catch (_) { throw new ServiceError('wa_backend_transport_failed', 503); }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const code = safeCode(data?.message);
      if (code === 'wa_operation_failed') {
        // Fixed route and SQLSTATE only: never log messages, details, queries,
        // request bodies, credential headers, or signed storage URLs.
        const route = /^\/rest\/v1\/(?:rpc\/)?([a-z_]+)(?:\?|$)/.exec(path)?.[1] || 'storage';
        const databaseCode = typeof data?.code === 'string' && /^(?:[A-Z0-9]{5}|PGRST\d{3})$/.test(data.code) ? data.code : null;
        console.error(JSON.stringify({ event: 'wa_backend_rejected', route, http_status: response.status, database_code: databaseCode }));
      }
      throw new ServiceError(code === 'wa_operation_failed' ? 'wa_backend_request_failed' : code, response.status === 403 ? 403 : 400);
    }
    return data;
  }
  const read = (path: string) => internal('/rest/v1/' + path);
  const rpc = (name: string, body: Record<string, unknown>) => internal('/rest/v1/rpc/' + name, { method: 'POST', body: JSON.stringify(body) });

  async function owner(req: Request) {
    const bearer = req.headers.get('authorization');
    if (!bearer || !/^Bearer [A-Za-z0-9_.-]{10,5000}$/.test(bearer)) throw new ServiceError('wa_owner_required', 403);
    const r = await fetcher(base + '/auth/v1/user', { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: bearer }, redirect: 'error', signal: AbortSignal.timeout(10000) });
    const user = await r.json().catch(() => null);
    if (!r.ok || !UUID.test(user?.id || '')) throw new ServiceError('wa_owner_required', 403);
    const members = await read('admin_team_members?select=role,status&auth_user_id=eq.' + user.id + '&status=eq.active&role=in.(owner,super_admin)&limit=1');
    if (!Array.isArray(members) || members.length !== 1) throw new ServiceError('wa_owner_required', 403);
    return user.id as string;
  }

  async function credentials(): Promise<Credentials> {
    const rows = await read('wa_marketing_connection_secure?select=provider_id,session_secret&limit=2');
    if (!Array.isArray(rows) || rows.length !== 1 || !rows[0].provider_id || !rows[0].session_secret) throw new ServiceError('connection_not_configured', 503);
    return { provider_id: rows[0].provider_id, session_secret: rows[0].session_secret };
  }

  async function mediaFor(job: Job): Promise<Media | undefined> {
    if (job.snapshot.message_type !== 'media') return undefined;
    const path = job.snapshot.media_path || '';
    if (!path.startsWith('campaigns/' + job.campaign_id + '/') || path.includes('..') || !/^campaigns\/[0-9a-f-]+\/[A-Za-z0-9_.-]+$/i.test(path)) throw new ServiceError('invalid_media_path');
    const encoded = path.split('/').map(encodeURIComponent).join('/');
    // Download only the selected private object, with a strict 20 MB bound.
    // Signed URLs are temporary provider input; never stored in logs/history.
    const r = await fetcher(base + '/storage/v1/object/authenticated/wa-marketing-media/' + encoded, {
      headers: apiHeaders, redirect: 'error', signal: AbortSignal.timeout(30000),
    });
    if (!r.ok || !r.body) throw new ServiceError('invalid_media_object');
    if (Number(r.headers.get('content-length')) > 20 * 1024 * 1024) { await r.body.cancel(); throw new ServiceError('invalid_media_size'); }
    const reader = r.body.getReader();
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 20 * 1024 * 1024) throw new ServiceError('invalid_media_size');
      }
    } finally { await reader.cancel().catch(() => {}); }
    const signed = await internal('/storage/v1/object/sign/wa-marketing-media/' + encoded, { method: 'POST', body: JSON.stringify({ expiresIn: 600 }) });
    if (typeof signed?.signedURL !== 'string') throw new ServiceError('invalid_media_url');
    const url = new URL(signed.signedURL.startsWith('/object/') ? '/storage/v1' + signed.signedURL : signed.signedURL, base);
    if (url.origin !== new URL(base).origin || url.protocol !== 'https:' || !url.pathname.startsWith('/storage/v1/object/sign/wa-marketing-media/')) throw new ServiceError('invalid_media_url');
    return { url: url.href, mimetype: (r.headers.get('content-type') || '').split(';')[0], size, duration: job.snapshot.media_duration_seconds, name: path.split('/').pop()! };
  }

  async function processOne(jobId: string | null) {
    const job: Job | null = await rpc('wa_live_claim', { p_job_id: jobId });
    if (!job) return { processed: false };
    let credential: Credentials, media: Media | undefined, fp: string;
    try {
      credential = await credentials(); fp = await fingerprint(credential);
      if (fp !== job.session_fingerprint) throw new ServiceError('wa_session_changed');
      await connected(credential, fetcher);
      if (job.snapshot.kind === 'channel') await ownsChannel(job.snapshot.external_id, credential, fetcher);
      media = await mediaFor(job);
      requestBody(job.snapshot, media); // Validate BEFORE marking a provider attempt.
    } catch (e) {
      const code = safeCode(e instanceof Error ? e.message : null);
      await rpc('wa_live_settle', { p_job_id: job.id, p_claim_token: job.claim_token, p_status: 'failed', p_error_code: code });
      return { processed: true, job_id: job.id, status: 'failed', error_code: code };
    }
    const permitted = await rpc('wa_live_dispatch', { p_job_id: job.id, p_claim_token: job.claim_token, p_fingerprint: fp });
    if (!permitted) {
      await rpc('wa_live_settle', { p_job_id: job.id, p_claim_token: job.claim_token, p_status: 'cancelled', p_error_code: 'wa_dispatch_cancelled' });
      return { processed: true, job_id: job.id, status: 'cancelled' };
    }
    const result = await submit(job.snapshot, credential, media, fetcher);
    // If this write fails, the persisted dispatch lease later becomes UNKNOWN;
    // it must not result in another POST, even when the caller retries.
    await rpc('wa_live_settle', { p_job_id: job.id, p_claim_token: job.claim_token, p_status: result.status,
      p_provider_id: result.provider_id, p_http_status: result.http_status, p_error_code: result.error_code });
    return { processed: true, job_id: job.id, status: result.status, provider_message_id: result.provider_id };
  }

  return async function handler(req: Request): Promise<Response> {
    const origin = req.headers.get('origin');
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'X-Content-Type-Options': 'nosniff' };
    if (origin && origins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (origin && !origins.includes(origin)) return json({ error: 'wa_origin_not_allowed' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (!['GET', 'POST'].includes(req.method)) return json({ error: 'wa_method_not_allowed' }, 405);
    try {
      let body: Record<string, any> = {};
      if (req.method === 'POST') {
        if (!req.headers.get('content-type')?.includes('application/json')) throw new ServiceError('wa_json_required', 415);
        if (Number(req.headers.get('content-length')) > 8192) throw new ServiceError('wa_body_too_large', 413);
        const raw = await req.text(); if (raw.length > 8192) throw new ServiceError('wa_body_too_large', 413);
        try { body = JSON.parse(raw); } catch (_) { throw new ServiceError('wa_invalid_json'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ServiceError('wa_invalid_json');
      }
      if (req.method === 'POST' && body.action === 'worker') {
        if (!await verifyWorkerProof(req.headers, env.WA_MARKETING_WORKER_SECRET || '')) throw new ServiceError('wa_worker_unauthorized', 403);
        const consumed = await rpc('wa_live_consume_worker_token', { p_nonce: req.headers.get('x-wa-worker-nonce'), p_timestamp: Number(req.headers.get('x-wa-worker-time')) });
        if (!consumed) throw new ServiceError('wa_worker_unauthorized', 403);
        if (body.check_connection === true) {
          // Authenticated operator health check: read-only and no account data.
          await connected(await credentials(), fetcher);
          return json({ processed: false, connected: true });
        }
        const outcome = await processOne(null);
        // pg_net responses can be readable by application roles. No job IDs,
        // recipient data, provider IDs or secrets belong in a cron response.
        return json({ processed: outcome.processed });
      }
      const actor = await owner(req);
      if (req.method === 'GET' && new URL(req.url).searchParams.get('action') === 'history') {
        const [jobs, runs] = await Promise.all([
          read('wa_marketing_live_jobs?select=id,run_id,campaign_id,target_id,target_name,target_kind,message_type,status,send_after,provider_message_id,provider_http_status,error_code,accepted_at,delivered_at,evidence,dispatch_started_at,snapshot&order=created_at.desc&limit=200'),
          read('wa_marketing_live_runs?select=id,campaign_id,mode,status,created_at&order=created_at.desc&limit=100'),
        ]);
        return json({ jobs, runs });
      }
      if (req.method === 'GET') {
        const rows = await read('wa_marketing_live_settings?select=enabled,testing_enabled,scheduler_enabled&singleton=eq.true');
        const cfg = rows?.[0]; if (!cfg) throw new ServiceError('wa_backend_not_configured', 503);
        let fp: string | null = null, isConnected = false;
        try { const c = await credentials(); await connected(c, fetcher); fp = await fingerprint(c); isConnected = true; } catch (_) {}
        const proofs = fp ? await read('wa_marketing_live_verifications?select=target_kind,message_type&session_fingerprint=eq.' + fp) : [];
        const tests = await read('wa_marketing_live_test_targets?select=target_id&enabled=eq.true');
        return json({ ready: isConnected && cfg.enabled && proofs.length > 0, sending_enabled: cfg.enabled,
          connected: isConnected, supported_destinations: [...new Set(proofs.map((p: any) => p.target_kind))],
          verified_types: proofs, testing_ready: isConnected && cfg.testing_enabled, approved_test_targets: tests.map((t: any) => t.target_id),
          scheduler_enabled: cfg.scheduler_enabled, contracts_documented: true });
      }
      if (['pause', 'cancel', 'resume'].includes(body.action)) {
        if (!UUID.test(body.run_id || '')) throw new ServiceError('wa_invalid_run');
        if (body.action === 'resume' && body.confirm !== true) throw new ServiceError('wa_confirmation_required');
        await rpc('wa_live_control', { p_actor: actor, p_run_id: body.run_id, p_action: body.action });
        return json({ status: body.action, warning: 'A provider request already in flight may still finish.' });
      }
      if (body.action === 'confirm_received') {
        if (body.confirm !== true || !UUID.test(body.job_id || '')) throw new ServiceError('wa_confirmation_required');
        await rpc('wa_live_confirm', { p_actor: actor, p_job_id: body.job_id, p_evidence: body.evidence, p_observed_at: body.observed_at });
        return json({ status: 'delivered', evidence_source: 'recipient_confirmation' });
      }
      const actions: Record<string, string> = { send_one: 'single', send_test: 'test', schedule: 'scheduled' };
      if (typeof body.action !== 'string' || !Object.hasOwn(actions, body.action)) throw new ServiceError('wa_invalid_action');
      const mode = actions[body.action];
      if (body.confirm !== true || !UUID.test(body.campaign_id || '') || !UUID.test(body.request_key || '')) throw new ServiceError('wa_confirmation_required');
      const targets = mode === 'scheduled' ? body.target_ids : [body.target_id];
      if (!Array.isArray(targets) || targets.length < 1 || targets.length > 100 || targets.some(id => !UUID.test(id))) throw new ServiceError('wa_invalid_targets');
      const c = await credentials(); await connected(c, fetcher);
      const result = await rpc('wa_live_enqueue', { p_actor: actor, p_campaign_id: body.campaign_id, p_target_ids: targets, p_mode: mode,
        p_request_key: body.request_key, p_fingerprint: await fingerprint(c) });
      if (mode === 'scheduled' || result.duplicate) return json({ ...result, status: 'queued_or_existing' }, 202);
      const jobs = await read('wa_marketing_live_jobs?select=id&run_id=eq.' + result.run_id + '&status=eq.queued&order=position.asc&limit=1');
      const outcome = jobs?.[0] ? await processOne(jobs[0].id) : { processed: false };
      return json({ ...result, ...outcome, status: outcome.processed ? outcome.status : 'queued' }, 202);
    } catch (e) {
      const code = safeCode(e instanceof Error ? e.message : null);
      // No provider errors, credentials, signed URLs or request payloads are logged.
      return json({ error: code }, e instanceof ServiceError ? e.status : 503);
    }
  };
}
