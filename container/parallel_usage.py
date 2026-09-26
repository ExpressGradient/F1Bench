"""Local request ledger; public list-price estimates, not provider invoices."""

import json
import os
from datetime import datetime, timezone
from uuid import uuid4

LEDGER = "/tmp/f1bench-research.jsonl"
PRICING = "https://docs.parallel.ai/getting-started/pricing"


def record(entry):
    entry = {"at": datetime.now(timezone.utc).isoformat(), **entry}
    # One append per event keeps concurrent tool calls from interleaving lines.
    fd = os.open(LEDGER, os.O_WRONLY | os.O_APPEND)
    try:
        os.write(fd, (json.dumps(entry) + "\n").encode())
    finally:
        os.close(fd)


def begin(tool, units):
    request_id = uuid4().hex
    record({"id": request_id, "tool": tool, "status": "pending", "units": units})
    return request_id


def finish(request_id, tool, result):
    # Unknown/partial responses stay unpriced rather than implying a free request.
    results = result.get("results")
    cost = None
    if isinstance(results, list) and not result.get("errors"):
        cost = (
            0.005 + max(0, len(results) - 10) * 0.001
            if tool == "search"
            else len(results) * 0.001
        )
    record(
        {
            "id": request_id,
            "tool": tool,
            "status": "completed",
            "cost_usd": cost,
            "basis": "list_price_estimate",
            "pricing_date": "2026-09-26",
            "pricing_url": PRICING,
            "provider_id": result.get("search_id") or result.get("extract_id"),
        }
    )
