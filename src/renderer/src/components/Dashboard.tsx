import { Alert, AppStats, BlockedIP } from '../types'
import Header from './Header'
import Pipeline from './Pipeline'
import Stats from './Stats'
import Charts from './Charts'
import AlertFeed from './AlertFeed'
import BlockedIPs from './BlockedIPs'

interface DashboardProps {
  alerts: Alert[]
  logPath: string | null
  isMonitoring: boolean
  blockedIPs: BlockedIP[]
  stats: AppStats
  openFile: () => void
  clearHistory: () => void
  acknowledgeAlert: (id: string | number) => Promise<void>
  isApiMode: boolean
}

export default function Dashboard({
  alerts, logPath, isMonitoring, blockedIPs, stats,
  openFile, clearHistory, acknowledgeAlert, isApiMode
}: DashboardProps) {
  const freshId = alerts.length > 0 ? alerts[0].id : null

  return (
    <div className="dashboard">
      <Header
        logPath={logPath}
        isMonitoring={isMonitoring}
        onChangeFile={openFile}
        onClearHistory={clearHistory}
        alertCount={alerts.length}
      />
      <div className="dashboard-body">
        <Pipeline lastAlert={alerts[0]} />
        <Stats stats={stats} />
        <Charts alerts={alerts} />
        <div className="dashboard-main">
          <AlertFeed
            alerts={alerts}
            freshId={freshId}
            onAcknowledge={isApiMode ? acknowledgeAlert : undefined}
          />
          <BlockedIPs ips={blockedIPs} />
        </div>
      </div>
    </div>
  )
}
