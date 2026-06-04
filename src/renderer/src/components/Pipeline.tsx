import { Alert } from '../types'
import { ArrowIcon } from './Icons'

const STAGES = [
  { id: 'ingesta',     num: '01', label: 'Ingesta',       desc: 'Lectura y parseo del log en streaming' },
  { id: 'motor',       num: '02', label: 'Motor Reglas',  desc: 'Match contra firmas activas' },
  { id: 'correlacion', num: '03', label: 'Correlación',   desc: 'Agrupación por IP, sesión y ventana' },
  { id: 'respuesta',   num: '04', label: 'Respuesta',     desc: 'Bloqueo automático y mitigación' },
  { id: 'alertas',     num: '05', label: 'Alertas',       desc: 'Notificación y registro de incidentes' },
] as const

type StageId = typeof STAGES[number]['id']

function getActiveStage(alert: Alert | undefined): StageId {
  if (!alert) return 'ingesta'
  return alert.tipo === 'BLOQUEO' ? 'respuesta' : 'alertas'
}

interface PipelineProps {
  lastAlert: Alert | undefined
}

export default function Pipeline({ lastAlert }: PipelineProps) {
  const active = getActiveStage(lastAlert)

  return (
    <section>
      <div className="sec-head">
        <h2>Pipeline de detección</h2>
        <div className="line" />
      </div>
      <div className="pipeline-stages">
        {STAGES.map((stage, i) => (
          <div key={stage.id} className="pipeline-item">
            <div className={`pipeline-stage${active === stage.id ? ' pipeline-stage--active' : ''}`}>
              <div className="stage-top">
                <span className="stage-num">{stage.num}</span>
                <span className="stage-label">{stage.label}</span>
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <div className="pipeline-arrow"><ArrowIcon /></div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
