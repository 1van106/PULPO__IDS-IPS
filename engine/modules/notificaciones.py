"""
modules/notificaciones.py
-------------------------
Notificaciones de alertas a canales externos (cubre la promesa de la web):
  - Slack    (webhook entrante)
  - Telegram (bot sendMessage)
  - Email    (SMTP)

Se dispara solo cuando la severidad de la alerta alcanza el umbral configurado
(`notificaciones.umbral_severidad`). Corre en un thread daemon con cola, igual
que el forwarder: best-effort, un canal caído no frena el pipeline.

Los secretos (webhook, bot token, contraseña SMTP) se leen del config.yaml o,
si están vacíos, de variables de entorno, para no commitearlos.
"""

import logging
import os
import queue
import smtplib
import threading
from email.mime.text import MIMEText

import requests

logger = logging.getLogger("logclassifier.notificaciones")

# Orden de severidad para el umbral
NIVELES = {"BAJA": 1, "MEDIA": 2, "ALTA": 3, "CRITICA": 4}


def _formato_texto(p: dict) -> str:
    """Mensaje legible a partir del payload de alerta."""
    partes = [
        f"🐙 PULPO · {p.get('severidad', '?')} · {p.get('tipo', '?')}",
        f"Regla: {p.get('regla', '?')}",
        f"IP: {p.get('ip', '?')}",
        f"Host: {p.get('host', 'local')}",
    ]
    if p.get("pais"):
        partes.append(f"País: {p['pais']}")
    if p.get("abuse_score") is not None:
        partes.append(f"AbuseIPDB: {p['abuse_score']}/100")
    if p.get("vt_malicious"):
        partes.append(f"VirusTotal: {p['vt_malicious']} detecciones")
    partes.append(f"Hora: {p.get('timestamp', '?')}")
    return "\n".join(partes)


class CanalSlack:
    def __init__(self, webhook_url: str, timeout: int):
        self.webhook_url = webhook_url
        self.timeout = timeout

    def enviar(self, p: dict):
        requests.post(self.webhook_url, json={"text": _formato_texto(p)}, timeout=self.timeout)


class CanalTelegram:
    def __init__(self, bot_token: str, chat_id: str, timeout: int):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.timeout = timeout

    def enviar(self, p: dict):
        requests.post(
            f"https://api.telegram.org/bot{self.bot_token}/sendMessage",
            json={"chat_id": self.chat_id, "text": _formato_texto(p)},
            timeout=self.timeout,
        )


class CanalEmail:
    def __init__(self, cfg: dict):
        self.smtp_host = cfg.get("smtp_host", "")
        self.smtp_port = cfg.get("smtp_port", 587)
        self.usuario = cfg.get("usuario", "")
        self.password = cfg.get("password", "") or os.environ.get("SMTP_PASSWORD", "")
        self.desde = cfg.get("desde", self.usuario)
        self.para = cfg.get("para", "")
        self.usar_tls = cfg.get("tls", True)
        self.timeout = cfg.get("timeout", 10)

    def enviar(self, p: dict):
        msg = MIMEText(_formato_texto(p))
        msg["Subject"] = f"[PULPO] {p.get('severidad', '?')} - {p.get('regla', '?')}"
        msg["From"] = self.desde
        msg["To"] = self.para
        with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=self.timeout) as s:
            if self.usar_tls:
                s.starttls()
            if self.usuario and self.password:
                s.login(self.usuario, self.password)
            s.send_message(msg)


class Notificador:

    def __init__(self, config: dict):
        """
        config: sección 'notificaciones' del config.yaml
        """
        self.umbral = NIVELES.get(config.get("umbral_severidad", "ALTA").upper(), 3)
        timeout = config.get("timeout", 5)
        self.canales = []

        slack = config.get("slack", {})
        webhook = slack.get("webhook_url", "") or os.environ.get("SLACK_WEBHOOK_URL", "")
        if webhook:
            self.canales.append(CanalSlack(webhook, timeout))

        tg = config.get("telegram", {})
        token = tg.get("bot_token", "") or os.environ.get("TELEGRAM_BOT_TOKEN", "")
        chat_id = tg.get("chat_id", "") or os.environ.get("TELEGRAM_CHAT_ID", "")
        if token and chat_id:
            self.canales.append(CanalTelegram(token, chat_id, timeout))

        email = config.get("email", {})
        if email.get("smtp_host"):
            self.canales.append(CanalEmail(email))

        self._queue: "queue.Queue[dict]" = queue.Queue()
        self._ejecutando = False
        self._thread: threading.Thread | None = None

    def iniciar(self):
        if self._ejecutando:
            return
        if not self.canales:
            logger.info("[Notificaciones] Ningún canal configurado; desactivado.")
            return
        self._ejecutando = True
        self._thread = threading.Thread(
            target=self._bucle, daemon=True, name="pulpo-notificaciones"
        )
        self._thread.start()
        nombres = ", ".join(type(c).__name__.replace("Canal", "") for c in self.canales)
        logger.info(f"[Notificaciones] Activo ({nombres}) con umbral {self._nombre_umbral()}.")

    def _nombre_umbral(self) -> str:
        for nombre, nivel in NIVELES.items():
            if nivel == self.umbral:
                return nombre
        return str(self.umbral)

    def notificar(self, payload: dict):
        """Encola la alerta si su severidad alcanza el umbral (no bloquea)."""
        if not self._ejecutando:
            return
        nivel = NIVELES.get(str(payload.get("severidad", "")).upper(), 0)
        if nivel >= self.umbral:
            self._queue.put(payload)

    def _bucle(self):
        while self._ejecutando:
            payload = self._queue.get()
            if payload is None:
                break
            for canal in self.canales:
                try:
                    canal.enviar(payload)
                except Exception as e:
                    logger.warning(
                        f"[Notificaciones] Canal {type(canal).__name__} falló: {e}"
                    )

    def detener(self):
        self._ejecutando = False
        self._queue.put(None)
