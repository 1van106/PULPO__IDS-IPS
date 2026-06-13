"""
modules/alertas.py
------------------
Módulo de Alertas y Registro.
Recibe mensajes de alerta y los distribuye a:
  - Consola (stdout)
  - Fichero de log de alertas
"""

import logging
import os
from datetime import datetime

from database import AlertRecord, SessionLocal, alert_to_dict, init_db, parse_raw
from shared import alert_queue

logger = logging.getLogger("logclassifier.alertas")

# Colores ANSI para consola
COLORES = {
    "CRITICA": "\033[1;31m",   # Rojo brillante
    "ALTA":    "\033[0;31m",   # Rojo
    "MEDIA":   "\033[0;33m",   # Amarillo
    "BAJA":    "\033[0;32m",   # Verde
    "RESET":   "\033[0m",
}


class ModuloAlertas:

    def __init__(self, config: dict, hostname: str = "local", forwarder=None,
                 enricher=None, notificador=None):
        """
        config:      sección 'alertas' del config.yaml
        hostname:    nombre de este host (se etiqueta en cada alerta)
        forwarder:   Forwarder opcional para reenviar al colector central
        enricher:    Enriquecedor opcional (threat intel) para anotar la IP
        notificador: Notificador opcional (Slack/Telegram/email) por umbral
        """
        self.log_file = config.get("log_file", "logs/alertas.log")
        self.consola = config.get("consola", True)
        self.hostname = hostname
        self.forwarder = forwarder
        self.enricher = enricher
        self.notificador = notificador
        self._asegurar_directorio()
        init_db()

    def _asegurar_directorio(self):
        directorio = os.path.dirname(self.log_file)
        if directorio:
            os.makedirs(directorio, exist_ok=True)

    def emitir(self, mensaje: str):
        """Envía el mensaje a consola, fichero, BD y cola WebSocket."""
        if self.consola:
            color = COLORES["RESET"]
            for nivel, cod in COLORES.items():
                if nivel in mensaje:
                    color = cod
                    break
            print(f"{color}{mensaje}{COLORES['RESET']}")

        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(mensaje + "\n")
        except Exception as e:
            logger.error(f"[Alertas] No se pudo escribir en {self.log_file}: {e}")

        parsed = parse_raw(mensaje)
        if parsed:
            try:
                # Threat intel: anotar la IP origen (best-effort, no bloquea si falla)
                extra = {}
                if self.enricher and parsed.get("ip"):
                    try:
                        extra = self.enricher.enriquecer(parsed["ip"])
                    except Exception as e:
                        logger.warning(f"[Alertas] Enriquecimiento falló: {e}")

                db = SessionLocal()
                record = AlertRecord(**parsed, raw=mensaje, host=self.hostname, **extra)
                db.add(record)
                db.commit()
                db.refresh(record)
                payload = alert_to_dict(record)
                db.close()
                alert_queue.put(payload)
                if self.forwarder:
                    self.forwarder.enqueue(payload)
                if self.notificador:
                    self.notificador.notificar(payload)
            except Exception as e:
                logger.error(f"[Alertas] Error guardando en BD: {e}")

    def resumen(self, ips_bloqueadas: list):
        """Imprime un resumen del estado actual del sistema."""
        linea = "=" * 60
        print(f"\n{linea}")
        print(f"  ESTADO DEL SISTEMA - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(linea)
        print(f"  IPs bloqueadas actualmente: {len(ips_bloqueadas)}")
        for ip in ips_bloqueadas:
            print(f"    - {ip}")
        print(linea + "\n")
