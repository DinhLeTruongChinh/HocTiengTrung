-- Lưu nhân vật (tên, kiểu tóc, trang phục…) theo tài khoản để đổi máy vẫn còn. Chạy 1 lần trong SQL Editor.
create table if not exists user_avatars(
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz default now());
alter table user_avatars enable row level security;
create policy own_avatar on user_avatars for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
