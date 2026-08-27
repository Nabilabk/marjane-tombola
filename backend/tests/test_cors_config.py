"""
CORS_ALLOWED_ORIGINS used to be a hardcoded allow_origins=["*"] — this pins
the env-var-driven replacement down so it can't silently regress back to a
wildcard in production.
"""

import importlib

import app


def test_default_cors_origins_are_localhost_dev_only(monkeypatch):
    monkeypatch.delenv("CORS_ALLOWED_ORIGINS", raising=False)
    importlib.reload(app)
    assert "*" not in app.CORS_ALLOWED_ORIGINS
    assert "http://localhost:5173" in app.CORS_ALLOWED_ORIGINS
    assert "http://127.0.0.1:8443" in app.CORS_ALLOWED_ORIGINS


def test_cors_origins_can_be_overridden_via_env(monkeypatch):
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://example.com, https://admin.example.com")
    importlib.reload(app)
    assert app.CORS_ALLOWED_ORIGINS == ["https://example.com", "https://admin.example.com"]

    # leave the module in its default state for any test that runs after this one
    monkeypatch.delenv("CORS_ALLOWED_ORIGINS", raising=False)
    importlib.reload(app)
