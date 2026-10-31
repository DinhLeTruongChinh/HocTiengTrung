import { useCallback, useEffect, useMemo, useState } from 'react'
import Result from '../components/exam/Result'
import Runner from '../components/exam/Runner'
import { AttemptRow, ExamRow, LEVELS, mmss, writingText } from '../lib/exam'
import { supabase } from '../lib/supabase'

type Stage = 'menu' | 'history' | 'run' | 'result'
const COLS = 'id,exam_id,scope,status,started_at,submitted_at,duration_sec,score,max_score,passed,pending_essays,section_scores'
const when = (s: string | null) => (s ? new Date(s).toLocaleString('vi-VN') : '')

// Dùng chung cho trang ngoài (scope="main") và Lớp chị Thủy (scope="thuy").
export default function Exam({ scope }: { scope: 'main' | 'thuy' }) {
  const [stage, setStage] = useState<Stage>('menu'), [exams, setExams] = useState<ExamRow[]>([]), [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [err, setErr] = useState(''), [loading, setLoading] = useState(true), [pick, setPick] = useState<Record<number, string>>({}), [busy, setBusy] = useState('')
  const [run, setRun] = useState<{ exam: ExamRow; attempt: AttemptRow } | null>(null), [res, setRes] = useState<{ exam: ExamRow; attempt: AttemptRow } | null>(null)

  const load = useCallback(async () => {
    const uid = (await supabase!.auth.getUser()).data.user?.id
    const e = await supabase!.from('exams').select('*').order('level').order('created_at')
    if (e.error) { setErr(/does not exist|schema cache/i.test(e.error.message) ? 'Chưa cài ngân hàng đề thi: hãy chạy file supabase/exam_bank.sql trong SQL Editor, rồi nhập đề mẫu trong supabase/exam_seed.' : e.error.message); setLoading(false); return }
    const a = await supabase!.from('exam_attempts').select(COLS).eq('scope', scope).eq('user_id', uid ?? '').order('started_at', { ascending: false }).limit(200)
    setExams(((e.data ?? []) as ExamRow[]).filter(x => x.scopes.includes(scope))); setAttempts((a.data ?? []) as AttemptRow[]); setErr(a.error?.message ?? ''); setLoading(false)
  }, [scope])
  useEffect(() => { load() }, [load])

  const byId = useMemo(() => new Map(exams.map(x => [x.id, x])), [exams])
  const inProgress = (x: ExamRow) => attempts.find(a => a.exam_id === x.id && a.status === 'in_progress' && new Date(a.started_at).getTime() + (x.duration_min + 5) * 60000 > Date.now())
  const start = async (x: ExamRow, restart = false) => {
    setBusy(x.id); setErr('')
    const cur = inProgress(x); if (restart && cur) await supabase!.rpc('exam_abandon', { p_attempt: cur.id })
    const { data, error } = await supabase!.rpc('exam_start', { p_exam: x.id, p_scope: scope })
    setBusy(''); if (error) return setErr(error.message)
    setRun({ exam: x, attempt: data as AttemptRow }); setStage('run')
  }
  const openResult = async (a: AttemptRow) => {
    const x = byId.get(a.exam_id); if (!x) return
    const { data, error } = await supabase!.from('exam_attempts').select('*').eq('id', a.id).single()
    if (error) return setErr(error.message)
    setRes({ exam: x, attempt: data as AttemptRow }); setStage('result')
  }
  const back = () => { setStage('menu'); setRun(null); setRes(null); load() }

  if (stage === 'run' && run) return <Runner key={run.attempt.id} exam={run.exam} attempt={run.attempt} onExit={back} onSubmitted={a => { setRes({ exam: run.exam, attempt: a }); setRun(null); setStage('result'); load() }} />
  if (stage === 'result' && res) return <Result attempt={res.attempt} exam={res.exam} onBack={back} />

  const submitted = attempts.filter(a => a.status === 'submitted')
  if (stage === 'history') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Lịch sử thi <span className="font-han text-base opacity-60">考试记录</span></h1><button className="btn-ghost" onClick={() => setStage('menu')}>← Quay lại</button></div>
      {err && <div className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-700">{err}</div>}
      {!submitted.length && <div className="card p-6 text-sm">Bạn chưa nộp bài thi nào.</div>}
      <div className="space-y-2">{submitted.map(a => { const x = byId.get(a.exam_id); return (
        <button key={a.id} onClick={() => openResult(a)} className="card w-full p-4 text-left hover:shadow-md transition space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold">{x?.title ?? 'Đề đã bị xóa'}</span>
            <span className={`font-bold ${a.pending_essays ? 'text-yellow-700' : a.passed ? 'text-green-700' : 'text-red-600'}`}>{a.score}/{a.max_score}{a.pending_essays ? ' (tạm tính)' : a.passed ? ' · Đạt' : ' · Chưa đạt'}</span></div>
          <div className="text-xs text-ink/60">{when(a.submitted_at)} · làm {mmss(a.duration_sec ?? 0)} · {(Object.entries(a.section_scores ?? {}) as [string, any][]).map(([k, s]) => `${k === 'listening' ? 'Nghe' : k === 'reading' ? 'Đọc' : 'Viết'}: ${s.score ?? 'chờ chấm'}`).join(' · ')}</div></button>) })}</div>
    </div>)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">Thi thử HSK <span className="font-han text-base opacity-60">模拟考试</span>{scope === 'thuy' && <span className="text-base font-normal text-rose-500"> · Lớp chị Thủy</span>}</h1>
        <button className="btn-ghost" onClick={() => setStage('history')}>📜 Lịch sử thi ({submitted.length})</button></div>
      <div className="card p-4 text-sm space-y-1 bg-sky-100">
        <div><b>Cấu trúc HSK 2.0</b> (bản cũ gồm 6 cấp) – khác với HSK 3.0 mới. Điểm tối đa: HSK 1–2 là 200 (đạt từ 120); HSK 3–6 là 300 (đạt từ 180).</div>
        <div className="text-ink/70">Các đề hiện có là <b>đề luyện tập do hệ thống cung cấp</b>, không phải đề thi chính thức. Bài trắc nghiệm, điền từ, sắp xếp từ được chấm tự động; bài viết tự luận do admin chấm.</div></div>
      {err && <div className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-700">{err}</div>}
      {loading ? <p>Đang tải…</p> : (
        <div className="grid md:grid-cols-2 gap-3">{LEVELS.map(l => {
          const list = exams.filter(x => x.level === l.lv), sel = list.find(x => x.id === pick[l.lv]) ?? list[0], cur = sel && inProgress(sel)
          const best = submitted.filter(a => byId.get(a.exam_id)?.level === l.lv && !a.pending_essays).reduce((m, a) => Math.max(m, a.score ?? 0), 0)
          return (
            <div key={l.lv} className="card p-5 space-y-3">
              <div className="flex items-baseline justify-between"><span className="text-2xl font-bold text-rose-500">HSK {l.lv}</span><span className="text-xs text-ink/50">{l.vocab}</span></div>
              <p className="text-sm text-ink/70">{l.intro}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-rose-50 px-3 py-2">🎧 {l.L} câu Nghe</div><div className="rounded-xl bg-rose-50 px-3 py-2">📖 {l.R} câu Đọc</div>
                <div className="rounded-xl bg-rose-50 px-3 py-2">✍️ {writingText(l)}</div><div className="rounded-xl bg-rose-50 px-3 py-2">⏱ {l.min} phút</div></div>
              {l.parts && <div className="text-xs text-sky-600">📋 {l.parts}</div>}
              <div className="text-xs text-ink/60">Tổng {l.L + l.R + l.W} câu/bài · {l.max} điểm, đạt từ {l.pass}{best ? ` · Điểm cao nhất của bạn: ${best}` : ''}</div>
              {list.length > 1 && <select value={sel?.id} onChange={e => setPick(p => ({ ...p, [l.lv]: e.target.value }))} className="w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm">{list.map(x => <option key={x.id} value={x.id}>{x.title}{x.published ? '' : ' (nháp)'}</option>)}</select>}
              {sel?.is_practice && <div className="text-xs text-yellow-700">Đề luyện tập do hệ thống cung cấp, không phải đề thi chính thức.</div>}
              {!sel ? <button className="btn-primary w-full" disabled>Chưa có đề</button>
                : cur ? (<div className="space-y-1"><button className="btn-primary w-full" disabled={busy === sel.id} onClick={() => start(sel)}>▶ Làm tiếp bài đang làm (còn khoảng {mmss(Math.max(0, sel.duration_min * 60 - Math.round((Date.now() - new Date(cur.started_at).getTime()) / 1000)))})</button>
                  <button className="text-xs text-rose-500" onClick={() => confirm('Bỏ bài đang làm và bắt đầu lại từ đầu?') && start(sel, true)}>Bỏ bài này, thi lại từ đầu</button></div>)
                  : <button className="btn-primary w-full" disabled={busy === sel.id} onClick={() => start(sel)}>{busy === sel.id ? 'Đang chuẩn bị…' : 'Bắt đầu thi'}</button>}
            </div>)
        })}</div>)}
    </div>)
}
