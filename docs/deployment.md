# Deploying the website

The production site is [f1bench.vercel.app](https://f1bench.vercel.app). It is a static Next.js export; it does not need model API keys, Docker, or an application server.

## Build locally

From a full checkout with Python 3.11+ and Bun 1.3.14 installed:

```bash
cd site
bun install --frozen-lockfile
bun test
bun run build
```

The build exports public benchmark data from the saved races and generates the season share card at `og.png` and race cards under `og/`. Under `records/`, it copies submitted predictions and reports plus the original system/user instructions, checked against saved prompt hashes. It does not publish research trajectories or tool output. Only `site/out/` is served; local environment files are not website assets.

`site/src/grids.json` records the official starting orders and source URLs for the retrospective grid baseline. New races without a verified grid show no baseline; the season baseline is available only when it covers the same races as every compared model. The rule always predicts the listed starting position with certainty and uses the existing RPS normalization.

## Vercel production

Install the Vercel CLI and sign in. From `site/`, link to the existing `f1bench` project in the owning Vercel account:

```bash
vercel link --project f1bench
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

Building locally keeps the parent directories available to the Python exporter and uploads the built website. The project uses the Next.js preset and `bun run build`. Leave Vercel's Output Directory override unset so its Next.js adapter can read the build metadata and package the static export. `site/vercel.json` records these settings; remove any old Vite overrides in the Vercel project settings. Local project links and downloaded environment files live under `.vercel/` and must remain ignored.

For a preview, use the matching preview environment and omit `--prod` from both build and deploy:

```bash
vercel pull --yes --environment=preview
vercel build
vercel deploy --prebuilt
```

New race results require a new build and deployment. Updating saved files alone does not update the live website.

## Git integration

If enabling Vercel builds from GitHub, use `site` as the Root Directory and enable **Include source files outside of the Root Directory in the Build Step**. The exporter needs `src/`, `scripts/`, `cohorts/`, `events/`, and `runs/`. The build environment must provide Python 3.11+; `F1BENCH_PYTHON` can select it. Use Node.js 20.9+, install with `bun install --frozen-lockfile`, build with `bun run build`, and leave the Output Directory override unset.

GitHub checks validate the code and build. Production deployment remains a separate action unless the Vercel Git integration is configured.
