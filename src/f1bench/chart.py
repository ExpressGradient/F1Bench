from __future__ import annotations

import math
from pathlib import Path
from xml.sax.saxutils import escape

from .core import BenchError, read_json


def _model_name(model: str) -> str:
    words = model.rsplit("/", 1)[-1].split("-")
    label = " ".join("GPT" if word.lower() == "gpt" else word.title() for word in words)
    return label.replace("GPT ", "GPT-", 1)


def _short_event_name(name: str) -> str:
    return name.rsplit("—", 1)[-1].strip().upper()


def _event_code(event: dict) -> str:
    slug = event["id"].split("-", 2)[-1]
    return slug[:3].upper()


def _brand_color(model: str) -> str:
    provider = model.partition("/")[0]
    return {
        "openai": "#10a37f",
        "meta": "#0668e1",
        "x-ai": "#000000",
    }.get(provider, "#8839ef")


def _nice_step(value: float) -> float:
    magnitude = 10 ** math.floor(math.log10(value))
    fraction = value / magnitude
    nice = 1 if fraction <= 1 else 2 if fraction <= 2 else 5 if fraction <= 5 else 10
    return nice * magnitude


def render_season_chart(
    events_dir: Path = Path("events"),
    output: Path = Path("charts/season.svg"),
    season: int | None = None,
) -> Path:
    events: list[tuple[dict, dict]] = []
    for scores_path in events_dir.glob("*/scores.json"):
        event = read_json(scores_path.parent / "event.json")
        scores = read_json(scores_path)
        if isinstance(event.get("season"), int):
            events.append((event, scores))

    if not events:
        raise BenchError(f"No scored events found in {events_dir}")
    if season is None:
        season = max(event["season"] for event, _ in events)
    events = [(event, scores) for event, scores in events if event["season"] == season]
    if not events:
        raise BenchError(f"No scored events found for {season}")
    events.sort(key=lambda item: (item[0].get("round", 0), item[0]["id"]))

    entrants: dict[str, dict] = {}
    expected: set[str] | None = None
    for event, scores in events:
        rows = scores.get("entrants")
        if not isinstance(rows, list) or not rows:
            raise BenchError(f"Invalid scores for {event['id']}")
        present = {row.get("entrant") for row in rows}
        if not all(isinstance(entrant, str) for entrant in present):
            raise BenchError(f"Invalid entrant in scores for {event['id']}")
        if expected is None:
            expected = present
        elif present != expected:
            raise BenchError(f"Entrant set changed at {event['id']}")
        for row in rows:
            mean_rps = row.get("metrics", {}).get("mean_rps")
            model = row.get("model")
            if not isinstance(mean_rps, (int, float)) or not isinstance(model, str):
                raise BenchError(f"Invalid mean RPS in scores for {event['id']}")
            entrant = row["entrant"]
            aggregate = entrants.setdefault(
                entrant,
                {"model": model, "scores": []},
            )
            if aggregate["model"] != model:
                raise BenchError(f"Model changed for entrant {entrant}")
            aggregate["scores"].append(float(mean_rps))

    for data in entrants.values():
        total = 0.0
        data["cumulative"] = []
        for count, score in enumerate(data["scores"], start=1):
            total += score
            data["cumulative"].append(total / count)

    standings = sorted(entrants.items(), key=lambda item: item[1]["cumulative"][-1])
    race_count = len(events)
    race_word = "RACE" if race_count == 1 else "RACES"
    latest = _short_event_name(events[-1][0]["name"])
    description = ", ".join(
        f"{_model_name(data['model'])} {data['cumulative'][-1]:.4f}"
        for _, data in standings
    )

    all_values = [value for data in entrants.values() for value in data["cumulative"]]
    data_min, data_max = min(all_values), max(all_values)
    span = max(data_max - data_min, 0.006)
    step = _nice_step(span / 3)
    domain_min = math.floor((data_min - step * 0.25) / step) * step
    domain_max = math.ceil((data_max + step * 0.25) / step) * step

    plot_x0, plot_x1 = 222.0, 1448.0
    plot_y0, plot_y1 = 440.0, 742.0

    def x_position(index: int) -> float:
        if race_count == 1:
            return (plot_x0 + plot_x1) / 2
        return plot_x0 + index * (plot_x1 - plot_x0) / (race_count - 1)

    def y_position(value: float) -> float:
        return plot_y0 + (value - domain_min) * (plot_y1 - plot_y0) / (domain_max - domain_min)

    ticks: list[float] = []
    tick = domain_min
    while tick <= domain_max + step / 10:
        ticks.append(tick)
        tick += step

    grid_svg = "\n".join(
        f'''    <line x1="{plot_x0:.0f}" y1="{y_position(tick):.1f}" x2="{plot_x1:.0f}" y2="{y_position(tick):.1f}" stroke="#ccd0da" stroke-width="1"/>
    <text x="198" y="{y_position(tick) + 5:.1f}" text-anchor="end" fill="#8c8fa1" font-size="15" font-weight="400" font-variant-numeric="tabular-nums">{tick:.3f}</text>'''
        for tick in ticks
    )
    x_axis_svg = "\n".join(
        f'''    <line x1="{x_position(index):.1f}" y1="{plot_y1:.0f}" x2="{x_position(index):.1f}" y2="{plot_y1 + 8:.0f}" stroke="#9ca0b0" stroke-width="1"/>
    <text x="{x_position(index):.1f}" y="{plot_y1 + 36:.0f}" text-anchor="middle" fill="#6c6f85" font-size="15" font-weight="500" letter-spacing="1">{escape(_event_code(event))}</text>'''
        for index, (event, _) in enumerate(events)
    )

    colors = {entrant: _brand_color(data["model"]) for entrant, data in entrants.items()}
    legend_svg = "\n".join(
        f'''    <g aria-label="{escape(_model_name(data['model']))}">
      <line x1="{222 + index * 350}" y1="392" x2="{252 + index * 350}" y2="392" stroke="{colors[entrant]}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="{237 + index * 350}" cy="392" r="6" fill="{colors[entrant]}" stroke="#eff1f5" stroke-width="3"/>
      <text x="{270 + index * 350}" y="399" fill="#4c4f69" font-size="18" font-weight="500">{escape(_model_name(data['model']))}</text>
    </g>'''
        for index, (entrant, data) in enumerate(standings)
    )

    line_svg: list[str] = []
    for entrant, data in entrants.items():
        color = colors[entrant]
        points = [
            (x_position(index), y_position(value))
            for index, value in enumerate(data["cumulative"])
        ]
        name = escape(_model_name(data["model"]))
        if len(points) > 1:
            coordinates = " ".join(f"{x:.1f},{y:.1f}" for x, y in points)
            line_svg.append(
                f'    <polyline points="{coordinates}" fill="none" stroke="{color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
            )
        for index, ((x, y), value) in enumerate(zip(points, data["cumulative"], strict=True)):
            event_name = escape(_short_event_name(events[index][0]["name"]))
            line_svg.append(
                f'''    <circle cx="{x:.1f}" cy="{y:.1f}" r="9" fill="{color}" stroke="#eff1f5" stroke-width="4">
      <title>{name} · {event_name} · cumulative mean RPS {value:.4f}</title>
    </circle>'''
            )
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-labelledby="title desc">
  <title id="title">F1 Bench — {season} season leaderboard</title>
  <desc id="desc">Cumulative mean Ranked Probability Score after {race_count} {race_word.lower()}. Lower is better. {escape(description)}.</desc>

  <rect width="1600" height="900" fill="#eff1f5"/>
  <rect x="96" y="88" width="8" height="724" rx="4" fill="#8839ef"/>

  <g font-family="Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
    <text x="152" y="220" fill="#4c4f69" font-size="88" font-weight="500" letter-spacing="-2">F1 BENCH</text>
    <text x="156" y="270" fill="#8839ef" font-size="22" font-weight="500" letter-spacing="3">{season} SEASON</text>
    <text x="1448" y="202" text-anchor="end" fill="#4c4f69" font-size="22" font-weight="500" letter-spacing="1.2">{race_count} {race_word} SCORED</text>
    <text x="1448" y="240" text-anchor="end" fill="#6c6f85" font-size="18" font-weight="400" letter-spacing="1.2">LATEST · {escape(latest)}</text>

    <text x="152" y="350" fill="#4c4f69" font-size="19" font-weight="500" letter-spacing="1.6">CUMULATIVE MEAN RPS</text>
    <text x="1448" y="350" text-anchor="end" fill="#6c6f85" font-size="17" font-weight="400" letter-spacing="1.2">LOWER IS BETTER ↑</text>
{legend_svg}
    <line x1="152" y1="416" x2="1448" y2="416" stroke="#ccd0da" stroke-width="2"/>

{grid_svg}
    <line x1="{plot_x0:.0f}" y1="{plot_y1:.0f}" x2="{plot_x1:.0f}" y2="{plot_y1:.0f}" stroke="#9ca0b0" stroke-width="1"/>
{x_axis_svg}

{chr(10).join(line_svg)}

    <line x1="152" y1="812" x2="1448" y2="812" stroke="#ccd0da" stroke-width="2"/>
    <text x="152" y="856" fill="#6c6f85" font-size="16" font-weight="400" letter-spacing="1.2">SEASON SCORE AFTER EACH RACE · MACRO-AVERAGED BY RACE</text>
  </g>
</svg>
'''
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(svg)
    temporary.replace(output)
    return output
