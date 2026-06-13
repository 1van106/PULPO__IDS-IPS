"""
modules/forwarder.py
--------------------
Reenviador best-effort de alertas hacia el colector central (modo agente).

Corre en un thread propio que drena una cola interna y hace
`POST {collector.url}/api/ingest` con `Authorization: Bearer <token>`.
No bloquea el pipeline del IDS: si el colector no responde, loggea un
warning y descarta el envío (la alerta sigue guardada en la SQLite local
como respaldo).
"""

import logging
import queue
import threading
import time

import requests

logger = logging.getLogger("logclassifier.forwarder")


class Forwarder:

    def __init__(self, config: dict):
        """
        config: sección 'collector' del config.yaml
        """
        self.url = config.get("url", "").rstrip("/")
        self.token = config.get("token", "")
        self.timeout = config.get("timeout", 3)
        # Reintentos con backoff exponencial si el colector no responde.
        self.reintentos = config.get("reintentos", 3)
        self.backoff_base = config.get("backoff_base", 2)  # segundos
        self._queue: "queue.Queue[dict]" = queue.Queue()
        self._ejecutando = False
        self._thread: threading.Thread | None = None

    def iniciar(self):
        if self._ejecutando:
            return
        self._ejecutando = True
        self._thread = threading.Thread(
            target=self._bucle, daemon=True, name="pulpo-forwarder"
        )
        self._thread.start()
        logger.info(f"[Forwarder] Reenvío activo → {self.url}/api/ingest")

    def enqueue(self, alert_dict: dict):
        """Encola una alerta para reenviarla (no bloquea)."""
        self._queue.put(alert_dict)

    def _intentar_envio(self, alert_dict: dict, headers: dict) -> bool:
        """Un único intento de POST. Devuelve True si se entregó (2xx/3xx)."""
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

    def _bucle(self):
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        while self._ejecutando:
            alert_dict = self._queue.get()
            if alert_dict is None:
                break

            entregado = False
            for intento in range(1, self.reintentos + 1):
                if self._intentar_envio(alert_dict, headers):
                    entregado = True
                    break
                if intento < self.reintentos and self._ejecutando:
                    # Backoff exponencial: base, base*2, base*4, ...
                    espera = self.backoff_base * (2 ** (intento - 1))
                    logger.debug(
                        f"[Forwarder] Reintento {intento}/{self.reintentos} en {espera}s"
                    )
                    time.sleep(espera)

            if not entregado:
                logger.error(
                    f"[Forwarder] Alerta descartada del reenvío tras {self.reintentos} "
                    f"intentos. Queda guardada en la SQLite local como respaldo."
                )

    def detener(self):
        self._ejecutando = False
        self._queue.put(None)
