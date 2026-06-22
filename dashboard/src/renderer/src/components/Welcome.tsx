import { OctopusIcon } from './Icons'

interface WelcomeProps {
  onOpen: () => void
}

export default function Welcome({ onOpen }: WelcomeProps) {
  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-shield">
          <OctopusIcon size={58} />
        </div>
        <h1 className="welcome-title">PULPO</h1>
        <p className="welcome-sub">IDS Monitor</p>
        <p className="welcome-desc">
          Clasificación y correlación de eventos de seguridad en tiempo real.
          Selecciona un fichero de log para iniciar la monitorización.
        </p>
        <button className="btn btn-green" style={{ fontSize: '14px', padding: '12px 22px' }} onClick={onOpen}>
          <OctopusIcon size={16} /> Seleccionar alertas.log
        </button>
        <div className="welcome-hint">
          ruta esperada <code>/opt/LogClassifier/alertas.log</code>
        </div>
      </div>
      <div className="welcome-foot">
        PULPO v1.0.0 · IDS Monitor · electron build
      </div>
    </div>
  )
}
