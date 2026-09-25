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
