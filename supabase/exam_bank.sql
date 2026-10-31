-- NGÂN HÀNG ĐỀ THI THỬ HSK (cấu trúc HSK 2.0). Chạy 1 lần trong SQL Editor, SAU auth_admin.sql và thuy_course.sql.
-- Đáp án nằm ở bảng riêng exam_answer_keys: người học KHÔNG đọc được; việc chấm điểm do hàm trên máy chủ thực hiện.

create table if not exists exams(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  level int not null check (level between 1 and 6),
  description text,
  scopes text[] not null default '{main,thuy}',          -- 'main' = trang ngoài, 'thuy' = lớp chị Thủy
  duration_min int not null,
  max_score int not null,                                -- HSK1-2: 200, HSK3-6: 300
  pass_score int not null,                               -- HSK1-2: 120, HSK3-6: 180
  shuffle_questions boolean not null default true,
  shuffle_options boolean not null default true,
  is_practice boolean not null default true,             -- true = đề luyện tập, không phải đề chính thức
  published boolean not null default false,
  format text not null default 'HSK 2.0',
  created_at timestamptz default now());

create table if not exists exam_sections(
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams on delete cascade,
  kind text not null check (kind in ('listening','reading','writing')),
  position int not null default 0,
  title text not null, instructions text,
  max_plays int not null default 2);                     -- số lần được nghe lại mỗi câu (0 = không giới hạn)

create table if not exists exam_questions(
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references exam_sections on delete cascade,
  position int not null default 0,
  qtype text not null check (qtype in ('mcq','fill','order','match','essay')),
  prompt text not null, passage text,
  audio_url text,                                        -- đường dẫn file trong kho exam-audio ('storage:...') hoặc link http
  audio_text text,                                       -- nếu chưa có file nghe, trình duyệt sẽ đọc đoạn chữ này bằng giọng Trung
  options jsonb,                                         -- mcq/order: ["..",".."]; match: {"left":[..],"right":[..]}
  points numeric not null default 1,
  topic text);                                           -- nội dung cần ôn nếu làm sai

create table if not exists exam_answer_keys(
  question_id uuid primary key references exam_questions on delete cascade,
  answer jsonb,                                          -- mcq: "đáp án"; fill: ["đáp án 1",..]; order: ["câu đúng",..]; match: {"trái":"phải"}
  explanation text);

create table if not exists exam_attempts(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  exam_id uuid not null references exams on delete cascade,
  scope text not null default 'main',
  status text not null default 'in_progress',            -- in_progress | submitted | abandoned
  started_at timestamptz not null default now(),
  submitted_at timestamptz, duration_sec int,
  answers jsonb not null default '{}',
  manual_points jsonb not null default '{}',             -- điểm bài tự luận do admin chấm
  feedback jsonb not null default '{}',
  section_scores jsonb, score numeric, max_score int, passed boolean,
  pending_essays int not null default 0,
  review jsonb);                                         -- đáp án + giải thích, chỉ có SAU khi nộp bài

-- ============ Quyền truy cập ============
create or replace function exam_can_view(p_exam uuid) returns boolean
language sql security definer stable set search_path=public as $$
  select exists(select 1 from exams e where e.id = p_exam and (is_admin() or (e.published and
    ('main' = any(e.scopes) or ('thuy' = any(e.scopes) and has_course_access())))))
$$;

alter table exams enable row level security;
alter table exam_sections enable row level security;
alter table exam_questions enable row level security;
alter table exam_answer_keys enable row level security;
alter table exam_attempts enable row level security;

create policy exams_read on exams for select using (exam_can_view(id));
create policy exams_admin on exams for all using (is_admin()) with check (is_admin());
create policy sections_read on exam_sections for select using (exam_can_view(exam_id));
create policy sections_admin on exam_sections for all using (is_admin()) with check (is_admin());
create policy questions_read on exam_questions for select using (exam_can_view((select s.exam_id from exam_sections s where s.id = section_id)));
create policy questions_admin on exam_questions for all using (is_admin()) with check (is_admin());
create policy keys_admin on exam_answer_keys for all using (is_admin()) with check (is_admin());   -- người học KHÔNG có quyền đọc
create policy attempts_own on exam_attempts for select using (user_id = auth.uid() or is_admin());
create policy attempts_admin on exam_attempts for all using (is_admin()) with check (is_admin());

-- Kho file nghe (riêng tư; người đã đăng nhập nghe được, chỉ admin tải lên/xóa)
insert into storage.buckets(id, name, public, file_size_limit) values ('exam-audio', 'exam-audio', false, 52428800) on conflict (id) do nothing;
create policy exam_audio_read on storage.objects for select using (bucket_id = 'exam-audio' and auth.role() = 'authenticated');
create policy exam_audio_ins on storage.objects for insert with check (bucket_id = 'exam-audio' and is_admin());
create policy exam_audio_upd on storage.objects for update using (bucket_id = 'exam-audio' and is_admin());
create policy exam_audio_del on storage.objects for delete using (bucket_id = 'exam-audio' and is_admin());

