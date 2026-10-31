import { Bar, Stat } from '../components/ui'
import { byId, isDone, lessons, levelWords } from '../lib/data'
import { Go } from '../lib/nav'
import { streak, useProgress } from '../lib/store'

export default function ProgressPage({ go }: { go: Go }) {
  const p = useProgress()
  const attempts = Object.values(p.lessons).reduce((a, r) => a + r.tries, 0)
  const wrong = Object.entries(p.wrong).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 20)
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Tiến độ <span className="font-han text-base opacity-60">进度</span></h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon="📚" label="Từ đã học" value={Object.keys(p.learned).length} />
        <Stat icon="✅" label="Bài hoàn thành" value={lessons.filter(l => isDone(l, p.learned)).length} />
        <Stat icon="✏️" label="Lần luyện tập" value={attempts} />
        <Stat icon="🔥" label="Streak" value={streak(p.days)} />
      </div>
      <section className="card p-5 space-y-3">
        {[1, 2, 3, 4, 5, 6].map(lv => { const n = levelWords(lv).filter(w => p.learned[w.id]).length
          return <div key={lv}><div className="flex justify-between text-sm font-semibold"><span>HSK {lv}</span><span>{n}/{levelWords(lv).length}</span></div><Bar value={n} max={levelWords(lv).length} /></div> })}
      </section>
      <section className="card p-5">
        <h2 className="font-bold mb-2">Điểm từng bài</h2>
        {Object.keys(p.lessons).length === 0 ? <p className="text-sm text-ink/60">Chưa có bài nào được luyện tập.</p> :
          <div className="flex flex-wrap gap-2">{lessons.filter(l => p.lessons[l.id]).map(l => (
            <button key={l.id} onClick={() => go({ page: 'lesson', lessonId: l.id })} className="btn-ghost !py-1 text-sm">HSK{l.level}·B{l.no}: {p.lessons[l.id].best}% ({p.lessons[l.id].tries} lần)</button>))}</div>}
      </section>
      <section className="card p-5">
        <h2 className="font-bold mb-2">Những từ hay trả lời sai</h2>
        {wrong.length === 0 ? <p className="text-sm text-ink/60">Chưa có câu sai nào 🎉</p> :
          <div className="grid sm:grid-cols-2 gap-2">{wrong.map(([id, n]) => { const w = byId.get(id)!
            return <div key={id} className="rounded-2xl bg-rose-50 px-3 py-2 text-sm"><span className="font-han font-bold">{w.zh}</span> · {w.py} · {w.vi} <span className="text-rose-500">(sai {n})</span></div> })}</div>}
      </section>
    </div>
  )
}
