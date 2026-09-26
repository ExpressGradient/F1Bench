import { sumCosts } from "./costs";
// Missing telemetry is unknown, never free or instantaneous.
export function runUsage(forecast) {
  const valid = (value) =>
    Number.isFinite(value) && value >= 0 ? value : null;
  return {
    cost: valid(forecast?.run_details?.cost_usd ?? forecast?.cost_usd),
    seconds: valid(forecast?.run_details?.runtime_seconds),
  };
}

export function usageSummary(forecasts) {
  const runs = forecasts.map(runUsage);
  const aggregate = (key) => {
    const recorded = runs.filter((run) => run[key] !== null);
    const total =
      runs.length && recorded.length === runs.length
        ? recorded.reduce((sum, run) => sum + run[key], 0)
        : null;
    return {
      total,
      average: total === null ? null : total / runs.length,
      recorded: recorded.length,
    };
  };
  return {
    cost: aggregate("cost"),
    seconds: aggregate("seconds"),
    count: runs.length,
  };
}

export const money = (value) =>
  Number.isFinite(value) ? `$${value.toFixed(2)}` : "—";
export const duration = (seconds) =>
  Number.isFinite(seconds) ? `${(seconds / 60).toFixed(1)}m` : "—";

// Compare every model on the same races; a missing forecast never counts as zero.
export function seasonSummary(races, season) {
  const events = races
    .filter((r) => r.season === season)
    .sort((a, b) => a.round - b.round);
  const models =
    events.at(-1)?.forecasts.map(({ entrant, name, model }) => ({
      entrant,
      name,
      model,
    })) || [];
  const valid = (forecast) => Number.isFinite(forecast?.metrics?.mean_rps);
  const completed = events.filter((r) => r.forecasts.some(valid));
  const shared = completed.filter(
    (r) =>
      models.length &&
      models.every((m) =>
        valid(r.forecasts.find((f) => f.entrant === m.entrant)),
      ),
  );
  const totals = Object.fromEntries(models.map((m) => [m.entrant, 0]));
  const progression = shared.map((race, index) => ({
    id: race.id,
    name: race.name,
    round: race.round,
    values: Object.fromEntries(
      models.map((model) => {
        const score = race.forecasts.find((f) => f.entrant === model.entrant)
          .metrics.mean_rps;
        totals[model.entrant] += score;
        return [
          model.entrant,
          { race: score, cumulative: totals[model.entrant] / (index + 1) },
        ];
      }),
    ),
  }));
  const leaderboard = models
    .map((model) => ({
      ...model,
      score: shared.length ? totals[model.entrant] / shared.length : null,
      usage: usageSummary(
        shared.map((r) => r.forecasts.find((f) => f.entrant === model.entrant)),
      ),
      forecastCost: sumCosts(
        shared.map(
          (r) =>
            r.forecasts.find((f) => f.entrant === model.entrant)?.costs
              ?.forecast,
        ),
      ),
      spending: Object.fromEntries(
        ["forecast", "review", "failed", "total"].map((phase) => [
          phase,
          sumCosts(
            events.map(
              (r) =>
                r.forecasts.find((f) => f.entrant === model.entrant)?.costs?.[
                  phase
                ],
            ),
          ),
        ]),
      ),
      coverage: completed.filter((r) =>
        valid(r.forecasts.find((f) => f.entrant === model.entrant)),
      ).length,
      change:
        progression.length > 1
          ? progression.at(-1).values[model.entrant].cumulative -
            progression.at(-2).values[model.entrant].cumulative
          : null,
    }))
    .sort(
      (a, b) =>
        (a.score ?? Infinity) - (b.score ?? Infinity) ||
        a.name.localeCompare(b.name),
    );
  return {
    models,
    baseline:
      shared.length &&
      shared.every((race) => Number.isFinite(race.baseline?.score))
        ? shared.reduce((sum, race) => sum + race.baseline.score, 0) /
          shared.length
        : null,
    progression,
    leaderboard,
    excluded: completed.length - shared.length,
    completed: completed.length,
  };
}

export function sortDrivers(rows, mode) {
  if (mode === "call") return rows;
  return [...rows].sort(
    (a, b) =>
      (mode === "podium"
        ? b.podium - a.podium
        : a.expected_rank - b.expected_rank) || a.id.localeCompare(b.id),
  );
}
