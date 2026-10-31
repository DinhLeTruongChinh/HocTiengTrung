import { useEffect, useState } from 'react'
import { Sound } from '../ui'
import { AttemptRow, Content, ExamRow, KIND_NAME, Kind, LEVELS, fmtAnswer, loadExamContent, mmss } from '../../lib/exam'

export default function Result({ attempt, exam, onBack }: { attempt: AttemptRow; exam: ExamRow; onBack: () => void }) {
  const [content, setContent] = useState<Content | null>(null), [show, setShow] = useState<'all' | 'wrong'>('wrong')
  useEffect(() => { loadExamContent(exam.id).then(setContent).catch(() => setContent({ sections: [], questions: [] })) }, [exam.id])
  const review = attempt.review ?? [], qmap = new Map((content?.questions ?? []).map(q => [q.id, q]))
  const ok = review.filter(r => r.frac === 1).length, bad = review.filter(r => !r.pending && r.frac === 0).length
  const part = review.filter(r => !r.pending && r.frac !== null && r.frac > 0 && r.frac < 1).length, pend = review.filter(r => r.pending).length
  const topics = [...new Set(review.filter(r => !r.pending && r.frac !== 1 && r.topic).map(r => r.topic as string))]
  const lv = LEVELS[exam.level - 1], pending = attempt.pending_essays > 0
  const list = review.filter(r => show === 'all' || r.pending || r.frac !== 1)
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="card p-6 text-center space-y-2">
        <div className="text-5xl">{pending ? '📝' : attempt.passed ? '🎉' : '💪'}</div>
        <div className="text-sm text-ink/60">{exam.title} · {exam.format}</div>
        <h2 className="text-3xl font-bold">{attempt.score ?? 0}/{attempt.max_score ?? exam.max_score} điểm{pending && <span className="text-base font-normal"> (tạm tính)</span>}</h2>
        {pending ? <p className="text-sm text-yellow-700">Bài viết tự luận chưa được chấm ({attempt.pending_essays} bài). Điểm trên chưa gồm phần này; tổng điểm sẽ cập nhật khi admin chấm xong. Hệ thống không tự đoán điểm cho bài tự luận.</p>
          : <p className={`font-semibold ${attempt.passed ? 'text-green-700' : 'text-red-600'}`}>{attempt.passed ? 'Đạt' : 'Chưa đạt'} (mốc tham khảo HSK 2.0: {exam.pass_score}/{exam.max_score})</p>}
        <p className="text-sm text-ink/70">Làm trong {mmss(attempt.duration_sec ?? 0)} / {exam.duration_min} phút · Đúng {ok} · Sai {bad}{part ? ` · Đúng một phần ${part}` : ''}{pend ? ` · Chờ chấm ${pend}` : ''} · Tổng {review.length} câu</p>
        <div className="flex justify-center gap-2 pt-1"><button className="btn-primary" onClick={onBack}>← Về trang Thi thử</button></div></div>
      <div className="card p-4 space-y-2"><h3 className="font-bold">Kết quả từng phần</h3>
        {(Object.entries(attempt.section_scores ?? {}) as [Kind, NonNullable<AttemptRow['section_scores']>[Kind]][]).map(([k, s]) => s && (
          <div key={k} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white border border-rose-100 px-3 py-2 text-sm"><span className="font-semibold">{KIND_NAME[k]}</span>
            <span>{s.got.toFixed(s.got % 1 ? 1 : 0)}/{s.max} điểm câu hỏi</span><span className="font-bold text-rose-500">{s.score === null ? 'chờ chấm' : `${s.score}/${Math.round(s.weight)}`}</span></div>))}
        <p className="text-xs text-ink/50">Thang điểm tham khảo HSK 2.0 ({lv.max} điểm, đạt từ {lv.pass}). Mỗi phần tính theo tỉ lệ điểm câu hỏi trả lời đúng; đây không phải điểm quy đổi chính thức của Hanban.</p></div>
      {topics.length > 0 && <div className="card p-4 space-y-2"><h3 className="font-bold">Nội dung cần ôn tập</h3><div className="flex flex-wrap gap-2">{topics.map(t => <span key={t} className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 font-han">{t}</span>)}</div></div>}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between"><h3 className="font-bold">Đáp án và giải thích</h3>
          <div className="flex gap-2"><button className={show === 'wrong' ? 'btn-primary !py-1 text-sm' : 'btn-ghost !py-1 text-sm'} onClick={() => setShow('wrong')}>Câu chưa đúng</button><button className={show === 'all' ? 'btn-primary !py-1 text-sm' : 'btn-ghost !py-1 text-sm'} onClick={() => setShow('all')}>Tất cả</button></div></div>
        {!list.length && <p className="text-sm">Bạn làm đúng hết! 🎉</p>}
        {list.map((r, n) => { const q = qmap.get(r.id); return (
          <div key={r.id} className={`rounded-2xl border p-3 text-sm space-y-1.5 ${r.pending ? 'border-yellow-300 bg-yellow-50' : r.frac === 1 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <div className="flex items-start gap-2"><span className="text-ink/50 shrink-0">{KIND_NAME[r.kind].split(' ')[0]} · {review.indexOf(r) + 1}</span><span className="font-han font-semibold flex-1 whitespace-pre-line">{q?.prompt ?? '…'}</span>{q?.audio_text && <Sound text={q.audio_text} />}</div>
            {q?.passage && <div className="text-xs text-ink/60 font-han whitespace-pre-line">{q.passage}</div>}
            <div className={r.frac === 1 ? 'text-green-700' : 'text-red-700'}>Bạn trả lời: <span className="font-han">{fmtAnswer(r.your)}</span> {r.pending ? '(chờ chấm)' : r.frac === 1 ? '✔' : r.frac && r.frac > 0 ? `◐ ${Math.round(r.frac * 100)}%` : '✘'}</div>
            {r.answer !== null && r.frac !== 1 && <div className="text-green-800 font-semibold">Đáp án đúng: <span className="font-han">{fmtAnswer(Array.isArray(r.answer) && r.qtype === 'fill' ? r.answer.join(' / ') : Array.isArray(r.answer) && r.qtype === 'order' ? r.answer[0] : r.answer)}</span></div>}
            {r.explanation && <div className="text-ink/70">💡 {r.explanation}</div>}
            {attempt.feedback?.[r.id] && <div className="text-ink/80">👩‍🏫 Nhận xét: {attempt.feedback[r.id]} {attempt.manual_points?.[r.id] !== undefined && `(${attempt.manual_points[r.id]}/${r.points} điểm)`}</div>}
          </div>) })}</div>
    </div>)
}
