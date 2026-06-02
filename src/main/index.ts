import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import * as fs from 'fs'
import { loadAlerts, tryAppendAlert, clearAlerts } from './store'

let mainWindow: BrowserWindow | null = null
let fileWatcher: fs.FSWatcher | null = null
let lastSize = 0

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow!.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function watchLogFile(filePath: string): void {
  if (fileWatcher) {
    fileWatcher.close()
    fileWatcher = null
  }

  // Load existing content — only send lines not already in DB
  try {
    const stat = fs.statSync(filePath)
    lastSize = stat.size
    const content = fs.readFileSync(filePath, 'utf-8')
    content.split('\n')
      .filter(l => l.trim())
      .forEach(line => {
        if (tryAppendAlert(line)) {
          mainWindow?.webContents.send('alert:new', line)
        }
      })
  } catch {
    lastSize = 0
  }

  // Watch for new lines
  fileWatcher = fs.watch(filePath, () => {
    try {
      const stat = fs.statSync(filePath)
      if (stat.size < lastSize) { lastSize = 0 }
      if (stat.size === lastSize) return
      const stream = fs.createReadStream(filePath, { start: lastSize, end: stat.size - 1 })
      let data = ''
      stream.on('data', chunk => (data += chunk))
      stream.on('end', () => {
        data.split('\n')
          .filter(l => l.trim())
          .forEach(line => {
            if (tryAppendAlert(line)) {
              mainWindow?.webContents.send('alert:new', line)
            }
          })
        lastSize = stat.size
      })
    } catch (e) {
      console.error('[watcher]', e)
    }
  })
}

const DEFAULT_LOG_PATHS = [
  '/opt/LogClassifier/alertas.log',
  '/var/log/ids/alertas.log',
  '/tmp/alertas.log'
]

function findDefaultLog(): string | null {
  for (const p of DEFAULT_LOG_PATHS) {
    if (fs.existsSync(p)) return p
  }
  return null
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('dev.ivanbatista.logclassifier-dashboard')

  // Pre-populate seenRaws so file re-reads after restart don't duplicate alerts
  loadAlerts()

  ipcMain.handle('dialog:openLog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow!, {
      title: 'Seleccionar alertas.log',
      filters: [{ name: 'Log files', extensions: ['log', 'txt', '*'] }],
      properties: ['openFile']
    })
    if (!canceled && filePaths[0]) {
      watchLogFile(filePaths[0])
      return filePaths[0]
    }
    return null
  })

  ipcMain.handle('log:watch', (_, filePath: string) => {
    watchLogFile(filePath)
    return filePath
  })

  ipcMain.handle('log:getAutoPath', () => findDefaultLog())

  ipcMain.handle('db:getAlerts', () => loadAlerts())

  ipcMain.handle('db:clear', () => {
    clearAlerts()
    return true
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
