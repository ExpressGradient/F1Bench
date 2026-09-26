import { test } from "node:test";
import assert from "node:assert/strict";
import { seasonSummary, sortDrivers } from "./season.js";
import { noteSections } from "./note-sections.js";

const race = (round, a, b, season = 2026) => ({
  id: `${season}-${round}`,
  name: `Race ${round}`,
  season,
  round,
  forecasts: [
    { entrant: "a", name: "A", metrics: a === null ? null : { mean_rps: a } },
    { entrant: "b", name: "B", metrics: b === null ? null : { mean_rps: b } },
  ],
});

test("season progression is chronological and equally weights races", () => {
  const result = seasonSummary(
    [
      race(3, 0.3, 0.2),
      race(1, 0.1, 0.4),
      race(2, 0.2, 0.3),
      race(1, 0.99, 0.99, 2025),
    ],
    2026,
  );
  assert.deepEqual(
    result.progression.map((r) => r.round),
    [1, 2, 3],
  );
  assert.equal(result.progression[1].values.a.race, 0.2);
  assert.ok(Math.abs(result.progression[1].values.a.cumulative - 0.15) < 1e-12);
  assert.ok(Math.abs(result.leaderboard[0].score - 0.2) < 1e-12);
  assert.ok(Math.abs(result.leaderboard[0].change - 0.05) < 1e-12);
});
test("missing scores never count as zero or enter shared-race aggregates", () => {
  const result = seasonSummary(
    [race(1, 0.1, 0.2), race(2, 0.9, null), race(3, null, null)],
    2026,
  );
  assert.equal(result.progression.length, 1);
  assert.equal(result.excluded, 1);
  assert.equal(result.leaderboard[0].score, 0.1);
  assert.equal(result.leaderboard[0].coverage, 2);
  assert.equal(result.leaderboard[1].coverage, 1);
  assert.equal(result.leaderboard[0].change, null);
});
test("empty and unscored seasons have no invented scores", () => {
  assert.deepEqual(seasonSummary([], 2026).leaderboard, []);
  assert.equal(
    seasonSummary([race(1, null, null)], 2026).leaderboard[0].score,
    null,
  );
});
test("podium and average-rank sorts answer different questions without changing saved order", () => {
  const rows = [
    { id: "HAM", expected_rank: 6.13, podium: 0.396 },
    { id: "VER", expected_rank: 7.79, podium: 0.543 },
  ];
  assert.equal(sortDrivers(rows, "expected")[0].id, "HAM");
  assert.equal(sortDrivers(rows, "podium")[0].id, "VER");
  assert.equal(sortDrivers(rows, "call")[0].id, "HAM");
  assert.equal(rows[0].id, "HAM");
});
test("notes keep original sections and fenced code intact", () => {
  const text =
    "# Notes\n\n## Result\n\n- A finished first.\n- B retired.\n\n### Lesson\n\n```python\n# This is code\n```\n\nKeep uncertainty.";
  const sections = noteSections(text);
  assert.equal(sections.length, 2);
  assert.equal(sections[0].title, "Result");
  assert.match(sections[0].body, /- B retired\./);
  assert.match(sections[1].body, /# This is code/);
});

test("resource averages use exactly the same races as the season score", () => {
  const events = [race(1, 0.1, 0.2), race(2, 0.3, 0.4), race(3, 0.8, null)];
  for (const [i, event] of events.entries()) {
    event.forecasts[0].run_details = {
      cost_usd: [2, 4, 100][i],
      runtime_seconds: [60, 180, 6000][i],
    };
    event.forecasts[1].run_details = { cost_usd: 1, runtime_seconds: 30 };
  }
  const result = seasonSummary(events, 2026);
  const a = result.leaderboard.find((m) => m.entrant === "a");
  assert.equal(a.usage.count, 2);
  assert.equal(a.usage.cost.total, 6);
  assert.equal(a.usage.cost.average, 3);
  assert.equal(a.usage.seconds.total, 240);
  assert.equal(a.usage.seconds.average, 120);
  assert.equal(a.coverage, 3);
});

test("incomplete resource records never produce a misleading total or average", () => {
  const events = [race(1, 0.1, 0.2), race(2, 0.3, 0.4)];
  events[0].forecasts[0].run_details = { cost_usd: 2, runtime_seconds: 60 };
  events[1].forecasts[0].run_details = { cost_usd: null, runtime_seconds: 180 };
  const { usage } = seasonSummary(events, 2026).leaderboard[0];
  assert.deepEqual(usage.cost, { total: null, average: null, recorded: 1 });
  assert.equal(usage.seconds.average, 120);
  assert.equal(usage.count, 2);
});

test("zero telemetry is valid; absent, negative, and nonnumeric values are unknown", () => {
  const event = race(1, 0.1, 0.2);
  event.forecasts[0].run_details = { cost_usd: 0, runtime_seconds: 0 };
  const { usage } = seasonSummary([event], 2026).leaderboard[0];
  assert.equal(usage.cost.average, 0);
  assert.equal(usage.seconds.average, 0);
  for (const invalid of [undefined, null, -1, Infinity, NaN, "2.00"]) {
    event.forecasts[0].run_details = {
      cost_usd: invalid,
      runtime_seconds: invalid,
    };
    const next = seasonSummary([event], 2026).leaderboard[0].usage;
    assert.equal(next.cost.average, null);
    assert.equal(next.seconds.average, null);
  }
});

test("legacy cost records work and unscored runs never enter resource totals", () => {
  const event = race(1, 0.1, 0.2);
  event.forecasts[0].cost_usd = 1.5;
  assert.equal(
    seasonSummary([event], 2026).leaderboard[0].usage.cost.total,
    1.5,
  );
  event.forecasts[0].metrics = null;
  const { usage } = seasonSummary([event], 2026).leaderboard[0];
  assert.equal(usage.count, 0);
  assert.equal(usage.cost.total, null);
  assert.equal(usage.seconds.average, null);
});
