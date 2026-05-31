import { AppStats } from '../types'

interface CardProps {
  label: string
  value: number
  color: string
}

function StatCard({ label, value, color }: CardProps) {
  return (
    <div className="stat-card" style={{ '--card-color': color } as React.CSSProperties}>
      <span className="stat-value">{value.toLocaleString('es-ES')}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

interface StatsProps {
  stats: AppStats
}

export default function Stats({ stats }: StatsProps) {
  return (
    <section>
      <div className="sec-head">
        <h2>Resumen de actividad</h2>
        <div className="line" />
      </div>
      <div className="stats-row">
        <StatCard label="Total eventos"   value={stats.total}    color="var(--blue)"   />
        <StatCard label="Bloqueos"        value={stats.bloqueos} color="var(--red)"    />
        <StatCard label="IPs bloqueadas"  value={stats.ipsCount} color="var(--purple)" />
        <StatCard label="Severidad Alta"  value={stats.alta}     color="var(--orange)" />
        <StatCard label="Críticos"        value={stats.critica}  color="var(--red)"    />
        <StatCard label="Alertas"         value={stats.alertas}  color="var(--blue)"   />
      </div>
    </section>
  )
}
