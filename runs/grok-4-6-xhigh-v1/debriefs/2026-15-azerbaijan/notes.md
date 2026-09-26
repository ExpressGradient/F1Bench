# Forecast notes

## 2026 snapshot (after Rd 15 Baku)
ANT 302, RUS 236 (−66), HAM 199, NOR 186, LEC 179, VER 163, PIA 120, HAD 86, LAW 59, GAS 41, LIN 37, COL 27, BEA 20.
Constructors (approx): MER 538, FER 378, MCL 306, RBR 249, Racing Bulls ~83, ALP 68, Haas 27, Audi ~16, Williams 12, Aston 3, Cadillac 0.
Winners: ANT×8, RUS×3 (AUS/AUT/AZE), NOR×2, HAM (BCN), LEC (GBR). VER still winless in 2026.
Cadillac 0 pts in 15. Aston–Honda still a speed/reliability disaster.
Next: Sepang then Singapore. COL grid drop at Sepang (unserved 10s from the T1 wipeout).

## Baku vs forecast — keep vs discard
Result: RUS, VER, HAD, LEC, ANT, HAM, LIN, OCO, BEA, SAI | HUL, LAW, BOR, PIA, PER, BOT(class. DNF) | NC COL, GAS, NOR, ALB, ALO, STR.
Two SCs (Albon wall ~L31; Colapinto lockup into Gasly into Norris on restart). Piastri double-lockup/spin on 2nd restart, P3→~P15. RUS beat VER by 0.196s.
Score vs Madrid: win Brier 0.018 (better) but podium 0.106, points 0.220, ret Brier 0.225, rank MAE 5.58, RPS 0.164 (all worse).

**A correct winner does not prove the explanation.** RUS 42.8% hit; the claim that McLaren were the live win threat (PIA 18%/59% podium, NOR 12%/49%) was false. Red Bull were.

### report.json checks
1. “MCL long-run +0.05, so PIA/NOR hunt RUS if within DRS by L10; if RUS walks 0.4s+/lap the quali gap was real.” **FAIL.** RUS +1.2s at T1, +5s, ~10s at halfway, +12s by the pit window. Norris: no straight-line speed, “impossible”. Quali 0.837s (year’s biggest MER margin) was the race gap; compiled long-runs were not.
2. ANT rebuild DNF ~23%. **Did not fire** (P5). Floor damage was race contact with Bearman, not the overnight rebuild. 77% finish was the base; “points if he lasts, not another Monza” was the right call (16th→5th via two SCs, never a win threat). Do not add more mechanical after a miss.
3. VER P8 bimodal; check = passes Gasly before the pit window ⇒ PU fixed. **PASS.** He passed Gasly *and* Hamilton at the start, then Norris/Leclerc/Piastri. Healthy mode was P2 and 0.2s from the win. Averaging 68/32 into rank 7 / 18% podium **understated** the healthy branch. RBR race pace >> compiled +0.30. VER: even from P2, RUS would have been hard to pass.
4. Baku ≠ Madrid (real passing + high genuine SC; Alpine Q3 = points default). **PASS on mechanism.** Two SCs, many T1 passes (RBR, ANT, LIN). Alpine *were* P7/P10 before Colapinto deleted both. Sainz “modest recovery unless SC-timed” → P10. Do not copy Madrid’s zero-overtake prior onto long-straight streets.

## Reusable lessons

### 1. Don’t shrink a season-outlier quali gap to Friday long-runs without a mechanism
Need a tow/yellow/fuel/engine-mode story before treating +0.8s as a one-lap fluke. Driver “race pace looks close” quotes are cheap vs FP lockout + a hammer quali. Triangulate with speed traps and weekend driver honesty (“we knew we weren’t quick enough”). Thursday 65 km/h gusts vs calmer race may have biased long-runs — treat windy-day long-runs as weak.

### 2. Circuit demand × this-weekend car, not championship form
Baku rewards straight-line/low-drag. MCL were slow on the straight; RBR were the second race car (double podium, first since 2024). “McLaren won HUN/NED so they are the threat” was the wrong prior. **Sepang may reverse this** — re-read the weekend; do not copy the Baku order. Singapore is the other way (processional street).

### 3. Known PU issues: barbell, don’t mush
Sick vs healthy should show up as two modes (front fight vs Alpine fight), not a blended P6–P7. FP3 lead + Q2 0.244s off RUS already said the car is a front-runner when the PU works. Overnight RBR fixes for VER are not a coin-flip.

### 4. Interruption mix + SC-restart T1 as its own hazard
- Madrid-type: single VSC pit lottery, no on-track reorder.
- Baku-type: full SCs, **every restart** is a T1 concertina (COL/GAS/NOR, LIN/LAW, PIA spin). Fat left tail for the pack *and* for podium cars on wally restarts — not only lap-1 T1.
Green ~24 / single ~44 / multi ~32: this race was the multi bucket. Do not jack multi to ~50% after one typical chaotic Baku.

### 5. Rebuild DNF bump is real, but not Baku’s main killer
Keep a mechanical bump after overnight crash rebuilds (Madrid HAM brakes). Baku’s distinctive DNFs were walls (ALB, BOT), restart lockups (COL), and Honda (STR water, ALO power). Don’t pile more ANT mechanical because this rebuild lasted.

### 6. Injury return with a genuine Q3 lap
HAD P4→P3 “first proper podium on pure pace.” Rust/launch prior was too fat once quali already showed he could put a lap together at a wall circuit. Wrist numbness ≠ automatic place-loss.

### 7. Midfield: track position until a restart wipeout, then the next train
Alpine’s car was “best of the year” and converting Q3→points until COL correlated both DNFs. Haas 8–9, LIN 7, SAI 10 inherited the hole. Do not crown Haas/LIN or demote Alpine’s *car*. Intra-team crash when both cars sit in the T1 train is correlated (ALP, also Racing Bulls).

### 8. Constructor priors (don’t shrink the disasters)
Aston–Honda: double DNF again; no pace. Cadillac: 0 pts, BOT wall, PER P15. Audi upgrade didn’t fix the straight. Williams points still SC-dependent. Haas double points = first since Monaco, not a new base rate. RBR: raise the *healthy-PU* ceiling — genuine win threat, VER still due.

## Randomness — do not overfit
COL restart lockup; PIA unexplained both-fronts lockup (“crown in the road”); ALB wind-gust wall; BOT harvest-glitch wall; last-lap RUS boost lag; LIN/LAW clip; ANT–Bearman floor ding.
Classified 16 vs E≈18.2: extra attrition was the restart cluster, not a new base DNF rate. Who DNFed (pack crash) ≠ who we flagged (rebuild/rookie/Cadillac).

## Calibration spend
(1) quali-margin vs long-run reconciliation, (2) circuit-demand × team weakness, (3) barbell PU, (4) SC-restart tails on street circuits.
Do not retune RUS ~40% from pole in the best car, ANT’s championship base, or Alpine’s mean given they were in position.

## Circuit-type flags
- Processional / short T1 (Madrid, Monaco, Hungary-like, **Singapore next-but-one**): VSC pit lottery; sticky pack damage; climbers only if interruption timing matches compound.
- Long-straight street (Baku, Jeddah): real passing + high SC + restart-T1 lockups; quali/traps > Friday long-runs.
- Power + flow (**Sepang next**): re-evaluate MCL/RBR/FER from weekend evidence.

## Unresolved
True RBR vs MER equal-tyre gap (VER doubted he could pass RUS from P2). How much Thursday wind biased long-runs. Overnight PU-fix base rate for VER. Whether Sepang’s straight rewards RBR the same way Baku did.
