"""
tests/test_database.py
----------------------
Tests de la capa de persistencia: parseo de raw, política de retención
(purga) y campos de threat intel en el diccionario de salida.
"""

import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# BD aislada en un fichero temporal ANTES de importar database
os.environ["PULPO_DB"] = os.path.join(tempfile.gettempdir(), "pulpo_test.db")

from database import (  # noqa: E402
    AlertRecord, SessionLocal, alert_to_dict, init_db, parse_raw, purgar_antiguas,
)


class TestParseRaw(unittest.TestCase):

    def test_parse_bloqueo_con_duracion(self):
        raw = ("[2026-06-13 10:00:00] BLOQUEO | Regla: SQL_INJECTION | "
               "IP: 9.9.9.9 | Severidad: CRITICA | Duración: 300s")
        p = parse_raw(raw)
        self.assertEqual(p["tipo"], "BLOQUEO")
        self.assertEqual(p["ip"], "9.9.9.9")
        self.assertEqual(p["severidad"], "CRITICA")
        self.assertEqual(p["duracion"], 300)

    def test_parse_alerta_sin_duracion(self):
        raw = ("[2026-06-13 10:00:00] ALERTA | Regla: SCANNER_UA | "
               "IP: 8.8.8.8 | Severidad: MEDIA | UA de escaner")
        p = parse_raw(raw)
        self.assertEqual(p["tipo"], "ALERTA")
        self.assertIsNone(p["duracion"])

    def test_parse_linea_invalida(self):
        self.assertIsNone(parse_raw("una línea cualquiera sin formato"))


class TestRetencion(unittest.TestCase):

    def setUp(self):
        init_db()
        db = SessionLocal()
        db.query(AlertRecord).delete()
        db.commit()
        db.close()

    def _insertar(self, created_at):
        db = SessionLocal()
        db.add(AlertRecord(
            host="t", timestamp="x", tipo="ALERTA", regla="R",
            ip="1.1.1.1", severidad="ALTA", raw="r", created_at=created_at,
        ))
        db.commit()
        db.close()

    def test_purga_borra_antiguas_conserva_recientes(self):
        self._insertar(datetime.utcnow() - timedelta(days=100))
        self._insertar(datetime.utcnow() - timedelta(days=1))
        borradas = purgar_antiguas(90)
        self.assertEqual(borradas, 1)
        db = SessionLocal()
        quedan = db.query(AlertRecord).count()
        db.close()
        self.assertEqual(quedan, 1)

    def test_purga_cero_no_borra(self):
        self._insertar(datetime.utcnow() - timedelta(days=100))
        self.assertEqual(purgar_antiguas(0), 0)


class TestThreatIntelColumnas(unittest.TestCase):

    def test_alert_to_dict_incluye_threat_intel(self):
        a = AlertRecord(
            host="t", timestamp="x", tipo="ALERTA", regla="R", ip="1.1.1.1",
            severidad="ALTA", raw="r", pais="RU", abuse_score=90, vt_malicious=4,
        )
        d = alert_to_dict(a)
        self.assertEqual(d["pais"], "RU")
        self.assertEqual(d["abuse_score"], 90)
        self.assertEqual(d["vt_malicious"], 4)


if __name__ == "__main__":
    unittest.main(verbosity=2)
