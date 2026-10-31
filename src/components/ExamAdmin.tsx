import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { ExamRow, KIND_NAME, Kind, LEVELS, QType, QuestionRow, SectionRow, loadExamContent } from '../lib/exam'
import { supabase } from '../lib/supabase'

const inp = 'w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm'
const Lbl = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="block text-sm space-y-1"><span className="text-ink/70">{t}</span>{children}</label>
const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean)
const QT: Record<QType, string> = { mcq: 'Trắc nghiệm (chọn 1)', fill: 'Điền từ (gõ chữ)', order: 'Sắp xếp từ thành câu', match: 'Nối (trái = phải)', essay: 'Tự luận (admin chấm)' }

export default function ExamAdmin() {
  const [view, setView] = useState<'list' | 'grade'>('list'), [exams, setExams] = useState<ExamRow[]>([]), [sel, setSel] = useState<ExamRow | null>(null), [form, setForm] = useState<Partial<ExamRow> | null>(null), [msg, setMsg] = useState('')
  const load = useCallback(async () => { const { data, error } = await supabase!.from('exams').select('*').order('level').order('created_at'); setExams((data ?? []) as ExamRow[]); setMsg(error?.message ?? '') }, [])
  useEffect(() => { load() }, [load])
  const newExam = () => setForm({ title: '', level: 1, description: 'Đề luyện tập do admin tạo.', scopes: ['main', 'thuy'], duration_min: 40, max_score: 200, pass_score: 120, shuffle_questions: true, shuffle_options: true, is_practice: true, published: false, format: 'HSK 2.0' })
  const setLevel = (lv: number) => { const l = LEVELS[lv - 1]; setForm(f => ({ ...f, level: lv, duration_min: l.min, max_score: l.max, pass_score: l.pass })) }
  const save = async () => {
    if (!form?.title?.trim()) return setMsg('Hãy nhập tên đề.')
    const { id, created_at, ...body } = form as any
    const r = id ? await supabase!.from('exams').update(body).eq('id', id) : await supabase!.from('exams').insert(body)
    if (r.error) return setMsg(r.error.message); setForm(null); setMsg(''); load()
  }
  const del = async (x: ExamRow) => { if (!confirm(`Xóa đề “${x.title}” cùng toàn bộ câu hỏi và lượt thi liên quan?`)) return; const { error } = await supabase!.from('exams').delete().eq('id', x.id); setMsg(error?.message ?? ''); if (sel?.id === x.id) setSel(null); load() }
  const dup = async (x: ExamRow) => { const { error } = await supabase!.rpc('admin_exam_duplicate', { p_exam: x.id }); setMsg(error?.message ?? ''); load() }

  if (sel) return <ExamContent exam={sel} onBack={() => setSel(null)} />
  return (
    <div className="space-y-4">
      <div className="flex gap-2"><button className={view === 'list' ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'} onClick={() => setView('list')}>Ngân hàng đề</button><button className={view === 'grade' ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'} onClick={() => setView('grade')}>Chấm bài viết</button></div>
      {msg && <div className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-700">{msg}</div>}
      {view === 'grade' ? <Grading /> : (<>
        <div className="flex justify-between items-center"><span className="text-sm text-ink/60">{exams.length} đề</span><button className="btn-primary !py-1.5" onClick={newExam}>＋ Thêm đề</button></div>
        {form && (
          <div className="card p-4 grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Lbl t="Tên đề"><input className={inp} value={form.title ?? ''} onChange={e => setForm({ ...form, title: e.target.value })} /></Lbl></div>
            <Lbl t="Cấp độ (điền sẵn thời gian và điểm theo HSK 2.0)"><select className={inp} value={form.level} onChange={e => setLevel(+e.target.value)}>{LEVELS.map(l => <option key={l.lv} value={l.lv}>HSK {l.lv}</option>)}</select></Lbl>
            <Lbl t="Thời gian làm bài (phút)"><input type="number" className={inp} value={form.duration_min ?? 0} onChange={e => setForm({ ...form, duration_min: +e.target.value })} /></Lbl>
            <Lbl t="Điểm tối đa"><input type="number" className={inp} value={form.max_score ?? 0} onChange={e => setForm({ ...form, max_score: +e.target.value })} /></Lbl>
            <Lbl t="Điểm đạt"><input type="number" className={inp} value={form.pass_score ?? 0} onChange={e => setForm({ ...form, pass_score: +e.target.value })} /></Lbl>
            <div className="sm:col-span-2"><Lbl t="Mô tả"><textarea className={inp} rows={2} value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Lbl></div>
            <div className="sm:col-span-2 flex flex-wrap gap-4 text-sm">
              {(['main', 'thuy'] as const).map(s => <label key={s} className="flex items-center gap-2"><input type="checkbox" className="accent-rose-500" checked={!!form.scopes?.includes(s)} onChange={e => setForm({ ...form, scopes: e.target.checked ? [...(form.scopes ?? []), s] : (form.scopes ?? []).filter(x => x !== s) })} />{s === 'main' ? 'Hiện ở trang ngoài' : 'Hiện ở Lớp chị Thủy'}</label>)}
              {([['published', 'Đã xuất bản (học viên thấy)'], ['shuffle_questions', 'Xáo trộn câu hỏi'], ['shuffle_options', 'Xáo trộn đáp án'], ['is_practice', 'Là đề luyện tập (không phải đề chính thức)']] as const).map(([k, t]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" className="accent-rose-500" checked={!!form[k]} onChange={e => setForm({ ...form, [k]: e.target.checked })} />{t}</label>)}</div>
            <div className="sm:col-span-2 flex gap-2"><button className="btn-primary" onClick={save}>Lưu</button><button className="btn-ghost" onClick={() => setForm(null)}>Hủy</button></div></div>)}
        <div className="space-y-2">{exams.map(x => (
          <div key={x.id} className="card p-3 flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[12rem]"><div className="font-semibold">{x.title}</div><div className="text-xs text-ink/60">HSK {x.level} · {x.duration_min} phút · {x.max_score} điểm (đạt {x.pass_score}) · {x.scopes.join(', ') || 'không hiển thị'} · {x.published ? '✔ đã xuất bản' : '✎ nháp'}</div></div>
            <button className="btn-primary !py-1 text-sm" onClick={() => setSel(x)}>Câu hỏi</button>
            <button className="text-sky-600 text-sm" onClick={() => setForm(x)}>Sửa</button><button className="text-sky-600 text-sm" onClick={() => dup(x)}>Nhân bản</button><button className="text-red-600 text-sm" onClick={() => del(x)}>Xóa</button></div>))}</div></>)}
    </div>)
}

// ---------- Nội dung 1 đề: phần thi + câu hỏi ----------
interface QForm { id?: string; section_id: string; qtype: QType; part: string; group_key: string; image: string; position: string; points: string; topic: string; prompt: string; passage: string; audio_url: string; audio_text: string; optText: string; ansText: string; explanation: string }
const blankQ = (section_id: string, pos: number): QForm => ({ section_id, qtype: 'mcq', part: '1', group_key: '', image: '', position: String(pos), points: '1', topic: '', prompt: '', passage: '', audio_url: '', audio_text: '', optText: '', ansText: '', explanation: '' })

function ExamContent({ exam, onBack }: { exam: ExamRow; onBack: () => void }) {
  const [secs, setSecs] = useState<SectionRow[]>([]), [qs, setQs] = useState<QuestionRow[]>([]), [keys, setKeys] = useState<Record<string, any>>({}), [msg, setMsg] = useState('')
  const [sf, setSf] = useState<Partial<SectionRow> | null>(null), [qf, setQf] = useState<QForm | null>(null), [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    try {
      const c = await loadExamContent(exam.id); setSecs(c.sections); setQs(c.questions)
      const ids = c.questions.map(q => q.id); const k = ids.length ? await supabase!.from('exam_answer_keys').select('*').in('question_id', ids).range(0, 999) : { data: [] as any[] }
      setKeys(Object.fromEntries((k.data ?? []).map((x: any) => [x.question_id, x])))
    } catch (e: any) { setMsg(e.message) }
  }, [exam.id])
  useEffect(() => { load() }, [load])

  const saveSec = async () => {
    if (!sf?.title) return setMsg('Hãy nhập tên phần thi.')
    const body = { exam_id: exam.id, kind: sf.kind ?? 'listening', position: sf.position ?? secs.length + 1, title: sf.title, instructions: sf.instructions ?? null, max_plays: sf.max_plays ?? 2 }
    const r = sf.id ? await supabase!.from('exam_sections').update(body).eq('id', sf.id) : await supabase!.from('exam_sections').insert(body)
    if (r.error) return setMsg(r.error.message); setSf(null); setMsg(''); load()
  }
  const delSec = async (s: SectionRow) => { if (!confirm(`Xóa phần “${s.title}” và mọi câu hỏi trong đó?`)) return; const { error } = await supabase!.from('exam_sections').delete().eq('id', s.id); setMsg(error?.message ?? ''); load() }
  const editQ = (q: QuestionRow) => {
    const k = keys[q.id]?.answer, o = q.options
    const f = blankQ(q.section_id, q.position); Object.assign(f, { id: q.id, qtype: q.qtype, part: String(q.part ?? 1), group_key: q.group_key ?? '', image: q.image ?? '', points: String(q.points), topic: q.topic ?? '', prompt: q.prompt, passage: q.passage ?? '', audio_url: q.audio_url ?? '', audio_text: q.audio_text ?? '', explanation: keys[q.id]?.explanation ?? '' })
    if (q.qtype === 'mcq') { f.optText = (o ?? []).join('\n'); f.ansText = k ?? '' }
    if (q.qtype === 'order') { f.optText = (o ?? []).join('\n'); f.ansText = (Array.isArray(k) ? k : k ? [k] : []).join('\n') }
    if (q.qtype === 'fill') f.ansText = (Array.isArray(k) ? k : k ? [k] : []).join('\n')
    if (q.qtype === 'match') f.optText = ((o?.left ?? []) as string[]).map(l => `${l} = ${k?.[l] ?? ''}`).join('\n')
    setQf(f)
  }
  const saveQ = async () => {
    if (!qf) return; if (!qf.prompt.trim()) return setMsg('Hãy nhập nội dung câu hỏi.')
    let options: any = null, answer: any = null
    if (qf.qtype === 'mcq') { options = lines(qf.optText); answer = qf.ansText.trim(); if (options.length < 2 || !options.includes(answer)) return setMsg('Trắc nghiệm cần ít nhất 2 lựa chọn và phải chọn một đáp án đúng nằm trong các lựa chọn.') }
    if (qf.qtype === 'order') { options = lines(qf.optText); answer = lines(qf.ansText); if (options.length < 2 || !answer.length) return setMsg('Cần nhập các từ và ít nhất một câu đúng.') }
    if (qf.qtype === 'fill') { answer = lines(qf.ansText); if (!answer.length) return setMsg('Hãy nhập ít nhất một đáp án đúng.') }
    if (qf.qtype === 'match') { const pairs = lines(qf.optText).map(l => l.split('=').map(x => x.trim())); if (pairs.length < 2 || pairs.some(p => p.length < 2 || !p[0] || !p[1])) return setMsg('Mỗi dòng nối phải có dạng “trái = phải”, tối thiểu 2 dòng.'); options = { left: pairs.map(p => p[0]), right: pairs.map(p => p[1]) }; answer = Object.fromEntries(pairs.map(p => [p[0], p[1]])) }
    setBusy(true)
    const body = { section_id: qf.section_id, part: +qf.part || 1, group_key: qf.group_key.trim() || null, image: qf.image.trim() || null, position: +qf.position || 0, qtype: qf.qtype, prompt: qf.prompt, passage: qf.passage || null, audio_url: qf.audio_url || null, audio_text: qf.audio_text || null, options, points: +qf.points || 1, topic: qf.topic || null }
    let id = qf.id
    if (id) { const r = await supabase!.from('exam_questions').update(body).eq('id', id); if (r.error) { setBusy(false); return setMsg(r.error.message) } }
    else { const r = await supabase!.from('exam_questions').insert(body).select('id').single(); if (r.error) { setBusy(false); return setMsg(r.error.message) } id = r.data.id }
    const k = await supabase!.from('exam_answer_keys').upsert({ question_id: id, answer, explanation: qf.explanation || null })
    setBusy(false); if (k.error) return setMsg(k.error.message); setQf(null); setMsg(''); load()
  }
  const delQ = async (q: QuestionRow) => { if (!confirm('Xóa câu hỏi này?')) return; const { error } = await supabase!.from('exam_questions').delete().eq('id', q.id); setMsg(error?.message ?? ''); load() }
  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f || !qf) return
    const ext = (f.name.split('.').pop() ?? 'mp3').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp3', path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    setMsg('Đang tải file nghe…'); const r = await supabase!.storage.from('exam-audio').upload(path, f, { contentType: f.type || 'audio/mpeg' })
    if (r.error) return setMsg(r.error.message); setQf({ ...qf, audio_url: `storage:${path}` }); setMsg('Đã tải file nghe lên. Nhớ bấm Lưu câu hỏi.')
  }
  const uploadImg = async (e: ChangeEvent<HTMLInputElement>, as: 'image' | 'option') => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f || !qf) return
    const ext = (f.name.split('.').pop() ?? 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg', path = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    setMsg('Đang tải ảnh…'); const r = await supabase!.storage.from('exam-audio').upload(path, f, { contentType: f.type || 'image/jpeg' })
    if (r.error) return setMsg(r.error.message)
    setMsg('Đã tải ảnh lên. Nhớ bấm Lưu câu hỏi.')
    setQf(as === 'image' ? { ...qf, image: `storage:${path}` } : { ...qf, optText: (qf.optText ? qf.optText + '\n' : '') + `img:storage:${path}` })
  }
  const cur = qf && secs.find(s => s.id === qf.section_id)
  const opts = lines(qf?.optText ?? '')
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><button className="text-sm text-rose-500" onClick={onBack}>← Danh sách đề</button><h2 className="font-bold">{exam.title}</h2></div>
      {msg && <div className="rounded-xl bg-yellow-100 px-3 py-2 text-sm">{msg}</div>}
      <div className="flex justify-between items-center"><h3 className="font-bold">Các phần thi</h3><button className="btn-primary !py-1.5 text-sm" onClick={() => setSf({ kind: 'listening', position: secs.length + 1, max_plays: 2, title: '' })}>＋ Thêm phần thi</button></div>
      {sf && (<div className="card p-4 grid sm:grid-cols-2 gap-3">
        <Lbl t="Loại"><select className={inp} value={sf.kind} onChange={e => setSf({ ...sf, kind: e.target.value as Kind })}>{(Object.keys(KIND_NAME) as Kind[]).map(k => <option key={k} value={k}>{KIND_NAME[k]}</option>)}</select></Lbl>
        <Lbl t="Thứ tự"><input type="number" className={inp} value={sf.position ?? 1} onChange={e => setSf({ ...sf, position: +e.target.value })} /></Lbl>
        <div className="sm:col-span-2"><Lbl t="Tên phần"><input className={inp} value={sf.title ?? ''} onChange={e => setSf({ ...sf, title: e.target.value })} /></Lbl></div>
        <div className="sm:col-span-2"><Lbl t="Hướng dẫn"><textarea className={inp} rows={2} value={sf.instructions ?? ''} onChange={e => setSf({ ...sf, instructions: e.target.value })} /></Lbl></div>
        <Lbl t="Số lần được nghe mỗi câu (0 = không giới hạn)"><input type="number" className={inp} value={sf.max_plays ?? 2} onChange={e => setSf({ ...sf, max_plays: +e.target.value })} /></Lbl>
        <div className="flex gap-2 items-end"><button className="btn-primary" onClick={saveSec}>Lưu phần</button><button className="btn-ghost" onClick={() => setSf(null)}>Hủy</button></div></div>)}
      {secs.map(s => { const sq = qs.filter(q => q.section_id === s.id).sort((a, b) => a.position - b.position); return (
        <div key={s.id} className="card p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2"><div className="flex-1 font-semibold">{KIND_NAME[s.kind]} · {s.title} <span className="text-xs text-ink/50">({sq.length} câu, nghe tối đa {s.max_plays || '∞'} lần)</span></div>
            <button className="btn-primary !py-1 text-sm" onClick={() => setQf(blankQ(s.id, sq.length + 1))}>＋ Thêm câu</button><button className="text-sky-600 text-sm" onClick={() => setSf(s)}>Sửa phần</button><button className="text-red-600 text-sm" onClick={() => delSec(s)}>Xóa phần</button></div>
          <div className="max-h-72 overflow-y-auto space-y-1">{sq.map(q => (<div key={q.id} className="flex items-center gap-2 rounded-xl bg-white border border-rose-100 px-2 py-1 text-sm">
            <span className="w-8 text-ink/40">{q.position}</span><span className="text-xs rounded bg-rose-50 px-1">{q.qtype}</span><span className="flex-1 truncate font-han">{q.prompt}</span>
            <button className="text-sky-600" onClick={() => editQ(q)}>Sửa</button><button className="text-red-600" onClick={() => delQ(q)}>Xóa</button></div>))}</div></div>) })}
      {!secs.length && <p className="text-sm text-ink/60">Đề chưa có phần thi nào. Thêm phần Nghe / Đọc / Viết rồi thêm câu hỏi.</p>}

      {qf && (<div className="fixed inset-0 z-30 overflow-y-auto bg-black/40 p-4"><div className="card mx-auto max-w-2xl p-5 space-y-3">
        <h3 className="font-bold">{qf.id ? 'Sửa câu hỏi' : 'Thêm câu hỏi'} · {cur ? KIND_NAME[cur.kind] : ''}</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <Lbl t="Dạng câu"><select className={inp} value={qf.qtype} onChange={e => setQf({ ...qf, qtype: e.target.value as QType })}>{(Object.keys(QT) as QType[]).map(k => <option key={k} value={k}>{QT[k]}</option>)}</select></Lbl>
          <Lbl t="Thứ tự"><input type="number" className={inp} value={qf.position} onChange={e => setQf({ ...qf, position: e.target.value })} /></Lbl>
          <Lbl t="Điểm của câu"><input type="number" className={inp} value={qf.points} onChange={e => setQf({ ...qf, points: e.target.value })} /></Lbl></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Lbl t="Phần (1, 2, 3…) – hiện như 第一部分"><input type="number" className={inp} value={qf.part} onChange={e => setQf({ ...qf, part: e.target.value })} /></Lbl>
          <Lbl t="Mã nhóm (các câu cùng mã dùng chung bảng đáp án A–E, ví dụ nối hình)"><input className={inp} value={qf.group_key} onChange={e => setQf({ ...qf, group_key: e.target.value })} /></Lbl></div>
        <div className="rounded-2xl bg-rose-50 p-3 space-y-2"><div className="text-sm font-semibold">Hình minh họa của câu hỏi (không bắt buộc)</div>
          <input className={inp} placeholder="Dán emoji (🍚), link ảnh hoặc tải ảnh lên" value={qf.image} onChange={e => setQf({ ...qf, image: e.target.value })} />
          <input type="file" accept="image/*" className="text-sm" onChange={e => uploadImg(e, 'image')} /></div>
        <Lbl t="Câu hỏi / yêu cầu"><textarea className={inp} rows={2} value={qf.prompt} onChange={e => setQf({ ...qf, prompt: e.target.value })} /></Lbl>
        <Lbl t="Đoạn văn / ngữ cảnh (không bắt buộc)"><textarea className={inp} rows={3} value={qf.passage} onChange={e => setQf({ ...qf, passage: e.target.value })} /></Lbl>
        {cur?.kind === 'listening' && (<div className="rounded-2xl bg-sky-100 p-3 space-y-2"><div className="text-sm font-semibold">Âm thanh</div>
          <input type="file" accept="audio/*" onChange={upload} className="text-sm" />{qf.audio_url && <div className="text-xs">File: {qf.audio_url} <button className="text-red-600 ml-2" onClick={() => setQf({ ...qf, audio_url: '' })}>Gỡ file</button></div>}
          <Lbl t="Hoặc nhập lời đọc (trình duyệt tự đọc bằng giọng Trung nếu chưa có file)"><textarea className={inp} rows={2} value={qf.audio_text} onChange={e => setQf({ ...qf, audio_text: e.target.value })} /></Lbl></div>)}
        {qf.qtype === 'mcq' && <div className="rounded-2xl bg-rose-50 p-3 text-xs space-y-1"><div>Muốn đáp án là <b>hình</b>: viết <code>img:🍚</code> (emoji) hoặc <code>img:https://…</code> trên một dòng, hoặc tải ảnh lên:</div><input type="file" accept="image/*" onChange={e => uploadImg(e, 'option')} /></div>}
        {(qf.qtype === 'mcq' || qf.qtype === 'order') && <Lbl t={qf.qtype === 'mcq' ? 'Các lựa chọn (mỗi dòng 1 đáp án)' : 'Các từ để sắp xếp (mỗi dòng 1 từ, thứ tự bất kỳ)'}><textarea className={inp} rows={4} value={qf.optText} onChange={e => setQf({ ...qf, optText: e.target.value })} /></Lbl>}
        {qf.qtype === 'mcq' && <Lbl t="Đáp án đúng"><select className={inp} value={qf.ansText} onChange={e => setQf({ ...qf, ansText: e.target.value })}><option value="">— chọn —</option>{opts.map(o => <option key={o} value={o}>{o.startsWith('img:') ? `[hình] ${o.slice(4, 40)}` : o}</option>)}</select></Lbl>}
        {qf.qtype === 'order' && <Lbl t="Câu đúng (mỗi dòng 1 cách ghép được chấp nhận, viết liền, không dấu câu)"><textarea className={inp} rows={2} value={qf.ansText} onChange={e => setQf({ ...qf, ansText: e.target.value })} /></Lbl>}
        {qf.qtype === 'fill' && <Lbl t="Đáp án được chấp nhận (mỗi dòng 1 đáp án)"><textarea className={inp} rows={2} value={qf.ansText} onChange={e => setQf({ ...qf, ansText: e.target.value })} /></Lbl>}
        {qf.qtype === 'match' && <Lbl t="Các cặp nối (mỗi dòng: trái = phải)"><textarea className={inp} rows={5} value={qf.optText} onChange={e => setQf({ ...qf, optText: e.target.value })} /></Lbl>}
        {qf.qtype === 'essay' && <p className="text-xs text-ink/60">Bài tự luận không có đáp án tự động. Học viên nộp bài xong, bạn chấm ở mục “Chấm bài viết”.</p>}
        <Lbl t="Lời giải / giải thích (hiện sau khi nộp bài)"><textarea className={inp} rows={2} value={qf.explanation} onChange={e => setQf({ ...qf, explanation: e.target.value })} /></Lbl>
        <Lbl t="Nội dung cần ôn nếu làm sai (ví dụ một từ hoặc chủ điểm ngữ pháp)"><input className={inp} value={qf.topic} onChange={e => setQf({ ...qf, topic: e.target.value })} /></Lbl>
        <div className="flex gap-2"><button className="btn-primary" disabled={busy} onClick={saveQ}>Lưu câu hỏi</button><button className="btn-ghost" onClick={() => setQf(null)}>Hủy</button></div></div></div>)}
    </div>)
}

