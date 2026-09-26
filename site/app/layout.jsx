import localFont from "next/font/local";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "../src/styles.css";

const sans = localFont({
  src: "./fonts/instrument-sans-latin.woff2",
  variable: "--font-sans",
  weight: "400 700",
  display: "swap",
});
const mono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-mono",
  weight: "400 600",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://f1bench.vercel.app"),
  title: {
    default: "F1 Bench — Formula 1 forecasting benchmark",
    template: "%s · F1 Bench",
  },
  description:
    "How well can AI predict Formula 1? Compare models’ pre-race predictions with real results, plus the cost and time of each forecast.",
  openGraph: {
    type: "website",
    siteName: "F1 Bench",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "F1 Bench season standings: accuracy, cost, and time",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <a className="skip" href="#main">
          Skip to results
        </a>
        <header className="topbar">
          <div className="shell navigation">
            <Link className="brand" href="/" aria-label="F1 Bench home">
              <span className="brand-mark" aria-hidden="true" />
              F1 BENCH
            </Link>
            <nav aria-label="Primary">
              <Link href="/">Benchmark</Link>
              <Link href="/#races">Races</Link>
              <Link href="/#methodology">How it works</Link>
            </nav>
          </div>
        </header>
        <main id="main" className="shell">
          {children}
        </main>
        <footer className="shell footer">
          <Link className="brand" href="/">
            F1 BENCH
          </Link>
          <p>AI predictions, checked against real races.</p>
          <a href="https://saipraneeth.in" target="_blank" rel="noreferrer">
            By Sai Praneeth ↗
          </a>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
