// Compare every model on the same races; a missing forecast never counts as zero.
export function seasonSummary(races, season) {
  const events = races
    .filter((r) => r.season === season)
    .sort((a, b) => a.round - b.round);
  const models =
    events
      .at(-1)
      ?.forecasts.map(({ entrant, name, model }) => ({
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
