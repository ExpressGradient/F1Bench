"""Cost accounting without treating missing telemetry as zero."""

from __future__ import annotations

import json
import math
from pathlib import Path


def amount(value):
    return (
        value
        if (
            isinstance(value, (int, float))
            and not isinstance(value, bool)
            and math.isfinite(value)
            and value >= 0
        )
        else None
    )


def research_costs(path: Path) -> dict:
    if not path.is_file():
        return {"search_usd": None, "extract_usd": None}
    requests = {}
    try:
        for line in path.read_text().splitlines():
            item = json.loads(line)
            if (
                not isinstance(item, dict)
                or not isinstance(item.get("id"), str)
                or item.get("tool") not in ("search", "extract")
            ):
                raise ValueError("Invalid research usage entry")
            requests[item["id"]] = item
    except (ValueError, KeyError):
        return {"search_usd": None, "extract_usd": None}
    totals = {}
    for tool in ("search", "extract"):
        calls = [r for r in requests.values() if r.get("tool") == tool]
        values = [amount(r.get("cost_usd")) for r in calls]
        totals[f"{tool}_usd"] = (
            sum(values) if all(v is not None for v in values) else None
        )
    return totals


def run_costs(path: Path) -> dict:
    metadata = json.loads((path / "run.json").read_text())
    usage_path = path / "usage.json"
    usage = json.loads(usage_path.read_text()) if usage_path.is_file() else {}
    model_cost = amount(metadata.get("cost_usd"))
    parts = {
        "model_usd": model_cost
        if model_cost is not None
        else amount(usage.get("model_usd")),
        "search_usd": amount(usage.get("search_usd")),
        "extract_usd": amount(usage.get("extract_usd")),
    }
    return {
        **parts,
        "known_usd": sum(v for v in parts.values() if v is not None),
        "total_usd": sum(parts.values())
        if all(v is not None for v in parts.values())
        else None,
        "estimated": bool(usage.get("estimated")),
        "runs": 1,
    }


def sum_costs(costs: list[dict]) -> dict:
    result = {
        key: sum(c[key] for c in costs)
        if all(c[key] is not None for c in costs)
        else None
        for key in ("model_usd", "search_usd", "extract_usd", "total_usd")
    }
    return {
        **result,
        "known_usd": sum(c["known_usd"] for c in costs),
        "estimated": any(c["estimated"] for c in costs),
        "runs": sum(c["runs"] for c in costs),
    }


def event_costs(home: Path, event_id: str) -> dict:
    groups = {"forecast": [], "review": [], "failed": []}
    for path in home.rglob("run.json"):
        metadata = json.loads(path.read_text())
        if metadata.get("event_id") != event_id:
            continue
        relative = path.relative_to(home)
        phase = "forecast" if relative.parts[0] == "events" else "review"
        if (
            relative.parts[0] in ("attempts", "voids")
            or metadata.get("status") != "completed"
        ):
            phase = "failed"
        groups[phase].append(run_costs(path.parent))
    result = {phase: sum_costs(costs) for phase, costs in groups.items()}
    result["total"] = sum_costs(list(result.values()))
    return result
