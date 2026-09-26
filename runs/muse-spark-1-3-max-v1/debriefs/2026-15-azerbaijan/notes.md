# Forecast notes

## 2026 to R15 Baku (26 Sep 2026)
- Regs: 2026 PU ADUO, Overtake replaces DRS, Straight Mode zones. MER benchmark, RBR straight-line strong, MCL straight-line weak, FER +0.3-0.4 + energy weak, Honda slowest fragile, Cadillac slow.
- Pts post-Baku: ANT 302 (8W), RUS 236 (3W, Baku win), HAM 199 (1W), NOR 186 (2W), LEC 179 (1W), VER 145 (0W!), PIA 96, HAD 83 (return P3). ANT lead 81→66. No midfield podium in 2026 (best LIN P7 Baku, COL P7 MAD).
- Recent: MAD ANT>VER>NOR (brief VSC only); Baku RUS>VER+0.196>HAD+10.7>LEC+14.1>ANT+14.5>HAM+22.3>LIN+31.1>OCO+31.1>BEA>SAI>HUL>LAW>BOR>PIA+36.4>PER BOT49 DNF, NC COL36 GAS35 NOR35 ALB29 ALO20 STR7. 2 SC (ALB29, COL/GAS/NOR35-36), 0 red. VER DOTD 26.6%.
- DNF: 2-7/race, avg ~4.5. Baku 6 NC+1 classified DNF=7 retired. Street+SC restarts+lock-ups = higher.

## Method (keep, Baku-updated)
- MC 600k: total=pace*lap+grid*w+N(0,15-18)+N(0,0.20-0.22)*lap, fresh-soft/offset bonus top only, 4% +6s slow-stop. w=5.0 clean street (MAD), 1.0-1.5 when 2SC likely (Baku 3.0 too high, predicted 90-150s mid gaps vs actual 31-41s). Model SC bunching mixture when P(SC)>60%, not just Gaussian.
- Retire base top 14-16%, mid 20-24%, back 25-30% avg 4.5-5.0; 30% early else uniform; NC if <90% laps else +250s tail; DNS 0.25-0.8% DSQ 0.22%. Add correlated restart triple (5%) + spin-continuer P12-15 (3-5%) + lock-up +2-5s (10-15% Baku gusts) + 7% damage P6-P12 + top-5 T1 6-8%.
- Validates sums 1.0, occupancy ≤1 monotonic, retire≥nc. 600k stable, true mid win ~1e-6. Don't chase markets +25000, don't deflate top pts to chase RPS (NC punishes even with good prob).
- Teammate gaps small except track-specific (straight-line/tow/floor) + quali tow 0.5s Baku discount; single long-run noisy but don't ignore repeated straight-line warnings.

## Madring R14 condensed — meanRPS 0.091, win .025 pod .030 pts .089 ret .139 MAE 3.05
- Res: ANT VER NOR LEC RUS LAW COL PIA LIN HUL, NC SAI PER STR HAM(L6 brakes). 18 class, 4 NC.
- Worked: ANT37% win hit, podium trio exact, LEC/RUS/LAW/COL/LIN/HUL ±1, DNF 4.4→4, grid5.0 (all ±2 except BEA+5/HAM NC), RUS fastest lap, LEC fresh-soft L48 P4.
- Random: HAM brake+VER T1 cut (13% tail, keep HAM pace), NOR VSC lottery (led, missed entry+35s stop P5→P3), PIA L1 damage endplate +95s P8 (3.9% tail). Brief VSC only despite F3 19 reds/F2 fire — F1 quali 0 reds was signal.
- Retained: 1-stop default street (15/18 1-stop, hards 43-48L, VSC cheap-stop 4s decides win), fresh bonus top clean only, slow-stop tails, Q2 tyre usage→Q3/L1 risk.

