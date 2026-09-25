from __future__ import annotations

import fcntl
from functools import wraps
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

os.environ.setdefault(
    "MSWEA_GLOBAL_CONFIG_DIR", f"{tempfile.gettempdir()}/f1bench-mini-{os.getuid()}"
)
os.environ.setdefault("MSWEA_SILENT_STARTUP", "1")

from minisweagent import __version__ as mini_version
from minisweagent.agents.default import DefaultAgent
from minisweagent.environments.docker import DockerEnvironment, DockerEnvironmentConfig
from minisweagent.models.openrouter_model import OpenRouterModel

from . import __version__ as wrapper_version
from .core import (
    BenchError,
    ID_PATTERN,
    load_event,
    load_result,
    prediction_template,
    read_json,
    score_prediction,
    validate_prediction,
    validate_report,
    parse_time,
)

DEFAULT_IMAGE = "f1bench-agent:0.3.0"
COST_LIMIT_USD = 30.0
WALL_TIME_SECONDS = 120 * 60
CPUS = 4.0
MAX_TEXT_BYTES = 1_000_000
DEFAULT_OPENROUTER_PROVIDER = {"allow_fallbacks": True, "require_parameters": True}
SYSTEM_TEMPLATE = (
    "You are an autonomous Formula 1 forecaster. Use your judgment and tools to produce the most "
    "accurate, well-calibrated full-field race probabilities possible. Follow the output contract exactly."
)
DEBRIEF_SYSTEM_TEMPLATE = (
    "You are reviewing one of your completed Formula 1 forecasts. Learn useful, general lessons "
    "from the result without overfitting ordinary race randomness."
)
OPENROUTER_COST_POLICY = "cost_or_upstream_inference_cost"


class AgentDockerConfig(DockerEnvironmentConfig):
    timeout: int = WALL_TIME_SECONDS


class BenchOpenRouterModel(OpenRouterModel):
    """Use OpenRouter's upstream cost when its legacy cost field is empty."""

    def _calculate_cost(self, response: dict[str, Any]) -> dict[str, float]:
        usage = response.get("usage", {})
        cost = usage.get("cost", 0.0) if isinstance(usage, dict) else 0.0
        if isinstance(cost, (int, float)) and not isinstance(cost, bool) and cost > 0:
            return {"cost": float(cost)}
        details = usage.get("cost_details", {}) if isinstance(usage, dict) else {}
        upstream = (
            details.get("upstream_inference_cost", 0.0)
            if isinstance(details, dict)
            else 0.0
        )
        if (
            isinstance(upstream, (int, float))
            and not isinstance(upstream, bool)
            and upstream > 0
        ):
            return {"cost": float(upstream)}
        return super()._calculate_cost(response)


def entrant_name(model: str) -> str:
    name = re.sub(r"[^a-z0-9]+", "-", model.lower()).strip("-")
    if not name:
        raise BenchError("Could not derive an entrant name from the model")
    return name


def build_image(project_dir: Path, tag: str = DEFAULT_IMAGE) -> None:
    subprocess.run(["docker", "build", "--tag", tag, str(project_dir)], check=True)


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _write_json(path: Path, value: dict[str, Any]) -> None:
    _write_text(path, json.dumps(value, indent=2) + "\n")


def _write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(value)
    temporary.replace(path)


