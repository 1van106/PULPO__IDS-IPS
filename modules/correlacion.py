"""
modules/correlacion.py
----------------------
Motor de Correlación Temporal.
Cuenta eventos por (regla_id, ip) dentro de una ventana temporal
y dispara una alerta cuando se supera el umbral configurado.
"""

import time
import threading
import logging
from collections import defaultdict
from typing import Callable

from modules.motor_reglas import Evento

logger = logging.getLogger("logclassifier.correlacion")


class MotorCorrelacion:
    """
    Mantiene contadores deslizantes por (regla_id, ip).
    Cuando el contador supera el umbral definido en la regla,
    llama a callback_disparo(evento).
    """

    def __init__(self, config: dict, callback_disparo: Callable):
        """
        config: sección 'correlacion' del config.yaml
        callback_disparo: función(Evento) llamada cuando se supera el umbral
        """
        self.cleanup_interval = config.get("cleanup_interval", 120)
        self.callback_disparo = callback_disparo

        # Estructura: { (regla_id, ip): [ timestamp1, timestamp2, ... ] }
        self._contadores: dict = defaultdict(list)
        self._lock = threading.Lock()

        # Ventana máxima observada entre todas las reglas procesadas.
        # La limpieza periódica usa este horizonte para no podar eventos
        # que todavía caen dentro de la ventana de alguna regla.
        self._max_ventana = 0

        # IPs ya bloqueadas/alertadas para evitar disparos repetitivos
        # Se limpia automáticamente junto con los contadores viejos
        self._disparadas: set = set()

        # Hilo de limpieza periódica
        self._hilo_limpieza = threading.Thread(target=self._limpiar_periodicamente, daemon=True)
        self._hilo_limpieza.start()

    def procesar_evento(self, evento: Evento):
        """Registra el evento y comprueba si se supera el umbral."""
        if evento.ip is None:
            # Sin IP no podemos correlacionar; disparar directamente si umbral=1
            if evento.umbral <= 1:
                self.callback_disparo(evento)
            return

        clave = (evento.regla_id, evento.ip)
        ahora = time.time()

        with self._lock:
            # Añadir timestamp actual
            self._contadores[clave].append(ahora)

            # Filtrar solo los timestamps dentro de la ventana
            ventana = evento.ventana_segundos
            if ventana > self._max_ventana:
                self._max_ventana = ventana
            recientes = [t for t in self._contadores[clave] if ahora - t <= ventana]
            self._contadores[clave] = recientes

            cantidad = len(recientes)
            logger.debug(f"[Correlacion] {clave} -> {cantidad}/{evento.umbral} en {ventana}s")

            # Comprobar umbral y que no se haya disparado ya
            if cantidad >= evento.umbral and clave not in self._disparadas:
                self._disparadas.add(clave)
                logger.info(
                    f"[Correlacion] UMBRAL SUPERADO [{evento.regla_id}] "
                    f"IP={evento.ip} ({cantidad} eventos en {ventana}s)"
                )
                self.callback_disparo(evento)

    def resetear_ip(self, regla_id: str, ip: str):
        """Permite volver a disparar una regla para una IP (ej: tras expirar bloqueo)."""
        clave = (regla_id, ip)
        with self._lock:
            self._disparadas.discard(clave)
            self._contadores.pop(clave, None)

    def _limpiar_periodicamente(self):
        """Elimina contadores de eventos antiguos para liberar memoria."""
        while True:
            time.sleep(self.cleanup_interval)
            ahora = time.time()
            with self._lock:
                # Horizonte = ventana máxima de cualquier regla vista (mín. 300s
                # por seguridad si aún no se ha procesado ningún evento).
                horizonte = max(self._max_ventana, 300)
                claves_a_eliminar = []
                for clave, timestamps in self._contadores.items():
                    recientes = [t for t in timestamps if ahora - t <= horizonte]
                    if recientes:
                        self._contadores[clave] = recientes
                    else:
                        claves_a_eliminar.append(clave)

                for clave in claves_a_eliminar:
                    del self._contadores[clave]
                    self._disparadas.discard(clave)

            logger.debug(f"[Correlacion] Limpieza completada. Claves activas: {len(self._contadores)}")
