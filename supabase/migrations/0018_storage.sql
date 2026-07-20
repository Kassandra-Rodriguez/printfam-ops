-- File storage for the `attachments` table (docs/data_model.md "Files",
-- docs/architecture.md #8). One private bucket, objects namespaced by
-- organization id as the first path segment: attachments/<organization_id>/<uuid>-<name>.
-- RLS on storage.objects mirrors every other table's tenant-isolation pattern —
-- membership in the org named by the path's first segment, nothing else.

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy attachments_bucket_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and app_private.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy attachments_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and app_private.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy attachments_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and app_private.is_org_member(((storage.foldername(name))[1])::uuid)
  );
