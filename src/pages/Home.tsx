import { Bar, Stat } from '../components/ui'
import { isDone, lessons, levelWords, resume, words } from '../lib/data'
import { grammar, grammarIds, radicals } from '../lib/content'
import { Go } from '../lib/nav'
import { streak, useProgress } from '../lib/store'

export default function Home({ go }: { go: Go }) {
  const p = useProgress()
  const done = lessons.filter(l => isDone(l, p.learned))
  const { word, next, lesson: cur } = resume(p.learned)
  const learned = Object.keys(p.learned).length
  return (
    <div className="space-y-5">
      <section className="card p-6 bg-gradient-to-r from-rose-50 to-sky-100">
        <h1 className="text-2xl md:text-3xl font-bold">Xin chào, người học! <span className="font-han">你好</span> 👋</h1>
        <p className="mt-1 text-ink/70">Hôm nay mình học tiếp nhé.</p>
        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <button className="btn-primary" onClick={() => go({ page: 'lesson', lessonId: cur.id, wordId: word.id })}>▶ Tiếp tục học</button>
          <span className="text-sm">Đang học: <b>HSK{cur.level} · Bài {cur.no} · từ <span className="font-han">{word.zh}</span></b>{next && <> · Từ tiếp theo: <b className="font-han">{next.zh}</b></>}</span>
        </div>
      </section>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon="📚" label="Từ vựng đã học" value={learned} />
        <Stat icon="✅" label="Bài đã hoàn thành" value={done.length} />
        <Stat icon="🔥" label="Ngày học liên tiếp" value={streak(p.days)} />
        <Stat icon="🎯" label="Từ cần ôn" value={Object.keys(p.weak).length} />
      </div>
      <section className="card p-5 space-y-2">
        <div className="flex justify-between font-semibold"><span>Tiến độ tổng</span><span>{learned}/{words.length} từ</span></div>
        <Bar value={learned} max={words.length} />
      </section>
      <section>
        <h2 className="text-lg font-bold mb-3">Khóa học</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(lv => {
            const ls = lessons.filter(l => l.level === lv)
            return (
              <button key={lv} onClick={() => go({ page: 'lessons', level: lv })} className="card p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition">
                <div className="flex justify-between items-baseline"><span className="text-xl font-bold text-rose-500">HSK {lv}</span><span className="text-sm text-ink/60">{levelWords(lv).length} từ</span></div>
                <div className="my-3"><Bar value={ls.filter(l => isDone(l, p.learned)).length} max={ls.length} color="bg-sky-600" /></div>
                <div className="text-sm text-ink/60">{ls.filter(l => isDone(l, p.learned)).length}/{ls.length} bài hoàn thành</div>
              </button>)
          })}
        </div>
      </section>
      <section className="grid sm:grid-cols-2 gap-3">
        <button onClick={() => go({ page: 'grammar' })} className="card p-5 text-left hover:shadow-md transition">
          <div className="font-bold text-rose-500">📘 Ngữ pháp HSK 1–6 <span className="font-han text-sm">语法</span></div>
          <div className="my-3"><Bar value={Object.keys(p.grammar).length} max={[1, 2, 3, 4, 5, 6].reduce((a, n) => a + grammarIds(n).length, 0)} color="bg-sky-600" /></div>
          <div className="text-sm text-ink/60">{Object.keys(p.grammar).length} điểm ngữ pháp đã học · {Object.keys(grammar).length} cấp</div>
        </button>
        <button onClick={() => go({ page: 'radicals' })} className="card p-5 text-left hover:shadow-md transition">
          <div className="font-bold text-rose-500">🈴 Bộ thủ <span className="font-han text-sm">部首</span></div>
          <div className="my-3"><Bar value={Object.keys(p.radicals).length} max={radicals.length} color="bg-sky-600" /></div>
          <div className="text-sm text-ink/60">{Object.keys(p.radicals).length}/{radicals.length} bộ thủ đã thuộc</div>
        </button>
      </section>
    </div>
  )
}
