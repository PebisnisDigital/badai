import { createChannelWorker } from '../_shared/channel-worker.ts';

// Platform JWT verification is disabled because this endpoint authenticates
// signed, short-lived, single-use worker proofs for POST. Its read-only GET
// endpoint verifies the user bearer through Auth and active owner membership.
Deno.serve(createChannelWorker({
  base: Deno.env.get('SUPABASE_URL') || '',
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  workerSecret: Deno.env.get('WA_MARKETING_WORKER_SECRET') || '',
  allowedOrigins: Deno.env.get('WA_MARKETING_ALLOWED_ORIGINS'),
}));
