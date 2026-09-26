import { test, expect } from "bun:test";
import { sumCosts, costLabel, hasFullCosts, recordedCost } from "./costs";
import { seasonSummary } from "./season";

const complete = (value) => ({
  model_usd: value,
  search_usd: 0,
  extract_usd: 0,
  total_usd: value,
  known_usd: value,
  runs: 1,
  estimated: false,
});

test("missing research stays unknown while recorded spend remains visible", () => {
  const old = {
    ...complete(2),
    search_usd: null,
    extract_usd: null,
    total_usd: null,
  };
  const total = sumCosts([old, complete(3)]);
  expect(total.total_usd).toBeNull();
  expect(total.known_usd).toBe(5);
  expect(costLabel(total)).toBe("$5.00");
  expect(costLabel({ ...complete(0.007), estimated: true })).toBe("≈$0.01");
  expect(costLabel(complete(0))).toBe("$0.00");
  expect(costLabel(undefined)).toBe("—");
});

test("forecast average uses shared scores; spend includes unscored races and reviews", () => {
  const race = (round, scored) => ({
    id: `r${round}`,
    season: 2026,
    round,
    forecasts: ["a", "b"].map((entrant) => ({
      entrant,
      name: entrant,
      metrics: scored ? { mean_rps: 0.1 } : null,
      costs: {
        forecast: complete(2),
        review: complete(1),
        failed: complete(0.5),
        total: complete(3.5),
      },
    })),
  });
  const { leaderboard } = seasonSummary([race(1, true), race(2, false)], 2026);
  expect(leaderboard[0].forecastCost.total_usd).toBe(2);
  expect(leaderboard[0].usage.count).toBe(1);
  expect(leaderboard[0].spending.total.total_usd).toBe(7);
});

test("mixed telemetry keeps the whole comparison on the model API basis", () => {
  expect(hasFullCosts([complete(2), complete(3)])).toBe(true);
  expect(hasFullCosts([complete(2), { ...complete(3), total_usd: null }])).toBe(
    false,
  );
  expect(hasFullCosts([])).toBe(false);
});

test("unknown spend is not sorted as free, but recorded zero is valid", () => {
  const missing = {
    model_usd: null,
    search_usd: null,
    extract_usd: null,
    total_usd: null,
    known_usd: 0,
  };
  expect(recordedCost(missing)).toBeNull();
  expect(costLabel(missing)).toBe("—");
  expect(recordedCost({ ...missing, model_usd: 0 })).toBe(0);
  expect(costLabel({ ...missing, model_usd: 0 })).toBe("$0.00");
});
