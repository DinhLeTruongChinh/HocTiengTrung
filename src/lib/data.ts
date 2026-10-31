import raw from '../data/words.json'
import { supabase } from './supabase'
export interface Word { id: string; level: number; stt: number; zh: string; py: string; vi: string; exZh: string; exPy: string; exVi: string | null }
export interface Lesson { id: string; level: number; no: number; words: Word[] }
export const LESSON_SIZE = 20
export let words = raw as Word[]
export let byId = new Map(words.map(w => [w.id, w]))
export let lessons: Lesson[] = []
for (let lv = 1; lv <= 6; lv++) {
  const ws = words.filter(w => w.level === lv)
  for (let i = 0; i < ws.length; i += LESSON_SIZE)
    lessons.push({ id: `${lv}-${i / LESSON_SIZE + 1}`, level: lv, no: i / LESSON_SIZE + 1, words: ws.slice(i, i + LESSON_SIZE) })
}
export const lessonById = (id: string) => lessons.find(l => l.id === id)!
export const levelWords = (lv: number) => words.filter(w => w.level === lv)

async function all(t: string) {
  const out: any[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await supabase!.from(t).select('*').order('id').range(f, f + 999)
    if (error) throw error
    out.push(...data); if (data.length < 1000) break
  }
  return out
}
// Nếu đã cấu hình Supabase và đã seed dữ liệu, nội dung (do Admin chỉnh sửa) được lấy từ DB; nếu không thì dùng file JSON.
export async function loadRemote() {
  if (!supabase) return
  try {
    const [ls, vs] = await Promise.all([all('lessons'), all('vocabulary')])
    if (!ls.length || !vs.length) return
    const lv = new Map(ls.map(l => [l.id, l.course_id as number]))
    const ws: Word[] = vs.map(v => ({ id: v.id, level: lv.get(v.lesson_id) ?? 0, stt: v.position, zh: v.hanzi, py: v.pinyin, vi: v.meaning_vi,
      exZh: v.example_zh ?? '', exPy: v.example_pinyin ?? '', exVi: v.example_vi }))
    const byLesson = new Map<string, Word[]>()
    vs.forEach((v, i) => byLesson.set(v.lesson_id, [...(byLesson.get(v.lesson_id) ?? []), ws[i]]))
    const built = [...ls].sort((a, b) => a.course_id - b.course_id || a.position - b.position)
      .map(l => ({ id: l.id as string, level: l.course_id as number, no: l.position as number, words: (byLesson.get(l.id) ?? []).sort((a, b) => a.stt - b.stt) }))
      .filter(l => l.words.length)
    if (!built.length) return
    lessons = built; words = built.flatMap(l => l.words); byId = new Map(words.map(w => [w.id, w]))
  } catch (e) { console.warn('Không tải được dữ liệu từ Supabase, dùng dữ liệu cục bộ', e) }
}

export const lessonOf = (wordId: string) => lessons.find(l => l.words.some(w => w.id === wordId))
export const isDone = (l: Lesson, learned: Record<string, 1>) => l.words.every(w => learned[w.id])
// Từ chưa học đầu tiên (theo thứ tự tài liệu) và từ liền sau nó
export function resume(learned: Record<string, 1>) {
  const i = Math.max(0, words.findIndex(w => !learned[w.id]))
  return { word: words[i], next: words[i + 1], lesson: lessonOf(words[i].id)! }
}
