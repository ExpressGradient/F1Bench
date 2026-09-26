import React from "react";
import { ImageResponse } from "@vercel/og";
import notebook from "../public/data.json";
import { seasonSummary, runUsage, money, duration } from "../src/season.js";
import { modelColor } from "../src/brands.js";

const ink = "#26292f",
  muted = "#686e78",
  line = "#e5e7eb";
const widths = [52, 424, 204, 204, 204];
const fonts = await Promise.all(
  [
    ["Instrument Sans", "instrument-sans-regular.ttf", 400],
    ["Instrument Sans", "instrument-sans-semibold.ttf", 600],
    ["Geist Mono", "geist-mono-regular.ttf", 400],
  ].map(async ([name, file, weight]) => ({
    name,
    weight,
    style: "normal",
    data: await Bun.file(
      new URL(`../app/fonts/${file}`, import.meta.url),
    ).arrayBuffer(),
  })),
);

function Card({ title, subtitle, rows, perForecast }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "44px 56px",
        background: "#fff",
        color: ink,
        fontFamily: "Instrument Sans",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: -0.6,
          }}
        >
          <svg width="25" height="26" viewBox="0 0 64 64">
            <path d="M28 0L12 64h11L39 0zm18 0L30 64h11L57 0z" fill={ink} />
          </svg>
          F1 BENCH
        </div>
        <span style={{ color: muted, fontSize: 19 }}>f1bench.vercel.app</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 26 }}>
        <div
          style={{
            fontSize: title.length > 40 ? 36 : 46,
            fontWeight: 600,
            letterSpacing: -1.5,
            lineHeight: 1.15,
          }}
        >
          {title}
        </div>
        <div style={{ marginTop: 10, fontSize: 21, color: muted }}>
          {subtitle}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 44,
            background: "#f7f8fa",
            color: muted,
            fontSize: 18,
          }}
        >
          {[
            "#",
            "Model",
            perForecast ? "Mean RPS" : "Race RPS",
            perForecast ? "Cost / forecast" : "Cost",
            perForecast ? "Time / forecast" : "Time",
          ].map((label, i) => (
            <div
              key={label}
              style={{
                display: "flex",
                width: widths[i],
                padding: "0 16px",
                justifyContent: i > 1 ? "flex-end" : "flex-start",
              }}
            >
              {label}
            </div>
          ))}
        </div>
        {rows.slice(0, 3).map((row, i) => (
          <div
            key={row.entrant}
            style={{
              display: "flex",
              alignItems: "center",
              height: 66,
              borderBottom:
                i < Math.min(rows.length, 3) - 1 ? `1px solid ${line}` : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                width: widths[0],
                paddingLeft: 16,
                color: muted,
                fontSize: 18,
                fontFamily: "Geist Mono",
              }}
            >
              {row.score === null
                ? "—"
                : String(
                    rows.findIndex((r) => r.score === row.score) + 1,
                  ).padStart(2, "0")}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: widths[1],
                paddingLeft: 16,
                fontSize: 25,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: modelColor(row.model),
                }}
              />
              {row.name}
            </div>
            {[
              Number.isFinite(row.score) ? row.score.toFixed(4) : "—",
              money(row.cost),
              duration(row.seconds),
            ].map((value, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  width: widths[index + 2],
                  paddingRight: 16,
                  fontSize: 25,
                  fontFamily: "Geist Mono",
                }}
              >
                {value}
              </div>
            ))}
          </div>
        ))}
        {!rows.length && (
          <div
            style={{
              display: "flex",
              height: 132,
              alignItems: "center",
              fontSize: 24,
              color: muted,
            }}
          >
            The first scored forecasts will appear here.
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "auto",
          paddingTop: 18,
          borderTop: `1px solid ${line}`,
          fontSize: 18,
          color: muted,
        }}
      >
        <span>
          {rows.length > 3
            ? "Top 3 · Lower RPS is better"
            : "Lower RPS is better"}
        </span>
        <span>Model spend in USD · Wall time in minutes</span>
      </div>
    </div>
  );
}

async function writeCard(path, props) {
  const response = new ImageResponse(<Card {...props} />, {
    width: 1200,
    height: 630,
    fonts,
  });
  await Bun.write(
    new URL(`../public/${path}`, import.meta.url),
    await response.arrayBuffer(),
  );
}

const season = notebook.races.at(-1)?.season;
const { leaderboard, progression } = seasonSummary(notebook.races, season);
await writeCard("og.png", {
  title: "Formula 1 benchmark",
  subtitle: `${season ? `${season} season · ` : ""}${leaderboard.length} models · ${progression.length} shared races`,
  perForecast: true,
  rows: leaderboard.map((model) => ({
    ...model,
    cost: model.usage.cost.average,
    seconds: model.usage.seconds.average,
  })),
});
for (const race of notebook.races) {
  const name = race.name.replace(/^\d{4}\s+/, "").split(/\s+[—–]\s+/);
  await writeCard(`og/${race.id}.png`, {
    title: name.at(-1),
    subtitle: `${race.season} ${name[0]} · Round ${race.round}`,
    perForecast: false,
    rows: race.forecasts
      .map((f) => ({
        ...f,
        score: Number.isFinite(f.metrics?.mean_rps) ? f.metrics.mean_rps : null,
        ...runUsage(f),
      }))
      .sort(
        (a, b) =>
          (a.score ?? Infinity) - (b.score ?? Infinity) ||
          a.name.localeCompare(b.name),
      ),
  });
}
