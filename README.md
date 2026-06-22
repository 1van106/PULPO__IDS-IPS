<p align="center">
  <img src="dashboard/build/icon.svg" width="150" alt="PULPO" />
</p>

<p align="center">
  <img src="dashboard/docs/pulpo_title.svg" width="500" alt="PULPO" />
</p>

<p align="center"><b>Sistema de Detección y Prevención de Intrusiones · IDS / IPS</b></p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/SQLAlchemy-D71F00?style=flat-square&logo=sqlalchemy&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/Electron-32-47848F?style=flat-square&logo=electron&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=1a1a2e" />
</p>

---

> [!NOTE]
> **PULPO** es un IDS/IPS completo de arquitectura distribuida. Un **motor de detección** en Python analiza logs en streaming, los clasifica mediante un pipeline de reglas, correlaciona eventos para identificar patrones de ataque y responde automáticamente bloqueando direcciones IP. Un **panel de control** de escritorio en Electron visualiza toda la actividad en tiempo real. El despliegue es **multihost**: varios sensores reenvían sus alertas —sin pérdida— a un colector central que unifica el análisis y la visualización.

---

![Dashboard PULPO](dashboard/docs/dashboard.png)

---

## Componentes

| Módulo | Descripción |
|---|---|
| **[`engine/`](engine/)** — Motor de detección | Pipeline de análisis, reglas, correlación, respuesta y API REST. Es el componente que se despliega en cada sensor. → [Documentación](engine/README.md) |
| **[`dashboard/`](dashboard/)** — Panel de control | Aplicación de escritorio que visualiza alertas, IPs bloqueadas y métricas en tiempo real. → [Documentación](dashboard/README.md) |

---

## Capacidades

| | |
|---|---|
| **Pipeline de 5 etapas** | Ingesta → motor de reglas → correlación → respuesta → alertas, encadenadas mediante *callbacks* |
| **Detección por reglas** | Reglas declarativas en YAML (fuerza bruta SSH, inyección SQL, XSS, path traversal, command injection, escaneo web, abuso de métodos HTTP…), cada una con su umbral y ventana temporal |
| **Correlación temporal** | Agrupa eventos por IP dentro de una ventana configurable para detectar patrones (p. ej. *N* fallos en *M* segundos) antes de disparar |
| **Respuesta automática (IPS)** | Bloqueo de IPs vía `iptables` en modo real o simulación, lista blanca con soporte **CIDR** y desbloqueo automático por tiempo |
| **Arquitectura multihost** | Los sensores reenvían sus alertas a un colector central mediante API autenticada con *Bearer token*; cada alerta se etiqueta con su host de origen |
| **Reenvío sin pérdida** | Cola persistente: si el colector no está disponible, las alertas se almacenan localmente y se reenvían en orden al recuperarse — **no se pierde ninguna** |
| **Threat intelligence** | Enriquecimiento de cada IP con país (GeoIP), reputación de **AbuseIPDB** y detecciones de **VirusTotal**, con caché para respetar los *rate limits* |
| **Notificaciones** | Avisos por **Slack**, **Telegram** y **correo** según umbral de severidad |
| **Retención configurable** | Purga periódica de alertas antiguas según política de retención |
| **API REST + WebSocket** | API (FastAPI) para consultar alertas, hosts y estadísticas, y *stream* de alertas en vivo |
| **Persistencia** | Almacenamiento en SQLite con migración automática de esquema |

---

## Arquitectura

```
        Sensores / Agentes                          Nodo colector
  ┌───────────────────────────┐           ┌───────────────────────────────┐
  │  Motor de detección       │   POST    │  API REST  ( /api/ingest )    │
  │  ingesta → reglas →       │ ────────► │  Base de datos central        │
  │  correlación → respuesta  │  (Bearer) │  Sensor local · retención     │
  │  → alertas                │           │                               │
  └───────────────────────────┘           └───────────────┬───────────────┘
         (uno por host)                                    │
                                                           ▼
                                            ┌───────────────────────────────┐
                                            │  Panel de control PULPO       │
                                            │  (Electron · tiempo real)     │
                                            └───────────────────────────────┘
```

Cada **agente** ejecuta el motor de detección y reenvía sus alertas al **colector**, que centraliza el almacenamiento, actúa también como sensor y sirve el panel de control. Los agentes se identifican por *hostname*, lo que permite filtrar y agregar la actividad por origen.

---

## Formato de alertas

```
[2026-02-25 10:15:32] BLOQUEO | Regla: SSH_BRUTEFORCE    | IP: 203.0.113.10  | Severidad: ALTA  | Duración: 300s
[2026-02-25 10:16:01] ALERTA  | Regla: XSS_ATTEMPT       | IP: 198.51.100.5  | Severidad: ALTA
[2026-02-25 10:16:45] REGISTRO| Regla: HTTP_METHOD_ABUSE | IP: 192.0.2.8     | Severidad: MEDIA
```

**Tipos:** `BLOQUEO` · `ALERTA` · `REGISTRO`  &nbsp;|&nbsp;  **Severidades:** `CRITICA` · `ALTA` · `MEDIA` · `BAJA`

---

## Stack tecnológico

| Componente | Tecnologías |
|---|---|
| **Motor** | Python · FastAPI · SQLAlchemy · SQLite · PyYAML · Requests |
| **Dashboard** | Electron · React · TypeScript · Vite · Recharts |

---

## Puesta en marcha

**Motor de detección** (en cada sensor):

```bash
cd engine
pip install -r requirements.txt
python main.py --config config/config.yaml
```

**Panel de control:**

```bash
cd dashboard
npm install
npm run dev             # desarrollo (abre la ventana Electron)
npm run package:linux   # empaqueta AppImage / .deb
```

> El comportamiento del motor —reglas, modo de respuesta, multihost, threat intelligence, notificaciones y retención— se configura en [`engine/config/config.yaml`](engine/config/config.yaml). Las claves de API y credenciales se cargan por variables de entorno, nunca se versionan.

---

<p align="center"><i>PULPO · Proyecto de ciberseguridad de Iván Batista · 2026</i></p>
