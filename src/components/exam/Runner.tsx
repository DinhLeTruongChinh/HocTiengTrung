import { useEffect, useMemo, useRef, useState } from 'react'
import { AttemptRow, Content, ExamRow, Item, Kind, KIND_NAME, KIND_ZH, ZH_NUM, buildItems, loadExamContent, mmss } from '../../lib/exam'
import { supabase } from '../../lib/supabase'
import QuestionView, { GroupView } from './QuestionView'

// nhãn kiểu đề thật: 听力 · 第一部分: 第 1-5 题
function partLabel(items: Item[], cur: Item) {
  const part = cur.q.part ?? 1, same = items.filter(i => i.section.id === cur.section.id && (i.q.part ?? 1) === part)
  return `${KIND_ZH[cur.section.kind]} · 第${ZH_NUM[part] ?? part}部分: 第 ${Math.min(...same.map(i => i.no))}-${Math.max(...same.map(i => i.no))} 题`
}
const has = (v: any) => !(v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length))

export default function Runner({ exam, attempt, onSubmitted, onExit }: { exam: ExamRow; attempt: AttemptRow; onSubmitted: (a: AttemptRow) => void; onExit: () => void }) {
  const lsAns = `exam-ans-${attempt.id}`, lsStart = `exam-start-${attempt.id}`, lsPlays = `exam-plays-${attempt.id}`
  const [content, setContent] = useState<Content | null>(null), [err, setErr] = useState('')
  const [answers, setAnswers] = useState<Record<string, any>>(() => { try { return { ...(attempt.answers ?? {}), ...JSON.parse(localStorage.getItem(lsAns) || '{}') } } catch { return attempt.answers ?? {} } })
  const [plays, setPlays] = useState<Record<string, number>>(() => { try { return JSON.parse(localStorage.getItem(lsPlays) || '{}') } catch { return {} } })
  const [idx, setIdx] = useState(0), [confirm, setConfirm] = useState(false), [exit, setExit] = useState(false), [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<'saving' | 'saved' | 'error'>('saved')
  // mốc bắt đầu: ưu tiên mốc đã lưu trên máy; lượt mới (chưa có câu trả lời) tính từ lúc mở để không bị lệch đồng hồ
  const startMs = useMemo(() => {
    const s = Number(localStorage.getItem(lsStart)); if (s) return s
    const v = Object.keys(attempt.answers ?? {}).length ? new Date(attempt.started_at).getTime() : Date.now()
    localStorage.setItem(lsStart, String(v)); return v
  }, [attempt.id]) // eslint-disable-line
  const deadline = startMs + exam.duration_min * 60000
  const [left, setLeft] = useState(Math.max(0, Math.round((deadline - Date.now()) / 1000)))
  const ansRef = useRef(answers); ansRef.current = answers
  const busyRef = useRef(false)

  useEffect(() => { loadExamContent(exam.id).then(setContent).catch(e => setErr(e.message)) }, [exam.id])
  const items = useMemo(() => (content ? buildItems(exam, content, attempt.id) : []), [content, exam, attempt.id])

  const submit = async () => {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true); setConfirm(false)
    const { data, error } = await supabase!.rpc('exam_submit', { p_attempt: attempt.id, p_answers: ansRef.current })
    if (error) { setErr(`Không nộp được bài: ${error.message}. Hãy kiểm tra mạng và bấm Nộp bài lại.`); busyRef.current = false; setBusy(false); return }
    [lsAns, lsStart, lsPlays].forEach(k => localStorage.removeItem(k)); onSubmitted(data as AttemptRow)
  }
  const submitRef = useRef(submit); submitRef.current = submit
  useEffect(() => {
    const t = setInterval(() => { const r = Math.max(0, Math.round((deadline - Date.now()) / 1000)); setLeft(r); if (r <= 0) { clearInterval(t); submitRef.current() } }, 1000)
    return () => clearInterval(t)
  }, [deadline])
  // tự động lưu: ngay vào máy, rồi lên Supabase sau 0,8 giây
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    localStorage.setItem(lsAns, JSON.stringify(answers)); setSaved('saving')
    const t = setTimeout(async () => { const { error } = await supabase!.rpc('exam_save', { p_attempt: attempt.id, p_answers: answers }); setSaved(error ? 'error' : 'saved') }, 800)
    return () => clearTimeout(t)
  }, [answers]) // eslint-disable-line
  useEffect(() => { localStorage.setItem(lsPlays, JSON.stringify(plays)) }, [plays]) // eslint-disable-line

  // gom các câu cùng nhóm (nối hình…) thành một trang
  const pages = useMemo(() => { const ps: Item[][] = []; for (const it of items) { const last = ps[ps.length - 1]; if (last && it.q.group_key && last[0].q.group_key === it.q.group_key && last[0].section.id === it.section.id) last.push(it); else ps.push([it]) } return ps }, [items])
  const pinyin = exam.level <= 2   // đề HSK 1–2 hiện Pinyin trên chữ Hán
  if (err && !items.length) return <div className="card p-6 text-red-700">{err} <button className="btn-ghost ml-2" onClick={onExit}>Quay lại</button></div>
  if (!items.length) return <p>Đang tải đề thi…</p>
  const page = pages[idx] ?? pages[0], cur = page[0], answered = items.filter(i => has(answers[i.q.id])).length
  const kinds = [...new Set(items.map(i => i.section.kind))] as Kind[]
  const total = items.length
  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      <div className="card p-3 sticky top-[68px] z-10 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className={`text-xl font-bold tabular-nums ${left < 300 ? 'text-red-600' : ''}`}>⏱ {mmss(left)}</div>
          <div className="text-sm font-semibold">Câu {page.length > 1 ? `${page[0].no}–${page[page.length - 1].no}` : cur.no}/{total}</div>
          <div className="text-xs text-ink/60">{saved === 'saving' ? 'Đang lưu…' : saved === 'saved' ? '✔ Đã tự động lưu' : '⚠ Chưa lưu được lên mạng (đã lưu trên máy)'}</div>
          <div className="flex gap-2"><button className="btn-ghost !py-1.5 text-sm" onClick={() => setExit(true)}>Thoát</button><button className="btn-primary !py-1.5" disabled={busy} onClick={() => setConfirm(true)}>Nộp bài</button></div></div>
        <div className="h-2 rounded-full bg-rose-100 overflow-hidden"><div className="h-full bg-rose-500 transition-all" style={{ width: `${(answered / total) * 100}%` }} /></div>
        <div className="text-xs text-ink/60">Đã trả lời {answered}/{total} câu</div></div>
      {err && <div className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-700">{err}</div>}
      <div className="flex gap-2 overflow-x-auto">{kinds.map(k => {
        const n = items.filter(i => i.section.kind === k), on = cur.section.kind === k
        return <button key={k} onClick={() => setIdx(pages.findIndex(p => p[0].section.kind === k))} className={on ? 'btn-primary !py-1.5 text-sm' : 'btn-ghost !py-1.5 text-sm'}>{KIND_NAME[k]} ({n.filter(i => has(answers[i.q.id])).length}/{n.length})</button>
      })}</div>
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-rose-100 pb-2 text-sm"><b className="font-han text-rose-500">{partLabel(items, cur)}</b><span className="text-ink/60">{cur.section.title}</span></div>
        {page.length > 1
          ? <GroupView key={cur.q.group_key ?? cur.q.id} items={page} answers={answers} pinyin={pinyin} setAnswer={(id, v) => setAnswers(a => ({ ...a, [id]: v }))} plays={plays} onPlay={id => setPlays(p => ({ ...p, [id]: (p[id] ?? 0) + 1 }))} />
          : <QuestionView key={cur.q.id} item={cur} pinyin={pinyin} value={answers[cur.q.id]} onChange={v => setAnswers(a => ({ ...a, [cur.q.id]: v }))} plays={plays[cur.q.id] ?? 0} onPlay={() => setPlays(p => ({ ...p, [cur.q.id]: (p[cur.q.id] ?? 0) + 1 }))} />}
        <div className="flex justify-between pt-2"><button className="btn-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← Câu trước</button><button className="btn-primary" disabled={idx === pages.length - 1} onClick={() => setIdx(idx + 1)}>Câu tiếp theo →</button></div></div>
      <div className="card p-3 space-y-2">{kinds.map(k => (<div key={k}><div className="text-xs font-semibold text-ink/60 mb-1">{KIND_NAME[k]}</div>
        <div className="flex flex-wrap gap-1.5">{items.map((i, n) => i.section.kind === k && (
          <button key={i.q.id} aria-label={`Câu ${i.no}`} onClick={() => setIdx(pages.findIndex(pg => pg.includes(i)))} className={`h-8 w-8 rounded-lg text-xs font-semibold border ${page.includes(i) ? 'ring-2 ring-rose-500' : ''} ${has(answers[i.q.id]) ? 'bg-rose-500 text-white border-rose-500' : 'bg-white border-rose-100'}`}>{i.no}</button>))}</div></div>))}</div>

      {confirm && <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4"><div className="card w-full max-w-sm p-5 space-y-3">
        <h3 className="font-bold text-lg">Nộp bài?</h3>
        {answered < total ? <p className="text-sm text-red-600">Bạn còn <b>{total - answered}</b> câu chưa trả lời. Câu bỏ trống sẽ không được tính điểm.</p> : <p className="text-sm">Bạn đã trả lời tất cả các câu.</p>}
        <p className="text-sm text-ink/70">Thời gian còn lại: {mmss(left)}. Sau khi nộp sẽ không sửa được bài.</p>
        <div className="flex gap-2"><button className="btn-primary flex-1" onClick={submit}>Nộp bài</button><button className="btn-ghost flex-1" onClick={() => setConfirm(false)}>Làm tiếp</button></div></div></div>}
      {exit && <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4"><div className="card w-full max-w-sm p-5 space-y-3">
        <h3 className="font-bold text-lg">Thoát khỏi bài thi?</h3>
        <p className="text-sm">Bài làm được lưu lại và đồng hồ <b>vẫn chạy</b>. Bạn có thể quay lại làm tiếp nếu còn thời gian.</p>
        <div className="flex gap-2"><button className="btn-ghost flex-1" onClick={onExit}>Thoát</button><button className="btn-primary flex-1" onClick={() => setExit(false)}>Ở lại</button></div></div></div>}
    </div>)
}
