import React from "react";
import { ImageResponse } from "@vercel/og";
import notebook from "../public/data.json";

function renderImage() {
  const race = notebook.races.at(-1);
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px",
        width: "100%",
        height: "100%",
        background: "#edf1f5",
        color: "#223047",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 26, letterSpacing: 3 }}>
        F1 BENCH / MODEL EVALUATION
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", color: "#2449dc", fontSize: 24 }}>
          {race
            ? `${race.season} · ROUND ${race.round} · ${race.state.toUpperCase()}`
            : "FORMULA 1 FORECASTING"}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 66,
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          {race?.name || "Formula 1 forecasting benchmark."}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#596a7c" }}>
        Season standings, race predictions, and research.
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
if (import.meta.main) {
  const response = renderImage();
  await Bun.write(
    new URL("../public/og.png", import.meta.url),
    await response.arrayBuffer(),
  );
}
