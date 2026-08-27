"""Tests for the pure helpers in catalog.py (no bd_article.xlsx load needed)."""

from catalog import _coerce_price


def test_accepts_comma_decimal():
    assert _coerce_price("12,50") == 12.5


def test_accepts_dot_decimal():
    assert _coerce_price("12.50") == 12.5


def test_filters_the_minus_one_sentinel():
    assert _coerce_price("-1") is None


def test_filters_zero_and_negative_values():
    assert _coerce_price("0") is None
    assert _coerce_price("-5") is None


def test_filters_blank_and_none():
    assert _coerce_price("") is None
    assert _coerce_price(None) is None


def test_filters_non_numeric_text():
    assert _coerce_price("N/A") is None
