import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
export default function SlideViewer({ slug }: { slug: string }) {
  const [url, setUrl] = useState(''), [err, setErr] = useState('')
  useEffect(() => {
    setUrl(''); setErr('')
    ;(async () => {
      const m = await supabase!.from('course_materials').select('file_path').eq('slug', slug).limit(1).maybeSingle()
      if (!m.data) return setErr('Chưa có file slide cho bài này. Admin tải lên ở Quản trị → Lớp chị Thủy.')
      const s = await supabase!.storage.from('thuy-course').createSignedUrl(m.data.file_path, 3600)
      if (s.error) setErr(s.error.message); else setUrl(s.data.signedUrl)
    })()
  }, [slug])
  if (err) return <div className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-700">{err}</div>
  if (!url) return <p>Đang mở slide…</p>
  return (<div className="space-y-2">
    <iframe title="Slide gốc" src={`${url}#toolbar=0&navpanes=0`} className="w-full rounded-2xl border border-rose-100 bg-white" style={{ height: '78vh' }} />
    <a href={url} target="_blank" rel="noreferrer" className="btn-ghost inline-flex">Mở toàn màn hình ↗</a>
    <p className="text-xs text-ink/50">Nếu điện thoại chỉ hiện trang đầu, bấm “Mở toàn màn hình”.</p></div>)
}
