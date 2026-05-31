import { AppStats } from '../types'

interface CardProps {
  label: string
  value: number
  color: string
}

function StatCard({ label, value, color }: CardProps) {
  return (
    <div className="stat-card" style={{ '--card-color': color } as React.CSSProperties}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

interface StatsProps {
  stats: AppStats
}

export default function Stats({ stats }: StatsProps) {
  return (
    <div className="stats-row">
      <StatCard label="Total eventos"    value={stats.total}    color="#58a6ff" />
      <StatCard label="Bloqueos"         value={stats.bloqueos} color="#f85149" />
      <StatCard label="IPs bloqueadas"   value={stats.ipsCount} color="#bc8cff" />
      <StatCard label="Severidad Alta"   value={stats.alta}     color="#d29922" />
      <StatCard label="Críticos"         value={stats.critica}  color="#ff4444" />
      <StatCard label="Alertas"          value={stats.alertas}  color="#3fb950" />
    </div>
  )
}
