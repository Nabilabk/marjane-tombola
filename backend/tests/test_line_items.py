"""
Tests for the OCR receipt line-extraction heuristics in line_items.py.

These are the pieces most likely to need re-tuning once real receipt-photo
OCR samples come in (see the module docstring) — a regression here silently
breaks tombola participation for anyone whose receipt no longer parses, so
it's worth pinning the current, working behavior down.
"""

from line_items import extract_line_items


def test_simple_line_with_a_single_price():
    items = extract_line_items("OLD SPICE AP&DEO 50.95")
    assert len(items) == 1
    item = items[0]
    assert item["description"] == "OLD SPICE AP&DEO"
    assert item["quantity"] == 1
    assert item["unit_price"] == 50.95
    assert item["line_total"] == 50.95


def test_noise_lines_are_dropped():
    # "total", "tva", "espece" etc. are receipt boilerplate, never a
    # purchased item — see NOISE_KEYWORDS.
    text = "TOTAL 245.00\nTVA 12.50\nESPECES 250.00"
    assert extract_line_items(text) == []


def test_quantity_times_unit_price_pattern():
    items = extract_line_items("COCA COLA 2X 8.50 17.00")
    assert len(items) == 1
    item = items[0]
    assert item["description"] == "COCA COLA"
    assert item["quantity"] == 2
    assert item["unit_price"] == 8.50
    assert item["line_total"] == 17.00


def test_description_only_line_is_kept_with_zero_price():
    # A photographed ticket often splits an article's name and its price
    # across two OCR'd lines — the name-only line must still be captured
    # (quantity=1, price never guessed at 0.0) so a quantity-based rule can
    # still see the article.
    items = extract_line_items("OLD SPICE AP&DE")
    assert len(items) == 1
    assert items[0] == {
        "description": "OLD SPICE AP&DE",
        "quantity": 1,
        "unit_price": 0.0,
        "line_total": 0.0,
        "raw_line": "OLD SPICE AP&DE",
    }


def test_pure_number_lines_are_skipped():
    # Barcodes, dates, lone totals — nothing to name an item with.
    items = extract_line_items("1234567890123\n21/08/2026")
    assert items == []


def test_short_lines_are_skipped():
    assert extract_line_items("12") == []


def test_multi_line_receipt_extracts_only_real_items():
    text = "\n".join(
        [
            "TICKET DE CAISSE",
            "NESCAFE 3IN1 15.90",
            "TOTAL 15.90",
            "ESPECES 20.00",
            "MERCI DE VOTRE VISITE",
        ]
    )
    items = extract_line_items(text)
    assert len(items) == 1
    assert items[0]["description"] == "NESCAFE 3IN1"
    assert items[0]["line_total"] == 15.90
