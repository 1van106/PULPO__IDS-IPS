<div align="center">

# LogClassifier 🛡️
### Sistema IDS basado en reglas

![Python](https://img.shields.io/badge/Python_3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white&labelColor=1a1a2e)
![PyYAML](https://img.shields.io/badge/PyYAML-cc8800?style=for-the-badge&labelColor=1a1a2e)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white&labelColor=1a1a2e)
![pytest](https://img.shields.io/badge/pytest-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white&labelColor=1a1a2e)
![Estado](https://img.shields.io/badge/Estado-ENTREGADO-2a9d8f?style=for-the-badge&labelColor=1a1a2e)

*Normativa de Ciberseguridad · Master EUSA · Febrero 2026*

</div>

---

## Descripcion

**LogClassifier** es un sistema de deteccion de intrusiones (**IDS**) basado en reglas, inspirado en Fail2Ban. Analiza ficheros de log en tiempo real, clasifica eventos mediante expresiones regulares definidas en YAML y ejecuta respuestas automaticas cuando se supera el umbral configurado: desde bloqueos via **iptables** hasta registros en fichero.

> Autores: Jesús Martínez Montalvo · Iván Batista Herrero · Fernando Manuel Ávila Medina
> Profesor: Carlos Basulto

---

## Pipeline de deteccion

```
  logs/*.log
      |
      v
  [1] Ingesta          ->  lectura en tiempo real (poll cada 1s)
      |
      v
  [2] Motor de Reglas  ->  regex compiladas desde ficheros YAML
      |  match + IP extraida
      v
  [3] Correlacion      ->  ventana deslizante por (regla, IP) · thread-safe
      |  umbral superado
      v
  [4] Respuesta        ->  bloquear_ip (iptables) | alertar | registrar
      |
      v
  [5] Alertas          ->  consola en color + logs/alertas.log
```

---

## Modulos

| Modulo | Fichero | Descripcion |
|---|---|---|
| ![](https://img.shields.io/badge/Ingesta-1a3a5e?style=flat-square&labelColor=1a1a2e) | `modules/ingesta.py` | Lee logs en tiempo real con polling por segundo |
| ![](https://img.shields.io/badge/Motor_Reglas-3a1a5e?style=flat-square&labelColor=1a1a2e) | `modules/motor_reglas.py` | Compila regex de los YAML y genera eventos en cada match |
| ![](https://img.shields.io/badge/Correlacion-1a4a3e?style=flat-square&labelColor=1a1a2e) | `modules/correlacion.py` | Ventana deslizante por (regla, IP) con hilo de limpieza |
| ![](https://img.shields.io/badge/Respuesta-5e2a1a?style=flat-square&labelColor=1a1a2e) | `modules/respuesta.py` | Ejecuta la accion: iptables (modo real) o simulacion |
| ![](https://img.shields.io/badge/Alertas-3a3a1a?style=flat-square&labelColor=1a1a2e) | `modules/alertas.py` | Emite alertas a consola y guarda en `logs/alertas.log` |

---

## Reglas incluidas

![](https://img.shields.io/badge/SSH-ssh__bruteforce.yaml-8b2e35?style=flat-square&labelColor=1a1a2e)
![](https://img.shields.io/badge/WEB-web__attacks.yaml-2e5a8b?style=flat-square&labelColor=1a1a2e)

| ID | Nombre | Umbral | Ventana | Accion | Severidad |
|---|---|---|---|---|---|
| `SSH_BRUTEFORCE` | Fuerza bruta SSH | 5 intentos | 60 s | `bloquear_ip` | ![](https://img.shields.io/badge/ALTA-8b2e35?style=flat-square) |
| `SSH_INVALID_USER` | Usuario invalido SSH | 3 intentos | 60 s | `bloquear_ip` | ![](https://img.shields.io/badge/MEDIA-8b6a2e?style=flat-square) |
| `SSH_ROOT_LOGIN` | Login como root | 2 intentos | 60 s | `bloquear_ip` | ![](https://img.shields.io/badge/ALTA-8b2e35?style=flat-square) |
| `WEB_SCAN` | Escaneo web (404s) | 10 peticiones | 30 s | `alertar` | ![](https://img.shields.io/badge/MEDIA-8b6a2e?style=flat-square) |
| `WEB_AUTH_FAIL` | Fallo auth web | 5 fallos | 60 s | `bloquear_ip` | ![](https://img.shields.io/badge/MEDIA-8b6a2e?style=flat-square) |

---

## Estructura del proyecto

```
LogClassifier/
+-- main.py                    <- orquestador: instancia y conecta los 5 modulos
+-- config/
|   +-- config.yaml            <- configuracion general del sistema
+-- rules/
|   +-- ssh_bruteforce.yaml    <- reglas de deteccion SSH
|   +-- web_attacks.yaml       <- reglas de deteccion web
+-- modules/
|   +-- ingesta.py             <- lectura de logs en tiempo real
|   +-- motor_reglas.py        <- motor de expresiones regulares
|   +-- correlacion.py         <- ventanas temporales y umbrales
|   +-- respuesta.py           <- acciones automaticas
|   +-- alertas.py             <- notificaciones y registro
+-- tests/
|   +-- simular_ataque.py      <- generador de ataques para pruebas
|   +-- test_motor_reglas.py   <- tests unitarios del motor
+-- Dockerfile
+-- docker-compose.yml
+-- requirements.txt
```

---

## Instalacion y uso

![](https://img.shields.io/badge/01-Instalar_dependencias-1a3a5e?style=flat-square&labelColor=1a1a2e)

```bash
pip install -r requirements.txt
```

![](https://img.shields.io/badge/02-Arrancar_el_sistema-1a4a3e?style=flat-square&labelColor=1a1a2e)

```bash
python main.py
# con config personalizada:
python main.py --config config/config.yaml
```

![](https://img.shields.io/badge/03-Simular_un_ataque-5e2a1a?style=flat-square&labelColor=1a1a2e)

```bash
# Demo completa
python tests/simular_ataque.py --demo

# Fuerza bruta SSH desde una IP concreta
python tests/simular_ataque.py --tipo ssh_bruteforce --ip 192.168.1.100

# Escaneo web
python tests/simular_ataque.py --tipo web_scan --ip 10.0.0.55
```

![](https://img.shields.io/badge/04-Tests_unitarios-3a3a1a?style=flat-square&labelColor=1a1a2e)

```bash
python -m pytest tests/test_motor_reglas.py -v
```

![](https://img.shields.io/badge/05-Con_Docker-2496ED?style=flat-square&labelColor=1a1a2e&logo=docker&logoColor=white)

```bash
docker-compose up --build
```

---

## Modos de operacion

| Modo | Comportamiento | Requiere |
|---|---|---|
| ![](https://img.shields.io/badge/simulacion-2a9d8f?style=flat-square) | Registra las acciones sin ejecutarlas. Seguro para demos y laboratorio. | — |
| ![](https://img.shields.io/badge/real-8b2e35?style=flat-square) | Ejecuta `iptables` para bloqueos reales. | root |

```yaml
# config/config.yaml
respuesta:
  modo: "simulacion"   # cambiar a "real" en produccion
  bloqueo_duracion_segundos: 300
  whitelist_ips:
    - "127.0.0.1"
    - "192.168.1.1"
```

---

## Formato de alerta

```
[2026-02-25 10:15:32] BLOQUEO | Regla: SSH_BRUTEFORCE | IP: 192.168.1.100 | Severidad: ALTA  | Duracion: 300s
[2026-02-25 10:16:01] ALERTA  | Regla: WEB_SCAN       | IP: 10.0.0.55     | Severidad: MEDIA
[2026-02-25 10:18:44] BLOQUEO | Regla: SSH_ROOT_LOGIN | IP: 45.33.32.156  | Severidad: ALTA  | Duracion: 300s
```

---

## Anadir una nueva regla

No es necesario tocar el codigo. Solo crear un `.yaml` en `rules/`:

```yaml
rules:
  - id: "MI_REGLA"
    nombre: "Descripcion de la regla"
    fuente: "auth_log"
    severidad: "ALTA"
    patron: 'Failed.*from (?P<ip>\d+\.\d+\.\d+\.\d+) port'
    grupo_ip: "ip"
    umbral: 5
    ventana_segundos: 60
    accion: "bloquear_ip"
```

El sistema carga todos los `.yaml` de `rules/` automaticamente al arrancar.

---

## Funcionalidades

![](https://img.shields.io/badge/Deteccion-Regex_compiladas_sobre_cada_linea-3a1a5e?style=flat-square&labelColor=1a1a2e)
![](https://img.shields.io/badge/Deteccion-Multiples_fuentes_de_log-3a1a5e?style=flat-square&labelColor=1a1a2e)
![](https://img.shields.io/badge/Deteccion-Extraccion_de_IP_por_grupo_regex-3a1a5e?style=flat-square&labelColor=1a1a2e)

![](https://img.shields.io/badge/Correlacion-Ventana_deslizante_por_(regla,IP)-1a4a3e?style=flat-square&labelColor=1a1a2e)
![](https://img.shields.io/badge/Correlacion-Thread--safe_con_lock-1a4a3e?style=flat-square&labelColor=1a1a2e)
![](https://img.shields.io/badge/Correlacion-Limpieza_periodica_de_contadores-1a4a3e?style=flat-square&labelColor=1a1a2e)

![](https://img.shields.io/badge/Respuesta-Bloqueo_via_iptables-5e2a1a?style=flat-square&labelColor=1a1a2e)
![](https://img.shields.io/badge/Respuesta-Whitelist_de_IPs-5e2a1a?style=flat-square&labelColor=1a1a2e)
![](https://img.shields.io/badge/Respuesta-Modo_simulacion_seguro-5e2a1a?style=flat-square&labelColor=1a1a2e)

![](https://img.shields.io/badge/Config-Reglas_en_YAML_sin_tocar_codigo-3a3a1a?style=flat-square&labelColor=1a1a2e)
![](https://img.shields.io/badge/Config-Severidad_BAJA_MEDIA_ALTA_CRITICA-3a3a1a?style=flat-square&labelColor=1a1a2e)
![](https://img.shields.io/badge/Config-Soporte_Docker-3a3a1a?style=flat-square&labelColor=1a1a2e)
