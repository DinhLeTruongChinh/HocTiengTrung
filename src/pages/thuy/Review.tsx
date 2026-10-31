import { useMemo, useState } from 'react'
import { Sound } from '../../components/ui'
import { Go } from '../../lib/nav'
import { update, useProgress } from '../../lib/store'
import { Loading, TVocab, useThuy } from '../../lib/thuy'

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)
interface Q { v: TVocab; kind: 'meaning' | 'pinyin'; options: string[]; answer: string }
const makeQuiz = (pool: TVocab[]): Q[] => shuffle(pool).slice(0, 10).map((v, i) => {
  const kind = i % 2 ? 'pinyin' : 'meaning'; const get = (x: TVocab) => (kind === 'meaning' ? x.meaning ?? '' : x.pinyin ?? '')
  const opts = new Set([get(v)]); for (const x of shuffle(pool)) { if (opts.size >= 4) break; if (get(x)) opts.add(get(x)) }
  return { v, kind, options: shuffle([...opts]), answer: get(v) }
})

export default function ThuyReview({ lessonId, go }: { lessonId?: string; go: Go }) {
  const { data, err } = useThuy(); const p = useProgress()
  const [scope, setScope] = useState<'all' | 'todo'>('all'), [mode, setMode] = useState<'card' | 'quiz'>('card'), [seed, setSeed] = useState(0)
  const [i, setI] = useState(0), [flip, setFlip] = useState(false), [pick, setPick] = useState<string | null>(null), [score, setScore] = useState(0)
  const pool = useMemo(() => (data ? data.vocab.filter(v => (!lessonId || v.lesson_id === lessonId) && (scope === 'all' || !p.thuy[v.id])) : []), [data, lessonId, scope, seed]) // eslint-disable-line
  const deck = useMemo(() => shuffle(pool), [pool, seed])
  const quiz = useMemo(() => (pool.length >= 4 ? makeQuiz(pool) : []), [pool, seed])
  const msg = Loading({ data, err }); if (!data) return <p>{msg}</p>
  const reset = () => { setI(0); setFlip(false); setPick(null); setScore(0); setSeed(s => s + 1) }
  const head = (
    <div className="card p-4 flex flex-wrap items-center gap-2">
      <button className={mode === 'card' ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'} onClick={() => { setMode('card'); reset() }}>🃏 Flashcard</button>
      <button className={mode === 'quiz' ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'} onClick={() => { setMode('quiz'); reset() }}>✏️ Trắc nghiệm</button>
      <select value={scope} onChange={e => { setScope(e.target.value as 'all' | 'todo'); reset() }} className="rounded-full border border-rose-100 bg-white px-3 py-1.5 text-sm"><option value="all">Tất cả từ</option><option value="todo">Chưa thuộc</option></select>
      {lessonId && <button className="text-sm text-rose-500" onClick={() => go({ page: 'thuy_review' })}>Bỏ lọc theo bài</button>}</div>)
  const empty = <p className="text-center text-ink/60">Không có từ nào để ôn ở bộ lọc này.</p>
  if (mode === 'card') {
    if (!deck.length) return <div className="space-y-4">{head}{empty}</div>
    if (i >= deck.length) return <div className="space-y-4">{head}<div className="card p-8 text-center space-y-3 max-w-md mx-auto"><div className="text-5xl">🌸</div><h2 className="text-xl font-bold">Hết lượt ôn!</h2><button className="btn-primary" onClick={reset}>Ôn lại</button></div></div>
    const v = deck[i]; const answer = (ok: boolean) => { update(s => { if (ok) s.thuy[v.id] = 1; else delete s.thuy[v.id] }); setI(i + 1); setFlip(false) }
    return (<div className="space-y-4 max-w-md mx-auto">{head}<div className="text-sm text-center">Thẻ {i + 1}/{deck.length}</div>
      <div onClick={() => setFlip(!flip)} className="card min-h-[16rem] p-8 flex flex-col items-center justify-center gap-3 cursor-pointer select-none hover:shadow-md transition">
        {!flip ? <><div className="font-han text-6xl font-bold">{v.hanzi}</div><div className="text-sm text-ink/50">Chạm để lật thẻ</div></> : <><div className="font-han text-3xl font-bold">{v.hanzi}</div><div className="text-xl text-rose-500">{v.pinyin}</div><div className="text-xl font-semibold text-center">{v.meaning}</div></>}
        <Sound text={v.hanzi} big /></div>
      <div className="grid grid-cols-2 gap-3"><button className="btn-ghost" onClick={() => answer(false)}>😕 Chưa nhớ</button><button className="btn-primary" onClick={() => answer(true)}>😊 Đã nhớ</button></div></div>)
  }
  if (!quiz.length) return <div className="space-y-4">{head}<p className="text-center text-ink/60">Cần ít nhất 4 từ để làm trắc nghiệm.</p></div>
  if (i >= quiz.length) return <div className="space-y-4">{head}<div className="card p-8 text-center space-y-3 max-w-md mx-auto"><div className="text-5xl">{score >= 8 ? '🎉' : '💪'}</div><h2 className="text-xl font-bold">{score}/{quiz.length} câu đúng</h2><button className="btn-primary" onClick={reset}>Làm lại</button></div></div>
  const q = quiz[i]; const choose = (o: string) => { if (pick !== null) return; setPick(o); if (o === q.answer) setScore(s => s + 1) }
  return (<div className="space-y-4 max-w-xl mx-auto">{head}<div className="card p-6 space-y-4">
    <div className="flex justify-between text-sm"><span className="text-rose-500 font-semibold">{q.kind === 'meaning' ? 'Chọn nghĩa tiếng Việt' : 'Chọn Pinyin đúng'}</span><span>Câu {i + 1}/{quiz.length}</span></div>
    <div className="flex items-center justify-center gap-3"><div className="font-han text-5xl font-bold">{q.v.hanzi}</div><Sound text={q.v.hanzi} /></div>
    <div className="grid gap-2">{q.options.map(o => { const st = pick === null ? '' : o === q.answer ? 'bg-green-100 border-green-400' : o === pick ? 'bg-red-100 border-red-400' : 'opacity-50'
      return <button key={o} onClick={() => choose(o)} className={`rounded-2xl border border-rose-100 bg-white px-4 py-3 text-left transition hover:bg-rose-50 ${st}`}>{o}</button> })}</div>
    {pick !== null && <button className="btn-primary" onClick={() => { setI(i + 1); setPick(null) }}>{pick === q.answer ? '✅ Đúng! ' : `❌ Đáp án: ${q.answer}. `}{i + 1 < quiz.length ? 'Câu tiếp →' : 'Xem kết quả'}</button>}</div></div>)
}
