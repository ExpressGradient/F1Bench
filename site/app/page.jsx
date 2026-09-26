import SeasonBench from "../src/SeasonBench";
import notebook from "../public/data.json";

// Research and full driver distributions belong on the individual race pages.
export default function Home() {
  const races = notebook.races.map(
    ({ id, name, season, round, state, forecasts }) => ({
      id,
      name,
      season,
      round,
      state,
      forecasts: forecasts.map(
        ({ entrant, name, model, metrics, run_details, cost_usd }) => ({
          entrant,
          name,
          model,
          metrics,
          run_details,
          cost_usd,
        }),
      ),
    }),
  );
  return <SeasonBench races={races} />;
}
