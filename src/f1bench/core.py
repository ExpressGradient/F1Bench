from __future__ import annotations

import json
import math
import re
from datetime import datetime
from urllib.parse import urlparse
from pathlib import Path
from typing import Any

NON_CLASSIFIED = ("nc", "dns", "dsq")
ID_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]*$")


class BenchError(ValueError):
    pass


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text())
    except FileNotFoundError as error:
        raise BenchError(f"Missing file: {path}") from error
    except json.JSONDecodeError as error:
        raise BenchError(f"Invalid JSON in {path}: {error}") from error
    if not isinstance(value, dict):
        raise BenchError(f"Expected a JSON object in {path}")
    return value


def load_event(event_dir: Path) -> dict[str, Any]:
    event = read_json(event_dir / "event.json")
    missing = [
        key for key in ("id", "name", "season", "round", "drivers") if key not in event
    ]
    if missing:
        raise BenchError(f"event.json is missing: {', '.join(missing)}")
    if not isinstance(event["id"], str) or not ID_PATTERN.fullmatch(event["id"]):
        raise BenchError("event.id must contain only letters, numbers, '.', '_' or '-'")
    if not isinstance(event["name"], str) or not event["name"]:
        raise BenchError("event.name must be a non-empty string")
    if "race_start" in event:
        parse_time(event["race_start"])
    if isinstance(event["season"], bool) or not isinstance(event["season"], int):
        raise BenchError("event.season must be an integer")
    if isinstance(event["round"], bool) or not isinstance(event["round"], int):
        raise BenchError("event.round must be an integer")
    if not isinstance(event["drivers"], list) or len(event["drivers"]) < 2:
        raise BenchError("event.drivers must contain at least two drivers")

    ids: list[str] = []
    for driver in event["drivers"]:
        if (
            not isinstance(driver, dict)
            or not isinstance(driver.get("id"), str)
            or not isinstance(driver.get("name"), str)
            or not driver["name"]
        ):
            raise BenchError("Each driver needs string id and name fields")
        if not ID_PATTERN.fullmatch(driver["id"]):
            raise BenchError(f"Invalid driver id: {driver['id']!r}")
        ids.append(driver["id"])
    if len(ids) != len(set(ids)):
        raise BenchError("Driver ids must be unique")

    points = event.get("points_positions", list(range(1, min(10, len(ids)) + 1)))
    if (
        not isinstance(points, list)
        or any(
            isinstance(position, bool) or not isinstance(position, int)
            for position in points
        )
        or len(points) != len(set(points))
        or any(position < 1 or position > len(ids) for position in points)
    ):
        raise BenchError(
            "event.points_positions must contain unique valid finishing positions"
        )
    return event


