import { Alert, AppStats } from '../types'
import Header from './Header'
import Pipeline from './Pipeline'
import Stats from './Stats'
import AlertFeed from './AlertFeed'
import BlockedIPs from './BlockedIPs'

interface DashboardProps {
  alerts: Alert[]
  logPath: string | null
  isMonitoring: boolean
  blockedIPs: string[]
  stats: AppStats
  openFile: () => void
}

export default function Dashboard({
  alerts, logPath, isMonitoring, blockedIPs, stats, openFile
}: DashboardProps) {
  return (
    <div className="dashboard">
      <Header logPath={logPath} isMonitoring={isMonitoring} onChangeFile={openFile} />
      <div className="dashboard-body">
        <Pipeline lastAlert={alerts[0]} />
        <Stats stats={stats} />
        <div className="dashboard-main">
          <AlertFeed alerts={alerts} />
          <BlockedIPs ips={blockedIPs} />
        </div>
      </div>
    </div>
  )
}
