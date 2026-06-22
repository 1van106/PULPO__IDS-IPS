"""
modules/retencion.py
--------------------
Política de retención de datos: purga periódica de alertas antiguas de la
base de datos según `retencion.dias`. Corre en un thread daemon, sin bloquear
el pipeline. Cubre la promesa de la web (90 días Pro / 7 días Community) y
evita que la SQLite crezca sin límite.
"""

import logging
import threading
import time

from database import init_db, purgar_antiguas

logger = logging.getLogger("logclassifier.retencion")


class Retencion:

    def __init__(self, config: dict):
        """
        config: sección 'retencion' del config.yaml
        """
        self.dias = config.get("dias", 90)
        self.intervalo_horas = config.get("intervalo_horas", 24)
        self._ejecutando = False
        self._thread: threading.Thread | None = None

    def iniciar(self):
        if self._ejecutando:
            return
        if self.dias <= 0:
            logger.info("[Retencion] dias<=0: retención desactivada (no se purga nada).")
            return
        self._ejecutando = True
        self._thread = threading.Thread(
            target=self._bucle, daemon=True, name="pulpo-retencion"
        )
        self._thread.start()
        logger.info(
            f"[Retencion] Activa: purga de alertas con más de {self.dias} días "
            f"cada {self.intervalo_horas}h."
        )

    def _bucle(self):
        init_db()  # asegurar que la tabla existe antes de purgar
        intervalo_seg = max(self.intervalo_horas * 3600, 60)
        while self._ejecutando:
            try:
                n = purgar_antiguas(self.dias)
                if n:
                    logger.info(
                        f"[Retencion] {n} alertas con más de {self.dias} días purgadas."
                    )
            except Exception as e:
                logger.error(f"[Retencion] Error durante la purga: {e}")
            time.sleep(intervalo_seg)

    def detener(self):
        self._ejecutando = False
