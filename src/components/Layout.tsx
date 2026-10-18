import { ReactNode } from 'react'
import { Go, Page, Route } from '../lib/nav'
import { streak, useProgress } from '../lib/store'
import { supabase } from '../lib/supabase'
import { useAvatar } from '../lib/avatar'
import AvatarSvg from './AvatarSvg'
type Item = [Page, string, string, string]
const items: Item[] = [
  ['home', 'Trang chủ', '首页', '🏠'], ['lessons', 'Bài học', '课程', '📖'], ['grammar', 'Ngữ pháp', '语法', '📘'], ['radicals', 'Bộ thủ', '部首', '🈴'],
  ['practice', 'Bài tập', '作业', '✏️'], ['review', 'Ôn tập', '复习', '🔁'], ['progress', 'Tiến độ', '进度', '📊'], ['character', 'Nhân vật', '我的角色', '👧'],
]
interface Props { route: Route; go: Go; children: ReactNode; practiceTarget: string; email?: string; isAdmin: boolean; hasThuy: boolean }
export default function Layout({ route, go, children, practiceTarget, email, isAdmin, hasThuy }: Props) {
  const p = useProgress()
  const av = useAvatar()
  const nav: Item[] = [...items, ['thuy', 'Lớp chị Thủy', '清水班', hasThuy ? '🌸' : '🔒'] as Item, ...(isAdmin ? [['admin', 'Quản trị', '管理', '🛠️'] as Item] : [])]
  const to = (pg: Page) => go(pg === 'practice' ? { page: 'practice', lessonId: practiceTarget } : { page: pg })
  const active = (pg: Page) => route.page === pg || (pg === 'lessons' && route.page === 'lesson')
  return (
    <div className="min-h-screen md:pl-60 pb-20 md:pb-0">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/70 backdrop-blur border-b border-rose-100 md:ml-[-15rem] md:pl-64">
        <div className="flex items-center gap-3"><button aria-label="Nhân vật của tôi" onClick={() => go({ page: 'character' })} className="h-11 w-11 overflow-hidden rounded-full bg-sky-100 border-2 border-white shadow"><AvatarSvg a={av} size={44} crop /></button>
          <div><div className="font-han text-xl font-bold text-sky-600 leading-none">汉语乐</div><div className="text-xs text-ink/60">Hán Ngữ Vui · Học tiếng Trung thật vui!</div></div></div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="rounded-full bg-white px-3 py-1 border border-rose-100">🔥 {streak(p.days)}</span>
          <span className="rounded-full bg-white px-3 py-1 border border-rose-100">📚 {Object.keys(p.learned).length}</span>
          {supabase && (email
            ? <button className="btn-ghost !py-1 !px-3 text-xs" title={email} onClick={() => supabase!.auth.signOut()}>Đăng xuất</button>
            : <button className="btn-primary !py-1 !px-3 text-xs" onClick={() => go({ page: 'login' as Page })}>Đăng nhập</button>)}
        </div>
      </header>
      <aside className="hidden md:block fixed left-0 top-[60px] bottom-0 w-60 p-3 space-y-1 overflow-y-auto">
        {nav.map(([pg, vi, zh, ic]) => (
          <button key={pg} onClick={() => to(pg)} className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-white/80 ${active(pg) ? 'bg-rose-100 text-rose-600' : ''}`}>
            <span className="text-xl">{ic}</span><span><span className="block font-semibold leading-tight">{vi}</span><span className="block font-han text-xs opacity-60">{zh}</span></span>
          </button>))}
      </aside>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex overflow-x-auto bg-white/90 backdrop-blur border-t border-rose-100">
        {nav.map(([pg, vi, , ic]) => (
          <button key={pg} onClick={() => to(pg)} className={`min-w-[64px] flex-1 py-2 text-[10px] ${active(pg) ? 'text-rose-500 font-bold' : 'text-ink/60'}`}><div className="text-xl">{ic}</div>{vi}</button>))}
      </nav>
      <main className="max-w-5xl mx-auto p-4 md:p-6">{children}</main>
    </div>
  )
}
