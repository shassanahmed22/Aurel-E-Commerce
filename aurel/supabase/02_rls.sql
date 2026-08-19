-- AUREL — Row Level Security
-- Principle: deny by default, then open the minimum needed.
-- Public = anonymous + authenticated reading published content.
-- Owner = authenticated user reading/writing their own rows.
-- Staff/Admin = elevated write access via helper functions below.

-- ─────────────────────────────────────────────
-- HELPERS
-- ─────────────────────────────────────────────
create or replace function is_staff_or_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Enable RLS everywhere it's needed.
alter table profiles enable row level security;
alter table collections enable row level security;
alter table scent_notes enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_scent_notes enable row level security;
alter table product_images enable row level security;
alter table product_3d_assets enable row level security;
alter table inventory enable row level security;
alter table inventory_movements enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;
alter table wishlists enable row level security;
alter table wishlist_items enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table payment_events enable row level security;
alter table coupons enable row level security;
alter table coupon_redemptions enable row level security;
alter table reviews enable row level security;
alter table journal_posts enable row level security;
alter table newsletter_subscribers enable row level security;
alter table audit_logs enable row level security;

-- ─────────────────────────────────────────────
-- PROFILES — a user reads/updates only their own row; role is never
-- self-editable (only staff/admin, via a separate service-role path).
-- ─────────────────────────────────────────────
create policy "profile self read" on profiles for select using (id = auth.uid() or is_staff_or_admin());
create policy "profile self update (no role change)" on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles p where p.id = auth.uid()));
create policy "staff manage profiles" on profiles for all using (is_staff_or_admin()) with check (is_staff_or_admin());

-- ─────────────────────────────────────────────
-- CATALOG — public reads published rows only; staff/admin manage all.
-- ─────────────────────────────────────────────
create policy "public read published collections" on collections for select using (is_published or is_staff_or_admin());
create policy "staff manage collections" on collections for insert with check (is_staff_or_admin());
create policy "staff update collections" on collections for update using (is_staff_or_admin());
create policy "staff delete collections" on collections for delete using (is_staff_or_admin());

create policy "public read scent notes" on scent_notes for select using (true);
create policy "staff manage scent notes" on scent_notes for all using (is_staff_or_admin()) with check (is_staff_or_admin());

create policy "public read published products" on products for select using (is_published or is_staff_or_admin());
create policy "staff manage products" on products for insert with check (is_staff_or_admin());
create policy "staff update products" on products for update using (is_staff_or_admin());
create policy "staff delete products" on products for delete using (is_staff_or_admin());

create policy "public read variants of published products" on product_variants for select
  using (exists (select 1 from products p where p.id = product_id and (p.is_published or is_staff_or_admin())));
create policy "staff manage variants" on product_variants for all using (is_staff_or_admin()) with check (is_staff_or_admin());

create policy "public read product notes" on product_scent_notes for select using (true);
create policy "staff manage product notes" on product_scent_notes for all using (is_staff_or_admin()) with check (is_staff_or_admin());

create policy "public read product images" on product_images for select using (true);
create policy "staff manage product images" on product_images for all using (is_staff_or_admin()) with check (is_staff_or_admin());

create policy "public read 3d assets" on product_3d_assets for select using (true);
create policy "staff manage 3d assets" on product_3d_assets for all using (is_staff_or_admin()) with check (is_staff_or_admin());

-- ─────────────────────────────────────────────
-- INVENTORY — staff/admin only. Customers never see raw stock rows;
-- availability is derived server-side into product responses instead.
-- ─────────────────────────────────────────────
create policy "staff read inventory" on inventory for select using (is_staff_or_admin());
create policy "staff manage inventory" on inventory for all using (is_staff_or_admin()) with check (is_staff_or_admin());
create policy "staff read inventory movements" on inventory_movements for select using (is_staff_or_admin());
create policy "staff write inventory movements" on inventory_movements for insert with check (is_staff_or_admin());

-- ─────────────────────────────────────────────
-- CART / WISHLIST — strictly owner-only.
-- ─────────────────────────────────────────────
create policy "own cart" on carts for select using (user_id = auth.uid());
create policy "create own cart" on carts for insert with check (user_id = auth.uid());
create policy "update own cart" on carts for update using (user_id = auth.uid());
create policy "delete own cart" on carts for delete using (user_id = auth.uid());

