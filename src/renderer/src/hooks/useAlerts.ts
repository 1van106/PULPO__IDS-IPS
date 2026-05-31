import { useState, useEffect, useCallback } from 'react'
import { Alert, AppStats, parseAlert } from '../types'

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

  const blockedIPs: string[] = [
    ...new Set(alerts.filter(a => a.tipo === 'BLOQUEO').map(a => a.ip))
  ]

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

  return { alerts, logPath, isMonitoring, openFile, watchPath, blockedIPs, stats }
}
