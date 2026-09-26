"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sortDrivers, runUsage, money, duration } from "./season";
import Notes, { Note } from "./Notes.jsx";
import { modelColor } from "./brands";
import { scoreGains } from "./evaluation";
import {
  RaceResult,
  BaselineNote,
  DriverComparison,
  ScoreDrivers,
  scoringCode,
} from "./Evaluation";

const percent = (value) => `${(value * 100).toFixed(1)}%`;
const number = (value, digits = 4) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";
const utc = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }) + " UTC"
    : "Not recorded";
const labels = {
  pending: "Not run",
  running: "Researching",
  failed: "Run failed",
  incomplete: "Needs attention",
  completed: "Ready",
};

function Status({ children }) {
  return <span className="status">{children}</span>;
}

function DriverTable({ forecast, race }) {
  const [expanded, setExpanded] = useState(null);
  const [sort, setSort] = useState(forecast.report ? "call" : "expected");
  const rows = sortDrivers(forecast.rows, sort);
  const forecastRanks = new Map(
    forecast.rows.map((row, index) => [row.id, index + 1]),
  );
  const actual = new Map(
    race.result?.results.map((r) => [r.driver_id, r]) || [],
  );
  return (
    <section id="forecast" className="field panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Before the race</span>
          <h2>
            {forecast.report ? "Predicted order" : "Forecast probabilities"}
          </h2>
        </div>
        <span className="count">{forecast.rows.length} drivers</span>
      </div>
      <div className="driver-sort">
        <label>
          Order by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {forecast.report && (
              <option value="call">Predicted finishing order</option>
            )}
            <option value="expected">Average rank (all outcomes)</option>
            <option value="podium">Podium chance (highest first)</option>
          </select>
        </label>
      </div>
      <p className="table-caption">
        {sort === "call"
          ? "The order this model predicted before the race. Percentages show its estimated chances, not what happened."
          : sort === "podium"
          ? "Sorted by the probability of a top-three finish. This is not a predicted finishing order."
          : `Sorted by average rank across all outcomes. NC, DNS and DSQ count as rank ${
              forecast.rows.length + 1
            }; a larger downside risk can outweigh a higher podium chance.`}
        {!forecast.report &&
          " This archived run saved probabilities, not an explicit finishing-order pick."}{" "}
        Select a driver for details.
      </p>
      <div className="table-scroll">
        <table className="driver-table">
          <thead>
            <tr>
              <th scope="col">{sort === "call" ? "Pick" : "Order"}</th>
              <th scope="col">Driver</th>
              <th scope="col" title="Chance of winning the race">
                Win
              </th>
              <th scope="col" title="Chance of finishing in the top three">
                Top 3
              </th>
              <th scope="col" title="Chance of finishing in the top ten">
                Top 10
              </th>
              <th scope="col" title="Chance of retiring before the finish">
                Retire
              </th>
              {race.result && <th scope="col">Result</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const truth = actual.get(row.id);
              const isOpen = expanded === row.id;
              return (
                <React.Fragment key={row.id}>
                  <tr className={isOpen ? "selected" : ""}>
                    <td className={`position p${i + 1}`}>
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td>
                      <button
                        className="driver-button"
                        onClick={() => setExpanded(isOpen ? null : row.id)}
                        aria-expanded={isOpen}
                        aria-controls={`driver-${row.id}`}
                      >
                        <span>
                          <strong>{row.name}</strong>
                          <small>{row.team || row.id}</small>
                        </span>
                        <span className="expand-mark">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                    </td>
                    <td>{percent(row.win)}</td>
                    <td>
                      <span
                        className="probability"
                        style={{ "--fill": `${row.podium * 100}%` }}
                      >
                        {percent(row.podium)}
                      </span>
                    </td>
                    <td>{percent(row.points)}</td>
                    <td className="risk">{percent(row.retirement)}</td>
                    {race.result && (
                      <td>
                        <span
                          className={`actual ${
                            truth?.position === forecastRanks.get(row.id)
                              ? "match"
                              : ""
                          }`}
                          title={
                            truth?.position === forecastRanks.get(row.id)
                              ? forecast.report
                                ? "Matches the model’s forecast rank"
                                : "Matches the archived forecast’s derived rank"
                              : undefined
                          }
                        >
                          {truth?.status === "classified"
                            ? `P${truth.position}`
                            : truth?.status.toUpperCase() || "—"}
                          {truth?.retired && truth.status === "classified"
                            ? "*"
                            : ""}
                        </span>
                      </td>
                    )}
                  </tr>
                  {isOpen && (
                    <tr className="driver-detail" id={`driver-${row.id}`}>
                      <td colSpan={race.result ? 7 : 6}>
                        <p>
                          {row.reason ||
                            "This older forecast has no separate driver note. Read the original research alongside the field."}
                        </p>
                        <p className="rank-explanation">
                          Average rank:{" "}
                          <strong>{number(row.expected_rank, 2)}</strong>. This
                          averages every possible outcome, including bad
                          finishes; it is not another finishing-order pick.{" "}
                          Chance of no classified position:{" "}
                          <strong>
                            {percent(
                              Math.max(
                                0,
                                1 -
                                  row.positions.reduce((sum, p) => sum + p, 0),
                              ),
                            )}
                          </strong>
                          , counted as rank {forecast.rows.length + 1}. Podium
                          chance measures only P1–P3; it does not measure the
                          downside.
                        </p>
                        <div
                          className="distribution"
                          aria-label={`Finishing probabilities for ${row.name}`}
                        >
                          {row.positions.map((p, index) => (
                            <div
                              key={index}
                              title={`P${index + 1}: ${percent(p)}`}
                            >
                              <span
                                style={{ height: `${Math.max(2, p * 100)}%` }}
                              />
                              <small>{index + 1}</small>
                            </div>
                          ))}
                        </div>
                        <div className="detail-labels">
                          <span>
                            Probability by finishing position · bars use a
                            0–100% scale
                          </span>
                          <strong>Win {percent(row.win)}</strong>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="table-foot">
        Retirement is a separate risk: a late retirement can still be
        classified.{" "}
        {race.result &&
          "NC = not classified. * = classified retirement. Green marks an exact match to the forecast rank, regardless of the selected sort."}
      </p>
    </section>
  );
}

function Research({ forecast, race }) {
  const report = forecast.report;
  const favourite = forecast.rows.reduce(
    (best, row) => (!best || row.win > best.win ? row : best),
    null,
  );
  return (
    <aside id="research" className="research">
      <section className="research-intro">
        <h2>Why it predicted this</h2>
        <p>
          {forecast.name}’s own explanation, written before the race: the
          evidence it used, its assumptions, and what could go wrong. Its claims
          are not independently verified.
        </p>
      </section>
      {favourite && (
        <section className="insight lead">
          <span className="eyebrow">Its favourite to win</span>
          <p>
            <strong>{favourite.name}</strong> · {percent(favourite.win)} chance
          </p>
        </section>
      )}
      {report ? (
        <>
          <details className="note-panel">
            <summary>Its pre-race outlook · original text</summary>
            <p>{report.summary}</p>
          </details>
          <details className="note-panel">
            <summary>Why it chose this order</summary>
            {report.insights.map((insight, i) => (
              <article className="insight" key={i}>
                <span className="eyebrow">
                  Reason {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{insight.claim}</h3>
                <p>{insight.impact}</p>
                <div className="check">
                  <strong>What it planned to watch</strong>
                  <p>{insight.check}</p>
                </div>
                <div className="source-links">
                  {insight.sources.map((id) => {
                    const source = report.sources.find((s) => s.id === id);
                    return source ? (
                      <a
                        href={source.url}
                        key={id}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {source.title} ↗
                      </a>
                    ) : null;
                  })}
                </div>
              </article>
            ))}
            <section className="insight uncertainty">
              <span className="eyebrow">Where it could be wrong</span>
              <p>{report.uncertainty}</p>
            </section>
            <details className="note-panel">
              <summary>Research method & sources</summary>
              <p>{report.method}</p>
              <div className="source-links">
                {report.sources.map((s) => (
                  <a key={s.id} href={s.url} target="_blank" rel="noreferrer">
                    {s.title} ↗
                  </a>
                ))}
              </div>
            </details>
          </details>
        </>
      ) : (
        <Notes
          key={forecast.entrant + "-research"}
          text={forecast.explanation}
        />
      )}

      {report && forecast.explanation && (
        <details className="note-panel">
          <summary>Full pre-race research note</summary>
          <Note text={forecast.explanation} />
        </details>
      )}
      {forecast.review ? (
        <Notes
          key={forecast.entrant + "-review"}
          text={forecast.review}
          kind="review"
          race={race}
        />
      ) : (
        <p className="notes-context">Post-race review pending.</p>
      )}
      {forecast.run_details && (
        <details className="run-details">
          <summary>Model setup & usage</summary>
          <dl>
            <dt>Model version</dt>
            <dd>{forecast.run_details.model}</dd>
            <dt>Reasoning</dt>
            <dd>
              {forecast.run_details.reasoning?.effort ||
                (forecast.run_details.reasoning
                  ? JSON.stringify(forecast.run_details.reasoning)
                  : "Not recorded")}
            </dd>
            <dt>Runtime</dt>
            <dd>{duration(runUsage(forecast).seconds)}</dd>
            <dt>Model API cost</dt>
            <dd>{money(runUsage(forecast).cost)}</dd>
            <dt>Model calls</dt>
            <dd>{forecast.run_details.model_calls ?? "Not recorded"}</dd>
            <dt>Provider</dt>
            <dd>
              {forecast.run_details.providers?.join(", ") || "Not recorded"}
            </dd>
          </dl>
          <p className="table-caption">
            Web search, code execution, and notes from earlier races are part of
            this model’s setup. Cost excludes reviews, failed attempts, search
            fees, and hosting.
          </p>
          <dl>
            <dt>Forecast started</dt>
            <dd>{utc(forecast.started_at)}</dd>
            <dt>Forecast saved</dt>
            <dd>{utc(forecast.finished_at)}</dd>
            <dt>Race started</dt>
            <dd>{utc(race.race_start)}</dd>
          </dl>
          <div className="source-links">
            {Object.entries(forecast.artifacts || {}).map(([key, url]) => (
              <a key={key} href={url} target="_blank" rel="noreferrer">
                {
                  {
                    prompt: "Original prompt",
                    prediction: "Prediction JSON",
                    report: "Original report",
                  }[key]
                }{" "}
                ↗
              </a>
            ))}
            <a href={scoringCode} target="_blank" rel="noreferrer">
              Scoring code ↗
            </a>
          </div>
          {forecast.run_details.budgets && (
            <p>
              Run limits: {forecast.run_details.budgets.wall_minutes} minutes ·
              ${forecast.run_details.budgets.model_usd} model spend ·{" "}
              {forecast.run_details.budgets.cpus} CPUs
            </p>
          )}
        </details>
      )}
    </aside>
  );
}

function Scores({ race, standings, sharedRaces }) {
  const scored = race.forecasts
    .filter((f) => f.metrics)
    .sort((a, b) => a.metrics.mean_rps - b.metrics.mean_rps);
  const gains =
    scored.length > 1 && scored[0].metrics.mean_rps < scored[1].metrics.mean_rps
      ? scoreGains(scored[0], scored[1], race.result).slice(0, 3)
      : [];
  return (
    <section className="scores panel" id="scores">
      <div className="section-heading">
        <div>
          <span className="eyebrow">After the race</span>
          <h2>How the models did</h2>
        </div>
        <span className="count">
          {scored.length}/{race.forecasts.length} scored
        </span>
      </div>
      <p className="table-caption">
        Predictions scored against the official result. Lower error (RPS) is
        better; 0 is perfect. Cost and time cover making the prediction.
      </p>
      {scored.length ? (
        <div className="table-scroll">
          <table className="score-table">
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Error</th>
                <th scope="col">API cost</th>
                <th scope="col">Time</th>
                <th scope="col">Rank error</th>
                <th scope="col">Season error</th>
              </tr>
            </thead>
            <tbody>
              {scored.map((f) => (
                <tr key={f.entrant}>
                  <td>
                    <strong
                      className="model-name"
                      style={{ borderColor: modelColor(f.model) }}
                    >
                      {f.name}
                    </strong>
                  </td>
                  <td className="score-value">{number(f.metrics.mean_rps)}</td>
                  <td>{money(runUsage(f).cost)}</td>
                  <td>{duration(runUsage(f).seconds)}</td>
                  <td>
                    {number(f.metrics.expected_rank_mae, 2)}{" "}
                    <small>places</small>
                  </td>
                  <td>
                    {number(
                      standings.find((m) => m.entrant === f.entrant)?.score,
                    )}
                  </td>
                </tr>
              ))}
              {race.baseline && (
                <tr className="baseline-row">
                  <th scope="row">Grid baseline</th>
                  <td>{number(race.baseline.score)}</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-inline">
          Scores will appear after the official race result is added.
        </div>
      )}
      {gains.length > 0 && (
        <p className="score-story">
          <strong>{scored[0].name} scored best.</strong> Its biggest gains over{" "}
          {scored[1].name} came from {gains.map((d) => d.name).join(", ")}.
          Select a model below to inspect every driver’s contribution.
        </p>
      )}
      <BaselineNote baseline={race.baseline} />
      <p className="table-foot">
        Season average: {sharedRaces} shared{" "}
        {sharedRaces === 1 ? "race" : "races"} in {race.season}. Rank error
        compares each driver’s expected finish with the result. Unclassified
        outcomes count as field size + 1.
      </p>
    </section>
  );
}

export default function RacePage({ race, raceList, standings, sharedRaces }) {
  const router = useRouter();
  const [entrant, setEntrant] = useState(
    race.forecasts.find((f) => f.status === "completed")?.entrant ||
      race.forecasts[0]?.entrant,
  );
  const forecast = race.forecasts.find((f) => f.entrant === entrant);
  const secondsBeforeStart =
    (Date.parse(race.race_start) - Date.parse(forecast?.finished_at)) / 1000;
  const titleParts = race.name.replace(/^\d{4}\s+/, "").split(/\s+[—–]\s+/);
  const title = titleParts.at(-1);
  return (
    <>
      <div className="season-bar">
        <Link className="back-link" href="/">
          ← Model standings
        </Link>
        <label className="race-select">
          <span>Race</span>
          <select
            aria-label="Race"
            value={race.id}
            onChange={(e) => router.push(`/races/${e.target.value}/`)}
          >
            {raceList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.season} · R{r.round} · {r.name.split(/\s+[—–]\s+/).at(-1)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-meta">
            <span className="eyebrow">
              {race.season} season / Round {String(race.round).padStart(2, "0")}
            </span>
            <Status>{race.state}</Status>
          </div>
          <h1>{title}</h1>
          <p>{titleParts.length > 1 ? titleParts[0] : "Race forecast"}</p>
          <p>
            Compare what each AI predicted before the race with what happened.
          </p>
        </div>
      </section>
      <RaceResult race={race} />
      <Scores race={race} standings={standings} sharedRaces={sharedRaces} />
      <DriverComparison race={race} />
      <div className="model-toolbar">
        <span className="eyebrow">View prediction</span>
        <div className="model-tabs" role="group" aria-label="Forecast model">
          {race.forecasts.map((f) => (
            <button
              key={f.entrant}
              style={{ "--model-color": modelColor(f.model) }}
              aria-pressed={entrant === f.entrant}
              onClick={() => setEntrant(f.entrant)}
            >
              {f.name}
              {f.status !== "completed" && (
                <span className="model-state">
                  {labels[f.status] || f.status}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      {forecast?.status === "completed" ? (
        <>
          <div className="forecast-meta">
            <span>
              Forecast saved{" "}
              {forecast.finished_at
                ? new Date(forecast.finished_at).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  }) + " UTC"
                : "before the race"}
            </span>
            <span>
              {Number.isFinite(secondsBeforeStart)
                ? secondsBeforeStart >= 0
                  ? `Saved ${duration(
                      secondsBeforeStart,
                    )} before race start · original prediction`
                  : "Saved after the scheduled race start"
                : "Original saved prediction · timing not recorded"}
            </span>
          </div>
          <div className="forecast-links">
            {forecast.artifacts?.prompt && (
              <a
                href={forecast.artifacts.prompt}
                target="_blank"
                rel="noreferrer"
              >
                Original prompt ↗
              </a>
            )}
            {forecast.artifacts?.prediction && (
              <a
                href={forecast.artifacts.prediction}
                target="_blank"
                rel="noreferrer"
              >
                Prediction JSON ↗
              </a>
            )}
            <a href={scoringCode} target="_blank" rel="noreferrer">
              Scoring code ↗
            </a>
          </div>
          <ScoreDrivers forecast={forecast} race={race} />
          <div className="race-layout" key={forecast.entrant}>
            <DriverTable forecast={forecast} race={race} />
            <Research forecast={forecast} race={race} />
          </div>
        </>
      ) : (
        <section className="empty panel">
          <span className="eyebrow">
            {labels[forecast?.status] || "Not available"}
          </span>
          <h2>
            {forecast?.status === "failed"
              ? "This forecast didn’t finish."
              : forecast?.status === "running"
              ? "Research is underway."
              : "Forecast not available yet."}
          </h2>
          <p>
            A complete forecast will appear here once this model finishes its
            research. Saved forecasts from other models remain available.
          </p>
        </section>
      )}
    </>
  );
}
