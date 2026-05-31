import { Alert, Severidad, TipoAlerta } from '../types'

function TypeBadge({ tipo }: { tipo: TipoAlerta }) {
  const cls = tipo === 'BLOQUEO' ? 'b-bloqueo' : tipo === 'ALERTA' ? 'b-alerta' : 'b-baja'
  return <span className={`badge ${cls}`}><span className="dot" />{tipo}</span>
}

function SevBadge({ sev }: { sev: Severidad }) {
  const map: Record<Severidad, string> = {
    CRITICA: 'b-critica', ALTA: 'b-alta', MEDIA: 'b-media', BAJA: 'b-baja'
  }
  return <span className={`badge ${map[sev]}`}>{sev}</span>
}

interface AlertFeedProps {
  alerts: Alert[]
  freshId: string | null
}

export default function AlertFeed({ alerts, freshId }: AlertFeedProps) {
  return (
    <div className="panel alert-feed">
      <div className="panel-head">
        <h3>Eventos en tiempo real</h3>
        <span className="panel-count">{alerts.length}</span>
        <div className="panel-spacer" />
        <div className="live-tag">
          <span
            className="pulse-dot"
            style={{
              background: 'var(--green)',
              ['--ring-color' as string]: 'rgba(63,185,80,0.6)'
            }}
          />
          STREAMING
        </div>
      </div>
      <div className="table-wrapper">
        <table className="alert-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Timestamp</th>
              <th style={{ width: '110px' }}>Tipo</th>
              <th>Regla</th>
              <th style={{ width: '150px' }}>IP origen</th>
              <th style={{ width: '100px' }}>Severidad</th>
              <th style={{ width: '90px', textAlign: 'right' }}>Duración</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map(alert => (
              <tr key={alert.id} className={alert.id === freshId ? 'row-fresh' : ''}>
                <td className="cell-ts">{alert.timestamp}</td>
                <td><TypeBadge tipo={alert.tipo} /></td>
                <td className="cell-rule">{alert.regla}</td>
                <td className="cell-ip">{alert.ip}</td>
                <td><SevBadge sev={alert.severidad} /></td>
                <td className="cell-dur">{alert.duracion ? `${alert.duracion}s` : '—'}</td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-faint)', fontStyle: 'italic' }}>
                  Esperando eventos...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
