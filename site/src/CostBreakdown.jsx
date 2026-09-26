import React from "react";

const amount = (value) =>
  Number.isFinite(value)
    ? `$${value.toFixed(value > 0 && value < 0.01 ? 3 : 2)}`
    : "—";
const parts = [
  ["model_usd", "Model API"],
  ["search_usd", "Search"],
  ["extract_usd", "Extraction"],
];

export default function CostBreakdown({ costs }) {
  const phases = [
    ["forecast", "Forecasts"],
    ["review", "Reviews"],
    ["failed", "Failed / voided"],
  ]
    .map(([key, label]) => ({ ...costs?.[key], key, label }))
    .filter((c) => c.runs > 0);
  const rows = phases.filter((c) =>
    parts.some(([key]) => Number.isFinite(c[key])),
  );
  const columns = parts.filter(([key]) =>
    rows.some((c) => Number.isFinite(c[key])),
  );
  const missing = phases
    .filter((c) => !rows.includes(c))
    .reduce((sum, c) => sum + c.runs, 0);
  if (!rows.length) return null;
  return (
    <div className="table-scroll">
      <table className="cost-breakdown">
        <thead>
          <tr>
            <th scope="col">Activity</th>
            {columns.map(([key, label]) => (
              <th scope="col" key={key}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.key}>
              <th scope="row">
                {c.label} ({c.runs})
              </th>
              {columns.map(([key]) => (
                <td key={key}>
                  {key !== "model_usd" && c.estimated && Number.isFinite(c[key])
                    ? "≈"
                    : ""}
                  {amount(c[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {missing > 0 && (
        <p className="table-caption">
          {missing} {missing === 1 ? "attempt has" : "attempts have"} no saved
          charges.
        </p>
      )}
    </div>
  );
}