-- ============ Hàm chấm điểm (chạy trên máy chủ) ============
create or replace function exam_norm(t text) returns text language sql immutable as $$
  select lower(regexp_replace(coalesce(t, ''), '[\s\u3000，。！？、,.!?；;：:“”"''’]+', '', 'g')) $$;
create or replace function exam_arr(j jsonb) returns jsonb language sql immutable as $$
  select case when j is null then '[]'::jsonb when jsonb_typeof(j) = 'array' then j else jsonb_build_array(j) end $$;

create or replace function exam_grade_apply(p_attempt uuid) returns void
language plpgsql security definer set search_path=public as $$
declare
  a exam_attempts; e exams; q record; ua jsonb; frac numeric; pend boolean; joined text; matched int; tot int;
  got numeric[] := array[0,0,0]; mx numeric[] := array[0,0,0]; pe int[] := array[0,0,0]; i int;
  v_pend int := 0; v_review jsonb := '[]'::jsonb; v_secs jsonb := '{}'::jsonb; v_total numeric := 0; nsec int; wt numeric; sc numeric;
begin
  select * into a from exam_attempts where id = p_attempt;
  if not found or (a.user_id <> auth.uid() and not is_admin()) then raise exception 'not allowed'; end if;
  select * into e from exams where id = a.exam_id;
  for q in
    select s.kind, qu.id, qu.qtype, qu.points, qu.topic, k.answer, k.explanation
    from exam_questions qu join exam_sections s on s.id = qu.section_id
    left join exam_answer_keys k on k.question_id = qu.id
    where s.exam_id = a.exam_id order by s.position, qu.position
  loop
    i := case q.kind when 'listening' then 1 when 'reading' then 2 else 3 end;
    ua := a.answers -> (q.id::text); frac := 0; pend := false;
    if q.qtype = 'essay' then
      if jsonb_exists(a.manual_points, q.id::text) then
        frac := least(1, greatest(0, (a.manual_points ->> (q.id::text))::numeric / nullif(q.points, 0)));
      else pend := true; end if;
    elsif q.qtype = 'mcq' then
      if jsonb_typeof(ua) = 'string' and q.answer is not null and exam_norm(ua #>> '{}') = exam_norm(q.answer #>> '{}') then frac := 1; end if;
    elsif q.qtype = 'fill' then
      if jsonb_typeof(ua) = 'string' and q.answer is not null
         and exists(select 1 from jsonb_array_elements_text(exam_arr(q.answer)) x where exam_norm(x) = exam_norm(ua #>> '{}')) then frac := 1; end if;
    elsif q.qtype = 'order' then
      if jsonb_typeof(ua) = 'array' and q.answer is not null then
        select coalesce(string_agg(x, '' order by ord), '') into joined from jsonb_array_elements_text(ua) with ordinality t(x, ord);
        if exists(select 1 from jsonb_array_elements_text(exam_arr(q.answer)) x where exam_norm(x) = exam_norm(joined)) then frac := 1; end if;
      end if;
    elsif q.qtype = 'match' then
      if jsonb_typeof(ua) = 'object' and jsonb_typeof(q.answer) = 'object' then
        select count(*) filter (where ua ->> key = value), count(*) into matched, tot from jsonb_each_text(q.answer);
        if tot > 0 then frac := matched::numeric / tot; end if;
      end if;
    end if;
    mx[i] := mx[i] + q.points;
    if pend then pe[i] := pe[i] + 1; v_pend := v_pend + 1; else got[i] := got[i] + q.points * frac; end if;
    v_review := v_review || jsonb_build_array(jsonb_build_object(
      'id', q.id, 'kind', q.kind, 'qtype', q.qtype, 'points', q.points, 'frac', case when pend then null else frac end,
      'your', ua, 'answer', case when q.qtype = 'essay' then null else q.answer end,
      'explanation', q.explanation, 'topic', q.topic, 'pending', pend));
  end loop;
  select count(*) into nsec from unnest(mx) m where m > 0;
  wt := case when nsec > 0 then e.max_score::numeric / nsec else 0 end;
  for i in 1..3 loop
    if mx[i] > 0 then
      sc := case when pe[i] > 0 then null else round(wt * got[i] / mx[i], 1) end;
      v_secs := v_secs || jsonb_build_object((array['listening','reading','writing'])[i],
        jsonb_build_object('got', got[i], 'max', mx[i], 'score', sc, 'weight', wt, 'pending', pe[i]));
      v_total := v_total + coalesce(sc, 0);
    end if;
  end loop;
  update exam_attempts set review = v_review, section_scores = v_secs, score = round(v_total), max_score = e.max_score,
    pending_essays = v_pend, passed = case when v_pend > 0 then null else round(v_total) >= e.pass_score end
  where id = p_attempt;
end $$;

-- ============ Hàm cho người học ============
create or replace function exam_start(p_exam uuid, p_scope text) returns exam_attempts
language plpgsql security definer set search_path=public as $$
declare e exams; a exam_attempts;
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  select * into e from exams where id = p_exam;
  if not found or not exam_can_view(p_exam) then raise exception 'exam not available'; end if;
  if p_scope not in ('main','thuy') or not (p_scope = any(e.scopes)) then raise exception 'wrong scope'; end if;
  if p_scope = 'thuy' and not has_course_access() then raise exception 'no access'; end if;
  update exam_attempts set status = 'abandoned'
    where user_id = auth.uid() and exam_id = p_exam and scope = p_scope and status = 'in_progress'
      and started_at + (e.duration_min + 5) * interval '1 minute' < now();
  select * into a from exam_attempts where user_id = auth.uid() and exam_id = p_exam and scope = p_scope and status = 'in_progress' order by started_at desc limit 1;
  if found then return a; end if;
  insert into exam_attempts(user_id, exam_id, scope) values (auth.uid(), p_exam, p_scope) returning * into a;
  return a;
end $$;

create or replace function exam_save(p_attempt uuid, p_answers jsonb) returns void
language sql security definer set search_path=public as $$
  update exam_attempts set answers = coalesce(p_answers, answers)
  where id = p_attempt and user_id = auth.uid() and status = 'in_progress' $$;

create or replace function exam_abandon(p_attempt uuid) returns void
language sql security definer set search_path=public as $$
  update exam_attempts set status = 'abandoned' where id = p_attempt and user_id = auth.uid() and status = 'in_progress' $$;

create or replace function exam_submit(p_attempt uuid, p_answers jsonb) returns exam_attempts
language plpgsql security definer set search_path=public as $$
declare a exam_attempts;
begin
  select * into a from exam_attempts where id = p_attempt and user_id = auth.uid();
  if not found then raise exception 'attempt not found'; end if;
  if a.status = 'in_progress' then
    update exam_attempts set answers = coalesce(p_answers, answers), status = 'submitted', submitted_at = now(),
      duration_sec = extract(epoch from now() - started_at)::int where id = p_attempt;
    perform exam_grade_apply(p_attempt);
  end if;
  select * into a from exam_attempts where id = p_attempt;
  return a;
end $$;

-- ============ Hàm cho admin: chấm bài tự luận ============
create or replace function admin_exam_grade_essay(p_attempt uuid, p_question uuid, p_points numeric, p_comment text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  update exam_attempts set manual_points = manual_points || jsonb_build_object(p_question::text, p_points),
    feedback = feedback || jsonb_build_object(p_question::text, coalesce(p_comment, ''))
  where id = p_attempt and status = 'submitted';
  perform exam_grade_apply(p_attempt);
end $$;

create or replace function admin_exam_attempts() returns table(
  id uuid, email text, title text, level int, scope text, submitted_at timestamptz, score numeric, max_score int, pending_essays int)
language sql security definer set search_path=public as $$
  select a.id, u.email::text, e.title, e.level, a.scope, a.submitted_at, a.score, a.max_score, a.pending_essays
  from exam_attempts a join auth.users u on u.id = a.user_id join exams e on e.id = a.exam_id
  where is_admin() and a.status = 'submitted' order by (a.pending_essays > 0) desc, a.submitted_at desc limit 300 $$;

-- Nhân bản một đề (kèm phần thi, câu hỏi, đáp án) để sửa thành đề mới
create or replace function admin_exam_duplicate(p_exam uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare ne uuid := gen_random_uuid(); s record; q record; ns uuid; nq uuid;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  insert into exams(id, title, level, description, scopes, duration_min, max_score, pass_score, shuffle_questions, shuffle_options, is_practice, published, format)
    select ne, title || ' (bản sao)', level, description, scopes, duration_min, max_score, pass_score, shuffle_questions, shuffle_options, is_practice, false, format from exams where id = p_exam;
  for s in select * from exam_sections where exam_id = p_exam loop
    ns := gen_random_uuid();
    insert into exam_sections(id, exam_id, kind, position, title, instructions, max_plays) values (ns, ne, s.kind, s.position, s.title, s.instructions, s.max_plays);
    for q in select * from exam_questions where section_id = s.id loop
      nq := gen_random_uuid();
      insert into exam_questions(id, section_id, position, qtype, prompt, passage, audio_url, audio_text, options, points, topic)
        values (nq, ns, q.position, q.qtype, q.prompt, q.passage, q.audio_url, q.audio_text, q.options, q.points, q.topic);
      insert into exam_answer_keys(question_id, answer, explanation) select nq, answer, explanation from exam_answer_keys where question_id = q.id;
    end loop;
  end loop;
  return ne;
end $$;
