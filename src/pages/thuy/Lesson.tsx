import { useState } from 'react'
import SlideViewer from '../../components/SlideViewer'
import { Bar, Sound } from '../../components/ui'
import { cjkSpeech } from '../../lib/content'
import { Go } from '../../lib/nav'
import { update, useProgress } from '../../lib/store'
import { Loading, TPage, useThuy } from '../../lib/thuy'

type Tab = 'vocab' | 'dialogue' | 'grammar' | 'exercise' | 'slide'
const NAMES: Record<Tab, string> = { vocab: 'Từ vựng', dialogue: 'Bài khóa', grammar: 'Ngữ pháp & ghi chú', exercise: 'Bài tập', slide: 'Slide gốc' }

function PageCard({ p }: { p: TPage }) {
  const lines = (p.content ?? '').split('¶').filter(Boolean)
  return (
    <div className="card p-4 space-y-1.5"><div className="text-xs text-ink/40">Trang {p.page}</div>
      {lines.map((l, i) => (<div key={i} className="flex items-start gap-2"><div className="flex-1 font-han leading-snug break-words">{l}</div>
        {/[\u4e00-\u9fff]{2,}/.test(l) && <Sound text={cjkSpeech(l)} />}</div>))}</div>)
}

export default function ThuyLesson({ id, go }: { id: string; go: Go }) {
  const { data, err } = useThuy(); const p = useProgress(); const [tab, setTab] = useState<Tab>('vocab')
  const msg = Loading({ data, err }); if (!data) return <p>{msg}</p>
  const li = data.lessons.findIndex(l => l.id === id); const lesson = data.lessons[li]
  if (!lesson) return <p>Không tìm thấy bài học.</p>
  const vs = data.vocab.filter(v => v.lesson_id === id), pages = data.pages.filter(x => x.lesson_id === id)
  const done = vs.filter(v => p.thuy[v.id]).length
  const toggle = (vid: string) => update(s => { if (s.thuy[vid]) delete s.thuy[vid]; else s.thuy[vid] = 1 })
  const tabs = (['vocab', 'dialogue', 'grammar', 'exercise', 'slide'] as Tab[]).filter(t => t === 'vocab' || t === 'slide' || pages.some(x => x.kind === t))
  const images = pages.filter(x => x.kind === 'image').length
  const prev = data.lessons[li - 1], next = data.lessons[li + 1]
  return (
    <div className="space-y-4">
      <button className="text-sm text-rose-500" onClick={() => go({ page: 'thuy_lessons' })}>← Danh sách bài</button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold font-han">{lesson.title}</h1>
        <button className="btn-primary" disabled={!vs.length} onClick={() => go({ page: 'thuy_review', lessonId: id })}>🃏 Ôn bài này</button></div>
      <div className="flex justify-between gap-2">
        <button className="btn-ghost" disabled={!prev} onClick={() => go({ page: 'thuy_lesson', lessonId: prev.id })}>← Bài trước</button>
        <button className="btn-ghost" disabled={!next} onClick={() => go({ page: 'thuy_lesson', lessonId: next.id })}>Bài sau →</button></div>
      <div className="space-y-1"><div className="flex justify-between text-sm"><span>Đã thuộc</span><b>{done}/{vs.length} từ</b></div><Bar value={done} max={vs.length} /></div>
      <div className="flex gap-2 overflow-x-auto">{tabs.map(t => <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'}>{NAMES[t]}</button>)}</div>

      {tab === 'vocab' && (vs.length ? (<div className="grid sm:grid-cols-2 gap-3">{vs.map(v => (
        <div key={v.id} className={`card p-4 flex items-center gap-3 ${p.thuy[v.id] ? 'border-green-300 bg-green-50' : ''}`}>
          <input type="checkbox" aria-label="Đã thuộc" className="h-5 w-5 accent-rose-500" checked={!!p.thuy[v.id]} onChange={() => toggle(v.id)} />
          <div className="flex-1 min-w-0"><div className="font-han text-2xl font-bold">{v.hanzi}</div><div className="text-rose-500">{v.pinyin}</div>
            <div className="font-medium">{v.meaning}</div>{v.pos && <div className="text-xs text-ink/50">{v.pos}</div>}</div>
          <Sound text={v.hanzi} /></div>))}</div>) : <p className="text-sm text-ink/60">Bài này chưa có từ vựng được tách riêng. Xem tab Slide gốc.</p>)}
      {(['dialogue', 'grammar', 'exercise'] as Tab[]).map(t => tab === t && <div key={t} className="space-y-3">{pages.filter(x => x.kind === t).map(x => <PageCard key={x.id} p={x} />)}
        {images > 0 && <p className="text-xs text-ink/50">Có {images} trang của bài này chỉ là hình ảnh, xem ở tab “Slide gốc”.</p>}</div>)}
      {tab === 'slide' && <SlideViewer slug={id} />}
    </div>
  )
}
