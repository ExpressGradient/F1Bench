"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { seasonSummary, runUsage, money, duration } from "./season";
import { costLabel, hasFullCosts, recordedCost } from "./costs";
import Methodology from "./Methodology";
import { modelColor } from "./brands";
import { BaselineNote } from "./Evaluation";
import PaddockCar from "./PaddockCar";

const fmt = (value) => (Number.isFinite(value) ? value.toFixed(4) : "—");
const shortRace = (race) => race.name.split(/\s+[—–]\s+/).at(-1);

function Efficiency({ models }) {
  const [metric, setMetric] = useState("cost");
  const points = models.filter(
    (m) => m.score !== null && m.usage[metric].average !== null,
  );
  const maxX = Math.max(...points.map((m) => m.usage[metric].average), 1) * 1.3;
  const minY = points.length
    ? Math.max(0, Math.min(...points.map((m) => m.score)) - 0.004)
    : 0;
  const maxY = points.length
    ? Math.max(...points.map((m) => m.score)) + 0.004
    : 1;
  const x = (value) => 56 + (value / maxX) * 350;
  const y = (value) => 28 + ((maxY - value) / (maxY - minY)) * 150;
  return (
    <section className="analysis-section">
      <div className="analysis-heading">
        <h2>Forecast error vs. model cost & time</h2>
        <div
          className="metric-switch"
          role="group"
          aria-label="Resource comparison"
        >
          <button
            aria-pressed={metric === "cost"}
            onClick={() => setMetric("cost")}
          >
            Model API
          </button>
          <button
            aria-pressed={metric === "seconds"}
            onClick={() => setMetric("seconds")}
          >
            Time
          </button>
        </div>
      </div>
      <p className="chart-caption">
        Lower left means less error for less money or time.
      </p>
      {points.length ? (
        <svg
          className="compact-chart"
          viewBox="0 0 460 222"
          role="img"
          aria-label={`Mean RPS versus average ${
            metric === "cost" ? "model spend" : "runtime"
          }. Model charges appear in the spend breakdown.`}
        >
          {[0, 1, 2].map((n) => {
            const value = minY + ((maxY - minY) * n) / 2;
            return (
              <g key={n}>
                <line x1="56" x2="430" y1={y(value)} y2={y(value)} />
                <text x="46" y={y(value) + 4} textAnchor="end">
                  {value.toFixed(3)}
                </text>
              </g>
            );
          })}
          {[0, 1, 2, 3].map((n) => {
            const value = (maxX * n) / 3;
            return (
              <text key={n} x={x(value)} y="201" textAnchor="middle">
                {metric === "cost" ? money(value) : duration(value)}
              </text>
            );
          })}
          <text x="56" y="14">
            Error (RPS) ↓
          </text>
          {points.map((m, index) => (
            <g key={m.entrant}>
              <circle
                cx={x(m.usage[metric].average)}
                cy={y(m.score)}
                r="4.5"
                fill={modelColor(m.model)}
              />
              <text
                x={x(m.usage[metric].average) + 10}
                y={y(m.score) + (index % 2 ? 18 : -10)}
                className="point-label"
              >
                {m.name.split(" ")[0]}
              </text>
              <title>{`${m.name}: ${fmt(m.score)} RPS, ${
                metric === "cost"
                  ? money(m.usage.cost.average)
                  : duration(m.usage.seconds.average)
              }`}</title>
            </g>
          ))}
        </svg>
      ) : (
        <p className="chart-empty">
          Recorded scores and {metric === "cost" ? "costs" : "runtimes"} will
          appear here.
        </p>
      )}
    </section>
  );
}

