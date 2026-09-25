import React, { useState } from "react";
import { seasonSummary } from "./season";
import Methodology from "./Methodology";
import { modelColor } from "./brands";

const fmt = (x) => (Number.isFinite(x) ? x.toFixed(4) : "—");

export default function SeasonBench({ races, season, onRace }) {
  const { models, progression, leaderboard, excluded, completed } =
    seasonSummary(races, season);
  const [mode, setMode] = useState("cumulative");
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [hidden, setHidden] = useState(new Set());
  const visibleModels = models.filter((m) => !hidden.has(m.entrant));
  const active =
    progression.find((p) => p.id === (hovered || selected)) ||
    progression.at(-1);
  const values = progression.flatMap((p) =>
    models.map((m) => p.values[m.entrant][mode]),
  );
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 1;
  const pad = Math.max((maximum - minimum) * 0.2, 0.005);
  const low = Math.max(0, minimum - pad),
    high = maximum + pad;
  const x = (index) =>
    progression.length === 1
      ? 470
      : 70 + (index * 800) / (progression.length - 1);
  // Lower RPS appears higher on the chart, matching leaderboard rank.
  const y = (value) => 35 + ((value - low) / (high - low)) * 220;
  function toggleModel(id) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (models.length - next.size > 1) next.add(id);
      return next;
    });
  }
  function chartKey(event, index) {
    let next = index;
    if (event.key === "ArrowRight")
      next = Math.min(progression.length - 1, index + 1);
    else if (event.key === "ArrowLeft") next = Math.max(0, index - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = progression.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelected(progression[index].id);
      return;
    } else if (event.key === "Escape") {
      setSelected(null);
      setHovered(null);
      return;
    } else return;
    event.preventDefault();
    event.currentTarget.ownerSVGElement
      .querySelectorAll("[data-round]")
      [next].focus();
  }
  return (
    <section id="season" className="season-bench">
      <div className="bench-heading">
        <div>
          <h1>{season} season benchmark</h1>
          <p>
            Forecasting accuracy across the season. Select a race to inspect
            each model’s work.
          </p>
        </div>
        <div className="bench-count">
          <strong>{progression.length}</strong>
          <span>
            shared {progression.length === 1 ? "race" : "races"} scored
          </span>
        </div>
      </div>
      <section className="panel season-leaderboard">
        <div className="section-heading">
          <div>
            <h2>Season standings</h2>
          </div>
          <span className="count">Mean RPS · lower is better</span>
        </div>
        <p className="table-caption">
          Average race RPS across the same {progression.length} completed{" "}
          {progression.length === 1 ? "race" : "races"} for every model.{" "}
          {excluded > 0 &&
            `${excluded} partially scored ${excluded === 1 ? "race is" : "races are"} excluded until all models have scores.`}
        </p>
        <div className="table-scroll">
          <table className="score-table">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Model</th>
                <th scope="col">Season RPS</th>
                {progression.length > 1 && <th scope="col">Change</th>}
                <th scope="col">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((model, index) => (
                <tr key={model.entrant}>
                  <td>
                    {model.score === null
                      ? "—"
                      : String(
                          leaderboard.findIndex(
                            (m) => m.score === model.score,
                          ) + 1,
                        ).padStart(2, "0")}
                  </td>
                  <td>
                    <strong
                      className="model-name"
                      style={{
                        borderColor: modelColor(model.model || model.entrant),
                      }}
                    >
                      {model.name}
                    </strong>
                  </td>
                  <td className="score-value">{fmt(model.score)}</td>
                  {progression.length > 1 && (
                    <td className={model.change < 0 ? "improved" : ""}>
                      {model.change === null
                        ? "—"
                        : `${model.change > 0 ? "+" : ""}${model.change.toFixed(4)}`}
                      <small>
                        {model.change === null
                          ? "Needs two races"
                          : model.change < 0
                            ? " improved"
                            : model.change > 0
                              ? " increased error"
                              : " unchanged"}
                      </small>
                    </td>
                  )}
                  <td>
                    {model.coverage}/{completed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel progression-panel">
        <div className="section-heading">
          <div>
            <h2>Season progression</h2>
          </div>
          <div
            className="chart-modes"
            role="group"
            aria-label="Progression metric"
          >
            <button
              aria-pressed={mode === "cumulative"}
              onClick={() => setMode("cumulative")}
            >
              Cumulative average
            </button>
            <button
              aria-pressed={mode === "race"}
              onClick={() => setMode("race")}
            >
              Per race
            </button>
          </div>
        </div>
        <p className="table-caption">
          {mode === "cumulative"
            ? "Each point averages all shared races up to that round."
            : "Each point shows that race’s score on its own."}{" "}
          Lower scores appear higher. Hover or focus to inspect; click to select
          a round.{" "}
          {progression.length === 1 &&
            "Only one race is scored so far; a trend needs at least two."}
        </p>
        <div className="chart-legend">
          {models.map((m, i) => (
            <button
              key={m.entrant}
              aria-pressed={!hidden.has(m.entrant)}
              onClick={() => toggleModel(m.entrant)}
              title="Show or hide this model on the chart"
            >
              <i style={{ background: modelColor(m.model || m.entrant) }} />
              {m.name}
            </button>
          ))}
        </div>
        {progression.length ? (
          <>
            <div
              className="season-chart"
              onPointerLeave={() => setHovered(null)}
            >
              <svg
                viewBox="0 0 940 310"
                role="group"
                aria-label={`${season} ${mode === "cumulative" ? "cumulative average" : "per-race"} RPS for ${models.length} models over ${progression.length} races. Tab to a round; use left and right arrows to inspect and Enter to select. Exact values in the table below.`}
              >
                {[0, 1, 2, 3, 4].map((t) => {
                  const value = low + (t / 4) * (high - low);
                  return (
                    <g key={t}>
                      <line
                        x1="70"
                        x2="870"
                        y1={y(value)}
                        y2={y(value)}
                        stroke="#dce3eb"
                      />
                      <text x="56" y={y(value) + 4} textAnchor="end">
                        {value.toFixed(3)}
                      </text>
                    </g>
                  );
                })}
                {progression.map((p, i) => (
                  <g key={p.id}>
                    {active?.id === p.id && (
                      <line
                        x1={x(i)}
                        x2={x(i)}
                        y1="26"
                        y2="262"
                        stroke="#9daec4"
                        strokeDasharray="3 5"
                      />
                    )}
                    {(progression.length <= 12 ||
                      i === 0 ||
                      i === progression.length - 1 ||
                      i % Math.ceil(progression.length / 10) === 0) && (
                      <text x={x(i)} y="285" textAnchor="middle">
                        R{p.round}
                      </text>
                    )}
                  </g>
                ))}
                {models.map(
                  (m, i) =>
                    !hidden.has(m.entrant) && (
                      <g key={m.entrant}>
                        {progression.length > 1 && (
                          <polyline
                            fill="none"
                            stroke={modelColor(m.model || m.entrant)}
                            strokeWidth="2.5"
                            points={progression
                              .map(
                                (p, j) =>
                                  `${x(j)},${y(p.values[m.entrant][mode])}`,
                              )
                              .join(" ")}
                          />
                        )}
                        {progression.map((p, j) => (
                          <circle
                            key={p.id}
                            cx={x(j)}
                            cy={y(p.values[m.entrant][mode])}
                            r={active?.id === p.id ? 5 : 3.5}
                            fill={modelColor(m.model || m.entrant)}
                            stroke="white"
                            strokeWidth="1.5"
                          >
                            <title>
                              {m.name} · R{p.round}:{" "}
                              {fmt(p.values[m.entrant][mode])}
                            </title>
                          </circle>
                        ))}
                      </g>
                    ),
                )}
                {progression.map((point, index) => {
                  const left = index === 0 ? 70 : (x(index - 1) + x(index)) / 2;
                  const right =
                    index === progression.length - 1
                      ? 870
                      : (x(index) + x(index + 1)) / 2;
                  return (
                    <rect
                      key={point.id}
                      data-round={point.id}
                      x={left}
                      y="22"
                      width={Math.max(1, right - left)}
                      height="244"
                      fill="transparent"
                      tabIndex={0}
                      role="button"
                      aria-label={`Inspect round ${point.round}: ${point.name}`}
                      aria-pressed={selected === point.id}
                      className="chart-hit-area"
                      onPointerEnter={() => setHovered(point.id)}
                      onFocus={() => setHovered(point.id)}
                      onBlur={() => setHovered(null)}
                      onClick={() => setSelected(point.id)}
                      onKeyDown={(event) => chartKey(event, index)}
                    />
                  );
                })}
              </svg>
              {(hovered || selected) && active && (
                <div className="chart-tooltip" role="status">
                  <strong>
                    R{active.round} · {active.name.replace(/^\d{4}\s+/, "")}
                  </strong>
                  <span>
                    {mode === "cumulative" ? "Cumulative average" : "Race RPS"}
                  </span>
                  {visibleModels.map((model) => (
                    <div key={model.entrant}>
                      <span>{model.name}</span>
                      <b>{fmt(active.values[model.entrant][mode])}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="progression-inspector">
              <label>
                Inspect a round
                <select
                  value={active.id}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setHovered(null);
                  }}
                >
                  {progression.map((p) => (
                    <option value={p.id} key={p.id}>
                      R{p.round} · {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button" onClick={() => onRace(active.id)}>
                Open this race ↗
              </button>
            </div>
            <details className="chart-data">
              <summary>Score data for selected round</summary>
              <div className="table-scroll">
                <table className="score-table progression-values">
                  <caption>
                    R{active.round} ·{" "}
                    {mode === "cumulative"
                      ? "Cumulative average through this race"
                      : "This race only"}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Model</th>
                      <th scope="col">RPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((m) => (
                      <tr key={m.entrant}>
                        <td>{m.name}</td>
                        <td>{fmt(active.values[m.entrant][mode])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <div className="empty-inline">
            The first shared race score will start the season chart.
          </div>
        )}
      </section>
      <section className="panel bench-races" id="races">
        <div className="section-heading">
          <h2>Races</h2>
        </div>
        <p className="table-caption">
          Open a race for predictions, probabilities, research, and post-race
          reviews.
        </p>
        <div className="table-scroll">
          <table className="score-table">
            <thead>
              <tr>
                <th scope="col">Round</th>
                <th scope="col">Race</th>
                <th scope="col">Status</th>
                <th scope="col">Scored</th>
                <th scope="col">
                  <span className="sr-only">Open race</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {races
                .filter((r) => r.season === season)
                .sort((a, b) => b.round - a.round)
                .map((r) => (
                  <tr key={r.id}>
                    <td>{r.round}</td>
                    <td>
                      <strong>{r.name.replace(/^\d{4}\s+/, "")}</strong>
                    </td>
                    <td>{r.state}</td>
                    <td>
                      {
                        r.forecasts.filter((f) =>
                          Number.isFinite(f.metrics?.mean_rps),
                        ).length
                      }
                      /{r.forecasts.length}
                    </td>
                    <td>
                      <button
                        className="race-open"
                        onClick={() => onRace(r.id)}
                        aria-label={`View ${r.name}`}
                      >
                        View race →
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      <Methodology />
    </section>
  );
}
