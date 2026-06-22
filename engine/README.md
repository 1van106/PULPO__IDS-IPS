<div align="center">

# 🛡️ PULPO · Motor de detección
### IDS/IPS multihost basado en reglas

![Python](https://img.shields.io/badge/Python_3.13-3776AB?style=for-the-badge&logo=python&logoColor=white&labelColor=1a1a2e)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white&labelColor=1a1a2e)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white&labelColor=1a1a2e)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white&labelColor=1a1a2e)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white&labelColor=1a1a2e)

</div>

---

## Descripción

**Motor de detección de PULPO.** Analiza ficheros de log en tiempo real, clasifica eventos mediante reglas declarativas en YAML, correlaciona por IP dentro de ventanas temporales y ejecuta respuestas automáticas (bloqueo vía **iptables**). Persiste las alertas en **SQLite**, las expone por una **API REST + WebSocket**, las enriquece con **threat intelligence** y, en modo agente, las reenvía —**sin pérdida**— a un colector central. Es el componente que se despliega en cada sensor del despliegue multihost.

> Este motor es el backend del panel de control [`../dashboard`](../dashboard); el dashboard consume su API y/o su `logs/alertas.log`.

---

## Pipeline de detección

```
  logs/*.log
      │
      ▼
  [1] Ingesta          ──►  lectura en tiempo real (poll configurable)
      │
      ▼
  [2] Motor de Reglas  ──►  regex compiladas desde los YAML de rules/
      │  match + IP extraída
      ▼
  [3] Correlación      ──►  ventana deslizante por (regla, IP) · thread-safe
      │  umbral superado
      ▼
  [4] Respuesta        ──►  bloquear_ip (iptables) | alertar | registrar
      │
      ▼
  [5] Alertas          ──►  enriquece (threat intel) · persiste (SQLite)
                            · emite (consola + WebSocket) · reenvía al
                            colector (agente) · notifica (Slack/Telegram/email)
```

---

## Módulos

| Módulo | Fichero | Descripción |
|---|---|---|
| ![](https://img.shields.io/badge/Ingesta-1a3a5e?style=flat-square&labelColor=1a1a2e) | `modules/ingesta.py` | Lee múltiples logs en tiempo real con polling |
| ![](https://img.shields.io/badge/Motor_Reglas-3a1a5e?style=flat-square&labelColor=1a1a2e) | `modules/motor_reglas.py` | Compila regex de los YAML y genera eventos en cada match |
| ![](https://img.shields.io/badge/Correlacion-1a4a3e?style=flat-square&labelColor=1a1a2e) | `modules/correlacion.py` | Ventana deslizante por (regla, IP) con hilo de limpieza |
| ![](https://img.shields.io/badge/Respuesta-5e2a1a?style=flat-square&labelColor=1a1a2e) | `modules/respuesta.py` | Bloqueo iptables (real/simulación), whitelist con CIDR, auto-desbloqueo |
| ![](https://img.shields.io/badge/Alertas-3a3a1a?style=flat-square&labelColor=1a1a2e) | `modules/alertas.py` | Punto de inyección: enriquece, persiste, emite, reenvía y notifica |
| ![](https://img.shields.io/badge/Forwarder-2e1a5e?style=flat-square&labelColor=1a1a2e) | `modules/forwarder.py` | Modo agente: reenvío **persistente sin pérdida** al colector |
| ![](https://img.shields.io/badge/Enriquecimiento-1a5e4a?style=flat-square&labelColor=1a1a2e) | `modules/enriquecimiento.py` | Threat intel por IP: GeoIP, AbuseIPDB, VirusTotal (con caché) |
| ![](https://img.shields.io/badge/Notificaciones-5e1a3a?style=flat-square&labelColor=1a1a2e) | `modules/notificaciones.py` | Avisos por Slack / Telegram / email según umbral |
| ![](https://img.shields.io/badge/Retencion-3a3a3a?style=flat-square&labelColor=1a1a2e) | `modules/retencion.py` | Purga periódica de alertas antiguas |
| ![](https://img.shields.io/badge/API-1a3a5e?style=flat-square&labelColor=1a1a2e) | `api.py` | API REST + WebSocket (FastAPI) |
| ![](https://img.shields.io/badge/Persistencia-2a2a5e?style=flat-square&labelColor=1a1a2e) | `database.py` | Modelo SQLite (SQLAlchemy) con migración automática de esquema |

---

## Reglas incluidas

![](https://img.shields.io/badge/auth__log-ssh__bruteforce.yaml-8b2e35?style=flat-square&labelColor=1a1a2e)
![](https://img.shields.io/badge/syslog-web__attacks.yaml-2e5a8b?style=flat-square&labelColor=1a1a2e)

**14 reglas** repartidas en dos ficheros (5 SSH · 9 web):

| ID | Fuente | Umbral | Ventana | Acción | Severidad |
|---|---|---|---|---|---|
| `SSH_BRUTEFORCE` | auth_log | 5 | 60 s | `bloquear_ip` | ![](https://img.shields.io/badge/ALTA-8b2e35?style=flat-square) |
| `SSH_INVALID_USER` | auth_log | 3 | 60 s | `bloquear_ip` | ![](https://img.shields.io/badge/MEDIA-8b6a2e?style=flat-square) |
| `SSH_ROOT_LOGIN` | auth_log | 2 | 60 s | `bloquear_ip` | ![](https://img.shields.io/badge/ALTA-8b2e35?style=flat-square) |
| `SSH_PENALTY` | auth_log | 5 | 60 s | `bloquear_ip` | ![](https://img.shields.io/badge/ALTA-8b2e35?style=flat-square) |
| `SSH_RAPID_DISCO` | auth_log | 6 | 30 s | `alertar` | ![](https://img.shields.io/badge/BAJA-2a7d4f?style=flat-square) |
| `WEB_SCAN` | syslog | 10 | 30 s | `alertar` | ![](https://img.shields.io/badge/MEDIA-8b6a2e?style=flat-square) |
| `WEB_AUTH_FAIL` | syslog | 5 | 60 s | `bloquear_ip` | ![](https://img.shields.io/badge/MEDIA-8b6a2e?style=flat-square) |
| `SQL_INJECTION` | syslog | 2 | 60 s | `bloquear_ip` | ![](https://img.shields.io/badge/CRITICA-6b1f2a?style=flat-square) |
| `XSS_ATTEMPT` | syslog | 2 | 60 s | `bloquear_ip` | ![](https://img.shields.io/badge/ALTA-8b2e35?style=flat-square) |
| `PATH_TRAVERSAL` | syslog | 2 | 30 s | `bloquear_ip` | ![](https://img.shields.io/badge/ALTA-8b2e35?style=flat-square) |
| `CMD_INJECTION` | syslog | 1 | 60 s | `bloquear_ip` | ![](https://img.shields.io/badge/CRITICA-6b1f2a?style=flat-square) |
| `SENSITIVE_FILE` | syslog | 1 | 60 s | `alertar` | ![](https://img.shields.io/badge/ALTA-8b2e35?style=flat-square) |
| `SCANNER_UA` | syslog | 1 | 60 s | `alertar` | ![](https://img.shields.io/badge/MEDIA-8b6a2e?style=flat-square) |
| `HTTP_FLOOD` | syslog | 30 | 10 s | `bloquear_ip` | ![](https://img.shields.io/badge/ALTA-8b2e35?style=flat-square) |

> El motor carga todos los `.yaml` de `rules/` al arrancar. Añadir una regla es solo crear un YAML, sin tocar código (ver más abajo).

---

## 🌐 Arquitectura multihost (modo agente)

Con `collector.enabled: true`, el motor actúa de **agente**: además de detectar en local, reenvía cada alerta al colector central.

```
  Agente (sensor)                          Colector
  ┌─────────────────┐   POST /api/ingest   ┌─────────────────────┐
  │ detección local │ ───────────────────► │ API REST            │
  │ + cola local    │   Authorization:     │ BD central + sensor │
  │   (SQLite)      │   Bearer <token>     │ + dashboard         │
  └─────────────────┘                      └─────────────────────┘
```

- **Reenvío sin pérdida**: cada alerta nace marcada como pendiente; solo se marca entregada cuando el colector la acepta. Si el colector está caído, las pendientes se acumulan en la SQLite local y se reenvían en orden al recuperarse — **no se pierde ninguna**.
- Cada alerta se etiqueta con su `host` de origen; el colector permite filtrar y agregar por host (`/api/hosts`).
- El colector se identifica como `collector.enabled: false` y es a la vez sensor.

---

## 🌍 Threat intelligence

Cada IP de origen se enriquece (best-effort, no bloquea el pipeline) con:

| Fuente | Dato | Clave |
|---|---|---|
| **GeoIP** (ip-api.com) | País de origen | sin clave |
| **AbuseIPDB** | Score de reputación (0–100) | `ABUSEIPDB_KEY` |
| **VirusTotal** | Nº de motores que la marcan maliciosa | `VIRUSTOTAL_KEY` |

Las IPs privadas se omiten y los resultados se cachean (TTL configurable) para respetar los *rate limits*. Las claves se cargan por **variable de entorno**, nunca se versionan.

---

## 🔔 Notificaciones

Avisos automáticos cuando una alerta alcanza el umbral de severidad configurado (`notificaciones.umbral_severidad`):

![](https://img.shields.io/badge/Slack-4A154B?style=flat-square&logo=slack&logoColor=white)
![](https://img.shields.io/badge/Telegram-26A5E4?style=flat-square&logo=telegram&logoColor=white)
![](https://img.shields.io/badge/Email_SMTP-EA4335?style=flat-square&logo=gmail&logoColor=white)

Secretos (webhooks, tokens, contraseña SMTP) por variable de entorno. Best-effort: un canal caído no frena el pipeline.

---

## 🔌 API REST + WebSocket

FastAPI en `:8080` (configurable). Documentación interactiva en `/docs`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del servicio |
| `GET` | `/api/alerts` | Lista de alertas (filtro `?host=`) |
| `POST` | `/api/ingest` | Recepción de alertas de agentes · **requiere Bearer token** |
| `GET` | `/api/hosts` | Hosts reportando, con conteos (selector del dashboard) |
| `GET` | `/api/stats` | Estadísticas agregadas |
| `POST` | `/api/alerts/{id}/acknowledge` | Marcar una alerta como reconocida |
| `DELETE` | `/api/alerts` | Purga de alertas |
| `WS` | `/ws` | Stream de alertas en tiempo real |

> Autenticación opcional vía `PULPO_API_TOKEN` (o `api.token` en el config). Si se define, los endpoints de escritura exigen `Authorization: Bearer <token>`.

---

## Instalación y uso

```bash
cd engine
pip install -r requirements.txt
python main.py --config config/config.yaml
```

Simular ataques (laboratorio):

```bash
python tests/simular_ataque.py --demo
python tests/simular_ataque.py --tipo ssh_bruteforce --ip 203.0.113.10
```

Tests:

```bash
python -m pytest -v
```

Con Docker:

```bash
docker-compose up --build
```

---

## Configuración

Todo el comportamiento se controla por secciones en `config/config.yaml`:

| Sección | Controla |
|---|---|
| `general` | Nivel de log, intervalo de poll, hostname |
| `collector` | Modo agente: URL/token del colector, reenvío persistente |
| `ingesta` | Fuentes de log a monitorizar |
| `motor_reglas` | Directorio de reglas |
| `correlacion` | Ventana temporal y limpieza |
| `respuesta` | Modo (simulación/real), duración de bloqueo, whitelist (CIDR) |
| `api` | Host, puerto y token de la API |
| `retencion` | Días de retención y periodicidad de purga |
| `enriquecimiento` | Threat intel (claves por entorno) |
| `notificaciones` | Canales y umbral de severidad (secretos por entorno) |

### Modos de respuesta

| Modo | Comportamiento | Requiere |
|---|---|---|
| ![](https://img.shields.io/badge/simulacion-2a9d8f?style=flat-square) | Registra las acciones sin ejecutarlas. Seguro para demos. | — |
| ![](https://img.shields.io/badge/real-8b2e35?style=flat-square) | Ejecuta `iptables` para bloqueos reales. | root |

---

## Añadir una nueva regla

Sin tocar código: basta crear un `.yaml` en `rules/`.

```yaml
rules:
  - id: "MI_REGLA"
    nombre: "Descripción de la regla"
    fuente: "auth_log"
    severidad: "ALTA"            # BAJA · MEDIA · ALTA · CRITICA
    patron: 'Failed.*from (?P<ip>\d+\.\d+\.\d+\.\d+) port'
    grupo_ip: "ip"
    umbral: 5
    ventana_segundos: 60
    accion: "bloquear_ip"        # bloquear_ip · alertar · registrar
```

---

<sub>Origen: el motor nació como proyecto académico **LogClassifier** (Jesús Martínez Montalvo · Iván Batista Herrero · Fernando Manuel Ávila Medina) y evolucionó hasta el motor multihost de PULPO.</sub>
