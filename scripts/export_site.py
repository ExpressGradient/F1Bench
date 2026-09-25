"""No model SDK, credentials or network needed to build the website."""

import sys
from pathlib import Path

if sys.version_info < (3, 11):
    raise SystemExit(
        "Website export needs Python 3.11+. Run uv sync or set F1BENCH_PYTHON."
    )

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from f1bench.workflow import cohort, export_site  # noqa: E402

if __name__ == "__main__":
    print(
        export_site(
            ROOT / "events",
            ROOT / "runs",
            cohort(ROOT / "cohorts/frontier-v1.json"),
            ROOT / "site/public/data.json",
        )
    )