def _openrouter_model_config(
    model: str,
    expected_canonical: str | None,
    provider_policy: dict[str, Any] | None,
) -> dict[str, Any]:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise BenchError("OPENROUTER_API_KEY is not set")
    request = urllib.request.Request(
        "https://openrouter.ai/api/v1/models",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            models = json.load(response).get("data", [])
    except (OSError, urllib.error.URLError, json.JSONDecodeError) as error:
        raise BenchError(
            f"Could not read OpenRouter model metadata: {error}"
        ) from error
    details = next((item for item in models if item.get("id") == model), None)
    if details is None:
        raise BenchError(f"OpenRouter model not found: {model}")

    canonical = details.get("canonical_slug") or model
    if expected_canonical and canonical != expected_canonical:
        raise BenchError(
            f"{model} now resolves to {canonical}, not frozen model {expected_canonical}"
        )

    reasoning = details.get("reasoning")
    reasoning_config: dict[str, Any] | None = None
    if isinstance(reasoning, dict):
        supported = reasoning.get("supported_efforts")
        if isinstance(supported, list) and supported:
            rank = {
                name: index
                for index, name in enumerate(
                    ("none", "minimal", "low", "medium", "high", "xhigh", "max")
                )
            }
            effort = max(supported, key=lambda value: rank.get(value, -1))
            reasoning_config = {"effort": effort}
        elif supported is None or reasoning.get("supports_max_tokens"):
            reasoning_config = {"effort": "max"}
        else:
            reasoning_config = {"enabled": True}
    return {
        "reasoning_policy": "maximum_supported_at_creation",
        "reasoning_config": reasoning_config,
        "request_model": canonical,
        "openrouter_provider": dict(provider_policy or DEFAULT_OPENROUTER_PROVIDER),
    }


def prepare_entrant(
    root: Path,
    entrant: str,
    model: str,
    canonical_model: str | None,
    provider_policy: dict[str, Any] | None = None,
) -> tuple[Path, str, dict[str, Any] | None, dict[str, Any]]:
    if not ID_PATTERN.fullmatch(entrant):
        raise BenchError("entrant must contain only letters, numbers, '.', '_' or '-'")
    entrant_dir = root / entrant
    metadata_path = entrant_dir / "entrant.json"
    if metadata_path.exists():
        metadata = read_json(metadata_path)
        if metadata.get("model") != model:
            raise BenchError(
                f"Entrant {entrant!r} already uses model {metadata.get('model')!r}"
            )
        if canonical_model and metadata.get("request_model") != canonical_model:
            raise BenchError(
                f"Entrant {entrant!r} does not use frozen model {canonical_model!r}"
            )
        if metadata.get("reasoning_policy") != "maximum_supported_at_creation":
            raise BenchError(
                f"Entrant {entrant!r} does not have frozen maximum reasoning"
            )
        if (
            provider_policy is not None
            and metadata.get("openrouter_provider") != provider_policy
        ):
            raise BenchError(
                f"Entrant {entrant!r} does not have the frozen provider policy"
            )
    else:
        metadata = {
            "entrant": entrant,
            "model": model,
            **_openrouter_model_config(model, canonical_model, provider_policy),
            "created_at": _now(),
        }
        _write_json(metadata_path, metadata)

    request_model = metadata.get("request_model")
    reasoning_config = metadata.get("reasoning_config")
    openrouter_provider = metadata.get("openrouter_provider")
    if not isinstance(request_model, str) or not request_model:
        raise BenchError(f"Entrant {entrant!r} has no frozen request model")
    if reasoning_config is not None and not isinstance(reasoning_config, dict):
        raise BenchError(f"Entrant {entrant!r} has an invalid reasoning setting")
    if not isinstance(openrouter_provider, dict):
        raise BenchError(f"Entrant {entrant!r} has no frozen provider policy")
    notes = entrant_dir / "notes.md"
    if not notes.exists():
        _write_text(notes, "# Forecast notes\n")
    _text_artifact(notes)
    return entrant_dir, request_model, reasoning_config, openrouter_provider


def _copy_to_container(
    container: str, source: Path, target: str, *, archive: bool = False
) -> None:
    copy_source = f"{source.resolve()}/." if source.is_dir() else str(source.resolve())
    command = ["docker", "cp"]
    if archive:
        command.append("--archive")
    subprocess.run([*command, copy_source, f"{container}:{target}"], check=True)


def _copy_from_container(
    container: str, source: str, target: Path, *, required: bool
) -> bool:
    target.parent.mkdir(parents=True, exist_ok=True)
    process = subprocess.run(
        ["docker", "cp", f"{container}:{source}", str(target)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if process.returncode and required:
        raise BenchError(f"Agent did not create {source}")
    return process.returncode == 0


def _text_artifact(path: Path) -> str:
    if path.is_symlink() or not path.is_file():
        raise BenchError(f"Expected a regular file: {path.name}")
    if path.stat().st_size > MAX_TEXT_BYTES:
        raise BenchError(f"{path.name} exceeds the 1 MB limit")
    try:
        return path.read_text()
    except UnicodeDecodeError as error:
        raise BenchError(f"{path.name} must be UTF-8 text") from error


def _providers_used(path: Path) -> list[str]:
    if not path.is_file():
        return []
    try:
        messages = json.loads(path.read_text()).get("messages", [])
    except (json.JSONDecodeError, OSError, AttributeError):
        return []
    providers: list[str] = []
    for message in messages:
        response = (
            (message.get("extra") or {}).get("response")
            if isinstance(message, dict)
            else None
        )
        provider = response.get("provider") if isinstance(response, dict) else None
        if isinstance(provider, str) and provider not in providers:
            providers.append(provider)
    return providers


def _check_prediction_artifact(path: Path) -> None:
    if path.is_symlink() or not path.is_file():
        raise BenchError(f"{path.name} must be a regular file")
    if path.stat().st_size > MAX_TEXT_BYTES:
        raise BenchError(f"{path.name} exceeds the 1 MB limit")


def _build_history(
    entrant_dir: Path, event: dict[str, Any], events_root: Path, target: Path
) -> None:
    target.mkdir(parents=True)
    current_key = (event["season"], event["round"])
    event_runs = entrant_dir / "events"
    if not event_runs.exists():
        return
    for run_dir in sorted(path for path in event_runs.iterdir() if path.is_dir()):
        needed = (
            run_dir / "event.json",
            run_dir / "prediction.json",
            run_dir / "run.json",
        )
        if not all(path.is_file() for path in needed):
            continue
        prior_event = read_json(run_dir / "event.json")
        if (prior_event.get("season"), prior_event.get("round")) >= current_key:
            continue
        if read_json(run_dir / "run.json").get("status") != "completed":
            continue
        destination = target / prior_event["id"]
        destination.mkdir()
        for name in (
            "event.json",
            "prediction.json",
            "report.json",
            "explanation.md",
            "notes.md",
        ):
            source = run_dir / name
            if source.is_file():
                shutil.copy2(source, destination / name)
        result = events_root / prior_event["id"] / "result.json"
        if result.is_file():
            official = load_result(result, prior_event)
            shutil.copy2(result, destination / "result.json")
            _write_json(
                destination / "score.json",
                score_prediction(
                    read_json(run_dir / "prediction.json"), official, prior_event
                ),
            )
        review = entrant_dir / "debriefs" / prior_event["id"]
        if (review / "run.json").is_file() and read_json(review / "run.json").get(
            "status"
        ) == "completed":
            shutil.copy2(review / "notes.md", destination / "review.md")


def _forecast_task(event: dict[str, Any]) -> str:
    drivers = "\n".join(
        f"- {driver['id']}: {driver['name']} ({driver.get('team', 'team unknown')})"
        for driver in event["drivers"]
    )
    count = len(event["drivers"])
    return f"""Make the single pre-race forecast for {event["name"]}.

Use all public information available at the time of this run. Decide for yourself how to research, reason, write code, build models, or simulate. `web-search` finds sources and `web-extract` reads pages; both have `--help`.

/history is read-only and contains your earlier race predictions, research reports, official results, scores, and post-race reviews when available. Read your notes first, then examine relevant past races to understand recent form and whether earlier lessons still hold. /memory/notes.md is your only persistent writable memory; review or update it if useful. /workspace is disposable scratch space.

Drivers:
{drivers}

/output/prediction.json is already filled with the exact schema. Replace every null with a probability. Do not add fields. The positions array is P1 through P{count}. For each driver, positions + nc + dns + dsq must sum to 1; retirement is a separate probability. Every value must be finite and within [0, 1]. Across drivers, each position's total cannot exceed 1, and later-position occupancy cannot exceed earlier-position occupancy.

Your job is to predict where every driver lands, with defensible reasoning. Research the current grid and penalties, weekend pace, circuit, strategy, weather and reliability. Prefer primary sources; distinguish facts, inference and missing evidence. Check publication times and verify consequential claims. Do not invent sources or assume research snippets are reliable. Betting markets may be a cross-check, but disclose their influence and make your own case.

Use modeling only when it improves the call. Challenge your strongest assumption with a plausible alternative scenario and explain which drivers move. Compare your order with the starting grid: justify material departures and explain why track position holds elsewhere. A similar order is acceptable. Do not manufacture surprises, causal certainty, or complexity to look sophisticated. Spend effort resolving consequential uncertainty, not filling the time budget.

Also write /output/report.json with this exact readable structure:
{{"event_id": "{event["id"]}", "summary": "Your central race call", "order": ["driver IDs, each exactly once, best to worst"], "reasons": {{"driver ID": "Brief reason for this driver's place, including material risks"}}, "method": "What research/calculations you used, what they changed, and any market influence", "uncertainty": "Strongest assumption, alternative scenario and drivers affected", "insights": [{{"claim": "A specific evidence-based judgment; no clear edge is acceptable", "impact": "How it changes your forecast", "check": "What observable race evidence would support or weaken this explanation", "sources": ["s1"]}}], "sources": [{{"id": "s1", "title": "Source title", "url": "https://..."}}]}}

The order is your single full-field call, including drivers exposed to retirement; probabilities still represent all possible outcomes and are what get scored. Keep the order and reasons consistent with them. Provide a few useful insights, not a generic weekend recap. Source references are required; they do not substitute for reasoning. The report must be valid JSON. You may additionally write /output/explanation.md for longer calculations. Create no other files under /output. Validate your work carefully. When finished, run `echo COMPLETE_TASK_AND_SUBMIT_FINAL_OUTPUT` alone."""


def _debrief_task(event: dict[str, Any]) -> str:
    return f"""Review your forecast for {event["name"]} against the official race result.

/input contains the immutable event, your prediction and explanation, the official result, and your score. /history contains earlier completed races. Use public research, code, or any other available method if useful.

/memory/notes.md is your only persistent writable memory. Update it with compact lessons useful for future forecasts. Read report.json when present and revisit its specific claims and checks. Separate wrong assumptions, missing evidence, and ordinary race randomness; a correct pick does not prove its explanation. Record what to retain, change, or leave unresolved. Keep notes under 1,200 words by editing stale lessons instead of appending endlessly. Decide for yourself which differences reveal reusable forecasting errors and which were ordinary race randomness. Do not create a new forecast or modify files under /input or /history.

When finished, run `echo COMPLETE_TASK_AND_SUBMIT_FINAL_OUTPUT` alone."""


def _docker_environment(*, image: str, model: str, network: str) -> DockerEnvironment:
    return DockerEnvironment(
        config_class=AgentDockerConfig,
        image=image,
        cwd="/workspace",
        env={"HOME": "/tmp/f1bench-home", "PARALLEL_CLIENT_MODEL": model},
        container_timeout="120m",
        run_args=[
            "--rm",
            "--network",
            network,
            "--cpus",
            str(CPUS),
            "--user",
            f"{os.getuid()}:{os.getgid()}",
            *(["--env", "PARALLEL_API_KEY"] if os.getenv("PARALLEL_API_KEY") else []),
        ],
    )


def _execute_agent(
    *,
    image: str,
    model: str,
    notes: Path,
    history: Path,
    event_file: Path,
    template_file: Path,
    task: str,
    network: str,
    reasoning_config: dict[str, Any] | None,
    openrouter_provider: dict[str, Any],
    trajectory_path: Path,
    temporary: Path,
) -> tuple[dict[str, Any], Path, Path, Path | None, Path | None, float, int]:
    environment = _docker_environment(image=image, model=model, network=network)
    container = environment.container_id
    if not container:
        raise BenchError("Docker did not return a container id")
    try:
        _copy_to_container(container, history, "/history")
        _copy_to_container(container, event_file, "/input/event.json")
        _copy_to_container(container, notes, "/memory/notes.md", archive=True)
        _copy_to_container(
            container, template_file, "/output/prediction.json", archive=True
        )
        subprocess.run(
            [
                "docker",
                "exec",
                "--user",
                "0",
                container,
                "chmod",
                "-R",
                "a-w",
                "/input",
                "/history",
            ],
            check=True,
        )
        agent = DefaultAgent(
            BenchOpenRouterModel(
                model_name=model,
                model_kwargs={
                    "provider": openrouter_provider,
                    **({"reasoning": reasoning_config} if reasoning_config else {}),
                },
            ),
            environment,
            system_template=SYSTEM_TEMPLATE,
            instance_template="{{task}}",
            step_limit=0,
            cost_limit=COST_LIMIT_USD,
            wall_time_limit_seconds=WALL_TIME_SECONDS,
            output_path=trajectory_path,
        )
        outcome = agent.run(task)
        prediction = temporary / "prediction.json"
        report = temporary / "report.json"
        _copy_from_container(container, "/output/report.json", report, required=True)
        explanation = temporary / "explanation.md"
        updated_notes = temporary / "notes.md"
        _copy_from_container(
            container, "/output/prediction.json", prediction, required=True
        )
        has_explanation = _copy_from_container(
            container, "/output/explanation.md", explanation, required=False
        )
        has_notes = _copy_from_container(
            container, "/memory/notes.md", updated_notes, required=False
        )
        return (
            outcome,
            prediction,
            report,
            explanation if has_explanation else None,
            updated_notes if has_notes else None,
            agent.cost,
            agent.n_calls,
        )
    finally:
        environment.cleanup()


def _execute_debrief_agent(
    *,
    image: str,
    model: str,
    notes: Path,
    history: Path,
    inputs: Path,
    task: str,
    network: str,
    reasoning_config: dict[str, Any] | None,
    openrouter_provider: dict[str, Any],
    trajectory_path: Path,
    temporary: Path,
) -> tuple[dict[str, Any], Path, float, int]:
    environment = _docker_environment(image=image, model=model, network=network)
    container = environment.container_id
    if not container:
        raise BenchError("Docker did not return a container id")
    try:
        _copy_to_container(container, history, "/history")
        _copy_to_container(container, inputs, "/input")
        _copy_to_container(container, notes, "/memory/notes.md", archive=True)
        subprocess.run(
            [
                "docker",
                "exec",
                "--user",
                "0",
                container,
                "chmod",
                "-R",
                "a-w",
                "/input",
                "/history",
            ],
            check=True,
        )
        agent = DefaultAgent(
            BenchOpenRouterModel(
                model_name=model,
                model_kwargs={
                    "provider": openrouter_provider,
                    **({"reasoning": reasoning_config} if reasoning_config else {}),
                },
            ),
            environment,
            system_template=DEBRIEF_SYSTEM_TEMPLATE,
            instance_template="{{task}}",
            step_limit=0,
            cost_limit=COST_LIMIT_USD,
            wall_time_limit_seconds=WALL_TIME_SECONDS,
            output_path=trajectory_path,
        )
        outcome = agent.run(task)
        updated_notes = temporary / "updated-notes.md"
        _copy_from_container(
            container, "/memory/notes.md", updated_notes, required=True
        )
        return outcome, updated_notes, agent.cost, agent.n_calls
    finally:
        environment.cleanup()


def _memory_lock(function):
    @wraps(function)
    def locked(event_dir, **kwargs):
        root = kwargs["root"]
        entrant = kwargs.get("entrant") or entrant_name(kwargs["model"])
        if not ID_PATTERN.fullmatch(entrant):
            raise BenchError("Invalid entrant identifier")
        home = root / entrant
        home.mkdir(parents=True, exist_ok=True)
        with (home / ".memory.lock").open("a") as handle:
            try:
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as error:
                raise BenchError(f"Another run is using {entrant}'s memory") from error
            return function(event_dir, **kwargs)

    return locked


@_memory_lock
def run_forecast(
    event_dir: Path,
    *,
    model: str,
    root: Path,
    entrant: str | None = None,
    canonical_model: str | None = None,
    provider_policy: dict[str, Any] | None = None,
    image: str = DEFAULT_IMAGE,
    network: str = "bridge",
) -> Path:
    if not os.getenv("OPENROUTER_API_KEY"):
        raise BenchError("OPENROUTER_API_KEY is not set")
    if network == "bridge" and not os.getenv("PARALLEL_API_KEY"):
        raise BenchError("PARALLEL_API_KEY is not set")
    event = load_event(event_dir)
    if (event_dir / "result.json").exists():
        raise BenchError("Cannot forecast a race with a saved result")
    if not event.get("race_start"):
        raise BenchError("Set race_start with timezone before forecasting")
    if datetime.now(UTC) >= parse_time(event["race_start"]):
        raise BenchError(
            "Race has started; live research cannot produce an honest pre-race forecast"
        )
    entrant = entrant or entrant_name(model)
    entrant_dir, request_model, reasoning_config, openrouter_provider = prepare_entrant(
        root, entrant, model, canonical_model, provider_policy
    )
    run_dir = entrant_dir / "events" / event["id"]
    if run_dir.exists():
        raise BenchError(f"Immutable attempt already exists: {run_dir}")
    for prior in (entrant_dir / "events").glob("*/event.json"):
        previous = read_json(prior)
        if (previous["season"], previous["round"]) > (event["season"], event["round"]):
            raise BenchError(
                "Cannot forecast an earlier race with memory from a later race"
            )
    run_dir.mkdir(parents=True)
    _write_json(run_dir / "event.json", event)
    task = _forecast_task(event)
    started_clock = time.monotonic()
    metadata: dict[str, Any] = {
        "event_id": event["id"],
        "entrant": entrant,
        "model": model,
        "request_model": request_model,
        "reasoning": reasoning_config,
        "openrouter_provider": openrouter_provider,
        "openrouter_cost_policy": OPENROUTER_COST_POLICY,
        "budgets": {"wall_minutes": 120, "model_usd": COST_LIMIT_USD, "cpus": CPUS},
        "image": image,
        "network": network,
        "wrapper_version": wrapper_version,
        "mini_swe_agent_version": mini_version,
        "prompt_sha256": hashlib.sha256((SYSTEM_TEMPLATE + task).encode()).hexdigest(),
        "event_sha256": hashlib.sha256(
            (event_dir / "event.json").read_bytes()
        ).hexdigest(),
        "started_at": _now(),
        "status": "running",
    }
    _write_json(run_dir / "run.json", metadata)

    try:
        with tempfile.TemporaryDirectory(prefix="f1bench-") as temporary_name:
            temporary = Path(temporary_name)
            history = temporary / "history"
            _build_history(entrant_dir, event, event_dir.parent, history)
            template_file = temporary / "prediction-template.json"
            _write_json(template_file, prediction_template(event))
            (
                outcome,
                raw_prediction,
                raw_report,
                explanation,
                updated_notes,
                cost,
                calls,
            ) = _execute_agent(
                image=image,
                model=request_model,
                notes=entrant_dir / "notes.md",
                history=history,
                event_file=event_dir / "event.json",
                template_file=template_file,
                task=task,
                network=network,
                reasoning_config=reasoning_config,
                openrouter_provider=openrouter_provider,
                trajectory_path=run_dir / "trajectory.json",
                temporary=temporary,
            )
            if outcome.get("exit_status") != "Submitted":
                raise BenchError(
                    f"Agent stopped with status {outcome.get('exit_status', 'unknown')}"
                )
            _check_prediction_artifact(raw_prediction)
            prediction = read_json(raw_prediction)
            validate_prediction(prediction, event)
            if datetime.now(UTC) >= parse_time(event["race_start"]):
                raise BenchError(
                    "Forecast finished after race start and cannot be published"
                )
            _check_prediction_artifact(raw_report)
            report = read_json(raw_report)
            validate_report(report, event)
            _write_json(run_dir / "report.json", report)
            _write_json(run_dir / "prediction.json", prediction)
            if explanation:
                _write_text(run_dir / "explanation.md", _text_artifact(explanation))
            elif (
                isinstance(outcome.get("submission"), str)
                and outcome["submission"].strip()
            ):
                response = outcome["submission"].strip() + "\n"
                if len(response.encode()) <= MAX_TEXT_BYTES:
                    _write_text(run_dir / "explanation.md", response)
            notes_text = (
                _text_artifact(updated_notes)
                if updated_notes
                else _text_artifact(entrant_dir / "notes.md")
            )
            _write_text(entrant_dir / "notes.md", notes_text)
            _write_text(run_dir / "notes.md", notes_text)
            metadata |= {
                "status": "completed",
                "finished_at": _now(),
                "runtime_seconds": time.monotonic() - started_clock,
                "cost_usd": cost,
                "model_calls": calls,
                "providers_used": _providers_used(run_dir / "trajectory.json"),
                "prediction_sha256": hashlib.sha256(
                    (run_dir / "prediction.json").read_bytes()
                ).hexdigest(),
                "report_sha256": hashlib.sha256(
                    (run_dir / "report.json").read_bytes()
                ).hexdigest(),
                "notes_sha256": hashlib.sha256(
                    (entrant_dir / "notes.md").read_bytes()
                ).hexdigest(),
            }
            _write_json(run_dir / "run.json", metadata)
    except BaseException as error:
        metadata |= {
            "status": "failed",
            "finished_at": _now(),
            "runtime_seconds": time.monotonic() - started_clock,
            "error": type(error).__name__,
            "error_message": str(error)[:2000],
            "providers_used": _providers_used(run_dir / "trajectory.json"),
        }
        _write_json(run_dir / "run.json", metadata)
        raise
    return run_dir / "prediction.json"


@_memory_lock
def run_debrief(
    event_dir: Path,
    *,
    model: str,
    root: Path,
    entrant: str,
    canonical_model: str | None = None,
    provider_policy: dict[str, Any] | None = None,
    image: str = DEFAULT_IMAGE,
    network: str = "bridge",
) -> Path:
    event = load_event(event_dir)
    for later in (root / entrant / "events").glob("*/event.json"):
        other = read_json(later)
        if (other["season"], other["round"]) > (event["season"], event["round"]):
            raise BenchError(
                "Cannot rewrite memory with an older review after a later forecast"
            )
    result_path = event_dir / "result.json"
    result = load_result(result_path, event)
    entrant_dir, request_model, reasoning_config, openrouter_provider = prepare_entrant(
        root, entrant, model, canonical_model, provider_policy
    )
    forecast_dir = entrant_dir / "events" / event["id"]
    forecast_run = read_json(forecast_dir / "run.json")
    if forecast_run.get("status") != "completed":
        raise BenchError(
            f"Entrant {entrant!r} has no completed forecast for {event['id']}"
        )
    prediction_path = forecast_dir / "prediction.json"
    prediction = read_json(prediction_path)
    validate_prediction(prediction, event)

    debrief_dir = entrant_dir / "debriefs" / event["id"]
    if debrief_dir.exists():
        raise BenchError(f"Immutable debrief attempt already exists: {debrief_dir}")
    debrief_dir.mkdir(parents=True)

    task = _debrief_task(event)
    started_clock = time.monotonic()
    notes_path = entrant_dir / "notes.md"
    notes_before = _text_artifact(notes_path)
    metadata: dict[str, Any] = {
        "event_id": event["id"],
        "entrant": entrant,
        "model": model,
        "request_model": request_model,
        "reasoning": reasoning_config,
        "openrouter_provider": openrouter_provider,
        "openrouter_cost_policy": OPENROUTER_COST_POLICY,
        "budgets": {"wall_minutes": 120, "model_usd": COST_LIMIT_USD, "cpus": CPUS},
        "image": image,
        "network": network,
        "wrapper_version": wrapper_version,
        "mini_swe_agent_version": mini_version,
        "prompt_sha256": hashlib.sha256(
            (DEBRIEF_SYSTEM_TEMPLATE + task).encode()
        ).hexdigest(),
        "result_sha256": hashlib.sha256(result_path.read_bytes()).hexdigest(),
        "prediction_sha256": hashlib.sha256(prediction_path.read_bytes()).hexdigest(),
        "notes_before_sha256": hashlib.sha256(notes_before.encode()).hexdigest(),
        "started_at": _now(),
        "status": "running",
    }
    _write_json(debrief_dir / "run.json", metadata)

    try:
        with tempfile.TemporaryDirectory(prefix="f1bench-debrief-") as temporary_name:
            temporary = Path(temporary_name)
            history = temporary / "history"
            _build_history(entrant_dir, event, event_dir.parent, history)
            inputs = temporary / "input"
            inputs.mkdir()
            shutil.copy2(event_dir / "event.json", inputs / "event.json")
            shutil.copy2(result_path, inputs / "result.json")
            shutil.copy2(prediction_path, inputs / "prediction.json")
            report_path = forecast_dir / "report.json"
            if report_path.is_file():
                shutil.copy2(report_path, inputs / "report.json")
            explanation = forecast_dir / "explanation.md"
            if explanation.is_file():
                shutil.copy2(explanation, inputs / "explanation.md")
            _write_json(
                inputs / "score.json", score_prediction(prediction, result, event)
            )

            outcome, updated_notes, cost, calls = _execute_debrief_agent(
                image=image,
                model=request_model,
                notes=notes_path,
                history=history,
                inputs=inputs,
                task=task,
                network=network,
                reasoning_config=reasoning_config,
                openrouter_provider=openrouter_provider,
                trajectory_path=debrief_dir / "trajectory.json",
                temporary=temporary,
            )
            if outcome.get("exit_status") != "Submitted":
                raise BenchError(
                    f"Agent stopped with status {outcome.get('exit_status', 'unknown')}"
                )
            notes_text = _text_artifact(updated_notes)
            _write_text(notes_path, notes_text)
            _write_text(debrief_dir / "notes.md", notes_text)
            metadata |= {
                "status": "completed",
                "finished_at": _now(),
                "runtime_seconds": time.monotonic() - started_clock,
                "cost_usd": cost,
                "model_calls": calls,
                "providers_used": _providers_used(debrief_dir / "trajectory.json"),
                "notes_after_sha256": hashlib.sha256(notes_text.encode()).hexdigest(),
            }
            _write_json(debrief_dir / "run.json", metadata)
    except BaseException as error:
        metadata |= {
            "status": "failed",
            "finished_at": _now(),
            "runtime_seconds": time.monotonic() - started_clock,
            "error": type(error).__name__,
            "error_message": str(error)[:2000],
            "providers_used": _providers_used(debrief_dir / "trajectory.json"),
        }
        _write_json(debrief_dir / "run.json", metadata)
        raise
    return debrief_dir / "notes.md"
