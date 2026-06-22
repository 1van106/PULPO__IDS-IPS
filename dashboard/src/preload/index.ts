import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openLogDialog: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openLog'),

  watchLog: (path: string): Promise<string> =>
    ipcRenderer.invoke('log:watch', path),

  onAlert: (cb: (line: string) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, line: string): void => cb(line)
    ipcRenderer.on('alert:new', handler)
    return () => ipcRenderer.removeListener('alert:new', handler)
  },

  getAutoPath: (): Promise<string | null> =>
    ipcRenderer.invoke('log:getAutoPath'),

  getPersistedAlerts: (): Promise<string[]> =>
    ipcRenderer.invoke('db:getAlerts'),

  clearAlerts: (): Promise<void> =>
    ipcRenderer.invoke('db:clear')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (e) {
    console.error(e)
  }
} else {
  // @ts-ignore (fallback for non-isolated context)
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
