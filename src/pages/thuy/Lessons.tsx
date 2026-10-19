import { Go } from '../../lib/nav'
import { useProgress } from '../../lib/store'
import { Loading, useThuy } from '../../lib/thuy'
export default function ThuyLessons({ go }: { go: Go }) {
  const { data, err } = useThuy(); const p = useProgress()
  const msg = Loading({ data, err }); if (!data) return <p>{msg}</p>
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bài học <span className="font-han text-base opacity-60">课</span></h1>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">{data.lessons.map(l => {
        const vs = data.vocab.filter(v => v.lesson_id === l.id), n = vs.filter(v => p.thuy[v.id]).length
        return (<button key={l.id} onClick={() => go({ page: 'thuy_lesson', lessonId: l.id })} className={`card p-4 text-left hover:shadow-md transition ${vs.length && n === vs.length ? 'border-green-300' : ''}`}>
          <div className="font-bold font-han">{l.title} {vs.length > 0 && n === vs.length && '✅'}</div>
          <div className="text-xs text-ink/60 mt-1">{vs.length} từ vựng · {l.page_count ?? '?'} trang slide</div>
          <div className="text-xs text-rose-500 mt-1">Đã thuộc {n}/{vs.length} từ</div></button>)
      })}</div>
    </div>
  )
}
