import { useState } from 'react'
import { isDone, lessons } from '../lib/data'
import { Go } from '../lib/nav'
import { useProgress } from '../lib/store'

export default function Lessons({ go, level }: { go: Go; level?: number }) {
  const [lv, setLv] = useState(level ?? 1)
  const p = useProgress()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bài học <span className="font-han text-base opacity-60">课程</span></h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4, 5, 6].map(n => <button key={n} onClick={() => setLv(n)} className={lv === n ? 'btn-primary' : 'btn-ghost'}>HSK {n}</button>)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {lessons.filter(l => l.level === lv).map(l => {
          const r = p.lessons[l.id]
          const n = l.words.filter(w => p.learned[w.id]).length
          const done = isDone(l, p.learned)
          return (
            <button key={l.id} onClick={() => go({ page: 'lesson', lessonId: l.id })}
              className={`card p-4 text-left hover:shadow-md transition ${done ? 'border-green-200' : ''}`}>
              <div className="font-bold">Bài {l.no} {done && '✅'}</div>
              <div className="text-xs text-ink/60">Đã học {n}/{l.words.length} từ</div>
              <div className="font-han mt-2 text-sm truncate">{l.words.slice(0, 3).map(w => w.zh).join(' · ')}</div>
              {r && <div className="text-xs mt-1 text-rose-500">Điểm tốt nhất: {r.best}%</div>}
            </button>)
        })}
      </div>
    </div>
  )
}
