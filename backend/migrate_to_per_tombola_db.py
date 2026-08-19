"""
One-time migration: copies each existing campaign (marjane, colgate, knorr)
— config AND gameplay history — from the old shared `tombola` database into
its new per-tombola database (tombola_marjane, tombola_colgate, ...).

Why this exists: the DB-per-tombola change (app.py's get_campaign_conn) was
scoped as "no migration needed, dev environment, clean slate" — which
turned out to be wrong. `marjane`'s product_rules (the Old Spice article
config from this session) and all three campaigns' prizes/prize_tiers/
winners were real, already-configured data sitting in the old shared DB,
not disposable seed data. Each new per-tombola DB was created empty, so
without this, product-rule checks were silently no-ops and admin stats
read as zero.

Safe to re-run: every table is cleared in the destination DB before
copying, so running this twice just re-copies the same data instead of
duplicating it.
"""

import app as appmod

CAMPAIGN_COLUMNS = [
    "name", "slug", "budget", "remaining_budget", "start_date", "end_date",
    "active", "dynamic_weighting", "allowed_store", "receipt_min_amount",
    "product_rules",
]


def migrate_slug(slug: str) -> None:
    with appmod.get_master_conn() as old:
        old_campaign = old.execute(
            "SELECT * FROM campaigns WHERE slug = %s", (slug,)
        ).fetchone()
        if not old_campaign:
            print(f"  {slug}: no row in the old shared DB, skipping.")
            return

        old_id = old_campaign["id"]
        old_prizes = old.execute("SELECT * FROM prizes WHERE campaign_id = %s", (old_id,)).fetchall()
        old_tiers = old.execute("SELECT * FROM prize_tiers WHERE campaign_id = %s", (old_id,)).fetchall()
        old_receipts = old.execute("SELECT * FROM receipts WHERE campaign_id = %s", (old_id,)).fetchall()
        old_winners = old.execute("SELECT * FROM winners WHERE campaign_id = %s", (old_id,)).fetchall()
        old_participations = old.execute(
            "SELECT * FROM participations WHERE campaign_id = %s", (old_id,)
        ).fetchall()

    # Provisions the database + empty tables only — no default row inserted,
    # so there's nothing to clobber before we insert the real data below.
    db_name = appmod._ensure_campaign_db(slug)

    with appmod.get_campaign_conn(slug) as new:
        # Clear first so this is safe to re-run (also wipes any placeholder
        # row an earlier request may have auto-created for this slug).
        for table in ("participations", "winners", "receipts", "prize_tiers", "prizes", "campaigns"):
            new.execute(f"DELETE FROM {table}")

        cols = ", ".join(CAMPAIGN_COLUMNS)
        placeholders = ", ".join(["%s"] * len(CAMPAIGN_COLUMNS))
        cur = new.execute(
            f"INSERT INTO campaigns ({cols}) VALUES ({placeholders})",
            tuple(old_campaign[c] for c in CAMPAIGN_COLUMNS),
        )
        new_campaign_id = cur.lastrowid

        for p in old_prizes:
            new.execute(
                "INSERT INTO prizes (campaign_id, amount, weight, quantity, remaining_quantity) "
                "VALUES (%s,%s,%s,%s,%s)",
                (new_campaign_id, p["amount"], p["weight"], p["quantity"], p["remaining_quantity"]),
            )

        tier_id_map = {}
        for t in old_tiers:
            cur = new.execute(
                "INSERT INTO prize_tiers (campaign_id, name, prize_fr, prize_ar, probability_percent, "
                "is_lose_tier, max_winners, winners_count, sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (
                    new_campaign_id, t["name"], t["prize_fr"], t["prize_ar"], t["probability_percent"],
                    t["is_lose_tier"], t["max_winners"], t["winners_count"], t["sort_order"],
                ),
            )
            tier_id_map[t["id"]] = cur.lastrowid

        for r in old_receipts:
            new.execute(
                "INSERT INTO receipts (campaign_id, receipt_number, image_hash, store, total, user_id, created_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (new_campaign_id, r["receipt_number"], r["image_hash"], r["store"], r["total"], r["user_id"], r["created_at"]),
            )

        for w in old_winners:
            new.execute(
                "INSERT INTO winners (campaign_id, user_id, prize_amount, created_at) VALUES (%s,%s,%s,%s)",
                (new_campaign_id, w["user_id"], w["prize_amount"], w["created_at"]),
            )

        # client_id is untouched: `clients` never moved (same physical table,
        # still in the master DB), so old client ids stay valid as-is.
        for pa in old_participations:
            new.execute(
                "INSERT INTO participations (client_id, campaign_id, prize_tier_id, bill_image_path, "
                "bill_hash, prize_fr, prize_ar, is_winner, participation_date) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (
                    pa["client_id"], new_campaign_id, tier_id_map.get(pa["prize_tier_id"]),
                    pa["bill_image_path"], pa["bill_hash"], pa["prize_fr"], pa["prize_ar"],
                    pa["is_winner"], pa["participation_date"],
                ),
            )

    print(
        f"  {slug} -> {db_name}: {len(old_prizes)} prizes, {len(old_tiers)} tiers, "
        f"{len(old_receipts)} receipts, {len(old_winners)} winners, "
        f"{len(old_participations)} participations, "
        f"product_rules {'set' if old_campaign['product_rules'] else 'empty'}"
    )


if __name__ == "__main__":
    with appmod.get_master_conn() as conn:
        slugs = [
            r["slug"] for r in conn.execute("SELECT DISTINCT slug FROM campaigns").fetchall() if r["slug"]
        ]
    print(f"Migrating {len(slugs)} campaign(s) from the old shared DB: {slugs}")
    for slug in slugs:
        migrate_slug(slug)
    print("Done.")