function Progression({ models, progression, onRace }) {
  const [mode, setMode] = useState("race");
  const values = progression.flatMap((p) =>
    models.map((m) => p.values[m.entrant][mode]),
  );
  const low = values.length ? Math.max(0, Math.min(...values) - 0.015) : 0;
  const high = values.length ? Math.max(...values) + 0.015 : 1;
  const x = (i) =>
    progression.length === 1 ? 200 : 62 + (i * 260) / (progression.length - 1);
  const y = (v) => 28 + ((high - v) / (high - low)) * 150;
  const endLabels = progression.length
    ? models
        .map((m) => ({
          model: m,
          y: y(progression.at(-1).values[m.entrant][mode]),
        }))
        .sort((a, b) => a.y - b.y)
    : [];
  endLabels.forEach((label, i) => {
    label.labelY = Math.max(label.y, i ? endLabels[i - 1].labelY + 18 : 28);
  });
  const labelOffset = Math.max(0, (endLabels.at(-1)?.labelY ?? 0) - 178);
  return (
    <section className="analysis-section">
      <div className="analysis-heading">
        <h2>Forecast error by race</h2>
        <div
          className="metric-switch"
          role="group"
          aria-label="Progression metric"
        >
          <button
            aria-pressed={mode === "race"}
            onClick={() => setMode("race")}
          >
            Per race
          </button>
          <button
            aria-pressed={mode === "cumulative"}
            onClick={() => setMode("cumulative")}
          >
            Average
          </button>
        </div>
      </div>
      <p className="chart-caption">
        {mode === "race" ? "Race RPS" : "Cumulative mean RPS"} · lower is better
        {progression.length === 1 ? " · one race, no trend yet" : ""}
      </p>
      {progression.length ? (
        <svg
          className="compact-chart"
          viewBox="0 0 460 222"
          role="group"
          aria-label="Score progression. Select a round to open its forecasts; exact scores are in the race table."
        >
          {[0, 1, 2].map((n) => {
            const value = low + ((high - low) * n) / 2;
            return (
              <g key={n}>
                <line x1="56" x2="430" y1={y(value)} y2={y(value)} />
                <text x="46" y={y(value) + 4} textAnchor="end">
                  {value.toFixed(3)}
                </text>
              </g>
            );
          })}
          <text x="56" y="14">
            Error (RPS) ↓
          </text>
          {models.map((m) => (
            <g key={m.entrant}>
              <polyline
                fill="none"
                stroke={modelColor(m.model)}
                strokeWidth="1.6"
                points={progression
                  .map((p, i) => `${x(i)},${y(p.values[m.entrant][mode])}`)
                  .join(" ")}
              />
              {progression.map((p, i) => (
                <circle
                  key={p.id}
                  cx={x(i)}
                  cy={y(p.values[m.entrant][mode])}
                  r="3.5"
                  fill={modelColor(m.model)}
                >
                  <title>{`${m.name} · R${p.round}: ${fmt(
                    p.values[m.entrant][mode],
                  )}`}</title>
                </circle>
              ))}
            </g>
          ))}
          {endLabels.map(({ model, y: pointY, labelY }) => (
            <g key={model.entrant}>
              <line
                x1={x(progression.length - 1) + 5}
                x2={x(progression.length - 1) + 15}
                y1={pointY}
                y2={labelY - labelOffset}
              />
              <text
                x={x(progression.length - 1) + 19}
                y={labelY - labelOffset + 4}
                className="point-label"
              >
                {model.name.split(" ")[0]}
              </text>
            </g>
          ))}
          {progression.map((p, i) => (
            <g
              key={p.id}
              role="button"
              tabIndex={0}
              className="round-target"
              aria-label={`Open round ${p.round}: ${p.name}. ${models
                .map((m) => `${m.name}: ${fmt(p.values[m.entrant][mode])} RPS`)
                .join("; ")}`}
              onClick={() => onRace(p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRace(p.id);
                }
              }}
            >
              <rect
                x={x(i) - 18}
                y="18"
                width="36"
                height="195"
                fill="transparent"
              />
              {(progression.length <= 8 ||
                i % Math.ceil(progression.length / 8) === 0 ||
                i === progression.length - 1) && (
                <text x={x(i)} y="201" textAnchor="middle">
                  R{p.round}
                </text>
              )}
            </g>
          ))}
        </svg>
      ) : (
        <p className="chart-empty">
          The first shared race will start the chart.
        </p>
      )}
    </section>
  );
}

