"""
tests/test_motor_reglas.py
--------------------------
Tests unitarios para el Motor de Reglas y el Motor de Correlación.
"""

import sys
import os
import time
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.motor_reglas import MotorReglas, Evento
from modules.correlacion import MotorCorrelacion


class TestMotorReglas(unittest.TestCase):

    def setUp(self):
        self.eventos_recibidos = []
        self.motor = MotorReglas(
            rules_dir="rules/",
            callback_evento=self.eventos_recibidos.append
        )
        self.motor.cargar_reglas()

    def test_carga_reglas(self):
        """Debe cargar al menos una regla."""
        self.assertGreater(len(self.motor.reglas), 0, "No se cargaron reglas")

    def test_detecta_ssh_bruteforce(self):
        """Una línea de SSH fallido debe generar un evento."""
        linea = "Mar 25 10:00:00 server sshd[123]: Failed password for admin from 1.2.3.4 port 54321 ssh2"
        self.motor.procesar_linea("auth_log", linea)
        ids = [e.regla_id for e in self.eventos_recibidos]
        self.assertIn("SSH_BRUTEFORCE", ids)

    def test_detecta_ip_correctamente(self):
        """La IP extraída debe coincidir con la de la línea."""
        linea = "Mar 25 10:00:01 server sshd[123]: Failed password for root from 9.8.7.6 port 12345 ssh2"
        self.motor.procesar_linea("auth_log", linea)
        evento = next((e for e in self.eventos_recibidos if e.regla_id == "SSH_BRUTEFORCE"), None)
        self.assertIsNotNone(evento)
        self.assertEqual(evento.ip, "9.8.7.6")

    def test_no_detecta_linea_normal(self):
        """Una línea de log normal no debe generar eventos."""
        linea = "Mar 25 10:00:02 server sshd[123]: Accepted password for alice from 192.168.1.10 port 22"
        self.motor.procesar_linea("auth_log", linea)
        self.assertEqual(len(self.eventos_recibidos), 0)

    def test_detecta_usuario_invalido(self):
        """Debe detectar usuario inválido."""
        linea = "Mar 25 10:00:03 server sshd[123]: Invalid user oracle from 5.5.5.5"
        self.motor.procesar_linea("auth_log", linea)
        ids = [e.regla_id for e in self.eventos_recibidos]
        self.assertIn("SSH_INVALID_USER", ids)

    def test_filtra_por_fuente(self):
        """Una regla de auth_log no debe activarse con fuente syslog."""
        linea = "Mar 25 10:00:04 server sshd[123]: Failed password for admin from 1.1.1.1 port 9999 ssh2"
        self.motor.procesar_linea("syslog", linea)  # fuente diferente
        self.assertEqual(len(self.eventos_recibidos), 0)


class TestMotorCorrelacion(unittest.TestCase):

    def setUp(self):
        self.disparos = []
        config = {"cleanup_interval": 300}
        self.correlacion = MotorCorrelacion(
            config=config,
            callback_disparo=self.disparos.append
        )

    def _evento_de_prueba(self, ip="1.2.3.4", umbral=3, ventana=60):
        """Crea un evento de prueba."""
        from modules.motor_reglas import Evento
        return Evento(
            regla_id="TEST_RULE",
            regla_nombre="Regla de prueba",
            severidad="ALTA",
            fuente="auth_log",
            ip=ip,
            linea_original="linea de prueba",
            accion="bloquear_ip",
            umbral=umbral,
            ventana_segundos=ventana,
        )

    def test_no_dispara_antes_del_umbral(self):
        """No debe disparar si no se alcanza el umbral."""
        evento = self._evento_de_prueba(umbral=5)
        for _ in range(4):
            self.correlacion.procesar_evento(evento)
        self.assertEqual(len(self.disparos), 0)

    def test_dispara_al_alcanzar_umbral(self):
        """Debe disparar exactamente al alcanzar el umbral."""
        evento = self._evento_de_prueba(umbral=3)
        for _ in range(3):
            self.correlacion.procesar_evento(evento)
        self.assertEqual(len(self.disparos), 1)

    def test_no_dispara_dos_veces(self):
        """No debe disparar más de una vez por la misma combinación regla+IP."""
        evento = self._evento_de_prueba(umbral=3)
        for _ in range(6):
            self.correlacion.procesar_evento(evento)
        self.assertEqual(len(self.disparos), 1)

    def test_ips_diferentes_independientes(self):
        """IPs distintas deben tener contadores independientes."""
        evento_a = self._evento_de_prueba(ip="1.1.1.1", umbral=3)
        evento_b = self._evento_de_prueba(ip="2.2.2.2", umbral=3)

        for _ in range(3):
            self.correlacion.procesar_evento(evento_a)
        for _ in range(3):
            self.correlacion.procesar_evento(evento_b)

        self.assertEqual(len(self.disparos), 2)

    def test_resetear_ip_permite_nuevo_disparo(self):
        """Después de resetear, debe poder disparar de nuevo."""
        evento = self._evento_de_prueba(umbral=3)
        for _ in range(3):
            self.correlacion.procesar_evento(evento)
        self.assertEqual(len(self.disparos), 1)

        self.correlacion.resetear_ip("TEST_RULE", "1.2.3.4")

        for _ in range(3):
            self.correlacion.procesar_evento(evento)
        self.assertEqual(len(self.disparos), 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
