import { useMemo, useState } from 'react'
import { Bar, Sound } from '../components/ui'
import { Radical, radicals } from '../lib/content'
import { update, useProgress } from '../lib/store'
import { speak } from '../lib/tts'

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)
const first = (r: Radical) => r.radical.match(/[^\s(（]/)?.[0] ?? r.radical
const mean = (r: Radical) => r.meaning.split('\n')[0]
const label = (r: Radical) => (r.py ? `${r.name} (${r.py})` : r.name)
interface Q { r: Radical; kind: 'meaning' | 'name'; options: string[]; answer: string }
const makeQuiz = (): Q[] => shuffle(radicals).slice(0, 10).map((r, i) => {
  const kind = i % 2 ? 'name' : 'meaning'
  const get = (x: Radical) => (kind === 'meaning' ? mean(x) : label(x))
  const opts = new Set([get(r)])
  for (const x of shuffle(radicals)) { if (opts.size >= 4) break; opts.add(get(x)) }
  return { r, kind, options: shuffle([...opts]), answer: get(r) }
})

export default function Radicals() {
  const p = useProgress()
  const STROKES = [...new Set(radicals.map(r => r.strokes))]
  const [mode, setMode] = useState<'list' | 'quiz'>('list')
  const [q, setQ] = useState(''), [stroke, setStroke] = useState(0), [open, setOpen] = useState<Radical | null>(null), [onlyTodo, setOnlyTodo] = useState(false)
  const done = Object.keys(p.radicals).length
  const toggle = (n: number) => update(s => { if (s.radicals[n]) delete s.radicals[n]; else s.radicals[n] = 1 })
  const list = useMemo(() => radicals.filter(r =>
    (!stroke || r.strokes === stroke) && (!onlyTodo || !p.radicals[r.stt]) &&
    (!q.trim() || `${r.radical} ${r.name} ${r.py} ${r.meaning} ${r.stt}`.toLowerCase().includes(q.trim().toLowerCase()))), [q, stroke, onlyTodo, p.radicals])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bộ thủ <span className="font-han text-base opacity-60">部首</span></h1>
      <div className="card p-4 space-y-2">
        <div className="flex justify-between text-sm"><span>Đã thuộc</span><b>{done}/{radicals.length} bộ</b></div>
        <Bar value={done} max={radicals.length} />
        <div className="flex gap-2 pt-1">
          <button className={mode === 'list' ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'} onClick={() => setMode('list')}>Danh sách</button>
          <button className={mode === 'quiz' ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'} onClick={() => setMode('quiz')}>✏️ Luyện tập</button>
        </div>
      </div>

      {mode === 'quiz' ? <Quiz onDone={() => setMode('list')} /> : (<>
        <div className="flex flex-wrap gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm bộ thủ, tên, nghĩa…" className="flex-1 min-w-[10rem] rounded-full border border-rose-100 bg-white px-4 py-2 text-sm" />
          <select value={stroke} onChange={e => setStroke(+e.target.value)} className="rounded-full border border-rose-100 bg-white px-3 py-2 text-sm">
            <option value={0}>Tất cả số nét</option>{STROKES.map(n => <option key={n} value={n}>{n} nét</option>)}</select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-rose-500" checked={onlyTodo} onChange={e => setOnlyTodo(e.target.checked)} />Chưa thuộc</label>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {list.map(r => (
            <button key={r.stt} onClick={() => setOpen(r)} className={`card p-2 text-center hover:shadow-md transition ${p.radicals[r.stt] ? 'border-green-300 bg-green-50' : ''}`}>
              <div className="text-[10px] text-ink/40 text-left">{r.stt}</div>
              <div className="font-han text-3xl font-bold leading-tight">{first(r)}</div>
              <div className="text-xs font-semibold truncate">{r.name}</div>
            </button>))}
        </div>
        {!list.length && <p className="text-sm text-ink/60">Không có bộ thủ phù hợp.</p>}
        <p className="text-xs text-ink/50">Nguồn: “214 bộ thủ Tiếng Trung” (Học Viện Ôn Ngọc BeU). Bản tài liệu này chỉ có {radicals.length} bộ: thiếu các bộ số 205–208 nên web không tự thêm.</p>
      </>)}

      {open && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(null)}>
          <div className="card w-full max-w-sm p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between"><span className="text-sm text-ink/50">Bộ số {open.stt} · {open.strokes} nét</span><button aria-label="Đóng" onClick={() => setOpen(null)}>✕</button></div>
            <div className="flex items-center gap-4">
              <img src={`/radicals/${open.stt}.png`} alt={`Cách viết bộ ${open.radical}`} width={120} height={120} className="rounded-2xl border border-rose-100 bg-white" />
              <div className="flex-1"><div className="font-han text-4xl font-bold">{open.radical}</div><div className="text-lg font-semibold text-rose-500">{label(open)}</div></div>
              <Sound text={first(open)} big />
            </div>
            <div className="text-sm whitespace-pre-line">{open.meaning}</div>
            <button className={p.radicals[open.stt] ? 'btn-ghost w-full' : 'btn-primary w-full'} onClick={() => toggle(open.stt)}>{p.radicals[open.stt] ? '✔ Đã thuộc (bấm để bỏ)' : 'Đánh dấu đã thuộc'}</button>
          </div>
        </div>)}
    </div>
  )
}

