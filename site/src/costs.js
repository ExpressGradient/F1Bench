export function sumCosts(costs) {
  const parts = ["model_usd", "search_usd", "extract_usd", "total_usd"];
  return {
    ...Object.fromEntries(
      parts.map((key) => [
        key,
        costs.length && costs.every((c) => Number.isFinite(c?.[key]))
          ? costs.reduce((sum, c) => sum + c[key], 0)
          : null,
      ]),
    ),
    known_usd: costs.reduce((sum, c) => sum + (c?.known_usd ?? 0), 0),
    runs: costs.reduce((sum, c) => sum + (c?.runs ?? 0), 0),
    estimated: costs.some((c) => c?.estimated),
  };
}

// Unknown spend must sort as missing, while an explicitly recorded zero is valid.
export function recordedCost(cost) {
  if (Number.isFinite(cost?.total_usd)) return cost.total_usd;
  if (
    cost?.known_usd > 0 ||
    ["model_usd", "search_usd", "extract_usd"].some((key) =>
      Number.isFinite(cost?.[key]),
    )
  )
    return cost.known_usd;
  return null;
}

export function costLabel(cost, divisor = 1) {
  const value = recordedCost(cost);
  if (!Number.isFinite(value) || !divisor) return "—";
  return `${cost.estimated ? "≈" : ""}$${(value / divisor).toFixed(2)}`;
}

// A comparison uses one cost basis for every entrant, never a mix of API-only and full costs.
export const hasFullCosts = (costs) =>
  costs.length > 0 && costs.every((c) => Number.isFinite(c?.total_usd));
