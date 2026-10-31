import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Crud from './Crud'

const BUCKET = 'thuy-course'
// Tên file PDF (không đuôi) -> tiêu đề và thứ tự hiển thị. File khác tên sẽ dùng tên file.
const KNOWN: Record<string, [string, number]> = {
  'bai-01-02': ['Bài 1–2', 1], 'bai-03-04': ['Bài 3–4', 2], 'bai-05-06': ['Bài 5–6', 3], 'bai-07-08': ['Bài 7–8', 4],
  'bai-09-10': ['Bài 9–10', 5], 'bai-11-12': ['Bài 11–12', 6], 'bai-13-14-15': ['Bài 13–14–15', 7],
  'hsk2-3-0': ['HSK 2 (3.0) – 她请我们吃了北京烤鸭', 8], 'mai-thao': ['Mai Thảo – 她请我们吃了北京烤鸭', 9], 'maithao': ['Mai Thảo – 还是打车去北京吧！', 10],
}
interface Mat { id: string; title: string; file_path: string; position: number }
interface U { user_id: string; email: string; has_access: boolean }
const inp = 'rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm'

export default function ThuyAdmin() {
  const [mats, setMats] = useState<Mat[]>([]), [users, setUsers] = useState<U[]>([]), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [q, setQ] = useState('')
  const [tl, setTl] = useState<{ id: string; title: string }[]>([]), [lesson, setLesson] = useState('')
  useEffect(() => { supabase!.from('thuy_lessons').select('id,title').order('position').then(({ data }) => { setTl(data ?? []); if (data?.length) setLesson(data[0].id) }) }, [])
  const load = useCallback(async () => {
    const m = await supabase!.from('course_materials').select('*').order('position')
    const u = await supabase!.rpc('admin_course_users')
    setMats(m.data ?? []); setUsers(u.data ?? [])
    if (m.error || u.error) setMsg((m.error ?? u.error)!.message)
  }, [])
  useEffect(() => { load() }, [load])

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);e.target.value = '';
    if (!files.length) return
    setBusy(true); let ok = 0, fail: string[] = []
    let pos = Math.max(0, ...mats.map(m => m.position))
    for (const [i, f] of files.entries()) {
      setMsg(`Đang tải ${i + 1}/${files.length}: ${f.name}…`)
      const key = f.name.replace(/\.pdf$/i, '').toLowerCase()
      const [title, position] = KNOWN[key] ?? [f.name.replace(/\.pdf$/i, ''), ++pos]
      const path = `${Date.now()}-${i}.pdf`   // tên file trên kho phải là chữ không dấu
      const up = await supabase!.storage.from(BUCKET).upload(path, f, { contentType: 'application/pdf' })
      if (up.error) { fail.push(`${f.name}: ${up.error.message}`); continue }
      const ins = await supabase!.from('course_materials').insert({ title, file_path: path, position, slug: KNOWN[key] ? key : null })
      if (ins.error) { fail.push(`${f.name}: ${ins.error.message}`); await supabase!.storage.from(BUCKET).remove([path]); continue }
      ok++
    }
    setBusy(false); setMsg(`Đã tải lên ${ok}/${files.length} file.${fail.length ? ' Lỗi: ' + fail.join(' | ') : ''}`); load()
  }
  const rename = async (m: Mat, title: string) => { if (title && title !== m.title) { await supabase!.from('course_materials').update({ title }).eq('id', m.id); load() } }
  const reorder = async (m: Mat, position: number) => { await supabase!.from('course_materials').update({ position }).eq('id', m.id); load() }
  const del = async (m: Mat) => {
    if (!confirm(`Xóa “${m.title}”? File sẽ bị xóa khỏi kho.`)) return
    await supabase!.storage.from(BUCKET).remove([m.file_path]); await supabase!.from('course_materials').delete().eq('id', m.id); load()
  }
  const toggle = async (u: U) => {
    const { error } = await supabase!.rpc('admin_set_course_access', { p_user: u.user_id, p_allow: !u.has_access })
    if (error) setMsg(error.message); else setUsers(us => us.map(x => (x.user_id === u.user_id ? { ...x, has_access: !x.has_access } : x)))
  }
  const shown = users.filter(u => u.email.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="space-y-5">
      {msg && <div className="rounded-xl bg-sky-100 px-3 py-2 text-sm">{msg}</div>}
      <section className="card p-4 space-y-3">
        <h2 className="font-bold">Tài liệu ({mats.length})</h2>
        <label className={`btn-primary cursor-pointer ${busy ? 'opacity-50 pointer-events-none' : ''}`}>＋ Tải file PDF lên<input type="file" accept="application/pdf" multiple hidden onChange={upload} /></label>
        <p className="text-xs text-ink/60">Chọn được nhiều file một lần. Mỗi file tối đa 50 MB.</p>
        <div className="space-y-2">{mats.map(m => (
          <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-rose-100 bg-white p-2">
            <input type="number" defaultValue={m.position} className={`${inp} w-16`} aria-label="Thứ tự" onBlur={e => +e.target.value !== m.position && reorder(m, +e.target.value)} />
            <input defaultValue={m.title} className={`${inp} flex-1 min-w-[10rem] font-han`} aria-label="Tiêu đề" onBlur={e => rename(m, e.target.value.trim())} />
            <button className="text-red-600 text-sm" onClick={() => del(m)}>Xóa</button>
          </div>))}</div>
      </section>
      <section className="card p-4 space-y-3">
        <h2 className="font-bold">Sửa từ vựng của lớp</h2>
        <select value={lesson} onChange={e => setLesson(e.target.value)} className={inp}>{tl.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select>
        {lesson && <Crud table="thuy_vocab" filter={{ lesson_id: lesson }} cols={['position', 'hanzi', 'pinyin', 'meaning']} newId={() => `${lesson}-${Date.now()}`}
          fields={[{ key: 'position', label: 'Thứ tự', num: true }, { key: 'hanzi', label: 'Chữ Hán' }, { key: 'pinyin', label: 'Pinyin' }, { key: 'pos', label: 'Loại từ' }, { key: 'meaning', label: 'Nghĩa tiếng Việt', area: true }]} />}
      </section>
      <section className="card p-4 space-y-3">
        <h2 className="font-bold">Tài khoản được vào mục này</h2>
        <p className="text-xs text-ink/60">Tích vào tài khoản để cho phép. Admin luôn vào được. Người mới phải đăng ký trên web trước thì mới hiện ở đây.</p>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm email…" className={`${inp} w-full`} />
        <div className="space-y-1 max-h-96 overflow-y-auto">{shown.map(u => (
          <label key={u.user_id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-rose-50 cursor-pointer">
            <input type="checkbox" className="h-5 w-5 accent-rose-500" checked={u.has_access} onChange={() => toggle(u)} />
            <span className="text-sm break-all">{u.email}</span>{u.has_access && <span className="text-xs text-green-600">✔ được vào</span>}
          </label>))}
          {!shown.length && <p className="text-sm text-ink/60">Không có tài khoản nào.</p>}</div>
      </section>
    </div>
  )
}
