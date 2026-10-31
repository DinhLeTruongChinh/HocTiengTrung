import { words } from './data'
// Gắn Pinyin lên trên chữ Hán bằng từ điển từ vựng của website (HSK 1–6), ghép từ dài nhất trước.
let map: Map<string, string> | null = null
let maxLen = 1
function build() {
  map = new Map()
  for (const w of words) { if (!map.has(w.zh)) map.set(w.zh, w.py); maxLen = Math.max(maxLen, [...w.zh].length) }
}
export interface Seg { t: string; py?: string }
const HAN = /[\u4e00-\u9fff]/
export const hasHan = (s: string) => HAN.test(s)
export function annotate(text: string): Seg[] {
  if (!map) build()
  const chars = [...text], out: Seg[] = []
  let i = 0
  while (i < chars.length) {
    if (!HAN.test(chars[i])) { out.push({ t: chars[i] }); i++; continue }
    let n = Math.min(maxLen, 6, chars.length - i), hit = false
    for (; n >= 1; n--) { const s = chars.slice(i, i + n).join(''); if (map!.has(s)) { out.push({ t: s, py: map!.get(s) }); i += n; hit = true; break } }
    if (!hit) { out.push({ t: chars[i] }); i++ }
  }
  return out
}
