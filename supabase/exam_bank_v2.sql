-- NÂNG CẤP NGÂN HÀNG ĐỀ (phần/part, nhóm nối hình, ảnh). Chạy SAU exam_bank.sql, TRƯỚC khi nhập các file trong exam_seed.
-- Chạy lại nhiều lần cũng không sao.

alter table exam_questions add column if not exists part int not null default 1;      -- "phần" 1,2,3,4 trong mỗi kỹ năng (第一部分…)
alter table exam_questions add column if not exists group_key text;                   -- các câu cùng group_key dùng chung 1 bảng đáp án A–E (nối hình, nối câu, điền từ)
alter table exam_questions add column if not exists image text;                       -- hình minh họa của câu hỏi: emoji, link http hoặc 'storage:...'

-- Ẩn các đề mẫu cũ (bản đầu tiên) để không lẫn với đề mới; lịch sử thi của đề cũ vẫn giữ.
update exams set published = false, title = title || ' (cũ)'
where title not like '%(cũ)' and id in (
  '88ba25ca-2dc1-5de4-ac0e-be91826756bf',
  'b5dbb17c-8f71-56da-8e2b-826233004adc',
  '6f158a02-209b-580c-bc0b-2af402f38ba9',
  'f51545ba-99b8-560c-9729-e9771e11a94e',
  'bf22f960-c1bc-545c-8008-2fdbe50b689d',
  '86a8d727-157c-585c-aba7-2169b9364548',
  'cb04a7f8-2ec6-59ad-aadf-b556f7bad80f',
  '13084bb8-5ee4-59a7-843e-5e6f867755d2',
  '8ede4dbb-93d1-5249-a4a0-ff5a2e1f721b',
  '8a77a1b7-6dd6-504c-aa5a-3013e01ea3ff',
  '9eeb1638-1a92-503b-96e8-b5c0fa575125',
  '46d89af5-66e3-54ae-b714-ac7fc519e2af');

-- Nhân bản đề: sao chép cả cột mới
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
      insert into exam_questions(id, section_id, position, qtype, prompt, passage, audio_url, audio_text, options, points, topic, part, group_key, image)
        values (nq, ns, q.position, q.qtype, q.prompt, q.passage, q.audio_url, q.audio_text, q.options, q.points, q.topic, q.part, q.group_key, q.image);
      insert into exam_answer_keys(question_id, answer, explanation) select nq, answer, explanation from exam_answer_keys where question_id = q.id;
    end loop;
  end loop;
  return ne;
end $$;
