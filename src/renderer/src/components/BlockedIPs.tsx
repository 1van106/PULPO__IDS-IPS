interface BlockedIPsProps {
  ips: string[]
}

export default function BlockedIPs({ ips }: BlockedIPsProps) {
  return (
    <section className="blocked-ips">
      <h2 className="section-title">
        IPs Bloqueadas
        <span className="badge badge--red">{ips.length}</span>
      </h2>
      <div className="ip-list">
        {ips.length === 0 ? (
          <div className="empty-state">Sin bloqueos activos</div>
        ) : (
          ips.map(ip => (
            <div key={ip} className="ip-item">
              <span className="ip-indicator" />
              <code className="ip-address">{ip}</code>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