## Baku R15 post — meanRPS 0.159, win .017 pod .089 pts .200 ret .216 MAE 5.67
- Pace truth (fastest): RUS 1:44.916 L49, VER +0.077 L48, ANT +0.497, HAD +0.702, LEC +0.868, HAM +1.254, BOR +1.42 (!), PIA +1.686, SAI +1.82, LIN/HUL/LAW/BEA/OCO +1.93-2.15 cluster, PER +2.44, NOR +2.84 L28, GAS +2.90 L28, ALB/COL/BOT +3.5-3.9, ALO/STR +6-6.8. P7-P14 covered 5.2s (SC train). Start split med RUS/VER/NOR/GAS/COL/ANT vs soft LEC/PIA/HAD/HAM/BEA; VER med bad, soft miles faster.
- What worked (retain): RUS44.2% win hit (0.837s pole, controlled +10s halfway); LEC P4 exact (0.38 fade, RBRs passed with ease as forecast); SAI 1.20 best-mid + P10 (FW48 genuine, first Q3→pts, ALB slower); STR30% L7 water + ALO26% L20 mech + ALB24% L29 barrier + BOT29% L49 barrier hits; SC70%/red12% (2 SC, 0 red, F1 0 reds > F2 T3 7-car red); mid pod <2% needs 3+ top DNFs (only NOR top DNF → no mid pod); HAM 0.46 P6 lonely; HAD wrist 51L held (numb, gearbox vibe held).
- Randomness (do NOT overfit): COL T1 lock-up → GAS+NOR triple DNF (GAS P7+COL P10+NOR P8 all pts, single error, joint tail; keep base 16-23% but add correlated restart); PIA P2 all race → T1 lock-up spin P15→P14 (validates 0.20 pace, 3-5% spin tail, don't cut to 0.70); LIN P7 +0.030 over OCO via 4 DNFs+PIA spin+LAW hole (LIN: lucky, struggling, damage limitation; keep 1.45); OCO/BEA/SAI pts via chaos (OCO slowest train 1:47.06 but P8 on track/SC); VER 0.196 loss + RUS turbo lag on BOT yellow last lap (SC erased 10s lead, yellow lottery like MAD VSC); LAW P12 exact but wrong reason (pts pace + LIN T1 floor hole); ANT P5 with BEA-contact floor damage + worst wknd + P17 start (promoted 4 via DNFs/spin, not overtakes).
- Reusable fixes (change):
  1. Split MCL at straight tracks: PIA 0.20 held P2 (rear-tyre worry only) but NOR slow all race (lost HAD/VER/HAM/GAS/ANT pre-DNF, "impossible, straight speed", floor crack cable ties, quali +0.308 lock-up). Don't set NOR=PIA per MAD lesson1; use NOR +0.10-0.15 (0.30-0.35) when "podium impossible"+tow warnings repeat.
  2. VER 0.25→0.10: Q2 P2+FP3 P1 tow+pool ICE fix+specialist+straight speed > Q3 0.5s+battery+bottoming+yellow. Passed GAS/HAM immediately, fastest lap +0.077, team order past HAD. Don't flip win odds on grid/damage (HAD4.6%>VER4.5% wrong); VER-HAD gap 0.25→0.35-0.40.
  3. Audi 1.60/1.65→1.20-1.30: Q1 exit was tow/yellow (HUL +0.5s no tow T15 yellow, windy) + 14-part upgrade learning, not pace. BOR 7th fastest, HUL P11 lost SAI P10 with 2L to go, both beat PIA. Discount Baku Q1 0.5s, check Monza Q3 pace + FP.
  4. Compress midfield 0.60→0.30: actual fastest 1:46.33-1:47.06 (0.73s, BOR best not GAS). GAS 1.05 overrated (1:47.82 slowest mid, held P7 on track only). OCO 0.3-0.4 yellow claim true (finished P8 ahead SAI P10 despite 1.30 vs 1.20). Narrow to 1.20-1.50.
  5. SC-conditional grid + restart chaos: 2 SC compressed 90-150s→31-41s. Use w 1.0-1.5 + 15-20% restart contact (LIN/LAW + ANT/BEA + PIA spin same restart) when SC>60%. Baku DNFs L7/20/29/35/36/49 (0 L1-5) — restarts > L1.
  6. Lock-up tails: 5-6 lock-ups (NORx2, ALB barrier, COL T1, PIA T1, RUS wall brush) from gusts 43km/h + cooled tyres + T1/T5/T6/T15 braking. Pre-note under-modelled — add 10-15% lock-up.
- Report checks: MER-MCL 0.20 vs 0.05 — PIA held P2→0.20 ok for PIA, NOR larger (see 1); RUS +1.2s L1→+10s half controlled as check said. VER fix — confirmed strongly (see 2). ANT P16→P8 — got P5 via 2SC+4DNFs, no win from >P10 held, extended med+SC helped as check said. LEC fade — confirmed (lost PIA/HAD/VER, held ANT/HAM). SAI upgrade — confirmed (stayed with/ahead BEA/LAW). SC timing — confirmed decisive (SC1 Lap29 fresh softs to end, SC2 bunched VER-RUS 0.196 + ANT P6 + PIA spin).

## Next (Malaysia Sepang Oct2-4 + Singapore)
- Watch: HAD wrist proven (cut penalty, numb only); VER winless but DOTD + straight speed — favourite if low-deg soft suits; NOR/MCL straight fix? ("tough few wks, maybe Malaysia better"); ANT confidence reset (worst wknd, step behind); Alpine teammate management (COL apology, GAS no words, -6pts vs RB); Audi learning (more to extract); Williams FW48 genuine; Haas first double pts since Monaco; Honda water/mech (STR7 ALO20); Cadillac cooling held (PER P15 +41s closer than 1.90).
- Unresolved: true MER-MCL (PIA 0.20 vs NOR 0.30?) + OCO vs SAI order + PER 0.81 vs 1.90 (SC vs genuine?) + HAD 0.21 vs 0.50 (team order?) — keep narrow, verify Sepang long-run + speed traps.
