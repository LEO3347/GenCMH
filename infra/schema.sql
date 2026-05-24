create extension if not exists "pgcrypto";

create type user_role as enum ('guest', 'organizer', 'staff', 'security', 'vendor', 'admin', 'super_admin');
create type ticket_status as enum ('reserved', 'issued', 'used', 'cancelled', 'refunded');
create type qr_status as enum ('active', 'used', 'expired', 'revoked');
create type payment_provider as enum ('stripe', 'paypal', 'mercadopago');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'disputed');
create type scan_result as enum ('accepted', 'rejected', 'duplicate', 'expired', 'fraud');
create type pickup_order_status as enum ('draft', 'queued_offline', 'pending_payment', 'paid', 'preparing', 'ready', 'picked_up', 'cancelled', 'sync_conflict');
create type table_status as enum ('available', 'held', 'reserved', 'occupied', 'closed');
create type reward_type as enum ('points', 'cashback', 'badge', 'mission', 'vip_upgrade', 'nft_ticket');
create type admin_action_type as enum ('resend_qr', 'show_qr', 'manual_validate', 'invalidate_ticket', 'refund_ticket', 'cancel_ticket', 'recover_ticket');

create table vip_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rank int not null unique,
  benefits jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  phone text,
  password_hash text,
  display_name text not null,
  avatar_url text,
  role user_role not null default 'guest',
  vip_level_id uuid references vip_levels(id),
  email_verified_at timestamptz,
  wallet_balance_cents int not null default 0 check (wallet_balance_cents >= 0),
  oauth_provider text,
  oauth_subject text,
  bot_risk_score numeric(5,4) not null default 0,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  permissions jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table staff_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  event_id uuid,
  staff_type user_role not null check (staff_type in ('staff', 'security', 'vendor', 'admin', 'super_admin')),
  pin_hash text,
  device_binding_required boolean not null default true,
  permissions jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  ip_address inet,
  user_agent text,
  device_fingerprint text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  balance_cents int not null default 0 check (balance_cents >= 0),
  currency char(3) not null default 'MXN',
  updated_at timestamptz not null default now()
);

create table artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stage_name text,
  avatar_url text,
  genres text[] not null default '{}',
  social_links jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references users(id),
  title text not null,
  slug text not null unique,
  description text not null default '',
  cover_url text,
  flyer_url text,
  video_url text,
  venue_name text not null,
  address text,
  city text not null,
  country text not null default 'MX',
  latitude numeric(10,7),
  longitude numeric(10,7),
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity int not null check (capacity > 0),
  vip boolean not null default false,
  visibility text not null default 'public' check (visibility in ('public', 'private', 'secret', 'exclusive')),
  music_type text,
  venue_map_url text,
  scheduled_publish_at timestamptz,
  status text not null default 'draft',
  trending_score numeric(8,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table event_zones (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  zone_type text not null check (zone_type in ('general', 'vip', 'backstage', 'secret', 'vendor', 'security')),
  capacity int not null default 0 check (capacity >= 0),
  map_geometry jsonb not null default '{}',
  color text not null default '#00d4ff',
  created_at timestamptz not null default now(),
  unique (event_id, name)
);

create table event_artists (
  event_id uuid not null references events(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  billing_order int not null default 100,
  primary key (event_id, artist_id)
);

create table ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  tier text not null,
  price_cents int not null check (price_cents >= 0),
  currency char(3) not null default 'MXN',
  quantity int not null check (quantity >= 0),
  per_user_limit int not null default 8,
  benefits jsonb not null default '{}',
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, name)
);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  reservation_type text not null,
  guest_count int not null default 1 check (guest_count > 0),
  status text not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table venue_tables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  zone_id uuid references event_zones(id) on delete set null,
  label text not null,
  min_spend_cents int not null default 0 check (min_spend_cents >= 0),
  seats int not null default 4 check (seats > 0),
  status table_status not null default 'available',
  position_x numeric(8,4) not null default 0,
  position_y numeric(8,4) not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, label)
);

create table table_reservations (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references venue_tables(id) on delete cascade,
  user_id uuid not null references users(id),
  event_id uuid not null references events(id) on delete cascade,
  status text not null default 'held' check (status in ('held', 'paid', 'cancelled', 'expired', 'checked_in')),
  split_payment_enabled boolean not null default false,
  invited_users jsonb not null default '[]',
  hold_expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  ticket_type_id uuid not null references ticket_types(id),
  attendee_name text not null,
  status ticket_status not null default 'issued',
  price_cents int not null check (price_cents >= 0),
  anti_resale_lock boolean not null default true,
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

create table qr_codes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references tickets(id) on delete cascade,
  token_hash text not null unique,
  status qr_status not null default 'active',
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete set null,
  user_id uuid not null references users(id),
  provider payment_provider not null,
  provider_payment_id text,
  amount_cents int not null check (amount_cents >= 0),
  currency char(3) not null default 'MXN',
  status payment_status not null default 'pending',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  event_id uuid references events(id) on delete set null,
  payment_id uuid references payments(id) on delete set null,
  purchase_type text not null check (purchase_type in ('ticket', 'pickup', 'table', 'wallet_topup', 'membership')),
  reference_id uuid,
  amount_cents int not null check (amount_cents >= 0),
  currency char(3) not null default 'MXN',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table merchant_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id),
  name text not null,
  provider payment_provider not null,
  provider_account_id text,
  default_currency char(3) not null default 'MXN',
  settlement_metadata jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  description text not null default '',
  category text not null,
  image_url text,
  price_cents int not null check (price_cents >= 0),
  currency char(3) not null default 'MXN',
  stock int not null default 0 check (stock >= 0),
  pickup_zone text not null default 'Bar Express',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, name)
);

