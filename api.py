"""
api.py — PULPO REST API + WebSocket server (v2.0)
Runs as a daemon thread alongside the main LogClassifier loop.
"""

import asyncio
import json
import logging
from typing import List, Optional

import uvicorn
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import AlertRecord, SessionLocal, alert_to_dict, init_db
from shared import alert_queue

logger = logging.getLogger("logclassifier.api")

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
) -> list:
    db = SessionLocal()
    q = db.query(AlertRecord).order_by(AlertRecord.id.desc())
    if severidad:
        q = q.filter(AlertRecord.severidad == severidad.upper())
    if tipo:
        q = q.filter(AlertRecord.tipo == tipo.upper())
    if regla:
        q = q.filter(AlertRecord.regla == regla.upper())
    result = q.offset(skip).limit(limit).all()
    db.close()
    return [alert_to_dict(a) for a in result]


@app.get("/api/stats")
def get_stats() -> dict:
    db = SessionLocal()
    records = db.query(AlertRecord).all()
    db.close()

    by_rule: dict     = {}
    by_severity: dict = {}
    by_type: dict     = {}

    for r in records:
        by_rule[r.regla]         = by_rule.get(r.regla, 0) + 1
        by_severity[r.severidad] = by_severity.get(r.severidad, 0) + 1
        by_type[r.tipo]          = by_type.get(r.tipo, 0) + 1

    return {
        "total":       len(records),
        "by_rule":     by_rule,
        "by_severity": by_severity,
        "by_type":     by_type,
    }


@app.post("/api/alerts/{alert_id}/acknowledge")
def acknowledge(alert_id: int) -> dict:
    db = SessionLocal()
    record = db.query(AlertRecord).filter(AlertRecord.id == alert_id).first()
    if record:
        record.acknowledged = True
        db.commit()
    db.close()
    return {"ok": True}


@app.delete("/api/alerts")
def clear_all() -> dict:
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
