import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import "./styles.css";
import SeasonBench from "./SeasonBench";
import { sortDrivers } from "./season";
import Notes, { Note } from "./Notes.jsx";
import { modelColor } from "./brands";

const percent = (value) => `${(value * 100).toFixed(1)}%`;
const number = (value, digits = 4) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";
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
          <span className="eyebrow">Driver forecasts</span>
          <h2>
            {forecast.report ? "Where they land" : "Forecast probabilities"}
          </h2>
        </div>
        <span className="count">{forecast.rows.length} drivers</span>
      </div>
      <div className="driver-sort">
        <label>
          Order by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {forecast.report && (
              <option value="call">Model’s finishing-order call</option>
            )}
            <option value="expected">Average rank (all outcomes)</option>
            <option value="podium">Podium chance (highest first)</option>
          </select>
        </label>
      </div>
      <p className="table-caption">
        {sort === "call"
          ? "The model’s explicit finishing-order call."
          : sort === "podium"
            ? "Sorted by the probability of a top-three finish. This is not a predicted finishing order."
            : `Sorted by average rank across all outcomes. NC, DNS and DSQ count as rank ${forecast.rows.length + 1}; a larger downside risk can outweigh a higher podium chance.`}
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
              <th
                scope="col"
                title="Average rank including non-classification risk"
              >
                Avg rank
              </th>
              <th scope="col">Podium</th>
              <th scope="col">Points</th>
              <th scope="col">Retire</th>
              {race.result && <th scope="col">Actual</th>}
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
                    <td className="expected-rank">
                      {number(row.expected_rank, 2)}
                    </td>
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
                          className={`actual ${truth?.position === forecastRanks.get(row.id) ? "match" : ""}`}
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
                          <strong>{number(row.expected_rank, 2)}</strong>.
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

