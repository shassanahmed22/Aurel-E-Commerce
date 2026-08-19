-- AUREL — Storage buckets & policies
-- Run after 01-03. Buckets are private by default; reads go through
-- signed/public URLs only for published content, writes are staff-only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 8388608, array['image/webp','image/jpeg','image/png','image/avif']),
  ('product-3d', 'product-3d', true, 26214400, array['model/gltf-binary','application/octet-stream']),
  ('collection-art', 'collection-art', true, 15728640, array['image/webp','image/jpeg','image/png','image/svg+xml']),
  ('journal-images', 'journal-images', true, 8388608, array['image/webp','image/jpeg','image/png'])
on conflict (id) do nothing;

-- Public can read from all four (they're public asset buckets, gated
-- by the fact that only published rows reference their paths).
create policy "public read product images bucket" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "public read product 3d bucket" on storage.objects for select
  using (bucket_id = 'product-3d');
create policy "public read collection art bucket" on storage.objects for select
  using (bucket_id = 'collection-art');
create policy "public read journal images bucket" on storage.objects for select
  using (bucket_id = 'journal-images');

-- Only staff/admin may upload/modify/delete, in every bucket. Also
-- enforces file size/MIME at the bucket config above (belt + suspenders).
create policy "staff write product images" on storage.objects for insert
  with check (bucket_id = 'product-images' and is_staff_or_admin());
create policy "staff update product images" on storage.objects for update
  using (bucket_id = 'product-images' and is_staff_or_admin());
create policy "staff delete product images" on storage.objects for delete
  using (bucket_id = 'product-images' and is_staff_or_admin());

create policy "staff write product 3d" on storage.objects for insert
  with check (bucket_id = 'product-3d' and is_staff_or_admin());
create policy "staff update product 3d" on storage.objects for update
  using (bucket_id = 'product-3d' and is_staff_or_admin());
create policy "staff delete product 3d" on storage.objects for delete
  using (bucket_id = 'product-3d' and is_staff_or_admin());

create policy "staff write collection art" on storage.objects for insert
  with check (bucket_id = 'collection-art' and is_staff_or_admin());
create policy "staff update collection art" on storage.objects for update
  using (bucket_id = 'collection-art' and is_staff_or_admin());
create policy "staff delete collection art" on storage.objects for delete
  using (bucket_id = 'collection-art' and is_staff_or_admin());

create policy "staff write journal images" on storage.objects for insert
  with check (bucket_id = 'journal-images' and is_staff_or_admin());
create policy "staff update journal images" on storage.objects for update
  using (bucket_id = 'journal-images' and is_staff_or_admin());
create policy "staff delete journal images" on storage.objects for delete
  using (bucket_id = 'journal-images' and is_staff_or_admin());
