import { useEffect, useState } from 'react'
import { annotate, hasHan } from '../../lib/pinyin'
import { fileUrl } from '../../lib/exam'

// Chữ Hán kèm Pinyin phía trên (như đề HSK 1–2). Văn bản không có chữ Hán hiển thị bình thường.
export function PinyinText({ text, show, className = '' }: { text: string; show: boolean; className?: string }) {
  if (!show || !hasHan(text)) return <span className={className}>{text}</span>
  return (
    <span className={`inline-flex flex-wrap items-end gap-x-2 gap-y-1 ${className}`}>
      {annotate(text).map((s, i) => (
        <span key={i} className="inline-flex flex-col items-center leading-tight">
          <span className="text-[11px] font-sans text-ink/60 min-h-[14px] whitespace-pre">{s.py ?? ' '}</span><span>{s.t}</span></span>))}
    </span>)
}
const cache = new Map<string, string>()
// Hình: emoji (hiện lớn) hoặc ảnh tải lên Admin ('storage:...') / link http
export function Pic({ value, small }: { value: string; small?: boolean }) {
  const isFile = value.startsWith('storage:') || value.startsWith('http')
  const [url, setUrl] = useState(isFile ? cache.get(value) ?? '' : '')
  useEffect(() => { if (isFile && !cache.has(value)) fileUrl(value).then(u => { cache.set(value, u); setUrl(u) }).catch(() => setUrl('')) }, [value, isFile])
  if (!isFile) return <span className={small ? 'text-5xl' : 'text-7xl'} role="img" aria-label="hình minh họa">{value}</span>
  return url ? <img src={url} alt="hình minh họa" className={`object-cover rounded-xl ${small ? 'h-24 w-24' : 'h-44 w-44'}`} /> : <span className="text-sm text-ink/40">Đang tải ảnh…</span>
}
export const isImg = (v: unknown): v is string => typeof v === 'string' && v.startsWith('img:')
export const Letter = ({ i, on }: { i: number; on?: boolean }) => (
  <span className={`absolute left-0 top-0 grid h-8 w-9 place-items-center rounded-br-2xl rounded-tl-2xl text-sm font-bold ${on ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-600'}`}>{String.fromCharCode(65 + i)}</span>)
export function OptionBody({ v, pinyin, small }: { v: string; pinyin: boolean; small?: boolean }) {
  return isImg(v) ? <Pic value={v.slice(4)} small={small} /> : <PinyinText text={v} show={pinyin} className="font-han text-xl" />
}
