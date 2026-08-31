"""
Best-effort extraction of purchased-line candidates from noisy OCR receipt
text, plus fuzzy-matching those lines against admin-selected catalog
articles and evaluating the campaign's product eligibility rules.

Kept isolated from FastAPI/DB so it can be exercised with plain strings —
these heuristics (NOISE_KEYWORDS, PRICE_TOKEN, QTY_UNIT_PATTERN,
FUZZY_MATCH_THRESHOLD) are the pieces most likely to need tuning once real
receipt-photo OCR samples are available, and this keeps that tuning
independent from the request-handling code in app.py.
"""

import re

from rapidfuzz import fuzz

NOISE_KEYWORDS = re.compile(
    r"\b(total|sous.?total|tva|espece|especes|carte|rendu|monnaie|nombre\s*articles?|"
    r"operation|vente|ticket|caisse|merci|ice|tp\s*[:.]?\s*\d|date|heure|client|"
    r"code\s*barre|remise|solde|paiement)\b",
    re.IGNORECASE,
)
PRICE_TOKEN = re.compile(r"\d{1,4}[.,]\d{2}\b")
QTY_UNIT_PATTERN = re.compile(r"(?P<qty>\d+)\s*[xX*]\s*(?P<unit>\d+[.,]\d{2})")

# rapidfuzz token_set_ratio score, 0-100. Was 78 (tuned against a hand-typed
# sample). A real photographed ticket's OCR text scored the true match only
# 75 ("OLD SPICE AP&DE" vs. catalog "OLD SPICE AP&DEO CAPTAIN 73ML" — OCR
# even drops the trailing "O") while every unrelated line on that same
# receipt topped out at 48 — a 27-point gap to work with. 72 clears the real
# true positive with margin to spare while staying well clear of the worst
# observed false-positive score.
FUZZY_MATCH_THRESHOLD = 72


def extract_line_items(text: str) -> list[dict]:
    """Best-effort extraction of purchased-line candidates from noisy OCR
    text. Heuristic and intentionally simple/tunable — not a guarantee of
    full parsing accuracy given real-world receipt-photo OCR quality.

    A real photographed (often rotated) ticket frequently lands an
    article's name and its price on two SEPARATE OCR'd lines instead of
    one — e.g. "OLD SPICE AP&DE" on its own line, "50.95 DH" on the next.
    A description-only line used to be dropped entirely here, which meant
    that article could never be matched no matter how good the fuzzy
    threshold is — it was simply never a candidate. Such lines are now
    still captured, with quantity=1 and price left at 0.0 (never guessed):
    enough for a quantity-based rule to see the article, while a
    price-based rule correctly won't credit it for an unknown price.
    """
    items: list[dict] = []
    for raw_line in text.split("\n"):
        line = raw_line.strip()
        if len(line) < 3 or NOISE_KEYWORDS.search(line):
            continue

        # skip lines that are essentially just numbers (dates, codes, totals,
        # a lone price with nothing to name an item with)
        if not re.search(r"[A-Za-zÀ-ÿ]{2,}", line):
            continue

        prices = PRICE_TOKEN.findall(line)
        if not prices:
            # description-only line — its price (if any) is on a different
            # line we can't reliably pair it with; still record the name.
            description = re.sub(r"[xX*]", " ", line).strip(" -.:\t")
            if description:
                items.append(
                    {
                        "description": description,
                        "quantity": 1,
                        "unit_price": 0.0,
                        "line_total": 0.0,
                        "raw_line": raw_line,
                    }
                )
            continue

        qty_match = QTY_UNIT_PATTERN.search(line)
        if qty_match:
            quantity = int(qty_match.group("qty"))
            unit_price = float(qty_match.group("unit").replace(",", "."))
            line_total = float(prices[-1].replace(",", "."))
            # strip the whole "qty x unit_price" span, not just the price tokens,
            # so the description doesn't retain a stray leading quantity digit
            description = line[: qty_match.start()] + line[qty_match.end() :]
        else:
            quantity = 1
            unit_price = line_total = float(prices[-1].replace(",", "."))
            description = line

        description = PRICE_TOKEN.sub("", description)
        description = re.sub(r"[xX*]", " ", description).strip(" -.:\t")

        if description:
            items.append(
                {
                    "description": description,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "line_total": line_total,
                    "raw_line": raw_line,
                }
            )
    return items


