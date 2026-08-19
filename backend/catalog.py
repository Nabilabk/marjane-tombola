"""
Marjane article catalog — loaded once from bd_article.xlsx into memory.

This is static reference data already shipped in the repo (~59,777 rows), so
there's no need for a dedicated DB table: we load it once at process startup
and serve brand/fournisseur/search queries out of an in-memory list + a
couple of indices built alongside it.
"""

import os
import threading

from openpyxl import load_workbook

XLSX_PATH = os.path.join(os.path.dirname(__file__), "bd_article.xlsx")
SHEET_NAME = "Feuil1"
NEEDED_COLUMNS = ["CODE", "Gencode", "LIBELLE_ARTICLE", "MARQ", "LIBFOURN", "PV_PERM", "RAYON", "FAMILLE"]

_lock = threading.Lock()
_articles: list[dict] = []
_articles_by_code: dict[str, dict] = {}
_brands: list[str] = []
_fournisseurs: list[str] = []
_rayons: list[str] = []
_loaded = False


def _coerce_price(raw) -> float | None:
    try:
        value = float(str(raw).replace(",", "."))
        return value if value > 0 else None  # filters out the '-1' sentinel and blanks
    except (TypeError, ValueError):
        return None


def load_catalog(force: bool = False) -> None:
    """Load bd_article.xlsx into memory. Safe to call repeatedly — a no-op
    once loaded unless force=True."""
    global _articles, _articles_by_code, _brands, _fournisseurs, _rayons, _loaded
    with _lock:
        if _loaded and not force:
            return

        wb = load_workbook(XLSX_PATH, read_only=True, data_only=True)
        ws = wb[SHEET_NAME]
        rows = ws.iter_rows(values_only=True)
        header = next(rows)
        idx = {name: i for i, name in enumerate(header) if name in NEEDED_COLUMNS}

        def _clean(row, key: str) -> str:
            if key not in idx or row[idx[key]] in (None, "", -1, "-1"):
                return ""
            return str(row[idx[key]]).strip()

        articles: list[dict] = []
        brands: set[str] = set()
        fournisseurs: set[str] = set()
        rayons: set[str] = set()

        for row in rows:
            code = row[idx["CODE"]] if "CODE" in idx else None
            # LIBELLE_ARTICLE and Gencode use the same `-1` "no data" sentinel
            # as MARQ/LIBFOURN (see _clean), but weren't being checked for it
            # here — 777 rows have a literal "-1" name and 673 a literal "-1"
            # barcode, which were slipping into search results as junk rows.
            libelle = _clean(row, "LIBELLE_ARTICLE")
            if code is None or not libelle:
                continue

            marq = _clean(row, "MARQ")
            fourn = _clean(row, "LIBFOURN")
            rayon = _clean(row, "RAYON")
            famille = _clean(row, "FAMILLE")
            price = _coerce_price(row[idx["PV_PERM"]]) if "PV_PERM" in idx else None
            gencode = _clean(row, "Gencode")

            articles.append(
                {
                    "code": str(code),
                    "gencode": gencode or None,
                    "libelle": libelle,
                    "marq": marq or None,
                    "fournisseur": fourn or None,
                    "price": price,
                    "rayon": rayon or None,
                    "famille": famille or None,
                }
            )
            if marq:
                brands.add(marq)
            if fourn:
                fournisseurs.add(fourn)
            if rayon:
                rayons.add(rayon)

        wb.close()
        # Sorted once here (not per-request) so every search's results come
        # back in a predictable, scannable order — the source file's own
        # row order is arbitrary.
        articles.sort(key=lambda a: a["libelle"])
        _articles = articles
        _articles_by_code = {a["code"]: a for a in articles}
        _brands = sorted(brands)
        _fournisseurs = sorted(fournisseurs)
        _rayons = sorted(rayons)
        _loaded = True


def get_brands() -> list[str]:
    load_catalog()
    return _brands


def get_fournisseurs() -> list[str]:
    load_catalog()
    return _fournisseurs


def get_rayons() -> list[str]:
    load_catalog()
    return _rayons


def search_articles(
    brand: str | None = None,
    fournisseur: str | None = None,
    rayon: str | None = None,
    q: str | None = None,
    gencode: str | None = None,
    page: int = 1,
    page_size: int = 25,
) -> tuple[list[dict], int]:
    load_catalog()

    # With no filter at all, the naive behavior is "paginate all 59,777
    # articles" — technically correct, practically useless (the admin's
    # picker would show page 1 of ~3,000 with no way to find anything).
    # Report the *true* total so the UI can prompt "search N articles"
    # instead, but don't hand back an arbitrary unfiltered slice.
    if not (brand or fournisseur or rayon or q or gencode):
        return [], len(_articles)

    results = _articles
    if brand:
        results = [a for a in results if a["marq"] == brand]
    if fournisseur:
        results = [a for a in results if a["fournisseur"] == fournisseur]
    if rayon:
        results = [a for a in results if a["rayon"] == rayon]
    if q:
        ql = q.lower()
        results = [a for a in results if ql in a["libelle"].lower()]
    if gencode:
        # Prefix match, not exact — lets the admin scan/type a partial EAN
        # and still find the article instead of needing the full barcode.
        results = [a for a in results if a["gencode"] and a["gencode"].startswith(gencode)]

    total = len(results)
    page = max(1, page)
    # 100 covers normal browsing; the admin's "select all matching filter"
    # button needs the whole filtered set in one call, so the ceiling is
    # raised to SELECT_ALL_CAP (kept in sync with the frontend's
    # articleCatalogApi.SELECT_ALL_CAP) rather than left at the old 100.
    page_size = max(1, min(page_size, 3000))
    start = (page - 1) * page_size
    return results[start : start + page_size], total


def get_articles_by_codes(codes: list[str]) -> dict[str, dict]:
    load_catalog()
    return {code: _articles_by_code[code] for code in codes if code in _articles_by_code}
