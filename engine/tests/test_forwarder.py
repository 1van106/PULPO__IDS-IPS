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

    def test_config_reenvio(self):
        f = Forwarder({"url": "http://c", "replay_interval": 10, "batch": 50})
        self.assertEqual(f.replay_interval, 10)
        self.assertEqual(f.batch, 50)

    def test_config_defaults(self):
        f = Forwarder({"url": "http://c"})
        self.assertEqual(f.replay_interval, 30)
        self.assertEqual(f.batch, 200)

    def test_drenar_envia_y_marca_todas(self):
        """Con el colector OK, drena todas las pendientes y las marca entregadas."""
        f = Forwarder({"url": "http://c", "token": "t"})
        f._ejecutando = True
        pend = [{"id": 1, "ip": "1.1.1.1"}, {"id": 2, "ip": "2.2.2.2"}]
        with patch("modules.forwarder.pendientes_reenvio", return_value=pend), \
             patch("modules.forwarder.marcar_reenviadas") as mock_marcar, \
             patch("modules.forwarder.requests.post",
                   return_value=MagicMock(status_code=200)) as mock_post:
            f._drenar_pendientes()
        self.assertEqual(mock_post.call_count, 2)
        mock_marcar.assert_called_once_with([1, 2])

    def test_drenar_aborta_si_colector_caido(self):
        """Si el colector no responde, aborta tras el primer fallo y no marca nada
        (las pendientes se conservan para el próximo ciclo)."""
        f = Forwarder({"url": "http://c"})
        f._ejecutando = True
        pend = [{"id": 1}, {"id": 2}, {"id": 3}]
        with patch("modules.forwarder.pendientes_reenvio", return_value=pend), \
             patch("modules.forwarder.marcar_reenviadas") as mock_marcar, \
             patch("modules.forwarder.requests.post",
                   side_effect=requests.RequestException("colector caído")) as mock_post:
            f._drenar_pendientes()
        self.assertEqual(mock_post.call_count, 1)   # aborta, no intenta el resto
        mock_marcar.assert_not_called()

    def test_drenar_marca_solo_las_entregadas(self):
        """Éxito parcial: marca solo las que se entregaron antes del fallo."""
        f = Forwarder({"url": "http://c"})
        f._ejecutando = True
        pend = [{"id": 1}, {"id": 2}, {"id": 3}]
        respuestas = [MagicMock(status_code=200),                       # id 1 OK
                      requests.RequestException("caído")]               # id 2 falla
        with patch("modules.forwarder.pendientes_reenvio", return_value=pend), \
             patch("modules.forwarder.marcar_reenviadas") as mock_marcar, \
             patch("modules.forwarder.requests.post", side_effect=respuestas):
            f._drenar_pendientes()
        mock_marcar.assert_called_once_with([1])


if __name__ == "__main__":
    unittest.main(verbosity=2)
