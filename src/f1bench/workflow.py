"""Race lifecycle and a public, credential-free view of saved artifacts."""

from __future__ import annotations

import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from .costs import event_costs
from .core import (
    BenchError,
    load_event,
    load_result,
    parse_time,
    read_json,
    score_prediction,
    validate_prediction,
    validate_report,
)

DEFAULT_COHORT = Path("cohorts/frontier-v1.json")


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid4().hex}.tmp")
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")
    temporary.replace(path)


def cohort(path: Path) -> list[dict]:
    # Keep one canonical configuration validator without importing the runtime for exports.
    models = read_json(path).get("models")
    if not isinstance(models, list) or not models:
        raise BenchError("Configure at least one model in the cohort")
    from .core import ID_PATTERN

    seen = set()
    for item in models:
        if not isinstance(item, dict) or any(
            not isinstance(item.get(key), str) or not item[key]
            for key in ("model", "canonical_slug", "entrant")
        ):
            raise BenchError("Every model needs model, canonical_slug and entrant")
        if not ID_PATTERN.fullmatch(item["entrant"]) or item["entrant"] in seen:
            raise BenchError("Entrant names must be safe, unique identifiers")
        policy = item.get("provider", {})
        if (
            not isinstance(policy, dict)
            or policy.get("allow_fallbacks") is not True
            or policy.get("require_parameters") is not True
            or any(
                not isinstance(policy.get(k), list)
                or not policy[k]
                or any(not isinstance(x, str) or not x for x in policy[k])
                for k in ("order", "only")
            )
        ):
            raise BenchError("Every model needs an ordered, restricted provider policy")
        seen.add(item["entrant"])
    return models


def event_dirs(root: Path) -> list[Path]:
    items = [
        (load_event(path.parent), path.parent) for path in root.glob("*/event.json")
    ]
    keys = [(event["season"], event["round"]) for event, _ in items]
    ids = [event["id"] for event, _ in items]
    if len(keys) != len(set(keys)) or len(ids) != len(set(ids)):
        raise BenchError("Race IDs and season/round pairs must be unique")
    return [
        path for _, path in sorted(items, key=lambda x: (x[0]["season"], x[0]["round"]))
    ]


def attempt_status(path: Path) -> str:
    if not path.exists():
        return "pending"
    if not (path / "run.json").exists():
        return "incomplete"
    return read_json(path / "run.json").get("status", "incomplete")


def select_event(root: Path, runs: Path, models: list[dict], phase: str) -> Path:
    paths = event_dirs(root)
    for path in paths:
        event = load_event(path)
        if phase == "predict" and (
            (path / "result.json").exists()
            or (
                event.get("race_start")
                and parse_time(event["race_start"]) <= datetime.now(UTC)
            )
        ):
            continue
        if phase == "review" and not (path / "result.json").exists():
            continue
        folder = "events" if phase == "predict" else "debriefs"
        if any(
            attempt_status(runs / m["entrant"] / folder / event["id"]) != "completed"
            for m in models
        ):
            return path
    raise BenchError(f"No race needs {phase}. Use status to see what is waiting.")


def prepare_event(
    path: Path, *, source: Path, name: str, season: int, round_: int, race_start: str
) -> None:
    if path.exists():
        raise BenchError(f"Race directory already exists: {path}")
    if parse_time(race_start) <= datetime.now(UTC):
        raise BenchError("Prepare a future race; race_start must be in the future")
    previous = load_event(source)
    event = {
        "id": path.name,
        "name": name,
        "season": season,
        "round": round_,
        "race_start": race_start,
        "drivers": previous["drivers"],
    }
    if "points_positions" in previous:
        event["points_positions"] = previous["points_positions"]
    for other in event_dirs(path.parent):
        old = load_event(other)
        if (old["season"], old["round"]) == (season, round_):
            raise BenchError("That season and round already exist")
    path.mkdir(parents=True)
    try:
        write_json(path / "event.json", event)
        load_event(path)
    except Exception:
        (path / "event.json").unlink(missing_ok=True)
        path.rmdir()
        raise


def archive_failed(path: Path, *, retry: bool) -> bool:
    """Completed work is reused. Failed work can be explicitly archived and retried."""
    status = attempt_status(path)
    if status == "completed":
        return False
    if status == "pending":
        return True
    if status != "failed" or not retry:
        raise BenchError(
            f"{path}: {status}. Use --retry-failed only for a recorded failed attempt; "
            "running/incomplete attempts need investigation."
        )
    archive = (
        path.parent.parent / "attempts" / path.parent.name / path.name / uuid4().hex
    )
    archive.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(path), str(archive))
    return True


