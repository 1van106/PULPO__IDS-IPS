"""
modules/respuesta.py
--------------------
Módulo de Respuesta Automática.
Ejecuta acciones (bloquear IP, alertar, registrar) cuando se detecta
un patrón malicioso confirmado por el motor de correlación.

Modos de operación:
  - "simulacion": solo registra lo que haría (seguro para demos/lab)
  - "real"      : ejecuta iptables/nftables en el sistema
"""

import subprocess
import threading
import time
import ipaddress
import logging
from datetime import datetime
from typing import Callable

from modules.motor_reglas import Evento

logger = logging.getLogger("logclassifier.respuesta")


class ModuloRespuesta:

    def __init__(self, config: dict, callback_alerta: Callable, callback_resetear_ip: Callable):
        """
        config: sección 'respuesta' del config.yaml
        callback_alerta: función(mensaje) para emitir alertas
        callback_resetear_ip: función(regla_id, ip) para resetear correlación
        """
        self.habilitado = config.get("enabled", True)
        self.modo = config.get("modo", "simulacion")
        self.duracion_bloqueo = config.get("bloqueo_duracion_segundos", 300)
        # Whitelist: admite IPs sueltas y rangos CIDR (ej. "192.168.0.0/16").
        self.whitelist_nets = []
        for entrada in config.get("whitelist_ips", []):
            try:
                self.whitelist_nets.append(ipaddress.ip_network(entrada, strict=False))
            except ValueError:
                logger.warning(f"[Respuesta] Entrada de whitelist inválida, ignorada: {entrada}")
        self.callback_alerta = callback_alerta
        self.callback_resetear_ip = callback_resetear_ip

        # IPs bloqueadas: { ip: timestamp_bloqueo }
        self._bloqueadas: dict = {}
        self._lock = threading.Lock()

    def ejecutar(self, evento: Evento):
        """Punto de entrada principal. Despacha según la acción de la regla."""
        if not self.habilitado:
            return

        accion = evento.accion
        ip = evento.ip

        if accion == "bloquear_ip":
            self._accion_bloquear_ip(evento, ip)
        elif accion == "alertar":
            self._accion_alertar(evento)
        elif accion == "registrar":
            self._accion_registrar(evento)
        else:
            logger.warning(f"[Respuesta] Acción desconocida '{accion}' en regla {evento.regla_id}")

    # ------------------------------------------------------------------
    # Acciones
    # ------------------------------------------------------------------

    def _en_whitelist(self, ip: str) -> bool:
        """True si la IP está en alguna red/IP de la whitelist (soporta CIDR)."""
        try:
            addr = ipaddress.ip_address(ip)
        except ValueError:
            return False
        return any(addr in net for net in self.whitelist_nets)

    def _accion_bloquear_ip(self, evento: Evento, ip: str):
        if ip is None:
            logger.warning("[Respuesta] bloquear_ip sin IP en el evento.")
            return

        if self._en_whitelist(ip):
            logger.info(f"[Respuesta] IP {ip} en whitelist. No se bloquea.")
            return

        with self._lock:
            if ip in self._bloqueadas:
                logger.debug(f"[Respuesta] IP {ip} ya estaba bloqueada.")
                return
            self._bloqueadas[ip] = time.time()

        mensaje = (
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
            f"BLOQUEO | Regla: {evento.regla_id} | IP: {ip} | "
            f"Severidad: {evento.severidad} | Duración: {self.duracion_bloqueo}s"
        )
        self.callback_alerta(mensaje)

        if self.modo == "real":
            self._ejecutar_iptables_bloqueo(ip)
        else:
            logger.info(f"[Respuesta][SIMULACION] iptables -I INPUT -s {ip} -j DROP")

        # Programar desbloqueo automático
        hilo = threading.Thread(
            target=self._desbloquear_ip_tras_espera,
            args=(evento.regla_id, ip),
            daemon=True
        )
        hilo.start()

    def _accion_alertar(self, evento: Evento):
        mensaje = (
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
            f"ALERTA | Regla: {evento.regla_id} | IP: {evento.ip} | "
            f"Severidad: {evento.severidad} | {evento.regla_nombre}"
        )
        self.callback_alerta(mensaje)

    def _accion_registrar(self, evento: Evento):
        mensaje = (
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
            f"REGISTRO | Regla: {evento.regla_id} | IP: {evento.ip} | "
            f"{evento.linea_original[:120]}"
        )
        self.callback_alerta(mensaje)

    # ------------------------------------------------------------------
    # Bloqueo/desbloqueo con iptables
    # ------------------------------------------------------------------

    def _ejecutar_iptables_bloqueo(self, ip: str):
        try:
            subprocess.run(
                ["iptables", "-I", "INPUT", "-s", ip, "-j", "DROP"],
                check=True, capture_output=True
            )
            logger.info(f"[Respuesta] iptables: IP {ip} bloqueada correctamente.")
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.decode(errors="replace") if e.stderr else ""
            if "permission denied" in stderr.lower() or "must be root" in stderr.lower():
                logger.error(
                    "[Respuesta] iptables denegó el bloqueo por permisos: el IDS debe "
                    "ejecutarse como root (o con CAP_NET_ADMIN) en modo 'real'."
                )
            else:
                logger.error(f"[Respuesta] Error ejecutando iptables: {stderr}")
        except FileNotFoundError:
            logger.error("[Respuesta] iptables no encontrado en el sistema.")

    def _ejecutar_iptables_desbloqueo(self, ip: str):
        try:
            subprocess.run(
                ["iptables", "-D", "INPUT", "-s", ip, "-j", "DROP"],
                check=True, capture_output=True
            )
            logger.info(f"[Respuesta] iptables: IP {ip} desbloqueada.")
        except Exception as e:
            logger.error(f"[Respuesta] Error desbloqueando IP {ip}: {e}")

    def _desbloquear_ip_tras_espera(self, regla_id: str, ip: str):
        time.sleep(self.duracion_bloqueo)

        with self._lock:
            self._bloqueadas.pop(ip, None)

        if self.modo == "real":
            self._ejecutar_iptables_desbloqueo(ip)
        else:
            logger.info(f"[Respuesta][SIMULACION] Desbloqueo de {ip} tras {self.duracion_bloqueo}s")

        # Resetear la correlación para que pueda volver a detectar
        self.callback_resetear_ip(regla_id, ip)
        logger.info(f"[Respuesta] IP {ip} liberada y correlación reseteada.")

    # ------------------------------------------------------------------
    # Estado
    # ------------------------------------------------------------------

    def ips_bloqueadas(self) -> list:
        with self._lock:
            return list(self._bloqueadas.keys())
