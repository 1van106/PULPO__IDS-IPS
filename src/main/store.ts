import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

const MAX_STORED = 2000

let dbPath: string | null = null
const seenRaws = new Set<string>()

function getDbPath(): string {
  if (!dbPath) {
    dbPath = path.join(app.getPath('userData'), 'alerts.ndjson')
  }
  return dbPath
}

export function loadAlerts(): string[] {
  try {
    const content = fs.readFileSync(getDbPath(), 'utf-8')
    const lines = content.trim().split('\n').filter(l => l.trim())
    const raws = lines
      .map(l => { try { return JSON.parse(l) as string } catch { return null } })
      .filter(Boolean) as string[]

    const trimmed = raws.length > MAX_STORED ? raws.slice(-MAX_STORED) : raws
    if (raws.length > MAX_STORED) {
      fs.writeFileSync(getDbPath(), trimmed.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf-8')
    }

    trimmed.forEach(r => seenRaws.add(r))
    return trimmed
  } catch {
    return []
  }
}

// Returns true if the alert is new (saved), false if already seen (duplicate).
export function tryAppendAlert(raw: string): boolean {
  if (seenRaws.has(raw)) return false
  seenRaws.add(raw)
  fs.appendFileSync(getDbPath(), JSON.stringify(raw) + '\n', 'utf-8')
  return true
}

export function clearAlerts(): void {
  seenRaws.clear()
  try { fs.writeFileSync(getDbPath(), '', 'utf-8') } catch { /* ignore */ }
}
