-- NỘI DUNG LỚP CHỊ THỦY (bài học, từ vựng, nội dung các trang). Chạy SAU thuy_course.sql.
alter table course_materials add column if not exists slug text;
update course_materials set slug = (array['bai-01-02','bai-03-04','bai-05-06','bai-07-08','bai-09-10','bai-11-12','bai-13-14-15','hsk2-3-0','mai-thao','maithao'])[position]
  where slug is null and position between 1 and 10;

create table if not exists thuy_lessons(id text primary key, title text not null, position int not null, page_count int);
create table if not exists thuy_vocab(id text primary key, lesson_id text, position int not null, hanzi text not null, pinyin text, pos text, meaning text);
create table if not exists thuy_pages(id text primary key, lesson_id text, page int not null, kind text, content text); -- các dòng cách nhau bằng ¶

do $$ declare t text; begin
  foreach t in array array['thuy_lessons','thuy_vocab','thuy_pages'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy read_%1$s on %1$I for select using (has_course_access())', t);
    execute format('create policy write_%1$s on %1$I for all using (is_admin()) with check (is_admin())', t);
  end loop; end $$;
