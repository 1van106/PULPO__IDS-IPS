<p align="center">
  <img src="dashboard/build/icon.svg" width="160" alt="PULPO icon" />
</p>

<p align="center">
  <img src="dashboard/docs/pulpo_title.svg" width="520" alt="PULPO" />
</p>

<p align="center"><b>IDS / IPS · Detección y prevención de intrusiones multihost</b></p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/Electron-32-47848F?style=flat-square&logo=electron&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=1a1a2e" />
</p>

---

> [!NOTE]
> **PULPO** es una solución **IDS/IPS** completa con arquitectura multihost. Combina un **motor de detección** en Python —que analiza logs en streaming, aplica reglas, correlaciona eventos y responde bloqueando IPs— con un **panel de escritorio** en Electron que visualiza alertas, IPs bloqueadas y estadísticas en tiempo real. Incluye reenvío persistente agente→colector (sin pérdida de alertas) y enriquecimiento con threat intelligence.

---

![Dashboard PULPO](dashboard/docs/dashboard.png)

---

## Estructura del repositorio

| Carpeta | Qué es |
|---|---|
| **[`engine/`](engine/)** | **Motor de detección (Python).** Pipeline de 5 etapas (ingesta → reglas → correlación → respuesta → alertas), reglas YAML, API REST + WebSocket, reenvío persistente agente→colector y enriquecimiento con AbuseIPDB / VirusTotal / GeoIP. → [README del motor](engine/README.md) |
| **[`dashboard/`](dashboard/)** | **Panel de control (Electron + React + TypeScript).** Feed de alertas en vivo con bandera de país y riesgo, IPs bloqueadas, gráficos de análisis, exportación CSV y selector de host. → [README del dashboard](dashboard/README.md) |

---

## Arquitectura multihost

```
   victima1 (agente)  ─┐
   victima2 (agente)  ─┼─►   colector (192.168.56.50)   ─►   Dashboard PULPO
   ...                ─┘      API REST + BD + sensor
```

Los **agentes** ejecutan el motor y reenvían sus alertas al **colector** central, que además es sensor y aloja el dashboard (modelo *appliance*). Si el colector se cae, las alertas se guardan localmente y se reenvían automáticamente al recuperarse — **no se pierde ninguna**.

---

## Threat intelligence

Cada alerta se enriquece con la IP de origen: **país** (GeoIP), reputación de **AbuseIPDB** y detecciones de **VirusTotal**, mostradas en el panel como columna de riesgo.

---

*PULPO · Proyecto de ciberseguridad de Iván Batista · 2026*
