import { connected, fingerprint, ownsChannel, ownsGroup, requestBody, submit, type Credentials, type Media, type Snapshot } from './zawa.ts';
import { verifyWorkerProof } from './worker-auth.ts';

type Environment = { base: string; serviceKey: string; workerSecret: string; allowedOrigins?: string; kind?: 'channel' | 'group' };
type Job = { id: string; claim_token: string; session_fingerprint: string; snapshot: Snapshot };

export function createChannelWorker(env: Environment, fetcher: typeof fetch = fetch) {
  const base = env.base.replace(/\/$/, '');
  const kind = env.kind || 'channel';
  const ownsDestination = kind === 'group' ? ownsGroup : ownsChannel;
  const headers = { apikey: env.serviceKey, Authorization: 'Bearer ' + env.serviceKey, 'Content-Type': 'application/json' };
  async function internal(path: string, options: RequestInit = {}) {
    const response = await fetcher(base + path.replaceAll('wa_channel_', 'wa_' + kind + '_'), { ...options, headers, redirect: 'error', signal: AbortSignal.timeout(15000) });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error('wa_channel_backend_failed');
    return data;
  }
  const rpc = (name: string, body: Record<string, unknown> = {}) => internal('/rest/v1/rpc/' + name, { method: 'POST', body: JSON.stringify(body) });
  async function capabilities(req: Request) {
    const bearer=req.headers.get('authorization')||'',target=new URL(req.url).searchParams.get('target_id')||'';
    if(!/^Bearer [A-Za-z0-9_.-]{10,5000}$/.test(bearer)||!/^([a-f0-9]{8}-){1}[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(target))throw Error('wa_owner_required');
    const auth=await fetcher(base+'/auth/v1/user',{headers:{apikey:env.serviceKey,Authorization:bearer},redirect:'error',signal:AbortSignal.timeout(10000)});
    const user=await auth.json().catch(()=>null);
    if(!auth.ok||!user?.id||!/^[a-f0-9-]{36}$/i.test(user.id))throw Error('wa_owner_required');
    const members=await internal('/rest/v1/admin_team_members?select=role&status=eq.active&role=in.(owner,super_admin)&auth_user_id=eq.'+user.id+'&limit=1');
    if(!Array.isArray(members)||members.length!==1)throw Error('wa_owner_required');
    const access=await fetcher(base+'/rest/v1/rpc/wa_'+kind+'_capabilities',{method:'POST',headers:{apikey:env.serviceKey,Authorization:bearer,'Content-Type':'application/json'},body:JSON.stringify({p_target:target}),redirect:'error',signal:AbortSignal.timeout(15000)});
    const proof=await access.json().catch(()=>null);if(!access.ok)throw Error('wa_channel_backend_failed');
    let isConnected=false;
    try{
      const rows=await internal('/rest/v1/wa_marketing_connection_secure?select=provider_id,session_secret,session_epoch&limit=2');
      const targets=await internal('/rest/v1/wa_marketing_targets?select=external_id&kind=eq.'+kind+'&enabled=eq.true&id=eq.'+target+'&limit=1');
      if(rows?.length===1&&targets?.length===1){await connected(rows[0],fetcher);await ownsDestination(targets[0].external_id,rows[0],fetcher);isConnected=true;}
    }catch(_){/* Connection state is separate from receipt verification. */}
    return {connected:isConnected,ready:isConnected&&(proof.text_verified===true||proof.image_verified===true),scheduler_enabled:true,publication_enabled:proof.publication_enabled===true,
      verified_types:[...(proof.text_verified?[{target_kind:kind,message_type:'text'}]:[]),...(proof.image_verified?[{target_kind:kind,message_type:'image'}]:[])]};
  }
  const code = (error: unknown) => {
    const value = error instanceof Error ? error.message : '';
    return /^(wa_[a-z_]+|provider_[a-z_]+|invalid_[a-z_]+|unsupported_[a-z_]+|channel_not_owned|connection_not_configured|media_mimetype_mismatch|text_required|media_required|text_too_long)$/.test(value) ? value : 'wa_channel_preparation_failed';
  };
  async function imageFor(job: Job): Promise<Media | undefined> {
    if (job.snapshot.message_type !== 'media') return undefined;
    const path = job.snapshot.media_path || '';
    if (!/^campaigns\/[0-9a-f-]{36}\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(path)) throw Error('invalid_media_path');
    const encoded = path.split('/').map(encodeURIComponent).join('/');
    const response = await fetcher(base + '/storage/v1/object/authenticated/wa-marketing-media/' + encoded, { headers, redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.body) throw Error('invalid_media_object');
    if (Number(response.headers.get('content-length')) > 20 * 1024 * 1024) { await response.body.cancel(); throw Error('invalid_media_size'); }
    const reader = response.body.getReader(); let size = 0;
    try {
      while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > 20 * 1024 * 1024) throw Error('invalid_media_size'); }
    } finally { await reader.cancel().catch(() => {}); }
    const signed = await internal('/storage/v1/object/sign/wa-marketing-media/' + encoded, { method: 'POST', body: JSON.stringify({ expiresIn: 600 }) });
    if (typeof signed?.signedURL !== 'string') throw Error('invalid_media_url');
    const url = new URL(signed.signedURL.startsWith('/object/') ? '/storage/v1' + signed.signedURL : signed.signedURL, base);
    if (url.protocol !== 'https:' || url.origin !== new URL(base).origin || !url.pathname.startsWith('/storage/v1/object/sign/wa-marketing-media/')) throw Error('invalid_media_url');
    return { url: url.href, mimetype: (response.headers.get('content-type') || '').split(';')[0], size, name: path.split('/').pop()! };
  }
  return async function handler(req: Request): Promise<Response> {
    const origin=req.headers.get('origin');
    const allowed=(env.allowedOrigins||'https://badai.vercel.app,http://localhost:3000,http://127.0.0.1:3000').split(',').map(s=>s.trim());
    const cors:Record<string,string>={'Vary':'Origin','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,content-type'};
    if(origin&&allowed.includes(origin))cors['Access-Control-Allow-Origin']=origin;
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors,'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    if(origin&&!allowed.includes(origin))return json({error:'wa_origin_not_allowed'},403);
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    if(req.method==='GET'){
      try{return json(await capabilities(req));}catch(error){return json({error:code(error)},error instanceof Error&&error.message==='wa_owner_required'?403:503);}
    }
    if (req.method !== 'POST') return json({ error: 'wa_method_not_allowed' }, 405);
    if (!env.serviceKey || !base || !await verifyWorkerProof(req.headers, env.workerSecret)) return json({ error: 'wa_worker_unauthorized' }, 403);
    try {
      const raw = await req.text(); if (raw.length > 1024) return json({ error: 'wa_body_too_large' }, 413);
      let body; try { body = JSON.parse(raw); } catch (_) { return json({ error: 'wa_invalid_json' }, 400); }
      if (body?.action !== 'worker') return json({ error: 'wa_invalid_action' }, 400);
      if (!await rpc('wa_live_consume_worker_token', { p_nonce: req.headers.get('x-wa-worker-nonce'), p_timestamp: Number(req.headers.get('x-wa-worker-time')) })) return json({ error: 'wa_worker_unauthorized' }, 403);
      await rpc('wa_channel_tick');
      const job: Job | null = await rpc('wa_channel_claim');
      if (!job) return json({ processed: false });
      let providerAttempted = false;
      try {
        if (job.snapshot.kind !== kind) throw Error('wa_destination_mismatch');
        const rows = await internal('/rest/v1/wa_marketing_connection_secure?select=provider_id,session_secret,session_epoch&limit=2');
        if (!Array.isArray(rows) || rows.length !== 1) throw Error('connection_not_configured');
        const credentials: Credentials = rows[0];
        const fp = await fingerprint(credentials);
        if (fp !== job.session_fingerprint) throw Error('wa_session_changed');
        await connected(credentials, fetcher);
        await ownsDestination(job.snapshot.external_id, credentials, fetcher);
        const media = await imageFor(job);
        requestBody(job.snapshot, media);
        const permitted = await rpc('wa_channel_dispatch', { p_id: job.id, p_claim: job.claim_token, p_fingerprint: fp });
        if (!permitted) {
          await rpc('wa_channel_settle', { p_id: job.id, p_claim: job.claim_token, p_status: 'cancelled', p_response: null, p_error: 'schedule_or_target_changed' });
          return json({ processed: true });
        }
        providerAttempted = true;
        const outcome = await submit(job.snapshot, credentials, media, fetcher);
        // Persist only normalized provider fields, never arbitrary responses,
        // signed URLs, message bodies, session identifiers or credentials.
        await rpc('wa_channel_settle', { p_id: job.id, p_claim: job.claim_token, p_status: outcome.status,
          p_response: { http_status: outcome.http_status, message_id: outcome.provider_id, error_code: outcome.error_code }, p_error: outcome.error_code });
      } catch (error) {
        // After any provider attempt, a failed persistence call must leave the
        // lease intact. It expires to UNKNOWN and can never trigger a retry.
        if (!providerAttempted) await rpc('wa_channel_settle', { p_id: job.id, p_claim: job.claim_token, p_status: 'failed', p_response: null, p_error: code(error) });
      }
      // pg_net responses must not expose recipients or provider identifiers.
      return json({ processed: true });
    } catch (_) { return json({ error: 'wa_channel_worker_failed' }, 503); }
  };
}
