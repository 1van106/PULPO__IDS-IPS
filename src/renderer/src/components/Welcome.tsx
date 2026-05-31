interface WelcomeProps {
  onOpen: () => void
}

export default function Welcome({ onOpen }: WelcomeProps) {
  return (
    <div className="welcome">
      <div className="welcome-content">
        <div className="welcome-icon">🛡️</div>
        <h1 className="welcome-title">LogClassifier Dashboard</h1>
        <p className="welcome-subtitle">Monitorización IDS en tiempo real</p>
        <button className="btn-primary" onClick={onOpen}>
          Seleccionar alertas.log
        </button>
        <span className="welcome-hint">
          Apunta al fichero <code>logs/alertas.log</code> generado por LogClassifier
        </span>
      </div>
    </div>
  )
}