def check_previous_reviews(
    event: dict, events: Path, runs: Path, models: list[dict]
) -> None:
    for path in event_dirs(events):
        prior = load_event(path)
        if (prior["season"], prior["round"]) >= (event["season"], event["round"]):
            continue
        for model in models:
            home = runs / model["entrant"]
            if attempt_status(home / "events" / prior["id"]) == "completed":
                if (
                    not (path / "result.json").exists()
                    or attempt_status(home / "debriefs" / prior["id"]) != "completed"
                ):
                    raise BenchError(
                        f"Finish review for {prior['id']} / {model['entrant']} before the next forecast"
                    )
                review = read_json(home / "debriefs" / prior["id"] / "run.json")
                if (
                    review.get("result_sha256")
                    and review["result_sha256"]
                    != hashlib.sha256((path / "result.json").read_bytes()).hexdigest()
                ):
                    raise BenchError(
                        f"Result changed after review for {prior['id']}; reconcile it before continuing"
                    )


def run_weekend(
    path: Path,
    *,
    runs: Path,
    models: list[dict],
    phase: str,
    retry: bool,
    image: str,
    network: str,
) -> list[str]:
    from .runner import run_forecast, run_debrief

    event = load_event(path)
    if phase == "predict":
        if (path / "result.json").exists():
            raise BenchError("Cannot predict a race whose result is already saved")
        if not event.get("race_start") or parse_time(
            event["race_start"]
        ) <= datetime.now(UTC):
            raise BenchError("Set a future race_start with timezone before forecasting")
        check_previous_reviews(event, path.parent, runs, models)
    else:
        load_result(path / "result.json", event)

    def run_model(model):
        folder = "events" if phase == "predict" else "debriefs"
        attempt = runs / model["entrant"] / folder / event["id"]
        try:
            if not archive_failed(attempt, retry=retry):
                if phase == "review":
                    saved = read_json(attempt / "run.json").get("result_sha256")
                    if (
                        saved
                        and saved
                        != hashlib.sha256(
                            (path / "result.json").read_bytes()
                        ).hexdigest()
                    ):
                        raise BenchError(
                            "Official result changed after the saved review; reconcile the review before continuing"
                        )
                return None
            if (
                phase == "review"
                and attempt_status(runs / model["entrant"] / "events" / event["id"])
                != "completed"
            ):
                return f"{model['entrant']}: no completed forecast to review"
            arguments = dict(
                model=model["model"],
                canonical_model=model["canonical_slug"],
                root=runs,
                entrant=model["entrant"],
                image=image,
                network=network,
            )
            print(f"{phase}: {event['id']} / {model['entrant']}", flush=True)
            if phase == "predict":
                run_forecast(path, provider_policy=model["provider"], **arguments)
            else:
                run_debrief(path, provider_policy=model["provider"], **arguments)
            return None
        except Exception as error:
            return f"{model['entrant']}: {error}"

    with ThreadPoolExecutor(max_workers=len(models)) as pool:
        return [failure for failure in pool.map(run_model, models) if failure]


