"""GET /health must answer without touching the DB — it exists specifically
so a monitor can tell "process is dead" apart from "DB is unreachable"."""

from fastapi.testclient import TestClient

from app import app as fastapi_app


def test_health_returns_ok_without_a_db_connection():
    # Plain TestClient(app), not `with TestClient(app) as client:` — the
    # latter runs FastAPI's startup event (DB init, catalog load), which
    # would need a real MySQL connection. /health must work before that,
    # which this test setup mirrors on purpose.
    client = TestClient(fastapi_app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
