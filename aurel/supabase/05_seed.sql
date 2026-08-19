-- AUREL — demo seed data (optional). Run after 01-04.
-- This is sample content for local development/demo only — swap for
-- your real catalog before launch; the app never hardcodes product
-- data in code, only in this seed script.

insert into collections (slug, name, subtitle, description, palette, is_published, sort_order) values
  ('forest', 'Forest — Verdant', 'Cedar, Moss, Green Tea, Vetiver', 'A layered paper forest of cedar and moss, lit by filtered sunlight.', '{"DEFAULT":"#3F4D38","accent":"#89927A"}', true, 1),
  ('tide', 'Tide — Tideline', 'Sea Salt, Bergamot, Driftwood, Musk', 'A misted shoreline of driftwood and salt air under moonlight.', '{"DEFAULT":"#4B6167","accent":"#B9C4C1"}', true, 2),
  ('dusk', 'Dusk — Ember', 'Amber, Saffron, Sandalwood, Smoke', 'A mountain at sunset — long shadows, warm amber light.', '{"DEFAULT":"#713F43","accent":"#C97B4A"}', true, 3),
  ('bloom', 'Bloom — Iris', 'Iris, Rose, Fig, White Musk', 'A botanical garden at first light — iris, rose, and soft green.', '{"DEFAULT":"#8C6B72","accent":"#D8C6B8"}', true, 4),
  ('earth', 'Earth — Noir', 'Oud, Leather, Sandalwood, Amber', 'A desert stone landscape, warm shadows and dry heat.', '{"DEFAULT":"#4A3B30","accent":"#A86F55"}', true, 5)
on conflict (slug) do nothing;

insert into scent_notes (name, note_type) values
  ('Cedar', 'base'), ('Moss', 'base'), ('Green Tea', 'top'), ('Vetiver', 'base'),
  ('Sea Salt', 'top'), ('Bergamot', 'top'), ('Driftwood', 'base'), ('Musk', 'base'),
  ('Amber', 'base'), ('Saffron', 'top'), ('Sandalwood', 'heart'), ('Smoke', 'base'),
  ('Iris', 'heart'), ('Rose', 'heart'), ('Fig', 'top'), ('White Musk', 'base'),
  ('Oud', 'base'), ('Leather', 'base')
on conflict (name) do nothing;

-- One representative product per collection, with two variants each.
-- Extend this pattern to reach 6-8 products per collection for a full demo.
do $$
declare
  v_collection record;
  v_product_id uuid;
  v_variant_id uuid;
  v_note_id uuid;
begin
  for v_collection in select id, slug, name from collections loop
    insert into products (collection_id, slug, name, sku_prefix, short_description, story, concentration, ingredients, price_cents, is_published, seo_title, seo_description)
    values (
      v_collection.id,
      v_collection.slug || '-signature',
      initcap(v_collection.slug) || ' Signature',
      upper(left(v_collection.slug, 3)) || '-SIG',
      'The signature fragrance of the ' || v_collection.name || ' collection.',
      'Composed as an entry point into the ' || v_collection.name || ' world, built around its defining notes.',
      'eau_de_parfum',
      'Alcohol denat., Parfum (Fragrance), Aqua (Water), Limonene, Linalool.',
      12000,
      true,
      initcap(v_collection.slug) || ' Signature — AUREL',
      'Discover the signature fragrance of the ' || v_collection.name || ' collection from AUREL.'
    )
    returning id into v_product_id;

    insert into product_variants (product_id, sku, volume_ml, price_cents, is_default)
    values
      (v_product_id, upper(left(v_collection.slug,3)) || '-SIG-50', 50, 12000, true),
      (v_product_id, upper(left(v_collection.slug,3)) || '-SIG-100', 100, 18000, false);

    insert into inventory (variant_id, on_hand, reserved)
    select id, 40, 0 from product_variants where product_id = v_product_id;

    -- link two scent notes arbitrarily for demo purposes
    for v_note_id in select id from scent_notes order by random() limit 3 loop
      insert into product_scent_notes (product_id, scent_note_id) values (v_product_id, v_note_id)
      on conflict do nothing;
    end loop;
  end loop;
end $$;
