import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { Alert, Severidad } from '../types'

const API_URL = 'http://localhost:8080'

interface ApiStats {
  total: number
  by_rule: Record<string, number>
  by_severity: Record<string, number>
  by_type: Record<string, number>
}

// ── Severity config ────────────────────────────────────────
const SEV: Record<Severidad, { color: string; label: string }> = {
  CRITICA: { color: '#f85149', label: 'Crítica' },
  ALTA:    { color: '#d29922', label: 'Alta'    },
  MEDIA:   { color: '#58a6ff', label: 'Media'   },
  BAJA:    { color: '#6e7681', label: 'Baja'    }
}

// ── Data builders ──────────────────────────────────────────
function buildTimeline(alerts: Alert[], windowMin = 30) {
  const now = Date.now()
  const buckets = new Map<string, number>()
  for (let i = windowMin - 1; i >= 0; i--) {
    const t = new Date(now - i * 60000)
    const key = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`
    buckets.set(key, 0)
  }
  for (const a of alerts) {
    const d = new Date(a.timestamp.replace(' ', 'T'))
    if (isNaN(d.getTime())) continue
    const age = (now - d.getTime()) / 60000
    if (age < 0 || age > windowMin) continue
    const key = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  return Array.from(buckets.entries()).map(([time, count]) => ({ time, count }))
}

function buildSeverityFromAlerts(alerts: Alert[]) {
  const counts: Record<Severidad, number> = { CRITICA: 0, ALTA: 0, MEDIA: 0, BAJA: 0 }
  alerts.forEach(a => { counts[a.severidad] = (counts[a.severidad] ?? 0) + 1 })
  return (Object.keys(SEV) as Severidad[])
    .filter(k => counts[k] > 0)
    .map(k => ({ name: SEV[k].label, value: counts[k], color: SEV[k].color }))
}

function buildSeverityFromApi(by_severity: Record<string, number>) {
  return (Object.keys(SEV) as Severidad[])
    .filter(k => (by_severity[k] ?? 0) > 0)
    .map(k => ({ name: SEV[k].label, value: by_severity[k] ?? 0, color: SEV[k].color }))
}

function buildTopRulesFromAlerts(alerts: Alert[], n = 6) {
  const counts = new Map<string, number>()
  alerts.forEach(a => counts.set(a.regla, (counts.get(a.regla) ?? 0) + 1))
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, n)
  const max = sorted[0]?.[1] ?? 1
  return sorted.map(([rule, count]) => ({ rule, count, pct: Math.round((count / max) * 100) }))
}

function buildTopRulesFromApi(by_rule: Record<string, number>, n = 6) {
  const sorted = Object.entries(by_rule).sort((a, b) => b[1] - a[1]).slice(0, n)
  const max = sorted[0]?.[1] ?? 1
  return sorted.map(([rule, count]) => ({ rule, count, pct: Math.round((count / max) * 100) }))
}

// ── Tooltip styles ─────────────────────────────────────────
const tooltipStyle = {
  background: '#161b22', border: '1px solid #30363d',
  borderRadius: 6, fontSize: 12, color: '#e6edf3', padding: '6px 10px'
}

// ── Sub-components ─────────────────────────────────────────
function SectionHead({ title }: { title: string }) {
  return (
    <div className="sec-head" style={{ marginBottom: 12 }}>
      <h2>{title}</h2>
      <div className="line" />
    </div>
  )
}

function Timeline({ alerts }: { alerts: Alert[] }) {
  const data = buildTimeline(alerts)
  const hasData = data.some(d => d.count > 0)
  return (
    <div className="chart-panel">
      <div className="chart-panel-head">
        <span className="chart-panel-title">Actividad — últimos 30 min</span>
      </div>
      <div className="chart-body">
        {!hasData ? (
          <div className="chart-empty">Sin actividad reciente</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 8, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#58a6ff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#58a6ff" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fill: '#6e7681', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                tickLine={false} axisLine={false}
                interval={4}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#6e7681', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                tickLine={false} axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: '#8b949e', marginBottom: 2 }}
                itemStyle={{ color: '#58a6ff' }}
                cursor={{ stroke: '#30363d', strokeWidth: 1 }}
              />
              <Area
                type="monotone" dataKey="count" name="Alertas"
                stroke="#58a6ff" strokeWidth={1.5}
                fill="url(#areaGrad)"
                dot={false} activeDot={{ r: 3, fill: '#58a6ff', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function SeverityDonut({ alerts, apiStats }: { alerts: Alert[], apiStats: ApiStats | null }) {
  const data = apiStats
    ? buildSeverityFromApi(apiStats.by_severity)
    : buildSeverityFromAlerts(alerts)
  const total = apiStats ? apiStats.total : data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="chart-panel">
      <div className="chart-panel-head">
        <span className="chart-panel-title">Severidad</span>
      </div>
      <div className="chart-body chart-body--donut">
        {total === 0 ? (
          <div className="chart-empty">Sin datos</div>
        ) : (
          <>
            <div className="donut-wrap">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie
                    data={data} innerRadius={38} outerRadius={58}
                    paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}
                  >
                    {data.map((entry, i) => (
                      <Cell key={i} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: '#e6edf3' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <span className="donut-total">{total}</span>
                <span className="donut-label">total</span>
              </div>
            </div>
            <div className="donut-legend">
              {data.map(d => (
                <div key={d.name} className="donut-leg-row">
                  <span className="donut-leg-dot" style={{ background: d.color }} />
                  <span className="donut-leg-name">{d.name}</span>
                  <span className="donut-leg-val">{d.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TopRules({ alerts, apiStats }: { alerts: Alert[], apiStats: ApiStats | null }) {
  const data = apiStats
    ? buildTopRulesFromApi(apiStats.by_rule)
    : buildTopRulesFromAlerts(alerts)
  return (
    <div className="chart-panel">
      <div className="chart-panel-head">
        <span className="chart-panel-title">Top reglas</span>
      </div>
      <div className="chart-body chart-body--rules">
        {data.length === 0 ? (
          <div className="chart-empty">Sin datos</div>
        ) : (
          data.map(r => (
            <div key={r.rule} className="rule-bar-row">
              <span className="rule-bar-name">{r.rule}</span>
              <div className="rule-bar-track">
                <div className="rule-bar-fill" style={{ width: `${r.pct}%` }} />
              </div>
              <span className="rule-bar-count">{r.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────
interface ChartsProps { alerts: Alert[] }

export default function Charts({ alerts }: ChartsProps) {
  const [apiStats, setApiStats] = useState<ApiStats | null>(null)

  useEffect(() => {
    const load = () =>
      fetch(`${API_URL}/api/stats`)
        .then(r => r.json())
        .then(setApiStats)
        .catch(() => {})
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <section>
      <SectionHead title="Análisis" />
      <div className="charts-row">
        <Timeline alerts={alerts} />
        <SeverityDonut alerts={alerts} apiStats={apiStats} />
        <TopRules     alerts={alerts} apiStats={apiStats} />
      </div>
    </section>
  )
}
