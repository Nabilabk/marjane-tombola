"""
Dev-only helper: run a *pasted* receipt text through the exact same checks
`POST /api/receipt/validate` runs (signature score, min amount, product
rules), without a phone camera, an OCR round-trip, or a physical ticket.

Why this exists: OCR text quality varies per photo, so a failing scan is
ambiguous — is it OCR noise, or the product-rules matching logic? This tool
lets you paste the *exact* text you expect the OCR to produce (e.g. what you
transcribed off a real ticket) and see precisely which check fails and why,
in seconds, repeatable as many times as you're tuning FUZZY_MATCH_THRESHOLD
or a campaign's article list.

Usage:
  # against a live campaign's saved rules (reads from MySQL via slug)
  python debug_receipt.py --slug my-campaign --text-file ticket.txt

  # fully offline, no DB needed — rules from a local JSON file
  python debug_receipt.py --rules-file rules.json --text-file ticket.txt

  # paste text directly, no file
  python debug_receipt.py --rules-file rules.json --text "$(cat ticket.txt)"

rules.json shape (same as ProductRules / what Products.tsx saves):
  {
    "mode": "per_article",
    "minMatches": 1,
    "articles": [
      {"code": "3097103", "libelle": "OLD SPICE AP&DEO CAPTAIN 73ML",
       "ruleType": "quantity", "threshold": 1}
    ]
  }
"""

import argparse
import json
import sys

from line_items import evaluate_product_rules, extract_line_items


def load_rules_from_slug(slug: str) -> dict:
    import app as appmod  # local import: only touches MySQL when --slug is used

    with appmod.get_campaign_conn(slug) as conn:
        campaign = appmod._get_or_create_campaign(conn)
        raw = campaign.get("product_rules")
        min_amount = campaign.get("receipt_min_amount") or 0
    rules = json.loads(raw) if raw else {"mode": "per_article", "articles": [], "minMatches": 1}
    return rules, min_amount


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    text_src = parser.add_mutually_exclusive_group(required=True)
    text_src.add_argument("--text", help="Receipt text inline.")
    text_src.add_argument("--text-file", help="Path to a .txt file with the receipt text.")
    rules_src = parser.add_mutually_exclusive_group(required=True)
    rules_src.add_argument("--slug", help="Campaign slug — loads its saved product rules from MySQL.")
    rules_src.add_argument("--rules-file", help="Path to a local ProductRules JSON file (no DB needed).")
    parser.add_argument("--min-amount", type=float, default=None, help="Override the below_minimum check's threshold.")
    args = parser.parse_args()

    text = args.text if args.text is not None else open(args.text_file, encoding="utf-8").read()

    min_amount = args.min_amount or 0
    if args.slug:
        rules, campaign_min = load_rules_from_slug(args.slug)
        if args.min_amount is None:
            min_amount = campaign_min
    else:
        rules = json.loads(open(args.rules_file, encoding="utf-8").read())

    # --- signature check (same regexes as marjane_signature_score in app.py) ---
    import app as appmod

    score, matched = appmod.marjane_signature_score(text)
    print(f"Signature score: {score}/{len(appmod.MARJANE_SIGNATURE_CHECKS)}  (need >= {appmod.MARJANE_SIGNATURE_MIN_SCORE})")
    print(f"  matched: {matched or '(none)'}")
    sig_ok = score >= appmod.MARJANE_SIGNATURE_MIN_SCORE
    print(f"  -> {'OK' if sig_ok else 'FAIL: invalid_receipt_format'}")

    # --- total / min amount ---
    parsed = appmod.parse_receipt(text)
    print(f"\nParsed total: {parsed['total']} DH  (need >= {min_amount})")
    amount_ok = parsed["total"] >= min_amount
    print(f"  -> {'OK' if amount_ok else 'FAIL: below_minimum'}")

    # --- product rules ---
    print(f"\nMode: {rules.get('mode', 'per_article')}  minMatches: {rules.get('minMatches', 1)}")
    items = extract_line_items(text)
    print(f"Extracted {len(items)} line item(s):")
    for it in items:
        print(f"  {it['description']!r:45s} qty={it['quantity']} total={it['line_total']}")

    if not rules.get("articles"):
        print("\n(no articles configured -> product-rules check always passes)")
        rules_ok = True
    else:
        rules_ok = evaluate_product_rules(items, rules)
        print(f"\n  -> {'OK' if rules_ok else 'FAIL: no_qualifying_articles'}")

    print("\n" + "=" * 50)
    overall = sig_ok and amount_ok and rules_ok
    print("RESULT:", "would PASS validation" if overall else "would FAIL validation")


if __name__ == "__main__":
    main()
