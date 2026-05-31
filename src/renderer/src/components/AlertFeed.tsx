import { Alert, Severidad, TipoAlerta } from '../types'

const SEV_COLOR: Record<Severidad, string> = {
  CRITICA: '#ff4444',
  ALTA:    '#f85149',
  MEDIA:   '#d29922',
  BAJA:    '#3fb950'
}

const TIPO_COLOR: Record<TipoAlerta, string> = {
  BLOQUEO:  '#f85149',
  ALERTA:   '#d29922',
  REGISTRO: '#8b949e'
}

interface AlertFeedProps {
  alerts: Alert[]
}

export default function AlertFeed({ alerts }: AlertFeedProps) {
  return (
    <section className="alert-feed">
      <h2 className="section-title">
        Eventos en tiempo real
        <span className="badge">{alerts.length}</span>
      </h2>
      <div className="table-wrapper">
        <table className="alert-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Tipo</th>
              <th>Regla</th>
              <th>IP</th>
              <th>Severidad</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map(alert => (
              <tr key={alert.id} className="alert-row">
                <td className="cell-mono cell-dim">{alert.timestamp}</td>
                <td>
                  <Chip text={alert.tipo} color={TIPO_COLOR[alert.tipo]} />
                </td>
                <td className="cell-mono">{alert.regla}</td>
                <td className="cell-mono">{alert.ip}</td>
                <td>
                  <Chip text={alert.severidad} color={SEV_COLOR[alert.severidad]} />
                </td>
                <td className="cell-mono cell-dim">
                  {alert.duracion ? `${alert.duracion}s` : '—'}
                </td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">Esperando eventos...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Chip({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="chip"
      style={{
        color,
        backgroundColor: color + '22',
        borderColor: color + '55'
      }}
    >
      {text}
    </span>
  )
}
