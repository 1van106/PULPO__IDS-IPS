import { useState, useEffect, useCallback, useRef } from 'react'
import { Alert, AppStats, BlockedIP, parseAlert } from '../types'

const MAX_ALERTS = 500
const API_URL = 'http://localhost:8080'

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [logPath, setLogPath] = useState<string | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const apiAvailable = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let ipcCleanup: (() => void) | undefined

    const initApiMode = () => {
      apiAvailable.current = true
      fetch(`${API_URL}/api/alerts`)
        .then(r => r.json())
        .then((data: Alert[]) => {
          setAlerts(data)
          setLogPath(`API · localhost:8080`)
          setIsMonitoring(true)
        })
        .catch(console.error)

      const ws = new WebSocket(`ws://localhost:8080/ws`)
      ws.onmessage = (e) => {
        const alert = JSON.parse(e.data) as Alert
        setAlerts(prev => [alert, ...prev].slice(0, MAX_ALERTS))
      }
      wsRef.current = ws
    }

    const initFileMode = () => {
      ipcCleanup = window.api.onAlert((line: string) => {
        const alert = parseAlert(line)
        if (alert) setAlerts(prev => [alert, ...prev].slice(0, MAX_ALERTS))
      })

      Promise.all([window.api.getPersistedAlerts(), window.api.getAutoPath()])
        .then(([raws, autoPath]) => {
          const parsed = raws.map(parseAlert).filter(Boolean) as Alert[]
          if (parsed.length > 0) setAlerts(parsed.reverse())
          if (autoPath) {
            window.api.watchLog(autoPath)
            setLogPath(autoPath)
            setIsMonitoring(true)
          }
        })
    }

    fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(2000) })
      .then(r => (r.ok ? initApiMode() : initFileMode()))
      .catch(() => initFileMode())

    return () => {
      wsRef.current?.close()
      ipcCleanup?.()
    }
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
    if (apiAvailable.current) {
      await fetch(`${API_URL}/api/alerts`, { method: 'DELETE' })
    } else {
      await window.api.clearAlerts()
    }
    setAlerts([])
  }, [])

  const acknowledgeAlert = useCallback(async (id: string | number) => {
    if (!apiAvailable.current || typeof id !== 'number') return
    await fetch(`${API_URL}/api/alerts/${id}/acknowledge`, { method: 'POST' })
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, acknowledged: true } : a)))
  }, [])

  return {
    alerts, logPath, isMonitoring,
    openFile, watchPath, clearHistory, acknowledgeAlert,
    blockedIPs, stats,
    isApiMode: apiAvailable.current
  }
}
