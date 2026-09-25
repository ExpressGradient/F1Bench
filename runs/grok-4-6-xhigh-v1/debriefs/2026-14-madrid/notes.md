# Forecast notes

## 2026 snapshot (through Rd 14 Madrid)

Drivers: ANT 292, RUS 211, HAM 191, NOR 186, LEC 167, VER 145, PIA 120.
Constructors: Mercedes 503, Ferrari 358, McLaren 306, Red Bull 230, Racing Bulls 77, Alpine 68.
Winners: ANT x8 (CHN, JPN, MIA, CAN, MON, BEL, ITA from P19, ESP), RUS x2, NOR x2, HAM (BCN), LEC (GBR).
Line-up: Hadjar (RB) still out wrist — Lawson in RB, Tsunoda in Racing Bulls (NED/ITA/ESP). Cadillac 0 pts. Aston Honda still a reliability/speed disaster. Next: Baku (Rd 15).

## Madrid (Rd 14) result vs forecast — what to keep vs discard

Result: ANT, VER, NOR, LEC, RUS, LAW, COL, PIA, LIN, HUL | OCO, GAS, BOR, TSU, ALB, BEA, ALO, BOT. NC: HAM (brakes, lap 6), STR (brakes after damage, lap 12), PER (water/PU, lap 31), SAI (collision damage, lap 43). 18 classified vs E≈18.6.

Keep: ANT 36.5% win / NOR 33.9% was the right coin-flip (market +125/+130). Win Brier 0.024, podium Brier 0.026. Midfield almost grid-locked (P9–P18 moved 0 to +2). Processional prior was correct. Stroll highest DNF (~32%) hit. Cadillac/Aston at the back hit. One-stop + hard-to-pass character hit.

Do not overfit: VSC stealing Norris’s win; HAM’s first DNF of the year; Piastri’s T1 wing; F3’s 19 red flags (F1 had one VSC, no SC, no red). Do not bump ANT’s base rate just because he won; do not treat pole as a curse.

## Reusable modeling lessons

### 1. Three interruption regimes, not two
Madrid model mixed (a) green Plackett–Luce and (b) multi-SC/red-flag chaos. The race was a third, more common, modern-F1 state: **a single VSC that is a pit-phase lottery without enabling on-track reordering**.

- Leader who has just passed pit entry cannot stop; P2/P3 can take a cheap stop and jump them. That decided ANT vs NOR. VER also boxed under VSC → P2.
- Cars that park in a runoff gap (Stroll) often produce a **VSC, not a full SC**. Support-series red-flag counts overstate F1 red-flag/SC probability on a new circuit.
- On a no-overtake track, one VSC is enough to decide the win and still leave the rest of the field processional. Chaos-regime mass that lets “best race car from P6” win needs a full SC/red, which did not occur (RUS stayed P5).

Action: add an explicit **single-neutralization pit-lottery** regime. On processional tracks, shave leader win probability toward P2 whenever pit loss is large. Do not let F2/F3 red-flag counts dominate F1 SC/red priors.

### 2. Starting compound × interruption timing is first-order
Early VSC helped cars that **wanted** to stop soon (medium/soft one-stop: ANT, VER, HUL, COL). It hurt hard-tyre long-stint cars (LEC, RUS, PIA, LAW, GAS, BOR) who needed a *late* SC/red.

- LEC led ~32 laps on hards waiting for a late SC/red; pitted lap 48 → P4 (would have been P4 on the other strategy too).
- RUS: hard start, VSC onto mediums, second stop to hard → still P5. Overtaking dead, strategy could not pass LEC.
- GAS/BOR hung out to the end; no late incident → out of points.

Action: do not give generic “climber” points mass from P12–P16 on a processional track unless an interruption is likely *and* timed for their compound. Split-strategy value is timing-dependent, not a free “chaos overlay”.

### 3. Overnight rebuilds and thermal street-circuit DNFs
HAM: FP3 wall at T22, rebuilt overnight, Q4, superb launch, then brake-pedal failure (first DNF of his season). Forecast used a generic ~11% front-runner retirement — same as NOR/VER — and paid for it in retirement/points Brier.

STR also brakes (after early damage) in heat. Bottas spent the race managing brake temps. PER water-pressure/PU. Track into the 50s °C, heavy braking, long straights, banking.

