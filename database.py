import os
import re
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DB_PATH = os.environ.get("PULPO_DB", "/opt/LogClassifier/pulpo.db")

Base = declarative_base()


class AlertRecord(Base):
    __tablename__ = "alerts"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    timestamp    = Column(String,  nullable=False)
    tipo         = Column(String,  nullable=False)   # ALERTA | BLOQUEO | REGISTRO
    regla        = Column(String,  nullable=False)
    ip           = Column(String,  nullable=False)
    severidad    = Column(String,  nullable=False)
    duracion     = Column(Integer, nullable=True)
    raw          = Column(String,  nullable=False)
    acknowledged = Column(Boolean, default=False)
    created_at   = Column(DateTime, default=datetime.utcnow)


engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine)


def init_db() -> None:
    Base.metadata.create_all(engine)


def alert_to_dict(a: AlertRecord) -> dict:
    return {
        "id":           a.id,
        "timestamp":    a.timestamp,
        "tipo":         a.tipo,
        "regla":        a.regla,
        "ip":           a.ip,
        "severidad":    a.severidad,
        "duracion":     a.duracion,
        "raw":          a.raw,
        "acknowledged": a.acknowledged,
        "created_at":   a.created_at.isoformat() if a.created_at else None,
    }


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
