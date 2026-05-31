interface HeaderProps {
  logPath: string | null
  isMonitoring: boolean
  onChangeFile: () => void
}

export default function Header({ logPath, isMonitoring, onChangeFile }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-icon">🛡️</span>
        <div className="header-titles">
          <h1 className="header-title">LogClassifier</h1>
          <span className="header-sub">IDS Dashboard</span>
        </div>
      </div>
      <div className="header-center">
        {logPath && (
          <div className="monitor-status">
            <span className={`status-dot ${isMonitoring ? 'status-dot--active' : ''}`} />
            <span className="status-label">{isMonitoring ? 'MONITORIZANDO' : 'INACTIVO'}</span>
            <code className="status-path">{logPath}</code>
          </div>
        )}
      </div>
      <div className="header-right">
        <button className="btn-secondary" onClick={onChangeFile}>
          Cambiar fichero
        </button>
      </div>
    </header>
  )
}
