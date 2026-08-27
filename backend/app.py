"""
Tombola prize engine — FastAPI + MySQL (PyMySQL).

Migrated from SQLite/SQL Server. MySQL is closer to SQLite syntactically
than SQL Server was, so this version stays very close to the original:

  * `CREATE TABLE IF NOT EXISTS` works directly in MySQL (no sys.tables
    workaround needed like SQL Server required).
  * `cursor.lastrowid` works natively (no OUTPUT INSERTED.id workaround).
  * PyMySQL's DictCursor returns rows as dicts directly, so `row["col"]`
    access works with no manual conversion wrapper.
"""

import hashlib
import json
import os
import random
import re
import threading
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv

# Loaded before any os.environ.get(...) call below reads a var .env sets —
# it used to run much later (right before MYSQL_HOST), which silently left
# every env var read above that point (OCR_API_KEY, and now
# ADMIN_JWT_SECRET/SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD) stuck on their
# Python-side defaults no matter what .env said.
load_dotenv()

import bcrypt
import jwt
import pymysql
import pymysql.cursors
import requests
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

import catalog
from line_items import evaluate_product_rules, extract_line_items, match_receipt_items

PICK_LIMIT_DEFAULT = 3
LOSE_PRIZE_TEXT = ("Tentez votre chance encore une fois", "جرّب حظك مرة أخرى")

# A real phone photo of a receipt is typically 1-5 MB; 10 MB gives real
# users headroom while still bounding memory use per request. Rate limiting
# caps how OFTEN someone can hit this endpoint, not how big a single upload
# can be — this is the size half of that same protection.
MAX_RECEIPT_IMAGE_BYTES = 10 * 1024 * 1024

OCR_API_KEY = os.environ.get("OCR_API_KEY", "helloworld")
OCR_API_URL = "https://api.ocr.space/parse/image"

# --------------------------------------------------------------------------
# Admin auth — separate from the OCR/game config above on purpose, so it's
# easy to find. SUPER_ADMIN_EMAIL/PASSWORD only ever matter once, the very
# first time the app boots against an empty `admin_users` table (see
# `_bootstrap_super_admin`) — every account after that is created through
# POST /api/admin/users by an existing super_admin.
# --------------------------------------------------------------------------
ADMIN_JWT_SECRET = os.environ.get("ADMIN_JWT_SECRET", "dev-only-insecure-secret-change-me")
ADMIN_JWT_ALGORITHM = "HS256"
ADMIN_TOKEN_TTL_HOURS = 12
SUPER_ADMIN_EMAIL = os.environ.get("SUPER_ADMIN_EMAIL", "admin@campaignhub.ma")
SUPER_ADMIN_PASSWORD = os.environ.get("SUPER_ADMIN_PASSWORD", "admin123")

# Set APP_ENV=production on the real deployment (Azure App Service
# Configuration → Application settings) — nothing here defaults to it, so
# local dev is unaffected either way. Its only job is the check right below.
APP_ENV = os.environ.get("APP_ENV", "development")

# Anyone can read the two hardcoded fallback values above straight off
# GitHub — if either is still active, that's either a forgeable admin JWT
# or a literal "admin123" super_admin login. Loud warning always; outright
# refusal to boot if APP_ENV=production says this is meant to be a real
# deployment, not someone's local machine.
_insecure_defaults_active = [
    name
    for name, value, default in (
        ("ADMIN_JWT_SECRET", ADMIN_JWT_SECRET, "dev-only-insecure-secret-change-me"),
        ("SUPER_ADMIN_PASSWORD", SUPER_ADMIN_PASSWORD, "admin123"),
    )
    if value == default
]
if _insecure_defaults_active:
    _warning = (
        f"INSECURE DEFAULT(S) STILL ACTIVE: {', '.join(_insecure_defaults_active)}. "
        "Set real values via backend/.env locally, or your host's env config in "
        "production — see DEPLOY.md. Anyone who reads this file's fallback values "
        "could forge an admin session or log in as super_admin with 'admin123'."
    )
    if APP_ENV == "production":
        raise RuntimeError(_warning)
    print(f"\n{'!' * 78}\n!!  WARNING: {_warning}\n{'!' * 78}\n")

# RLock, not Lock: play_round/participate hold this for their whole body
# AND call get_campaign_conn(slug) inside that body, which itself acquires
# this same lock (in _ensure_campaign_db, to serialize first-touch
# provisioning of a tombola's database) — a plain Lock would deadlock on
# that same-thread re-acquire.
_lock = threading.RLock()

# --------------------------------------------------------------------------
# MySQL connection — all configured via environment variables so the same
# code works locally (Docker), against a managed MySQL (PlanetScale, RDS,
# etc.), or on a plain server.
# --------------------------------------------------------------------------
MYSQL_HOST = os.environ.get("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.environ.get("MYSQL_PORT", "3306"))
MYSQL_DATABASE = os.environ.get("MYSQL_DATABASE", "tombola")
MYSQL_USER = os.environ.get("MYSQL_USER", "root")
MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "")


@contextmanager
def get_master_conn():
    """Connects to the master/control DB (`MYSQL_DATABASE`, default
    'tombola') — the platform-wide tables only: `campaign_registry`
    (slug -> per-tombola db_name routing), `clients` (shared across every
    tombola by design), and `campaign_config`. Game-engine data (receipts,
    prizes, winners, participations) lives in each tombola's own database —
    see `get_campaign_conn`."""
    conn = pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )
    try:
        yield _ConnWrapper(conn)
        conn.commit()
    finally:
        conn.close()


def _slug_to_db_name(slug: str) -> str:
    """Derives a safe MySQL database name from a campaign slug. This gets
    string-interpolated directly into DDL (`CREATE DATABASE`/table refs
    can't be parameterized like values can), so the allowlist here has to
    be airtight — anything outside [a-z0-9_] is dropped, not escaped."""
    safe = re.sub(r"[^a-z0-9_]", "_", slug.strip().lower())
    safe = re.sub(r"_+", "_", safe).strip("_")
    if not safe:
        raise HTTPException(status_code=400, detail="slug is required.")
    # "tombola_" (8 chars) + up to 55 chars stays under MySQL's 64-char
    # identifier limit with room to spare.
    return f"tombola_{safe[:55]}"


_provisioned_dbs: set[str] = set()


def _create_database_if_missing(db_name: str) -> None:
    conn = pymysql.connect(
        host=MYSQL_HOST, port=MYSQL_PORT, user=MYSQL_USER, password=MYSQL_PASSWORD,
        cursorclass=pymysql.cursors.DictCursor, autocommit=True,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4")
    finally:
        conn.close()


def _init_campaign_schema(db_name: str) -> None:
    """Creates the per-tombola game-engine tables inside `db_name`. Same
    shape as the old shared schema, minus the slug-uniqueness machinery —
    each of these databases only ever holds one campaign's `campaigns` row,
    so the database itself is the scope now, not a `slug` column."""
    conn = pymysql.connect(
        host=MYSQL_HOST, port=MYSQL_PORT, user=MYSQL_USER, password=MYSQL_PASSWORD,
        database=db_name, cursorclass=pymysql.cursors.DictCursor, autocommit=True,
    )
    try:
        wrapper = _ConnWrapper(conn)
        wrapper.executescript(
            """
            CREATE TABLE IF NOT EXISTS campaigns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NULL,
                budget DOUBLE NOT NULL,
                remaining_budget DOUBLE NOT NULL,
                start_date VARCHAR(64) NOT NULL,
                end_date VARCHAR(64) NOT NULL,
                active TINYINT(1) NOT NULL DEFAULT 1,
                dynamic_weighting TINYINT(1) NOT NULL DEFAULT 1,
                allowed_store VARCHAR(50) NOT NULL DEFAULT 'marjane',
                receipt_min_amount DOUBLE NOT NULL DEFAULT 0,
                product_rules LONGTEXT NULL,
                maintenance_mode TINYINT(1) NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS receipts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                receipt_number VARCHAR(255),
                image_hash VARCHAR(128) NOT NULL,
                store VARCHAR(255),
                total DOUBLE,
                user_id VARCHAR(255),
                created_at VARCHAR(64) NOT NULL,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
            );

            CREATE TABLE IF NOT EXISTS receipt_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                receipt_id INT NOT NULL,
                description VARCHAR(500) NOT NULL,
                quantity INT NOT NULL,
                unit_price DOUBLE NOT NULL,
                line_total DOUBLE NOT NULL,
                matched_article_code VARCHAR(64) NULL,
                matched_article_libelle VARCHAR(500) NULL,
                match_score DOUBLE NOT NULL,
                FOREIGN KEY (receipt_id) REFERENCES receipts(id)
            );

            CREATE TABLE IF NOT EXISTS prizes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                amount DOUBLE NOT NULL,
                weight DOUBLE NOT NULL,
                quantity INT NOT NULL,
                remaining_quantity INT NOT NULL,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
            );

            CREATE TABLE IF NOT EXISTS winners (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                user_id VARCHAR(255),
                prize_amount DOUBLE NOT NULL,
                created_at VARCHAR(64) NOT NULL,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
            );

            CREATE TABLE IF NOT EXISTS prize_tiers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                prize_fr VARCHAR(255) NOT NULL,
                prize_ar VARCHAR(255) NOT NULL,
                probability_percent DOUBLE NOT NULL,
                is_lose_tier TINYINT(1) NOT NULL DEFAULT 0,
                max_winners INT NULL,
                winners_count INT NOT NULL DEFAULT 0,
                sort_order INT NOT NULL DEFAULT 0,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
            );

            CREATE TABLE IF NOT EXISTS participations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_id INT NOT NULL,
                campaign_id INT NOT NULL,
                prize_tier_id INT NULL,
                bill_image_path VARCHAR(500) NULL,
                bill_hash VARCHAR(128) NULL,
                prize_fr VARCHAR(255) NOT NULL,
                prize_ar VARCHAR(255) NOT NULL,
                is_winner TINYINT(1) NOT NULL DEFAULT 0,
                participation_date VARCHAR(64) NOT NULL,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
                FOREIGN KEY (prize_tier_id) REFERENCES prize_tiers(id)
            );
            """
            # `client_id` intentionally has no FK constraint: clients live in
            # the master DB (`MYSQL_DATABASE`), and this database only holds
            # this one tombola's data — cross-database FKs would work on
            # MySQL/InnoDB but couple every per-tombola DB's schema to the
            # master DB existing first. Referential integrity here is
            # app-level only (see `_get_or_create_client` / `participate`).
        )
        # `CREATE TABLE IF NOT EXISTS` above only helps a brand-new database —
        # marjane/colgate/knorr's DBs already existed before maintenance_mode
        # was added, so it's backfilled explicitly here the same way the old
        # shared-schema `_migrate_columns` used to for the pre-split DB.
        existing_cols = {
            row["COLUMN_NAME"]
            for row in wrapper.execute(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_NAME = 'campaigns' AND TABLE_SCHEMA = %s",
                (db_name,),
            ).fetchall()
        }
        if "maintenance_mode" not in existing_cols:
            wrapper.execute(
                "ALTER TABLE campaigns ADD COLUMN maintenance_mode TINYINT(1) NOT NULL DEFAULT 0"
            )
    finally:
        conn.close()


def _ensure_campaign_db(slug: str) -> str:
    """Returns the database name for `slug`, registering it in the master
    DB's `campaign_registry` and provisioning the actual database + tables
    the first time this slug is touched (by anyone, ever). Cached in
    `_provisioned_dbs` so the provisioning DDL only runs once per process,
    not on every request."""
    db_name = _slug_to_db_name(slug)
    if db_name in _provisioned_dbs:
        return db_name

    with _lock:
        if db_name in _provisioned_dbs:
            return db_name

        with get_master_conn() as mconn:
            row = mconn.execute(
                "SELECT db_name FROM campaign_registry WHERE slug = %s", (slug,)
            ).fetchone()
            if not row:
                try:
                    mconn.execute(
                        "INSERT INTO campaign_registry (slug, db_name, created_at) VALUES (%s, %s, %s)",
                        (slug, db_name, datetime.utcnow().isoformat()),
                    )
                except pymysql.err.IntegrityError:
                    # Lost a race with a concurrent first-touch of this slug.
                    row = mconn.execute(
                        "SELECT db_name FROM campaign_registry WHERE slug = %s", (slug,)
                    ).fetchone()
                    db_name = row["db_name"]

        _create_database_if_missing(db_name)
        _init_campaign_schema(db_name)
        _provisioned_dbs.add(db_name)

    return db_name


@contextmanager
def get_campaign_conn(slug: str):
    """Connects to `slug`'s own database (auto-provisioning it on first
    touch, same as the old shared-schema `_get_or_create_campaign_by_slug`
    used to do at the row level). Every gameplay/admin endpoint scoped to
    one tombola goes through this instead of `get_master_conn` now."""
    slug = (slug or "").strip()
    if not slug:
        raise HTTPException(status_code=400, detail="slug is required.")
    db_name = _ensure_campaign_db(slug)
    conn = pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=db_name,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )
    try:
        yield _ConnWrapper(conn)
        conn.commit()
    finally:
        conn.close()


