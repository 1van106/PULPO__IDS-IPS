import { ShieldIcon, SwapIcon, TrashIcon } from './Icons'

interface HeaderProps {
  logPath: string | null
  isMonitoring: boolean
  onChangeFile: () => void
  onClearHistory: () => void
  alertCount: number
}

export default function Header({ logPath, isMonitoring, onChangeFile, onClearHistory, alertCount }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="hdr-mark">
          <ShieldIcon size={18} />
        </div>
        <div className="header-titles">
          <span className="header-title">LogClassifier</span>
          <span className="header-sub">IDS Dashboard</span>
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
        {alertCount > 0 && (
          <button
            className="btn btn-ghost btn-danger"
            onClick={onClearHistory}
            title="Limpiar historial de alertas"
          >
            <TrashIcon /> Limpiar historial
          </button>
        )}
        <button className="btn btn-ghost" onClick={onChangeFile}>
          <SwapIcon /> Cambiar fichero
        </button>
      </div>
    </header>
  )
}
