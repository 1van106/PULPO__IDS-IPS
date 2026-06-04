import { useState } from 'react'
import { Alert, Severidad, TipoAlerta } from '../types'
import { DownloadIcon, FilterIcon } from './Icons'

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

type FilterVal = string

interface SegOpt { value: FilterVal; label: string; cls: string }

const TYPE_OPTS: SegOpt[] = [
  { value: 'ALL',     label: 'TODOS',   cls: 'is-all'    },
  { value: 'BLOQUEO', label: 'BLOQUEO', cls: 't-bloqueo' },
  { value: 'ALERTA',  label: 'ALERTA',  cls: 't-alerta'  },
]
const SEV_OPTS: SegOpt[] = [
  { value: 'ALL',     label: 'TODAS',   cls: 'is-all'    },
  { value: 'CRITICA', label: 'CRÍTICA', cls: 's-critica' },
  { value: 'ALTA',    label: 'ALTA',    cls: 's-alta'    },
  { value: 'MEDIA',   label: 'MEDIA',   cls: 's-media'   },
  { value: 'BAJA',    label: 'BAJA',    cls: 's-baja'    },
]

function FilterSegment({ label, options, value, onChange }: {
  label: string
  options: SegOpt[]
  value: FilterVal
  onChange: (v: FilterVal) => void
}) {
  return (
    <div className="filter-field">
      <span className="field-label">{label}</span>
      <div className="segment" role="group" aria-label={label}>
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            className={`seg-btn ${o.cls}`}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.value !== 'ALL' && <span className="mk" />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface AlertFeedProps {
  alerts: Alert[]
  freshId: string | number | null
  onAcknowledge?: (id: string | number) => Promise<void>
}

export default function AlertFeed({ alerts, freshId, onAcknowledge }: AlertFeedProps) {
  const [filterTipo,  setFilterTipo]  = useState<FilterVal>('ALL')
  const [filterSev,   setFilterSev]   = useState<FilterVal>('ALL')
  const [query,       setQuery]       = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeCount =
    (filterTipo !== 'ALL' ? 1 : 0) +
    (filterSev  !== 'ALL' ? 1 : 0) +
    (query !== ''         ? 1 : 0)
  const active = activeCount > 0

  const q = query.toLowerCase()
  const visible = alerts
    .filter(a => filterTipo === 'ALL' || a.tipo      === filterTipo)
    .filter(a => filterSev  === 'ALL' || a.severidad === filterSev)
    .filter(a => !q || a.regla.toLowerCase().includes(q) || a.ip.includes(q))

  const colSpan = onAcknowledge ? 7 : 6

  return (
    <div className="panel alert-feed">
      <div className="panel-head">
        <h3>Eventos en tiempo real</h3>
        <span className="panel-count">{visible.length}</span>
        <div className="panel-spacer" />
        <button
          className={`btn btn-ghost fb-toggle${activeCount > 0 ? ' fb-toggle--on' : ''}`}
          style={{ padding: '5px 10px', fontSize: '12px', gap: '6px' }}
          onClick={() => setFiltersOpen(o => !o)}
          title={filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
        >
          <FilterIcon />
          Filtros
          {activeCount > 0 && <span className="fb-count">{activeCount}</span>}
        </button>
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

      <div className={`filterbar-collapse${filtersOpen ? ' is-open' : ''}`}>
      <div className="filterbar">
        <FilterSegment label="Tipo"      options={TYPE_OPTS} value={filterTipo} onChange={setFilterTipo} />
        <FilterSegment label="Severidad" options={SEV_OPTS}  value={filterSev}  onChange={setFilterSev}  />
        <div className="filter-field">
          <span className="field-label">Buscar</span>
          <div className="fb-search-wrap">
            <input
              type="text"
              className="fb-search"
              placeholder="regla o IP…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            {query && (
              <button type="button" className="fb-search-x" onClick={() => setQuery('')}>✕</button>
            )}
          </div>
        </div>
        <div className="fb-spacer" />
        <span className="fb-result">
          <b>{visible.length}</b> / {alerts.length} eventos
        </span>
        <button
          type="button"
          className="fb-clear"
          disabled={!active}
          onClick={() => { setFilterTipo('ALL'); setFilterSev('ALL'); setQuery('') }}
        >
          ✕ Limpiar
        </button>
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
                  {alerts.length === 0 ? 'Esperando eventos...' : 'Sin eventos que coincidan con el filtro'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
