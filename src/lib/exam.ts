import { supabase } from './supabase'
export type Kind = 'listening' | 'reading' | 'writing'
export type QType = 'mcq' | 'fill' | 'order' | 'match' | 'essay'
export interface ExamRow { id: string; title: string; level: number; description: string | null; scopes: string[]; duration_min: number; max_score: number; pass_score: number; shuffle_questions: boolean; shuffle_options: boolean; is_practice: boolean; published: boolean; format: string }
export interface SectionRow { id: string; exam_id: string; kind: Kind; position: number; title: string; instructions: string | null; max_plays: number }
export interface QuestionRow { id: string; section_id: string; position: number; qtype: QType; prompt: string; passage: string | null; audio_url: string | null; audio_text: string | null; options: any; points: number; topic: string | null; part?: number; group_key?: string | null; image?: string | null }
export interface ReviewItem { id: string; kind: Kind; qtype: QType; points: number; frac: number | null; your: any; answer: any; explanation: string | null; topic: string | null; pending: boolean }
export interface SectionScore { got: number; max: number; score: number | null; weight: number; pending: number }
export interface AttemptRow {
  id: string; user_id?: string; exam_id: string; scope: string; status: string; started_at: string; submitted_at: string | null; duration_sec: number | null
  answers?: Record<string, any>; manual_points?: Record<string, number>; feedback?: Record<string, string>
  section_scores: Partial<Record<Kind, SectionScore>> | null; score: number | null; max_score: number | null; passed: boolean | null; pending_essays: number; review?: ReviewItem[] | null
}
export interface Content { sections: SectionRow[]; questions: QuestionRow[] }
export interface Item { q: QuestionRow; section: SectionRow; no: number; options: any }

export const KIND_ZH: Record<Kind, string> = { listening: '听力', reading: '阅读', writing: '书写' }
export const ZH_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
export const KIND_NAME: Record<Kind, string> = { listening: 'Nghe 听力', reading: 'Đọc 阅读', writing: 'Viết 书写' }
// Cấu trúc đề thi HSK 2.0 (bản cũ, 6 cấp) – KHÔNG phải HSK 3.0.
export const LEVELS: { lv: number; L: number; R: number; W: number; min: number; max: number; pass: number; vocab: string; intro: string; parts?: string }[] = [
  { lv: 1, L: 20, R: 20, W: 0, min: 40, max: 200, pass: 120, vocab: 'khoảng 150 từ', intro: 'Hiểu và dùng các từ, câu rất đơn giản; làm quen giao tiếp cơ bản như chào hỏi, giới thiệu, số đếm.', parts: 'Nghe 4 phần: chọn hình · chọn câu · nối hình · hội thoại. Đọc 4 phần: nối hình · nối câu · điền từ · đọc đoạn.' },
  { lv: 2, L: 35, R: 25, W: 0, min: 55, max: 200, pass: 120, vocab: 'khoảng 300 từ', intro: 'Giao tiếp đơn giản về những việc quen thuộc hằng ngày: mua sắm, hỏi đường, gia đình, sở thích.' },
  { lv: 3, L: 40, R: 30, W: 10, min: 90, max: 300, pass: 180, vocab: 'khoảng 600 từ', intro: 'Giao tiếp cơ bản trong học tập, công việc, du lịch; bắt đầu viết câu hoàn chỉnh.' },
  { lv: 4, L: 45, R: 40, W: 15, min: 105, max: 300, pass: 180, vocab: 'khoảng 1.200 từ', intro: 'Trao đổi về nhiều chủ đề và giao tiếp tương đối trôi chảy với người bản ngữ.' },
  { lv: 5, L: 45, R: 45, W: 10, min: 125, max: 300, pass: 180, vocab: 'khoảng 2.500 từ', intro: 'Đọc báo, xem phim, viết bài tương đối hoàn chỉnh về nhiều chủ đề.' },
  { lv: 6, L: 50, R: 50, W: 1, min: 140, max: 300, pass: 180, vocab: 'trên 5.000 từ', intro: 'Hiểu dễ dàng thông tin nghe, đọc; diễn đạt trôi chảy cả nói và viết, có bài viết tóm tắt.' },
]
export const writingText = (l: typeof LEVELS[number]) => (l.W === 0 ? 'Không có phần Viết' : l.lv === 6 ? '1 bài Viết tóm tắt' : `${l.W} câu Viết`)

function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
// Xáo trộn theo "hạt giống": cùng một lượt thi luôn ra cùng thứ tự (làm tiếp sau khi tải lại trang không bị đổi chỗ).
export function seededShuffle<T>(a: T[], seed: string): T[] {
  const r = mulberry32(hash(seed)), o = [...a]
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]] }
  return o
}
export async function loadExamContent(examId: string): Promise<Content> {
  const s = await supabase!.from('exam_sections').select('*').eq('exam_id', examId).order('position')
  if (s.error) throw s.error
  const sections = (s.data ?? []) as SectionRow[]
  let questions: QuestionRow[] = []
  if (sections.length) {
    const q = await supabase!.from('exam_questions').select('*').in('section_id', sections.map(x => x.id)).order('position').range(0, 999)
    if (q.error) throw q.error
    questions = (q.data ?? []) as QuestionRow[]
  }
  return { sections, questions }
}
export function buildItems(exam: ExamRow, c: Content, attemptId: string): Item[] {
  const items: Item[] = []; let no = 0
  for (const s of [...c.sections].sort((a, b) => a.position - b.position)) {
    let qs = c.questions.filter(q => q.section_id === s.id).sort((a, b) => a.position - b.position)
    // đề có chia phần/nhóm nối thì giữ đúng thứ tự soạn, không xáo câu
    const structured = qs.some(q => (q.part ?? 1) > 1 || q.group_key)
    if (exam.shuffle_questions && !structured) qs = seededShuffle(qs, attemptId + s.id)
    for (const q of qs) {
      let options = q.options
      const seed = attemptId + (q.group_key ? `${s.id}:${q.group_key}` : q.id)   // câu cùng nhóm dùng chung một thứ tự đáp án
      if (q.qtype === 'mcq' && exam.shuffle_options && Array.isArray(options)) options = seededShuffle(options, seed)
      if (q.qtype === 'order' && Array.isArray(options)) options = seededShuffle(options, attemptId + q.id)
      if (q.qtype === 'match' && options?.right) options = { left: options.left, right: seededShuffle(options.right as string[], attemptId + q.id) }
      items.push({ q, section: s, no: ++no, options })
    }
  }
  return items
}
export const fileUrl = (p: string) => audioUrl(p)
export async function audioUrl(p: string) {
  if (p.startsWith('http')) return p
  const { data, error } = await supabase!.storage.from('exam-audio').createSignedUrl(p.replace(/^storage:/, ''), 14400)
  if (error) throw error
  return data.signedUrl
}
export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
export const fmtAnswer = (v: any): string => {
  if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return '(bỏ trống)'
  if (Array.isArray(v)) return v.join(' ')
  if (typeof v === 'string' && v.startsWith('img:')) return /^(https?:|storage:)/.test(v.slice(4)) ? '[hình ảnh]' : v.slice(4)
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k} → ${x}`).join('; ')
  return String(v)
}