// ---------- Chấm bài viết tự luận ----------
function Grading() {
  const [rows, setRows] = useState<any[]>([]), [msg, setMsg] = useState(''), [open, setOpen] = useState<any | null>(null), [essays, setEssays] = useState<QuestionRow[]>([]), [pts, setPts] = useState<Record<string, string>>({}), [cm, setCm] = useState<Record<string, string>>({})
  const load = useCallback(async () => { const { data, error } = await supabase!.rpc('admin_exam_attempts'); setRows(data ?? []); setMsg(error?.message ?? '') }, [])
  useEffect(() => { load() }, [load])
  const openAttempt = async (r: any) => {
    const a = await supabase!.from('exam_attempts').select('*').eq('id', r.id).single(); if (a.error) return setMsg(a.error.message)
    const c = await loadExamContent(a.data.exam_id); const es = c.questions.filter(q => q.qtype === 'essay')
    setOpen({ ...a.data, email: r.email, title: r.title }); setEssays(es)
    setPts(Object.fromEntries(es.map(q => [q.id, a.data.manual_points?.[q.id] !== undefined ? String(a.data.manual_points[q.id]) : '']))); setCm(Object.fromEntries(es.map(q => [q.id, a.data.feedback?.[q.id] ?? ''])))
  }
  const grade = async (q: QuestionRow) => {
    const p = Number(pts[q.id]); if (Number.isNaN(p) || pts[q.id] === '' || p < 0 || p > q.points) return setMsg(`Điểm phải từ 0 đến ${q.points}.`)
    const { error } = await supabase!.rpc('admin_exam_grade_essay', { p_attempt: open.id, p_question: q.id, p_points: p, p_comment: cm[q.id] ?? '' })
    if (error) return setMsg(error.message); setMsg('Đã lưu điểm.'); load(); openAttempt({ id: open.id, email: open.email, title: open.title })
  }
  return (
    <div className="space-y-3">
      {msg && <div className="rounded-xl bg-yellow-100 px-3 py-2 text-sm">{msg}</div>}
      {open ? (<div className="space-y-3"><button className="text-sm text-rose-500" onClick={() => setOpen(null)}>← Danh sách bài đã nộp</button>
        <div className="font-bold">{open.email} · {open.title} · {open.score}/{open.max_score}{open.pending_essays > 0 ? ' (tạm tính)' : ''}</div>
        {!essays.length && <p className="text-sm">Đề này không có câu tự luận.</p>}
        {essays.map(q => (<div key={q.id} className="card p-4 space-y-2">
          <div className="font-han font-semibold whitespace-pre-line">{q.prompt}</div>{q.passage && <div className="text-sm bg-rose-50 rounded-xl p-2 font-han whitespace-pre-line">{q.passage}</div>}
          <div className="text-sm text-ink/60">Bài làm của học viên:</div><div className="rounded-xl bg-white border border-rose-100 p-3 font-han whitespace-pre-wrap">{open.answers?.[q.id] || '(bỏ trống)'}</div>
          <div className="flex flex-wrap gap-2 items-end"><Lbl t={`Điểm (0–${q.points})`}><input className={`${inp} w-24`} value={pts[q.id] ?? ''} onChange={e => setPts({ ...pts, [q.id]: e.target.value })} /></Lbl>
            <div className="flex-1 min-w-[10rem]"><Lbl t="Nhận xét"><input className={inp} value={cm[q.id] ?? ''} onChange={e => setCm({ ...cm, [q.id]: e.target.value })} /></Lbl></div><button className="btn-primary" onClick={() => grade(q)}>Lưu điểm</button></div></div>))}</div>
      ) : (<div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left bg-rose-50"><th className="p-2">Học viên</th><th>Đề</th><th>Nộp lúc</th><th>Điểm</th><th>Chờ chấm</th><th /></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id} className="border-t border-rose-100"><td className="p-2 break-all">{r.email}</td><td>{r.title}</td><td>{r.submitted_at ? new Date(r.submitted_at).toLocaleString('vi-VN') : ''}</td><td>{r.score}/{r.max_score}</td><td className={r.pending_essays ? 'text-yellow-700 font-bold' : ''}>{r.pending_essays}</td><td><button className="text-sky-600" onClick={() => openAttempt(r)}>Mở</button></td></tr>)}</tbody></table>
        {!rows.length && <p className="p-3 text-sm text-ink/60">Chưa có bài nào được nộp.</p>}</div>)}
    </div>)
}