class _ConnWrapper:
    """Thin wrapper giving the sqlite3-style `conn.execute(sql, params)`
    convenience method used throughout this file. DictCursor already
    returns rows as plain dicts, so no row-conversion is needed here."""

    def __init__(self, conn: pymysql.connections.Connection):
        self._conn = conn

    def execute(self, sql: str, params=()):
        cur = self._conn.cursor()
        cur.execute(sql, params)
        return cur  # supports .fetchone() / .fetchall() / .lastrowid directly

    def executescript(self, script: str) -> None:
        # PyMySQL doesn't run multi-statement scripts in one execute() call
        # by default, so split on ';' and run each statement individually.
        cur = self._conn.cursor()
        for statement in script.split(";"):
            statement = statement.strip()
            if statement:
                cur.execute(statement)

    def commit(self) -> None:
        self._conn.commit()


# --------------------------------------------------------------------------
# Pydantic Models
# --------------------------------------------------------------------------

class DiceRollRequest(BaseModel):
    user_id: Optional[str] = None

class DiceRollResponse(BaseModel):
    value: int
    distribution: dict
    pick_limit: int

class PlayRequest(BaseModel):
    slug: str
    user_id: Optional[str] = None
    pick_limit: int = PICK_LIMIT_DEFAULT

class PlayResponse(BaseModel):
    prizes: list[float]
    total: float

# --------------------------------------------------------------------------
# Prize odds — the admin-editable {amount, probability%} ladder that backs
# `prizes` (the table `/api/play` draws from for Cards/Cups). This is a
# separate, simpler concept from `prize_tiers` above: no named tiers, no
# max-winners cap, no lose-tier flag — just "this amount, this % chance",
# mirroring the frontend admin's Prizes page exactly.
# --------------------------------------------------------------------------

class PrizeOddsItem(BaseModel):
    amount: float
    probability: float  # relative weight, 0-100; the whole ladder need not
                         # sum to exactly 100 (random.choices only cares
                         # about ratios) but the admin UI nudges toward it.

class PrizeOddsConfig(BaseModel):
    prizes: list[PrizeOddsItem]

class ReceiptValidationResponse(BaseModel):
    success: bool
    receipt: Optional[dict]
    errors: list[str]

class ReceiptOut(BaseModel):
    """A row from `receipts` — every receipt that passed OCR + duplicate +
    minimum-amount + product-rule validation (see `validate_receipt` below;
    failed scans are never inserted, so every row here is by definition a
    valid ticket). Powers the admin's "Tickets scanned" view."""
    id: int
    receipt_number: Optional[str] = None
    store: Optional[str] = None
    total: float
    user_id: Optional[str] = None
    created_at: str

class ReceiptItemOut(BaseModel):
    """A row from `receipt_items` — one OCR'd line from a validated receipt,
    and whichever configured article (if any) it matched closely enough to
    count toward the product rules. `matched_article_code` is null when the
    line didn't match anything (e.g. "FILET DE POULET" on a receipt whose
    rules only care about a specific brand) — `match_score` is still filled
    in even then, so it's visible how close the nearest miss came."""
    id: int
    description: str
    quantity: int
    unit_price: float
    line_total: float
    matched_article_code: Optional[str] = None
    matched_article_libelle: Optional[str] = None
    match_score: float

# --------------------------------------------------------------------------
# Clients (participants) — identified by phone number, so a duplicate entry
# can be blocked and a winner's identity can be confirmed at prize pickup.
# --------------------------------------------------------------------------

class ClientVerifyRequest(BaseModel):
    phone_number: str
    full_name: Optional[str] = None

class ClientOut(BaseModel):
    id: int
    phone_number: str
    full_name: Optional[str] = None
    created_at: str

# --------------------------------------------------------------------------
# Prize tiers — the admin-editable probability table (replaces a flat
# weight/budget model with named tiers, a % chance each, and a hard cap on
# how many winners a tier can produce).
# --------------------------------------------------------------------------

class PrizeTierCreate(BaseModel):
    name: str
    prize_fr: str
    prize_ar: str
    probability_percent: float
    is_lose_tier: bool = False
    max_winners: Optional[int] = None
    sort_order: int = 0

class PrizeTierUpdate(BaseModel):
    name: Optional[str] = None
    prize_fr: Optional[str] = None
    prize_ar: Optional[str] = None
    probability_percent: Optional[float] = None
    is_lose_tier: Optional[bool] = None
    max_winners: Optional[int] = None
    sort_order: Optional[int] = None

class PrizeTierOut(BaseModel):
    id: int
    campaign_id: int
    name: str
    prize_fr: str
    prize_ar: str
    probability_percent: float
    is_lose_tier: bool
    max_winners: Optional[int] = None
    winners_count: int
    sort_order: int

# --------------------------------------------------------------------------
# Participations — one row per play (win or lose), linked to the verified
# client and (when a win) to the prize tier drawn.
# --------------------------------------------------------------------------

class ParticipateRequest(BaseModel):
    slug: str
    phone_number: str
    full_name: Optional[str] = None
    bill_image_path: Optional[str] = None
    bill_hash: Optional[str] = None
    # When set, this call is recording the result of a draw that already
    # happened elsewhere (the real money draw is /api/play — Dice/Cards/
    # Cups/Wheel) instead of running its own prize_tiers draw. Lets the
    # public site register who played and what they actually won without
    # a second, independent (and inconsistent) draw. amount=0 means "played,
    # didn't win". Omit entirely to keep the old behavior (this endpoint
    # draws its own prize tier) for any other caller.
    amount: Optional[float] = None

class ParticipationOut(BaseModel):
    id: int
    client_id: int
    phone_number: str
    prize_tier_id: Optional[int] = None
    is_winner: bool
    prize_fr: str
    prize_ar: str
    participation_date: str

# Default prize label written on a manual "Tirer au sort" draw when the
# admin doesn't type a custom one (see draw_random_winner below).
DEFAULT_RAFFLE_PRIZE_TEXT = ("Gagnant du tirage au sort", "فائز بالسحب العشوائي")

class DrawWinnerRequest(BaseModel):
    exclude_winners: bool = False
    prize_fr: Optional[str] = None
    prize_ar: Optional[str] = None

# --------------------------------------------------------------------------
# Product eligibility rules — which catalog articles (and price/quantity
# thresholds) a receipt must contain to qualify, as configured by the admin.
# --------------------------------------------------------------------------

class ArticleRule(BaseModel):
    code: str
    libelle: str
    marq: Optional[str] = None
    fournisseur: Optional[str] = None
    price: Optional[float] = None
    gencode: Optional[str] = None    # EAN barcode, informational — carried
                                      # through from the catalog picker so it
                                      # round-trips instead of being dropped
    rayon: Optional[str] = None      # category, informational — carried through
                                      # so "group by rayon" still works after reload
    famille: Optional[str] = None
    ruleType: Optional[str] = None   # "quantity" | "price" — required in per_article mode
    threshold: Optional[float] = None

