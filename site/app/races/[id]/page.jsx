import { notFound } from "next/navigation";
import RacePage from "../../../src/RacePage";
import { seasonSummary } from "../../../src/season";
import notebook from "../../../public/data.json";

export function generateStaticParams() {
  return notebook.races.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const race = notebook.races.find((r) => r.id === id);
  if (!race) return { title: "Race not found" };
  const image = `/og/${race.id}.png`;
  const description =
    "Forecast accuracy, model spend, and runtime for this race.";
  return {
    title: race.name,
    openGraph: {
      title: race.name,
      description,
      type: "website",
      siteName: "F1 Bench",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${race.name}: forecast scores, cost, and time`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: race.name,
      description,
      images: [image],
    },
  };
}

export default async function Race({ params }) {
  const { id } = await params;
  const race = notebook.races.find((r) => r.id === id);
  if (!race) notFound();
  const { leaderboard, progression } = seasonSummary(
    notebook.races,
    race.season,
  );
  const raceList = [...notebook.races]
    .reverse()
    .map(({ id, name, round, season }) => ({ id, name, round, season }));
  return (
    <RacePage
      key={race.id}
      race={race}
      raceList={raceList}
      standings={leaderboard}
      sharedRaces={progression.length}
    />
  );
}
