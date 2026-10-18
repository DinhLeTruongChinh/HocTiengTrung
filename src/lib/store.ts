import { useSyncExternalStore } from 'react'
export interface Progress {
  learned: Record<string, 1>; grammar: Record<string, 1>; radicals: Record<string, 1>; lessons: Record<string, { best: number; tries: number }>
  wrong: Record<string, number>; weak: Record<string, 1>; days: string[]
}
const empty = (): Progress => ({ learned: {}, grammar: {}, radicals: {}, lessons: {}, wrong: {}, weak: {}, days: [] })
const keyOf = (u: string | null) => `hanyu-progress-v2:${u ?? 'guest'}`
function read(u: string | null): Progress {
  try {
    const raw = localStorage.getItem(keyOf(u)) ?? (u === null ? localStorage.getItem('hanyu-progress-v1') : null)
    return { ...empty(), ...JSON.parse(raw || '{}') }
  } catch { return empty() }
}
let owner: string | null = null
let state: Progress = read(null)
const subs = new Set<() => void>()
const day = (d = new Date()) => d.toLocaleDateString('en-CA')
export const useProgress = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => state)
export const getState = () => state
export const activeUser = () => owner
// Mỗi tài khoản (và chế độ khách) có bộ tiến độ riêng trong trình duyệt.
export function switchUser(u: string | null) { owner = u; state = read(u); subs.forEach(f => f()) }
export function update(fn: (p: Progress) => void) {
  const next = structuredClone(state); fn(next)
  if (!next.days.includes(day())) next.days.push(day())
  state = next; localStorage.setItem(keyOf(owner), JSON.stringify(next)); subs.forEach(f => f())
}
export function streak(days: string[]) {
  const d = new Date(); let n = 0
  if (!days.includes(day(d))) d.setDate(d.getDate() - 1)
  while (days.includes(day(d))) { n++; d.setDate(d.getDate() - 1) }
  return n
}
