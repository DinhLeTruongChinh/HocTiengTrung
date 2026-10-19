import { useState } from 'react'
import { Bar, Sound } from '../components/ui'
import { lessonById, lessons } from '../lib/data'
import { Go } from '../lib/nav'
import { update, useProgress } from '../lib/store'

type Tab = 'study' | 'list' | 'sentences'
const TABS: [Tab, string][] = [['study', 'Học từng từ'], ['list', 'Danh sách từ'], ['sentences', 'Mẫu câu']]

export default function LessonPage({ id, wordId, go }: { id: string; wordId?: string; go: Go }) {
  const lesson = lessonById(id)
  const p = useProgress()
  const first = lesson.words.findIndex(w => (wordId ? w.id === wordId : !p.learned[w.id]))
  const [tab, setTab] = useState<Tab>('study')
  const [idx, setIdx] = useState(Math.max(0, first))
  const [finished, setFinished] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const learnedCount = lesson.words.filter(w => p.learned[w.id]).length
  const markAll = () => update(s => lesson.words.forEach(w => (s.learned[w.id] = 1)))
  const li = lessons.findIndex(l => l.id === id)
  const prev = lessons[li - 1], nextL = lessons[li + 1]
  const nav = (
    <div className="flex justify-between gap-2">
      <button className="btn-ghost" disabled={!prev} onClick={() => go({ page: 'lesson', lessonId: prev.id })}>← {prev ? `Bài trước (HSK${prev.level}·${prev.no})` : 'Bài trước'}</button>
      <button className="btn-ghost" disabled={!nextL} onClick={() => go({ page: 'lesson', lessonId: nextL.id })}>{nextL ? `Bài sau (HSK${nextL.level}·${nextL.no})` : 'Bài sau'} →</button>
    </div>)
  const w = lesson.words[idx]
  const learnNext = () => {
    update(s => { s.learned[w.id] = 1 })
    if (idx + 1 < lesson.words.length) setIdx(idx + 1); else setFinished(true)
  }
  return (
    <div className="space-y-4">
      <button className="text-sm text-rose-500" onClick={() => go({ page: 'lessons', level: lesson.level })}>← HSK {lesson.level}</button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">HSK {lesson.level} · Bài {lesson.no}</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => go({ page: 'review', wordIds: lesson.words.map(x => x.id) })}>🃏 Flashcard</button>
          <button className="btn-primary" onClick={() => go({ page: 'practice', lessonId: id })}>✏️ Luyện tập</button>
        </div>
      </div>
      {nav}
      <div className="space-y-1"><div className="flex justify-between text-sm"><span>Đã học trong bài</span><b>{learnedCount}/{lesson.words.length} từ</b></div><Bar value={learnedCount} max={lesson.words.length} /></div>
      <div className="flex gap-2 overflow-x-auto">{TABS.map(([k, v]) => <button key={k} className={tab === k ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab(k)}>{v}</button>)}</div>

      {tab === 'study' && (finished ? (
        <div className="card p-8 text-center space-y-3 max-w-md mx-auto"><div className="text-5xl">🎉</div>
          <h2 className="text-xl font-bold">Bạn đã học xong {lesson.words.length} từ của bài này!</h2>
          <div className="flex flex-wrap justify-center gap-2">
            <button className="btn-primary" onClick={() => go({ page: 'practice', lessonId: id })}>✏️ Luyện tập</button>
            {nextL && <button className="btn-ghost" onClick={() => go({ page: 'lesson', lessonId: nextL.id })}>Bài sau →</button>}
            <button className="btn-ghost" onClick={() => { setFinished(false); setIdx(0) }}>Học lại từ đầu</button></div>
        </div>
      ) : (
        <div className="max-w-xl mx-auto space-y-3">
          <div className="text-sm text-center text-ink/60">Từ {idx + 1}/{lesson.words.length}{p.learned[w.id] && ' · ✔ đã học'}</div>
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center"><div className="font-han text-6xl font-bold">{w.zh}</div><div className="text-xl text-rose-500 mt-1">{w.py}</div></div>
              <Sound text={w.zh} big />
            </div>
            <div className="text-center text-xl font-semibold">{w.vi}</div>
            <div className="rounded-2xl bg-sky-100 p-4 flex gap-3 items-center">
              <div className="flex-1 space-y-0.5"><div className="font-han text-lg">{w.exZh}</div><div className="text-sm text-rose-500">{w.exPy}</div>{w.exVi && <div className="text-sm">{w.exVi}</div>}</div>
              <Sound text={w.exZh} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← Từ trước</button>
            <button className="btn-primary" onClick={learnNext}>{idx + 1 < lesson.words.length ? 'Đã học · Từ tiếp theo →' : 'Hoàn thành bài ✔'}</button>
          </div>
        </div>))}

      {tab === 'list' && (
        <div className="grid sm:grid-cols-2 gap-3">
          {lesson.words.map(x => (
            <div key={x.id} onClick={() => setOpen(open === x.id ? null : x.id)} className="card p-4 cursor-pointer hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="flex-1"><div className="font-han text-3xl font-bold">{x.zh} {p.learned[x.id] && <span className="text-sm">✔</span>}</div>
                  <div className="text-rose-500">{x.py}</div><div className="font-medium">{x.vi}</div></div>
                <Sound text={x.zh} />
              </div>
              {open === x.id && (
                <div className="mt-3 pt-3 border-t border-rose-100 flex gap-3">
                  <div className="flex-1 space-y-0.5"><div className="font-han text-lg">{x.exZh}</div>
                    <div className="text-sm text-rose-500">{x.exPy}</div>{x.exVi && <div className="text-sm">{x.exVi}</div>}</div>
                  <Sound text={x.exZh} />
                </div>)}
            </div>))}
        </div>)}

      {tab === 'sentences' && (
        <div className="space-y-3">
          {lesson.words.map(x => (
            <div key={x.id} className="card p-4 flex items-center gap-3">
              <div className="flex-1"><div className="font-han text-xl">{x.exZh}</div><div className="text-sm text-rose-500">{x.exPy}</div>
                {x.exVi && <div className="text-sm">{x.exVi}</div>}</div><Sound text={x.exZh} /></div>))}
          <p className="text-xs text-ink/50">Mẫu câu lấy nguyên từ cột “Ví dụ” của tài liệu. Tài liệu chưa có phần ngữ pháp và hội thoại riêng.</p>
        </div>)}

      {nav}
      <div className="text-center"><button className="btn-ghost" onClick={markAll} disabled={learnedCount === lesson.words.length}>{learnedCount === lesson.words.length ? '✔ Đã học cả bài' : 'Đánh dấu đã học cả bài'}</button></div>
    </div>
  )
}
