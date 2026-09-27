import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { driverErrors, gridBaseline, scoreGains, resultLabel, retirementError } from "./evaluation.js";
import { reviewSections, noteSections } from "./note-sections.js";
import { seasonSummary } from "./season.js";

const json = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);

test("retirements remain visible for classified and unclassified drivers", () => {
  assert.equal(resultLabel({ status: "nc", retired: true }), "NC · Retired");
  assert.equal(resultLabel({ status: "classified", position: 16, retired: true }), "P16 · Retired");
  assert.equal(resultLabel({ status: "classified", position: 1, retired: false }), "P1");
  assert.equal(resultLabel({ status: "dns", retired: false }), "DNS");
  assert.equal(resultLabel({ status: "dsq", retired: false }), "DSQ");
  assert.equal(resultLabel(null), "Pending");
  assert.equal(retirementError(0.5, null), null);
  assert.equal(retirementError(undefined, { retired: true }), null);
});

test("RPS contributions distinguish certain errors, uncertainty, and unclassified results", () => {
  const result = {
    results: [
      { driver_id: "a", status: "classified", position: 2 },
      { driver_id: "b", status: "nc", position: null },
    ],
  };
  const rows = [
    { id: "a", positions: [1, 0] },
    { id: "b", positions: [0, 1] },
  ];
  assert.deepEqual(
    driverErrors(rows, result).map((d) => d.contribution),
    [0.25, 0.25],
  );
  rows[0].positions = [0.75, 0.25];
  close(driverErrors(rows, result)[0].contribution, 0.140625);
  assert.deepEqual(driverErrors(rows, null), []);
  assert.throws(() => driverErrors(rows.slice(0, 1), result));
});

for (const eventId of ["2026-14-madrid", "2026-15-azerbaijan"]) {
  test(`${eventId}: attribution matches the canonical Python scores for every entrant`, () => {
    const event = json(`../../events/${eventId}/event.json`);
    const result = json(`../../events/${eventId}/result.json`);
    const saved = json(`../../events/${eventId}/scores.json`);
    const forecasts = saved.entrants.map((entry) => {
      const prediction = json(
        `../../runs/${entry.entrant}/events/${eventId}/prediction.json`,
      );
      const rows = event.drivers.map((driver) => ({
        ...driver,
        ...prediction.drivers[driver.id],
      }));
      close(
        driverErrors(rows, result).reduce((sum, d) => sum + d.contribution, 0),
        entry.metrics.mean_rps,
      );
      close(
        rows.reduce((sum, row) => sum + retirementError(
          row.retirement,
          result.results.find((r) => r.driver_id === row.id),
        ), 0) / rows.length,
        entry.metrics.retirement_brier,
      );
      const text = readFileSync(
        new URL(
          `../../runs/${entry.entrant}/debriefs/${eventId}/notes.md`,
          import.meta.url,
        ),
        "utf8",
      );
      const groups = reviewSections(text, event);
      assert.ok(
        groups.current.length,
        `${entry.entrant}: race review not found`,
      );
      assert.equal(
        groups.current.length + groups.archive.length,
        noteSections(text).length,
      );
      return { rows };
    });
    const gains = scoreGains(forecasts[0], forecasts[1], result);
    assert.ok(gains.every((d) => d.gain > 0));
    const baseline = gridBaseline({ ...event, result });
    const expected =
      baseline.order.reduce((sum, id, i) => {
        const actual = result.results.find((r) => r.driver_id === id);
        return (
          sum +
          Math.abs(
            i +
              1 -
              (actual.status === "classified"
                ? actual.position
                : event.drivers.length + 1),
          )
        );
      }, 0) /
      event.drivers.length ** 2;
    close(baseline.score, expected);
    assert.equal(gridBaseline({ ...event, id: "unknown", result }), null);
    assert.equal(gridBaseline({ ...event, result: null }), null);
  });
}

test("baseline averages cover exactly the shared races or stay unavailable", () => {
  const race = (id, score, baseline) => ({
    id,
    season: 2026,
    round: id,
    baseline: baseline === null ? null : { score: baseline },
    forecasts: [
      { entrant: "a", name: "A", metrics: { mean_rps: score } },
      {
        entrant: "b",
        name: "B",
        metrics: score === null ? null : { mean_rps: score },
      },
    ],
  });
  close(
    seasonSummary(
      [race(1, 0.1, 0.2), race(2, 0.2, 0.4), race(3, null, 1)],
      2026,
    ).baseline,
    0.3,
  );
  assert.equal(
    seasonSummary([race(1, 0.1, 0.2), race(2, 0.2, null)], 2026).baseline,
    null,
  );
});

test("review grouping keeps child sections and preserves unmatched notes", () => {
  const text =
    "## Madrid post-race\nold\n## Baku vs forecast\ncurrent\n### Checks\nchild\n## Next race\nfuture";
  const groups = reviewSections(text, {
    id: "2026-15-azerbaijan",
    name: "Baku",
  });
  assert.deepEqual(
    groups.current.map((s) => s.body),
    ["current", "child"],
  );
  assert.deepEqual(
    groups.archive.map((s) => s.body),
    ["old", "future"],
  );
  assert.equal(
    reviewSections(text, { id: "other", name: "Other" }).archive.length,
    4,
  );
});
