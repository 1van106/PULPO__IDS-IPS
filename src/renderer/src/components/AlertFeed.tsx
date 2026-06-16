import { useState } from 'react'
import { Alert, Severidad, TipoAlerta } from '../types'
import { DownloadIcon, FilterIcon } from './Icons'

/* ── Threat-intel helpers ─────────────────────────────────────────────────── */

// "DE" → 🇩🇪  (los 2 caracteres ISO a Regional Indicator Symbols).
// Devuelve '' si el código es nulo o inválido.
function flagEmoji(code?: string | null): string {
  if (!code) return ''
  const cc = code.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return ''
  return String.fromCodePoint(
    0x1f1e6 + cc.charCodeAt(0) - 65,
    0x1f1e6 + cc.charCodeAt(1) - 65
  )
}

// Tramo de color del abuse_score (AbuseIPDB 0–100).
function abuseClass(score: number): string {
  if (score >= 75) return 'b-abuse-high'   // 75–100  alto / IP maliciosa
  if (score >= 25) return 'b-abuse-med'    // 25–74   medio
  return 'b-abuse-low'                      // 1–24    bajo
}

// Celda "Riesgo": badge de abuse + (opcional) badge de VirusTotal.
function ThreatCell({ score, vt }: { score?: number | null; vt?: number | null }) {
  const hasScore = score != null && score > 0
  const hasVt = vt != null && vt > 0
  if (!hasScore && !hasVt) return <span className="cell-empty">—</span>
  return (
    <span className="intel-group">
      {hasScore && (
        <span className={`badge ${abuseClass(score as number)}`} title={`AbuseIPDB ${score}/100`}>
          <span className="dot" />{score}
        </span>
      )}
      {hasVt && (
        <span className="badge b-vt" title={`VirusTotal: ${vt} motores maliciosos`}>VT {vt}</span>
      )}
    </span>
  )
}

/* ── CSV ──────────────────────────────────────────────────────────────────── */

function exportCSV(alerts: Alert[]) {
  const header = 'host,timestamp,tipo,regla,ip,pais,abuse_score,vt_malicious,severidad,duracion\n'
  const rows = alerts.map(a =>
    `"${a.host ?? 'local'}","${a.timestamp}","${a.tipo}","${a.regla}","${a.ip}",` +
    `"${a.pais ?? ''}","${a.abuse_score ?? ''}","${a.vt_malicious ?? ''}",` +
    `"${a.severidad}","${a.duracion ?? ''}"`
  ).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `alertas_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/* ── Badges de tipo / severidad ───────────────────────────────────────────── */

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

/* ── Filtros (segmented control) ──────────────────────────────────────────── */

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

/* ── AlertFeed ────────────────────────────────────────────────────────────── */

interface AlertFeedProps {
  alerts: Alert[]
  freshId: string | number | null
  showHost?: boolean
  onAcknowledge?: (id: string | number) => Promise<void>
}

export default function AlertFeed({ alerts, freshId, showHost, onAcknowledge }: AlertFeedProps) {
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

  // Timestamp · Tipo · Regla · IP · Riesgo · Severidad · Duración  = 7 base
  const colSpan = 7 + (showHost ? 1 : 0) + (onAcknowledge ? 1 : 0)

  return (
    <div className="panel alert-feed">
      <div className="panel-head">
        <h3>Eventos en tiempo real</h3>
        <span className="panel-count"><b>{visible.length}</b> / {alerts.length} eventos</span>
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

      {filtersOpen && (
        <div className="filterbar">
          <FilterSegment label="Tipo"      options={TYPE_OPTS} value={filterTipo} onChange={setFilterTipo} />
          <FilterSegment label="Severidad" options={SEV_OPTS}  value={filterSev}  onChange={setFilterSev}  />
          <div className="filter-field fb-search-field">
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
          <button
            type="button"
            className="fb-clear"
            disabled={!active}
            onClick={() => { setFilterTipo('ALL'); setFilterSev('ALL'); setQuery('') }}
          >
            ✕ Limpiar
          </button>
        </div>
      )}

      <div className="table-wrapper">
        <table className="alert-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Timestamp</th>
              {showHost && <th style={{ width: '110px' }}>Host</th>}
              <th style={{ width: '110px' }}>Tipo</th>
              <th>Regla</th>
              <th style={{ width: '160px' }}>IP origen</th>
              <th style={{ width: '128px' }}>Riesgo</th>
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
                {showHost && <td><span className="badge b-host">{alert.host || 'local'}</span></td>}
                <td><TypeBadge tipo={alert.tipo} /></td>
                <td className="cell-rule">{alert.regla}</td>
                <td className="cell-ip">
                  {alert.pais && (
                    <span className="ip-flag" title={alert.pais}>{flagEmoji(alert.pais)}</span>
                  )}
                  {alert.ip}
                </td>
                <td className="cell-intel">
                  <ThreatCell score={alert.abuse_score} vt={alert.vt_malicious} />
                </td>
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
