import { createChannelWorker } from '../_shared/channel-worker.ts';

// Platform JWT verification is disabled because this endpoint authenticates
// signed, short-lived, single-use worker proofs. It has no user actions.
Deno.serve(createChannelWorker({
  base: Deno.env.get('SUPABASE_URL') || '',
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  workerSecret: Deno.env.get('WA_MARKETING_WORKER_SECRET') || '',
}));