class CombinedRule(BaseModel):
    ruleType: str                    # "quantity" | "price"
    threshold: float

class ProductRules(BaseModel):
    mode: str = "per_article"        # "per_article" | "combined"
    articles: list[ArticleRule] = []
    combinedRule: Optional[CombinedRule] = None
    # per_article mode only: how many of `articles` must individually satisfy
    # their own ruleType/threshold for the receipt to qualify. 1 (default) is
    # the original OR-across-articles behavior; raising it requires several
    # distinct selected articles to each show up before the receipt counts.
    minMatches: int = 1

# --------------------------------------------------------------------------
# Campaign lifecycle — whether this tombola is currently open to play at
# all. `active=False` or a passed `end_date` means "permanently ended";
# `maintenance_mode=True` means "temporarily paused, will resume" — the two
# are intentionally independent (see _lifecycle_block below).
# --------------------------------------------------------------------------

class CampaignLifecycle(BaseModel):
    active: Optional[bool] = None
    end_date: Optional[str] = None
    maintenance_mode: Optional[bool] = None

# --------------------------------------------------------------------------
# Campaign CRUD models (full JSON config stored per campaign)
# --------------------------------------------------------------------------

class CampaignRecord(BaseModel):
    """Full campaign config as produced by the platform UI (Campaign type)."""
    id: str
    name: str
    slug: str
    status: str = "draft"
    description: str = ""
    template: str = "modern"
    language: str = "fr"
    createdAt: str = ""
    updatedAt: str = ""
    domain: str = ""
    brand: dict = {}
    theme: dict = {}
    pages: list = []
    game: dict = {}
    products: list = []
    prizes: list = []
    assets: list = []
    translations: list = []
    schedule: dict = {}
    permissions: dict = {}
    analytics: dict = {}

# --------------------------------------------------------------------------
# Admin auth models
# --------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str

class AdminUserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    campaign_slug: Optional[str] = None
    active: bool
    created_at: str

class LoginResponse(BaseModel):
    token: str
    user: AdminUserOut

class AuditLogEntryOut(BaseModel):
    id: int
    admin_id: Optional[int] = None
    admin_email: str
    action: str
    detail: str
    created_at: str

class AdminUserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str  # 'super_admin' | 'tombola_admin'
    campaign_slug: Optional[str] = None

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    campaign_slug: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None

# --------------------------------------------------------------------------
# FastAPI App
# --------------------------------------------------------------------------

app = FastAPI(title="Tombola Prize Engine")

