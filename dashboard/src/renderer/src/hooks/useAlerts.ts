import { useState, useEffect, useCallback, useRef } from 'react'
import { Alert, AppStats, BlockedIP, HostInfo, parseAlert } from '../types'

const MAX_ALERTS = 500
const DEFAULT_API_URL = 'http://localhost:8080'
const LS_URL = 'pulpo.apiUrl'
const LS_TOKEN = 'pulpo.apiToken'

const ALL_HOSTS = '__all__'

function wsFromHttp(url: string): string {
  return url.replace(/^http/i, 'ws').replace(/\/$/, '') + '/ws'
}

export function useAlerts() {
  const [apiUrl, setApiUrlState] = useState<string>(
    () => localStorage.getItem(LS_URL) || DEFAULT_API_URL
  )
  const [apiToken, setApiTokenState] = useState<string>(
    () => localStorage.getItem(LS_TOKEN) || ''
  )
  const [allAlerts, setAllAlerts] = useState<Alert[]>([])
  const [selectedHost, setSelectedHost] = useState<string>(ALL_HOSTS)
  const [logPath, setLogPath] = useState<string | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const apiAvailable = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)

  const authHeaders = useCallback((): HeadersInit => {
    return apiToken ? { Authorization: `Bearer ${apiToken}` } : {}
  }, [apiToken])

  useEffect(() => {
    let ipcCleanup: (() => void) | undefined
    const base = apiUrl.replace(/\/$/, '')

    const initApiMode = () => {
      apiAvailable.current = true
      fetch(`${base}/api/alerts`)
        .then(r => r.json())
        .then((data: Alert[]) => {
          setAllAlerts(data)
          setLogPath(`API · ${base.replace(/^https?:\/\//, '')}`)
          setIsMonitoring(true)
        })
        .catch(console.error)

      const ws = new WebSocket(wsFromHttp(base))
      ws.onmessage = (e) => {
        const alert = JSON.parse(e.data) as Alert
        setAllAlerts(prev => [alert, ...prev].slice(0, MAX_ALERTS))
      }
      wsRef.current = ws
    }

    const initFileMode = () => {
      apiAvailable.current = false
      ipcCleanup = window.api.onAlert((line: string) => {
        const alert = parseAlert(line)
        if (alert) setAllAlerts(prev => [alert, ...prev].slice(0, MAX_ALERTS))
      })

      Promise.all([window.api.getPersistedAlerts(), window.api.getAutoPath()])
        .then(([raws, autoPath]) => {
          const parsed = raws.map(parseAlert).filter(Boolean) as Alert[]
          if (parsed.length > 0) setAllAlerts(parsed.reverse())
          if (autoPath) {
            window.api.watchLog(autoPath)
            setLogPath(autoPath)
            setIsMonitoring(true)
          }
        })
    }

    fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) })
      .then(r => (r.ok ? initApiMode() : initFileMode()))
      .catch(() => initFileMode())

    return () => {
      wsRef.current?.close()
      ipcCleanup?.()
    }
  }, [apiUrl])

  // Persistir y reconectar al cambiar la URL del colector
  const setApiUrl = useCallback((url: string) => {
    const clean = url.trim().replace(/\/$/, '')
    localStorage.setItem(LS_URL, clean)
    setAllAlerts([])
    setSelectedHost(ALL_HOSTS)
    setApiUrlState(clean)
  }, [])

  const setApiToken = useCallback((token: string) => {
    const clean = token.trim()
    localStorage.setItem(LS_TOKEN, clean)
    setApiTokenState(clean)
  }, [])

  const openFile = useCallback(async () => {
    const path = await window.api.openLogDialog()
    if (path) {
      setAllAlerts([])
      setLogPath(path)
      setIsMonitoring(true)
    }
  }, [])

  const watchPath = useCallback(async (path: string) => {
    setAllAlerts([])
    await window.api.watchLog(path)
    setLogPath(path)
    setIsMonitoring(true)
  }, [])

  // Hosts distintos (de todas las alertas cargadas), para el selector
  const hosts: HostInfo[] = Array.from(
    allAlerts.reduce((map, a) => {
      const h = a.host || 'local'
      const info = map.get(h)
      if (info) {
        info.count++
        if (a.timestamp > info.lastSeen) info.lastSeen = a.timestamp
      } else {
        map.set(h, { host: h, count: 1, lastSeen: a.timestamp })
      }
      return map
    }, new Map<string, HostInfo>()).values()
  ).sort((a, b) => b.count - a.count)

  // Vista filtrada por host: alimenta feed, stats y BlockedIPs
  const alerts = selectedHost === ALL_HOSTS
    ? allAlerts
    : allAlerts.filter(a => (a.host || 'local') === selectedHost)

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
      await fetch(`${apiUrl.replace(/\/$/, '')}/api/alerts`, {
        method: 'DELETE',
        headers: authHeaders()
      })
    } else {
      await window.api.clearAlerts()
    }
    setAllAlerts([])
  }, [apiUrl, authHeaders])

  const acknowledgeAlert = useCallback(async (id: string | number) => {
    if (!apiAvailable.current || typeof id !== 'number') return
    await fetch(`${apiUrl.replace(/\/$/, '')}/api/alerts/${id}/acknowledge`, {
      method: 'POST',
      headers: authHeaders()
    })
    setAllAlerts(prev => prev.map(a => (a.id === id ? { ...a, acknowledged: true } : a)))
  }, [apiUrl, authHeaders])

  return {
    alerts, logPath, isMonitoring,
    openFile, watchPath, clearHistory, acknowledgeAlert,
    blockedIPs, stats,
    isApiMode: apiAvailable.current,
    hosts, selectedHost, setSelectedHost, allHostsValue: ALL_HOSTS,
    apiUrl, setApiUrl, apiToken, setApiToken
  }
}
