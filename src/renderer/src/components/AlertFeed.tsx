import { useState } from 'react'
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

const TIPOS: TipoAlerta[] = ['BLOQUEO', 'ALERTA']
const SEVS: Severidad[]   = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA']

const TIPO_CLS: Record<TipoAlerta, string> = {
  BLOQUEO: 'b-bloqueo', ALERTA: 'b-alerta', REGISTRO: 'b-baja'
}
const SEV_CLS: Record<Severidad, string> = {
  CRITICA: 'b-critica', ALTA: 'b-alta', MEDIA: 'b-media', BAJA: 'b-baja'
}

interface AlertFeedProps {
  alerts: Alert[]
  freshId: string | number | null
  onAcknowledge?: (id: string | number) => Promise<void>
}

export default function AlertFeed({ alerts, freshId, onAcknowledge }: AlertFeedProps) {
  const [filterTipo, setFilterTipo] = useState<TipoAlerta | null>(null)
  const [filterSev,  setFilterSev]  = useState<Severidad   | null>(null)

  const visible = alerts
    .filter(a => !filterTipo || a.tipo      === filterTipo)
    .filter(a => !filterSev  || a.severidad === filterSev)

  const colSpan = onAcknowledge ? 7 : 6

  return (
    <div className="panel alert-feed">
      <div className="panel-head">
        <h3>Eventos en tiempo real</h3>
        <span className="panel-count">
          {visible.length !== alerts.length ? `${visible.length} / ${alerts.length}` : alerts.length}
        </span>
        <div className="panel-spacer" />
        {alerts.length > 0 && (
          <button
            className="btn btn-ghost"
            style={{ padding: '5px 10px', fontSize: '12px', gap: '6px' }}
            onClick={() => exportCSV(visible)}
            title="Exportar alertas visibles a CSV"
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

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <span className="filter-label">Tipo</span>
          <span
            className={`filter-chip chip-all ${filterTipo === null ? 'active' : ''}`}
            onClick={() => setFilterTipo(null)}
          >Todos</span>
          {TIPOS.map(t => (
            <span
              key={t}
              className={`filter-chip ${TIPO_CLS[t]} ${filterTipo === t ? 'active' : ''}`}
              onClick={() => setFilterTipo(prev => prev === t ? null : t)}
            ><span className="dot" />{t}</span>
          ))}
        </div>

        <div className="filter-divider" />

        <div className="filter-group">
          <span className="filter-label">Severidad</span>
          <span
            className={`filter-chip chip-all ${filterSev === null ? 'active' : ''}`}
            onClick={() => setFilterSev(null)}
          >Todas</span>
          {SEVS.map(s => (
            <span
              key={s}
              className={`filter-chip ${SEV_CLS[s]} ${filterSev === s ? 'active' : ''}`}
              onClick={() => setFilterSev(prev => prev === s ? null : s)}
            >{s}</span>
          ))}
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
            {visible.map(alert => (
              <tr
                key={alert.id}
                className={[
                  alert.id === freshId ? 'row-fresh' : '',
                  alert.acknowledged   ? 'row-ack'   : ''
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
            {visible.length === 0 && (
              <tr>
                <td colSpan={colSpan} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-faint)', fontStyle: 'italic' }}>
                  {alerts.length === 0 ? 'Esperando eventos...' : 'Sin resultados para este filtro'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
