import { Avatar, OUTFITS } from '../lib/avatar'
export type View = 'front' | 'right' | 'back' | 'left'
// Nhân vật vẽ bằng SVG gốc (không dùng ảnh của bên thứ ba).
export default function AvatarSvg({ a, view = 'front', size = 220, crop }: { a: Avatar; view?: View; size?: number; crop?: boolean }) {
  const o = OUTFITS[a.outfit] ?? OUTFITS[0]
  const skin = '#FFE3D3', h = a.color
  const side = view === 'right' ? 14 : view === 'left' ? -14 : 0
  const girl = a.gender === 'girl'
  const bunR = a.hair === 'bunsRound' ? 19 : 14
  return (
    <svg width={size} height={crop ? size : size * 1.4} viewBox={crop ? '30 20 140 140' : '0 0 200 280'} role="img" aria-label={`Nhân vật ${a.name}`}>
      {a.hair === 'long' && <path d="M46 92 Q38 205 62 220 L82 150 L118 150 L138 220 Q162 205 154 92 Z" fill={h} />}
      {a.hair === 'tail' && <path d="M138 78 Q190 110 164 205 Q150 150 134 122 Z" fill={h} />}
      <path d="M62 200 L138 200 L152 268 L48 268 Z" fill={o.skirt} />
      <path d="M70 150 Q100 140 130 150 L138 205 L62 205 Z" fill={o.top} />
      <path d="M70 152 L42 202 L58 210 L74 180 Z M130 152 L158 202 L142 210 L126 180 Z" fill={o.top} stroke={o.sash} strokeWidth="1.5" />
      <path d="M88 146 L100 186 L112 146" fill="none" stroke={o.sash} strokeWidth="4" strokeLinejoin="round" />
      <rect x="62" y="192" width="76" height="12" rx="6" fill={o.sash} />
      <rect x="92" y="132" width="16" height="22" rx="6" fill={skin} />
      {(a.hair === 'buns2' || a.hair === 'bunsRound') && <><circle cx="56" cy="52" r={bunR} fill={h} /><circle cx="144" cy="52" r={bunR} fill={h} /></>}
      {a.hair === 'bunsRound' && <><circle cx="56" cy="52" r="5" fill="#D6457A" /><circle cx="144" cy="52" r="5" fill="#D6457A" /></>}
      {a.hair === 'bun1' && <circle cx="100" cy="30" r="20" fill={h} />}
      <ellipse cx="100" cy="98" rx="50" ry="47" fill={skin} />
      {view !== 'back' && (
        <g transform={`translate(${100 + side} 0) scale(${side ? 0.75 : 1} 1) translate(-100 0)`}>
          {[78, 122].map(x => (<g key={x}><ellipse cx={x} cy="106" rx="11" ry="13" fill="#fff" /><ellipse cx={x} cy="108" rx="8" ry="11" fill="#2F6FD6" />
            <circle cx={x} cy="109" r="4" fill="#1B2A4A" /><circle cx={x - 3} cy="103" r="3" fill="#fff" /></g>))}
          <path d="M66 92 Q78 86 90 92 M110 92 Q122 86 134 92" stroke={h} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {girl && <><ellipse cx="64" cy="124" rx="9" ry="5" fill="#F7A8B8" opacity=".55" /><ellipse cx="136" cy="124" rx="9" ry="5" fill="#F7A8B8" opacity=".55" /></>}
          <path d="M93 128 Q100 134 107 128" stroke="#C0525F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>)}
      {view === 'back'
        ? <ellipse cx="100" cy="96" rx="52" ry="49" fill={h} />
        : <path d="M49 100 Q44 38 100 38 Q156 38 151 100 Q140 70 120 72 Q108 86 96 74 Q70 74 49 100 Z" fill={h} />}
      {girl && a.hair !== 'long' && <g><circle cx="60" cy="66" r="6" fill="#fff" /><circle cx="60" cy="66" r="2.5" fill="#F2B84B" /></g>}
    </svg>
  )
}
