import g from '../data/grammar.json'
import r from '../data/radicals.json'
import { supabase } from './supabase'
export interface GItem { id: string; sub: string; content: string }
export interface GLoai { name: string; items: GItem[] }
export interface GGroup { name: string; loais: GLoai[] }
export interface GTopic { l1: string; l2: string; l3: string }
export interface GTask { no: string; title: string; bullets: string[] }
export interface GLevel { groups: GGroup[]; topics: GTopic[]; tasks: GTask[] }
export let grammar = g as unknown as Record<string, GLevel>
export const grammarIds = (lv: number) => grammar[lv].groups.flatMap(x => x.loais.flatMap(l => l.items.map(i => i.id)))
export interface Radical { stt: number; radical: string; name: string; py: string; meaning: string; strokes: number }
export let radicals = r as Radical[]
// Lấy phần chữ Hán trong nội dung (bỏ phần giải thích tiếng Việt trong ngoặc) để đọc.
export const cjkSpeech = (t: string) => (t.replace(/\([^)]*\)/g, '').match(/[\u4e00-\u9fff]+/g) ?? []).join('，')

async function all(t: string, key: string) {
  const out: any[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await supabase!.from(t).select('*').order(key).range(f, f + 999)
    if (error) throw error
    out.push(...data); if (data.length < 1000) break
  }
  return out
}
const byPos = (a: any, b: any) => a.level - b.level || a.position - b.position
// Nếu đã nhập dữ liệu lên Supabase thì dùng dữ liệu đó (Admin sửa được); nếu chưa thì dùng file JSON.
export async function loadContentRemote() {
  if (!supabase) return
  try {
    const [pts, tops, tasks, rads] = await Promise.all([all('grammar_points', 'id'), all('grammar_topics', 'id'), all('grammar_tasks', 'id'), all('radicals', 'stt')])
    if (pts.length) {
      const next: Record<string, GLevel> = {}
      for (let lv = 1; lv <= 6; lv++) next[lv] = { groups: [], topics: [], tasks: [] }
      for (const p of pts.sort(byPos)) {
        const L = next[p.level]; if (!L) continue
        let g = L.groups.find(x => x.name === (p.nhom ?? ''))
        if (!g) { g = { name: p.nhom ?? '', loais: [] }; L.groups.push(g) }
        let l = g.loais[g.loais.length - 1]
        if (!l || l.name !== (p.loai ?? '')) { l = { name: p.loai ?? '', items: [] }; g.loais.push(l) }
        l.items.push({ id: p.id, sub: p.sub ?? '', content: p.content })
      }
      for (const t of tops.sort(byPos)) next[t.level]?.topics.push({ l1: t.l1 ?? '', l2: t.l2 ?? '', l3: t.l3 })
      for (const t of tasks.sort(byPos)) next[t.level]?.tasks.push({ no: t.no ?? '', title: t.title, bullets: (t.bullets ?? '').split('¶').filter(Boolean) })
      grammar = next
    }
    if (rads.length) radicals = rads.map(x => ({ stt: x.stt, radical: x.radical, name: x.name ?? '', py: x.py ?? '', meaning: (x.meaning ?? '').replace(/¶/g, '\n'), strokes: x.strokes }))
  } catch (e) { console.warn('Không tải được ngữ pháp/bộ thủ từ Supabase, dùng dữ liệu cục bộ', e) }
}
