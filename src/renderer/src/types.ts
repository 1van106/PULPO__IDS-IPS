export type Severidad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'
export type TipoAlerta = 'BLOQUEO' | 'ALERTA' | 'REGISTRO'

export interface Alert {
  id: string
  timestamp: string
  tipo: TipoAlerta
  regla: string
  ip: string
  severidad: Severidad
  duracion?: number
  raw: string
}

export interface BlockedIP {
  ip: string
  rule: string
  hits: number
}

export interface AppStats {
  total: number
  bloqueos: number
  alertas: number
  critica: number
  alta: number
  media: number
  baja: number
  ipsCount: number
}

// Parses a line from alertas.log into an Alert object.
// Expected format:
// [2026-02-25 10:15:32] BLOQUEO | Regla: SSH_BRUTEFORCE | IP: 192.168.1.100 | Severidad: ALTA | Duracion: 300s
export function parseAlert(raw: string): Alert | null {
  const line = raw.trim()
  if (!line) return null
  const m = line.match(
    /\[(.+?)\]\s+(\w+)\s+\|\s+Regla:\s+(\S+)\s+\|\s+IP:\s+(\S+)\s+\|\s+Severidad:\s+(\w+)(?:\s+\|\s+Duracion:\s+(\d+)s)?/
  )
  if (!m) return null
  return {
    id: `${Date.now()}-${Math.random()}`,
    timestamp: m[1],
    tipo: m[2] as TipoAlerta,
    regla: m[3],
    ip: m[4],
    severidad: m[5] as Severidad,
    duracion: m[6] ? parseInt(m[6]) : undefined,
    raw: line
  }
}
