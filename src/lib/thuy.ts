import { useEffect, useState } from 'react'
import { supabase } from './supabase'
export interface TLesson { id: string; title: string; position: number; page_count: number | null }
export interface TVocab { id: string; lesson_id: string; position: number; hanzi: string; pinyin: string | null; pos: string | null; meaning: string | null }
export interface TPage { id: string; lesson_id: string; page: number; kind: string; content: string | null }
export interface ThuyData { lessons: TLesson[]; vocab: TVocab[]; pages: TPage[] }
let cache: ThuyData | null = null
async function all<T>(t: string): Promise<T[]> {
  const out: T[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await supabase!.from(t).select('*').order('id').range(f, f + 999)
    if (error) throw error
    out.push(...(data as T[])); if (data.length < 1000) break
  }
  return out
}
// Nội dung lớp chỉ tải được khi tài khoản có quyền (do RLS trên Supabase).
export function useThuy() {
  const [data, setData] = useState<ThuyData | null>(cache)
  const [err, setErr] = useState('')
  useEffect(() => {
    if (cache || !supabase) return
    Promise.all([all<TLesson>('thuy_lessons'), all<TVocab>('thuy_vocab'), all<TPage>('thuy_pages')]).then(([l, v, p]) => {
      const pos = new Map(l.map(x => [x.id, x.position]))
      cache = {
        lessons: l.sort((a, b) => a.position - b.position),
        vocab: v.sort((a, b) => (pos.get(a.lesson_id) ?? 0) - (pos.get(b.lesson_id) ?? 0) || a.position - b.position),
        pages: p.sort((a, b) => (pos.get(a.lesson_id) ?? 0) - (pos.get(b.lesson_id) ?? 0) || a.page - b.page),
      }
      setData(cache)
    }).catch(e => setErr(e.message))
  }, [])
  return { data, err }
}
export const Loading = ({ data, err }: { data: ThuyData | null; err: string }) =>
  err ? `Không tải được nội dung: ${err}. Hãy chắc chắn đã chạy thuy_content.sql và nhập 3 file CSV.` : data ? '' : 'Đang tải…'