create policy "own cart items" on cart_items for select
  using (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy "manage own cart items" on cart_items for insert
  with check (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy "update own cart items" on cart_items for update
  using (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy "delete own cart items" on cart_items for delete
  using (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()));

create policy "own wishlist" on wishlists for select using (user_id = auth.uid());
create policy "create own wishlist" on wishlists for insert with check (user_id = auth.uid());
create policy "delete own wishlist" on wishlists for delete using (user_id = auth.uid());

create policy "own wishlist items" on wishlist_items for select
  using (exists (select 1 from wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));
create policy "manage own wishlist items" on wishlist_items for insert
  with check (exists (select 1 from wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));
create policy "delete own wishlist items" on wishlist_items for delete
  using (exists (select 1 from wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- ADDRESSES — owner-only.
-- ─────────────────────────────────────────────
create policy "own addresses" on addresses for select using (user_id = auth.uid());
create policy "create own addresses" on addresses for insert with check (user_id = auth.uid());
create policy "update own addresses" on addresses for update using (user_id = auth.uid());
create policy "delete own addresses" on addresses for delete using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- ORDERS — a customer sees only their own orders. All writes happen
-- server-side (service role) after payment verification; there is no
-- customer insert/update policy, deliberately.
-- ─────────────────────────────────────────────
create policy "own orders" on orders for select using (user_id = auth.uid() or is_staff_or_admin());
create policy "staff manage orders" on orders for update using (is_staff_or_admin());

create policy "own order items" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff_or_admin())));

create policy "own payments" on payments for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff_or_admin())));

create policy "staff read payment events" on payment_events for select using (is_staff_or_admin());
-- payment_events is written exclusively by the webhook handler via the
-- service-role client, which bypasses RLS by design — no insert policy here.

-- ─────────────────────────────────────────────
-- COUPONS — public may validate an active coupon by code (read-only,
-- no discount math trusted from the client); staff manage.
-- ─────────────────────────────────────────────
create policy "public read active coupons" on coupons for select
  using (is_active and (expires_at is null or expires_at > now()));
create policy "staff manage coupons" on coupons for all using (is_staff_or_admin()) with check (is_staff_or_admin());

create policy "own coupon redemptions" on coupon_redemptions for select
  using (user_id = auth.uid() or is_staff_or_admin());
create policy "staff read all redemptions" on coupon_redemptions for select using (is_staff_or_admin());

-- ─────────────────────────────────────────────
-- REVIEWS — public reads published reviews; a signed-in verified
-- purchaser may write their own; staff can moderate.
-- ─────────────────────────────────────────────
create policy "public read published reviews" on reviews for select using (is_published or is_staff_or_admin());
create policy "verified purchaser can review" on reviews for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from order_items oi
      join orders o on o.id = oi.order_id
      where oi.id = order_item_id and o.user_id = auth.uid() and o.status in ('delivered', 'confirmed', 'shipped')
    )
  );
create policy "own review update" on reviews for update using (user_id = auth.uid() or is_staff_or_admin());
create policy "own review delete" on reviews for delete using (user_id = auth.uid() or is_staff_or_admin());

-- ─────────────────────────────────────────────
-- JOURNAL — public reads published posts; staff manage.
-- ─────────────────────────────────────────────
create policy "public read published posts" on journal_posts for select using (is_published or is_staff_or_admin());
create policy "staff manage posts" on journal_posts for all using (is_staff_or_admin()) with check (is_staff_or_admin());

-- ─────────────────────────────────────────────
-- NEWSLETTER — anyone may insert (subscribe); no read/update/delete
-- for anon/authenticated — prevents scraping the subscriber list.
-- ─────────────────────────────────────────────
create policy "anyone can subscribe" on newsletter_subscribers for insert with check (true);
create policy "staff read subscribers" on newsletter_subscribers for select using (is_staff_or_admin());

-- ─────────────────────────────────────────────
-- AUDIT LOGS — admin read-only from the client; all writes come from
-- server-side triggers/functions via service role.
-- ─────────────────────────────────────────────
create policy "admin read audit logs" on audit_logs for select using (is_admin());
