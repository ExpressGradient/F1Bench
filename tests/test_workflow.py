import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from f1bench.core import BenchError, validate_report
from f1bench.runner import _build_history, run_forecast
from f1bench.workflow import (
    archive_failed,
    check_previous_reviews,
    export_site,
    prepare_event,
    race_data,
    run_weekend,
    score_race,
    select_event,
    write_json,
)
from test_core import EVENT, PREDICTION

MODEL = {
    "entrant": "test-model",
    "model": "test/model",
    "canonical_slug": "test/model-v1",
    "name": "Test Model",
    "provider": {
        "order": ["test"],
        "only": ["test"],
        "allow_fallbacks": True,
        "require_parameters": True,
    },
}
RESULT = {
    "event_id": EVENT["id"],
    "results": [
        {"driver_id": "AAA", "position": 1, "status": "classified", "retired": False},
        {"driver_id": "BBB", "position": 2, "status": "classified", "retired": False},
    ],
}
REPORT = {
    "event_id": EVENT["id"],
    "summary": "A leads",
    "order": ["AAA", "BBB"],
    "reasons": {"AAA": "Better pace", "BBB": "Less pace"},
    "method": "Compared practice",
    "uncertainty": "Rain would favor B",
    "insights": [
        {
            "claim": "A has pace",
            "impact": "A first",
            "check": "Compare clean-air laps",
            "sources": ["s1"],
        }
    ],
    "sources": [
        {"id": "s1", "title": "Practice", "url": "https://example.com/practice"}
    ],
}


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.events = self.root / "events"
        self.runs = self.root / "runs"
        self.event = self.events / EVENT["id"]
        self.home = self.runs / MODEL["entrant"]
        self.attempt = self.home / "events" / EVENT["id"]
        write_json(
            self.event / "event.json", EVENT | {"race_start": "2099-01-01T12:00:00Z"}
        )

    def completed(self, report=False):
        write_json(self.attempt / "event.json", EVENT)
        write_json(self.attempt / "prediction.json", PREDICTION)
        write_json(self.attempt / "run.json", {"status": "completed"})
        (self.attempt / "explanation.md").write_text("Original research")
        if report:
            write_json(self.attempt / "report.json", REPORT)

    def reviewed(self):
        write_json(self.event / "result.json", RESULT)
        review = self.home / "debriefs" / EVENT["id"]
        write_json(review / "run.json", {"status": "completed"})
        (review / "notes.md").write_text("Keep checking clean-air pace")

    def test_report_rejects_duplicate_order_and_unknown_sources(self):
        validate_report(REPORT, EVENT)
        for bad in (
            REPORT | {"order": ["AAA", "AAA"]},
            REPORT | {"reasons": {"AAA": "A"}},
            REPORT | {"insights": [REPORT["insights"][0] | {"sources": ["missing"]}]},
        ):
            with self.assertRaises(BenchError):
                validate_report(bad, EVENT)

    def test_legacy_export_preserves_original_artifacts_and_scores(self):
        self.completed()
        self.reviewed()
        before = {p: p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        out = export_site(self.events, self.runs, [MODEL], self.root / "data.json")
        race = json.loads(out.read_text())["races"][0]
        f = race["forecasts"][0]
        self.assertIsNone(f["report"])
        self.assertEqual([r["id"] for r in f["rows"]], ["AAA", "BBB"])
        self.assertEqual(f["explanation"], "Original research")
        self.assertEqual(f["review"], "Keep checking clean-air pace")
        self.assertIsNotNone(f["metrics"])
        for path, content in before.items():
            self.assertEqual(path.read_bytes(), content)

    def test_new_report_order_is_used_without_changing_probabilities(self):
        self.completed(report=True)
        report = REPORT | {"order": ["BBB", "AAA"]}
        write_json(self.attempt / "report.json", report)
        f = race_data(self.event, self.runs, [MODEL])["forecasts"][0]
        self.assertEqual(f["rows"][0]["id"], "BBB")
        self.assertEqual(f["rows"][0]["win"], 0.25)
        self.assertIsNone(f["metrics"])

    def test_partial_scores_do_not_drop_successful_models(self):
        self.completed()
        write_json(self.event / "result.json", RESULT)
        second = MODEL | {"entrant": "missing-model"}
        path = score_race(self.event, self.runs, [MODEL, second])
        score = json.loads(path.read_text())
        self.assertEqual(len(score["entrants"]), 1)
        self.assertEqual(score["missing"], ["missing-model"])

    def test_failed_retry_is_explicit_and_preserves_attempt(self):
        write_json(self.attempt / "run.json", {"status": "failed"})
        (self.attempt / "trajectory.json").write_text("original trace")
        with self.assertRaises(BenchError):
            archive_failed(self.attempt, retry=False)
        self.assertTrue(archive_failed(self.attempt, retry=True))
        archived = list((self.home / "attempts").rglob("trajectory.json"))
        self.assertEqual(len(archived), 1)
        self.assertEqual(archived[0].read_text(), "original trace")
        self.assertFalse(self.attempt.exists())

    def test_completed_and_running_attempts_never_get_archived(self):
        self.completed()
        self.assertFalse(archive_failed(self.attempt, retry=True))
        self.assertTrue((self.attempt / "prediction.json").exists())
        write_json(self.attempt / "run.json", {"status": "running"})
        with self.assertRaises(BenchError):
            archive_failed(self.attempt, retry=True)

    def test_next_race_waits_for_review_then_receives_history(self):
        self.completed(report=True)
        future = EVENT | {"id": "next-gp", "round": 2}
        with self.assertRaises(BenchError):
            check_previous_reviews(future, self.events, self.runs, [MODEL])
        self.reviewed()
        check_previous_reviews(future, self.events, self.runs, [MODEL])
        history = self.root / "history"
        _build_history(self.home, future, self.events, history)
        saved = history / EVENT["id"]
        self.assertEqual(
            json.loads((saved / "prediction.json").read_text()), PREDICTION
        )
        self.assertEqual(json.loads((saved / "result.json").read_text()), RESULT)
        self.assertTrue((saved / "score.json").exists())
        self.assertTrue((saved / "report.json").exists())
        self.assertEqual(
            (saved / "review.md").read_text(), "Keep checking clean-air pace"
        )

    def test_prepare_copies_entries_but_not_results_or_predictions(self):
        self.completed()
        self.reviewed()
        next_path = self.events / "next-gp"
        prepare_event(
            next_path,
            source=self.event,
            name="Next GP",
            season=2026,
            round_=2,
            race_start="2099-02-01T12:00:00Z",
        )
        self.assertEqual(set(p.name for p in next_path.iterdir()), {"event.json"})
        self.assertEqual(
            json.loads((next_path / "event.json").read_text())["drivers"],
            EVENT["drivers"],
        )
        self.assertEqual(
            select_event(self.events, self.runs, [MODEL], "predict"), next_path
        )
        with self.assertRaises(BenchError):
            prepare_event(
                next_path,
                source=self.event,
                name="Again",
                season=2026,
                round_=3,
                race_start="2099-03-01T12:00:00Z",
            )

    def test_repeat_review_does_not_call_model(self):
        self.completed()
        self.reviewed()
        with patch("f1bench.runner.run_debrief") as debrief:
            errors = run_weekend(
                self.event,
                runs=self.runs,
                models=[MODEL],
                phase="review",
                retry=False,
                image="test",
                network="none",
            )
        self.assertEqual(errors, [])
        debrief.assert_not_called()

    def test_no_forecast_after_known_result(self):
        write_json(self.event / "result.json", RESULT)
        with patch("f1bench.runner.run_forecast") as forecast:
            with self.assertRaises(BenchError):
                run_weekend(
                    self.event,
                    runs=self.runs,
                    models=[MODEL],
                    phase="predict",
                    retry=False,
                    image="test",
                    network="none",
                )
        forecast.assert_not_called()

    def test_no_forecast_after_race_start(self):
        write_json(
            self.event / "event.json", EVENT | {"race_start": "2000-01-01T12:00:00Z"}
        )
        with self.assertRaises(BenchError):
            run_weekend(
                self.event,
                runs=self.runs,
                models=[MODEL],
                phase="predict",
                retry=False,
                image="test",
                network="none",
            )

    def test_new_forecast_persists_report_and_carries_notes(self):
        raw_prediction = self.root / "raw-prediction.json"
        raw_report = self.root / "raw-report.json"
        write_json(raw_prediction, PREDICTION)
        write_json(raw_report, REPORT)
        self.home.mkdir(parents=True)
        (self.home / "notes.md").write_text("Prior lesson")
        updated = self.root / "updated.md"
        updated.write_text("Refined lesson")
        with (
            patch.dict("os.environ", {"OPENROUTER_API_KEY": "test"}),
            patch(
                "f1bench.runner.prepare_entrant",
                return_value=(self.home, "test/model", {}, {}),
            ),
            patch(
                "f1bench.runner._execute_agent",
                return_value=(
                    {"exit_status": "Submitted"},
                    raw_prediction,
                    raw_report,
                    None,
                    updated,
                    1.0,
                    3,
                ),
            ) as execute,
        ):
            output = run_forecast(
                self.event,
                model=MODEL["model"],
                root=self.runs,
                entrant=MODEL["entrant"],
                network="none",
            )
        self.assertEqual(json.loads(output.read_text()), PREDICTION)
        self.assertEqual(json.loads((self.attempt / "report.json").read_text()), REPORT)
        self.assertEqual((self.home / "notes.md").read_text(), "Refined lesson")
        self.assertEqual(execute.call_args.kwargs["notes"], self.home / "notes.md")
        self.assertEqual(
            json.loads((self.attempt / "run.json").read_text())["status"], "completed"
        )

    def test_missing_report_fails_without_replacing_memory(self):
        raw = self.root / "raw.json"
        write_json(raw, PREDICTION)
        invalid = self.root / "report.json"
        write_json(invalid, REPORT | {"reasons": {}})
        self.home.mkdir(parents=True)
        (self.home / "notes.md").write_text("Prior lesson")
        with (
            patch.dict("os.environ", {"OPENROUTER_API_KEY": "test"}),
            patch(
                "f1bench.runner.prepare_entrant",
                return_value=(self.home, "test/model", {}, {}),
            ),
            patch(
                "f1bench.runner._execute_agent",
                return_value=(
                    {"exit_status": "Submitted"},
                    raw,
                    invalid,
                    None,
                    None,
                    1.0,
                    3,
                ),
            ),
        ):
            with self.assertRaises(BenchError):
                run_forecast(
                    self.event,
                    model=MODEL["model"],
                    root=self.runs,
                    entrant=MODEL["entrant"],
                    network="none",
                )
        self.assertEqual((self.home / "notes.md").read_text(), "Prior lesson")
        self.assertEqual(
            json.loads((self.attempt / "run.json").read_text())["status"], "failed"
        )
        self.assertFalse((self.attempt / "prediction.json").exists())

    def test_memory_lock_rejects_a_second_writer(self):
        import fcntl

        self.home.mkdir(parents=True)
        with (self.home / ".memory.lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaisesRegex(BenchError, "Another run"):
                run_forecast(
                    self.event,
                    model=MODEL["model"],
                    root=self.runs,
                    entrant=MODEL["entrant"],
                    network="none",
                )

    def test_unexpected_model_failure_does_not_discard_another_forecast(self):
        self.completed()
        second = MODEL | {"entrant": "second-model"}
        with patch(
            "f1bench.runner.run_forecast", side_effect=RuntimeError("provider stopped")
        ):
            failures = run_weekend(
                self.event,
                runs=self.runs,
                models=[MODEL, second],
                phase="predict",
                retry=False,
                image="test",
                network="none",
            )
        self.assertEqual(len(failures), 1)
        self.assertIn("provider stopped", failures[0])
        self.assertEqual(
            json.loads((self.attempt / "prediction.json").read_text()), PREDICTION
        )

    def test_export_rejects_a_changed_frozen_prediction(self):
        self.completed()
        write_json(
            self.attempt / "run.json",
            {"status": "completed", "prediction_sha256": "wrong"},
        )
        with self.assertRaisesRegex(BenchError, "Saved forecast changed"):
            race_data(self.event, self.runs, [MODEL])

    def test_changed_result_blocks_next_race_until_review_is_reconciled(self):
        self.completed()
        self.reviewed()
        write_json(
            self.home / "debriefs" / EVENT["id"] / "run.json",
            {"status": "completed", "result_sha256": "old-result"},
        )
        with self.assertRaisesRegex(BenchError, "Result changed"):
            check_previous_reviews(
                EVENT | {"round": 2}, self.events, self.runs, [MODEL]
            )


if __name__ == "__main__":
    unittest.main()
