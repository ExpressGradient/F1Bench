# Forecast notes

## 2026 season to Round 14 Madring (13 Sept 2026)
- Regs: new 2026 PU (ADUO), Overtake Mode replaces DRS, Straight Mode zones. Mercedes benchmark (468 pts constructors). Honda struggling (Aston slowest, power-limited). Ferrari ADUO2 turbo upgrade (Monza), Cadillac new team slow + overheating.
- Standings pre-Madring: ANT 267 (7W), RUS 201 (2W), HAM 191 (1W), NOR 171 (2W), LEC 155 (1W), VER 109, PIA 92, HAD 68 injured wrist (out Zandvoort/Monza/Madrid, LAW stand-in Red Bull, TSU back Racing Bulls), GAS 42, LIN 23, COL 19, BEA 18, etc. No midfield wins/podiums in 2026 (best GAS P7 Monza from pole).
- Recent: Austria RUS>VER>ANT; Silverstone LEC win; Spa ANT>LEC (RUS ret L1); Hungary NOR>VER>ANT (NOR pole); Zandvoort NOR>ANT>RUS (NOR pole, VER crash, 6 DNFs); Monza ANT from P19> RUS>VER>NOR>PIA>HAM (GAS pole, LEC L2 crash red flag).
- DNF rate 2026: 2-6/race, avg ~4. Street + heat = higher.

## Madring specifics
- 5.414km, 22 turns, 57 laps, 2 Straight Mode zones, La Monumental banked 550m 24%, T1 589m straight, T13/T17 heavy braking. Overtaking hard, track position crucial. F3 19 reds test, F2 fiery red, F1 FP LIN crash, FP3 HAM+BEA crashes. SC ~75%, red ~20%.
- Weather: 32C sunny 0% rain. Deg 0.8 FP1 →0.3 FP2, graining, 2-stop expected L18-24. Allocs: top zero new Soft except HAM/LEC fresh Soft; BEA 4 fresh Softs.
- Long-run: RUS fastest, VER +0.13, ANT +0.55, Ferrari/Haas +0.9. McLaren unknown (NOR gearbox FP2, graining). RB/RB strong middle sector.
- Quali gaps: NOR 1:31.824, ANT +0.011, VER +0.140, HAM +0.189, LEC +0.195 (old PU), RUS +0.325 (washout), PIA +0.470 (messy), LAW +0.492, COL +1.079, LIN +1.217, HUL +0.792 Q2, BOR +0.957, OCO +1.236, GAS +1.322, TSU +1.653, ALB +3.1 damage, SAI/ALO/PER/BOT +2.1-4.8 Q1.
- Grid penalties: SAI -3 impeding BOT T6-7 (P17→P20), STR 40-place new Honda PU (P22). BEA/STR no time but eligible.

## Methodology that worked
- Monte Carlo total = pace*57 + grid*5.0 + N(0,15) + paceNoise N(0,0.20)*57. Bonuses fresh Softs. Pace: ANT 0.02, NOR 0.11, RUS 0.14, VER 0.22, HAM/PIA 0.30, LEC 0.36, LAW 0.70, mid 0.95-1.20, back 1.85-2.40.
- Retire base 11-31% avg 4.4 DNFs, 28% L1-5 else U6-57, NC if <52 laps. T1 front-row incident 3.5%, midfield L1 pile-up 10% (1-2 extra). DNS BEA 2.5% STR 2.0% else 0.25%, DSQ 0.22%.
- Validates: sums 1.0, occupancy ≤1 monotonic, retire≥nc. 600k sims stable, rare wins LIN/COL ~2e-6, LAW 3e-4. Market match: ANT 37% vs +125, NOR 36% vs +130, VER 12% vs +600, HAM 6% vs +1000, RUS 5% vs +2200, LEC 2.6% vs +1800, PIA 1.2% vs +5000.
- Lesson: teammate gaps keep small (NOR-PIA 0.19 not 0.34), long-run single sample noisy (ANT +0.55 vs RUS likely program), market longshots (+25000/50000) vastly overstate true ~1e-6 (8-250x margin) — don't chase. Midfield podium needs 5+ DNFs ahead → <0.1%.

## For next races (Baku etc.)
- Watch: Hadjar wrist return? Leclerc ADUO2 return Baku FP1? Russell setup revert? McLaren graining fix? Haas Madring pace real? Alpine quali vs race gap (GAS pole→P7 Monza, COL P9 quali Madring)? Cadillac cooling? Honda PU reliability?
