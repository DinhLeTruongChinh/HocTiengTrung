import { byId } from './data'
import { activeUser, getState, Progress, update } from './store'
import { supabase } from './supabase'

const synced = new Set<string>() // từ đã học đã có trên server (của tài khoản hiện tại)

async function pageAll(uid: string) {
  const out: string[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await supabase!.from('learned_words').select('vocabulary_id').eq('user_id', uid).range(f, f + 999)
    if (error) throw error
    out.push(...data.map(r => r.vocabulary_id as string)); if (data.length < 1000) break
  }
  return out
}

export async function pull(uid: string) {
  if (!supabase) return
  synced.clear()
  const [learned, pr, rv] = await Promise.all([
    pageAll(uid),
    supabase.from('user_progress').select('lesson_id,best_score,attempts').eq('user_id', uid),
    supabase.from('review_words').select('vocabulary_id,remembered').eq('user_id', uid),
  ])
  if (activeUser() !== uid) return // đã đổi tài khoản trong lúc tải
  learned.forEach(id => synced.add(id))
  update(p => {
    learned.forEach(id => { if (byId.has(id)) p.learned[id] = 1 })
    for (const r of pr.data ?? []) {
      const cur = p.lessons[r.lesson_id]
      p.lessons[r.lesson_id] = { best: Math.max(cur?.best ?? 0, r.best_score), tries: Math.max(cur?.tries ?? 0, r.attempts) }
    }
    for (const r of rv.data ?? []) if (!r.remembered && byId.has(r.vocabulary_id)) p.weak[r.vocabulary_id] = 1
  })
}

export async function push(uid: string, p: Progress = getState()) {
  if (!supabase || activeUser() !== uid) return
  const fresh = Object.keys(p.learned).filter(id => !synced.has(id))
  for (let i = 0; i < fresh.length; i += 500) {
    const batch = fresh.slice(i, i + 500)
    const { error } = await supabase.from('learned_words').upsert(batch.map(vocabulary_id => ({ user_id: uid, vocabulary_id })), { ignoreDuplicates: true })
    if (error) throw error
    batch.forEach(id => synced.add(id))
  }
  const rows = Object.entries(p.lessons).map(([lesson_id, r]) => ({ user_id: uid, lesson_id, best_score: r.best, attempts: r.tries, completed_at: new Date().toISOString() }))
  if (rows.length) await supabase.from('user_progress').upsert(rows)
  await supabase.from('review_words').delete().eq('user_id', uid)
  const weak = Object.keys(p.weak).map(vocabulary_id => ({ user_id: uid, vocabulary_id, remembered: false }))
  if (weak.length) await supabase.from('review_words').insert(weak)
}
