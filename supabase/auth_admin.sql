-- Chạy SAU schema.sql và seed.sql. Phân quyền đọc/ghi + hàm cho trang Admin.
create or replace function is_admin() returns boolean language sql security definer stable set search_path=public as
$$ select exists(select 1 from admins where user_id = auth.uid()) $$;

alter table admins enable row level security;
create policy admin_self on admins for select using (user_id = auth.uid());

do $$ declare t text; begin
  foreach t in array array['courses','lessons','vocabulary','grammar','sentences','dialogues','exercises','exercise_options'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy read_%1$s on %1$I for select using (true)', t);
    execute format('create policy write_%1$s on %1$I for all using (is_admin()) with check (is_admin())', t);
  end loop; end $$;

create policy admin_read_progress on user_progress for select using (is_admin());

create or replace function admin_learners() returns table(email text, lessons_done bigint, attempts bigint, avg_score numeric)
language sql security definer set search_path=public as $$
  select u.email::text, count(p.lesson_id), coalesce(sum(p.attempts),0)::bigint, coalesce(round(avg(p.best_score)),0)
  from auth.users u left join user_progress p on p.user_id = u.id where is_admin() group by u.id, u.email $$;

-- Cấp quyền admin cho bạn (thay UUID lấy ở Authentication > Users):
-- insert into admins(user_id) values ('UUID-CUA-BAN');
