-- Run this entire file in Supabase SQL Editor

create table if not exists users (
  id text primary key, full_name text, email text unique, phone text unique,
  password_hash text, phone_verified boolean default false,
  email_verified boolean default false, created_at timestamptz default now()
);

create table if not exists addresses (
  id text primary key, user_id text references users(id) on delete cascade,
  label text default 'HOME', line1 text, line2 text, city text default 'Lucknow',
  pincode text, lat float, lng float, is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists catalog_items (
  id text primary key, type text, spice_form text, name text, description text,
  unit text default 'kg', price_per_unit float, grinding_charge_per_unit float default 0,
  grinding_yield_factor float default 1.0, is_active boolean default true, sort_order int default 99,
  created_at timestamptz default now()
);

create table if not exists inventory (
  id text primary key default gen_random_uuid()::text,
  catalog_item_id text references catalog_items(id), available float default 0,
  reserved float default 0, threshold float default 5, unique(catalog_item_id)
);

create table if not exists blends (
  id text primary key, user_id text references users(id) on delete cascade,
  name text, type text, is_public boolean default false, is_curated boolean default false,
  sort_order int default 99, created_at timestamptz default now()
);

create table if not exists blend_components (
  id text primary key default gen_random_uuid()::text,
  blend_id text references blends(id) on delete cascade,
  catalog_item_id text, percentage float, quantity_grams float
);

create table if not exists orders (
  id text primary key, order_number text unique, user_id text, user_name text,
  user_phone text, address_id text, status text default 'AWAITING_APPROVAL',
  delivery_date timestamptz, subtotal float, grinding_charge float default 0,
  delivery_charge float default 0, total float, payment_id text, payment_method text default 'cod',
  placed_at timestamptz default now(), status_history jsonb default '[]'
);

create table if not exists order_line_items (
  id text primary key default gen_random_uuid()::text,
  order_id text references orders(id) on delete cascade,
  name text, type text, quantity_kg float, subtotal float, grinding_charge float, components jsonb
);

create table if not exists otps (
  phone text primary key, otp text, created_at timestamptz default now()
);

create table if not exists system_config (
  key text primary key, value text
);

-- Indexes
create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_addresses_user_id on addresses(user_id);
create index if not exists idx_blends_user_id on blends(user_id);

-- Seed config
insert into system_config values ('cutoff_hour','12'),('min_flour','150'),('min_spice','80'),('del_base','30'),('del_per_kg','3'),('free_above','600') on conflict (key) do nothing;

-- Seed catalog
insert into catalog_items (id,type,name,description,price_per_unit,grinding_charge_per_unit,grinding_yield_factor,sort_order) values
  ('g-sharbati','GRAIN','Sharbati Wheat','Premium golden wheat from MP, perfect for soft rotis',46,5,1.0,1),
  ('g-lokwan','GRAIN','Lokwan Wheat','Robust Maharashtra wheat with earthy flavor',40,5,1.0,2),
  ('g-soybean','GRAIN','Soybean','High-protein addition for multigrain blends',80,7,1.0,3),
  ('g-barley','GRAIN','Barley (Jau)','Fiber-rich, great for diabetic-friendly mixes',55,6,1.0,4),
  ('g-jowar','GRAIN','Jowar (Sorghum)','Gluten-free millet, light and nutritious',65,6,1.0,5),
  ('g-bajra','GRAIN','Bajra (Pearl Millet)','Iron-rich winter favorite',50,5,1.0,6),
  ('s-haldi','SPICE','Turmeric (Haldi)','Maximum curcumin when freshly ground',180,12,0.92,1),
  ('s-dhaniya','SPICE','Coriander (Dhaniya)','Fragrant, milled to order',120,8,0.90,2),
  ('s-jeera','SPICE','Cumin (Jeera)','Earthy and aromatic',220,10,0.93,3),
  ('s-mirch','SPICE','Red Chilli (Lal Mirch)','Medium heat, vivid color',200,10,0.88,4),
  ('s-pepper','SPICE','Black Pepper (Kali Mirch)','Bold, pungent, freshly ground',600,15,0.95,5)
on conflict (id) do nothing;

-- Seed inventory
insert into inventory (catalog_item_id,available,threshold) values
  ('g-sharbati',50,10),('g-lokwan',50,10),('g-soybean',20,5),('g-barley',30,10),
  ('g-jowar',25,10),('g-bajra',30,10),('s-haldi',3,0.5),('s-dhaniya',3,0.5),
  ('s-jeera',2,0.5),('s-mirch',2,0.5),('s-pepper',1,0.3)
on conflict (catalog_item_id) do nothing;

-- Seed curated blends
insert into blends (id,user_id,name,type,is_public,is_curated,sort_order) values
  ('b-sharbati',null,'Pure Sharbati','FLOUR',true,true,1),
  ('b-multigrain',null,'MP Multigrain','FLOUR',true,true,2),
  ('b-diabetic',null,'Diabetic Friendly','FLOUR',true,true,3),
  ('b-garam',null,'House Garam Masala','SPICE',true,true,1)
on conflict (id) do nothing;

insert into blend_components (blend_id,catalog_item_id,percentage,quantity_grams) values
  ('b-sharbati','g-sharbati',100,null),
  ('b-multigrain','g-sharbati',70,null),('b-multigrain','g-soybean',20,null),('b-multigrain','g-barley',10,null),
  ('b-diabetic','g-jowar',40,null),('b-diabetic','g-bajra',30,null),('b-diabetic','g-barley',20,null),('b-diabetic','g-soybean',10,null),
  ('b-garam','s-jeera',null,50),('b-garam','s-dhaniya',null,100),('b-garam','s-pepper',null,25)
on conflict do nothing;

-- RLS
alter table catalog_items enable row level security;
alter table blends enable row level security;
alter table blend_components enable row level security;
alter table inventory enable row level security;
alter table orders enable row level security;
alter table order_line_items enable row level security;
alter table users enable row level security;
alter table addresses enable row level security;
alter table otps enable row level security;
alter table system_config enable row level security;

-- Public reads
create policy if not exists "pub read catalog" on catalog_items for select using (true);
create policy if not exists "pub read blends" on blends for select using (true);
create policy if not exists "pub read blend_components" on blend_components for select using (true);
create policy if not exists "pub read inventory" on inventory for select using (true);
create policy if not exists "pub read config" on system_config for select using (true);

-- Open writes for MVP
create policy if not exists "open users" on users for all using (true) with check (true);
create policy if not exists "open addresses" on addresses for all using (true) with check (true);
create policy if not exists "open orders" on orders for all using (true) with check (true);
create policy if not exists "open order_items" on order_line_items for all using (true) with check (true);
create policy if not exists "open otps" on otps for all using (true) with check (true);
create policy if not exists "open inventory" on inventory for all using (true) with check (true);
create policy if not exists "open catalog" on catalog_items for all using (true) with check (true);
create policy if not exists "open blends" on blends for all using (true) with check (true);
create policy if not exists "open blend_components" on blend_components for all using (true) with check (true);
create policy if not exists "open config" on system_config for all using (true) with check (true);
