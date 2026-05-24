insert into users (id, email, password_hash, display_name, role, email_verified_at)
values
  ('00000000-0000-0000-0000-000000000001', 'admin@gen.mx', crypt('GenDemo123!', gen_salt('bf', 12)), 'GEN Admin', 'super_admin', now()),
  ('00000000-0000-0000-0000-000000000002', 'staff@gen.mx', crypt('GenDemo123!', gen_salt('bf', 12)), 'Door Lead', 'staff', now()),
  ('00000000-0000-0000-0000-000000000003', 'organizer@gen.mx', crypt('GenDemo123!', gen_salt('bf', 12)), 'Nexus Events', 'organizer', now()),
  ('00000000-0000-0000-0000-000000000004', 'fan@gen.mx', crypt('GenDemo123!', gen_salt('bf', 12)), 'Fan GEN', 'guest', now()),
  ('00000000-0000-0000-0000-000000000005', 'security@gen.mx', crypt('GenDemo123!', gen_salt('bf', 12)), 'Security Lead', 'security', now()),
  ('00000000-0000-0000-0000-000000000006', 'vendor@gen.mx', crypt('GenDemo123!', gen_salt('bf', 12)), 'Bar Vendor', 'vendor', now())
on conflict (email) do nothing;

insert into staff_profiles (user_id, staff_type, permissions)
values
  ('00000000-0000-0000-0000-000000000002', 'staff', '{"scan": true, "manual_checkin": true}'),
  ('00000000-0000-0000-0000-000000000005', 'security', '{"scan": true, "fraud_alerts": true}'),
  ('00000000-0000-0000-0000-000000000006', 'vendor', '{"pickup": true, "orders": true}')
on conflict (user_id) do nothing;

insert into events (id, organizer_id, title, slug, description, cover_url, venue_name, city, starts_at, capacity, vip, status, trending_score)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'GENESIS Neon Garden', 'genesis-neon-garden', 'Jardin nocturno con visuales holograficos y lineup internacional.', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=80', 'Foro Cosmos', 'CDMX', now() + interval '34 days', 10000, true, 'published', 98.4),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Boiler Skyline Session', 'boiler-skyline-session', 'Sesion 360 en rooftop con streaming privado.', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80', 'Distrito V', 'Guadalajara', now() + interval '41 days', 2800, false, 'published', 88.2)
on conflict (slug) do nothing;

insert into ticket_types (event_id, name, tier, price_cents, quantity, benefits)
values
  ('10000000-0000-0000-0000-000000000001', 'General Wave 1', 'general', 98000, 6000, '{"access": "general"}'),
  ('10000000-0000-0000-0000-000000000001', 'VIP Prism', 'vip', 248000, 1200, '{"queue": "fast", "zone": "vip"}'),
  ('10000000-0000-0000-0000-000000000002', 'Backstage Circle', 'backstage', 164000, 300, '{"zone": "backstage", "meet": true}')
on conflict do nothing;

insert into event_zones (event_id, name, zone_type, capacity, map_geometry, color)
values
  ('10000000-0000-0000-0000-000000000001', 'General Floor', 'general', 7000, '{"shape":"polygon","points":[[0,0],[70,0],[70,70],[0,70]]}', '#00d4ff'),
  ('10000000-0000-0000-0000-000000000001', 'Prism VIP', 'vip', 1200, '{"shape":"rect","x":72,"y":8,"w":20,"h":42}', '#ff2bd6'),
  ('10000000-0000-0000-0000-000000000001', 'Backstage Gate', 'backstage', 300, '{"shape":"rect","x":78,"y":54,"w":18,"h":18}', '#c7ff3d')
on conflict (event_id, name) do nothing;

insert into venue_tables (event_id, zone_id, label, min_spend_cents, seats, status, position_x, position_y)
select
  '10000000-0000-0000-0000-000000000001',
  ez.id,
  table_label,
  min_spend,
  seats,
  'available',
  pos_x,
  pos_y
from (
  values
    ('VIP-01', 650000, 6, 76.5, 18.0),
    ('VIP-02', 820000, 8, 84.0, 18.0),
    ('VIP-03', 1200000, 10, 80.0, 32.0)
) as seed(table_label, min_spend, seats, pos_x, pos_y)
join event_zones ez on ez.event_id = '10000000-0000-0000-0000-000000000001' and ez.name = 'Prism VIP'
on conflict (event_id, label) do nothing;

insert into merchant_accounts (id, owner_user_id, name, provider, provider_account_id, settlement_metadata)
values (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'GEN Central Settlement',
  'stripe',
  'acct_demo_gen_central',
  '{"settlement": "centralized", "description": "Todas las compras de asistentes se liquidan a esta cuenta principal."}'
)
on conflict do nothing;

insert into products (event_id, name, description, category, image_url, price_cents, stock, pickup_zone)
values
  ('10000000-0000-0000-0000-000000000001', 'Neon Water', 'Agua premium fria lista para recoger.', 'bebidas', 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=900&q=80', 6500, 800, 'Bar Express A'),
  ('10000000-0000-0000-0000-000000000001', 'Pulse Tonic', 'Mocktail azul electrico sin alcohol.', 'bebidas', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80', 14000, 420, 'Bar Express A'),
  ('10000000-0000-0000-0000-000000000001', 'Midnight Snack Box', 'Snack salado para recargar energia.', 'snacks', 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=900&q=80', 18000, 260, 'Pick-up Lounge'),
  ('10000000-0000-0000-0000-000000000002', 'Skyline Soda', 'Refresco artesanal frio.', 'bebidas', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80', 9000, 300, 'Rooftop Bar')
on conflict (event_id, name) do nothing;
