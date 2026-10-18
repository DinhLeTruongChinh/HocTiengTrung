import { speak } from '../lib/tts'
export const Bar = ({ value, max, color = 'bg-rose-500' }: { value: number; max: number; color?: string }) => (
  <div className="h-3 w-full rounded-full bg-rose-100 overflow-hidden">
    <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
  </div>
)
export const Sound = ({ text, big }: { text: string; big?: boolean }) => (
  <button aria-label="Nghe phát âm" onClick={e => { e.stopPropagation(); speak(text) }}
    className={`shrink-0 rounded-full bg-sky-100 text-sky-600 hover:bg-sky-200 active:scale-90 transition ${big ? 'h-14 w-14 text-2xl' : 'h-9 w-9'}`}>🔊</button>
)
export const Stat = ({ icon, label, value }: { icon: string; label: string; value: string | number }) => (
  <div className="card p-4 flex items-center gap-3"><span className="text-3xl">{icon}</span>
    <div><div className="text-2xl font-bold">{value}</div><div className="text-sm text-ink/60">{label}</div></div></div>
)
