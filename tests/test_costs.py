import importlib.util
import json
import io
import runpy
import sys
from contextlib import redirect_stdout
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from f1bench.costs import event_costs, research_costs, run_costs
from f1bench.runner import _save_usage

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "parallel_usage", ROOT / "container/parallel_usage.py"
)
usage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(usage)


class CostTests(unittest.TestCase):
    def test_request_units_partial_failure_and_unknown_ledger(self):
        with tempfile.TemporaryDirectory() as temp:
            ledger = Path(temp) / "ledger.jsonl"
            self.assertIsNone(research_costs(ledger)["search_usd"])
            ledger.touch()
            with patch.object(usage, "LEDGER", str(ledger)):
                self.assertEqual(
                    research_costs(ledger), {"search_usd": 0, "extract_usd": 0}
                )
                search = usage.begin("search", 1)
                usage.finish(search, "search", {"results": [{}] * 12})
                extract = usage.begin("extract", 3)
                usage.finish(extract, "extract", {"results": [{}] * 3})
                self.assertAlmostEqual(research_costs(ledger)["search_usd"], 0.007)
                self.assertAlmostEqual(research_costs(ledger)["extract_usd"], 0.003)
                usage.begin("search", 1)  # timeout or killed request
                self.assertIsNone(research_costs(ledger)["search_usd"])
                partial = usage.begin("extract", 2)
                usage.finish(partial, "extract", {"results": [{}], "errors": [{}]})
                self.assertIsNone(research_costs(ledger)["extract_usd"])
            for invalid in ("{bad json", "null", "[]", '{"id":"1","tool":"typo"}'):
                ledger.write_text(invalid)
                self.assertIsNone(research_costs(ledger)["search_usd"])

    def test_wrappers_record_actual_requests_without_network(self):
        with tempfile.TemporaryDirectory() as temp:
            ledger = Path(temp) / "ledger.jsonl"
            ledger.touch()
            for tool, arguments, result in (
                (
                    "search",
                    ["objective", "one query", "another query"],
                    {"results": [{"url": "https://example.com"}]},
                ),
                (
                    "extract",
                    ["objective", "https://example.com/a", "https://example.com/b"],
                    {"results": [{}, {}]},
                ),
            ):
                with (
                    patch.object(usage, "LEDGER", str(ledger)),
                    patch.dict(sys.modules, {"parallel_usage": usage}),
                    patch.dict("os.environ", {"PARALLEL_API_KEY": "test-placeholder"}),
                    patch.object(sys, "argv", ["web-" + tool, *arguments]),
                    patch(
                        "urllib.request.urlopen",
                        return_value=io.BytesIO(json.dumps(result).encode()),
                    ),
                    redirect_stdout(io.StringIO()),
                ):
                    runpy.run_path(
                        str(ROOT / "container" / ("web-" + tool)), run_name="__main__"
                    )
            self.assertEqual(
                research_costs(ledger), {"search_usd": 0.005, "extract_usd": 0.002}
            )
            self.assertNotIn("test-placeholder", ledger.read_text())
            self.assertNotIn("one query", ledger.read_text())

    def test_lifecycle_costs_include_archives_without_inventing_old_fees(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp)

            def save(folder, model, tracked=True, event="gp"):
                path = home / folder
                path.mkdir(parents=True)
                (path / "run.json").write_text(
                    json.dumps(
                        {"event_id": event, "status": "completed", "cost_usd": model}
                    )
                )
                if tracked:
                    (path / "usage.json").write_text(
                        json.dumps(
                            {"search_usd": 0.01, "extract_usd": 0.02, "estimated": True}
                        )
                    )
                return path

            save("events/gp", 2)
            save("debriefs/gp", 1)
            old = save("attempts/events/gp/id", 0.5, False)
            save("voids/gp-old", 0.25)
            save("events/other", 100, event="other")
            c = event_costs(home, "gp")
            self.assertAlmostEqual(c["forecast"]["total_usd"], 2.03)
            self.assertAlmostEqual(c["review"]["total_usd"], 1.03)
            self.assertEqual(c["failed"]["runs"], 2)
            self.assertEqual(c["total"]["runs"], 4)
            self.assertAlmostEqual(c["total"]["known_usd"], 3.84)
            self.assertIsNone(c["total"]["total_usd"])
            self.assertIsNone(run_costs(old)["search_usd"])
            self.assertEqual(c["total"]["model_usd"], 3.75)

    def test_usage_survives_an_attempt_without_completed_metadata(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp)
            (path / "run.json").write_text('{"status":"failed","cost_usd":null}')

            def copy(container, source, target, required):
                target.write_text("")
                return True

            with patch("f1bench.runner._copy_from_container", side_effect=copy):
                _save_usage(
                    "container", path / "trajectory.json", SimpleNamespace(cost=1.25)
                )
            self.assertEqual(run_costs(path)["total_usd"], 1.25)
            with patch("f1bench.runner._copy_from_container", return_value=False):
                (path / "research-usage.jsonl").unlink()
                _save_usage(
                    "container", path / "trajectory.json", SimpleNamespace(cost=1.25)
                )
            self.assertIsNone(run_costs(path)["total_usd"])
