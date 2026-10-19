-- Schema Supabase. Nội dung từ Excel nằm ở courses/lessons/vocabulary; các bảng còn lại sẵn sàng để bổ sung dữ liệu sau.
create table courses(id int primary key, title text not null);
create table lessons(id text primary key, course_id int references courses on delete cascade, position int not null, title text not null);
create table vocabulary(id text primary key, lesson_id text references lessons on delete cascade, position int not null,
  hanzi text not null, pinyin text not null, meaning_vi text not null, word_class text,
  example_zh text, example_pinyin text, example_vi text);
create table grammar(id uuid primary key default gen_random_uuid(), lesson_id text references lessons on delete cascade,
  structure text not null, explanation_vi text, example_zh text, example_pinyin text, example_vi text);
create table sentences(id uuid primary key default gen_random_uuid(), lesson_id text references lessons on delete cascade,
  zh text not null, pinyin text, meaning_vi text, note text);
create table dialogues(id uuid primary key default gen_random_uuid(), lesson_id text references lessons on delete cascade,
  position int not null, speaker text, zh text not null, pinyin text, meaning_vi text);
create table exercises(id uuid primary key default gen_random_uuid(), lesson_id text references lessons on delete cascade,
  kind text not null, prompt text not null, answer text not null, explanation text);
create table exercise_options(id uuid primary key default gen_random_uuid(), exercise_id uuid references exercises on delete cascade, text text not null);
create table user_progress(user_id uuid references auth.users on delete cascade, lesson_id text references lessons on delete cascade,
  best_score int default 0, attempts int default 0, completed_at timestamptz, primary key(user_id, lesson_id));
create table user_answers(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade,
  vocabulary_id text references vocabulary, correct boolean not null, answered_at timestamptz default now());
create table review_words(user_id uuid references auth.users on delete cascade, vocabulary_id text references vocabulary on delete cascade,
  remembered boolean default false, updated_at timestamptz default now(), primary key(user_id, vocabulary_id));
create table admins(user_id uuid primary key references auth.users);

alter table user_progress enable row level security; alter table user_answers enable row level security; alter table review_words enable row level security;
create policy own_progress on user_progress for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy own_answers on user_answers for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy own_review on review_words for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
