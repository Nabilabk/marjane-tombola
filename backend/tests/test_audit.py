"""_audit() is best-effort logging bolted onto real admin mutations — if it
ever raised, a DB hiccup on the audit insert would take down the actual
account/prize/campaign change it was only supposed to be recording."""

from app import _audit


def test_audit_never_raises_even_if_the_db_is_unreachable():
    # No MySQL running in the test environment — get_master_conn() inside
    # _audit will fail to connect, which is exactly the scenario this
    # guards against: that failure must be swallowed, not propagated.
    _audit({"id": 1, "email": "admin@example.com"}, "test_action", "some detail")


def test_audit_handles_a_missing_email_gracefully():
    _audit({"id": 1}, "test_action")
