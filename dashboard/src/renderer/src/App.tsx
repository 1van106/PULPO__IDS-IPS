import { useAlerts } from './hooks/useAlerts'
import Welcome from './components/Welcome'
import Dashboard from './components/Dashboard'

export default function App() {
  const alertsData = useAlerts()
  return (alertsData.logPath || alertsData.alerts.length > 0)
    ? <Dashboard {...alertsData} />
    : <Welcome onOpen={alertsData.openFile} />
}
