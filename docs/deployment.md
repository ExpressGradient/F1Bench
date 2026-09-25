# Deploying the website

The production site is [f1bench.vercel.app](https://f1bench.vercel.app). It is a static Vite build; it does not need model API keys, Docker, or an application server.

## Build locally

From a full checkout with Python 3.11+ and Bun 1.3.14 installed:

```bash
cd site
bun install --frozen-lockfile
bun test
bun run build
```

The build exports public benchmark data from the saved races and generates `og.png`. Only `site/dist/` is served; raw trajectories and local environment files are not website assets.

## Vercel production

Install the Vercel CLI and sign in. From `site/`, link to the existing `f1bench` project in the owning Vercel account:

```bash
vercel link --project f1bench
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

Building locally keeps the parent directories available to the Python exporter and uploads the built website. The project uses the Vite preset, `bun run build`, and the `dist` output directory. Local project links and downloaded environment files live under `.vercel/` and must remain ignored.

For a preview, use the matching preview environment and omit `--prod` from both build and deploy:

```bash
vercel pull --yes --environment=preview
vercel build
vercel deploy --prebuilt
```

New race results require a new build and deployment. Updating saved files alone does not update the live website.

## Git integration

If enabling Vercel builds from GitHub, use `site` as the Root Directory and enable **Include source files outside of the Root Directory in the Build Step**. The exporter needs `src/`, `scripts/`, `cohorts/`, `events/`, and `runs/`. The build environment must provide Python 3.11+; `F1BENCH_PYTHON` can select it. Install with `bun install --frozen-lockfile`, build with `bun run build`, and publish `dist`.

GitHub checks validate the code and build. Production deployment remains a separate action unless the Vercel Git integration is configured.
