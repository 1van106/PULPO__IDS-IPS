import { useState } from 'react'
import { HostInfo } from '../types'
import { OctopusIcon, ServerIcon, SwapIcon, TrashIcon } from './Icons'

interface HeaderProps {
  logPath: string | null
  isMonitoring: boolean
  onChangeFile: () => void
  onClearHistory: () => void
  alertCount: number
  isApiMode: boolean
  hosts: HostInfo[]
  selectedHost: string
  setSelectedHost: (h: string) => void
  allHostsValue: string
  apiUrl: string
  setApiUrl: (url: string) => void
  apiToken: string
  setApiToken: (token: string) => void
}

export default function Header({
  logPath, isMonitoring, onChangeFile, onClearHistory, alertCount,
  isApiMode, hosts, selectedHost, setSelectedHost, allHostsValue,
  apiUrl, setApiUrl, apiToken, setApiToken
}: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [urlDraft, setUrlDraft] = useState(apiUrl)
  const [tokenDraft, setTokenDraft] = useState(apiToken)

  const saveSettings = () => {
    setApiToken(tokenDraft)
    setApiUrl(urlDraft)          // dispara reconexión
    setSettingsOpen(false)
  }

  return (
    <header className="header">
      <div className="header-left">
        <div className="hdr-mark">
          <OctopusIcon size={28} />
        </div>
        <div className="header-titles">
          <span className="header-title">PULPO</span>
          <span className="header-sub">IDS Monitor</span>
        </div>
      </div>

      <div className="header-center">
        {logPath && (
          <div className="monitor-pill">
            <span
              className="pulse-dot"
              style={{
                background: isMonitoring ? 'var(--green)' : 'var(--text-faint)',
                ['--ring-color' as string]: 'rgba(63,185,80,0.6)'
              }}
            />
            <span className="status-label">{isMonitoring ? 'MONITORIZANDO' : 'INACTIVO'}</span>
            <span className="status-path">{logPath}</span>
          </div>
        )}
      </div>

      <div className="header-right">
        {isApiMode && hosts.length > 0 && (
          <label className="host-select" title="Filtrar por host">
            <ServerIcon />
            <select
              value={selectedHost}
              onChange={e => setSelectedHost(e.target.value)}
            >
              <option value={allHostsValue}>Todos los hosts ({hosts.length})</option>
              {hosts.map(h => (
                <option key={h.host} value={h.host}>{h.host} ({h.count})</option>
              ))}
            </select>
          </label>
        )}

        {alertCount > 0 && (
          <button
            className="btn btn-ghost btn-danger"
            onClick={onClearHistory}
            title="Limpiar historial de alertas"
          >
            <TrashIcon /> Limpiar historial
          </button>
        )}

        {isApiMode ? (
          <div className="collector-settings">
            <button
              className={`btn btn-ghost${settingsOpen ? ' fb-toggle--on' : ''}`}
              onClick={() => { setUrlDraft(apiUrl); setTokenDraft(apiToken); setSettingsOpen(o => !o) }}
              title="Configurar colector"
            >
              <ServerIcon /> Colector
            </button>
            {settingsOpen && (
              <div className="collector-popover">
                <label className="cp-field">
                  <span>URL del colector</span>
                  <input
                    type="text"
                    value={urlDraft}
                    onChange={e => setUrlDraft(e.target.value)}
                    placeholder="http://192.168.56.1:8080"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </label>
                <label className="cp-field">
                  <span>Token (opcional)</span>
                  <input
                    type="password"
                    value={tokenDraft}
                    onChange={e => setTokenDraft(e.target.value)}
                    placeholder="Bearer token de la API"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </label>
                <div className="cp-actions">
                  <button className="btn btn-ghost" onClick={() => setSettingsOpen(false)}>Cancelar</button>
                  <button className="btn btn-green" onClick={saveSettings}>Conectar</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-ghost" onClick={onChangeFile}>
            <SwapIcon /> Cambiar fichero
          </button>
        )}
      </div>
    </header>
  )
}
