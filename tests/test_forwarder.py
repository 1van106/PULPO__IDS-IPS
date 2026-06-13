"""
tests/test_forwarder.py
-----------------------
Tests del reenviador al colector: un intento devuelve True/False según la
respuesta, y la configuración de reintentos se respeta (sin red real).
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.forwarder import Forwarder  # noqa: E402


class TestForwarder(unittest.TestCase):

    def test_intento_exito(self):
        f = Forwarder({"url": "http://colector:8080", "token": "t"})
        with patch("modules.forwarder.requests.post", return_value=MagicMock(status_code=200)):
            self.assertTrue(f._intentar_envio({"a": 1}, {}))

    def test_intento_fallo_por_status(self):
        f = Forwarder({"url": "http://colector:8080"})
        with patch("modules.forwarder.requests.post",
                   return_value=MagicMock(status_code=500, text="error")):
            self.assertFalse(f._intentar_envio({"a": 1}, {}))

    def test_intento_fallo_por_excepcion(self):
        f = Forwarder({"url": "http://colector:8080"})
        with patch("modules.forwarder.requests.post",
                   side_effect=requests.RequestException("colector caído")):
            self.assertFalse(f._intentar_envio({"a": 1}, {}))

    def test_reintentos_configurables(self):
        f = Forwarder({"url": "http://c", "reintentos": 4, "backoff_base": 1})
        self.assertEqual(f.reintentos, 4)
        self.assertEqual(f.backoff_base, 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
