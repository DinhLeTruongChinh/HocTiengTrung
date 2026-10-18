import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Mat { id: string; title: string; file_path: string }

export default function Thuy() {
  const [mats, setMats] = useState<Mat[]>([]), [idx, setIdx] = useState<number | null>(null), [url, setUrl] = useState(''), [err, setErr] = useState(''), [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase!.from('course_materials').select('id,title,file_path').order('position').then(({ data, error }) => { setMats(data ?? []); setErr(error?.message ?? ''); setLoading(false) })
  }, [])
  const open = async (i: number) => {
    setIdx(i); setUrl(''); setErr('')
    const { data, error } = await supabase!.storage.from('thuy-course').createSignedUrl(mats[i].file_path, 3600)
    if (error) setErr(error.message); else setUrl(data.signedUrl)
  }
  const cur = idx === null ? null : mats[idx]
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Lớp chị Thủy <span className="font-han text-base opacity-60">清水班</span></h1>
      {err && <div className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-700">{err}</div>}
      {!cur ? (loading ? <p>Đang tải…</p> : !mats.length ? <div className="card p-6 text-sm">Chưa có tài liệu nào trong mục này.</div> : (
        <div className="grid sm:grid-cols-2 gap-3">{mats.map((m, i) => (
          <button key={m.id} onClick={() => open(i)} className="card p-5 text-left hover:shadow-md transition flex items-center gap-3">
            <span className="text-3xl">📄</span><span className="font-semibold font-han">{m.title}</span></button>))}</div>
      )) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button className="text-sm text-rose-500" onClick={() => { setIdx(null); setUrl('') }}>← Danh sách</button>
            <div className="flex gap-2">
              <button className="btn-ghost !py-1.5" disabled={idx === 0} onClick={() => open(idx! - 1)}>← Trước</button>
              <button className="btn-ghost !py-1.5" disabled={idx === mats.length - 1} onClick={() => open(idx! + 1)}>Sau →</button></div>
          </div>
          <h2 className="font-bold font-han">{cur.title}</h2>
          {url ? (<>
            <iframe title={cur.title} src={`${url}#toolbar=0&navpanes=0`} className="w-full rounded-2xl border border-rose-100 bg-white" style={{ height: '78vh' }} />
            <a href={url} target="_blank" rel="noreferrer" className="btn-ghost inline-flex">Mở toàn màn hình ↗</a>
            <p className="text-xs text-ink/50">Nếu điện thoại chỉ hiện trang đầu, bấm “Mở toàn màn hình”.</p>
          </>) : !err && <p>Đang mở…</p>}
        </div>)}
    </div>
  )
}
