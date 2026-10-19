import { useState } from 'react'
import { Sound } from '../components/ui'
import { byId, Word, words } from '../lib/data'
import { update, useProgress } from '../lib/store'

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)
type Mode = 'weak' | 'wrong' | 'random'

export default function Review({ wordIds }: { wordIds?: string[] }) {
  const p = useProgress()
  const [deck, setDeck] = useState<Word[] | null>(wordIds ? shuffle(wordIds.map(i => byId.get(i)!)) : null)
  const [i, setI] = useState(0)
  const [flip, setFlip] = useState(false)
  const start = (m: Mode) => {
    const learned = words.filter(w => p.learned[w.id])
    const ids = m === 'weak' ? Object.keys(p.weak) : m === 'wrong' ? Object.keys(p.wrong).filter(k => p.wrong[k] > 0) : []
    const d = m === 'random' ? shuffle(learned).slice(0, 20) : shuffle(ids.map(x => byId.get(x)!))
    setDeck(d); setI(0); setFlip(false)
  }
  if (!deck) {
    const opts: [Mode, string, number][] = [['weak', 'Từ chưa nhớ', Object.keys(p.weak).length], ['wrong', 'Ôn lại câu sai', Object.values(p.wrong).filter(n => n > 0).length], ['random', 'Ngẫu nhiên (từ đã học)', Math.min(20, Object.keys(p.learned).length)]]
    return (
      <div className="space-y-4"><h1 className="text-2xl font-bold">Ôn tập <span className="font-han text-base opacity-60">复习</span></h1>
        <div className="grid sm:grid-cols-3 gap-3">
          {opts.map(([m, label, n]) => (
            <button key={m} disabled={!n} onClick={() => start(m)} className="card p-5 text-left disabled:opacity-50 hover:shadow-md transition">
              <div className="font-bold">{label}</div><div className="text-sm text-ink/60">{n} từ</div></button>))}
        </div>
        <p className="text-sm text-ink/60">Ôn theo từng bài: mở một bài học và bấm “Flashcard”.</p></div>)
  }
  if (i >= deck.length) return (
    <div className="card p-8 text-center space-y-3 max-w-md mx-auto"><div className="text-5xl">🌸</div>
      <h2 className="text-xl font-bold">{deck.length ? 'Hoàn thành lượt ôn!' : 'Chưa có từ nào để ôn.'}</h2>
      <button className="btn-primary" onClick={() => { setDeck(null); setI(0) }}>Quay lại</button></div>)
  const w = deck[i]
  const answer = (ok: boolean) => {
    update(s => { if (ok) { delete s.weak[w.id]; if (s.wrong[w.id]) s.wrong[w.id] = 0 } else s.weak[w.id] = 1; s.learned[w.id] = 1 })
    setI(i + 1); setFlip(false)
  }
  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="text-sm text-center">Thẻ {i + 1}/{deck.length}</div>
      <div onClick={() => setFlip(!flip)} className="card min-h-[18rem] p-8 flex flex-col items-center justify-center gap-3 cursor-pointer select-none hover:shadow-md transition">
        {!flip ? <><div className="font-han text-6xl font-bold">{w.zh}</div><div className="text-sm text-ink/50">Chạm để lật thẻ</div></>
          : <><div className="font-han text-3xl font-bold">{w.zh}</div><div className="text-xl text-rose-500">{w.py}</div><div className="text-xl font-semibold text-center">{w.vi}</div></>}
        <Sound text={w.zh} big />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-ghost" onClick={() => answer(false)}>😕 Chưa nhớ</button>
        <button className="btn-primary" onClick={() => answer(true)}>😊 Đã nhớ</button></div>
    </div>
  )
}
