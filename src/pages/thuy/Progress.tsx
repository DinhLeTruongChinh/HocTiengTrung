import { useEffect, useState } from 'react'
import { Bar, Stat } from '../../components/ui'
import { LEVELS, mmss } from '../../lib/exam'
import { Go } from '../../lib/nav'
import { useProgress } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { Loading, useThuy } from '../../lib/thuy'

interface Att { id: string; exam_id: string; submitted_at: string | null; duration_sec: number | null; score: number | null; max_score: number | null; passed: boolean | null; pending_essays: number }
export default function ThuyProgress({ go }: { go: Go }) {
  const { data, err } = useThuy(); const p = useProgress()
  const [atts, setAtts] = useState<Att[]>([]), [lv, setLv] = useState<Record<string, { level: number; title: string }>>({}), [aerr, setAerr] = useState('')
  useEffect(() => {
    ;(async () => {
      const uid = (await supabase!.auth.getUser()).data.user?.id
      const [a, e] = await Promise.all([
        supabase!.from('exam_attempts').select('id,exam_id,submitted_at,duration_sec,score,max_score,passed,pending_essays').eq('scope', 'thuy').eq('status', 'submitted').eq('user_id', uid ?? '').order('submitted_at', { ascending: false }).limit(200),
        supabase!.from('exams').select('id,level,title')])
      if (a.error) setAerr(/does not exist|schema cache/i.test(a.error.message) ? 'Chưa cài ngân hàng đề thi (exam_bank.sql) nên chưa có dữ liệu thi thử.' : a.error.message)
      setAtts((a.data ?? []) as Att[]); setLv(Object.fromEntries(((e.data ?? []) as any[]).map(x => [x.id, { level: x.level, title: x.title }])))
    })()
  }, [])
  const msg = Loading({ data, err }); if (!data) return <p>{msg}</p>
  const done = data.vocab.filter(v => p.thuy[v.id]).length
  const rows = data.lessons.map(l => { const vs = data.vocab.filter(v => v.lesson_id === l.id), n = vs.filter(v => p.thuy[v.id]).length; return { l, total: vs.length, n } })
  const finished = rows.filter(r => r.total > 0 && r.n === r.total).length
  const pct = (a: Att) => Math.round(((a.score ?? 0) / Math.max(1, a.max_score ?? 1)) * 100)
  const bestAll = atts.reduce((m, a) => Math.max(m, pct(a)), 0)
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Tiến độ <span className="font-han text-base opacity-60">进度</span> · Lớp chị Thủy</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon="🔤" label="Từ vựng đã thuộc" value={`${done}/${data.vocab.length}`} /><Stat icon="✅" label="Bài đã thuộc hết từ" value={`${finished}/${rows.length}`} />
        <Stat icon="📝" label="Bài thi đã nộp" value={atts.length} /><Stat icon="🏆" label="Điểm thi cao nhất" value={atts.length ? `${bestAll}%` : '–'} /></div>
      <section className="card p-5 space-y-2"><div className="flex justify-between font-semibold"><span>Tiến độ từ vựng toàn lớp</span><span>{data.vocab.length ? Math.round((done / data.vocab.length) * 100) : 0}%</span></div><Bar value={done} max={data.vocab.length} />
        <div className="flex flex-wrap gap-2 pt-2"><button className="btn-primary !py-1.5" disabled={done >= data.vocab.length} onClick={() => go({ page: 'thuy_review' })}>🔁 Ôn {data.vocab.length - done} từ chưa thuộc</button><button className="btn-ghost !py-1.5" onClick={() => go({ page: 'thuy_vocab' })}>Xem từ vựng</button></div></section>
      <section className="card p-5 space-y-3"><h2 className="font-bold">Tiến độ từng bài</h2>
        {rows.map(({ l, total, n }) => (
          <button key={l.id} onClick={() => go({ page: 'thuy_lesson', lessonId: l.id })} className="block w-full text-left space-y-1 rounded-xl p-2 hover:bg-rose-50">
            <div className="flex justify-between text-sm"><span className="font-han font-semibold">{l.title} {total > 0 && n === total && '✅'}</span><span className="text-ink/60">{n}/{total} từ</span></div><Bar value={n} max={total} color={total > 0 && n === total ? 'bg-green-500' : 'bg-rose-500'} /></button>))}</section>
      <section className="card p-5 space-y-3"><h2 className="font-bold">Kết quả thi thử (HSK 2.0)</h2>
        {aerr && <div className="rounded-xl bg-yellow-100 px-3 py-2 text-sm">{aerr}</div>}
        {!atts.length ? <p className="text-sm text-ink/60">Bạn chưa nộp bài thi thử nào trong lớp. <button className="text-rose-500 underline" onClick={() => go({ page: 'thuy_exam' })}>Vào thi thử</button></p> : (<>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">{LEVELS.map(l => {
            const xs = atts.filter(a => lv[a.exam_id]?.level === l.lv); if (!xs.length) return null
            const best = xs.reduce((m, a) => ((a.score ?? 0) > (m.score ?? 0) ? a : m), xs[0])
            return <div key={l.lv} className="rounded-2xl border border-rose-100 bg-white p-3 text-sm"><div className="font-bold text-rose-500">HSK {l.lv}</div><div>{xs.length} lần thi · cao nhất <b>{best.score}/{best.max_score}</b></div><div className="text-xs text-ink/60">{best.pending_essays ? 'Có bài viết chờ chấm' : best.passed ? '✔ Đã đạt' : 'Chưa đạt'} (đạt từ {l.pass}/{l.max})</div></div>
          })}</div>
          <h3 className="font-semibold text-sm pt-2">Các lần thi gần đây</h3>
          <div className="space-y-1">{atts.slice(0, 8).map(a => (<div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white border border-rose-100 px-3 py-2 text-sm">
            <span className="font-medium">{lv[a.exam_id]?.title ?? 'Đề đã xóa'}</span><span className="text-ink/60">{a.submitted_at ? new Date(a.submitted_at).toLocaleString('vi-VN') : ''} · {mmss(a.duration_sec ?? 0)}</span>
            <span className={`font-bold ${a.pending_essays ? 'text-yellow-700' : a.passed ? 'text-green-700' : 'text-red-600'}`}>{a.score}/{a.max_score}{a.pending_essays ? ' (tạm tính)' : ''}</span></div>))}</div></>)}
        <button className="btn-ghost !py-1.5" onClick={() => go({ page: 'thuy_exam' })}>📝 Vào thi thử</button></section>
    </div>)
}
