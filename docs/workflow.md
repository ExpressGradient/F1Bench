# Running the benchmark

Run commands from the repository root after the [setup](../README.md#run-forecasts-and-reviews).

## The race-to-race flow

### 1. See where things stand

```bash
uv run f1bench status
```

This shows each race, every model's forecast/review status, and the next action. Existing Madrid predictions and reviews are retained; no migration or rerun is needed.

### 2. Prepare the next race

Copy an existing race's entry list into a new event, supplying its real name, season, round and scheduled start. This example uses placeholders—replace them with verified values:

```bash
uv run f1bench prepare events/<event-id> \
  --from events/2026-14-madrid \
  --name '<race name>' --season <year> --round <round> \
  --race-start '<YYYY-MM-DDTHH:MM:SS+00:00>'
```

Review the copied driver/team list in `event.json` for substitutions and changes. Preparation copies only the entries and points positions, not the previous result, forecast, or race context. It never overwrites an existing race. The start time must include a timezone.

### 3. Make the race call

Run after qualifying, with enough time for research before the race:

```bash
uv run f1bench predict events/<event-id>
```

Omit the event path to select the earliest open race still needing forecasts. Models run concurrently, with their own histories and memory. Earlier completed forecasts must have a result and a finished review before the next race runs.

The research brief asks each model to:

- Verify the grid, penalties, pace, strategy, circuit, weather and reliability using current sources.
- Explain each driver's place and the evidence behind consequential judgments.
- Challenge its strongest assumption with an alternative scenario and say which drivers would move.
- Distinguish evidence, inference and uncertainty. A grid-like order or “no clear edge” is valid; novelty and complexity are not rewards.
- Submit a complete probability forecast plus a readable report with sources and observable checks for its claims.

New runs require a future `race_start`. Runs starting or finishing after that time cannot publish. Races with saved results cannot be forecast again using live research. Historical forecasts remain readable without adding new fields.

### 4. Score and learn

Save the final official classification to `events/<event-id>/result.json`, then:

```bash
uv run f1bench review events/<event-id>
```

This scores every completed forecast, runs each model's post-race review, saves its lessons, and refreshes the website data. Models must distinguish a bad assumption from ordinary race randomness; a correct pick does not automatically validate its explanation.

Result format (include **every driver**, not just these examples):

```json
{
  "event_id": "<event-id>",
  "results": [
    {"driver_id": "NOR", "position": 1, "status": "classified", "retired": false},
    {"driver_id": "VER", "position": null, "status": "nc", "retired": true}
  ]
}
```

Statuses are `classified`, `nc`, `dns`, and `dsq`. A late retirement can retain a numbered classification with `retired: true`. Classified positions must be contiguous and unique. Result acquisition is currently manual: use the final FIA classification. `review` does not guess or scrape it automatically.

To score without spending on a model review:

```bash
uv run f1bench score-event events/<event-id>
```

Mean Ranked Probability Score remains the main score, with log loss, win/podium/points/retirement Brier scores and expected-rank error also retained. The probability forecast is scored; prose and the displayed order are not substitutes for it. Missing models are recorded explicitly. Season comparisons on the site use only races scored for every configured model.

### 5. Continue

Prepare the next race and repeat. `cohorts/frontier-v1.json` holds stable model identities and provider policies. Keep each `entrant` unchanged to carry that model's memory forward.

## What the models remember

Each model gets:

- `/input/event.json`: the current race and entry list.
- `/history/<event-id>/`: its earlier predictions, reports, explanations, official results, computed scores, and post-race review snapshots when available. Read-only.
- `/memory/notes.md`: its current working lessons. This is the only writable memory carried into future runs.
- `/workspace`: disposable research/calculation files.

The review receives the exact frozen forecast, report, result and score, plus past history and the current notes. It edits a compact set of lessons (target: under 1,200 words), including unresolved questions, rather than appending forever. Forecast and review runs save notes snapshots as well as the latest memory. A lock prevents two jobs from writing the same model's memory at once. Later-race memory cannot be used to rerun an earlier forecast or review.

This is learning through history and notes, not retraining model weights. Research code and scratch files do not persist; lessons about useful methods must go into the notes.

## Safe retries

Repeating `predict` or `review` skips completed work. To recover a recorded failure:

```bash
uv run f1bench predict events/<event-id> --retry-failed
uv run f1bench review events/<event-id> --retry-failed
```

Only failed attempts are moved into `runs/<entrant>/attempts/<phase>/<event-id>/<attempt-id>/`, retaining their traces and artifacts. Completed predictions never get replaced. Running or incomplete attempts require investigation and are never automatically restarted. Forecast retries must still finish before race start. Each retry has a fresh run budget, so retries can add cost.

If the official result changes after a review, the workflow flags the mismatch instead of silently carrying stale lessons forward. Reconcile that review before continuing.

## Saved outputs

```text
runs/<entrant>/
├── entrant.json
├── notes.md                         # current memory
├── events/<event-id>/
│   ├── event.json
│   ├── prediction.json              # unchanged probability format
│   ├── report.json                  # required for new runs
│   ├── explanation.md               # optional extra research
│   ├── notes.md                     # forecast-time memory snapshot
│   ├── run.json
│   └── trajectory.json
├── debriefs/<event-id>/
│   ├── notes.md                     # post-race lessons snapshot
│   ├── run.json
│   └── trajectory.json
└── attempts/                        # archived failures, if retried
```

`prediction.json` has one entry per driver, with `positions` (P1 through field size), `nc`, `dns`, `dsq` and separate `retirement` probabilities. Positions + NC + DNS + DSQ sum to one for each driver. Position totals across drivers form a non-increasing occupancy sequence, each at most one.

New `report.json` files contain `event_id`, `summary`, `order` (every driver exactly once), `reasons` (keyed by driver ID), `method`, `uncertainty`, `insights` and `sources`. Each insight has `claim`, `impact`, `check` and source IDs. Each source has `id`, `title` and an HTTP(S) `url`. Schema validation checks completeness and references; it cannot prove a claim is true. Research quality remains visible in the report and accountable to the review.

Old forecasts need no report backfill. Their website order is explicitly derived from expected finishing rank, including non-classification risk, and their original explanations remain available. Existing prediction files, scores, notes and traces stay intact.
