import { createHandler } from '../_shared/wa-service.ts';

// verify_jwt=false is intentional: the handler introspects every user bearer
// through Supabase Auth and checks active Owner/Super Admin membership. The cron
// worker uses a separate restricted secret and cannot call user actions.
Deno.serve(createHandler({
  SUPABASE_URL: Deno.env.get('SUPABASE_URL') || '',
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  WA_MARKETING_WORKER_SECRET: Deno.env.get('WA_MARKETING_WORKER_SECRET'),
  WA_MARKETING_ALLOWED_ORIGINS: Deno.env.get('WA_MARKETING_ALLOWED_ORIGINS'),
}));
