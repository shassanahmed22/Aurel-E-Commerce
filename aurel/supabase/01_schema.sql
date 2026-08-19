-- AUREL — core schema
-- Run in order: 01_schema.sql -> 02_rls.sql -> 03_functions.sql -> 04_storage.sql

create extension if not exists "uuid-ossp";
create extension if not exists "citext";

-- ─────────────────────────────────────────────
-- ROLES & PROFILES
-- ─────────────────────────────────────────────
create type user_role as enum ('customer', 'staff', 'admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'customer',
  phone text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- CATALOG
-- ─────────────────────────────────────────────
create table collections (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  subtitle text,
  description text,
  palette jsonb not null default '{}'::jsonb,
  hero_image_path text,
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table scent_notes (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  note_type text not null check (note_type in ('top', 'heart', 'base')),
  description text
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  collection_id uuid not null references collections(id) on delete restrict,
  slug text unique not null,
  name text not null,
  sku_prefix text not null,
  short_description text,
  story text,
  concentration text check (concentration in ('parfum', 'eau_de_parfum', 'eau_de_toilette', 'extrait')),
  ingredients text,
  price_cents int not null check (price_cents >= 0),
  currency text not null default 'usd',
  is_published boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  sku text unique not null,
  volume_ml int not null check (volume_ml > 0),
  price_cents int not null check (price_cents >= 0),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table product_scent_notes (
  product_id uuid not null references products(id) on delete cascade,
  scent_note_id uuid not null references scent_notes(id) on delete cascade,
  primary key (product_id, scent_note_id)
);

create table product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  alt_text text not null,
  source_name text,
  creator_name text,
  license text,
  sort_order int not null default 0
);

create table product_3d_assets (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  format text not null default 'glb',
  polycount int,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- INVENTORY
-- ─────────────────────────────────────────────
create table inventory (
  variant_id uuid primary key references product_variants(id) on delete cascade,
  on_hand int not null default 0 check (on_hand >= 0),
  reserved int not null default 0 check (reserved >= 0),
  updated_at timestamptz not null default now()
);

create type inventory_movement_type as enum ('restock', 'sale', 'reservation', 'release', 'adjustment');

create table inventory_movements (
  id uuid primary key default uuid_generate_v4(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  movement_type inventory_movement_type not null,
  quantity int not null,
  reference_order_id uuid,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- CART / WISHLIST
-- ─────────────────────────────────────────────
create table carts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'converted', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cart_items (
  id uuid primary key default uuid_generate_v4(),
  cart_id uuid not null references carts(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete restrict,
  quantity int not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table wishlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table wishlist_items (
  id uuid primary key default uuid_generate_v4(),
  wishlist_id uuid not null references wishlists(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

-- ─────────────────────────────────────────────
-- ADDRESSES / ORDERS / PAYMENTS
-- ─────────────────────────────────────────────
create table addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  full_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  region text,
  postal_code text not null,
  country text not null,
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create type order_status as enum (
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique not null,
  user_id uuid references profiles(id),
  status order_status not null default 'pending',
  email text not null,
  shipping_address jsonb not null,
  billing_address jsonb,
  subtotal_cents int not null,
  discount_cents int not null default 0,
  shipping_cents int not null default 0,
  tax_cents int not null default 0,
  total_cents int not null,
  currency text not null default 'usd',
  coupon_id uuid,
  stripe_payment_intent_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid references product_variants(id),
  -- snapshotted at purchase time — never joined live for historical accuracy
  product_name text not null,
  variant_label text not null,
  sku text not null,
  unit_price_cents int not null,
  quantity int not null check (quantity > 0),
  line_total_cents int not null
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  stripe_payment_intent_id text unique not null,
  status text not null,
  amount_cents int not null,
  currency text not null default 'usd',
  created_at timestamptz not null default now()
);

create table payment_events (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid references payments(id) on delete set null,
  stripe_event_id text unique not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- COUPONS
-- ─────────────────────────────────────────────
create table coupons (
  id uuid primary key default uuid_generate_v4(),
  code citext unique not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value int not null check (discount_value > 0),
  min_order_cents int not null default 0,
  max_redemptions int,
  redemption_count int not null default 0,
  applies_to_collection_id uuid references collections(id),
  applies_to_product_id uuid references products(id),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true
);

alter table orders add constraint orders_coupon_fk foreign key (coupon_id) references coupons(id);

create table coupon_redemptions (
  id uuid primary key default uuid_generate_v4(),
  coupon_id uuid not null references coupons(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  user_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (coupon_id, order_id)
);

-- ─────────────────────────────────────────────
-- REVIEWS / CONTENT
-- ─────────────────────────────────────────────
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  order_item_id uuid references order_items(id),
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  is_verified_purchase boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create table journal_posts (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  excerpt text,
  body text not null,
  cover_image_path text,
  author_id uuid references profiles(id),
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email citext unique not null,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index idx_products_collection on products(collection_id);
create index idx_products_published on products(is_published) where is_published = true;
create index idx_variants_product on product_variants(product_id);
create index idx_cart_items_cart on cart_items(cart_id);
create index idx_orders_user on orders(user_id);
create index idx_orders_status on orders(status);
create index idx_order_items_order on order_items(order_id);
create index idx_reviews_product on reviews(product_id) where is_published = true;
create index idx_inventory_movements_variant on inventory_movements(variant_id);
create index idx_journal_published on journal_posts(is_published, published_at desc);
