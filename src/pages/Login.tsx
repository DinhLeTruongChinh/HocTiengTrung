import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onGuest }: { onGuest: () => void }) {
  const [email, setEmail] = useState(''), [pw, setPw] = useState('')
  const [signup, setSignup] = useState(false), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true); setMsg('')
    const { data, error } = signup ? await supabase!.auth.signUp({ email, password: pw }) : await supabase!.auth.signInWithPassword({ email, password: pw })
    setBusy(false)
    if (error) setMsg(error.message)
    else if (signup && !data.session) setMsg('Đã gửi email xác nhận. Hãy xác nhận rồi đăng nhập.')
  }
  const input = 'w-full rounded-2xl border border-rose-100 bg-white px-4 py-3'
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-sm space-y-4">
        <div className="text-center"><div className="text-5xl">🐼</div><h1 className="text-2xl font-bold mt-2">{signup ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
          <p className="font-han text-sky-600 font-bold">汉语乐 · Hán Ngữ Vui</p></div>
        <input className={input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className={input} type="password" placeholder="Mật khẩu (tối thiểu 6 ký tự)" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        {msg && <div className="text-sm text-rose-600">{msg}</div>}
        <button className="btn-primary w-full" disabled={busy || !email || pw.length < 6} onClick={submit}>{signup ? 'Đăng ký' : 'Đăng nhập'}</button>
        <button className="w-full text-sm text-rose-500" onClick={() => setSignup(!signup)}>{signup ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}</button>
        <button className="w-full text-sm text-ink/60" onClick={onGuest}>Học thử không đăng nhập (không đồng bộ)</button>
      </div>
    </div>
  )
}
