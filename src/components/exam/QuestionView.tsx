import { useEffect, useRef, useState } from 'react'
import { Item, audioUrl } from '../../lib/exam'
import { speak } from '../../lib/tts'
import { Letter, OptionBody, PinyinText, Pic, isImg } from './parts'

export function Listen({ item, plays, onPlay, compact }: { item: Item; plays: number; onPlay: () => void; compact?: boolean }) {
  const { q, section } = item, max = section.max_plays
  const [url, setUrl] = useState(''), [err, setErr] = useState(''); const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => { setUrl(''); setErr(''); if (q.audio_url) audioUrl(q.audio_url).then(setUrl).catch(e => setErr(e.message)) }, [q.audio_url])
  const left = max > 0 ? Math.max(0, max - plays) : Infinity
  const play = () => {
    if (left <= 0) return
    if (q.audio_url) { if (!url) return; onPlay(); ref.current?.play() } else if (q.audio_text) { onPlay(); speak(q.audio_text) }
  }
  if (!q.audio_url && !q.audio_text) return null
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl bg-sky-100 ${compact ? 'px-3 py-2' : 'p-3'}`}>
      <button className="btn-primary !py-1.5" disabled={left <= 0 || (!!q.audio_url && !url)} onClick={play}>🔊 Nghe</button>
      <span className="text-sm">{left === Infinity ? 'Không giới hạn' : `Còn ${left}/${max} lượt`}</span>
      {!compact && !q.audio_url && <span className="text-xs text-ink/50">(giọng đọc của trình duyệt)</span>}
      {err && <span className="text-xs text-red-600">{err}</span>}
      {q.audio_url && <audio ref={ref} src={url} preload="auto" />}
    </div>)
}

const Passage = ({ text, pinyin }: { text: string | null; pinyin: boolean }) => {
  const lines = (text ?? '').split('\n').filter(Boolean)
  return lines.length ? <div className="rounded-2xl bg-rose-50 p-4 space-y-2 leading-relaxed">{lines.map((l, i) => <p key={i}><PinyinText text={l} show={pinyin} className="font-han text-lg" /></p>)}</div> : null
}

export default function QuestionView({ item, value, onChange, plays, onPlay, pinyin }: { item: Item; value: any; onChange: (v: any) => void; plays: number; onPlay: () => void; pinyin: boolean }) {
  const { q, options } = item
  let body: JSX.Element | null = null
  if (q.qtype === 'mcq') {
    const opts = options as string[], pics = opts.some(isImg)
    body = (<div className={pics ? 'grid gap-3 sm:grid-cols-3' : 'grid gap-2'}>{opts.map((o, i) => (
      <button key={o} onClick={() => onChange(o)} className={`relative rounded-2xl border-2 text-left transition hover:bg-rose-50 ${pics ? 'flex min-h-[10rem] items-center justify-center p-3 pt-8' : 'px-4 py-3 pl-12'} ${value === o ? 'border-rose-500 bg-rose-100' : 'border-rose-100 bg-white'}`}>
        <Letter i={i} on={value === o} /><OptionBody v={o} pinyin={pinyin} /></button>))}</div>)
  }
  if (q.qtype === 'fill') body = <input value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder="Gõ đáp án…" className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 font-han text-lg" />
  if (q.qtype === 'essay') body = (<div><textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={9} placeholder="Viết bài của bạn ở đây…" className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 font-han text-lg" />
    <div className="text-xs text-ink/50 text-right">{(value ?? '').replace(/\s/g, '').length} ký tự · bài tự luận sẽ được admin chấm sau</div></div>)
  if (q.qtype === 'order') {
    const used: string[] = Array.isArray(value) ? value : []
    const bank = [...(options as string[])]; used.forEach(u => { const i = bank.indexOf(u); if (i >= 0) bank.splice(i, 1) })
    body = (<div className="space-y-3">
      <div className="min-h-[3.5rem] rounded-2xl border-2 border-dashed border-rose-200 bg-white p-2 flex flex-wrap gap-2 items-center">
        {!used.length && <span className="text-sm text-ink/40">Bấm vào các từ bên dưới để ghép câu…</span>}
        {used.map((w, i) => <button key={i} onClick={() => onChange(used.filter((_, k) => k !== i))} className="rounded-xl bg-rose-100 border border-rose-300 px-3 py-1.5 font-han text-lg">{w}</button>)}</div>
      <div className="flex flex-wrap gap-2">{bank.map((w, i) => <button key={i} onClick={() => onChange([...used, w])} className="rounded-xl bg-white border border-rose-100 px-3 py-1.5 font-han text-lg hover:bg-rose-50">{w}</button>)}</div>
      {used.length > 0 && <button className="text-sm text-rose-500" onClick={() => onChange([])}>Xóa hết, làm lại</button>}</div>)
  }
  if (q.qtype === 'match') {
    const v: Record<string, string> = value && typeof value === 'object' ? value : {}
    body = (<div className="space-y-2">{(options.left as string[]).map(l => (
      <div key={l} className="flex items-center gap-3"><div className="w-28 shrink-0 font-han text-xl font-bold">{l}</div>
        <select value={v[l] ?? ''} onChange={e => { const n = { ...v }; if (e.target.value) n[l] = e.target.value; else delete n[l]; onChange(n) }} className="flex-1 rounded-xl border border-rose-100 bg-white px-3 py-2">
          <option value="">— chọn nghĩa —</option>{(options.right as string[]).map(r => <option key={r} value={r}>{r}</option>)}</select></div>))}</div>)
  }
  return (
    <div className="space-y-4">
      {(q.audio_url || q.audio_text) && <div className="flex justify-center"><Listen item={item} plays={plays} onPlay={onPlay} /></div>}
      {q.image && <div className="flex justify-center"><Pic value={q.image} /></div>}
      <Passage text={q.passage} pinyin={pinyin} />
      <div className="font-han text-xl font-semibold leading-snug whitespace-pre-line"><PinyinText text={q.prompt} show={pinyin} /></div>
      {body}
    </div>)
}

// Nhiều câu dùng chung một bảng đáp án A–E (nối hình, nối câu, điền từ): chọn dòng rồi bấm đáp án.
export function GroupView({ items, answers, setAnswer, plays, onPlay, pinyin }: { items: Item[]; answers: Record<string, any>; setAnswer: (id: string, v: any) => void; plays: Record<string, number>; onPlay: (id: string) => void; pinyin: boolean }) {
  const [active, setActive] = useState(items[0].q.id)
  const pool = items[0].options as string[]
  const letter = (v: any) => { const i = pool.indexOf(v); return i < 0 ? '' : String.fromCharCode(65 + i) }
  const assign = (v: string) => {
    setAnswer(active, v)
    const k = items.findIndex(i => i.q.id === active)
    const next = items.find((i, n) => n > k && !answers[i.q.id]) ?? items[k + 1]
    if (next) setActive(next.q.id)
  }
  const instruction = items[0].q.passage
  return (
    <div className="space-y-4">
      {instruction && <p className="text-sm text-ink/70">{instruction}</p>}
      <div className="space-y-2">{items.map(it => {
        const audio = !!(it.q.audio_url || it.q.audio_text), on = active === it.q.id
        return (
          <div key={it.q.id} onClick={() => setActive(it.q.id)} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 transition ${on ? 'border-rose-500 bg-rose-50' : 'border-rose-100 bg-white'}`}>
            <span className="w-8 shrink-0 font-bold">{it.no}.</span>
            <div className="flex-1 min-w-0">{audio ? <Listen item={it} plays={plays[it.q.id] ?? 0} onPlay={() => onPlay(it.q.id)} compact /> : <PinyinText text={it.q.prompt} show={pinyin} className="font-han text-xl" />}</div>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 text-lg font-bold ${answers[it.q.id] ? 'border-rose-500 bg-rose-500 text-white' : 'border-rose-200 bg-white text-ink/30'}`}>{letter(answers[it.q.id]) || '?'}</span>
          </div>)
      })}</div>
      <div className="text-xs text-ink/60">Bấm vào một dòng ở trên, rồi bấm vào đáp án ở bên dưới để chọn.</div>
      <div className="grid gap-2 sm:grid-cols-2">{pool.map((o, i) => {
        const taken = items.some(it => answers[it.q.id] === o)
        return (<button key={o} onClick={() => assign(o)} className={`relative flex min-h-[5rem] items-center justify-center rounded-2xl border-2 p-3 pl-12 transition hover:bg-rose-50 ${taken ? 'border-rose-300 bg-rose-50' : 'border-rose-100 bg-white'}`}>
          <Letter i={i} on={taken} /><OptionBody v={o} pinyin={pinyin} small /></button>)
      })}</div>
    </div>)
}
