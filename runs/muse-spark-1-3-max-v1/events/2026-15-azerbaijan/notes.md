# Forecast notes

## 2026 season to Round 14 Madring (13 Sept 2026)
- Regs: new 2026 PU (ADUO), Overtake Mode replaces DRS, Straight Mode zones. Mercedes benchmark. Honda struggling (Aston slowest, power-limited). Ferrari ADUO2 turbo upgrade (Monza), Cadillac new team slow + overheating.
- Standings pre-Madring: ANT 267 (7W), RUS 201 (2W), HAM 191 (1W), NOR 171 (2W), LEC 155 (1W), VER 109, PIA 92, HAD 68 injured wrist (out Zandvoort/Monza/Madrid, LAW stand-in Red Bull, TSU back Racing Bulls), GAS 42, LIN 23, COL 19, BEA 18, etc. No midfield wins/podiums in 2026 (best GAS P7 Monza from pole).
- Recent pre-Madring: Austria RUS>VER>ANT; Silverstone LEC win; Spa ANT>LEC (RUS ret L1); Hungary NOR>VER>ANT (NOR pole); Zandvoort NOR>ANT>RUS (NOR pole, VER crash, 6 DNFs); Monza ANT from P19> RUS>VER>NOR>PIA>HAM (GAS pole, LEC L2 crash red flag).
- DNF rate 2026: 2-6/race, avg ~4. Street + heat = higher.

## Madring specifics (pre-race)
- 5.414km, 22 turns, 57 laps, 2 Straight Mode zones, La Monumental banked 550m 24%, T1 589m straight, T13/T17 heavy braking. Overtaking hard, track position crucial. F3 19 reds test, F2 fiery red, F1 FP LIN crash, FP3 HAM+BEA crashes. Pre SC ~75%, red ~20% (overestimated, see post).
- Weather: 32C sunny 0% rain. Deg 0.8 FP1 →0.3 FP2, graining, pre 2-stop L18-24 (wrong, see post). Allocs: top zero new Soft except HAM/LEC fresh Soft; BEA 4 fresh Softs.
- Long-run: RUS fastest, VER +0.13, ANT +0.55, Ferrari/Haas +0.9. McLaren unknown (NOR gearbox FP2, graining). RB/RB strong middle sector.
- Quali gaps: NOR 1:31.824, ANT +0.011, VER +0.140, HAM +0.189, LEC +0.195 (old PU), RUS +0.325 (washout), PIA +0.470 (messy, extra Q2 softs→used C4 Q3R1), LAW +0.492, COL +1.079, LIN +1.217, HUL +0.792 Q2, BOR +0.957, OCO +1.236, GAS +1.322, TSU +1.653, ALB +3.1 damage, SAI/ALO/PER/BOT +2.1-4.8 Q1.
- Grid penalties: SAI -3 impeding BOT T6-7 (P17→P20), STR 40-place new Honda PU (P22). BEA/STR no time but eligible.

## Methodology that worked (keep)
- Monte Carlo total = pace*57 + grid*5.0 + N(0,15) + paceNoise N(0,0.20)*57. Bonuses fresh Softs. Pace: ANT 0.02, NOR 0.11, RUS 0.14, VER 0.22, HAM/PIA 0.30, LEC 0.36, LAW 0.70, mid 0.95-1.20, back 1.85-2.40.
- Retire base 11-31% avg 4.4 DNFs, 28% L1-5 else U6-57, NC if <52 laps. T1 front-row 3.5%, midfield L1 10%. DNS BEA 2.5% STR 2.0% else 0.25%, DSQ 0.22%.
- Validates: sums 1.0, occupancy ≤1 monotonic, retire≥nc. 600k sims stable, rare wins LIN/COL ~2e-6, LAW 3e-4. Market match: ANT 37% vs +125, NOR 36% vs +130, VER 12% vs +600, HAM 6% vs +1000, RUS 5% vs +2200, LEC 2.6% vs +1800, PIA 1.2% vs +5000.
- Lesson: teammate gaps keep small, long-run single sample noisy, market longshots (+25000/50000) vastly overstate true ~1e-6 — don't chase. Midfield podium needs 5+ DNFs → <0.1%.

