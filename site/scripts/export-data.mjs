import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const python = fileURLToPath(
  new URL("../../.venv/bin/python", import.meta.url),
);
const script = fileURLToPath(
  new URL("../../scripts/export_site.py", import.meta.url),
);
const result = spawnSync(
  process.env.F1BENCH_PYTHON || (existsSync(python) ? python : "python3"),
  [script],
  { stdio: "inherit" },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
