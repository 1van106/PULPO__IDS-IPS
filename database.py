import os
import re
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, Integer, String, create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

DB_PATH = os.environ.get("PULPO_DB", "/opt/LogClassifier/pulpo.db")

Base = declarative_base()


class AlertRecord(Base):
    __tablename__ = "alerts"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    host         = Column(String,  nullable=False, default="local", index=True)
    timestamp    = Column(String,  nullable=False)
    tipo         = Column(String,  nullable=False)   # ALERTA | BLOQUEO | REGISTRO
    regla        = Column(String,  nullable=False)
    ip           = Column(String,  nullable=False)
    severidad    = Column(String,  nullable=False)
    duracion     = Column(Integer, nullable=True)
    raw          = Column(String,  nullable=False)
    acknowledged = Column(Boolean, default=False)
    created_at   = Column(DateTime, default=datetime.utcnow)
    # Threat intelligence (enriquecimiento, opcional)
    pais         = Column(String,  nullable=True)
    abuse_score  = Column(Integer, nullable=True)
    vt_malicious = Column(Integer, nullable=True)
    # Reenvío al colector (modo agente): False = pendiente de entregar.
    # En el colector/standalone es irrelevante (nadie lo consulta).
    forwarded    = Column(Boolean, default=False, index=True)


engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine)


def init_db() -> None:
    Base.metadata.create_all(engine)
    _migrate()


def _migrate() -> None:
    """Micro-migración: añade columnas nuevas a tablas que ya existían."""
    inspector = inspect(engine)
    if "alerts" not in inspector.get_table_names():
        return
    columnas = {c["name"] for c in inspector.get_columns("alerts")}
    nuevas = {
        "host":         "ALTER TABLE alerts ADD COLUMN host VARCHAR DEFAULT 'local'",
        "pais":         "ALTER TABLE alerts ADD COLUMN pais VARCHAR",
        "abuse_score":  "ALTER TABLE alerts ADD COLUMN abuse_score INTEGER",
        "vt_malicious": "ALTER TABLE alerts ADD COLUMN vt_malicious INTEGER",
        # DEFAULT 1: las alertas que ya existían se consideran entregadas, para
        # no reenviar todo el histórico al colector tras actualizar. Las filas
        # nuevas las inserta el ORM con su default Python (False = pendiente).
        "forwarded":    "ALTER TABLE alerts ADD COLUMN forwarded BOOLEAN DEFAULT 1",
    }
    for col, ddl in nuevas.items():
        if col not in columnas:
            with engine.begin() as conn:
                conn.execute(text(ddl))


def purgar_antiguas(dias: int) -> int:
    """
    Borra las alertas con más de `dias` días de antigüedad (por created_at).
    Devuelve el número de filas eliminadas. dias <= 0 desactiva la purga.
    """
    if dias <= 0:
        return 0
    corte = datetime.utcnow() - timedelta(days=dias)
    db = SessionLocal()
    try:
        n = db.query(AlertRecord).filter(AlertRecord.created_at < corte).delete()
        db.commit()
        return n
    finally:
        db.close()


def alert_to_dict(a: AlertRecord) -> dict:
    return {
        "id":           a.id,
        "host":         a.host,
        "timestamp":    a.timestamp,
        "tipo":         a.tipo,
        "regla":        a.regla,
        "ip":           a.ip,
        "severidad":    a.severidad,
        "duracion":     a.duracion,
        "raw":          a.raw,
        "acknowledged": a.acknowledged,
        "created_at":   a.created_at.isoformat() if a.created_at else None,
        "pais":         a.pais,
        "abuse_score":  a.abuse_score,
        "vt_malicious": a.vt_malicious,
    }


def pendientes_reenvio(limit: int = 200) -> list:
    """Alertas locales aún no reenviadas al colector, en orden cronológico.

    Devuelve dicts listos para POST /api/ingest (incluyen `id` para marcarlas
    como entregadas después).
    """
    db = SessionLocal()
    try:
        registros = (
            db.query(AlertRecord)
            .filter(AlertRecord.forwarded.is_(False))
            .order_by(AlertRecord.id.asc())
            .limit(limit)
            .all()
        )
        return [alert_to_dict(a) for a in registros]
    finally:
        db.close()


def marcar_reenviadas(ids: list) -> None:
    """Marca como entregadas (forwarded=True) las alertas con esos ids."""
    if not ids:
        return
    db = SessionLocal()
    try:
        db.query(AlertRecord).filter(AlertRecord.id.in_(ids)).update(
            {AlertRecord.forwarded: True}, synchronize_session=False
        )
        db.commit()
    finally:
        db.close()


_RAW_RE = re.compile(
    r"\[(.+?)\]\s+(\w+)\s+\|\s+Regla:\s+(\S+)\s+\|\s+IP:\s+(\S+)\s+\|\s+Severidad:\s+(\w+)"
    r"(?:\s+\|\s+Duraci[oó]n:\s+(\d+)s)?",
    re.IGNORECASE,
)


def parse_raw(raw: str) -> Optional[dict]:
    m = _RAW_RE.match(raw.strip())
    if not m:
        return None
    return {
        "timestamp": m.group(1),
        "tipo":      m.group(2).upper(),
        "regla":     m.group(3),
        "ip":        m.group(4),
        "severidad": m.group(5).upper(),
        "duracion":  int(m.group(6)) if m.group(6) else None,
    }
