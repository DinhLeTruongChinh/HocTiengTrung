import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'
export type HairStyle = 'buns2' | 'long' | 'bunsRound' | 'bun1' | 'short' | 'tail'
export interface Avatar { gender: 'girl' | 'boy'; hair: HairStyle; color: string; outfit: number; name: string }
export const defaultAvatar: Avatar = { gender: 'girl', hair: 'buns2', color: '#5A3B34', outfit: 0, name: '小桃' }
export const HAIRS: Record<Avatar['gender'], [HairStyle, string, string][]> = {
  girl: [['buns2', 'Hai búi nhỏ', '双丸子头'], ['long', 'Tóc xõa dài', '长发'], ['bunsRound', 'Hai búi vòng', '双环髻'], ['bun1', 'Búi cao', '高髻']],
  boy: [['short', 'Tóc ngắn', '短发'], ['bun1', 'Búi cao', '高髻'], ['tail', 'Tóc đuôi ngựa', '马尾']],
}
export const COLORS = ['#5A3B34', '#2B2430', '#8A5A44', '#D98BA8']
export const OUTFITS = [
  { vi: 'Hoa đào', zh: '桃花', top: '#F8C8DC', skirt: '#3E7CC9', sash: '#D6457A' },
  { vi: 'Ngọc bích', zh: '碧玉', top: '#BFE8D0', skirt: '#2F8F6B', sash: '#F2B84B' },
  { vi: 'Nắng vàng', zh: '暖阳', top: '#FFE7A3', skirt: '#E08A3C', sash: '#C0392B' },
  { vi: 'Tử đằng', zh: '紫藤', top: '#E0D4F5', skirt: '#7E5BC4', sash: '#E5547F' },
]
const keyOf = (u: string | null) => `hanyu-avatar-v2:${u ?? 'guest'}`
const read = (u: string | null): Avatar => { try { return { ...defaultAvatar, ...JSON.parse(localStorage.getItem(keyOf(u)) ?? (u === null ? localStorage.getItem('hanyu-avatar-v1') : null) ?? '{}') } } catch { return defaultAvatar } }
let owner: string | null = null
let cur: Avatar = read(null)
const subs = new Set<() => void>()
export const useAvatar = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => cur)
export function switchAvatar(u: string | null) { owner = u; cur = read(u); subs.forEach(f => f()) }
export function saveAvatar(a: Avatar) {
  cur = a; localStorage.setItem(keyOf(owner), JSON.stringify(a)); subs.forEach(f => f())
  if (supabase && owner) supabase.from('user_avatars').upsert({ user_id: owner, data: a, updated_at: new Date().toISOString() }).then(({ error }) => error && console.warn('Không lưu được nhân vật lên Supabase', error.message))
}
// Nhân vật trên Supabase (nếu có) được ưu tiên; nếu chưa có thì đẩy nhân vật đang lưu trên máy lên.
export async function pullAvatar(uid: string) {
  if (!supabase) return
  const { data, error } = await supabase.from('user_avatars').select('data').eq('user_id', uid).maybeSingle()
  if (error || owner !== uid) return
  if (data?.data) { cur = { ...defaultAvatar, ...(data.data as Partial<Avatar>) }; localStorage.setItem(keyOf(uid), JSON.stringify(cur)); subs.forEach(f => f()) }
  else if (localStorage.getItem(keyOf(uid))) await supabase.from('user_avatars').upsert({ user_id: uid, data: cur })
}