function Research({ forecast }) {
  const report = forecast.report;
  return (
    <aside id="research" className="research">
      <section className="research-intro">
        <span className="eyebrow">Model research</span>
        <h2>Research & reasoning</h2>
        <p>The model’s analysis, assumptions, and sources.</p>
      </section>
      {report ? (
        <>
          <section className="insight lead">
            <span className="eyebrow">Race outlook</span>
            <p>{report.summary}</p>
          </section>
          {report.insights.map((insight, i) => (
            <article className="insight" key={i}>
              <span className="eyebrow">
                Research finding {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{insight.claim}</h3>
              <p>{insight.impact}</p>
              <div className="check">
                <strong>What to watch</strong>
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
            <span className="eyebrow">What could change the race</span>
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
        </>
      ) : (
        <Notes
          key={forecast.entrant + "-research"}
          text={forecast.explanation}
        />
      )}

      {report && forecast.explanation && (
        <details className="note-panel">
          <summary>Extended research note</summary>
          <Note text={forecast.explanation} />
        </details>
      )}
      {forecast.review ? (
        <Notes
          key={forecast.entrant + "-review"}
          text={forecast.review}
          kind="review"
        />
      ) : (
        <p className="notes-context">Post-race review pending.</p>
      )}
      {forecast.run_details && (
        <details className="run-details">
          <summary>Run details</summary>
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
            <dd>
              {Number.isFinite(forecast.run_details.runtime_seconds)
                ? `${Math.floor(forecast.run_details.runtime_seconds / 60)} min ${Math.round(forecast.run_details.runtime_seconds % 60)} sec`
                : "Not recorded"}
            </dd>
            <dt>Model spend</dt>
            <dd>
              {Number.isFinite(forecast.run_details.cost_usd)
                ? `$${forecast.run_details.cost_usd.toFixed(2)}`
                : "Not recorded"}
            </dd>
            <dt>Model calls</dt>
            <dd>{forecast.run_details.model_calls ?? "Not recorded"}</dd>
            <dt>Provider</dt>
            <dd>
              {forecast.run_details.providers?.join(", ") || "Not recorded"}
            </dd>
          </dl>
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

function Scores({ race, races }) {
  const scored = race.forecasts
    .filter((f) => f.metrics)
    .sort((a, b) => a.metrics.mean_rps - b.metrics.mean_rps);
  // A season comparison uses only races completed by every currently configured model.
  const common = races.filter(
    (r) =>
      r.season === race.season &&
      r.forecasts.length === race.forecasts.length &&
      r.forecasts.every(
        (f) => f.metrics && race.forecasts.some((m) => m.entrant === f.entrant),
      ),
  );
  return (
    <section className="scores panel" id="scores">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Evaluation</span>
          <h2>Race scores</h2>
        </div>
        <span className="count">
          {scored.length}/{race.forecasts.length} scored
        </span>
      </div>
      <p className="table-caption">
        Every driver counts. Ranked Probability Score rewards accurate forecasts
        and honest uncertainty. Lower is better.
      </p>
      {scored.length ? (
        <div className="table-scroll">
          <table className="score-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>This race · RPS</th>
                <th>Rank error</th>
                <th>Season · RPS</th>
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
                  <td>
                    {number(f.metrics.expected_rank_mae, 2)}{" "}
                    <small>places</small>
                  </td>
                  <td>
                    {common.length
                      ? number(
                          common.reduce(
                            (sum, r) =>
                              sum +
                              r.forecasts.find((m) => m.entrant === f.entrant)
                                .metrics.mean_rps,
                            0,
                          ) / common.length,
                        )
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-inline">
          Scores appear when the official classification is saved.
        </div>
      )}
      <p className="table-foot">
        Season average: {common.length} shared{" "}
        {common.length === 1 ? "race" : "races"} in {race.season}. Rank error
        compares each driver’s expected finish with the result. Unclassified
        outcomes count as field size + 1.
      </p>
    </section>
  );
}

function RacePage({ race, races }) {
  const [entrant, setEntrant] = useState(
    race.forecasts.find((f) => f.status === "completed")?.entrant ||
      race.forecasts[0]?.entrant,
  );
  const forecast = race.forecasts.find((f) => f.entrant === entrant);
  const titleParts = race.name.replace(/^\d{4}\s+/, "").split(/\s+[—–]\s+/);
  const title = titleParts.at(-1);
  return (
    <>
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
        </div>
      </section>
      <div className="model-toolbar">
        <span className="eyebrow">Model</span>
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
              {forecast.report
                ? "Original model order"
                : "Derived order · original probabilities"}{" "}
            </span>
          </div>
          <div className="race-layout">
            <DriverTable
              key={forecast.entrant}
              forecast={forecast}
              race={race}
            />
            <Research forecast={forecast} />
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
                : "The next call is still ahead."}
          </h2>
          <p>
            A complete forecast will appear here once this model finishes its
            research. Saved forecasts from other models remain available.
          </p>
        </section>
      )}
      <Scores race={race} races={races} />
    </>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [raceId, setRaceId] = useState(null);
  const [view, setView] = useState(
    new URLSearchParams(window.location.search).has("race") ||
      ["#forecast", "#research", "#scores"].includes(window.location.hash)
      ? "race"
      : "season",
  );
  const [season, setSeason] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data.json`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Race data is unavailable.");
        return r.json();
      })
      .then((value) => {
        if (!Array.isArray(value.races))
          throw new Error("Race data is invalid.");
        setData(value);
        setSeason(value.races.at(-1)?.season ?? null);
        const requested = new URLSearchParams(window.location.search).get(
          "race",
        );
        setRaceId(
          value.races.find((r) => r.id === requested)?.id ||
            value.races.at(-1)?.id ||
            null,
        );
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, []);
  const race = data?.races.find((r) => r.id === raceId);
  function selectRace(id) {
    setRaceId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("race", id);
    window.history.replaceState(null, "", url);
  }
  function changeView(next) {
    setView(next);
    const url = new URL(window.location.href);
    url.hash = next === "season" ? "season" : "";
    if (next === "season") url.searchParams.delete("race");
    window.history.replaceState(null, "", url);
  }
  function openRace(id) {
    selectRace(id);
    changeView("race");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  return (
    <>
      <a className="skip" href="#main">
        Skip to forecasts
      </a>
      <header className="topbar">
        <div className="shell navigation">
          <a className="brand" href="/" aria-label="F1 Bench home">
            <span className="brand-mark" aria-hidden="true">
              //
            </span>
            F1 BENCH
          </a>
          <nav aria-label="Primary">
            <a
              href="#season"
              aria-current={view === "season" ? "page" : undefined}
              onClick={() => changeView("season")}
            >
              Benchmark
            </a>
            <a href="#races" onClick={() => changeView("season")}>
              Races
            </a>
            <a href="#methodology" onClick={() => changeView("season")}>
              Methodology
            </a>
          </nav>
        </div>
      </header>
      <main id="main" className="shell">
        <div className="season-bar">
          {view === "race" ? (
            <button className="back-link" onClick={() => changeView("season")}>
              ← Season benchmark
            </button>
          ) : (
            <span className="season-tag">Formula 1 forecasting</span>
          )}
          {data?.races.length > 0 && view === "season" && (
            <label className="race-select">
              Season
              <select
                value={season || ""}
                onChange={(e) => setSeason(Number(e.target.value))}
              >
                {[...new Set(data.races.map((r) => r.season))]
                  .sort((a, b) => b - a)
                  .map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {data?.races.length > 0 && view === "race" && (
            <label className="race-select">
              <span>Race</span>
              <select
                value={raceId || ""}
                onChange={(e) => selectRace(e.target.value)}
              >
                {[...data.races].reverse().map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.season} · R{r.round} · {r.name.replace(/^\d{4}\s+/, "")}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {error ? (
          <section className="empty panel" role="alert">
            <h1>Couldn’t load the races.</h1>
            <p>{error}</p>
            <button className="button" onClick={() => window.location.reload()}>
              Try again
            </button>
          </section>
        ) : !data ? (
          <p className="loading" role="status">
            Loading the benchmark…
          </p>
        ) : view === "season" ? (
          <SeasonBench
            key={season}
            races={data.races}
            season={season}
            onRace={openRace}
          />
        ) : race ? (
          <RacePage key={race.id} race={race} races={data.races} />
        ) : (
          <section className="empty panel">
            <h1>No races yet.</h1>
            <p>
              The first race forecast will appear once the event is prepared.
            </p>
          </section>
        )}
      </main>
      <footer className="shell footer">
        <a className="brand" href="/">
          F1 BENCH
        </a>
        <p>Scores use frozen, pre-race forecasts.</p>
        <a href="https://saipraneeth.in" target="_blank" rel="noreferrer">
          By Sai Praneeth ↗
        </a>
      </footer>
      <Analytics />
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
