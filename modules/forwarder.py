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

    def _bucle(self):
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        while self._ejecutando:
            alert_dict = self._queue.get()
            if alert_dict is None:
                break
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
            except requests.RequestException as e:
                logger.warning(f"[Forwarder] No se pudo reenviar al colector: {e}")

    def detener(self):
        self._ejecutando = False
        self._queue.put(None)
