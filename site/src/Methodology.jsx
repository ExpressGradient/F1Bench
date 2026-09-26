import React from "react";

export default function Methodology() {
  return (
    <section className="methodology" id="methodology">
      <h2>How it works</h2>
      <p className="methodology-intro">
        Predict before the race. Score after it. Review mistakes for the next
        one.
      </p>
      <p className="protocol-summary">
        Same race task and limits for every model. Web search, code execution,
        and each model’s own notes from earlier races. Up to{" "}
        <strong>$30 in model calls</strong> and <strong>120 minutes</strong> per
        run. This tests a model using tools and memory, not an unaided answer.
      </p>
      <details>
        <summary>What are the models predicting?</summary>
        <div>
          <p>
            Each model forecasts the entire Formula 1 field using public
            information available during its run. It decides how to research,
            reason, write code, and simulate. The target is the final race
            classification, including non-classification, non-starts,
            disqualifications, and retirement risk.
          </p>
          <p>
            The benchmark evaluates the submitted probabilities. The written
            order, explanation, and research findings provide context; they do
            not earn extra points. Research quality and causal claims are
            examined in the post-race review, not assigned a separate numerical
            score.
          </p>
        </div>
      </details>
      <details>
        <summary>Model setup, tools & budgets</summary>
        <div>
          <p>
            The current cohort contains GPT-5.6 Sol, Muse Spark 1.3, and Grok
            4.6. Each entrant keeps a pinned model version and a restricted
            provider policy. Provider fallback cannot switch the model.
            Reasoning uses the highest setting supported when the entrant was
            created.
          </p>
          <div className="method-facts">
            <span>
              <strong>120 min</strong>maximum run time
            </span>
            <span>
              <strong>$30</strong>model-spend limit per run
            </span>
            <span>
              <strong>4 CPUs</strong>per isolated container
            </span>
          </div>
          <p>
            Agents have web search, page extraction, a shell, and a disposable
            workspace. They may build their own models, but no simulation method
            is prescribed. The budget is a ceiling, not a target. Models run
            independently; they do not see competing forecasts.
          </p>
          <p>
            The same limits apply to each post-race review. Forecast cost
            includes model API calls, search, and extraction. Total spend also
            includes reviews and failed or voided attempts across all season
            races. Forecast averages use the same shared races as the score.
            Where research fees are unavailable, comparisons use model API costs
            for every entrant. Recorded spend includes only saved charges and is
            not a complete bill. New research costs are estimates from recorded
            tool requests at published Parallel rates, before credits or
            discounts. Historical research fees are unavailable. Hosting is
            excluded.
          </p>
        </div>
      </details>
      <details>
        <summary>Can models see the results? How do they learn?</summary>
        <div>
          <p>
            A forecast starts with the race entry list, the model’s own previous
            forecasts and research, results from earlier races, scores, review
            snapshots, and its current notes. The normal workflow runs after
            qualifying. Agents independently verify current evidence, so
            research sources and completion times can differ.
          </p>
          <p>
            New runs must start and finish before the configured race start. A
            race with a saved result cannot be forecast again through the live
            workflow. Once completed, a prediction stays frozen.
          </p>
          <p>
            After the official result is supplied, a separate review compares
            the prediction with what happened and revisits its assumptions. The
            model edits its own notes for the next race. The workflow checks
            that earlier reviews are complete. This is learning through context
            and notes, not weight training; scratch code does not carry forward.
          </p>
          <p>
            Archived runs retain their original outputs. Where an older run has
            no explicit finishing-order report, the race table clearly labels
            its derived average-rank ordering.
          </p>
        </div>
      </details>
      <details>
        <summary>What does the error score mean?</summary>
        <div>
          <p>
            Ranked Probability Score (RPS) measures how far the predicted
            chances were from what happened. Lower is better; zero is perfect.
            For each driver, the scorer compares the probability of finishing at
            or above every position with the official result. Errors farther
            from the outcome affect more thresholds. This rewards accurate
            distributions and penalizes misplaced confidence.
          </p>
          <p className="score-formula">
            RPS = (1 / N²) × Σ drivers Σ positions (F(p) − O(p))²
          </p>
          <p>
            <strong>N</strong> is the field size. <strong>F(p)</strong> is the
            forecast probability of finishing P1 through Pp;{" "}
            <strong>O(p)</strong> is 1 if the driver actually finished at or
            above that position, otherwise 0. The reported race score averages
            across all drivers and all N position thresholds. Lower is better; a
            perfect distribution scores zero.
          </p>
          <p>
            NC, DNS and DSQ sit beyond the last numbered position for RPS, so it
            does not distinguish those three outcomes. The log-loss metric
            evaluates their separate probabilities. A late retirement can still
            have a numbered classification; retirement is scored separately.
          </p>
        </div>
      </details>
      <details>
        <summary>Other scores & displayed rankings</summary>
        <div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Measure</th>
                  <th>What it measures</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Log loss</td>
                  <td>
                    Probability assigned to the driver’s exact result. Zero
                    probability is floored at 10⁻¹⁵ for calculation.
                  </td>
                </tr>
                <tr>
                  <td>Brier scores</td>
                  <td>
                    Squared probability error for winning, podium, points, and
                    retirement.
                  </td>
                </tr>
                <tr>
                  <td>Expected-rank error</td>
                  <td>
                    Mean absolute error between each driver’s average forecast
                    rank and their actual rank.
                  </td>
                </tr>
                <tr>
                  <td>Average rank</td>
                  <td>
                    The probability-weighted rank across all outcomes. NC, DNS
                    and DSQ count as N + 1. It is not the most likely individual
                    finishing position.
                  </td>
                </tr>
                <tr>
                  <td>Podium chance</td>
                  <td>
                    Probability of P1, P2, or P3. It says nothing about the size
                    of the downside outside the podium.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            All numerical error scores are lower-is-better. Sorting the driver
            table by podium chance answers a different question from sorting by
            average rank. Neither changes the original probabilities.
          </p>
        </div>
      </details>
      <details>
        <summary>Season standings & progression</summary>
        <div>
          <p>
            Each shared, completed race contributes equally to the season score:
            the arithmetic mean of its race RPS values. Only races with valid
            scores for every model in the comparison enter the aggregate. A
            missing forecast never counts as zero.
          </p>
          <p>
            Coverage shows a model’s scored forecasts out of races with at least
            one score. Partially scored races remain available in the race
            details, but are excluded from the shared-race average until all
            models have scores.
          </p>
          <p>
            The cumulative chart shows the average through each included round.
            The per-race chart shows the individual race score. Changes reflect
            both forecasting performance and differences in circuits and race
            outcomes; a trend alone does not isolate the effect of memory or
            learning.
          </p>
        </div>
      </details>
      <details>
        <summary>Results, failed runs & reproducibility</summary>
        <div>
          <p>
            Official classifications are supplied manually using the final FIA
            result. The scorer validates every driver and the classification
            structure. A changed result after a completed review is flagged
            before the next forecast.
          </p>
          <p>
            Completed attempts are reused, never replaced. Recorded failed
            attempts can be retried explicitly before the race deadline; the
            failed files and traces are archived. Each retry has a fresh budget.
            Running or incomplete attempts are not automatically restarted.
          </p>
          <p>
            Original predictions, reports, explanations, run metadata, full
            trajectories, and notes snapshots are retained locally. This site is
            generated from those saved files. Schema validation checks
            probability consistency and required report fields; it does not
            independently prove that a cited source supports a claim.
          </p>
        </div>
      </details>
    </section>
  );
}
