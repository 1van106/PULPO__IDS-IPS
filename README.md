# PULPO — IDS/IPS

Monorepo de **PULPO**, una herramienta de detección y prevención de intrusiones
(Intrusion Detection & Prevention System) con arquitectura multihost.

## Estructura

| Carpeta | Qué es |
|---|---|
| **[`engine/`](engine/)** | Motor de detección en **Python**. Pipeline de 5 etapas (ingesta → reglas → correlación → respuesta → alertas), API REST + WebSocket, reglas YAML, reenvío persistente agente→colector (multihost) y enriquecimiento con threat intel (AbuseIPDB/VirusTotal/GeoIP). |
| **[`dashboard/`](dashboard/)** | Panel de control de escritorio en **Electron + React + TypeScript**. Visualiza alertas, IPs bloqueadas, estadísticas y el estado del pipeline en tiempo real, con selector de host. |

La web comercial (`PULPO_WEB`) se mantiene en un repositorio aparte porque tiene
su propio ciclo de despliegue (Cloudflare Pages).

## Despliegue rápido

- **Motor** (en cada nodo del lab): ver [`engine/README.md`](engine/README.md).
- **Dashboard** (en el colector): `cd dashboard && npm install && npx electron-builder --linux AppImage`.
