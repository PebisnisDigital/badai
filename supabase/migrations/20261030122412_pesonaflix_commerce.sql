-- PESONAFLIX is a made-for-you service, not a BADAI membership plan.
-- All customer and payment data is server-only; RLS denies direct browser access.

create table public.pesonaflix_settings (
  id smallint primary key default 1 check (id = 1),
  normal_price bigint check (normal_price > 0),
  promo_price bigint check (promo_price > 0),
  promo_enabled boolean not null default false,
  sales_open boolean not null default false,
  order_quota integer check (order_quota is null or order_quota > 0),
  commission_percent numeric(5,2) not null default 50 check (commission_percent between 0 and 100),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint pesonaflix_promo_not_higher check (
    promo_price is null or normal_price is null or promo_price <= normal_price
  )
);

-- Pricing starts unconfigured and checkout closed until owner sets a real offer.
insert into public.pesonaflix_settings (id) values (1);

create table public.pesonaflix_orders (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  customer_token uuid not null unique default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  email text not null check (char_length(email) between 5 and 254),
  whatsapp text not null check (whatsapp ~ '^62[0-9]{8,13}$'),
  template_id text not null,
  coupon_code text,
  referred_by_code text,
  normal_amount bigint not null check (normal_amount > 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  amount bigint not null check (amount > 0),
  commission_percent_snapshot numeric(5,2) not null check (commission_percent_snapshot between 0 and 100),
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','expired','failed','cancelled','refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount = normal_amount - discount_amount)
);

create index pesonaflix_orders_status_created_idx on public.pesonaflix_orders (payment_status, created_at desc);
create index pesonaflix_orders_email_idx on public.pesonaflix_orders (lower(email));

create table public.pesonaflix_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.pesonaflix_orders(id) on delete restrict,
  provider text not null default 'buatqris',
  provider_transaction_id text unique,
  amount bigint not null check (amount > 0),
  total_amount bigint check (total_amount is null or total_amount > 0),
  qr_url text,
  payment_url text,
  status text not null default 'pending'
    check (status in ('pending','success','expired','failed','cancelled')),
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pesonaflix_payment_attempts_order_idx on public.pesonaflix_payment_attempts (order_id, created_at desc);

create table public.pesonaflix_briefs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.pesonaflix_orders(id) on delete restrict,
  brief jsonb not null default '{}'::jsonb check (jsonb_typeof(brief) = 'object'),
  status text not null default 'draft' check (status in ('draft','submitted','needs_revision','approved')),
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.pesonaflix_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.pesonaflix_orders(id) on delete restrict,
  assigned_team_id uuid references public.admin_team_members(id) on delete set null,
  status text not null default 'waiting_brief'
    check (status in ('waiting_brief','brief_submitted','review','in_production','preview_ready','revision_requested','approved','published','completed','on_hold','cancelled')),
  site_slug text,
  preview_url text,
  public_url text,
  revision_count integer not null default 0 check (revision_count >= 0),
  internal_note text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pesonaflix_jobs_status_idx on public.pesonaflix_jobs (status, created_at desc);

create table public.pesonaflix_events (
  id bigint generated always as identity primary key,
  order_id uuid references public.pesonaflix_orders(id) on delete restrict,
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index pesonaflix_events_order_idx on public.pesonaflix_events (order_id, created_at desc);

alter table public.pesonaflix_settings enable row level security;
alter table public.pesonaflix_orders enable row level security;
alter table public.pesonaflix_payment_attempts enable row level security;
alter table public.pesonaflix_briefs enable row level security;
alter table public.pesonaflix_jobs enable row level security;
alter table public.pesonaflix_events enable row level security;

-- Edge Functions authenticate the request and use their private service role.
-- Deliberately no anon/authenticated policies: no public Data API access to PII.
revoke all on table
  public.pesonaflix_settings,
  public.pesonaflix_orders,
  public.pesonaflix_payment_attempts,
  public.pesonaflix_briefs,
  public.pesonaflix_jobs,
  public.pesonaflix_events
from anon, authenticated;

revoke all on sequence public.pesonaflix_events_id_seq from anon, authenticated;
