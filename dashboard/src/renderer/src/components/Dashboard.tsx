import { Alert, AppStats, BlockedIP, HostInfo } from '../types'
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
  hosts: HostInfo[]
  selectedHost: string
  setSelectedHost: (h: string) => void
  allHostsValue: string
  apiUrl: string
  setApiUrl: (url: string) => void
  apiToken: string
  setApiToken: (token: string) => void
}

export default function Dashboard({
  alerts, logPath, isMonitoring, blockedIPs, stats,
  openFile, clearHistory, acknowledgeAlert, isApiMode,
  hosts, selectedHost, setSelectedHost, allHostsValue,
  apiUrl, setApiUrl, apiToken, setApiToken
}: DashboardProps) {
  const freshId = alerts.length > 0 ? alerts[0].id : null
  // Mostrar columna Host solo si hay más de un host reportando (multihost real)
  const showHost = isApiMode && hosts.length > 1

  return (
    <div className="dashboard">
      <Header
        logPath={logPath}
        isMonitoring={isMonitoring}
        onChangeFile={openFile}
        onClearHistory={clearHistory}
        alertCount={alerts.length}
        isApiMode={isApiMode}
        hosts={hosts}
        selectedHost={selectedHost}
        setSelectedHost={setSelectedHost}
        allHostsValue={allHostsValue}
        apiUrl={apiUrl}
        setApiUrl={setApiUrl}
        apiToken={apiToken}
        setApiToken={setApiToken}
      />
      <div className="dashboard-body">
        <Pipeline lastAlert={alerts[0]} />
        <Stats stats={stats} />
        <Charts alerts={alerts} />
        <div className="dashboard-main">
          <AlertFeed
            alerts={alerts}
            freshId={freshId}
            showHost={showHost}
            onAcknowledge={isApiMode ? acknowledgeAlert : undefined}
          />
          <BlockedIPs ips={blockedIPs} />
        </div>
      </div>
    </div>
  )
}
