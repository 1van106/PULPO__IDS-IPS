import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openLogDialog: () => Promise<string | null>
      watchLog: (path: string) => Promise<string>
      onAlert: (cb: (line: string) => void) => () => void
    }
  }
}