create table pickup_orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references users(id),
  merchant_account_id uuid references merchant_accounts(id),
  client_order_id text not null,
  status pickup_order_status not null default 'pending_payment',
  total_cents int not null check (total_cents >= 0),
  currency char(3) not null default 'MXN',
  pickup_code text not null,
  pickup_qr_token_hash text not null unique,
  pickup_zone text not null default 'Bar Express',
  source_device_id text,
  offline_created_at timestamptz,
  synced_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_order_id)
);

create table pickup_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references pickup_orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null check (quantity > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  total_cents int not null check (total_cents >= 0)
);

create table wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  amount_cents int not null,
  transaction_type text not null check (transaction_type in ('topup', 'purchase', 'cashback', 'refund', 'reward')),
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create table rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  reward_type reward_type not null,
  title text not null,
  description text not null default '',
  points int not null default 0,
  metadata jsonb not null default '{}',
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create table offline_sync_batches (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  user_id uuid references users(id),
  event_id uuid references events(id),
  payload_hash text not null,
  accepted_count int not null default 0,
  rejected_count int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (device_id, payload_hash)
);

create table scans (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete set null,
  event_id uuid not null references events(id) on delete cascade,
  staff_user_id uuid not null references users(id),
  device_id text not null,
  latitude numeric(10,7),
  longitude numeric(10,7),
  result scan_result not null,
  offline boolean not null default false,
  synced_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table offline_scan_batches (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  staff_user_id uuid references users(id),
  event_id uuid references events(id),
  payload_hash text not null,
  accepted_count int not null default 0,
  rejected_count int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (device_id, payload_hash)
);

create table fraud_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete set null,
  ticket_id uuid references tickets(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  reason text not null,
  severity int not null default 2 check (severity between 1 and 5),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table admin_ticket_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references users(id),
  ticket_id uuid references tickets(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  action_type admin_action_type not null,
  reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  body text not null check (length(body) <= 1200),
  parent_id uuid references comments(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table follows (
  follower_id uuid not null references users(id) on delete cascade,
  following_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  media_url text not null,
  media_type text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table chat_rooms (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references chat_rooms(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null check (length(body) <= 800),
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table analytics (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  metric text not null,
  value numeric not null,
  dimensions jsonb not null default '{}',
  recorded_at timestamptz not null default now()
);

create table recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  score numeric(6,4) not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index idx_events_city_starts on events(city, starts_at);
create index idx_events_trending on events(trending_score desc);
create index idx_tickets_event_status on tickets(event_id, status);
create index idx_payments_user_status on payments(user_id, status);
create index idx_purchases_user_created on purchases(user_id, created_at desc);
create index idx_purchases_event_type on purchases(event_id, purchase_type);
create index idx_products_event_active on products(event_id, active);
create index idx_pickup_orders_event_status on pickup_orders(event_id, status);
create index idx_pickup_orders_user_created on pickup_orders(user_id, created_at desc);
create index idx_venue_tables_event_status on venue_tables(event_id, status);
create index idx_table_reservations_user on table_reservations(user_id, created_at desc);
create index idx_rewards_user_claimed on rewards(user_id, claimed_at);
create index idx_scans_event_created on scans(event_id, created_at desc);
create index idx_admin_ticket_actions_ticket on admin_ticket_actions(ticket_id, created_at desc);
create index idx_fraud_event_created on fraud_logs(event_id, created_at desc);
create index idx_comments_event_created on comments(event_id, created_at desc);
create index idx_analytics_metric_recorded on analytics(metric, recorded_at desc);

create or replace view event_cards as
select
  e.id,
  e.title,
  e.slug,
  e.venue_name,
  e.city,
  e.starts_at,
  e.cover_url,
  e.vip,
  e.trending_score,
  coalesce(min(tt.price_cents), 0) as min_price
from events e
left join ticket_types tt on tt.event_id = e.id
where e.status in ('published', 'live')
group by e.id;

insert into vip_levels (name, rank, benefits) values
  ('Pulse', 1, '{"discount": 5, "queue": "standard"}'),
  ('Prism', 2, '{"discount": 10, "queue": "fast"}'),
  ('Apex', 3, '{"discount": 15, "queue": "vip", "concierge": true}')
on conflict do nothing;
