# LogClassifier Dashboard ⚡

> Aplicación de escritorio para monitorización en tiempo real de alertas generadas por [LogClassifier IDS](https://github.com/1van106/LogClassifier).

![Electron](https://img.shields.io/badge/Electron-32-47848F?style=flat-square&logo=electron&logoColor=white&labelColor=1a1a2e)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white&labelColor=1a1a2e)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=1a1a2e)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white&labelColor=1a1a2e)
![Linux](https://img.shields.io/badge/Linux-AppImage-FCC624?style=flat-square&logo=linux&logoColor=white&labelColor=1a1a2e)
![Windows](https://img.shields.io/badge/Windows-NSIS-0078D6?style=flat-square&logo=windows&logoColor=white&labelColor=1a1a2e)

---

## Características

- **Streaming en tiempo real** — lee `alertas.log` con `fs.watch` de forma incremental; solo procesa bytes nuevos
- **Feed de alertas** — tabla en vivo con tipo, regla, IP, severidad y timestamp; filas nuevas con flash de color
- **Panel de IPs bloqueadas** — agrupa hits por IP con la regla que los disparó y contador de ocurrencias
- **Estadísticas** — tarjetas de resumen con total, bloqueos, alertas y desglose por severidad
- **Vista pipeline** — representación visual del pipeline de 5 etapas del IDS
- **Ejecutable único** — sin dependencias de servidor; todo corre dentro del proceso Electron
- **Multiplataforma** — AppImage / .deb para Linux, instalador NSIS para Windows

---

## Arquitectura

```
LogClassifier IDS                LogClassifier Dashboard
+------------------+             +----------------------------+
|  alertas.log     |  fs.watch   |  Main Process (Node.js)    |
|  (generado por   | ----------> |  watchLogFile()            |
|   el IDS Python) |             |  IPC: alert:new            |
+------------------+             +----------------------------+
                                           |
                                    contextBridge
                                           |
                                 +----------------------------+
                                 |  Renderer (React + Vite)   |
                                 |  useAlerts() hook          |
                                 |  → Alert[]                 |
                                 |  → BlockedIP[]             |
                                 |  → AppStats                |
                                 +----------------------------+
```

### Flujo IPC

| Canal | Dirección | Descripción |
|---|---|---|
| `dialog:openLog` | Renderer → Main | Abre diálogo nativo para seleccionar el `.log` |
| `log:watch` | Renderer → Main | Registra un fichero para monitorización |
| `alert:new` | Main → Renderer | Envía una línea nueva del log al renderer |

---

## Formato de alertas

El dashboard espera líneas con este formato (el mismo que genera LogClassifier):

```
[2026-02-25 10:15:32] BLOQUEO | Regla: SSH_BRUTEFORCE | IP: 192.168.1.100 | Severidad: ALTA | Duracion: 300s
[2026-02-25 10:16:01] ALERTA  | Regla: PORT_SCAN      | IP: 10.0.0.55     | Severidad: MEDIA
[2026-02-25 10:16:45] REGISTRO| Regla: HTTP_FLOOD     | IP: 172.16.0.8    | Severidad: BAJA  | Duracion: 60s
```

**Tipos de alerta:** `BLOQUEO` · `ALERTA` · `REGISTRO`  
**Severidades:** `CRITICA` · `ALTA` · `MEDIA` · `BAJA`

---

## Instalación y desarrollo

**Requisitos:** Node.js 18+ · npm 9+

```bash
# Clonar el repositorio
git clone https://github.com/1van106/LogClassifier_Dashboard.git
cd LogClassifier_Dashboard

# Instalar dependencias
npm install

# Arrancar en modo desarrollo (abre la ventana Electron directamente)
npm run dev
```

---

## Empaquetado

```bash
# Linux (.AppImage + .deb)
npm run package:linux

# Windows (.exe instalador NSIS)
npm run package:win
```

Los ejecutables se generan en `dist/`.

---

## Estructura del proyecto

```
src/
├── main/
│   └── index.ts          # Proceso principal: ventana, fs.watch, IPC handlers
├── preload/
│   └── index.ts          # contextBridge → expone API segura al renderer
└── renderer/src/
    ├── types.ts           # Alert, BlockedIP, AppStats, parseAlert()
    ├── hooks/
    │   └── useAlerts.ts   # Estado reactivo: alertas, IPs, stats
    └── components/
        ├── Dashboard.tsx  # Layout principal
        ├── AlertFeed.tsx  # Tabla de alertas en streaming
        ├── BlockedIPs.tsx # Panel de IPs bloqueadas con hits
        ├── Stats.tsx      # Tarjetas de estadísticas
        ├── Pipeline.tsx   # Vista del pipeline IDS
        ├── Header.tsx     # Cabecera con estado de conexión
        ├── Welcome.tsx    # Pantalla inicial (sin log cargado)
        └── Icons.tsx      # SVGs: ShieldIcon, SwapIcon, ArrowIcon
```

---

## Stack tecnológico

| Herramienta | Versión | Uso |
|---|---|---|
| Electron | 32 | Runtime de escritorio |
| React | 18 | UI declarativa |
| TypeScript | 5 | Tipado estático |
| electron-vite | 2 | Build tool + HMR |
| electron-builder | 25 | Empaquetado multiplataforma |

---

*Master en Ciberseguridad · EUSA · 2026*
