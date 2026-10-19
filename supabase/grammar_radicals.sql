-- Chạy 1 lần trong SQL Editor, SAU auth_admin.sql (cần hàm is_admin()).
create table if not exists grammar_points(id text primary key, level int not null, position int not null,
  nhom text, loai text, sub text, content text not null);
create table if not exists grammar_topics(id text primary key, level int not null, position int not null,
  l1 text, l2 text, l3 text not null);
create table if not exists grammar_tasks(id text primary key, level int not null, position int not null,
  no text, title text not null, bullets text);            -- các ý cách nhau bằng ký tự ¶
create table if not exists radicals(stt int primary key, radical text not null, name text, py text,
  meaning text, strokes int not null);                    -- các đoạn ý nghĩa cách nhau bằng ¶

do $$ declare t text; begin
  foreach t in array array['grammar_points','grammar_topics','grammar_tasks','radicals'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy read_%1$s on %1$I for select using (true)', t);
    execute format('create policy write_%1$s on %1$I for all using (is_admin()) with check (is_admin())', t);
  end loop; end $$;
