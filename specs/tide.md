# Tide

## Rules
Activate all pillars before the tide cycle ends. Pillars can only be tapped when their height is above the current water level, which rises and falls on a known schedule each turn.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
All pillar heights, the tide schedule, and the number of remaining activations are visible. But the ORDERING problem defeats pre-planning. With 12 pillars at 5 different heights and a 10-turn tide cycle that oscillates between level 1 and level 5, the player must decide: activate the LOW pillars now (during low tide) or save them for later when the tide drops again? Activating low pillars early is safe (they might not be reachable later) but uses up the action budget on the current turn, preventing activation of medium pillars that are ALSO available now but will still be reachable next turn. The planning horizon is 10 turns, each with 3-8 available pillars, creating a scheduling problem where the interaction between pillar heights and tide levels produces combinatorial explosion. A 6-pillar low-tide window where the player can only activate 2 creates C(6,2) = 15 choices, and the consequences ripple forward through the remaining schedule. With 4-5 such decision windows per puzzle, the total search space is 15^4 = ~50,000 sequences, far beyond mental simulation.

### Dominant Strategy Test
"Activate the lowest pillars first (they have the fewest available windows)" sounds reasonable but fails. A pillar at height 2 appears in 3 of 10 tide windows. A pillar at height 3 appears in 5 windows. Activating the height-2 pillar first seems urgent -- fewer opportunities. But the height-2 windows overlap with the ONLY window for a height-1 pillar, and you can only activate 2 per turn. If you spend both activations on height-2 and height-3 pillars, the height-1 pillar becomes unreachable. "Activate the rarest first" also fails because some rare pillars share windows with OTHER rare pillars, creating mutual exclusion. The cost of activating pillar A in window W is incommensurable: it depends on which OTHER pillars the player plans to activate in W (crowding out), and whether A has alternative windows later (opportunity cost), which itself depends on what the player does in intervening turns (future commitments).

The player cannot evaluate a single activation without reasoning about the ENTIRE remaining schedule -- the hallmark of incommensurable costs.

### Family Test
Temporal scheduling with environmental constraints. This is NOT:
- Any grid-based game (Tide is a timing/ordering puzzle, not spatial)
- Claim (territory with locking -- Tide has no spatial adjacency, just temporal windows)
- Sort (ordering puzzle -- Sort has a fixed sequence; Tide has overlapping time windows with capacity constraints)
- Any hidden-information game (full visibility, but combinatorial explosion defeats computation)

The defining novelty: the ENVIRONMENT changes the available action set each turn on a known but complex schedule, and the player must pack all required activations into compatible windows. The closest analog is scheduling theory (job-shop scheduling is NP-hard), adapted into a tactile puzzle. The tide metaphor makes the mechanic instantly legible: water rises, pillars disappear underwater, water falls, they reappear. No tutorial needed.

**Unoccupied family**: Temporal scheduling / time-windowed constraint packing.

## Predicted Failure Mode
**Most likely death: A10 on small puzzles.** If Monday has 6 pillars with 3 obvious low-tide windows, a patient player can enumerate all valid orderings. MITIGATION: Even Monday must have at least one "scheduling conflict" -- two pillars that share their ONLY available window, forcing the player to choose which to activate first (one in this window, one in the next). Minimum 8 pillars on Monday.

**Second risk: feels like a spreadsheet.** If the player is just mentally computing "which pillars are available when," the game is scheduling homework, not a puzzle. MITIGATION: The tide visualization must be SPATIAL and VISCERAL -- water rising and falling around the pillars, submerging them with animation, so the temporal constraint is FELT not calculated. The player should think "the water is coming, I need to get to that pillar!" not "pillar 7 has availability windows at t=3 and t=7."

**Third risk: deterministic planning kills drama.** Since the tide schedule is known, a perfect planner can map the entire game before acting. MITIGATION: Limit activations per turn (2-3), creating CAPACITY constraints within each window. The player can see 6 available pillars but can only tap 2. Which 2? This is where the genuine decisions live -- not "what's available" (known) but "what to prioritize given limited actions."

