from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

from .core import (
    BenchError,
    load_event,
    load_result,
    read_json,
    score_prediction,
    validate_prediction,
)
from .runner import DEFAULT_IMAGE, build_image, run_forecast
from .workflow import (
    DEFAULT_COHORT,
    cohort,
    event_dirs,
    export_site,
    prepare_event,
    race_data,
    run_weekend,
    score_race,
    select_event,
)


def _runtime_options(parser):
    parser.add_argument("--runs-dir", type=Path, default=Path("runs"))
    parser.add_argument("--image", default=DEFAULT_IMAGE)
    parser.add_argument("--network", choices=("bridge", "none"), default="bridge")


def parser():
    root = argparse.ArgumentParser(
        prog="f1bench",
        description="Research the race. Make the call. Learn from the result.",
    )
    commands = root.add_subparsers(dest="command", required=True)
    prepare = commands.add_parser(
        "prepare", help="prepare the next race using an existing entry list"
    )
    prepare.add_argument("event", type=Path)
    prepare.add_argument("--from", dest="source", required=True, type=Path)
    prepare.add_argument("--name", required=True)
    prepare.add_argument("--season", type=int, required=True)
    prepare.add_argument("--round", dest="round_", type=int, required=True)
    prepare.add_argument(
        "--race-start", required=True, help="ISO timestamp including timezone"
    )
    for name, aliases, help_ in (
        ("predict", ["run-cohort"], "research and forecast; skip completed models"),
        (
            "review",
            ["debrief-event"],
            "score saved results, review the race, and update memory",
        ),
    ):
        command = commands.add_parser(name, aliases=aliases, help=help_)
        command.add_argument("event", type=Path, nargs="?")
        command.add_argument("--events-dir", type=Path, default=Path("events"))
        command.add_argument("--cohort", type=Path, default=DEFAULT_COHORT)
        command.add_argument("--retry-failed", action="store_true")
        command.add_argument(
            "--site-output", type=Path, default=Path("site/public/data.json")
        )
        _runtime_options(command)
    for name in ("status", "sync-site", "score-event"):
        command = commands.add_parser(
            name,
            help={
                "status": "show race progress and the next action",
                "sync-site": "refresh the website from saved files",
                "score-event": "score all completed forecasts without running models",
            }[name],
        )
        if name == "score-event":
            command.add_argument("event", type=Path)
        command.add_argument("--events-dir", type=Path, default=Path("events"))
        command.add_argument("--runs-dir", type=Path, default=Path("runs"))
        command.add_argument("--cohort", type=Path, default=DEFAULT_COHORT)
        command.add_argument(
            "--site-output", type=Path, default=Path("site/public/data.json")
        )
    build = commands.add_parser("build", help="build the agent image")
    build.add_argument("--tag", default=DEFAULT_IMAGE)
    run = commands.add_parser("run", help="run one model directly")
    run.add_argument("event", type=Path)
    run.add_argument("--model", required=True)
    run.add_argument("--canonical-model")
    run.add_argument("--entrant")
    _runtime_options(run)
    for name in ("validate", "score"):
        command = commands.add_parser(name)
        command.add_argument("event", type=Path)
        command.add_argument("prediction", type=Path)
    chart = commands.add_parser("chart", help="render the season score chart")
    chart.add_argument("--events-dir", type=Path, default=Path("events"))
    chart.add_argument("--output", type=Path, default=Path("charts/season.svg"))
    chart.add_argument("--season", type=int)
    return root


def main():
    args = parser().parse_args()
    try:
        if args.command == "prepare":
            prepare_event(
                args.event,
                source=args.source,
                name=args.name,
                season=args.season,
                round_=args.round_,
                race_start=args.race_start,
            )
            print(
                f"Prepared {args.event}. Verify the copied driver/team list and race start, then run f1bench predict {args.event}."
            )
        elif args.command in ("predict", "run-cohort", "review", "debrief-event"):
            models = cohort(args.cohort)
            phase = "predict" if args.command in ("predict", "run-cohort") else "review"
            path = args.event or select_event(
                args.events_dir, args.runs_dir, models, phase
            )
            if phase == "review":
                print(score_race(path, args.runs_dir, models))
            failures = run_weekend(
                path,
                runs=args.runs_dir,
                models=models,
                phase=phase,
                retry=args.retry_failed,
                image=args.image,
                network=args.network,
            )
            print(export_site(path.parent, args.runs_dir, models, args.site_output))
            if failures:
                raise BenchError("; ".join(failures))
        elif args.command in ("status", "sync-site", "score-event"):
            models = cohort(args.cohort)
            if args.command == "status":
                paths = event_dirs(args.events_dir)
                if not paths:
                    print("No races yet. Use f1bench prepare --help.")
                for path in paths:
                    race = race_data(path, args.runs_dir, models)
                    print(f"{race['id']}  {race['state']}")
                    for f in race["forecasts"]:
                        print(
                            f"  {f['name']}: forecast {f['status']}, review {f['review_status']}"
                        )
                    if race["state"] == "reviewed":
                        print("  Next: prepare the next race")
                    elif race["result"]:
                        print(
                            f"  Next: f1bench review {path} (use --retry-failed for recorded failures)"
                        )
                    elif race["state"] in (
                        "forecast ready",
                        "awaiting result",
                        "missed forecast",
                    ):
                        print(
                            f"  Next: add official {path}/result.json after the race, then f1bench review {path}"
                        )
                    else:
                        print(
                            f"  Next: f1bench predict {path} (use --retry-failed for recorded failures)"
                        )
            else:
                if args.command == "score-event":
                    print(score_race(args.event, args.runs_dir, models))
                print(
                    export_site(
                        args.event.parent
                        if args.command == "score-event"
                        else args.events_dir,
                        args.runs_dir,
                        models,
                        args.site_output,
                    )
                )
        elif args.command == "build":
            build_image(Path.cwd(), args.tag)
            print(args.tag)
        elif args.command == "run":
            print(
                run_forecast(
                    args.event,
                    model=args.model,
                    canonical_model=args.canonical_model,
                    root=args.runs_dir,
                    entrant=args.entrant,
                    image=args.image,
                    network=args.network,
                )
            )
        elif args.command in ("validate", "score"):
            event = load_event(args.event)
            prediction = read_json(args.prediction)
            validate_prediction(prediction, event)
            if args.command == "score":
                import json

                print(
                    json.dumps(
                        score_prediction(
                            prediction,
                            load_result(args.event / "result.json", event),
                            event,
                        ),
                        indent=2,
                    )
                )
            else:
                print("valid")
        elif args.command == "chart":
            from .chart import render_season_chart

            print(render_season_chart(args.events_dir, args.output, args.season))
    except (BenchError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(f"error: {error}") from error


if __name__ == "__main__":
    main()
