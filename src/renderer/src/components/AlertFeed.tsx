import { Alert, Severidad, TipoAlerta } from '../types'
import { DownloadIcon } from './Icons'

function exportCSV(alerts: Alert[]) {
  const header = 'timestamp,tipo,regla,ip,severidad,duracion\n'
  const rows = alerts.map(a =>
    `"${a.timestamp}","${a.tipo}","${a.regla}","${a.ip}","${a.severidad}","${a.duracion ?? ''}"`
  ).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `alertas_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

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
  freshId: string | number | null
  onAcknowledge?: (id: string | number) => Promise<void>
}

export default function AlertFeed({ alerts, freshId, onAcknowledge }: AlertFeedProps) {
  const colSpan = onAcknowledge ? 7 : 6

  return (
    <div className="panel alert-feed">
      <div className="panel-head">
        <h3>Eventos en tiempo real</h3>
        <span className="panel-count">{alerts.length}</span>
        <div className="panel-spacer" />
        {alerts.length > 0 && (
          <button
            className="btn btn-ghost"
            style={{ padding: '5px 10px', fontSize: '12px', gap: '6px' }}
            onClick={() => exportCSV(alerts)}
            title="Exportar alertas a CSV"
          >
            <DownloadIcon /> CSV
          </button>
        )}
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
              {onAcknowledge && <th style={{ width: '50px' }} />}
            </tr>
          </thead>
          <tbody>
            {alerts.map(alert => (
              <tr
                key={alert.id}
                className={[
                  alert.id === freshId ? 'row-fresh' : '',
                  alert.acknowledged ? 'row-ack' : ''
                ].filter(Boolean).join(' ')}
              >
                <td className="cell-ts">{alert.timestamp}</td>
                <td><TypeBadge tipo={alert.tipo} /></td>
                <td className="cell-rule">{alert.regla}</td>
                <td className="cell-ip">{alert.ip}</td>
                <td><SevBadge sev={alert.severidad} /></td>
                <td className="cell-dur">{alert.duracion ? `${alert.duracion}s` : '—'}</td>
                {onAcknowledge && (
                  <td style={{ textAlign: 'center' }}>
                    {!alert.acknowledged && (
                      <button
                        className="btn-ack"
                        title="Marcar como revisado"
                        onClick={() => onAcknowledge(alert.id)}
                      >✓</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={colSpan} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-faint)', fontStyle: 'italic' }}>
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
