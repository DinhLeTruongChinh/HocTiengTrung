import { useState } from 'react'
import { Sound } from '../../components/ui'
import { update, useProgress } from '../../lib/store'
import { Loading, useThuy } from '../../lib/thuy'
export default function ThuyVocab() {
  const { data, err } = useThuy(); const p = useProgress()
  const [q, setQ] = useState(''), [lesson, setLesson] = useState(''), [todo, setTodo] = useState(false)
  const msg = Loading({ data, err }); if (!data) return <p>{msg}</p>
  const title = new Map(data.lessons.map(l => [l.id, l.title]))
  const list = data.vocab.filter(v => (!lesson || v.lesson_id === lesson) && (!todo || !p.thuy[v.id]) &&
    (!q.trim() || `${v.hanzi} ${v.pinyin} ${v.meaning}`.toLowerCase().includes(q.trim().toLowerCase())))
  const toggle = (id: string) => update(s => { if (s.thuy[id]) delete s.thuy[id]; else s.thuy[id] = 1 })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Từ vựng <span className="font-han text-base opacity-60">生词</span></h1>
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm từ, pinyin, nghĩa…" className="flex-1 min-w-[10rem] rounded-full border border-rose-100 bg-white px-4 py-2 text-sm" />
        <select value={lesson} onChange={e => setLesson(e.target.value)} className="rounded-full border border-rose-100 bg-white px-3 py-2 text-sm"><option value="">Tất cả bài</option>{data.lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-rose-500" checked={todo} onChange={e => setTodo(e.target.checked)} />Chưa thuộc</label></div>
      <div className="text-sm text-ink/60">{list.length} từ</div>
      <div className="grid sm:grid-cols-2 gap-3">{list.map(v => (
        <div key={v.id} className={`card p-4 flex items-center gap-3 ${p.thuy[v.id] ? 'border-green-300 bg-green-50' : ''}`}>
          <input type="checkbox" aria-label="Đã thuộc" className="h-5 w-5 accent-rose-500" checked={!!p.thuy[v.id]} onChange={() => toggle(v.id)} />
          <div className="flex-1 min-w-0"><div className="font-han text-2xl font-bold">{v.hanzi} <span className="text-base font-normal text-rose-500 font-sans">{v.pinyin}</span></div>
            <div className="font-medium">{v.meaning}</div><div className="text-xs text-ink/40">{title.get(v.lesson_id)}</div></div><Sound text={v.hanzi} /></div>))}</div>
    </div>
  )
}