def _best_match(description: str, articles: list[dict]) -> tuple[str | None, str | None, int]:
    """Fuzzy-matches one OCR'd line description against every candidate
    article, returning the best (code, libelle, score) triple.

    Marjane's receipt printer truncates long article names to fit the paper
    width — a real ticket showed "OLD SPICE AP&DEO" for a catalog article
    whose full libellé is "OLD SPICE AP&DEO CAPTAIN 73ML". token_sort_ratio
    scores that pair ~71 (penalizes the length/word-count mismatch), which
    sits below FUZZY_MATCH_THRESHOLD and silently drops a genuine match.
    token_set_ratio instead treats it as set-overlap of tokens — a receipt
    description whose words are a subset of the catalog name's words (the
    truncation case) scores ~100 — while still keeping unrelated lines from
    the same receipt in the 30-50 range, well clear of the threshold.

    Always returns the best score found, even below FUZZY_MATCH_THRESHOLD —
    callers that just want "did this count" check the threshold themselves;
    `match_receipt_items` below keeps the raw score for admin review even on
    a non-match, so it's visible *how close* an unmatched line came.
    """
    best_code = None
    best_libelle = None
    best_score = 0
    upper = description.upper()
    for a in articles:
        score = fuzz.token_set_ratio(upper, a["libelle"].upper())
        if score > best_score:
            best_score, best_code, best_libelle = score, a["code"], a["libelle"]
    return best_code, best_libelle, best_score


def match_line_items_to_articles(line_items: list[dict], articles: list[dict]) -> dict[str, dict]:
    """Aggregate matched quantity/spend per selected-article code — what
    `evaluate_product_rules` checks thresholds against."""
    agg: dict[str, dict] = {a["code"]: {"quantity": 0, "spend": 0.0} for a in articles}
    for item in line_items:
        code, _libelle, score = _best_match(item["description"], articles)
        if code and score >= FUZZY_MATCH_THRESHOLD:
            agg[code]["quantity"] += item["quantity"]
            agg[code]["spend"] += item["line_total"]
    return agg


def match_receipt_items(line_items: list[dict], articles: list[dict]) -> list[dict]:
    """Per-line trace of `extract_line_items()` output against `articles` —
    one entry per OCR'd line, carrying whichever configured article (if any)
    it matched closely enough to count, plus the raw fuzzy score. This is
    what gets persisted (see app.py's `receipt_items` table) for a validated
    receipt, so an admin can later see exactly what the OCR read and how it
    compared against the tombola's configured articles, without needing the
    original photo or a re-run of the OCR."""
    results = []
    for item in line_items:
        code, libelle, score = _best_match(item["description"], articles)
        matched = code is not None and score >= FUZZY_MATCH_THRESHOLD
        results.append(
            {
                "description": item["description"],
                "quantity": item["quantity"],
                "unit_price": item["unit_price"],
                "line_total": item["line_total"],
                "matched_article_code": code if matched else None,
                "matched_article_libelle": libelle if matched else None,
                "match_score": score,
            }
        )
    return results


def _evaluate_per_article(agg: dict[str, dict], articles: list[dict], min_matches: int) -> bool:
    """Count how many of the selected articles individually satisfy their own
    ruleType/threshold, then require at least min_matches of them.
    min_matches=1 (the default) is the original OR-across-articles behavior;
    a higher value means several distinct articles must each show up on the
    same receipt before it qualifies."""
    matched = 0
    for a in articles:
        v = agg.get(a["code"], {"quantity": 0, "spend": 0.0})
        rule_type = a.get("ruleType", "quantity")
        threshold = a.get("threshold", 1)
        value = v["quantity"] if rule_type == "quantity" else v["spend"]
        if value >= threshold:
            matched += 1
    return matched >= (min_matches or 1)


def _evaluate_combined(agg: dict[str, dict], combined: dict | None) -> bool:
    if not combined:
        return True  # misconfigured -> fail open, don't block legitimate receipts
    total_qty = sum(v["quantity"] for v in agg.values())
    total_spend = sum(v["spend"] for v in agg.values())
    threshold = combined["threshold"]
    if combined["ruleType"] == "quantity":
        return total_qty >= threshold
    return total_spend >= threshold


def evaluate_product_rules(line_items: list[dict], rules: dict) -> bool:
    """True = the receipt satisfies the campaign's configured product
    rules. Backward compatible: no articles configured => always True
    (don't block receipts for campaigns that haven't set any rule)."""
    articles = rules.get("articles") or []
    if not articles:
        return True

    agg = match_line_items_to_articles(line_items, articles)
    mode = rules.get("mode", "per_article")

    if mode == "both":
        # An admin has layered a per-article rule AND an aggregate
        # (quantity/spend) rule on top of each other — both must pass, not
        # either/or, since "both" is meant to add an extra condition rather
        # than offer a second way to qualify. `_evaluate_combined` fails
        # OPEN (returns True) when `combined` is falsy — correct for
        # mode="combined" alone (no rule configured => don't block), but
        # wrong here: a "both"-mode record with no combinedRule (e.g.
        # written before validation required one, or restored from an old
        # backup) must not silently degrade into a per-article-only check —
        # that's exactly the second, unintended way to qualify this mode
        # exists to prevent.
        combined_rule = rules.get("combinedRule")
        if not combined_rule:
            return False
        return _evaluate_per_article(agg, articles, rules.get("minMatches") or 1) and _evaluate_combined(
            agg, combined_rule
        )

    if mode == "combined":
        return _evaluate_combined(agg, rules.get("combinedRule"))

    return _evaluate_per_article(agg, articles, rules.get("minMatches") or 1)
