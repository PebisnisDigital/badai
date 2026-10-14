// Trusted operator utility. Default mode is read-only. Run reset only after
// explicit user approval and readiness to scan QR; never retry a saved attempt.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fingerprint } from '../functions/_shared/zawa.ts';

const management = 'https://api.supabase.com/v1/projects/tlvxlekqrllkvcpgwmic';
const backend = 'https://tlvxlekqrllkvcpgwmic.supabase.co';
const reset = process.argv[2] === '--reset-approved';
const verifyGuards = process.argv[2] === '--verify-guards';
const statePath = process.argv[3];
async function managementJson(path, options = {}) {
  const response = await fetch(management + path, { ...options, headers: {
    authorization: 'Bearer ' + process.env.SUPABASE_ACCESS_TOKEN, ...options.headers,
  }, redirect: 'error', signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw Error('Management operation HTTP ' + response.status);
  return response.json();
}
const query = query => managementJson('/database/query', { method: 'POST',
  headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
const keys = await managementJson('/api-keys?reveal=true');
const service = keys.find(key => key.name === 'service_role')?.api_key;
if (!service) throw Error('Trusted backend credential unavailable');
const credentialResponse = await fetch(backend + '/rest/v1/wa_marketing_connection_secure?select=provider_id,session_secret,session_epoch&id=eq.1', {
  headers: { apikey: service, authorization: 'Bearer ' + service },
  redirect: 'error', signal: AbortSignal.timeout(15000),
});
if (!credentialResponse.ok) throw Error('Private session read HTTP ' + credentialResponse.status);
const rows = await credentialResponse.json();
if (rows.length !== 1 || !rows[0].provider_id || !rows[0].session_secret) throw Error('Private session is not configured');
const credentials = rows[0];
const providerHeaders = { id: credentials.provider_id, 'session-id': credentials.session_secret, Accept: 'application/json' };
const configuration = await query('select enabled,testing_enabled,scheduler_enabled,active_job_id from public.wa_marketing_live_settings where singleton');

if (!reset && !verifyGuards) {
  const response = await fetch('https://api-zawa.azickri.com/session', { headers: providerHeaders,
    redirect: 'error', signal: AbortSignal.timeout(30000) });
  const data = await response.json().catch(() => null);
  console.log(JSON.stringify({ mode: 'read_only', provider_http_status: response.status,
    connected: response.ok && data?.isConnected === true, qr_ready: typeof data?.qrcode === 'string' && data.qrcode.startsWith('iVBORw0KGgo'), pairing_epoch_active: Boolean(credentials.session_epoch),
    flags: configuration[0] && { enabled: configuration[0].enabled, testing_enabled: configuration[0].testing_enabled,
      scheduler_enabled: configuration[0].scheduler_enabled }, reset_performed: false }));
} else {
  if (reset && !statePath?.startsWith('/')) throw Error('An absolute private attempt-state path is required');
  const state = { attempt_id: crypto.randomUUID(), started_at: new Date().toISOString(), phase: 'prepared',
    original_flags: { enabled: configuration[0]?.enabled, testing_enabled: configuration[0]?.testing_enabled,
      scheduler_enabled: configuration[0]?.scheduler_enabled } };
  // Exclusive create blocks a repeated invocation after any attempted reset.
  if (reset) fs.writeFileSync(statePath, JSON.stringify(state), { flag: 'wx', mode: 0o600 });
  const save = phase => { state.phase = phase; fs.writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 }); };
  const expected = await fingerprint(credentials);
  await query(`begin;
    do $$ declare c public.wa_marketing_connection_secure; actual text; begin
      perform 1 from public.wa_marketing_live_settings where singleton for update;
      select * into c from public.wa_marketing_connection_secure where id=1 for update;
      actual:=encode(extensions.digest(('['||to_json(c.provider_id)::text||','||to_json(c.session_secret)::text||
        case when c.session_epoch is null then '' else ','||to_json(c.session_epoch::text)::text end||']'),'sha256'),'hex');
      if actual<>'${expected}' then raise exception 'wa_session_changed'; end if;
      if exists(select 1 from public.wa_marketing_live_jobs where status in ('queued','preparing','dispatching'))
        or exists(select 1 from public.wa_marketing_live_settings where singleton and active_job_id is not null)
        then raise exception 'wa_reset_pending_jobs_review'; end if;
      update public.wa_marketing_live_settings set enabled=false,testing_enabled=false,scheduler_enabled=false where singleton;
      update public.wa_marketing_connection_secure set session_epoch='${state.attempt_id}',state='reset_pending',updated_at=clock_timestamp() where id=1;
    end $$; ${verifyGuards ? 'rollback' : 'commit'};`);
  if (verifyGuards) {
    console.log(JSON.stringify({ mode: 'verify_guards', database_changes: 'rolled_back', reset_performed: false }));
  } else {
  save('dispatching_reset');
  try {
    // Official PUT /session has no request body. Never follow redirects/retry.
    const response = await fetch('https://api-zawa.azickri.com/session', {
      method: 'PUT', headers: providerHeaders, redirect: 'error', signal: AbortSignal.timeout(30000),
    });
    const data = await response.json().catch(() => null);
    state.provider_http_status = response.status;
    save(response.status === 200 && data?.id === credentials.provider_id ? 'reset_accepted' : 'reset_result_unknown');
  } catch (_) { save('reset_result_unknown'); }
  console.log(JSON.stringify({ phase: state.phase, provider_http_status: state.provider_http_status || null,
    sending_gates: 'disabled', next_step: 'Owner checks QR in BADAI and pairs phone; delivery types require new tests' }));
  }
}
