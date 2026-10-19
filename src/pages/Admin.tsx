import { useEffect, useState } from 'react'
import Crud, { Field } from '../components/Crud'
import ThuyAdmin from '../components/ThuyAdmin'
import { supabase } from '../lib/supabase'

const L = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, ...o })
const vocabF = [L('hanzi', 'Từ (Hán)'), L('pinyin', 'Pinyin'), L('meaning_vi', 'Nghĩa tiếng Việt'), L('word_class', 'Loại từ'), L('position', 'Thứ tự', { num: true }),
  L('example_zh', 'Ví dụ (Hán)', { area: true }), L('example_pinyin', 'Pinyin ví dụ', { area: true }), L('example_vi', 'Dịch ví dụ', { area: true })]
const TABS = [['lessons', 'Bài học'], ['vocabulary', 'Từ vựng'], ['grammar', 'Ngữ pháp'], ['sentences', 'Mẫu câu'], ['dialogues', 'Hội thoại'], ['exercises', 'Bài tập'], ['learners', 'Người học'], ['thuy', 'Lớp chị Thủy']] as const
type Tab = typeof TABS[number][0]

export default function Admin() {
  const [tab, setTab] = useState<Tab>('lessons')
  const [lessons, setLessons] = useState<{ id: string; course_id: number; position: number }[]>([])
  const [lesson, setLesson] = useState(''), [course, setCourse] = useState(1)
  useEffect(() => { supabase!.from('lessons').select('id,course_id,position').order('course_id').order('position').then(({ data }) => { setLessons(data ?? []); if (data?.length) setLesson(l => l || data[0].id) }) }, [tab])
  const needsLesson = !['lessons', 'learners', 'thuy'].includes(tab)
  const sel = 'rounded-xl border border-rose-100 bg-white px-3 py-2'
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Quản trị nội dung <span className="font-han text-base opacity-60">管理</span></h1>
      <div className="flex gap-2 overflow-x-auto pb-1">{TABS.map(([k, v]) => <button key={k} className={tab === k ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'} onClick={() => setTab(k)}>{v}</button>)}</div>
      {tab === 'lessons' && <select className={sel} value={course} onChange={e => setCourse(+e.target.value)}>{[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>HSK {n}</option>)}</select>}
      {needsLesson && <select className={sel} value={lesson} onChange={e => setLesson(e.target.value)}>{lessons.map(l => <option key={l.id} value={l.id}>HSK{l.course_id} · Bài {l.position} ({l.id})</option>)}</select>}
      {tab === 'lessons' && <Crud table="lessons" filter={{ course_id: course }} cols={['id', 'position', 'title']}
        fields={[L('id', 'Mã bài (vd 1-8)', { readOnlyOnEdit: true }), L('position', 'Thứ tự', { num: true }), L('title', 'Tên bài')]} newId={f => f.id} />}
      {tab === 'vocabulary' && lesson && <Crud table="vocabulary" filter={{ lesson_id: lesson }} cols={['position', 'hanzi', 'pinyin', 'meaning_vi']} fields={vocabF} newId={() => `${lesson}-${Date.now()}`} />}
      {tab === 'grammar' && lesson && <Crud table="grammar" filter={{ lesson_id: lesson }} order="structure" cols={['structure', 'explanation_vi']}
        fields={[L('structure', 'Cấu trúc ngữ pháp', { area: true }), L('explanation_vi', 'Giải thích (tiếng Việt)', { area: true }), L('example_zh', 'Ví dụ (Hán)'), L('example_pinyin', 'Pinyin'), L('example_vi', 'Nghĩa tiếng Việt')]} />}
      {tab === 'sentences' && lesson && <Crud table="sentences" filter={{ lesson_id: lesson }} order="zh" cols={['zh', 'pinyin', 'meaning_vi']}
        fields={[L('zh', 'Câu tiếng Trung', { area: true }), L('pinyin', 'Pinyin', { area: true }), L('meaning_vi', 'Dịch tiếng Việt', { area: true }), L('note', 'Giải thích', { area: true })]} />}
      {tab === 'dialogues' && lesson && <Crud table="dialogues" filter={{ lesson_id: lesson }} cols={['position', 'speaker', 'zh', 'meaning_vi']}
        fields={[L('position', 'Thứ tự câu', { num: true }), L('speaker', 'Người nói (A/B)'), L('zh', 'Câu tiếng Trung', { area: true }), L('pinyin', 'Pinyin', { area: true }), L('meaning_vi', 'Dịch tiếng Việt', { area: true })]} />}
      {tab === 'exercises' && lesson && <Crud table="exercises" filter={{ lesson_id: lesson }} order="prompt" cols={['kind', 'prompt', 'answer']}
        fields={[L('kind', 'Dạng (vd choice, fill)'), L('prompt', 'Câu hỏi', { area: true }), L('answer', 'Đáp án đúng'), L('explanation', 'Giải thích', { area: true })]} />}
      {tab === 'learners' && <Learners />}
      {tab === 'thuy' && <ThuyAdmin />}
    </div>
  )
}

function Learners() {
  const [rows, setRows] = useState<any[]>([]); const [err, setErr] = useState('')
  useEffect(() => { supabase!.rpc('admin_learners').then(({ data, error }) => { setRows(data ?? []); setErr(error?.message ?? '') }) }, [])
  return (
    <div className="card overflow-x-auto">
      {err && <div className="p-3 text-sm text-red-700">{err}</div>}
      <table className="w-full text-sm"><thead><tr className="text-left bg-rose-50"><th className="p-2">Email</th><th>Bài hoàn thành</th><th>Lần luyện tập</th><th>Điểm TB (%)</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.email} className="border-t border-rose-100"><td className="p-2">{r.email}</td><td>{r.lessons_done}</td><td>{r.attempts}</td><td>{r.avg_score}</td></tr>)}</tbody></table>
    </div>
  )
}
