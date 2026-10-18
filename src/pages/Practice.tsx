import { useState } from 'react'
import { Sound } from '../components/ui'
import { lessonById } from '../lib/data'
import { Go } from '../lib/nav'
import { KIND_LABEL, makeQuiz } from '../lib/quiz'
import { update } from '../lib/store'
import { speak } from '../lib/tts'

export default function Practice({ id, go }: { id: string; go: Go }) {
  const lesson = lessonById(id)
  const [qs, setQs] = useState(() => makeQuiz(lesson.words))
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const q = qs[i]
  const choose = (o: string) => {
    if (picked !== null) return
    setPicked(o)
    if (o === q.answer) { setScore(s => s + 1); update(p => { if (p.wrong[q.word.id]) p.wrong[q.word.id] = Math.max(0, p.wrong[q.word.id] - 1) }) }
    else update(p => { p.wrong[q.word.id] = (p.wrong[q.word.id] ?? 0) + 1 })
  }
  const next = () => {
    if (i + 1 < qs.length) { setI(i + 1); setPicked(null); return }
    const pct = Math.round((score / qs.length) * 100)
    update(p => { const r = p.lessons[id] ?? { best: 0, tries: 0 }; p.lessons[id] = { best: Math.max(r.best, pct), tries: r.tries + 1 }; lesson.words.forEach(w => (p.learned[w.id] = 1)) })
    setDone(true)
  }
  const restart = () => { setQs(makeQuiz(lesson.words)); setI(0); setPicked(null); setScore(0); setDone(false) }
  if (done) return (
    <div className="card p-8 text-center space-y-4 max-w-md mx-auto">
      <div className="text-5xl">{score / qs.length >= 0.8 ? '🎉' : '💪'}</div>
      <h2 className="text-2xl font-bold">{score}/{qs.length} câu đúng ({Math.round((score / qs.length) * 100)}%)</h2>
      <div className="flex flex-wrap justify-center gap-2">
        <button className="btn-primary" onClick={restart}>Làm lại</button>
        <button className="btn-ghost" onClick={() => go({ page: 'lesson', lessonId: id })}>Về bài học</button>
        <button className="btn-ghost" onClick={() => go({ page: 'review' })}>Ôn tập</button></div>
    </div>)
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex justify-between text-sm"><span>HSK {lesson.level} · Bài {lesson.no}</span><span>Câu {i + 1}/{qs.length} · Điểm {score}</span></div>
      <div className="card p-6 space-y-4">
        <div className="text-sm text-rose-500 font-semibold">{KIND_LABEL[q.kind]}</div>
        <div className="flex items-center justify-center gap-3 min-h-[5rem]">
          {q.kind === 'listen'
            ? <button className="btn-primary text-xl" onClick={() => speak(q.word.zh)}>🔊 Nghe</button>
            : <div className="font-han text-4xl font-bold text-center">{q.prompt}</div>}
          {q.kind === 'fill' && <Sound text={q.word.exZh} />}
        </div>
        {q.kind === 'fill' && q.word.exVi && <div className="text-center text-sm text-ink/60">{q.word.exVi}</div>}
        <div className="grid gap-2">
          {q.options.map(o => {
            const state = picked === null ? '' : o === q.answer ? 'bg-green-100 border-green-400' : o === picked ? 'bg-red-100 border-red-400' : 'opacity-50'
            return <button key={o} onClick={() => choose(o)} className={`rounded-2xl border border-rose-100 bg-white px-4 py-3 text-left font-medium transition hover:bg-rose-50 ${q.kind === 'hanzi' || q.kind === 'fill' ? 'font-han text-lg' : ''} ${state}`}>{o}</button>
          })}
        </div>
        {picked !== null && (
          <div className="rounded-2xl bg-sky-100 p-4 text-sm space-y-1">
            <div className="font-bold">{picked === q.answer ? '✅ Chính xác!' : `❌ Chưa đúng. Đáp án: ${q.answer}`}</div>
            <div><span className="font-han">{q.word.zh}</span> · {q.word.py} · {q.word.vi}</div>
            <div className="font-han">{q.word.exZh}</div>
            <button className="btn-primary mt-2" onClick={next}>{i + 1 < qs.length ? 'Câu tiếp theo →' : 'Xem kết quả'}</button>
          </div>)}
      </div>
    </div>
  )
}