**Anti-pattern proximity: A10 (fully visible).** Defense: capacity constraints create NP-hard packing even with full visibility (like bin-packing, which is NP-hard despite full knowledge). The tide schedule creates the "bins" and the activation limit creates the "bin capacity."

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 15-28 | 10-turn schedule, 8-14 pillars, 2-3 activations per turn. Effective choices: C(available, capacity) per window, cascading across 5-7 meaningful windows. ~15 bits for Monday (fewer pillars), ~28 for Friday (more pillars + tighter capacity). |
| Skill-Depth | 40-65% | Strategic players identify the scheduling bottlenecks -- windows where rare pillars compete for limited activation slots. They work backward from the tightest windows. Greedy players (activate whatever is available now) get stuck when a rare pillar has no remaining window. The backward-planning advantage should yield 40-65% fewer total moves. |
| Counterintuitive Moves | 2-4 | "Skip this available height-2 pillar and activate the height-4 pillar instead" -- because the height-2 pillar appears again in window 7, but the height-4 pillar shares window 7 with two OTHER height-4 pillars that can't all fit. Delaying a seemingly urgent activation to avoid a future bottleneck. Also: "Waste an activation slot on this easy pillar" to avoid using it later when the slot is needed for a rare pillar. |
| Drama | 0.5-0.7 | The tide rising creates natural tension: "I have 2 activations left this turn, water rises next turn and swallows 3 pillars, 2 of which I haven't activated." Near-miss: "If I'd activated pillar B in window 3 instead of pillar C, I'd have had room for both D and E in window 6." |
| Decision Entropy | 2.0-3.5 | Each turn: 4-8 available pillars, 2-3 activation slots. C(6,2) = 15 options per turn, with meaningful differences. After pruning (pillars available in many windows are low priority), effective choices narrow to 3-6 meaningful options. ~2.5 bits per turn. |
| Info Gain Ratio | 1.8-2.8 | Strategic schedulers complete puzzles in near-optimal activations. Greedy players waste slots on pillars they could have activated later, then run out of windows for rare pillars. The "wasted slot" cost compounds across the schedule. |

## Player Experience
**Opening (10s):** A seascape with colorful pillars rising from the water. A tide meter on the side shows the 10-turn cycle: water level alternates low-medium-high-medium-low across the schedule, displayed as a simple wave graph. Turn 1: low tide. All 12 pillars are visible above the waterline. You can activate 2 per turn. The tallest pillars (height 5) are always visible -- no urgency there. But three short pillars (height 1-2) are only visible during low tide (turns 1, 5, 9). You tap two height-1 pillars. They glow gold with a satisfying activation chime, sinking slightly into the water as if "locked in." The tide meter advances. Water begins to rise.

**Middle (2min):** Turn 4: high tide. Only the 5 tallest pillars poke above the water surface. You've activated 6 of 12 pillars. Two height-3 pillars remain -- they'll be available at medium tide (turns 5 and 8). But turn 5 is also the SECOND low-tide window, and you still have one height-2 pillar left. Turn 5: you can only activate 2. Three pillars need activation (two height-3s and one height-2). Which one do you delay? The height-2 has ONE more window (turn 9). The height-3s each have TWO more windows (turns 5 and 8). Delay a height-3. You activate the height-2 and one height-3. The other height-3 waits for turn 8.

**Ending (15s):** Turn 9: last low tide. Two pillars remain: one height-4 (available in 3 remaining turns) and one height-1 (ONLY available now). You activate the height-1 -- it barely peeks above the receding water, waves lapping at its base. Last activation slot: the height-4. All 12 pillars glow gold. The tide drains away revealing the full set of activated pillars standing proud. Perfect schedule. "Tide #42 -- 20 activations (par 20)."

**The aha moment:** "I shouldn't activate this height-3 pillar now even though it's available -- it appears again in 3 turns, but this height-2 pillar only appears ONE more time, and that window is also the last chance for the height-1 pillar. I need to save capacity in that window for the height-1, so I must activate the height-2 NOW."

**The near-miss:** "21 activations, par was 20. I activated pillar 7 (height-3) in window 3 instead of pillar 4 (height-2). In window 5, I had to activate both pillars 4 and 11, leaving no room for pillar 9. Pillar 9's only remaining window was turn 8, where it competed with pillar 12. One different choice in window 3 would have avoided the cascade of conflicts."

**Screenshot:** A row of pillar emoji at different heights (tall = mountain, medium = building, short = house). Activated = gold star, missed = red X. Tide wave graph below. "Tide #42: 20/20 activations, 10 turns."

## Difficulty Knobs
1. **Pillar count and height distribution** (Monday: 8 pillars with heights well-spread across 3 levels, few scheduling conflicts; Friday: 14 pillars at 5 height levels with multiple bottleneck windows where 4+ pillars compete for 2 slots)
2. **Activations per turn** (Monday: 3 per turn, generous capacity; Friday: 2 per turn, tight capacity forcing hard choices every window)
3. **Tide cycle length and shape** (Monday: 8 turns with 3 low-tide windows, plenty of opportunities; Friday: 12 turns with only 2 low-tide windows and 4 high-tide turns in a row, creating long droughts for short pillars)
4. **Par tightness** (Monday: par = optimal + 3, room for 3 scheduling mistakes; Friday: par = optimal + 1, requires near-perfect window utilization)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics
<!-- Engineer fills this section with raw computed metrics -->

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision
<!-- Designer fills this after reviewing metrics + play report -->
<!-- Status: keep / iterate / kill -->
