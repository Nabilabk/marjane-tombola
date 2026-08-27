"""
These 6 endpoints used to have NO auth dependency at all despite living
under /api/admin/ — GET /api/admin/clients/{phone} leaked a customer's full
name to anyone who guessed their phone number, and the 5 catalog endpoints
exposed Marjane's whole product catalog unauthenticated. Pins all 6 down to
401 without a token so this specific class of bug (a route that LOOKS
admin-gated by its path but isn't, in code) can't silently reappear.

get_current_user rejects a missing/invalid Authorization header before any
DB call happens, so these are plain TestClient(app) calls — no DB needed,
same reasoning as test_health.py.
"""

from fastapi.testclient import TestClient

from app import app as fastapi_app

client = TestClient(fastapi_app)


def test_get_client_requires_auth():
    response = client.get("/api/admin/clients/0612345678")
    assert response.status_code == 401


def test_article_brands_requires_auth():
    assert client.get("/api/admin/articles/brands").status_code == 401


def test_article_fournisseurs_requires_auth():
    assert client.get("/api/admin/articles/fournisseurs").status_code == 401


def test_article_rayons_requires_auth():
    assert client.get("/api/admin/articles/rayons").status_code == 401


def test_article_search_requires_auth():
    assert client.get("/api/admin/articles").status_code == 401


def test_articles_by_codes_requires_auth():
    response = client.post("/api/admin/articles/by-codes", json={"codes": ["123"]})
    assert response.status_code == 401
