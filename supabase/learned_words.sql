-- Lưu từ đã học theo từng tài khoản. Chạy 1 lần trong SQL Editor.
create table if not exists learned_words(
  user_id uuid references auth.users on delete cascade,
  vocabulary_id text references vocabulary on delete cascade,
  primary key(user_id, vocabulary_id));
alter table learned_words enable row level security;
create policy own_learned on learned_words for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
