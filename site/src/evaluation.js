import grids from "./grids.json";

// Same normalization as f1bench.core.score_prediction: contributions sum to race RPS.
export function driverErrors(rows, result) {
  if (!result) return [];
  const actual = new Map(result.results.map((r) => [r.driver_id, r]));
  const n = rows.length;
  if (!n || actual.size !== n)
    throw new Error("Incomplete field for score attribution");
  return rows.map((row) => {
    const truth = actual.get(row.id);
    if (!truth || row.positions.length !== n)
      throw new Error("Mismatched score field");
    const rank = truth.status === "classified" ? truth.position : n + 1;
    let cumulative = 0;
    const squaredError = row.positions.reduce((sum, probability, i) => {
      cumulative += probability;
      return sum + (cumulative - Number(rank <= i + 1)) ** 2;
    }, 0);
    return {
      id: row.id,
      name: row.name,
      result: resultLabel(truth),
      contribution: squaredError / (n * n),
    };
  });
}

export function resultLabel(result) {
  if (!result) return "Pending";
  const classification = result.status === "classified"
    ? `P${result.position}`
    : result.status.toUpperCase();
  return `${classification}${result.retired ? " · Retired" : ""}`;
}

export function retirementError(probability, result) {
  if (!Number.isFinite(probability) || typeof result?.retired !== "boolean")
    return null;
  return (probability - Number(result.retired)) ** 2;
}

// Fixed naive reference, added retrospectively. No parameters fitted to race results.
export function gridBaseline(race) {
  const grid = grids[race.id];
  if (!grid || !race.result) return null;
  const ids = new Set(race.drivers.map((d) => d.id));
  if (
    grid.order.length !== ids.size ||
    new Set(grid.order).size !== ids.size ||
    grid.order.some((id) => !ids.has(id))
  ) {
    throw new Error(`Invalid starting grid for ${race.id}`);
  }
  const rows = grid.order.map((id, index) => ({
    id,
    positions: grid.order.map((_, position) => Number(position === index)),
  }));
  return {
    ...grid,
    score: driverErrors(rows, race.result).reduce(
      (sum, d) => sum + d.contribution,
      0,
    ),
  };
}

export function scoreGains(winner, other, result) {
  const reference = new Map(
    driverErrors(other.rows, result).map((d) => [d.id, d.contribution]),
  );
  return driverErrors(winner.rows, result)
    .map((d) => ({ ...d, gain: reference.get(d.id) - d.contribution }))
    .filter((d) => d.gain > 0)
    .sort((a, b) => b.gain - a.gain);
}
