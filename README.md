# LogClassifier 🛡️
### Plataforma de Clasificación de Logs

> Proyecto final de la asignatura **Normativa de Ciberseguridad**  
> Autores: Jesús Martínez Montalvo · Iván Batista Herrero · Fernando Manuel Ávila Medina  
> Profesor: Carlos Basulto — Febrero 2026

---

## Descripción

Sistema inspirado en Fail2Ban que analiza logs en tiempo real, detecta patrones de ataque mediante expresiones regulares y ejecuta acciones automáticas (bloqueo de IPs, alertas).

## Arquitectura

```
logs/*.log  →  [Módulo Ingesta]  →  [Motor Reglas]  →  [Correlación Temporal]
                                                               ↓
                                                    [Módulo Respuesta]
                                                    bloquear_ip / alertar
                                                               ↓
                                                    [Módulo Alertas]
                                                    consola + alertas.log
```

## Estructura del proyecto

```
logclassifier/
├── main.py                    # Punto de entrada principal
├── config/
│   └── config.yaml            # Configuración general
├── rules/
│   ├── ssh_bruteforce.yaml    # Reglas SSH
│   └── web_attacks.yaml       # Reglas web
├── modules/
│   ├── ingesta.py             # Lectura de logs en tiempo real
│   ├── motor_reglas.py        # Motor de expresiones regulares
│   ├── correlacion.py         # Ventanas temporales / umbrales
│   ├── respuesta.py           # Acciones automáticas
│   └── alertas.py             # Notificaciones y registro
├── tests/
│   ├── simular_ataque.py      # Generador de ataques de prueba
│   └── test_motor_reglas.py   # Tests unitarios
├── logs/                      # Directorio de logs (creado automáticamente)
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

## Instalación y uso

### 1. Requisitos
- Python 3.9+
- PyYAML

```bash
pip install -r requirements.txt
```

### 2. Arrancar el sistema

```bash
python main.py
# o con config personalizada:
python main.py --config config/config.yaml
```

### 3. Simular un ataque (en otra terminal)

```bash
# Demo completa (varios tipos de ataque)
python tests/simular_ataque.py --demo

# Solo fuerza bruta SSH
python tests/simular_ataque.py --tipo ssh_bruteforce --ip 192.168.1.100

# Escaneo web
python tests/simular_ataque.py --tipo web_scan --ip 10.0.0.55
```

### 4. Ejecutar tests unitarios

```bash
python -m pytest tests/test_motor_reglas.py -v
# o sin pytest:
python tests/test_motor_reglas.py
```

### 5. Con Docker

```bash
docker-compose up --build
```

## Configuración de reglas

Las reglas se definen en ficheros YAML dentro de `rules/`. Ejemplo:

```yaml
rules:
  - id: "MI_REGLA"
    nombre: "Mi regla personalizada"
    fuente: "auth_log"          # fuente de log donde aplicar
    severidad: "ALTA"           # BAJA | MEDIA | ALTA | CRITICA
    patron: 'Failed.*from (?P<ip>\d+\.\d+\.\d+\.\d+)'
    grupo_ip: "ip"              # nombre del grupo regex con la IP
    umbral: 5                   # eventos necesarios para disparar
    ventana_segundos: 60        # ventana temporal
    accion: "bloquear_ip"       # bloquear_ip | alertar | registrar
```

## Modos de operación

| Modo         | Descripción                                           |
|--------------|-------------------------------------------------------|
| `simulacion` | Solo registra las acciones. Seguro para demos y lab.  |
| `real`       | Ejecuta `iptables` para bloqueos reales (requiere root)|

Configurar en `config/config.yaml`:
```yaml
respuesta:
  modo: "simulacion"   # cambiar a "real" en producción
```

## Alertas

Las alertas se muestran en consola con colores y se guardan en `logs/alertas.log`.

```
[2026-02-25 10:15:32] BLOQUEO | Regla: SSH_BRUTEFORCE | IP: 192.168.1.100 | Severidad: ALTA | Duración: 300s
```
