-- MỤC HỌC CỦA CHỊ THỦY: chỉ tài khoản được admin cấp quyền (hoặc admin) mới xem được.
-- Chạy 1 lần trong SQL Editor, SAU auth_admin.sql (cần hàm is_admin()).

create table if not exists course_access(
  user_id uuid primary key references auth.users on delete cascade,
  granted_at timestamptz default now());
create table if not exists course_materials(
  id uuid primary key default gen_random_uuid(),
  title text not null, file_path text not null, position int not null default 0,
  created_at timestamptz default now());

create or replace function has_course_access() returns boolean
language sql security definer stable set search_path=public as
$$ select is_admin() or exists(select 1 from course_access where user_id = auth.uid()) $$;

alter table course_access enable row level security;
alter table course_materials enable row level security;
create policy own_access on course_access for select using (user_id = auth.uid());
create policy admin_access on course_access for all using (is_admin()) with check (is_admin());
create policy read_materials on course_materials for select using (has_course_access());
create policy admin_materials on course_materials for all using (is_admin()) with check (is_admin());

-- Kho lưu file PDF (riêng tư, tối đa 50 MB/file)
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('thuy-course', 'thuy-course', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;
create policy thuy_read on storage.objects for select using (bucket_id = 'thuy-course' and has_course_access());
create policy thuy_insert on storage.objects for insert with check (bucket_id = 'thuy-course' and is_admin());
create policy thuy_update on storage.objects for update using (bucket_id = 'thuy-course' and is_admin());
create policy thuy_delete on storage.objects for delete using (bucket_id = 'thuy-course' and is_admin());

-- Hàm cho trang Admin: xem danh sách tài khoản và bật/tắt quyền
create or replace function admin_course_users() returns table(user_id uuid, email text, has_access boolean)
language sql security definer set search_path=public as $$
  select u.id, u.email::text, (a.user_id is not null)
  from auth.users u left join course_access a on a.user_id = u.id
  where is_admin() order by u.email $$;

create or replace function admin_set_course_access(p_user uuid, p_allow boolean) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if p_allow then insert into course_access(user_id) values (p_user) on conflict do nothing;
  else delete from course_access where user_id = p_user; end if;
end $$;