## Madring post-race (14 Sept review) — score meanRPS 0.091, win 0.025, pod 0.030, pts 0.089, ret 0.139, MAE 3.05
- Result: 1 ANT 1:34:23.754, 2 VER +4.35, 3 NOR +5.09, 4 LEC +29.1, 5 RUS +29.8, 6 LAW +86.7, 7 COL +94.2, 8 PIA +95.8, 9 LIN +1L, 10 HUL +1L, 11 OCO, 12 GAS (+5s pit speeding), 13 BOR, 14 TSU, 15 ALB, 16 BEA, 17 ALO +2L, 18 BOT +3L, NC SAI L43, PER L31, STR L12 brake, HAM L6-7 brakes. 18 classified, 4 NC, 0 DNS/DSQ. Post pts: ANT 292 (8W) +81 RUS 211, HAM 191, NOR 186 (gap 106), LEC 167, VER 127, PIA 96. Still no midfield podium (best COL P7).
- What worked: ANT win 37% hit; podium trio ANT/VER/NOR exact; LEC P4 16.3%, RUS P5 17.3%, LAW P6 15.2%, COL P7 10%, LIN P9 16.6%, HUL P10 15.2% all good; DNF 4.4→4, classified 18.1→18 exact; 3/4 DNFs were top risks STR 30%/PER 27%/SAI 25%; grid*5.0 validated (all ±2 of grid except BEA +5, HAM NC); RUS fastest lap 1:35.587 validated long-run; LEC fresh-soft L48→P4 validated.
- Randomness (do NOT overfit): HAM brake failure L6 + VER T1 cut/clash (13% tail; Ferrari pace-to-win per HAM/Vasseur, FP3 crash unrelated) — keep top 12-15% DNF, keep HAM pace. NOR VSC lottery (led, deserved win per ANT/VER/Stella, missed pit entry by secs +7s/35.1s stop P5→P3) — pure timing luck, not pace error. PIA L1 damage (RUS contact, broken endplate, +95s, P8 was 3.9% tail) — damage, not pace; keep NOR-PIA gap small. STR brake L12-13 T20 VSC cause was predicted top risk; brief VSC only (no SC/red) despite F3/F2 chaos.
- Reusable fixes for Baku+:
  1. Trust recent form over missing FP data: called NOR pole unrepeatable (FP2 gearbox/graining) but NOR fastest Sunday (tyre mgmt, 3 poles/4 races, HUN/ZAN wins). Weight last 3 races+quali > single noisy long-run.
  2. Add damage-continuers: model only DNF vs clean, missed PIA-type 0.5-1.5s/lap loss but classified. Add ~5-10% damage for P6-P12 starters at narrow T1.
  3. Widen L1 clash: only front-row 3.5% + P8-P16 10%, but actual VER-HAM P3-P4, RUS-PIA P6-P7. Use ~6-8% any top-6 contact → DNF or damage.
  4. 1-stop default at street tracks: assumed uniform 2-stop L18-24, actual 15/18 1-stop (hards 43-48L: LEC L48, ANT/VER 43L post-VSC, LEC led 32L hoping late SC). Check hard durability + VSC cheap-stop + offset hope; split ~60% 1-stop. Fresh-soft bonus: keep for top clean air (LEC), cut for P20+ traffic (BEA 4 softs→P16).
  5. F1 quali > F2/F3 for chaos: pre SC75%/red20% from F3 19 reds/F2 fire, actual brief VSC only, quali 0 reds was signal. Model VSC cheap-stop lottery (4s decided win), not just full SC.
  6. Slow stops: NOR 35.1s/7s, ALO 43.8s, SAI 46s = 4-15s tails. Add 3-5% +4-8s slow-stop beyond Gaussian 15s.
  7. Quali tyre usage → Q3/L1 risk: PIA extra Q2 softs → compromised Q3 P7 → pack damage. Track Q2 consumption.
  8. RPS punishes NC even with good nc prob (HAM 0.62 drove 2/3 of mean; ex-HAM mean ~0.066 elite). Don't deflate top pts probs to chase RPS; keep calibration.