export default function SeasonBench({ races }) {
  const router = useRouter();
  const years = [...new Set(races.map((race) => race.season))].sort(
    (a, b) => b - a,
  );
  const [season, setSeason] = useState(years[0] ?? null);
  const onRace = (id) => router.push(`/races/${id}/`);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("race");
    const race = races.find((r) => r.id === requested);
    if (race) router.replace(`/races/${race.id}/${window.location.hash}`);
  }, [races, router]);
  const { models, progression, leaderboard, excluded, completed, baseline } =
    seasonSummary(races, season);
  const [sort, setSort] = useState("score");
  const [direction, setDirection] = useState(1);
  const [raceMetric, setRaceMetric] = useState("score");
  const events = races
    .filter((r) => r.season === season)
    .sort((a, b) => b.round - a.round);
  const fullForecastCost = hasFullCosts(leaderboard.map((m) => m.forecastCost));
  const fullSpend = hasFullCosts(leaderboard.map((m) => m.spending.total));
  const fullRaceCost = hasFullCosts(
    events.flatMap((r) =>
      r.forecasts.filter((f) => f.metrics).map((f) => f.costs?.forecast),
    ),
  );
  const spendColumns = [
    ["forecast", "Forecasts"],
    ["review", "Reviews"],
    ["failed", "Failed attempts"],
  ].filter(([key]) =>
    leaderboard.some(
      (m) =>
        m.spending[key].runs > 0 &&
        (m.spending[key].known_usd > 0 ||
          Number.isFinite(m.spending[key].total_usd)),
    ),
  );
  const value = (m, key) =>
    key === "score"
      ? m.score
      : key === "total"
      ? recordedCost(m.spending.total)
      : key === "forecast"
      ? fullForecastCost
        ? m.forecastCost.total_usd / m.usage.count
        : m.usage.cost.average
      : m.usage[key].average;
  const sorted = [...leaderboard].sort((a, b) => {
    const av = value(a, sort),
      bv = value(b, sort);
    return av === null
      ? bv === null
        ? 0
        : 1
      : bv === null
      ? -1
      : (av - bv) * direction;
  });
  const headers = [
    ["score", "Error", "Avg. "],
    ["forecast", fullForecastCost ? "Cost" : "Model API", "/forecast"],
    ["seconds", "Time", "/forecast"],
    ["total", fullSpend ? "Total spend" : "Recorded spend"],
  ];
  function sortBy(key) {
    setSort(key);
    setDirection(sort === key ? -direction : 1);
  }
  return (
    <section id="season" className="benchmark">
      <div className="benchmark-title">
        <div>
          <h1>How well can AI predict Formula 1?</h1>
          <p>
            AI models research each race and predict every driver’s finish. We
            compare their predictions with the real results, plus what each
            forecast cost and how long it took.
          </p>
        </div>
        <PaddockCar />
      </div>
      <details className="quick-guide">
        <summary>Explain like I’m lost</summary>
        <p>
          Each AI predicts every driver’s chances before the race. A 70% chance
          of winning still leaves a 30% chance of losing.
        </p>
        <p>
          <strong>RPS is the error score: lower is better.</strong> Zero is
          perfect; 0.12 does not mean 12% accuracy. Cost and time show the
          average dollars and minutes used to make one race forecast.
        </p>
        <p>
          Compare models on the same races. A small lead over just a few races
          is an early result, not proof that one model is always better.
        </p>
      </details>
      <section className="standings" aria-labelledby="standings-heading">
        <div className="analysis-heading standings-heading">
          <div className="standings-title">
            <h2 id="standings-heading">Model standings</h2>
            <label className="season-picker">
              <span>Season</span>
              <select
                aria-label="Season"
                value={season ?? ""}
                onChange={(e) => setSeason(Number(e.target.value))}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <span className="subtle">
            {models.length} models ·{" "}
            {progression.length < 10 ? "Early results · " : ""}
            {progression.length} races compared
          </span>
        </div>
        <p className="table-caption">
          Lower error means better predictions. We use RPS: 0 is perfect; 0.12
          does not mean 12% accuracy.
          {progression.length < 10 &&
            " Too few races to establish a reliable winner."}
        </p>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Season scores, costs, and runtimes"
        >
          <table className="benchmark-table">
            <thead>
              <tr>
                <th scope="col" className="rank-cell">
                  #
                </th>
                <th scope="col">Model</th>
                {headers.map(([key, title, qualifier]) => (
                  <th
                    key={key}
                    scope="col"
                    className="numeric"
                    aria-sort={
                      sort === key
                        ? direction === 1
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button onClick={() => sortBy(key)}>
                      {key === "score" && (
                        <span className="desktop-label">{qualifier}</span>
                      )}
                      {title}
                      {key !== "score" && (
                        <span className="desktop-label">{qualifier}</span>
                      )}
                      <span className="sort-indicator" aria-hidden="true">
                        {sort === key ? (direction === 1 ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  </th>
                ))}
                <th scope="col" className="numeric">
                  Scored
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr key={m.entrant}>
                  <td className="rank-cell">
                    {m.score === null
                      ? "—"
                      : String(
                          leaderboard.findIndex(
                            (entry) => entry.score === m.score,
                          ) + 1,
                        ).padStart(2, "0")}
                  </td>
                  <th scope="row">
                    <span
                      className="model-dot"
                      style={{ background: modelColor(m.model) }}
                    />
                    {m.name}
                  </th>
                  <td className="numeric primary-score">{fmt(m.score)}</td>
                  <td
                    className="numeric"
                    title={`Model API average: ${money(
                      m.usage.cost.average,
                    )}. Full breakdown below.`}
                  >
                    {fullForecastCost
                      ? costLabel(m.forecastCost, m.usage.count)
                      : money(m.usage.cost.average)}
                  </td>
                  <td
                    className="numeric"
                    title={`${m.usage.seconds.recorded}/${m.usage.count} runtimes recorded`}
                  >
                    {duration(m.usage.seconds.average)}
                  </td>
                  <td className="numeric">{costLabel(m.spending.total)}</td>
                  <td className="numeric subtle">
                    {m.coverage}/{completed}
                  </td>
                </tr>
              ))}
              {baseline !== null && (
                <tr className="baseline-row">
                  <td className="rank-cell">—</td>
                  <th scope="row">Grid baseline</th>
                  <td className="numeric">{fmt(baseline)}</td>
                  <td className="numeric">—</td>
                  <td className="numeric">—</td>
                  <td className="numeric">—</td>
                  <td className="numeric">
                    {progression.length}/{progression.length}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mobile-table-hint">Scroll for spend and races scored →</p>
        {!models.length && (
          <p className="chart-empty">No forecasts in this season yet.</p>
        )}
        <div className="benchmark-footnote">
          <p>
            Averages use the same {progression.length} races.
            {fullForecastCost
              ? " Forecast cost includes model calls and research."
              : " Model API costs exclude historical search and extraction fees."}
            {fullSpend
              ? " Total spend includes reviews and failed attempts."
              : " Recorded spend includes saved forecast and review charges."}
          </p>
          <details>
            <summary>What’s included</summary>
            <p>
              Forecast averages use shared scored races; total spend includes
              all season races. Research fees on new runs are list-price
              estimates (≈). Historical research fees and some failed-attempt
              charges are unavailable; recorded spend is not a complete bill.
              The cost chart uses model API costs only so historical runs remain
              comparable. RPS is an error measure, so spend is shown alongside
              the score rather than divided by it.
            </p>
          </details>
        </div>
        <details className="spend-details">
          <summary>Spend breakdown</summary>
          <div className="table-scroll">
            <table className="cost-breakdown">
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  {spendColumns.map(([key, label]) => (
                    <th scope="col" key={key}>
                      {label}
                    </th>
                  ))}
                  <th scope="col">{fullSpend ? "Total" : "Recorded"}</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((m) => (
                  <tr key={m.entrant}>
                    <th scope="row">{m.name}</th>
                    {spendColumns.map(([key]) => (
                      <td key={key}>{costLabel(m.spending[key])}</td>
                    ))}
                    <td>{costLabel(m.spending.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!fullSpend && (
            <p className="table-caption">
              Excludes research fees and failed-attempt charges without saved
              billing records.
            </p>
          )}
        </details>
        <BaselineNote />
        {excluded > 0 && (
          <p className="data-notice">
            {excluded} partially scored{" "}
            {excluded === 1 ? "race excluded" : "races excluded"} from all
            season averages.
          </p>
        )}
      </section>
      <div className="shared-legend">
        {leaderboard.map((m) => (
          <span key={m.entrant}>
            <i
              className="model-dot"
              style={{ background: modelColor(m.model) }}
            />
            {m.score === null
              ? ""
              : `${
                  leaderboard.findIndex((entry) => entry.score === m.score) + 1
                } · `}
            {m.name}
          </span>
        ))}
      </div>
      <div className="analysis-grid">
        <Efficiency models={leaderboard} />
        <Progression
          models={models}
          progression={progression}
          onRace={onRace}
        />
      </div>
      <section id="races" className="race-breakdown">
        <div className="analysis-heading">
          <h2>Compare a race</h2>
          <div
            className="metric-switch"
            role="group"
            aria-label="Race table metric"
          >
            {[
              ["score", "Error"],
              ["cost", fullRaceCost ? "Cost" : "Model API"],
              ["seconds", "Time"],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-pressed={raceMetric === key}
                onClick={() => setRaceMetric(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Per-race comparison"
        >
          <table className="benchmark-table race-matrix">
            <thead>
              <tr>
                <th scope="col">Round / race</th>
                {models.map((m) => (
                  <th scope="col" className="numeric" key={m.entrant}>
                    {m.name}
                  </th>
                ))}
                <th scope="col" className="numeric">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((r) => (
                <tr key={r.id}>
                  <th scope="row">
                    <Link className="race-link" href={`/races/${r.id}/`}>
                      <span className="round-number">
                        {String(r.round).padStart(2, "0")}
                      </span>
                      {shortRace(r)}
                      <span className="race-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </Link>
                  </th>
                  {models.map((m) => {
                    const f = r.forecasts.find((f) => f.entrant === m.entrant);
                    const usage = runUsage(f);
                    return (
                      <td key={m.entrant} className="numeric">
                        {raceMetric === "score"
                          ? fmt(f?.metrics?.mean_rps)
                          : raceMetric === "cost"
                          ? fullRaceCost
                            ? costLabel(f?.costs?.forecast)
                            : money(usage.cost)
                          : duration(usage.seconds)}
                      </td>
                    );
                  })}
                  <td className="numeric race-state">{r.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="chart-caption">
          {raceMetric === "score"
            ? "Forecast error (RPS) · lower is better."
            : raceMetric === "cost"
            ? fullRaceCost
              ? "USD · model calls + research."
              : "Model API cost in USD · research fees excluded."
            : "Time taken to make each forecast."}{" "}
          Open a race to compare predictions with results.
        </p>
      </section>
      <Methodology />
    </section>
  );
}
