"use client";

import { useState } from "react";
import { driverErrors, resultLabel, retirementError } from "./evaluation";

const score = (value) => value.toFixed(4);
const percent = (value) => `${(value * 100).toFixed(1)}%`;
export const scoringCode =
  "https://github.com/ExpressGradient/F1Bench/blob/main/src/f1bench/core.py";

export function RaceResult({ race }) {
  if (!race.result)
    return (
      <p className="table-caption">
        Race result pending. Predictions below were made before the start.
      </p>
    );
  const podium = race.result.results
    .filter((r) => r.status === "classified" && r.position <= 3)
    .sort((a, b) => a.position - b.position);
  return (
    <div className="race-result">
      <span className="eyebrow">Official podium</span>
      <ol>
        {podium.map((r) => (
          <li key={r.driver_id}>
            <span>P{r.position}</span>{" "}
            {race.drivers.find((d) => d.id === r.driver_id)?.name ||
              r.driver_id}
          </li>
        ))}
      </ol>
      {race.result.source && (
        <a href={race.result.source} target="_blank" rel="noreferrer">
          Full result ↗
        </a>
      )}
    </div>
  );
}

export function BaselineNote({ baseline }) {
  return (
    <details className="baseline-note">
      <summary>What is the grid baseline?</summary>
      <p>
        Predict every driver finishes in the official starting order, with 100%
        certainty and no retirements. Score it with the same RPS rule. This is a
        simple reference, not a competitive forecasting system.
      </p>
      <p>
        Added retrospectively; the rule has no fitted parameters. Grids were
        retrieved on 26 September 2026, after these races. Late grid changes may
        differ from what was available when an AI ran. Pit-lane starters use
        their listed place in the official order.
      </p>
      {baseline?.source && (
        <a href={baseline.source} target="_blank" rel="noreferrer">
          Official starting grid ↗
        </a>
      )}
      {!baseline && (
        <p>
          Open a race for its grid source. An average appears only when every
          compared race has a verified grid.
        </p>
      )}
    </details>
  );
}

export function DriverComparison({ race }) {
  const [driverId, setDriverId] = useState(
    race.result?.results.find((r) => r.position === 1)?.driver_id ||
      race.drivers[0]?.id,
  );
  const actual = race.result?.results.find((r) => r.driver_id === driverId);
  return (
    <section className="driver-comparison" aria-labelledby="compare-heading">
      <div className="analysis-heading">
        <h2 id="compare-heading">Where the models disagree</h2>
        <select
          aria-label="Compare a driver"
          value={driverId}
          onChange={(e) => setDriverId(e.target.value)}
        >
          {race.drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <p className="table-caption">
        Before-race chances, side by side. Actual result:{" "}
        <strong>{resultLabel(actual)}</strong>.
      </p>
      <div
        className="table-scroll"
        role="region"
        aria-label="Driver predictions across models"
        tabIndex={0}
      >
        <table className="score-table comparison-table">
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col">Pick</th>
              <th scope="col">Win</th>
              <th scope="col">Top 3</th>
              <th scope="col">Retire chance</th>
              {actual && <th scope="col">Retirement error</th>}
            </tr>
          </thead>
          <tbody>
            {race.forecasts.map((f) => {
              const row = f.rows?.find((d) => d.id === driverId);
              const retirement = retirementError(row?.retirement, actual);
              return (
                <tr key={f.entrant}>
                  <th scope="row">{f.name}</th>
                  <td>
                    {f.report
                      ? `P${f.report.order.indexOf(driverId) + 1}`
                      : "—"}
                  </td>
                  <td>{row ? percent(row.win) : "—"}</td>
                  <td>{row ? percent(row.podium) : "—"}</td>
                  <td>{row ? percent(row.retirement) : "—"}</td>
                  {actual && (
                    <td>
                      {retirement === null ? "—" : score(retirement)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {actual && (
        <p className="table-foot">
          Retirement error: lower is better; 0 is perfect. A higher retirement
          chance earns more credit when the driver retires, and less when they
          finish. This separate score does not set the leaderboard order.
        </p>
      )}
      {race.forecasts.some((f) => f.rows && !f.report) && (
        <p className="table-foot">
          — No explicit finishing-order pick was saved; the original
          probabilities are shown.
        </p>
      )}
    </section>
  );
}

export function ScoreDrivers({ forecast, race }) {
  const errors = driverErrors(forecast.rows, race.result).sort(
    (a, b) => b.contribution - a.contribution,
  );
  if (!errors.length) return null;
  const total = errors.reduce((sum, d) => sum + d.contribution, 0);
  return (
    <details className="score-drivers">
      <summary>What drove {forecast.name}’s error?</summary>
      <p>
        Largest contributions:{" "}
        {errors
          .slice(0, 3)
          .map((d) => `${d.name} (${score(d.contribution)})`)
          .join(", ")}
        .
      </p>
      <p className="table-caption">
        These contributions add up to the race error of {score(total)}. Lower is
        better. They measure the saved probabilities against the result, not the
        quality of the written explanation.
      </p>
      <div
        className="table-scroll"
        role="region"
        aria-label="Error contributions by driver"
        tabIndex={0}
      >
        <table className="score-table">
          <thead>
            <tr>
              <th scope="col">Driver</th>
              <th scope="col">Result</th>
              <th scope="col">Error added</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((d) => (
              <tr key={d.id}>
                <th scope="row">{d.name}</th>
                <td>{d.result}</td>
                <td>{score(d.contribution)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total (before rounding)</th>
              <td />
              <td>{score(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="table-foot">
        NC = not classified; DNS = did not start; DSQ = disqualified.
        A retired driver can still have a classified position. All three unclassified outcomes sit after
        the last place for RPS.{" "}
        <a href={scoringCode} target="_blank" rel="noreferrer">
          Scoring code ↗
        </a>
      </p>
    </details>
  );
}
