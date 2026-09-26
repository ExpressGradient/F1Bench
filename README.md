# F1 Bench

A Formula 1 forecasting benchmark. Models research each race, predict every driver's finishing distribution, and get scored against the result. Each model carries its own predictions, reviews, and notes into the next race.

[Live benchmark](https://f1bench.vercel.app) · [Race workflow](docs/workflow.md) · [Deployment](docs/deployment.md) · [MIT license](LICENSE)

## How it works

1. Prepare the race and verify its entry list and start time.
2. After qualifying, models independently research the weekend and submit forecasts before race start.
3. Add the official classification. Score the frozen forecasts and run each model's review.
4. Compare models across the season, then carry their history and lessons into the next race.

The current cohort is GPT-5.6 Sol, Muse Spark 1.3, and Grok 4.6. Each gets its highest supported reasoning setting, 4 CPUs, up to 120 minutes, and up to $30 of model spend per forecast. Models choose their own research and calculation methods. Settings and provider policies are recorded in [the cohort configuration](cohorts/frontier-v1.json).

Mean Ranked Probability Score is the primary metric; lower is better. Season standings average only races scored for every configured model. The site compares accuracy, average cost and runtime per scored forecast, and coverage on the same shared races. Total spend includes forecasts, reviews, and failed attempts across the season; missing fees stay explicitly untracked. Race pages retain full-field probabilities, original research, reviews, and run details. Learning happens through saved history and notes, not weight training.

## Run the website

Requires **Bun 1.3.14**, **Node.js 20.9+**, and **Python 3.11+**. API keys and Docker are not needed.

```bash
git clone https://github.com/ExpressGradient/F1Bench.git
cd F1Bench/site
bun install --frozen-lockfile
bun run dev
```

For a production build:

```bash
bun run build
bun run preview
```

Both development and production builds export saved forecasts from `events/` and `runs/`. The production build also generates the social preview image. Next.js prebuilds the leaderboard and each race page; `site/out/` is the complete static website. Keep the whole repository available when building; `site/` alone is not enough. Set `F1BENCH_PYTHON` if your Python executable is not `python3`.

## Run forecasts and reviews

Requires **Python 3.13+**, **uv**, and a running **Docker** daemon. Use macOS or Linux; Windows users should use WSL2.

From the repository root:

```bash
uv sync --locked
cp .env.example .env
# Fill in OPENROUTER_API_KEY and PARALLEL_API_KEY in .env.
set -a
source .env
set +a
uv run f1bench build
uv run f1bench status
```

Forecast and review runs make paid API calls. Viewing the site, running tests, exporting saved data, and scoring existing predictions do not.

Follow the [race workflow](docs/workflow.md) for preparation, prediction, results, reviews, memory, and safe retries. Results are entered manually from the final official classification. Completed predictions are preserved; failed retries are archived.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/f1bench/` | CLI, agent runner, validation, scoring, workflow, and chart export |
| `site/` | Static Next.js website, styles, and build scripts |
| `cohorts/` | Model identities, reasoning settings, and provider policies |
| `events/` | Race entries, official results, and saved scores |
| `runs/` | Original forecasts, research, reviews, memory, and audit trails |
| `container/` | Search and extraction tools for isolated agent runs |
| `scripts/` | Website data export |
| `tests/` | Scoring and workflow checks |
| `docs/` | Race operations and deployment instructions |

Saved benchmark history is intentional repository content, including unsuccessful historical attempts. Generated site data, images, charts, build output, dependencies, credentials, and local Vercel configuration are ignored by Git. The agent Docker build only receives its Dockerfile and tool wrappers.

## Development checks

```bash
uv sync --locked
uv run python -m unittest discover -s tests -v
uv build
cd site
bun install --frozen-lockfile
bun test
bun run build
```

GitHub Actions runs these checks on pull requests and pushes to `main`. Checks do not run model forecasts or deploy the site.

Preserve historical forecasts and their hashes when changing the workflow or export. Never commit API keys or `.env` files. Keep `uv.lock` and `site/bun.lock` with dependency changes.

## License

[MIT](LICENSE), copyright © 2026 ExpressGradient.
