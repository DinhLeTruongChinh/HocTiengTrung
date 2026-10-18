import { useEffect, useLayoutEffect, useState } from 'react'
import Layout from './components/Layout'
import { loadContentRemote } from './lib/content'
import { loadRemote, resume } from './lib/data'
import { useAuth } from './lib/auth'
import { Route } from './lib/nav'
import { switchAvatar } from './lib/avatar'
import { activeUser, getState, switchUser, useProgress } from './lib/store'
import { supabase } from './lib/supabase'
import { pull, push } from './lib/sync'
import Admin from './pages/Admin'
import Character from './pages/Character'
import Grammar from './pages/Grammar'
import Radicals from './pages/Radicals'
import Thuy from './pages/Thuy'
import Home from './pages/Home'
import Lessons from './pages/Lessons'
import LessonPage from './pages/LessonPage'
import Login from './pages/Login'
import Practice from './pages/Practice'
import ProgressPage from './pages/ProgressPage'
import Review from './pages/Review'

export default function App() {
  const [route, setRoute] = useState<Route>({ page: 'home' })
  const [loaded, setLoaded] = useState(false)
  const [guest, setGuest] = useState(false)
  const { session, ready, isAdmin, hasThuy } = useAuth()
  const p = useProgress()
  const uid = session?.user.id
  useEffect(() => { Promise.all([loadRemote(), loadContentRemote()]).finally(() => setLoaded(true)) }, [])
  // Mỗi tài khoản có tiến độ riêng: đổi tài khoản thì nạp dữ liệu của tài khoản đó rồi mới đồng bộ.
  useLayoutEffect(() => { switchUser(uid ?? null); switchAvatar(uid ?? null); if (uid) pull(uid).catch(console.warn) }, [uid])
  useEffect(() => {
    if (!uid) return
    const t = setTimeout(() => { if (activeUser() === uid) push(uid, getState()).catch(console.warn) }, 1500)
    return () => clearTimeout(t)
  }, [uid, p])

  if (!ready || !loaded) return <div className="min-h-screen grid place-items-center text-xl">🐼 Đang tải…</div>
  if (supabase && !session && (!guest || route.page === ('login' as string))) return <Login onGuest={() => { setGuest(true); setRoute({ page: 'home' }) }} />
  const go = (r: Route) => { setRoute(r); window.scrollTo(0, 0) }
  const current = resume(p.learned).lesson.id
  const { page } = route
  return (
    <Layout route={route} go={go} practiceTarget={route.lessonId ?? current} email={session?.user.email} isAdmin={isAdmin} hasThuy={hasThuy}>
      {page === 'home' && <Home go={go} />}
      {page === 'lessons' && <Lessons go={go} level={route.level} />}
      {page === 'lesson' && <LessonPage key={`${route.lessonId}-${route.wordId ?? ''}`} id={route.lessonId!} wordId={route.wordId} go={go} />}
      {page === 'practice' && <Practice key={route.lessonId} id={route.lessonId!} go={go} />}
      {page === 'review' && <Review key={route.wordIds?.join() ?? 'all'} wordIds={route.wordIds} />}
      {page === 'progress' && <ProgressPage go={go} />}
      {page === 'character' && <Character />}
      {page === 'grammar' && <Grammar />}
      {page === 'radicals' && <Radicals />}
      {page === 'thuy' && (hasThuy ? <Thuy /> : <div className="card p-8 text-center space-y-2 max-w-md mx-auto"><div className="text-5xl">🔒</div><h2 className="text-xl font-bold">Lớp chị Thủy</h2>
            <p>{session ? 'Tài khoản này cần được admin cấp quyền để vào mục này.' : 'Bạn cần đăng nhập bằng tài khoản được admin cấp quyền để vào mục này.'}</p></div>)}
      {page === 'admin' && (isAdmin ? <Admin /> : <div className="card p-6">Bạn không có quyền quản trị.</div>)}
    </Layout>
  )
}