## For next races (Baku etc.)
- Watch: Hadjar wrist return? (LAW P6 pushes to stay); LEC ADUO2 return Baku FP1?; Ferrari brake fix (HAM) + Saturday step (LEC: lose Sunday via Saturday); McLaren Saturday weakness (NOR: Sunday best); RUS title out mindset (Wolff); Alpine COL P7 momentum vs GAS penalty; Honda brakes+PU (STR VSC); Cadillac cooling (PER L31); Williams battery/slow stops (SAI); Haas traffic limit (BEA); grid weight 5s/pos keep for Baku.

## Baku pre-race (26 Sept 2026, Round 15)
- Grid: RUS pole 1:42.526 +0.837 LEC, PIA +0.838, HAD +0.974, NOR +1.146 lock-up, HAM +1.332 no tow, GAS +1.521, VER +1.555 Q3 (Q2 P2 1:43.706), SAI Q9→P14 +5 yellow fastest sector, COL Q10→P9, BEA Q11→P10, LAW Q12→P11, ALB Q13→P12, OCO Q14→P13, LIN Q15→P15, ANT Q16 Q1 T1 wall 1:45.504→P16, BOR P17, HUL P18, BOT Q22→P19, PER Q20 +3 impeding PIA→P20, STR +20→P21, ALO +25→P22. VER pool ICE no penalty (later due), LEC no deliberate penalty.
- Pace: FP1 RUS VER LEC HAM ANT hydraulic/fire new PU; FP2 RUS 1:43.347 ANT+0.552 VER+0.827, NOR/PIA 1.484/1.510 floor crack cable ties, LIN T8/T9 red; FP3 VER 1:43.922 tow RUS+0.099. Long-run F1 MER MCL+0.05 RBR+0.30 FER+0.34 ALP+0.99; model MER-MCL 0.20 for straight-line + historic quali + noisy sample. Upgrades Audi 14 fail Q1, McL straight-line mode still weak, Wil FW48 first Q3 genuine?, RBR 5 gains, others none.
- Model: 51 laps grid*3.0 (vs MAD 5.0) for slipstream/headwind/33% pole, N18 +0.22*51, ANT-1.5 fresh, 7% damage P6-P12 +0.8/lap, 4% +6s slow, DNF 14-30% avg4.6 +6% front8 +12% P9-P16 T1, NC<46 +250 tail, DNS0.25-0.8 DSQ0.22. Pace RUS0 ANT0.06 PIA/NOR0.20 VER0.25 HAD0.50 LEC0.38 HAM0.46 GAS1.05 COL/SAI1.20 BEA1.28 LAW/OCO1.30 ALB/LIN1.45 BOR1.60 HUL1.65 ALO1.85 PER1.90 STR2.10 BOT2.15.
- Forecast: RUS44.2 PIA18.2 NOR12.0 LEC11.8 HAD4.6 VER4.5 HAM3.1 ANT1.5; pod RUS73.7 PIA54.5 NOR44.7 LEC44.3 HAD25.4 VER24.0 HAM19.5 ANT12.0 GAS1.5; pts 84.7-78.4 top8, GAS67 COL53 BEA45 LAW40 SAI36 OCO35 ALB27 LIN18 BOR10 HUL7 PER1.7 ALO1.3 BOT0.7 STR0.6; ret STR29.7 LIN29.4 BOT28.9 etc avg4.81 class17.48. Order RUS PIA NOR LEC HAD VER HAM ANT GAS COL BEA LAW SAI OCO ALB LIN BOR HUL PER ALO BOT STR.
- Lessons to verify post: MER-MCL 0.20 vs 0.05? VER fix? ANT P16→P8 +8 vs 0/9 from >P10? SAI 1.20 quali vs race? HAD wrist 51 laps? SC 70% vs 89% Pirelli? F1 quali 0 reds vs F2 chaos?
