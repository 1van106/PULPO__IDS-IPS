<p align="center">
  <img src="build/icon.svg" width="160" alt="PULPO icon" />
</p>

<p align="center">
  <img src="docs/pulpo_title.svg" width="520" alt="PULPO" />
</p>

<p align="center"><b>IDS / IPS Monitor</b></p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-32-47848F?style=flat-square&logo=electron&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/Linux-AppImage-FCC624?style=flat-square&logo=linux&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/Windows-NSIS-0078D6?style=flat-square&logo=windows&logoColor=white&labelColor=1a1a2e" />
</p>

---

> [!NOTE]
> **PULPO** es una aplicación de escritorio IDS/IPS desarrollada de forma independiente, inspirada conceptualmente en [LogClassifier](https://github.com/1van106/LogClassifier). Incorpora su propio pipeline de detección, procesamiento de logs en streaming, clasificación de alertas por tipo y severidad, persistencia de historial entre sesiones y visualización de la actividad mediante gráficos de análisis — todo dentro de un ejecutable único sin dependencias de servidor.

---

![Dashboard screenshot](docs/dashboard.png)

---

## Características

| | |
|---|---|
| **Streaming en tiempo real** | Lee `alertas.log` con `fs.watch` de forma incremental; solo procesa bytes nuevos |
| **Auto-carga al iniciar** | Detecta la ruta del log automáticamente sin intervención del usuario |
| **Persistencia de historial** | Las alertas se guardan en disco (`alerts.ndjson`); el historial se recupera entre sesiones sin que el IDS esté corriendo |
| **Panel de análisis** | Timeline de los últimos 30 min, gráfico de distribución por severidad y top de reglas disparadas |
| **Feed de alertas** | Tabla en vivo con tipo, regla, IP, severidad y timestamp; filas nuevas con flash de color |
| **Exportar a CSV** | Descarga todas las alertas visibles como `.csv` con un clic |
| **Panel de IPs bloqueadas** | Agrupa hits por IP con la regla que los disparó y contador de ocurrencias |
| **Estadísticas** | Tarjetas de resumen con total, bloqueos, alertas y desglose por severidad |
| **Vista pipeline** | Representación visual del pipeline de 5 etapas del IDS |
| **Ejecutable único** | Sin dependencias de servidor; todo corre dentro del proceso Electron |
| **Multiplataforma** | AppImage / `.deb` para Linux · instalador NSIS para Windows |

---

## Arquitectura

```
Pipeline IDS (Python)            PULPO Dashboard
+------------------+             +------------------------------+
|  alertas.log     |  fs.watch   |  Main Process (Node.js)      |
|  (generado por   | ----------> |  watchLogFile()              |
|   el módulo IDS) |             |  tryAppendAlert() → store    |
+------------------+             |  IPC: alert:new              |
                                 +------------------------------+
                                             |
                                      contextBridge
                                             |
                                 +------------------------------+
                                 |  Renderer (React + Vite)     |
                                 |  useAlerts() hook            |
                                 |  → Alert[]       (streaming) |
                                 |  → BlockedIP[]   (derivado)  |
                                 |  → AppStats      (derivado)  |
                                 |  → chartData     (derivado)  |
                                 +------------------------------+
                                             |
                                 +------------------------------+
                                 |  Persistencia (Main)         |
                                 |  alerts.ndjson               |
                                 |  (userData de Electron)      |
                                 +------------------------------+
```

### Flujo IPC

| Canal | Dirección | Descripción |
|---|---|---|
| `dialog:openLog` | Renderer → Main | Abre diálogo nativo para seleccionar el `.log` |
| `log:watch` | Renderer → Main | Registra un fichero para monitorización |
| `log:getAutoPath` | Renderer → Main | Detecta la ruta del log automáticamente |
| `alert:new` | Main → Renderer | Envía una línea nueva del log al renderer |
| `db:getAlerts` | Renderer → Main | Carga el historial completo desde disco |
| `db:clear` | Renderer → Main | Borra el historial de alertas |

---

## Formato de alertas

> [!TIP]
> PULPO procesa líneas con el siguiente formato:

```
[2026-02-25 10:15:32] BLOQUEO | Regla: SSH_BRUTEFORCE    | IP: 192.168.1.100 | Severidad: ALTA  | Duración: 300s
[2026-02-25 10:16:01] ALERTA  | Regla: XSS_ATTEMPT       | IP: 10.0.0.55     | Severidad: ALTA
[2026-02-25 10:16:45] REGISTRO| Regla: HTTP_METHOD_ABUSE | IP: 172.16.0.8    | Severidad: MEDIA
```

**Tipos:** `BLOQUEO` · `ALERTA` · `REGISTRO` &nbsp;&nbsp;|&nbsp;&nbsp; **Severidades:** `CRITICA` · `ALTA` · `MEDIA` · `BAJA`

---

## Instalación y desarrollo

> [!IMPORTANT]
> **Requisitos:** Node.js 18+ · npm 9+

```bash
git clone https://github.com/1van106/PULPO__IDS-IPS.git
cd PULPO__IDS-IPS
npm install
npm run dev        # abre la ventana Electron directamente
```

### Empaquetado

```bash
npm run package:linux   # AppImage + .deb  —  ejecutar en Linux
npm run package:win     # instalador NSIS para Windows
```

> Los ejecutables se generan en `dist/`

---

<details>
<summary><b>Estructura del proyecto</b></summary>
<br>

```
src/
├── main/
│   ├── index.ts          # Proceso principal: ventana, fs.watch, IPC handlers
│   └── store.ts          # Persistencia NDJSON: loadAlerts, tryAppendAlert, clearAlerts
├── preload/
│   ├── index.ts          # contextBridge → expone API segura al renderer
│   └── index.d.ts        # Tipos globales de window.api
└── renderer/src/
    ├── types.ts           # Alert, BlockedIP, AppStats, parseAlert()
    ├── hooks/
    │   └── useAlerts.ts   # Estado reactivo: alertas, IPs, stats, clearHistory
    └── components/
        ├── Dashboard.tsx  # Layout principal
        ├── Charts.tsx     # Timeline, donut de severidad, top reglas
        ├── AlertFeed.tsx  # Tabla de alertas en streaming + exportar CSV
        ├── BlockedIPs.tsx # Panel de IPs bloqueadas con hits
        ├── Stats.tsx      # Tarjetas de estadísticas
        ├── Pipeline.tsx   # Vista del pipeline IDS
        ├── Header.tsx     # Cabecera con estado, limpiar historial
        ├── Welcome.tsx    # Pantalla inicial (sin log cargado)
        └── Icons.tsx      # SVGs inline
```

</details>

---

## Stack tecnológico

| Herramienta | Versión | Uso |
|---|---|---|
| <img src="https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white" /> | 32 | Runtime de escritorio |
| <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" /> | 18 | UI declarativa |
| <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" /> | 5 | Tipado estático |
| <img src="https://img.shields.io/badge/Recharts-22b5bf?style=flat-square&logo=chartdotjs&logoColor=white" /> | 2 | Gráficos SVG (timeline, donut, barras) |
| <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" /> | 2 | Build tool + HMR |
| <img src="https://img.shields.io/badge/electron--builder-47848F?style=flat-square&logo=electron&logoColor=white" /> | 25 | Empaquetado multiplataforma |

---

*PULPO · Proyecto personal · Inspirado en el concepto de [LogClassifier IDS](https://github.com/1van106/LogClassifier) · 2026*
