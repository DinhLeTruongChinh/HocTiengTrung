import { Bar } from '../../components/ui'
import { Go } from '../../lib/nav'
import { useProgress } from '../../lib/store'
import { Loading, useThuy } from '../../lib/thuy'

export default function ThuyHome({ go }: { go: Go }) {
  const { data, err } = useThuy(); const p = useProgress()
  const msg = Loading({ data, err }); if (!data) return <p>{msg}</p>
  const done = data.vocab.filter(v => p.thuy[v.id]).length
  const next = data.lessons.find(l => data.vocab.some(v => v.lesson_id === l.id && !p.thuy[v.id])) ?? data.lessons[0]
  const cards: [string, string, string, () => void][] = [
    ['📖', 'Bài học', '课', () => go({ page: 'thuy_lessons' })], ['🔤', 'Từ vựng', '生词', () => go({ page: 'thuy_vocab' })], ['🔁', 'Ôn tập', '复习', () => go({ page: 'thuy_review' })]]
  return (
    <div className="space-y-5">
      <section className="card p-6 bg-gradient-to-r from-rose-50 to-sky-100">
        <h1 className="text-2xl md:text-3xl font-bold">Lớp chị Thủy <span className="font-han">清水班</span> 🌸</h1>
        <p className="mt-1 text-ink/70">Tài liệu riêng dành cho học viên của lớp.</p>
        {next && <button className="btn-primary mt-4" onClick={() => go({ page: 'thuy_lesson', lessonId: next.id })}>▶ Tiếp tục: {next.title}</button>}
      </section>
      <section className="card p-5 space-y-2"><div className="flex justify-between font-semibold"><span>Từ vựng đã thuộc</span><span>{done}/{data.vocab.length}</span></div><Bar value={done} max={data.vocab.length} /></section>
      <div className="grid sm:grid-cols-3 gap-3">{cards.map(([ic, vi, zh, f]) => (
        <button key={vi} onClick={f} className="card p-6 text-center hover:shadow-md hover:-translate-y-0.5 transition"><div className="text-4xl">{ic}</div><div className="font-bold mt-1">{vi}</div><div className="font-han text-sm opacity-60">{zh}</div></button>))}</div>
    </div>
  )
}
