"""
modules/forwarder.py
--------------------
Reenviador PERSISTENTE de alertas hacia el colector central (modo agente).

Cada alerta se guarda primero en la SQLite local (lo hace ModuloAlertas) con
`forwarded=False`. Este forwarder corre en su propio thread y —despertado por
`enqueue()` o cada `replay_interval` segundos— drena de la BD las alertas
pendientes y hace `POST {collector.url}/api/ingest` con `Authorization: Bearer
<token>`, en orden cronológico. Las entregadas se marcan `forwarded=True`.

Si el colector está caído, las alertas se acumulan como pendientes y se
reenvían automáticamente en cuanto vuelve: no se pierde ninguna. No bloquea el
pipeline del IDS (corre aparte y es best-effort).
"""

import logging
import queue
import threading

import requests

from database import init_db, marcar_reenviadas, pendientes_reenvio

logger = logging.getLogger("logclassifier.forwarder")


class Forwarder:

    def __init__(self, config: dict):
        """config: sección 'collector' del config.yaml"""
        self.url = config.get("url", "").rstrip("/")
        self.token = config.get("token", "")
        self.timeout = config.get("timeout", 3)
        # Cada cuánto se reintenta el reenvío de pendientes si el colector falló.
        self.replay_interval = config.get("replay_interval", 30)
        # Máx. de alertas reenviadas por ciclo (evita ráfagas tras una caída larga).
        self.batch = config.get("batch", 200)
        # Cola usada solo como "señal de despertar"; los datos van por la BD.
        self._wake: "queue.Queue" = queue.Queue()
        self._ejecutando = False
        self._thread: threading.Thread | None = None

    def iniciar(self):
        if self._ejecutando:
            return
        # Garantiza que la tabla/columna existan antes del primer drenado
        # (el forwarder arranca antes que ModuloAlertas en main.py).
        init_db()
        self._ejecutando = True
        self._thread = threading.Thread(
            target=self._bucle, daemon=True, name="pulpo-forwarder"
        )
        self._thread.start()
        logger.info(f"[Forwarder] Reenvío persistente activo → {self.url}/api/ingest")

    def enqueue(self, alert_dict: dict = None):
        """Despierta el reenviador. La alerta ya está persistida en la BD local,
        así que aquí solo señalizamos (el contenido del dict se ignora)."""
        self._wake.put(True)

    # ------------------------------------------------------------------

    def _headers(self) -> dict:
        h = {"Content-Type": "application/json"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    def _intentar_envio(self, alert_dict: dict, headers: dict) -> bool:
        """Un POST. Devuelve True si el colector lo aceptó (<400)."""
        try:
            resp = requests.post(
                f"{self.url}/api/ingest",
                json=alert_dict,
                headers=headers,
                timeout=self.timeout,
            )
            if resp.status_code >= 400:
                logger.warning(
                    f"[Forwarder] Colector respondió {resp.status_code}: {resp.text[:200]}"
                )
                return False
            return True
        except requests.RequestException as e:
            logger.warning(f"[Forwarder] No se pudo reenviar al colector: {e}")
            return False

    def _drenar_pendientes(self):
        """Reenvía las alertas locales no entregadas, en orden. Si una falla
        (colector caído), aborta el ciclo y deja el resto pendiente: se
        reintentará al despertar de nuevo o al cumplirse replay_interval."""
        headers = self._headers()
        try:
            pendientes = pendientes_reenvio(limit=self.batch)
        except Exception as e:
            logger.error(f"[Forwarder] No se pudieron leer pendientes de la BD: {e}")
            return

        enviadas = []
        for alerta in pendientes:
            if not self._ejecutando:
                break
            if self._intentar_envio(alerta, headers):
                enviadas.append(alerta["id"])
            else:
                break  # colector no disponible: el resto queda pendiente

        if enviadas:
            try:
                marcar_reenviadas(enviadas)
                logger.info(f"[Forwarder] {len(enviadas)} alerta(s) reenviada(s) al colector.")
            except Exception as e:
                logger.error(f"[Forwarder] No se pudieron marcar como reenviadas: {e}")

    def _bucle(self):
        # Al arrancar, drenar lo que quedara pendiente de ejecuciones anteriores
        # (p. ej. alertas generadas mientras el colector/este agente estaban caídos).
        self._drenar_pendientes()
        while self._ejecutando:
            try:
                self._wake.get(timeout=self.replay_interval)
                # Vaciar señales extra acumuladas: un solo drenado las cubre todas.
                try:
                    while True:
                        self._wake.get_nowait()
                except queue.Empty:
                    pass
            except queue.Empty:
                pass  # timeout → reintento periódico de pendientes
            if not self._ejecutando:
                break
            self._drenar_pendientes()

    def detener(self):
        self._ejecutando = False
        self._wake.put(True)