function Quiz({ onDone }: { onDone: () => void }) {
  const [qs, setQs] = useState(makeQuiz), [i, setI] = useState(0), [pick, setPick] = useState<string | null>(null), [score, setScore] = useState(0)
  const cur = qs[i]
  if (i >= qs.length) return (
    <div className="card p-8 text-center space-y-3 max-w-md mx-auto"><div className="text-5xl">{score >= 8 ? '🎉' : '💪'}</div>
      <h2 className="text-xl font-bold">{score}/{qs.length} câu đúng</h2>
      <div className="flex justify-center gap-2"><button className="btn-primary" onClick={() => { setQs(makeQuiz()); setI(0); setScore(0); setPick(null) }}>Làm lại</button><button className="btn-ghost" onClick={onDone}>Về danh sách</button></div></div>)
  const choose = (o: string) => { if (pick !== null) return; setPick(o); if (o === cur.answer) { setScore(s => s + 1); update(s => { s.radicals[cur.r.stt] = 1 }) } }
  return (
    <div className="max-w-xl mx-auto card p-6 space-y-4">
      <div className="flex justify-between text-sm"><span className="text-rose-500 font-semibold">{cur.kind === 'meaning' ? 'Chọn nghĩa của bộ thủ' : 'Chọn tên bộ thủ'}</span><span>Câu {i + 1}/{qs.length}</span></div>
      <div className="flex items-center justify-center gap-3"><div className="font-han text-6xl font-bold">{first(cur.r)}</div><button aria-label="Nghe" className="rounded-full bg-sky-100 h-10 w-10" onClick={() => speak(first(cur.r))}>🔊</button></div>
      <div className="grid gap-2">{cur.options.map(o => {
        const st = pick === null ? '' : o === cur.answer ? 'bg-green-100 border-green-400' : o === pick ? 'bg-red-100 border-red-400' : 'opacity-50'
        return <button key={o} onClick={() => choose(o)} className={`rounded-2xl border border-rose-100 bg-white px-4 py-3 text-left transition hover:bg-rose-50 ${st}`}>{o}</button>
      })}</div>
      {pick !== null && <div className="rounded-2xl bg-sky-100 p-3 text-sm space-y-2">
        <div className="font-bold">{pick === cur.answer ? '✅ Chính xác!' : `❌ Đáp án: ${cur.answer}`}</div>
        <div><span className="font-han">{cur.r.radical}</span> · {label(cur.r)} · {mean(cur.r)}</div>
        <button className="btn-primary" onClick={() => { setI(i + 1); setPick(null) }}>{i + 1 < qs.length ? 'Câu tiếp →' : 'Xem kết quả'}</button></div>}
    </div>
  )
}