Action:
- After an FP crash/rebuild, bump **mechanical** DNF (brakes, cooling, hydraulics, floor), not only DNS. The car that starts is not a healthy car.
- On hot, heavy-braking street circuits, elevate **brake/cooling/PU thermal** DNF vs “wall hit” DNF. Driver “car killer” quotes overstated *full-course* chaos; they were closer to right on *component* stress.
- Do not apply a uniform ~10–12% DNF to every top-10 car. Rebuild, new PU, and thermal-street flags should differentiate.

Field DNF count was fine (4 vs ~3.4). The miss was **who** DNFed (a P4 Ferrari), not the total.

### 4. Pack-start damage is sticky when passing is dead
Processional Plackett–Luce perturbs order; it understates “broken wing/floor on lap 1 → finish several places down with almost no recovery”.

- PIA: P7, squeezed by RUS, broken endplate, only stop couldn’t fix it, P8. Biggest position log-loss. P(top 10) was fine; the **place distribution was too peaked** around P5–P7.
- TSU: Sainz T1 contact, damaged, P14.
- SAI: T1 lockup vs TSU, later hit ALO, retired with damage.
- STR: opening-lap damage then brakes.

Action: on no-overtake layouts, give P6–P12 a fatter left tail (damage → +3–6 places lost, or NC). Pit-lane starters (BEA) also have little climb without a full SC; P16 from PL is typical, not a points tail.

### 5. Grid still dominates the midfield on this circuit type
COL 9→7, LIN 10→9, HUL 11→10, OCO 13→11, GAS 14→12, BOR 12→13, TSU 15→14, ALB 16→15, ALO 17→17, BOT 19→18. HAM’s early DNF was the main +1 shuffle.

Keep a strong track-position model from ~P8 back. Alpine (Mercedes PU) and Racing Bulls are the real midfield; Audi/Haas next; Williams off the pace; Aston/Cadillac fighting not to be last. Q3 slots (COL, LIN) converting to points is the default if they finish.

GAS as “most likely climber from P14” was the main midfield over-credit. Without a late SC, P14 on a processional track stays ~P12–P14.

### 6. Quali gap of 0.01s: prefer the better race car / championship leader
ANT from P2 beat polesitter after a VSC, but also had genuine Mercedes race pace and FP lockout. NOR was fastest in the race until the VSC; both belong in the high-30s win range when the gap is 0.011s. Do not collapse them to 50/50 on pole alone, and do not treat the VSC outcome as evidence NOR was mis-ranked.

VER P3 is sticky on a processional track if he finishes (here P2 via VSC + HAM DNF). He still could not match ANT/NOR on pace — “best of the rest” remains the Red Bull base.

### 7. Friday compound reading vs Sunday
Pirelli: C2 hard was little-run on Friday and was the race tyre (stints >45 laps). Medium/soft grained but were usable. Teams that over-indexed Friday long runs, or assumed two-stop from graining, were wrong.

Action: on a new street circuit, treat Friday tyre conclusions as weak. High pit loss + no passing makes one-stop the default even if Friday said otherwise. Hard can be the race tyre without Friday evidence.

### 8. Constructor reliability priors (do not shrink yet)
- Aston–Honda: still DNF-prone (STR) and slow (ALO P17). High retirement, near-zero points until the package actually scores.
- Cadillac–Ferrari PU: PER water/PU DNF, BOT last classified, 0 points in 14 races. Keep high DNF, negligible points.
- Williams: no pace (ALB “best we could hope”: beat Astons + one Haas). Points only via chaos.
- Audi: HUL P10 via VSC pit-stop vs OCO. Midfield points are a pit-execution / compound-timing thing, not race-pace overtake.

## Circuit-type flags for later rounds

- **No-overtake street / short T1 run** (Madrid, Monaco, Hungary-like): processional + VSC pit lottery; pack-damage sticky; climber narratives are SC-timed only.
- **Long-straight street** (Baku, Singapore, Jeddah): do **not** copy Madrid’s zero-overtake prior. Baku historically has real passing on the main straight **and** a high genuine SC rate (walls, debris). Use higher SC/red mass than Madrid, and allow more on-track reordering than Plackett–Luce-from-grid.
- **Hot + heavy braking**: extra brake/cooling/PU DNF, especially rebuilt cars and weak-cooling teams.
- Next is Baku: upgrades mentioned for Williams; Aston weight-saving; triple-header starts. Lawson/Tsunoda/Hadjar status TBD. ANT lead now 81 pts.

## Calibration targets
Headline win/podium were good. Spend effort on (1) front-runner DNF heterogeneity, (2) VSC-vs-SC-vs-red mixture, (3) fatter incident tails for pack starters on processional tracks, (4) compound–timing interaction. Do not retune midfield means that were already within ~1 place.