def parse_time(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            raise ValueError("timezone required")
        return parsed
    except (AttributeError, TypeError, ValueError) as error:
        raise BenchError("race_start must be an ISO timestamp with timezone") from error


def validate_report(report: dict[str, Any], event: dict[str, Any]) -> None:
    """Validate a readable forecast without prescribing the research method."""
    if report.get("event_id") != event["id"]:
        raise BenchError("report.event_id must match the event")
    for key in ("summary", "method", "uncertainty"):
        if not isinstance(report.get(key), str) or not report[key].strip():
            raise BenchError(f"report.{key} must be non-empty text")
    order = report.get("order")
    if (
        not isinstance(order, list)
        or any(not isinstance(x, str) for x in order)
        or len(order) != len(driver_ids(event))
        or set(order) != set(driver_ids(event))
    ):
        raise BenchError("report.order must contain every driver exactly once")
    reasons = report.get("reasons")
    if (
        not isinstance(reasons, dict)
        or set(reasons) != set(order)
        or any(not isinstance(x, str) or not x.strip() for x in reasons.values())
    ):
        raise BenchError("report.reasons needs a non-empty reason for every driver")
    sources = report.get("sources")
    if not isinstance(sources, list) or not sources:
        raise BenchError("report.sources must contain the sources actually used")
    source_ids = set()
    for source in sources:
        if not isinstance(source, dict) or any(
            not isinstance(source.get(k), str) or not source[k].strip()
            for k in ("id", "title", "url")
        ):
            raise BenchError("Each source needs id, title, url")
        url = urlparse(source["url"])
        if (
            url.scheme not in ("https", "http")
            or not url.netloc
            or source["id"] in source_ids
        ):
            raise BenchError("Source IDs must be unique and URLs must be HTTP(S)")
        source_ids.add(source["id"])
    insights = report.get("insights")
    if not isinstance(insights, list) or not insights:
        raise BenchError("report.insights must explain at least one important judgment")
    for insight in insights:
        if not isinstance(insight, dict) or any(
            not isinstance(insight.get(k), str) or not insight[k].strip()
            for k in ("claim", "impact", "check")
        ):
            raise BenchError("Each insight needs claim, impact, check")
        evidence = insight.get("sources")
        if (
            not isinstance(evidence, list)
            or not evidence
            or any(not isinstance(x, str) or x not in source_ids for x in evidence)
        ):
            raise BenchError("Each insight must reference known source IDs")


def driver_ids(event: dict[str, Any]) -> list[str]:
    return [driver["id"] for driver in event["drivers"]]


def prediction_template(event: dict[str, Any]) -> dict[str, Any]:
    count = len(event["drivers"])
    return {
        "event_id": event["id"],
        "drivers": {
            driver_id: {
                "positions": [None] * count,
                "nc": None,
                "dns": None,
                "dsq": None,
                "retirement": None,
            }
            for driver_id in driver_ids(event)
        },
    }


def validate_prediction(prediction: dict[str, Any], event: dict[str, Any]) -> None:
    if set(prediction) != {"event_id", "drivers"}:
        raise BenchError("prediction must contain exactly event_id and drivers")
    if prediction["event_id"] != event["id"]:
        raise BenchError(f"prediction.event_id must be {event['id']!r}")

    ids = driver_ids(event)
    drivers = prediction["drivers"]
    if not isinstance(drivers, dict) or set(drivers) != set(ids):
        raise BenchError("drivers must contain exactly the event driver ids")

    matrix: list[list[float]] = []
    expected_fields = {"positions", "nc", "dns", "dsq", "retirement"}
    for driver_id in ids:
        forecast = drivers[driver_id]
        if not isinstance(forecast, dict) or set(forecast) != expected_fields:
            raise BenchError(f"drivers.{driver_id} has the wrong fields")
        row = forecast["positions"]
        if not isinstance(row, list) or len(row) != len(ids):
            raise BenchError(
                f"drivers.{driver_id}.positions must have {len(ids)} values"
            )
        values = [
            *row,
            *(forecast[outcome] for outcome in (*NON_CLASSIFIED, "retirement")),
        ]
        if any(
            isinstance(value, bool) or not isinstance(value, (int, float))
            for value in values
        ):
            raise BenchError(f"drivers.{driver_id} probabilities must be numbers")
        numeric = [float(value) for value in values]
        if any(not math.isfinite(value) or value < 0 or value > 1 for value in numeric):
            raise BenchError(
                f"drivers.{driver_id} probabilities must be finite and between 0 and 1"
            )
        position_row = numeric[: len(ids)]
        if not math.isclose(
            sum(position_row) + sum(numeric[len(ids) : len(ids) + 3]), 1.0, abs_tol=1e-6
        ):
            raise BenchError(f"drivers.{driver_id} positions/NC/DNS/DSQ must sum to 1")
        matrix.append(position_row)

    occupancy = list(map(sum, zip(*matrix, strict=True)))
    for position, total in enumerate(occupancy, start=1):
        if total > 1.0 + 1e-6:
            raise BenchError(
                f"Position {position} total probability cannot exceed 1 (got {total:.8f})"
            )
    if any(later > earlier + 1e-6 for earlier, later in zip(occupancy, occupancy[1:])):
        raise BenchError("Position occupancy cannot increase at later positions")


def load_result(path: Path, event: dict[str, Any]) -> dict[str, Any]:
    result = read_json(path)
    if result.get("event_id") != event["id"]:
        raise BenchError(f"result.event_id must be {event['id']!r}")
    results = result.get("results")
    expected = set(driver_ids(event))
    if not isinstance(results, list) or len(results) != len(expected):
        raise BenchError("result.results must contain every event driver exactly once")
    seen: set[str] = set()
    classified_positions: list[int] = []
    for driver in results:
        if not isinstance(driver, dict) or not isinstance(driver.get("driver_id"), str):
            raise BenchError("Each result needs a driver_id")
        driver_id = driver["driver_id"]
        if driver_id not in expected or driver_id in seen:
            raise BenchError(f"Unknown or duplicate result driver: {driver_id!r}")
        seen.add(driver_id)
        status = driver.get("status")
        if status not in ("classified", *NON_CLASSIFIED):
            raise BenchError(f"Invalid status for {driver_id}: {status!r}")
        if not isinstance(driver.get("retired"), bool):
            raise BenchError(f"result retired flag for {driver_id} must be boolean")
        position = driver.get("position")
        if status == "classified":
            if (
                isinstance(position, bool)
                or not isinstance(position, int)
                or position < 1
            ):
                raise BenchError(
                    f"Classified driver {driver_id} needs a positive position"
                )
            classified_positions.append(position)
        elif position is not None:
            raise BenchError(
                f"Unclassified driver {driver_id} must have a null position"
            )
    if seen != expected:
        raise BenchError("result.results must contain every event driver exactly once")
    if sorted(classified_positions) != list(range(1, len(classified_positions) + 1)):
        raise BenchError("Classified positions must be unique and contiguous from 1")
    return result


def score_prediction(
    prediction: dict[str, Any], result: dict[str, Any], event: dict[str, Any]
) -> dict[str, float | int]:
    validate_prediction(prediction, event)
    actual = {driver["driver_id"]: driver for driver in result["results"]}
    count = len(actual)
    points_positions = set(event.get("points_positions", range(1, min(10, count) + 1)))
    metrics = {
        name: 0.0
        for name in ("log", "rps", "rank", "retirement", "win", "podium", "points")
    }
    for driver_id in driver_ids(event):
        truth = actual[driver_id]
        forecast = prediction["drivers"][driver_id]
        row = [float(value) for value in forecast["positions"]]
        unclassified = sum(float(forecast[outcome]) for outcome in NON_CLASSIFIED)
        actual_rank = (
            truth["position"] if truth["status"] == "classified" else count + 1
        )
        probability = (
            row[actual_rank - 1]
            if actual_rank <= count
            else float(forecast[truth["status"]])
        )
        metrics["log"] -= math.log(max(probability, 1e-15))
        cumulative = 0.0
        for position, position_probability in enumerate(row, start=1):
            cumulative += position_probability
            metrics["rps"] += (cumulative - float(actual_rank <= position)) ** 2
        expected_rank = sum(
            position * value for position, value in enumerate(row, start=1)
        )
        expected_rank += (count + 1) * unclassified
        metrics["rank"] += abs(expected_rank - actual_rank)
        metrics["retirement"] += (
            float(forecast["retirement"]) - float(truth["retired"])
        ) ** 2
        metrics["win"] += (row[0] - float(truth["position"] == 1)) ** 2
        metrics["podium"] += (
            sum(row[: min(3, count)]) - float(truth["position"] in range(1, 4))
        ) ** 2
        metrics["points"] += (
            sum(row[position - 1] for position in points_positions)
            - float(truth["position"] in points_positions)
        ) ** 2
    return {
        "drivers": count,
        "mean_rps": metrics["rps"] / (count * count),
        "mean_log_loss": metrics["log"] / count,
        "retirement_brier": metrics["retirement"] / count,
        "win_brier": metrics["win"] / count,
        "podium_brier": metrics["podium"] / count,
        "points_brier": metrics["points"] / count,
        "expected_rank_mae": metrics["rank"] / count,
    }
