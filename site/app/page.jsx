import SeasonBench from "../src/SeasonBench";
import notebook from "../public/data.json";
import { gridBaseline } from "../src/evaluation";

// Research and full driver distributions belong on the individual race pages.
export default function Home() {
  const races = notebook.races.map(
    ({ id, name, season, round, state, drivers, result, forecasts }) => ({
      id,
      name,
      season,
      round,
      state,
      baseline: gridBaseline({ id, drivers, result }),
      forecasts: forecasts.map(
        ({ entrant, name, model, metrics, run_details, cost_usd, costs }) => ({
          entrant,
          name,
          model,
          metrics,
          run_details,
          cost_usd,
          costs,
        }),
      ),
    }),
  );
  return <SeasonBench races={races} />;
}
