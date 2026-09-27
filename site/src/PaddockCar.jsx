"use client";

import { useState } from "react";

// Drawn directly in SVG. Keep the shapes bold enough to read at 120px wide.
export default function PaddockCar() {
  const [paused, setPaused] = useState(false);
  return (
    <button
      className="paddock-car"
      type="button"
      aria-label="Pause Max Verstappen No. 1 Red Bull car animation"
      aria-pressed={paused}
      title={paused ? "Resume animation" : "Pause animation"}
      onClick={() => setPaused(!paused)}
    >
    <svg
      viewBox="0 0 280 144"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="143" cy="125" rx="111" ry="4" fill="#26292f" opacity=".06" />
      {/* The far wheels peek out behind the coachwork. */}
      <path d="M81 95v10M222 92v13" stroke="#42454b" strokeWidth="24" strokeLinecap="round" />
      <g className="paddock-car-body">
        {/* Rear wing, supports, and exposed suspension. */}
        <path d="m229 91 8-36h7l-3 40" fill="#303747" />
        <path d="m230 53 31 2-1 8-33-2Z" fill="#15243f" />
        <path d="m251 52 11 1 1 17-11-1Z" fill="#e53542" />
        <path d="m230 53 21 1" stroke="#f8c537" strokeWidth="2" />
        <path d="m62 105 36-12m94 5 39 10" stroke="#484b51" strokeWidth="4" />
        <path d="m193 91 38 3" stroke="#85868a" strokeWidth="5" strokeLinecap="round" />
        {/* Roll hoop and the tiny driver. */}
        <path d="M180 74V50c0-10 13-10 13 0v27" stroke="#494c52" strokeWidth="4" />
        <g className="paddock-driver">
          <path d="m155 70 4-15h20l7 21" fill="#15243f" />
          <path d="M152 55c-1-13 5-22 17-22 12 0 19 9 18 22l-5 10-27-1Z" fill="#f0ebdf" stroke="#34383e" strokeWidth="1.5" />
          <path d="M152 49h25l-3 10h-21Z" fill="#303740" />
          <path d="m155 51 12 1" stroke="#929da5" strokeWidth="2" strokeLinecap="round" />
          <path d="M175 35c5 5 7 11 6 16" stroke="#e53542" strokeWidth="3" />
          <path d="m155 61 21 1" stroke="#e53542" strokeWidth="3" />
          <path d="m157 64 15 1" stroke="#15243f" strokeWidth="2" />
          <circle cx="179" cy="56" r="2" fill="#777a7e" />
        </g>
        {/* No. 1 Red Bull livery: navy, a yellow nose, and simple red lettering. */}
        <path d="M27 100c10-7 41-12 67-17l39-15 14 1c4 11 23 14 36 5l7-12 17 4c12 4 20 15 27 34l-6 10H40c-12 0-20-4-13-10Z" fill="#15243f" />
        <path d="m29 99 28-7 8 12-29 4c-11 0-14-4-7-9Z" fill="#f8c537" />
        <path d="m65 91 33-7 35-13 9 1" stroke="#e53542" strokeWidth="3" />
        <path d="M29 106h199l-5 8H45Z" fill="#0d172b" />
        <path d="M93 108h101" stroke="#e53542" strokeWidth="2" />
        <path d="m27 108-10 1-1 7h40l5-8" fill="#15243f" />
        <path d="M18 115h38" stroke="#e53542" strokeWidth="2" />
        <path d="m201 75 9 4m-6 2 9 4m-6 2 9 4" stroke="#35445e" strokeWidth="2" strokeLinecap="round" />
        <text
          x="134"
          y="101"
          fill="#ee414b"
          fontFamily="Arial, sans-serif"
          fontSize="14"
          fontWeight="700"
          textLength="58"
          lengthAdjust="spacingAndGlyphs"
        >
          Red Bull
        </text>
        {/* Number and halo are paths, independent of installed fonts. */}
        <path d="m113 93 5-4v14m-4 0h8" stroke="#f3ede0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m146 76 7-13h33c6 0 8 6 8 12M157 63l-2 14" stroke="#26364f" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Stationary wheels keep the gentle engine idle grounded. */}
      <g stroke="#26292f">
        <circle cx="73" cy="105" r="20" fill="#303339" strokeWidth="2" />
        <circle cx="216" cy="102" r="23" fill="#303339" strokeWidth="2" />
      </g>
      <g stroke="#d6b552" strokeWidth="1.2">
        <circle cx="73" cy="105" r="15.5" />
        <circle cx="216" cy="102" r="18.5" />
      </g>
      <g fill="#b9b8b0" stroke="#20242a" strokeWidth="3">
        <circle cx="73" cy="105" r="9" />
        <circle cx="216" cy="102" r="10" />
      </g>
      <g fill="#44484e">
        <circle cx="73" cy="105" r="3" />
        <circle cx="216" cy="102" r="3.5" />
      </g>
      <path d="m66 100 3-2m139-2 4-2" stroke="#eee9dd" strokeWidth="2" strokeLinecap="round" />
    </svg>
    </button>
  );
}
