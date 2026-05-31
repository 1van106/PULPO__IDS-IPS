import { ShieldIcon } from './Icons'

interface WelcomeProps {
  onOpen: () => void
}

export default function Welcome({ onOpen }: WelcomeProps) {
  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-shield">
          <ShieldIcon size={46} />
        </div>
        <h1 className="welcome-title">LogClassifier</h1>
        <p className="welcome-sub">IDS Dashboard</p>
        <p className="welcome-desc">
          Clasificación y correlación de eventos de seguridad en tiempo real.
          Selecciona un fichero de log para iniciar la monitorización.
        </p>
        <button className="btn btn-green" style={{ fontSize: '14px', padding: '12px 22px' }} onClick={onOpen}>
          <ShieldIcon size={16} /> Seleccionar alertas.log
        </button>
        <div className="welcome-hint">
          ruta esperada <code>/var/log/ids/alertas.log</code>
        </div>
      </div>
      <div className="welcome-foot">
        LogClassifier v1.0.0 · motor de reglas activo · electron build
      </div>
    </div>
  )
}
