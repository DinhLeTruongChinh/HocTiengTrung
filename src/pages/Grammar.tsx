import { useState } from 'react'
import { Bar, Sound } from '../components/ui'
import { cjkSpeech, grammar, grammarIds } from '../lib/content'
import { update, useProgress } from '../lib/store'

type Tab = 'points' | 'topics' | 'tasks'
const TABS: [Tab, string][] = [['points', 'Điểm ngữ pháp'], ['topics', 'Chủ đề'], ['tasks', 'Nhiệm vụ HSK']]

export default function Grammar() {
  const [lv, setLv] = useState(1)
  const [tab, setTab] = useState<Tab>('points')
  const [q, setQ] = useState('')
  const p = useProgress()
  const data = grammar[lv]
  const ids = grammarIds(lv)
  const done = ids.filter(i => p.grammar[i]).length
  const toggle = (id: string) => update(s => { if (s.grammar[id]) delete s.grammar[id]; else s.grammar[id] = 1 })
  const markAll = () => update(s => ids.forEach(i => (s.grammar[i] = 1)))
  const match = (t: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase())
  const topicGroups = data.topics.reduce<Record<string, Record<string, string[]>>>((a, t) => {
    ((a[t.l1] ??= {})[t.l2] ??= []).push(t.l3); return a
  }, {})
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ngữ pháp <span className="font-han text-base opacity-60">语法</span></h1>
      <div className="flex gap-2 overflow-x-auto pb-1">{[1, 2, 3, 4, 5, 6].map(n => <button key={n} onClick={() => setLv(n)} className={lv === n ? 'btn-primary' : 'btn-ghost'}>HSK {n}</button>)}</div>
      <div className="flex gap-2 overflow-x-auto">{TABS.map(([k, v]) => <button key={k} onClick={() => setTab(k)} className={tab === k ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'}>{v}</button>)}</div>

      {tab === 'points' && (<>
        <div className="card p-4 space-y-2">
          <div className="flex justify-between text-sm"><span>Đã học HSK {lv}</span><b>{done}/{ids.length} điểm</b></div>
          <Bar value={done} max={ids.length} />
          <div className="flex flex-wrap gap-2 pt-1">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm trong ngữ pháp…" className="flex-1 min-w-[10rem] rounded-full border border-rose-100 bg-white px-4 py-2 text-sm" />
            <button className="btn-ghost !py-1.5 text-sm" disabled={done === ids.length} onClick={markAll}>Đánh dấu đã học hết</button>
          </div>
        </div>
        {data.groups.map(g => {
          const loais = g.loais.map(l => ({ ...l, items: l.items.filter(i => match(`${l.name} ${i.sub} ${i.content}`)) })).filter(l => l.items.length)
          if (!loais.length) return null
          return (
            <details key={g.name} open className="card p-4">
              <summary className="cursor-pointer font-bold text-rose-500">{g.name}</summary>
              <div className="mt-3 space-y-3">
                {loais.map((l, li) => (
                  <div key={li}>
                    {l.name && <div className="text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1">{l.name}</div>}
                    <div className="space-y-2">
                      {l.items.map(i => {
                        const speech = cjkSpeech(i.content)
                        return (
                          <div key={i.id} className={`rounded-2xl border p-3 flex items-start gap-3 ${p.grammar[i.id] ? 'border-green-200 bg-green-50' : 'border-rose-100 bg-white'}`}>
                            <input type="checkbox" aria-label="Đã học" className="mt-1.5 h-5 w-5 accent-rose-500" checked={!!p.grammar[i.id]} onChange={() => toggle(i.id)} />
                            <div className="flex-1 min-w-0">
                              {i.sub && <div className="text-sm font-semibold">{i.sub}</div>}
                              <div className="font-han text-lg leading-snug break-words">{i.content}</div>
                            </div>
                            {speech && <Sound text={speech} />}
                          </div>)
                      })}
                    </div>
                  </div>))}
              </div>
            </details>)
        })}
        <p className="text-xs text-ink/50">Nguồn: tài liệu ngữ pháp HSK 3.0 (cô Trần Mỹ Hạnh). Tài liệu là đề cương ngữ pháp, chưa kèm ví dụ nên web không tự thêm ví dụ hay bài tập.</p>
      </>)}

      {tab === 'topics' && (
        <div className="space-y-3">
          {Object.entries(topicGroups).map(([l1, l2s]) => (
            <div key={l1} className="card p-4">
              <div className="font-bold text-rose-500 mb-2">{l1}</div>
              <div className="space-y-3">{Object.entries(l2s).map(([l2, l3s]) => (
                <div key={l2}><div className="font-semibold text-sm">{l2}</div>
                  <div className="flex flex-wrap gap-2 mt-1">{l3s.map((t, i) => <span key={i} className="rounded-full bg-sky-100 px-3 py-1 text-sm">{t}</span>)}</div></div>))}</div>
            </div>))}
        </div>)}

      {tab === 'tasks' && (
        <div className="space-y-3">
          {data.tasks.map(t => (
            <details key={t.no} className="card p-4">
              <summary className="cursor-pointer font-semibold"><span className="text-rose-500">{t.no}.</span> {t.title}</summary>
              <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm">{t.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </details>))}
        </div>)}
    </div>
  )
}