def race_data(path: Path, runs: Path, models: list[dict]) -> dict[str, Any]:
    event = load_event(path)
    result = (
        load_result(path / "result.json", event)
        if (path / "result.json").exists()
        else None
    )
    forecasts = []
    for model in models:
        home = runs / model["entrant"]
        attempt = home / "events" / event["id"]
        status = attempt_status(attempt)
        record = {
            "entrant": model["entrant"],
            "model": model["model"],
            "name": model.get("name", model["model"].split("/")[-1]),
            "status": status,
            "costs": event_costs(home, event["id"]),
            "review_status": attempt_status(home / "debriefs" / event["id"]),
        }
        if status == "completed":
            prediction = read_json(attempt / "prediction.json")
            validate_prediction(prediction, event)
            metadata = read_json(attempt / "run.json")
            saved_hash = metadata.get("prediction_sha256")
            if (
                saved_hash
                and saved_hash
                != hashlib.sha256(
                    (attempt / "prediction.json").read_bytes()
                ).hexdigest()
            ):
                raise BenchError(
                    f"Saved forecast changed: {attempt / 'prediction.json'}"
                )
            report = (
                read_json(attempt / "report.json")
                if (attempt / "report.json").exists()
                else None
            )
            report_hash = metadata.get("report_sha256")
            if report_hash and (
                report is None
                or report_hash
                != hashlib.sha256((attempt / "report.json").read_bytes()).hexdigest()
            ):
                raise BenchError(
                    f"Saved research report changed: {attempt / 'report.json'}"
                )
            if report is not None:
                validate_report(report, event)
            rows = []
            count = len(event["drivers"])
            for driver in event["drivers"]:
                probabilities = prediction["drivers"][driver["id"]]
                positions = probabilities["positions"]
                mean = sum((i + 1) * p for i, p in enumerate(positions)) + (
                    count + 1
                ) * sum(probabilities[k] for k in ("nc", "dns", "dsq"))
                rows.append(
                    {
                        **driver,
                        "expected_rank": mean,
                        "win": positions[0],
                        "podium": sum(positions[:3]),
                        "points": sum(
                            positions[i - 1]
                            for i in event.get(
                                "points_positions", range(1, min(10, count) + 1)
                            )
                        ),
                        "retirement": probabilities["retirement"],
                        "positions": positions,
                        "reason": report["reasons"][driver["id"]] if report else None,
                    }
                )
            if report:
                rows.sort(key=lambda d: report["order"].index(d["id"]))
            else:
                rows.sort(key=lambda d: (d["expected_rank"], d["id"]))
            record.update(
                rows=rows,
                report=report,
                explanation=(attempt / "explanation.md").read_text()
                if (attempt / "explanation.md").exists()
                else None,
                review=(home / "debriefs" / event["id"] / "notes.md").read_text()
                if record["review_status"] == "completed"
                else None,
                metrics=score_prediction(prediction, result, event) if result else None,
                run_details={
                    "model": metadata.get("request_model", model["model"]),
                    "reasoning": metadata.get("reasoning"),
                    "budgets": metadata.get("budgets"),
                    "runtime_seconds": metadata.get("runtime_seconds"),
                    "model_calls": metadata.get("model_calls"),
                    "cost_usd": metadata.get("cost_usd"),
                    "providers": metadata.get("providers_used", []),
                },
                cost_usd=metadata.get("cost_usd"),
                started_at=metadata.get("started_at"),
                finished_at=metadata.get("finished_at"),
            )
        forecasts.append(record)
    completed = sum(f["status"] == "completed" for f in forecasts)
    reviewed = sum(f["review_status"] == "completed" for f in forecasts)
    state = (
        "reviewed"
        if result and reviewed == len(models)
        else "scored"
        if result and completed
        else "result saved"
        if result
        else "forecast ready"
        if completed == len(models)
        else "partial forecast"
        if completed
        else "prepared"
    )
    if (
        not result
        and completed < len(models)
        and event.get("race_start")
        and parse_time(event["race_start"]) <= datetime.now(UTC)
    ):
        state = "awaiting result" if completed else "missed forecast"
    return {**event, "state": state, "result": result, "forecasts": forecasts}


def score_race(path: Path, runs: Path, models: list[dict]) -> Path:
    load_result(path / "result.json", load_event(path))
    race = race_data(path, runs, models)
    entrants = [
        {
            "entrant": f["entrant"],
            "model": f["model"],
            "metrics": f["metrics"],
            "cost_usd": f.get("cost_usd"),
        }
        for f in race["forecasts"]
        if f["status"] == "completed"
    ]
    entrants.sort(key=lambda x: x["metrics"]["mean_rps"])
    for i, item in enumerate(entrants, 1):
        item["rank"] = i
    output = path / "scores.json"
    write_json(
        output,
        {
            "event_id": race["id"],
            "ranked_by": "mean_rps",
            "lower_is_better": True,
            "result_sha256": hashlib.sha256(
                (path / "result.json").read_bytes()
            ).hexdigest(),
            "entrants": entrants,
            "missing": [
                f["entrant"] for f in race["forecasts"] if f["status"] != "completed"
            ],
        },
    )
    return output


def export_site(events: Path, runs: Path, models: list[dict], output: Path) -> Path:
    races = [race_data(path, runs, models) for path in event_dirs(events)]
    write_json(output, {"races": races})
    return output
