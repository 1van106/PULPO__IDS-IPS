"""
tests/test_notificaciones.py
----------------------------
Tests del notificador: filtro por umbral de severidad, registro de canales
desde config y formato del mensaje (sin enviar nada real).
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.notificaciones import Notificador, _formato_texto  # noqa: E402


class TestNotificador(unittest.TestCase):

    def test_umbral_filtra_por_severidad(self):
        n = Notificador({"umbral_severidad": "ALTA", "slack": {"webhook_url": "http://hook"}})
        n._ejecutando = True  # simular activo sin arrancar el thread real
        n.notificar({"severidad": "MEDIA"})
        self.assertTrue(n._queue.empty(), "MEDIA no debería encolar con umbral ALTA")
        n.notificar({"severidad": "CRITICA"})
        self.assertFalse(n._queue.empty(), "CRITICA debería encolar con umbral ALTA")

    def test_sin_canales_no_arranca(self):
        n = Notificador({})
        n.iniciar()
        self.assertFalse(n._ejecutando)

    def test_canal_slack_se_registra_desde_config(self):
        n = Notificador({"slack": {"webhook_url": "http://hook"}})
        self.assertEqual(len(n.canales), 1)

    def test_formato_incluye_threat_intel(self):
        txt = _formato_texto({
            "severidad": "ALTA", "tipo": "BLOQUEO", "regla": "SQL_INJECTION",
            "ip": "9.9.9.9", "host": "victima1", "pais": "RU",
            "abuse_score": 90, "vt_malicious": 5, "timestamp": "2026-06-13 10:00:00",
        })
        self.assertIn("RU", txt)
        self.assertIn("90", txt)
        self.assertIn("5 detecciones", txt)
        self.assertIn("9.9.9.9", txt)


if __name__ == "__main__":
    unittest.main(verbosity=2)