# Comma-separated list of origins allowed to call this API, e.g.
# "https://marjane-tombola.azurestaticapps.net,https://tombola.marjane.ma".
# Defaults to the local Vite dev server so `npm run dev` keeps working with
# zero setup — a deployed frontend MUST set this env var to its real origin
# before going live; without it, "*" would let any website call the admin
# API (JWT-in-header, so not a CSRF risk, but still an open door for
# scraping/abuse). See DEPLOY.md.
_default_origins = "http://127.0.0.1:8443,http://localhost:8443,http://127.0.0.1:5173,http://localhost:5173"
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("CORS_ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# Rate limiting — in-memory, per-process (fine at this app's current single-
# instance scale; would need a shared backend like Redis if this ever runs
# behind more than one worker/instance). Applied only to the public,
# unauthenticated endpoints below that either cost money (OCR) or hand out
# something of value (a tombola entry), to blunt scripted abuse without
# throttling normal admin dashboard usage.
# --------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

@app.get("/health")
def health():
    """Cheap liveness check for Azure App Service / uptime monitors — no DB
    hit, so it still answers even if MySQL is unreachable (which is exactly
    the case you want a monitor to be able to tell apart from "process is
    dead")."""
    return {"status": "ok"}

# --------------------------------------------------------------------------
# Admin auth — password hashing, JWT issuing/verification, and the two
# FastAPI dependencies every admin/campaign endpoint below is gated by.
# `require_campaign_access` is the one that actually implements "a
# tombola_admin may only touch the one tombola they were assigned" — it
# reads `slug` from the same query param the route itself declares, so
# adding it to an endpoint's dependencies is a one-line change.
# --------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False

def create_token(user: dict) -> str:
    payload = {
        # PyJWT validates the "sub" claim as a string (RFC 7519) — passing
        # the raw int id fails decode with InvalidSubjectError even though
        # encode accepts it silently. Cast here, cast back with int() in
        # get_current_user below.
        "sub": str(user["id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "slug": user["campaign_slug"],
        "exp": datetime.utcnow() + timedelta(hours=ADMIN_TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm=ADMIN_JWT_ALGORITHM)

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=[ADMIN_JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired, please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session token.")

    with get_master_conn() as conn:
        row = conn.execute(
            "SELECT id, name, email, role, campaign_slug, active FROM admin_users WHERE id = %s",
            (int(payload["sub"]),),
        ).fetchone()
    if not row or not row["active"]:
        raise HTTPException(status_code=401, detail="Account no longer active.")
    return row

def require_super_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Platform admin access required.")
    return user

def require_campaign_access(slug: str, user: dict = Depends(get_current_user)) -> dict:
    """Every gameplay/admin endpoint that takes a `slug` query param depends
    on this. A super_admin passes through unconditionally; a tombola_admin
    only passes for the one slug they were assigned — any other slug is a
    403, whether that's a stray click or a hand-crafted request."""
    if user["role"] == "super_admin":
        return user
    if user["role"] == "tombola_admin" and user["campaign_slug"] == slug:
        return user
    raise HTTPException(status_code=403, detail="You are not authorized to manage this tombola.")

# --------------------------------------------------------------------------
# DB setup
# --------------------------------------------------------------------------

def init_master_db() -> None:
    """Creates the master/control DB's platform-wide tables: `campaign_registry`
    (slug -> per-tombola db_name routing), the shared `clients` table, and
    `campaign_config`. Each tombola's own game-engine schema (campaigns,
    receipts, prizes, winners, prize_tiers, participations) is created
    lazily on first touch instead — see `_ensure_campaign_db` /
    `_init_campaign_schema`."""
    with get_master_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS campaign_registry (
                slug VARCHAR(255) PRIMARY KEY,
                db_name VARCHAR(64) NOT NULL UNIQUE,
                created_at VARCHAR(64) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS campaign_config (
                id VARCHAR(64) PRIMARY KEY,
                slug VARCHAR(255) NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'draft',
                config LONGTEXT NOT NULL,
                updated_at VARCHAR(64) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS clients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phone_number VARCHAR(20) NOT NULL UNIQUE,
                full_name VARCHAR(255) NULL,
                created_at VARCHAR(64) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL,
                campaign_slug VARCHAR(255) NULL,
                active TINYINT(1) NOT NULL DEFAULT 1,
                created_at VARCHAR(64) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS admin_audit_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT NULL,
                admin_email VARCHAR(255) NOT NULL,
                action VARCHAR(100) NOT NULL,
                detail VARCHAR(1000) NOT NULL DEFAULT '',
                created_at VARCHAR(64) NOT NULL,
                INDEX (created_at)
            );
            """
        )


def _bootstrap_super_admin() -> None:
    """Seeds exactly one super_admin account (from SUPER_ADMIN_EMAIL/
    SUPER_ADMIN_PASSWORD) the first time the app ever boots against an
    empty `admin_users` table. Every account after this one — super_admin
    or tombola_admin — is created through POST /api/admin/users by an
    existing super_admin, not through env vars."""
    with get_master_conn() as conn:
        existing = conn.execute("SELECT COUNT(*) c FROM admin_users").fetchone()
        if existing["c"] > 0:
            return
        conn.execute(
            "INSERT INTO admin_users (name, email, password_hash, role, campaign_slug, active, created_at) "
            "VALUES (%s, %s, %s, %s, NULL, 1, %s)",
            (
                "Administrator",
                SUPER_ADMIN_EMAIL.strip().lower(),
                hash_password(SUPER_ADMIN_PASSWORD),
                "super_admin",
                datetime.utcnow().isoformat(),
            ),
        )


def _audit(actor: dict, action: str, detail: str = "") -> None:
    """Appends one row to admin_audit_log — "who changed what, and when",
    for the mutating admin endpoints below (accounts, prize odds/tiers,
    campaign lifecycle). Best-effort: a logging failure must never break
    the actual admin action it's recording, so this swallows its own
    errors rather than propagating them.

    admin_id has no foreign key on purpose — a deleted admin's past actions
    should stay in the log, not disappear or block the deletion."""
    try:
        with get_master_conn() as conn:
            conn.execute(
                "INSERT INTO admin_audit_log (admin_id, admin_email, action, detail, created_at) "
                "VALUES (%s, %s, %s, %s, %s)",
                (actor.get("id"), actor.get("email", "unknown"), action, detail[:1000], datetime.utcnow().isoformat()),
            )
    except Exception as e:  # noqa: BLE001 - logging must never break the caller
        print(f"[audit] failed to record {action!r}: {e}")


# Default flat amount/weight ladder for a brand-new campaign — used by
# _get_or_create_campaign's auto-provisioning of every tombola's first-ever
# (and only) campaigns row.
DEFAULT_PRIZE_ODDS = [
    (0, 70.0, 0),
    (10, 20.0, 3000),
    (20, 8.0, 1000),
    (50, 1.8, 400),
    (100, 0.2, 300),
]


def _insert_default_prize_odds(conn: _ConnWrapper, campaign_id: int) -> None:
    for amount, weight, qty in DEFAULT_PRIZE_ODDS:
        conn.execute(
            "INSERT INTO prizes (campaign_id, amount, weight, quantity, remaining_quantity) "
            "VALUES (%s, %s, %s, %s, %s)",
            (campaign_id, amount, weight, qty, qty),
        )


# Example prize tiers, mirroring the reference probability table:
# (name, prize_fr, prize_ar, probability_percent, is_lose_tier, max_winners)
DEFAULT_PRIZE_TIERS = [
    ("PALIER 0", "Merci", "شكراً", 60, True, None),
    ("PALIER 1", "100 DH", "100 DH", 8, False, 12),
    ("PALIER 2", "200 DH", "200 DH", 8, False, 12),
    ("PALIER 3", "300 DH", "300 DH", 8, False, 12),
    ("PALIER 4", "400 DH", "400 DH", 8, False, 12),
    ("PALIER 5", "500 DH", "500 DH", 8, False, 8),
]


def _insert_default_prize_tiers(conn: _ConnWrapper, campaign_id: int) -> None:
    for order, (name, prize_fr, prize_ar, pct, is_lose, max_winners) in enumerate(DEFAULT_PRIZE_TIERS):
        conn.execute(
            "INSERT INTO prize_tiers (campaign_id, name, prize_fr, prize_ar, probability_percent, "
            "is_lose_tier, max_winners, winners_count, sort_order) VALUES (%s, %s, %s, %s, %s, %s, %s, 0, %s)",
            (campaign_id, name, prize_fr, prize_ar, pct, is_lose, max_winners, order),
        )


@app.on_event("startup")
def _startup():
    init_master_db()
    _bootstrap_super_admin()
    catalog.load_catalog()

# --------------------------------------------------------------------------
# Admin auth + account management — two roles: `super_admin` (everything,
# every tombola) and `tombola_admin` (exactly the one tombola named in
# `campaign_slug`, enforced by `require_campaign_access` on every
# slug-scoped endpoint below). Only a super_admin can create/edit/delete
# accounts.
# --------------------------------------------------------------------------

def _row_to_admin_user_out(row: dict) -> AdminUserOut:
    return AdminUserOut(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        role=row["role"],
        campaign_slug=row["campaign_slug"],
        active=bool(row["active"]),
        created_at=row["created_at"],
    )

@app.post("/api/auth/login", response_model=LoginResponse)
@limiter.limit("10/minute")  # admin-only traffic, small volume — strict on purpose
def login(request: Request, req: LoginRequest):
    email = req.email.strip().lower()
    with get_master_conn() as conn:
        row = conn.execute("SELECT * FROM admin_users WHERE email = %s", (email,)).fetchone()
    if not row or not row["active"] or not verify_password(req.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_token(row)
    _audit(row, "login")
    return LoginResponse(token=token, user=_row_to_admin_user_out(row))

@app.get("/api/auth/me", response_model=AdminUserOut)
def get_me(user: dict = Depends(get_current_user)):
    return _row_to_admin_user_out(user)

@app.get("/api/admin/users", response_model=list[AdminUserOut])
def list_admin_users(_: dict = Depends(require_super_admin)):
    with get_master_conn() as conn:
        rows = conn.execute("SELECT * FROM admin_users ORDER BY created_at DESC").fetchall()
    return [_row_to_admin_user_out(r) for r in rows]

@app.get("/api/admin/audit-log", response_model=list[AuditLogEntryOut])
def list_audit_log(limit: int = 200, _: dict = Depends(require_super_admin)):
    """Who changed what, and when — platform-wide, not scoped to one
    tombola, so only a super_admin can read it (same as account management
    above)."""
    limit = max(1, min(limit, 500))
    with get_master_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM admin_audit_log ORDER BY id DESC LIMIT %s", (limit,)
        ).fetchall()
    return [AuditLogEntryOut(**r) for r in rows]

@app.post("/api/admin/users", response_model=AdminUserOut)
def create_admin_user(payload: AdminUserCreate, actor: dict = Depends(require_super_admin)):
    if payload.role not in ("super_admin", "tombola_admin"):
        raise HTTPException(status_code=422, detail="role must be 'super_admin' or 'tombola_admin'.")
    slug = payload.campaign_slug.strip() if payload.campaign_slug else None
    if payload.role == "tombola_admin" and not slug:
        raise HTTPException(status_code=422, detail="campaign_slug is required for a tombola_admin.")
    if payload.role == "super_admin":
        slug = None  # a platform admin isn't scoped to any one tombola
    if not payload.password or len(payload.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters.")

    email = payload.email.strip().lower()
    with get_master_conn() as conn:
        existing = conn.execute("SELECT 1 FROM admin_users WHERE email = %s", (email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="An account with that email already exists.")
        cur = conn.execute(
            "INSERT INTO admin_users (name, email, password_hash, role, campaign_slug, active, created_at) "
            "VALUES (%s, %s, %s, %s, %s, 1, %s)",
            (
                payload.name.strip(),
                email,
                hash_password(payload.password),
                payload.role,
                slug,
                datetime.utcnow().isoformat(),
            ),
        )
        row = conn.execute("SELECT * FROM admin_users WHERE id = %s", (cur.lastrowid,)).fetchone()
    _audit(actor, "create_admin_user", f"created {row['role']} account {row['email']!r}")
    return _row_to_admin_user_out(row)

@app.put("/api/admin/users/{user_id}", response_model=AdminUserOut)
def update_admin_user(user_id: int, payload: AdminUserUpdate, actor: dict = Depends(require_super_admin)):
    with get_master_conn() as conn:
        existing = conn.execute("SELECT * FROM admin_users WHERE id = %s", (user_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Account not found.")

        updates: dict = {}
        if payload.name is not None:
            updates["name"] = payload.name.strip()
        if payload.active is not None:
            updates["active"] = payload.active
        if payload.password:
            if len(payload.password) < 6:
                raise HTTPException(status_code=422, detail="Password must be at least 6 characters.")
            updates["password_hash"] = hash_password(payload.password)

        # role and campaign_slug are validated together, since a super_admin
        # must have no slug and a tombola_admin must have one.
        new_role = payload.role if payload.role is not None else existing["role"]
        if payload.role is not None or payload.campaign_slug is not None:
            if new_role not in ("super_admin", "tombola_admin"):
                raise HTTPException(status_code=422, detail="role must be 'super_admin' or 'tombola_admin'.")
            if new_role == "super_admin":
                updates["role"] = "super_admin"
                updates["campaign_slug"] = None
            else:
                new_slug = (
                    payload.campaign_slug.strip()
                    if payload.campaign_slug is not None
                    else existing["campaign_slug"]
                )
                if not new_slug:
                    raise HTTPException(status_code=422, detail="campaign_slug is required for a tombola_admin.")
                updates["role"] = "tombola_admin"
                updates["campaign_slug"] = new_slug

        if updates:
            set_clause = ", ".join(f"{k} = %s" for k in updates)
            conn.execute(
                f"UPDATE admin_users SET {set_clause} WHERE id = %s",
                (*updates.values(), user_id),
            )
        row = conn.execute("SELECT * FROM admin_users WHERE id = %s", (user_id,)).fetchone()
    _audit(actor, "update_admin_user", f"updated account {row['email']!r} ({', '.join(updates) or 'no changes'})")
    return _row_to_admin_user_out(row)

@app.delete("/api/admin/users/{user_id}")
def delete_admin_user(user_id: int, current: dict = Depends(require_super_admin)):
    if user_id == current["id"]:
        raise HTTPException(status_code=422, detail="You cannot delete your own account.")
    with get_master_conn() as conn:
        existing = conn.execute("SELECT email FROM admin_users WHERE id = %s", (user_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Account not found.")
        conn.execute("DELETE FROM admin_users WHERE id = %s", (user_id,))
    _audit(current, "delete_admin_user", f"deleted account {existing['email']!r}")
    return {"ok": True, "id": user_id}

# --------------------------------------------------------------------------
# Core draw logic
# --------------------------------------------------------------------------

def _get_or_create_campaign(conn) -> dict:
    """Every gameplay/admin endpoint calls this right after `get_campaign_conn(slug)`
    — `conn` is already scoped to that one tombola's own database (see
    `get_campaign_conn`), so this just needs "the one campaigns row in this
    database, or create it with default odds + tiers if this database was
    just provisioned for the first time." No slug filtering needed anymore:
    the database itself is the scope now, not a `slug` column."""
    row = conn.execute("SELECT * FROM campaigns LIMIT 1").fetchone()
    if row:
        return row

    now = datetime.utcnow()
    cur = conn.execute(
        "INSERT INTO campaigns (name, slug, budget, remaining_budget, start_date, end_date, active, "
        "dynamic_weighting, allowed_store, receipt_min_amount) VALUES (%s, %s, %s, %s, %s, %s, 1, 1, %s, %s)",
        (
            "New Campaign", None, 100000, 100000,
            now.isoformat(), (now + timedelta(days=365)).isoformat(),
            "marjane", 0,
        ),
    )
    campaign_id = cur.lastrowid
    _insert_default_prize_odds(conn, campaign_id)
    _insert_default_prize_tiers(conn, campaign_id)

    return conn.execute("SELECT * FROM campaigns WHERE id = %s", (campaign_id,)).fetchone()

def _lifecycle_block(campaign: dict) -> Optional[str]:
    """None = campaign is open to play. Otherwise the error code to surface
    — 'campaign_ended' (permanent: deactivated or past its end_date) takes
    priority over 'campaign_maintenance' (temporary, admin-toggled,
    independent of active/end_date) since a maintenance flag left on for an
    already-ended campaign shouldn't produce a "come back soon" message."""
    now = datetime.utcnow().isoformat()
    if not campaign["active"] or (campaign["end_date"] and now > campaign["end_date"]):
        return "campaign_ended"
    if campaign.get("maintenance_mode"):
        return "campaign_maintenance"
    return None

def _effective_weight(prize_row, dynamic: bool) -> float:
    if prize_row["quantity"] == 0:
        return prize_row["weight"]
    if not dynamic:
        return prize_row["weight"] if prize_row["remaining_quantity"] > 0 else 0.0
    ratio = prize_row["remaining_quantity"] / prize_row["quantity"]
    return prize_row["weight"] * ratio

def _draw_one(conn, campaign) -> float:
    prizes = conn.execute(
        "SELECT * FROM prizes WHERE campaign_id = %s AND (quantity = 0 OR remaining_quantity > 0)",
        (campaign["id"],),
    ).fetchall()

    affordable = [
        p for p in prizes if p["amount"] == 0 or p["amount"] <= campaign["remaining_budget"]
    ]
    if not affordable:
        return 0.0

    weights = [_effective_weight(p, bool(campaign["dynamic_weighting"])) for p in affordable]
    if sum(weights) <= 0:
        return 0.0

    chosen = random.choices(affordable, weights=weights, k=1)[0]

    if chosen["amount"] > 0:
        conn.execute(
            "UPDATE prizes SET remaining_quantity = remaining_quantity - 1 WHERE id = %s",
            (chosen["id"],),
        )
        conn.execute(
            "UPDATE campaigns SET remaining_budget = remaining_budget - %s WHERE id = %s",
            (chosen["amount"], campaign["id"]),
        )
        campaign = dict(campaign)
        campaign["remaining_budget"] -= chosen["amount"]

    return chosen["amount"]

def play_round(user_id: Optional[str], pick_limit: int, slug: str) -> list[float]:
    with _lock:
        with get_campaign_conn(slug) as conn:
            campaign_row = _get_or_create_campaign(conn)
            block = _lifecycle_block(campaign_row)
            if block:
                raise HTTPException(status_code=403, detail=block)
            campaign = dict(campaign_row)
            results = []
            for _ in range(pick_limit):
                amount = _draw_one(conn, campaign)
                if amount > 0:
                    campaign["remaining_budget"] -= amount
                results.append(amount)

            total = sum(results)
            # Record every round, win or lose (prize_amount=0 for a loss) —
            # this table is what `/api/admin/stats` counts "participants"
            # and "winning_rate" from, so a loss has to be a row too or the
            # win rate would trivially always compute to 100%.
            conn.execute(
                "INSERT INTO winners (campaign_id, user_id, prize_amount, created_at) VALUES (%s, %s, %s, %s)",
                (campaign["id"], user_id, total, datetime.utcnow().isoformat()),
            )
            return results

# --------------------------------------------------------------------------
# Prize-tier draw — a single weighted pick across a campaign's prize_tiers,
# honoring each tier's max_winners cap (a maxed-out tier drops out of the
# pool instead of ever being drawn again).
# --------------------------------------------------------------------------

def _draw_prize_tier(conn, campaign_id: int):
    tiers = conn.execute(
        "SELECT * FROM prize_tiers WHERE campaign_id = %s", (campaign_id,)
    ).fetchall()

    eligible = [
        t for t in tiers
        if t["is_lose_tier"] or t["max_winners"] is None or t["winners_count"] < t["max_winners"]
    ]
    if not eligible:
        return None

    weights = [t["probability_percent"] for t in eligible]
    if sum(weights) <= 0:
        return None

    return random.choices(eligible, weights=weights, k=1)[0]


def _get_or_create_client(conn, phone_number: str, full_name: Optional[str]) -> dict:
    phone_number = phone_number.strip()
    row = conn.execute(
        "SELECT * FROM clients WHERE phone_number = %s", (phone_number,)
    ).fetchone()
    if row:
        if full_name and not row["full_name"]:
            conn.execute(
                "UPDATE clients SET full_name = %s WHERE id = %s", (full_name, row["id"])
            )
            row = dict(row)
            row["full_name"] = full_name
        return row
    cur = conn.execute(
        "INSERT INTO clients (phone_number, full_name, created_at) VALUES (%s, %s, %s)",
        (phone_number, full_name, datetime.utcnow().isoformat()),
    )
    return {
        "id": cur.lastrowid,
        "phone_number": phone_number,
        "full_name": full_name,
        "created_at": datetime.utcnow().isoformat(),
    }

# --------------------------------------------------------------------------
# API Endpoints
# --------------------------------------------------------------------------

DICE_WEIGHTS = {
    1: 0.30,
    2: 0.27,
    3: 0.25,
    4: 0.11,
    5: 0.05,
    6: 0.02,
}

@app.post("/api/dice/roll", response_model=DiceRollResponse)
# Generous ceiling, not a precise per-player cap — real players behind a
# store's shared wifi/carrier NAT can legitimately share one public IP, so
# this exists to stop a runaway script, not to police normal traffic.
@limiter.limit("60/minute")
async def roll_dice(request: Request, req: DiceRollRequest):
    """Roll a weighted 6-sided die."""
    values = list(DICE_WEIGHTS.keys())
    weights = list(DICE_WEIGHTS.values())

    noisy_weights = [w + random.uniform(-0.005, 0.005) for w in weights]
    noisy_weights = [max(0.001, w) for w in noisy_weights]

    total = sum(noisy_weights)
    noisy_weights = [w / total for w in noisy_weights]

    value = random.choices(values, weights=noisy_weights, k=1)[0]
    pick_limit = min(value, 6)

    return DiceRollResponse(
        value=value,
        distribution=DICE_WEIGHTS,
        pick_limit=pick_limit
    )

@app.post("/api/play", response_model=PlayResponse)
@limiter.limit("60/minute")  # see roll_dice above for why this ceiling is generous
def play(request: Request, req: PlayRequest):
    prizes = play_round(req.user_id, req.pick_limit, req.slug)
    return PlayResponse(prizes=prizes, total=sum(prizes))

# --------------------------------------------------------------------------
# Prize odds — admin reads/replaces the active campaign's `prizes` ladder
# (the amount/weight pairs `_draw_one` above actually draws from). This is
# what the frontend's Prizes page calls whenever the admin edits a segment's
# value or probability, so Cards/Cups draws (server-authoritative via
# /api/play) honor the same odds the admin sees and the Wheel game already
# draws with client-side.
# --------------------------------------------------------------------------

@app.get("/api/admin/prizes", response_model=PrizeOddsConfig)
def get_prize_odds(slug: str, _: dict = Depends(require_campaign_access)):
    with get_campaign_conn(slug) as conn:
        campaign = _get_or_create_campaign(conn)
        rows = conn.execute(
            "SELECT amount, weight FROM prizes WHERE campaign_id = %s ORDER BY id",
            (campaign["id"],),
        ).fetchall()
    return PrizeOddsConfig(
        prizes=[PrizeOddsItem(amount=r["amount"], probability=r["weight"]) for r in rows]
    )

@app.put("/api/admin/prizes", response_model=PrizeOddsConfig)
def put_prize_odds(slug: str, config: PrizeOddsConfig, actor: dict = Depends(require_campaign_access)):
    if not config.prizes:
        raise HTTPException(status_code=422, detail="At least one prize is required.")
    if any(p.probability < 0 for p in config.prizes):
        raise HTTPException(status_code=422, detail="Probability cannot be negative.")
    if sum(p.probability for p in config.prizes) <= 0:
        raise HTTPException(status_code=422, detail="At least one prize needs a probability above 0.")

    with get_campaign_conn(slug) as conn:
        campaign = _get_or_create_campaign(conn)
        # Replace the whole ladder — this admin screen is the single source
        # of truth for draw odds. Stock/budget caps stay unlimited
        # (quantity = 0) here, same as every prize before this feature
        # existed; per-prize stock limits are a separate concern (see the
        # Rewards catalog's `stock` field) this endpoint doesn't touch.
        conn.execute("DELETE FROM prizes WHERE campaign_id = %s", (campaign["id"],))
        for p in config.prizes:
            conn.execute(
                "INSERT INTO prizes (campaign_id, amount, weight, quantity, remaining_quantity) "
                "VALUES (%s, %s, %s, 0, 0)",
                (campaign["id"], p.amount, p.probability),
            )
    _audit(actor, "update_prize_odds", f"replaced prize ladder for {slug!r} ({len(config.prizes)} prizes)")
    return get_prize_odds(slug)

# --------------------------------------------------------------------------
# Receipt OCR + parsing
# --------------------------------------------------------------------------

KNOWN_STORES = ["marjane"]
MARJANE_SIGNATURE_CHECKS = {
    "brand_name": re.compile(r"marjane", re.IGNORECASE),
    "ice_number": re.compile(r"ice\s*[:.]?\s*\d{9,}", re.IGNORECASE),
    "tp_number": re.compile(r"\btp\s*[:.]?\s*\d{3,}", re.IGNORECASE),
    "operation_vente": re.compile(r"operation\s*[:.]?\s*vente", re.IGNORECASE),
    "nombre_articles": re.compile(r"nombre\s*articles", re.IGNORECASE),
    "total_line": re.compile(r"total", re.IGNORECASE),
}
MARJANE_SIGNATURE_MIN_SCORE = 4

def marjane_signature_score(text: str) -> tuple[int, list[str]]:
    matched = [name for name, pattern in MARJANE_SIGNATURE_CHECKS.items() if pattern.search(text)]
    return len(matched), matched

def run_ocr(image_bytes: bytes, filename: str) -> str:
    files = {"file": (filename, image_bytes)}
    data = {"OCREngine": "2", "scale": "true", "language": "fre"}
    resp = requests.post(
        OCR_API_URL,
        headers={"apikey": OCR_API_KEY},
        files=files,
        data=data,
        timeout=20,
    )
    resp.raise_for_status()
    payload = resp.json()
    if payload.get("IsErroredOnProcessing"):
        msg = (payload.get("ErrorMessage") or ["OCR error"])[0]
        raise RuntimeError(msg)
    return payload.get("ParsedResults", [{}])[0].get("ParsedText", "")

def extract_total(text: str) -> float:
    lines = text.split("\n")
    total_regex = re.compile(r"total[^\d]{0,12}(\d+[.,]\d{1,2}|\d+)", re.IGNORECASE)
    for line in reversed(lines):
        m = total_regex.search(line)
        if m:
            return round(float(m.group(1).replace(",", ".")))
    prices = [float(m.replace(",", ".")) for m in re.findall(r"\d+[.,]\d{2}", text)]
    return round(max(prices)) if prices else 0.0

def extract_store(text: str) -> str:
    lowered = text.lower()
    for name in KNOWN_STORES:
        if name in lowered:
            return name.title()
    return "Unknown"

def extract_receipt_number(text: str) -> str:
    m = re.search(r"(?:receipt|ticket|reçu|n[°o]?)[^\d]{0,6}(\d{5,})", text, re.IGNORECASE)
    if m:
        return m.group(1)
    digit_runs = re.findall(r"\d{5,}", text)
    return max(digit_runs, key=len) if digit_runs else ""

def extract_date(text: str) -> str:
    m = re.search(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", text)
    return m.group(1) if m else ""

def parse_receipt(text: str) -> dict:
    return {
        "store": extract_store(text),
        "total": extract_total(text),
        "receiptNumber": extract_receipt_number(text),
        "date": extract_date(text),
    }

@app.post("/api/receipt/validate", response_model=ReceiptValidationResponse)
@limiter.limit("30/minute")  # each hit costs a paid OCR.space call — tighter than the others on purpose
async def validate_receipt(
    request: Request,
    file: UploadFile = File(...),
    slug: str = Form(...),
    user_id: Optional[str] = Form(None),
):
    image_bytes = await file.read()
    if len(image_bytes) > MAX_RECEIPT_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Receipt image is too large (max 10 MB).")
    image_hash = hashlib.sha256(image_bytes).hexdigest()

    with get_campaign_conn(slug) as conn:
        campaign = _get_or_create_campaign(conn)
        block = _lifecycle_block(campaign)
        if block:
            # Checked before the OCR call (not just added to `errors` after
            # the fact) so a blocked campaign doesn't spend a paid OCR.space
            # request on a scan that was never going to count anyway.
            return ReceiptValidationResponse(success=False, receipt=None, errors=[block])

        try:
            text = run_ocr(image_bytes, file.filename or "receipt.jpg")
        except Exception:
            return ReceiptValidationResponse(success=False, receipt=None, errors=["ocr_failed"])

        parsed = parse_receipt(text)
        # Carried through so the frontend can hand it back on /api/participate
        # as bill_hash — the same dedup key this endpoint already checks
        # against `receipts`, now enforceable at the participation step too.
        parsed["imageHash"] = image_hash
        errors: list[str] = []

        score, matched_markers = marjane_signature_score(text)
        if score < MARJANE_SIGNATURE_MIN_SCORE:
            errors.append("invalid_receipt_format")

        dup = conn.execute(
            "SELECT 1 FROM receipts WHERE campaign_id = %s AND "
            "(image_hash = %s OR (receipt_number != '' AND receipt_number = %s))",
            (campaign["id"], image_hash, parsed["receiptNumber"]),
        ).fetchone()
        if dup:
            errors.append("duplicate_receipt")

        if parsed["total"] < campaign["receipt_min_amount"]:
            errors.append("below_minimum")

        product_rules_raw = campaign.get("product_rules")
        rules: dict = {}
        if product_rules_raw:
            try:
                rules = json.loads(product_rules_raw)
            except Exception:
                rules = {}

        # Extracted unconditionally (not just when rules are configured) so
        # a validated receipt's items get stored below regardless — useful
        # on its own even for a campaign with no product rules set yet.
        line_items = extract_line_items(text)
        if rules.get("articles"):
            if not evaluate_product_rules(line_items, rules):
                errors.append("no_qualifying_articles")

        success = len(errors) == 0
        if success:
            cur = conn.execute(
                "INSERT INTO receipts (campaign_id, receipt_number, image_hash, store, total, user_id, created_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (
                    campaign["id"],
                    parsed["receiptNumber"],
                    image_hash,
                    parsed["store"],
                    parsed["total"],
                    user_id,
                    datetime.utcnow().isoformat(),
                ),
            )
            receipt_id = cur.lastrowid
            # Stores what the OCR actually read against this tombola's
            # configured articles (matched code/libelle + fuzzy score per
            # line) — only for validated receipts, per the scope decided:
            # a rejected scan still isn't persisted at all (see docstring
            # above list_receipts).
            for item in match_receipt_items(line_items, rules.get("articles") or []):
                conn.execute(
                    "INSERT INTO receipt_items (receipt_id, description, quantity, unit_price, line_total, "
                    "matched_article_code, matched_article_libelle, match_score) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    (
                        receipt_id,
                        item["description"],
                        item["quantity"],
                        item["unit_price"],
                        item["line_total"],
                        item["matched_article_code"],
                        item["matched_article_libelle"],
                        item["match_score"],
                    ),
                )

        # Best-effort debug snapshot of THIS scan's real OCR output — a
        # rejected scan leaves no other trace (receipt_items is only
        # written for validated receipts, by design), so without this
        # there's no way to see what OCR.space actually read once the
        # request has returned. Always overwritten, never raises (must
        # never break the real response), not persisted to the DB.
        try:
            debug_path = os.path.join(os.path.dirname(__file__), "last_scan_debug.txt")
            with open(debug_path, "w", encoding="utf-8") as f:
                f.write(f"slug: {slug}\n")
                f.write(f"timestamp: {datetime.utcnow().isoformat()}\n")
                f.write(f"success: {success}\n")
                f.write(f"errors: {errors}\n")
                f.write(f"parsed: {parsed}\n")
                f.write("\n=== raw OCR text ===\n")
                f.write(text)
                f.write("\n\n=== extracted line items ===\n")
                for it in line_items:
                    f.write(f"{it}\n")
                if rules.get("articles"):
                    f.write("\n=== match against configured articles ===\n")
                    for m in match_receipt_items(line_items, rules["articles"]):
                        f.write(f"{m}\n")
        except Exception:
            pass

        return ReceiptValidationResponse(success=success, receipt=parsed, errors=errors)

# --------------------------------------------------------------------------
# Clients — verify/register a participant by phone number before they play,
# and let staff look a client up later to confirm identity at prize pickup.
# --------------------------------------------------------------------------

@app.post("/api/clients/verify", response_model=ClientOut)
@limiter.limit("30/minute")
def verify_client(request: Request, req: ClientVerifyRequest):
    if not req.phone_number.strip():
        raise HTTPException(status_code=422, detail="phone_number is required.")
    with get_master_conn() as conn:
        client = _get_or_create_client(conn, req.phone_number, req.full_name)
    return ClientOut(**client)

@app.get("/api/admin/clients/{phone_number}", response_model=ClientOut)
def get_client(phone_number: str, _: dict = Depends(require_super_admin)):
    # Previously had NO auth at all — anyone could pull a customer's full
    # name off just their phone number. super_admin-only for now (no
    # frontend caller exists yet — grep confirms it — so there's no known
    # tombola_admin use case to accommodate); loosen to
    # require_campaign_access if/when a real caller needs it scoped to one
    # tombola instead of platform-wide.
    with get_master_conn() as conn:
        row = conn.execute(
            "SELECT * FROM clients WHERE phone_number = %s", (phone_number,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="No client with that phone number.")
    return ClientOut(**row)

# --------------------------------------------------------------------------
# Prize tiers — admin-editable probability table for the active campaign.
# --------------------------------------------------------------------------

@app.get("/api/admin/prize-tiers", response_model=list[PrizeTierOut])
def list_prize_tiers(slug: str, _: dict = Depends(require_campaign_access)):
    with get_campaign_conn(slug) as conn:
        campaign = _get_or_create_campaign(conn)
        rows = conn.execute(
            "SELECT * FROM prize_tiers WHERE campaign_id = %s ORDER BY sort_order, id",
            (campaign["id"],),
        ).fetchall()
    return [PrizeTierOut(**r) for r in rows]

@app.post("/api/admin/prize-tiers", response_model=PrizeTierOut)
def create_prize_tier(slug: str, tier: PrizeTierCreate, actor: dict = Depends(require_campaign_access)):
    with get_campaign_conn(slug) as conn:
        campaign = _get_or_create_campaign(conn)
        cur = conn.execute(
            "INSERT INTO prize_tiers (campaign_id, name, prize_fr, prize_ar, probability_percent, "
            "is_lose_tier, max_winners, winners_count, sort_order) VALUES (%s, %s, %s, %s, %s, %s, %s, 0, %s)",
            (
                campaign["id"], tier.name, tier.prize_fr, tier.prize_ar, tier.probability_percent,
                tier.is_lose_tier, tier.max_winners, tier.sort_order,
            ),
        )
        row = conn.execute("SELECT * FROM prize_tiers WHERE id = %s", (cur.lastrowid,)).fetchone()
    _audit(actor, "create_prize_tier", f"created tier {row['name']!r} on {slug!r}")
    return PrizeTierOut(**row)

@app.put("/api/admin/prize-tiers/{tier_id}", response_model=PrizeTierOut)
def update_prize_tier(tier_id: int, slug: str, tier: PrizeTierUpdate, actor: dict = Depends(require_campaign_access)):
    # `slug` is now required (wasn't before) — `tier_id` used to be globally
    # unique in the old shared DB, but each tombola has its own database now,
    # so we have to be told which one to look in before `tier_id` means
    # anything. Not a live regression: grep confirms the frontend doesn't
    # call this endpoint yet.
    updates = {k: v for k, v in tier.model_dump().items() if v is not None}
    with get_campaign_conn(slug) as conn:
        existing = conn.execute("SELECT * FROM prize_tiers WHERE id = %s", (tier_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Prize tier not found.")
        if updates:
            set_clause = ", ".join(f"{k} = %s" for k in updates)
            conn.execute(
                f"UPDATE prize_tiers SET {set_clause} WHERE id = %s",
                (*updates.values(), tier_id),
            )
        row = conn.execute("SELECT * FROM prize_tiers WHERE id = %s", (tier_id,)).fetchone()
    _audit(actor, "update_prize_tier", f"updated tier {row['name']!r} on {slug!r} ({', '.join(updates) or 'no changes'})")
    return PrizeTierOut(**row)

@app.delete("/api/admin/prize-tiers/{tier_id}")
def delete_prize_tier(tier_id: int, slug: str, actor: dict = Depends(require_campaign_access)):
    with get_campaign_conn(slug) as conn:
        existing = conn.execute("SELECT * FROM prize_tiers WHERE id = %s", (tier_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Prize tier not found.")
        conn.execute("DELETE FROM prize_tiers WHERE id = %s", (tier_id,))
    _audit(actor, "delete_prize_tier", f"deleted tier {existing['name']!r} on {slug!r}")
    return {"ok": True, "id": tier_id}

# --------------------------------------------------------------------------
# Participate — verify the client by phone, draw a prize tier (respecting
# max_winners caps), and record the play as a Participation row.
# --------------------------------------------------------------------------

@app.post("/api/participate", response_model=ParticipationOut)
@limiter.limit("30/minute")  # hands out an actual tombola entry — see roll_dice above for the reasoning
def participate(request: Request, req: ParticipateRequest):
    if not req.phone_number.strip():
        raise HTTPException(status_code=422, detail="phone_number is required.")

    with _lock:
        # `clients` lives in the master DB (shared across every tombola per
        # the user's decision), while everything else below is scoped to
        # this one tombola's own database — they can no longer share a
        # single transaction, so the client lookup/create is its own
        # short-lived connection first.
        with get_master_conn() as mconn:
            client = _get_or_create_client(mconn, req.phone_number, req.full_name)

        with get_campaign_conn(req.slug) as conn:
            campaign = _get_or_create_campaign(conn)
            block = _lifecycle_block(campaign)
            if block:
                raise HTTPException(status_code=403, detail=block)

            if req.bill_hash:
                dup = conn.execute(
                    "SELECT 1 FROM participations WHERE campaign_id = %s AND bill_hash = %s",
                    (campaign["id"], req.bill_hash),
                ).fetchone()
                if dup:
                    raise HTTPException(status_code=409, detail="This receipt has already been used.")

            if req.amount is not None:
                # The draw already happened via /api/play (Dice/Cards/Cups)
                # or the Wheel's local draw — just record the outcome
                # against this client instead of drawing a second, separate
                # prize_tiers result that could disagree with what the
                # player was actually shown.
                is_winner = req.amount > 0
                prize_tier_id = None
                if is_winner:
                    amount_label = f"{req.amount:g} DH"
                    prize_fr, prize_ar = amount_label, amount_label
                else:
                    prize_fr, prize_ar = LOSE_PRIZE_TEXT
            else:
                tier = _draw_prize_tier(conn, campaign["id"])

                if tier is not None and not tier["is_lose_tier"]:
                    conn.execute(
                        "UPDATE prize_tiers SET winners_count = winners_count + 1 WHERE id = %s",
                        (tier["id"],),
                    )
                    is_winner = True
                    prize_tier_id = tier["id"]
                    prize_fr, prize_ar = tier["prize_fr"], tier["prize_ar"]
                else:
                    is_winner = False
                    prize_tier_id = None
                    prize_fr, prize_ar = LOSE_PRIZE_TEXT

            now = datetime.utcnow().isoformat()
            cur = conn.execute(
                "INSERT INTO participations (client_id, campaign_id, prize_tier_id, bill_image_path, "
                "bill_hash, prize_fr, prize_ar, is_winner, participation_date) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    client["id"], campaign["id"], prize_tier_id, req.bill_image_path,
                    req.bill_hash, prize_fr, prize_ar, is_winner, now,
                ),
            )

            return ParticipationOut(
                id=cur.lastrowid,
                client_id=client["id"],
                phone_number=client["phone_number"],
                prize_tier_id=prize_tier_id,
                is_winner=is_winner,
                prize_fr=prize_fr,
                prize_ar=prize_ar,
                participation_date=now,
            )

@app.get("/api/admin/participations")
def list_participations(
    slug: str,
    phone_number: Optional[str] = None,
    winners_only: bool = False,
    page: int = 1,
    page_size: int = 25,
    _: dict = Depends(require_campaign_access),
):
    """Lets staff pull up a participant's history by phone number to verify
    a winner's identity before handing out a physical prize. Scoped to this
    site's campaign — a participation always belongs to exactly one
    campaign already (`participations.campaign_id`), this endpoint just
    wasn't filtering on it before."""
    with get_campaign_conn(slug) as conn:
        campaign = _get_or_create_campaign(conn)

        # `clients` lives in the master DB (shared across every tombola),
        # while `participations` lives in this tombola's own DB — still one
        # query via a fully-qualified cross-database table reference, since
        # both databases are on the same MySQL server/user; no physical FK
        # across databases needed for this to work.
        clients_table = f"`{MYSQL_DATABASE}`.clients"

        where = ["p.campaign_id = %s"]
        params: list = [campaign["id"]]
        if phone_number:
            where.append("c.phone_number = %s")
            params.append(phone_number)
        if winners_only:
            where.append("p.is_winner = 1")
        where_clause = " AND ".join(where)

        total = conn.execute(
            f"SELECT COUNT(*) c FROM participations p JOIN {clients_table} c ON c.id = p.client_id WHERE {where_clause}",
            tuple(params),
        ).fetchone()["c"]
        rows = conn.execute(
            f"""
            SELECT p.id, p.client_id, c.phone_number, c.full_name, p.prize_tier_id,
                   p.is_winner, p.prize_fr, p.prize_ar, p.bill_image_path, p.participation_date
            FROM participations p
            JOIN {clients_table} c ON c.id = p.client_id
            WHERE {where_clause}
            ORDER BY p.id DESC
            LIMIT %s OFFSET %s
            """,
            (*params, page_size, (page - 1) * page_size),
        ).fetchall()

    return {"items": rows, "total": total, "page": page, "page_size": page_size}

@app.post("/api/admin/participations/draw-winner")
def draw_random_winner(
    slug: str,
    body: DrawWinnerRequest,
    actor: dict = Depends(require_campaign_access),
):
    """Picks one participant uniformly at random AND immediately marks them
    a winner (is_winner=1) — backs the "Tirer au sort" button on the
    admin's Participants tab, mainly for the 'raffle' game type (see
    platform/types.ts GameId) whose scan-only flow never runs an instant
    on-screen draw, so the admin has to draw a winner by hand.

    The pick + the mark happen in one transaction on the same connection —
    the SELECT (ORDER BY RAND() LIMIT 1, a fair draw over every entrant
    ever recorded for this campaign, not just whatever page the table has
    loaded) and the UPDATE that follows always agree on which row won."""
    with get_campaign_conn(slug) as conn:
        campaign = _get_or_create_campaign(conn)
        clients_table = f"`{MYSQL_DATABASE}`.clients"

        where = ["p.campaign_id = %s"]
        params: list = [campaign["id"]]
        if body.exclude_winners:
            where.append("p.is_winner = 0")
        where_clause = " AND ".join(where)

        row = conn.execute(
            f"""
            SELECT p.id, p.client_id, c.phone_number, c.full_name
            FROM participations p
            JOIN {clients_table} c ON c.id = p.client_id
            WHERE {where_clause}
            ORDER BY RAND()
            LIMIT 1
            """,
            tuple(params),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="No participants to draw from yet.")

        prize_fr = (body.prize_fr or "").strip() or DEFAULT_RAFFLE_PRIZE_TEXT[0]
        prize_ar = (body.prize_ar or "").strip() or DEFAULT_RAFFLE_PRIZE_TEXT[1]

        conn.execute(
            "UPDATE participations SET is_winner = 1, prize_fr = %s, prize_ar = %s WHERE id = %s",
            (prize_fr, prize_ar, row["id"]),
        )
        _audit(actor, "draw_random_winner", f"slug={slug} participation_id={row['id']} prize_fr={prize_fr}")

        updated = conn.execute(
            f"""
            SELECT p.id, p.client_id, c.phone_number, c.full_name, p.prize_tier_id,
                   p.is_winner, p.prize_fr, p.prize_ar, p.bill_image_path, p.participation_date
            FROM participations p
            JOIN {clients_table} c ON c.id = p.client_id
            WHERE p.id = %s
            """,
            (row["id"],),
        ).fetchone()

    return updated

@app.get("/api/admin/receipts")
def list_receipts(slug: str, page: int = 1, page_size: int = 25, _: dict = Depends(require_campaign_access)):
    """Every validated receipt (= scanned ticket) for this site's campaign,
    newest first. This is the real backing data for the admin's "Tickets
    scanned" tab — there is no separate `status` column because only
    successful scans ever reach the `receipts` table (see
    `validate_receipt`); a rejected scan (duplicate, below minimum, wrong
    store…) is never persisted."""
    with get_campaign_conn(slug) as conn:
        campaign = _get_or_create_campaign(conn)
        total = conn.execute(
            "SELECT COUNT(*) c FROM receipts WHERE campaign_id = %s", (campaign["id"],)
        ).fetchone()["c"]
        rows = conn.execute(
            """
            SELECT id, receipt_number, store, total, user_id, created_at
            FROM receipts
            WHERE campaign_id = %s
            ORDER BY id DESC
            LIMIT %s OFFSET %s
            """,
            (campaign["id"], page_size, (page - 1) * page_size),
        ).fetchall()
    return {
        "items": [ReceiptOut(**r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }

@app.get("/api/admin/receipts/{receipt_id}/items", response_model=list[ReceiptItemOut])
def get_receipt_items(receipt_id: int, slug: str, _: dict = Depends(require_campaign_access)):
    """What the OCR read off this one validated receipt, and how each line
    compared against the tombola's configured articles — the persisted
    version of what `debug_receipt.py` prints, viewable per receipt without
    needing the original photo or a re-run of OCR."""
    with get_campaign_conn(slug) as conn:
        existing = conn.execute("SELECT 1 FROM receipts WHERE id = %s", (receipt_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Receipt not found.")
        rows = conn.execute(
            "SELECT * FROM receipt_items WHERE receipt_id = %s ORDER BY id", (receipt_id,)
        ).fetchall()
    return [ReceiptItemOut(**r) for r in rows]

@app.get("/api/admin/stats")
def admin_stats(slug: str, _: dict = Depends(require_campaign_access)):
    with get_campaign_conn(slug) as conn:
        campaign = _get_or_create_campaign(conn)
        prizes = conn.execute(
            "SELECT * FROM prizes WHERE campaign_id = %s", (campaign["id"],)
        ).fetchall()
        # `winners` holds one row per /api/play round (win or lose, see
        # play_round) — "participants" here means completed rounds, and
        # `wins` counts the ones that actually paid out.
        participants = conn.execute(
            "SELECT COUNT(*) c FROM winners WHERE campaign_id = %s", (campaign["id"],)
        ).fetchone()["c"]
        wins = conn.execute(
            "SELECT COUNT(*) c FROM winners WHERE campaign_id = %s AND prize_amount > 0",
            (campaign["id"],),
        ).fetchone()["c"]

        return {
            "campaign": {
                "name": campaign["name"],
                "budget": campaign["budget"],
                "remaining_budget": campaign["remaining_budget"],
                "start_date": campaign["start_date"],
                "end_date": campaign["end_date"],
            },
            "participants": participants,
            "winning_rate": round(wins / participants, 4) if participants else 0,
            "prizes": [
                {
                    "amount": p["amount"],
                    "quantity": p["quantity"],
                    "remaining_quantity": p["remaining_quantity"],
                }
                for p in prizes
            ],
        }

# --------------------------------------------------------------------------
# Article catalog — search over bd_article.xlsx for the admin's "which
# articles qualify this campaign" picker.
# --------------------------------------------------------------------------


# These 5 endpoints previously had NO auth dependency at all despite living
# under /api/admin/ — Marjane's whole product catalog (brands, suppliers,
# prices) was readable by anyone, unauthenticated. Fixed with
# get_current_user (any logged-in admin, no role check): the catalog isn't
# scoped to one tombola, so require_campaign_access doesn't apply (no slug
# here), and require_super_admin would wrongly block a tombola_admin from
# the product-rules picker they're supposed to use on their own campaign.

@app.get("/api/admin/articles/brands")
def admin_article_brands(_: dict = Depends(get_current_user)):
    return {"brands": catalog.get_brands()}

@app.get("/api/admin/articles/fournisseurs")
def admin_article_fournisseurs(_: dict = Depends(get_current_user)):
    return {"fournisseurs": catalog.get_fournisseurs()}

@app.get("/api/admin/articles/rayons")
def admin_article_rayons(_: dict = Depends(get_current_user)):
    return {"rayons": catalog.get_rayons()}

@app.get("/api/admin/articles")
def admin_article_search(
    brand: Optional[str] = None,
    fournisseur: Optional[str] = None,
    rayon: Optional[str] = None,
    q: Optional[str] = None,
    gencode: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
    _: dict = Depends(get_current_user),
):
    items, total = catalog.search_articles(
        brand=brand, fournisseur=fournisseur, rayon=rayon, q=q, gencode=gencode, page=page, page_size=page_size
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}

class ArticleCodesLookup(BaseModel):
    codes: list[str]

@app.post("/api/admin/articles/by-codes")
def admin_articles_by_codes(body: ArticleCodesLookup, _: dict = Depends(get_current_user)):
    # Used by CSV import: hydrate bare article codes into full catalog rows
    # (libelle/marq/price/…) and let the caller diff `codes` against the
    # returned items to report which codes don't exist in the catalog.
    found = catalog.get_articles_by_codes(body.codes)
    return {"items": list(found.values())}

# --------------------------------------------------------------------------
# Product eligibility rules — the admin's chosen articles + price/quantity
# thresholds a receipt must satisfy, stored on the active campaign.
# --------------------------------------------------------------------------

def _empty_product_rules() -> ProductRules:
    return ProductRules(mode="per_article", articles=[], combinedRule=None)

@app.get("/api/admin/campaign/product-rules", response_model=ProductRules)
def get_product_rules(slug: str, _: dict = Depends(require_campaign_access)):
    with get_campaign_conn(slug) as conn:
        campaign = _get_or_create_campaign(conn)
        raw = campaign.get("product_rules")
        if not raw:
            return _empty_product_rules()
        try:
            return ProductRules(**json.loads(raw))
        except Exception:
            return _empty_product_rules()

@app.put("/api/admin/campaign/product-rules", response_model=ProductRules)
def put_product_rules(slug: str, rules: ProductRules, actor: dict = Depends(require_campaign_access)):
    if rules.mode == "per_article":
        for a in rules.articles:
            if not a.ruleType or a.threshold is None:
                raise HTTPException(
                    status_code=422,
                    detail=f"Article {a.code} is missing a ruleType/threshold for per_article mode.",
                )
        if rules.minMatches < 1 or rules.minMatches > max(1, len(rules.articles)):
            raise HTTPException(
                status_code=422,
                detail=f"minMatches must be between 1 and {len(rules.articles)} (the number of selected articles).",
            )
    elif rules.mode == "combined":
        if not rules.combinedRule:
            raise HTTPException(
                status_code=422,
                detail="combinedRule is required when mode is 'combined'.",
            )
    else:
        raise HTTPException(status_code=422, detail="mode must be 'per_article' or 'combined'.")

    with get_campaign_conn(slug) as conn:
        campaign = _get_or_create_campaign(conn)
        conn.execute(
            "UPDATE campaigns SET product_rules = %s WHERE id = %s",
            (json.dumps(rules.model_dump()), campaign["id"]),
        )
    _audit(actor, "update_product_rules", f"updated product rules for {slug!r} (mode={rules.mode})")
    return rules

@app.get("/api/campaign")
def campaign_public(slug: str):
    with get_campaign_conn(slug) as conn:
        campaign = _get_or_create_campaign(conn)
        return {
            "name": campaign["name"],
            "start_date": campaign["start_date"],
            "end_date": campaign["end_date"],
            "active": bool(campaign["active"]),
            "maintenance_mode": bool(campaign.get("maintenance_mode")),
        }

@app.put("/api/admin/campaign/lifecycle")
def put_campaign_lifecycle(slug: str, patch: CampaignLifecycle, actor: dict = Depends(require_campaign_access)):
    """Admin-only counterpart to campaign_public's read — the write side of
    'is this tombola open to play'. Called from the admin whenever a
    campaign's kanban status, archive action, maintenance toggle, or
    schedule changes (see campaignLifecycleApi.ts on the frontend); checked
    by `_lifecycle_block` on every gameplay entry point."""
    with get_campaign_conn(slug) as conn:
        campaign = _get_or_create_campaign(conn)
        updates = {k: v for k, v in patch.model_dump().items() if v is not None}
        if updates:
            set_clause = ", ".join(f"{k} = %s" for k in updates)
            conn.execute(
                f"UPDATE campaigns SET {set_clause} WHERE id = %s",
                (*updates.values(), campaign["id"]),
            )
        row = conn.execute("SELECT * FROM campaigns WHERE id = %s", (campaign["id"],)).fetchone()
    _audit(actor, "update_campaign_lifecycle", f"updated lifecycle for {slug!r} ({', '.join(updates) or 'no changes'})")
    return {
        "active": bool(row["active"]),
        "end_date": row["end_date"],
        "maintenance_mode": bool(row["maintenance_mode"]),
    }

# --------------------------------------------------------------------------
# Campaign CRUD — the platform admin persists full config via these endpoints
# --------------------------------------------------------------------------

@app.get("/api/campaigns")
def list_campaigns():
    """Return the full config of every campaign."""
    with get_master_conn() as conn:
        rows = conn.execute(
            "SELECT id, slug, name, status, config FROM campaign_config ORDER BY updated_at DESC"
        ).fetchall()
    result = []
    for r in rows:
        try:
            config = json.loads(r["config"])
            config["id"] = r["id"]
            config["slug"] = r["slug"]
            config["name"] = r["name"]
            config["status"] = r["status"]
            result.append(config)
        except Exception:
            continue
    return result

@app.get("/api/campaigns/{slug}")
def get_campaign(slug: str):
    with get_master_conn() as conn:
        row = conn.execute(
            "SELECT config FROM campaign_config WHERE slug = %s", (slug,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    return json.loads(row["config"])

@app.post("/api/campaigns", response_model=dict)
def create_campaign(campaign: CampaignRecord, actor: dict = Depends(require_super_admin)):
    now = datetime.utcnow().isoformat()
    with get_master_conn() as conn:
        existing = conn.execute(
            "SELECT 1 FROM campaign_config WHERE id = %s OR slug = %s",
            (campaign.id, campaign.slug),
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Campaign id or slug already exists.")
        conn.execute(
            "INSERT INTO campaign_config (id, slug, name, status, config, updated_at) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (
                campaign.id,
                campaign.slug,
                campaign.name,
                campaign.status,
                json.dumps(campaign.model_dump()),
                now,
            ),
        )
    _audit(actor, "create_campaign", f"created campaign {campaign.name!r} ({campaign.slug!r})")
    return {"ok": True, "id": campaign.id}

@app.put("/api/campaigns/{id}")
def update_campaign(id: str, campaign: CampaignRecord, actor: dict = Depends(require_super_admin)):
    now = datetime.utcnow().isoformat()
    with get_master_conn() as conn:
        row = conn.execute(
            "SELECT 1 FROM campaign_config WHERE id = %s", (id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Campaign not found.")
        conn.execute(
            "UPDATE campaign_config SET slug = %s, name = %s, status = %s, config = %s, updated_at = %s "
            "WHERE id = %s",
            (
                campaign.slug,
                campaign.name,
                campaign.status,
                json.dumps(campaign.model_dump()),
                now,
                id,
            ),
        )
    _audit(actor, "update_campaign", f"updated campaign {campaign.name!r} ({campaign.slug!r})")
    return {"ok": True, "id": id}

@app.delete("/api/campaigns/{id}")
def delete_campaign(id: str, actor: dict = Depends(require_super_admin)):
    with get_master_conn() as conn:
        conn.execute("DELETE FROM campaign_config WHERE id = %s", (id,))
    _audit(actor, "delete_campaign", f"deleted campaign {id!r}")
    return {"ok": True, "id": id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)