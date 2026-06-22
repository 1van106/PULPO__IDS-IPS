"""
tests/test_enriquecimiento.py
-----------------------------
Tests del enriquecedor de threat intel: omisión de IPs privadas, parseo de
AbuseIPDB y caché (con requests mockeado, sin red real).
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.enriquecimiento import Enriquecedor  # noqa: E402


class TestEnriquecedor(unittest.TestCase):

    def test_es_publica(self):
        e = Enriquecedor({})
        self.assertTrue(e._es_publica("8.8.8.8"))
        self.assertFalse(e._es_publica("10.0.0.1"))
        self.assertFalse(e._es_publica("192.168.1.5"))
        self.assertFalse(e._es_publica("127.0.0.1"))
        self.assertFalse(e._es_publica("no-es-una-ip"))

    def test_omite_ip_privada_por_defecto(self):
        e = Enriquecedor({"abuseipdb_key": "k"})
        self.assertEqual(e.enriquecer("192.168.1.5"), {})

    @patch("modules.enriquecimiento.requests.get")
    def test_abuseipdb_parsea_score_y_pais(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"data": {"abuseConfidenceScore": 75, "countryCode": "RU"}},
        )
        e = Enriquecedor({"abuseipdb_key": "k", "geoip": False})
        r = e.enriquecer("45.45.45.45")
        self.assertEqual(r["abuse_score"], 75)
        self.assertEqual(r["pais"], "RU")

    @patch("modules.enriquecimiento.requests.get")
    def test_cache_evita_segunda_consulta(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"data": {"abuseConfidenceScore": 10, "countryCode": "US"}},
        )
        e = Enriquecedor({"abuseipdb_key": "k", "geoip": False})
        e.enriquecer("45.45.45.45")
        e.enriquecer("45.45.45.45")
        self.assertEqual(mock_get.call_count, 1)

    @patch("modules.enriquecimiento.requests.get")
    def test_incluir_privadas_para_lab(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"data": {"abuseConfidenceScore": 0, "countryCode": "ES"}},
        )
        e = Enriquecedor({"abuseipdb_key": "k", "geoip": False, "incluir_privadas": True})
        r = e.enriquecer("192.168.1.5")
        self.assertEqual(r.get("pais"), "ES")
        self.assertTrue(mock_get.called)


if __name__ == "__main__":
    unittest.main(verbosity=2)
