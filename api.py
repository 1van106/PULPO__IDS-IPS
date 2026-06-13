"""
api.py — PULPO REST API + WebSocket server (v2.0)
Runs as a daemon thread alongside the main LogClassifier loop.
"""

import asyncio
import json
import logging
import os
from typing import List, Optional

import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import AlertRecord, SessionLocal, alert_to_dict, init_db
from shared import alert_queue

logger = logging.getLogger("logclassifier.api")


def _api_token() -> str:
    """Token exigido en endpoints de escritura. Vacío => sin auth (legacy)."""
    return os.environ.get("PULPO_API_TOKEN", "")


def require_token(authorization: Optional[str] = Header(None)) -> None:
    """Dependencia FastAPI: valida 'Authorization: Bearer <token>' si hay token configurado."""
    token = _api_token()
    if not token:
        return
    expected = f"Bearer {token}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Token inválido o ausente")


class IngestAlert(BaseModel):
    host:      str = "local"
    timestamp: str
    tipo:      str
    regla:     str
    ip:        str
    severidad: str
    duracion:  Optional[int] = None
    raw:       str
    acknowledged: Optional[bool] = False

app = FastAPI(title="PULPO API", version="2.0.0", docs_url="/docs", redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_ws_clients: List[WebSocket] = []


@app.on_event("startup")
async def on_startup() -> None:
    init_db()
    asyncio.create_task(_ws_broadcaster())


async def _ws_broadcaster() -> None:
    """Drains alert_queue and pushes each alert to all connected WebSocket clients."""
    loop = asyncio.get_event_loop()
    while True:
        alert_dict = await loop.run_in_executor(None, alert_queue.get)
        if not _ws_clients:
            continue
        payload = json.dumps(alert_dict)
        for ws in list(_ws_clients):
            try:
                await ws.send_text(payload)
            except Exception:
                try:
                    _ws_clients.remove(ws)
                except ValueError:
                    pass


# ── Health ────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": "2.0.0"}


# ── Alerts ────────────────────────────────────────────────────────────

@app.get("/api/alerts")
def list_alerts(
    skip:      int           = Query(0, ge=0),
    limit:     int           = Query(500, ge=1, le=2000),
    severidad: Optional[str] = Query(None),
    tipo:      Optional[str] = Query(None),
    regla:     Optional[str] = Query(None),
    host:      Optional[str] = Query(None),
) -> list:
    db = SessionLocal()
    q = db.query(AlertRecord).order_by(AlertRecord.id.desc())
    if severidad:
        q = q.filter(AlertRecord.severidad == severidad.upper())
    if tipo:
        q = q.filter(AlertRecord.tipo == tipo.upper())
    if regla:
        q = q.filter(AlertRecord.regla == regla.upper())
    if host:
        q = q.filter(AlertRecord.host == host)
    result = q.offset(skip).limit(limit).all()
    db.close()
    return [alert_to_dict(a) for a in result]


@app.post("/api/ingest")
def ingest(alert: IngestAlert, _: None = Depends(require_token)) -> dict:
    """Recibe una alerta reenviada por un agente, la persiste y la emite por WS."""
    db = SessionLocal()
    record = AlertRecord(
        host=alert.host,
        timestamp=alert.timestamp,
        tipo=alert.tipo,
        regla=alert.regla,
        ip=alert.ip,
        severidad=alert.severidad,
        duracion=alert.duracion,
        raw=alert.raw,
        acknowledged=alert.acknowledged or False,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    payload = alert_to_dict(record)
    db.close()
    alert_queue.put(payload)
    return {"ok": True, "id": record.id}


@app.get("/api/hosts")
def list_hosts() -> list:
    """Hosts distintos con su conteo de alertas y última vez vista (para el selector)."""
    db = SessionLocal()
    records = db.query(AlertRecord.host, AlertRecord.id, AlertRecord.timestamp).all()
    db.close()
    agg: dict = {}
    for host, _id, ts in records:
        h = host or "local"
        info = agg.setdefault(h, {"host": h, "count": 0, "lastSeen": ""})
        info["count"] += 1
        if ts > info["lastSeen"]:
            info["lastSeen"] = ts
    return sorted(agg.values(), key=lambda i: i["count"], reverse=True)


@app.get("/api/stats")
def get_stats() -> dict:
    db = SessionLocal()
    records = db.query(AlertRecord).all()
    db.close()

    by_rule: dict     = {}
    by_severity: dict = {}
    by_type: dict     = {}
    by_host: dict     = {}

    for r in records:
        by_rule[r.regla]         = by_rule.get(r.regla, 0) + 1
        by_severity[r.severidad] = by_severity.get(r.severidad, 0) + 1
        by_type[r.tipo]          = by_type.get(r.tipo, 0) + 1
        by_host[r.host or "local"] = by_host.get(r.host or "local", 0) + 1

    return {
        "total":       len(records),
        "by_rule":     by_rule,
        "by_severity": by_severity,
        "by_type":     by_type,
        "by_host":     by_host,
    }


@app.post("/api/alerts/{alert_id}/acknowledge")
def acknowledge(alert_id: int, _: None = Depends(require_token)) -> dict:
    db = SessionLocal()
    record = db.query(AlertRecord).filter(AlertRecord.id == alert_id).first()
    if record:
        record.acknowledged = True
        db.commit()
    db.close()
    return {"ok": True}


@app.delete("/api/alerts")
def clear_all(_: None = Depends(require_token)) -> dict:
    db = SessionLocal()
    db.query(AlertRecord).delete()
    db.commit()
    db.close()
    return {"ok": True}


# ── WebSocket ─────────────────────────────────────────────────────────

@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    _ws_clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in _ws_clients:
            _ws_clients.remove(websocket)


# ── Entry point ───────────────────────────────────────────────────────

def run_server(host: str = "0.0.0.0", port: int = 8080) -> None:
    uvicorn.run(app, host=host, port=port, log_level="warning")
