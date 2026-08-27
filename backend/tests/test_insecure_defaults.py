"""
The insecure-default-secrets guard is the highest-stakes check in the
file — ADMIN_JWT_SECRET/SUPER_ADMIN_PASSWORD default to values anyone can
read on GitHub. Pin both of its behaviors down: warn (but still boot) in
dev, refuse to boot outright when APP_ENV=production.
"""

import importlib

import pytest

import app


def test_flags_an_active_default_but_still_imports_in_dev(monkeypatch):
    monkeypatch.setenv("SUPER_ADMIN_PASSWORD", "admin123")
    monkeypatch.setenv("ADMIN_JWT_SECRET", "a-real-non-default-secret")
    monkeypatch.delenv("APP_ENV", raising=False)

    importlib.reload(app)
    assert app._insecure_defaults_active == ["SUPER_ADMIN_PASSWORD"]

    monkeypatch.undo()
    importlib.reload(app)


def test_refuses_to_boot_with_a_default_active_in_production(monkeypatch):
    monkeypatch.setenv("SUPER_ADMIN_PASSWORD", "admin123")
    monkeypatch.setenv("ADMIN_JWT_SECRET", "a-real-non-default-secret")
    monkeypatch.setenv("APP_ENV", "production")

    with pytest.raises(RuntimeError, match="INSECURE DEFAULT"):
        importlib.reload(app)

    monkeypatch.undo()
    importlib.reload(app)


def test_boots_clean_with_real_secrets_even_in_production(monkeypatch):
    monkeypatch.setenv("SUPER_ADMIN_PASSWORD", "a-real-password-not-the-default")
    monkeypatch.setenv("ADMIN_JWT_SECRET", "a-real-non-default-secret")
    monkeypatch.setenv("APP_ENV", "production")

    importlib.reload(app)  # must not raise
    assert app._insecure_defaults_active == []

    monkeypatch.undo()
    importlib.reload(app)
