import { useEffect, useState } from 'react'

// Animated ring chart with several colored slices.
//   <Donut data={[{ label, value, color }]} center={<b>42</b>} />
export function Donut({ data, size = 170, thickness = 20, center }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60)
    return () => clearTimeout(t)
  }, [])

  let offset = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={thickness} className="text-line" />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * c
            const slice = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${ready ? Math.max(len - 2, 0) : 0} ${c}`}
                strokeDashoffset={-offset}
                style={{ transition: 'stroke-dasharray 0.9s ease' }}
              />
            )
            offset += len
            return slice
          })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
    </div>
  )
}

// One progress ring
export function Ring({ value, max = 100, size = 130, thickness = 14, color = '#2f6fd1', children }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={thickness} className="text-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${ready ? pct * c : 0} ${c}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

// Horizontal bars: items = [{ label, value, color }]
export function BarList({ items }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="space-y-4">
      {items.map((i) => (
        <div key={i.label}>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-medium">{i.label}</span>
            <span className="font-semibold text-muted">{i.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: ready ? `${(i.value / max) * 100}%` : '0%', background: i.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Legend({ items }) {
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.label} className="flex items-center justify-between gap-6 text-sm">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
            {i.label}
          </span>
          <span className="font-semibold">{i.value}</span>
        </div>
      ))}
    </div>
  )
}
