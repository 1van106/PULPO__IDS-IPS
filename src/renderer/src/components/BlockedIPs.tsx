import { BlockedIP } from '../types'
import { ShieldIcon } from './Icons'

interface BlockedIPsProps {
  ips: BlockedIP[]
}

export default function BlockedIPs({ ips }: BlockedIPsProps) {
  return (
    <div className="panel blocked-ips">
      <div className="panel-head">
        <h3>IPs bloqueadas</h3>
        <span className="panel-count">{ips.length}</span>
      </div>
      {ips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-ring"><ShieldIcon size={22} /></div>
          <h4>Sin bloqueos activos</h4>
          <p>Las direcciones bloqueadas por el motor aparecerán aquí en tiempo real.</p>
        </div>
      ) : (
        <div className="ip-list">
          {ips.map(entry => (
            <div key={entry.ip} className="ip-row">
              <span
                className="pulse-dot"
                style={{
                  background: 'var(--red)',
                  ['--ring-color' as string]: 'rgba(248,81,73,0.6)'
                }}
              />
              <span className="ip-addr">{entry.ip}</span>
              <div className="ip-meta">
                <span className="ip-rule">{entry.rule}</span>
                <span className="ip-hits">{entry.hits} hit{entry.hits > 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
