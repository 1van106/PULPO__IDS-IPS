import { Alert } from '../types'

const STAGES = [
  { id: 'ingesta',     label: 'Ingesta',       desc: 'Lectura logs en RT' },
  { id: 'motor',       label: 'Motor Reglas',  desc: 'Regex + YAML' },
  { id: 'correlacion', label: 'Correlación',   desc: 'Ventana temporal' },
  { id: 'respuesta',   label: 'Respuesta',     desc: 'Bloquear / Alertar' },
  { id: 'alertas',     label: 'Alertas',       desc: 'Registro + consola' },
] as const

type StageId = typeof STAGES[number]['id']

function getActiveStage(alert: Alert | undefined): StageId {
  if (!alert) return 'ingesta'
  if (alert.tipo === 'BLOQUEO') return 'respuesta'
  return 'alertas'
}

interface PipelineProps {
  lastAlert: Alert | undefined
}

export default function Pipeline({ lastAlert }: PipelineProps) {
  const active = getActiveStage(lastAlert)

  return (
    <section className="pipeline">
      <h2 className="section-title">Pipeline de Detección</h2>
      <div className="pipeline-stages">
        {STAGES.map((stage, i) => (
          <div key={stage.id} className="pipeline-item">
            <div className={`pipeline-stage ${active === stage.id ? 'pipeline-stage--active' : ''}`}>
              <span className="stage-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="stage-label">{stage.label}</span>
              <span className="stage-desc">{stage.desc}</span>
            </div>
            {i < STAGES.length - 1 && (
              <span className="pipeline-arrow">›</span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
