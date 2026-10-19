import { Word, words } from './data'
export type Kind = 'meaning' | 'pinyin' | 'hanzi' | 'fill' | 'listen'
export interface Q { kind: Kind; word: Word; prompt: string; options: string[]; answer: string }
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)
function options(w: Word, get: (x: Word) => string) {
  const set = new Set([get(w)])
  for (const x of shuffle(words.filter(x => x.level === w.level && x.id !== w.id))) { if (set.size >= 4) break; set.add(get(x)) }
  return shuffle([...set])
}
// Câu hỏi chỉ được sinh từ chính dữ liệu trong tài liệu (từ, phiên âm, nghĩa, câu ví dụ).
export function makeQuiz(ws: Word[]): Q[] {
  return shuffle(ws).map((w, i) => {
    const kinds: Kind[] = ['meaning', 'pinyin', 'hanzi', 'listen']
    if (w.exZh.includes(w.zh)) kinds.push('fill')
    const kind = kinds[i % kinds.length]
    const m: Record<Kind, Q> = {
      meaning: { kind, word: w, prompt: w.zh, options: options(w, x => x.vi), answer: w.vi },
      pinyin: { kind, word: w, prompt: w.zh, options: options(w, x => x.py), answer: w.py },
      hanzi: { kind, word: w, prompt: w.vi, options: options(w, x => x.zh), answer: w.zh },
      listen: { kind, word: w, prompt: w.zh, options: options(w, x => x.vi), answer: w.vi },
      fill: { kind, word: w, prompt: w.exZh.replace(w.zh, '＿＿'), options: options(w, x => x.zh), answer: w.zh },
    }
    return m[kind]
  })
}
export const KIND_LABEL: Record<Kind, string> = {
  meaning: 'Chọn nghĩa tiếng Việt', pinyin: 'Chọn Pinyin đúng', hanzi: 'Chọn chữ Hán đúng',
  listen: 'Nghe và chọn nghĩa', fill: 'Điền từ còn thiếu',
}
