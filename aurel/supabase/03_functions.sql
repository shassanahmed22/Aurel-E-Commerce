-- AUREL — functions & triggers

-- Auto-create a profile row when a new auth user signs up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Keep updated_at fresh on the tables that track it.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger trg_collections_updated before update on collections for each row execute function set_updated_at();
create trigger trg_products_updated before update on products for each row execute function set_updated_at();
create trigger trg_carts_updated before update on carts for each row execute function set_updated_at();
create trigger trg_orders_updated before update on orders for each row execute function set_updated_at();
create trigger trg_journal_updated before update on journal_posts for each row execute function set_updated_at();

-- Atomic, race-safe stock reservation. Called from server code (service
-- role) at checkout time — never trust client-reported availability.
-- Raises an exception (and rolls back) if insufficient stock exists.
create or replace function reserve_stock(p_variant_id uuid, p_quantity int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_available int;
begin
  select on_hand - reserved into v_available
  from inventory
  where variant_id = p_variant_id
  for update; -- row lock prevents concurrent oversell

  if v_available is null then
    raise exception 'No inventory row for variant %', p_variant_id;
  end if;

  if v_available < p_quantity then
    raise exception 'Insufficient stock for variant % (available %, requested %)',
      p_variant_id, v_available, p_quantity;
  end if;

  update inventory set reserved = reserved + p_quantity, updated_at = now()
  where variant_id = p_variant_id;

  insert into inventory_movements (variant_id, movement_type, quantity)
  values (p_variant_id, 'reservation', p_quantity);
end;
$$;

-- Release a reservation (order cancelled/expired before payment).
create or replace function release_stock(p_variant_id uuid, p_quantity int)
returns void language plpgsql security definer set search_path = public as $$
begin
  update inventory set reserved = greatest(reserved - p_quantity, 0), updated_at = now()
  where variant_id = p_variant_id;

  insert into inventory_movements (variant_id, movement_type, quantity)
  values (p_variant_id, 'release', p_quantity);
end;
$$;

-- Convert a reservation into a confirmed sale (payment succeeded).
create or replace function commit_sale(p_variant_id uuid, p_quantity int, p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update inventory
  set on_hand = on_hand - p_quantity, reserved = greatest(reserved - p_quantity, 0), updated_at = now()
  where variant_id = p_variant_id;

  insert into inventory_movements (variant_id, movement_type, quantity, reference_order_id)
  values (p_variant_id, 'sale', p_quantity, p_order_id);
end;
$$;

-- Atomically bump a coupon's redemption counter after a successful order.
create or replace function increment_coupon_redemption(p_coupon_id uuid)
returns void language sql security definer set search_path = public as $$
  update coupons set redemption_count = redemption_count + 1 where id = p_coupon_id;
$$;

-- Generate a human-readable order number, e.g. AUREL-8F3K2Q.
create or replace function generate_order_number()
returns text language sql as $$
  select 'AUREL-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
$$;
