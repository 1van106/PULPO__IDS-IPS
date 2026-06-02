import { useState, useEffect, useCallback } from 'react'
import { Alert, AppStats, BlockedIP, parseAlert } from '../types'

const MAX_ALERTS = 500

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [logPath, setLogPath] = useState<string | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)

  useEffect(() => {
    const cleanup = window.api.onAlert((line: string) => {
      const alert = parseAlert(line)
      if (alert) {
        setAlerts(prev => [alert, ...prev].slice(0, MAX_ALERTS))
      }
    })
    return cleanup
  }, [])

  useEffect(() => {
    // Load persisted history and start watching in parallel
    Promise.all([
      window.api.getPersistedAlerts(),
      window.api.getAutoPath()
    ]).then(([raws, autoPath]) => {
      // DB returns oldest-first; reverse so newest appears at top
      const parsed = raws.map(parseAlert).filter(Boolean) as Alert[]
      if (parsed.length > 0) setAlerts(parsed.reverse())

      if (autoPath) {
        window.api.watchLog(autoPath)
        setLogPath(autoPath)
        setIsMonitoring(true)
      }
    })
  }, [])

  const openFile = useCallback(async () => {
    const path = await window.api.openLogDialog()
    if (path) {
      setAlerts([])
      setLogPath(path)
      setIsMonitoring(true)
    }
  }, [])

  const watchPath = useCallback(async (path: string) => {
    setAlerts([])
    await window.api.watchLog(path)
    setLogPath(path)
    setIsMonitoring(true)
  }, [])

  // Derive blocked IPs with hit counts from alert list
  const blockedIPs: BlockedIP[] = Array.from(
    alerts
      .filter(a => a.tipo === 'BLOQUEO')
      .reduce((map, alert) => {
        const existing = map.get(alert.ip)
        if (existing) {
          existing.hits++
        } else {
          map.set(alert.ip, { ip: alert.ip, rule: alert.regla, hits: 1 })
        }
        return map
      }, new Map<string, BlockedIP>())
      .values()
  )

  const stats: AppStats = {
    total:    alerts.length,
    bloqueos: alerts.filter(a => a.tipo === 'BLOQUEO').length,
    alertas:  alerts.filter(a => a.tipo === 'ALERTA').length,
    critica:  alerts.filter(a => a.severidad === 'CRITICA').length,
    alta:     alerts.filter(a => a.severidad === 'ALTA').length,
    media:    alerts.filter(a => a.severidad === 'MEDIA').length,
    baja:     alerts.filter(a => a.severidad === 'BAJA').length,
    ipsCount: blockedIPs.length
  }

  const clearHistory = useCallback(async () => {
    await window.api.clearAlerts()
    setAlerts([])
  }, [])

  return { alerts, logPath, isMonitoring, openFile, watchPath, clearHistory, blockedIPs, stats }
}
