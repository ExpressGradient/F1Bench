"""No model SDK, credentials or network needed to build the website."""

import hashlib
import json
import shutil
import sys
from pathlib import Path

if sys.version_info < (3, 11):
    raise SystemExit(
        "Website export needs Python 3.11+. Run uv sync or set F1BENCH_PYTHON."
    )

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from f1bench.workflow import cohort, export_site  # noqa: E402


def build_site() -> Path:
    output = export_site(
        ROOT / "events",
        ROOT / "runs",
        cohort(ROOT / "cohorts/frontier-v1.json"),
        ROOT / "site/public/data.json",
    )
    data = json.loads(output.read_text())
    for race in data["races"]:
        for forecast in race["forecasts"]:
            if forecast["status"] != "completed":
                continue
            source = ROOT / "runs" / forecast["entrant"] / "events" / race["id"]
            destination = output.parent / "records" / race["id"] / forecast["entrant"]
            destination.mkdir(parents=True, exist_ok=True)
            links = {}
            for name in ("prediction.json", "report.json"):
                if (source / name).is_file():
                    shutil.copyfile(source / name, destination / name)
                    links[name.split(".")[0]] = "/" + str(
                        (destination / name).relative_to(output.parent)
                    )
            # Publish only the two original instructions, never research traces or tool output.
            trajectory = source / "trajectory.json"
            if trajectory.is_file():
                messages = json.loads(trajectory.read_text())["messages"][:2]
                if [m["role"] for m in messages] != ["system", "user"]:
                    raise ValueError(f"Unexpected initial prompt structure: {source}")
                prompt = [{"role": m["role"], "content": m["content"]} for m in messages]
                metadata = json.loads((source / "run.json").read_text())
                digest = hashlib.sha256(
                    "".join(m["content"] for m in prompt).encode()
                ).hexdigest()
                if metadata.get("prompt_sha256") and digest != metadata["prompt_sha256"]:
                    raise ValueError(f"Saved prompt hash mismatch: {source}")
                (destination / "prompt.json").write_text(
                    json.dumps(prompt, indent=2) + "\n"
                )
                links["prompt"] = "/" + str(
                    (destination / "prompt.json").relative_to(output.parent)
                )
            forecast["artifacts"] = links
    output.write_text(json.dumps(data, indent=2) + "\n")
    return output


if __name__ == "__main__":
    print(build_site())
