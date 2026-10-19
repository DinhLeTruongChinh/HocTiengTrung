import { useState } from 'react'
import AvatarSvg, { View } from '../components/AvatarSvg'
import { Avatar, COLORS, HAIRS, OUTFITS, saveAvatar, useAvatar } from '../lib/avatar'

const VIEWS: [View, string, string][] = [['front', 'Chính diện', '正面'], ['right', 'Nghiêng phải', '右侧'], ['back', 'Phía sau', '背面'], ['left', 'Nghiêng trái', '左侧']]
const Step = ({ n, vi, zh }: { n: number; vi: string; zh: string }) => (
  <h2 className="flex items-center gap-2 font-bold mt-4 first:mt-0"><span className="grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-white text-xs">{n}</span>{vi} <span className="font-han text-rose-500 text-sm">{zh}</span></h2>)
const opt = (on: boolean) => `rounded-2xl border-2 p-2 text-center text-xs transition hover:bg-rose-50 ${on ? 'border-rose-500 bg-rose-50' : 'border-rose-100 bg-white'}`

export default function Character() {
  const saved = useAvatar()
  const [a, setA] = useState<Avatar>(saved)
  const [view, setView] = useState<View>('front')
  const [ok, setOk] = useState(false)
  const set = (p: Partial<Avatar>) => { setA({ ...a, ...p }); setOk(false) }
  const pickGender = (g: Avatar['gender']) => set({ gender: g, hair: HAIRS[g][0][0] })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nhân vật của tôi <span className="font-han text-base opacity-60">我的角色</span></h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4 flex flex-col items-center gap-3 bg-gradient-to-b from-sky-100 to-rose-50">
          <div className="flex flex-wrap justify-center gap-1 rounded-full bg-white/80 p-1">
            {VIEWS.map(([v, vi, zh]) => <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 text-xs leading-tight ${view === v ? 'bg-rose-500 text-white font-bold' : ''}`}>{vi}<br /><span className="font-han opacity-70">{zh}</span></button>)}
          </div>
          <AvatarSvg a={a} view={view} size={210} />
          <input aria-label="Tên nhân vật" maxLength={12} value={a.name} onChange={e => set({ name: e.target.value })} className="font-han text-xl font-bold text-center rounded-full border border-rose-100 bg-white px-4 py-2 w-56" />
        </div>
        <div className="card p-4">
          <Step n={1} vi="Chọn giới tính" zh="性别" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            {([['girl', 'Bạn nữ', '女生'], ['boy', 'Bạn nam', '男生']] as const).map(([g, vi, zh]) => (
              <button key={g} onClick={() => pickGender(g)} className={opt(a.gender === g)}><AvatarSvg a={{ ...a, gender: g, hair: HAIRS[g][0][0] }} size={64} crop />{vi}<br /><span className="font-han">{zh}</span></button>))}
          </div>
          <Step n={2} vi="Tùy chỉnh ngoại hình" zh="外貌" />
          <div className="text-xs mt-1 text-ink/60">Kiểu tóc <span className="font-han">发型</span></div>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {HAIRS[a.gender].map(([k, vi, zh]) => <button key={k} onClick={() => set({ hair: k })} className={opt(a.hair === k)}><AvatarSvg a={{ ...a, hair: k }} size={56} crop />{vi}<br /><span className="font-han">{zh}</span></button>)}
          </div>
          <div className="text-xs mt-2 text-ink/60">Màu tóc <span className="font-han">发色</span></div>
          <div className="flex gap-2 mt-1">{COLORS.map(c => <button key={c} aria-label={`Màu tóc ${c}`} onClick={() => set({ color: c })} style={{ background: c }} className={`h-8 w-8 rounded-full border-4 ${a.color === c ? 'border-rose-500' : 'border-white'} shadow`} />)}</div>
          <Step n={3} vi="Chọn trang phục" zh="服装" />
          <div className="grid grid-cols-4 gap-2 mt-2">
            {OUTFITS.map((o, i) => <button key={i} onClick={() => set({ outfit: i })} className={opt(a.outfit === i)}><AvatarSvg a={{ ...a, outfit: i }} size={44} />{o.vi}<br /><span className="font-han">{o.zh}</span></button>)}
          </div>
          <Step n={4} vi="Đặt tên" zh="取名" />
          <p className="text-xs text-ink/60">Nhập tên ở ô bên trái nhân vật.</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button className="btn-ghost flex-1" onClick={() => { setA(saved); setOk(false) }}>Hủy <span className="font-han">取消</span></button>
        <button className="btn-primary flex-[2]" onClick={() => { saveAvatar({ ...a, name: a.name.trim() || '小桃' }); setOk(true) }}>{ok ? '✔ Đã lưu' : '✦ Lưu nhân vật 保存角色'}</button>
      </div>
    </div>
  )
}
