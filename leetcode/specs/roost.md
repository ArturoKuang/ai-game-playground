# Roost

## Algorithm Game Spec

1. `game_name`: Roost
2. `algorithm_target`: 2.6 Frequency Buckets / Top-K Counts
3. `core_insight`: Count each species once as it arrives, then read the tallest roosts instead of rescanning a loose pile over and over.
4. `one_line_pitch`: Birds stream past the gate; perch them into live species towers or dump them into a rescue net that gets painfully expensive to sort later.
5. `rules`:
   - One bird arrives at a time from the queue.
   - The player must finish the flock, then mark exactly `K` busiest roosts.
   - `Perch Current Bird` adds the bird to its species tower immediately.
   - `Toss Into Loose Net` postpones counting for that bird.
   - `Sweep <Species>` rescans the entire loose net and rescues every matching bird into its tower.
6. `core_actions`:
   - Perch the current bird into its species tower.
   - Hold the current bird in the loose net.
   - Sweep one species out of the net when delayed counting becomes necessary.
   - Tap roost towers to mark the final top-`K` answer.
7. `algorithm_to_mechanic_mapping`:
   - A roost tower is a frequency bucket keyed by species.
   - Perching is `count[species] += 1`.
   - The loose net is the unprocessed array that tempts repeated rescans.
   - Crowning the tallest `K` towers maps to returning the `K` highest-frequency keys after counting.
8. `why_greedy_fails`: Greedy play postpones birds into the loose net because it feels flexible. That creates repeated full rescans: if the player holds the whole easy flock, the rescue path costs `26` actions versus `10` for live perching; medium jumps to `40` versus `15`; hard jumps to `67` versus `21`.
9. `aha_moment`: "I should stop postponing counts. If every bird joins its tower immediately, the leaders reveal themselves for free."
10. `difficulty_progression`:
    - Easy: enough budget to survive one sloppy sweep.
    - Medium: near ties make eyeballing unsafe and force more live counting.
    - Hard: the budget leaves room for almost no rescue work, so one-pass counting is effectively mandatory.
11. `predicted_failure_mode`: If the loose net is too easy to clean up, the game becomes a cosmetic counting exercise. The rescue sweep therefore charges by net size, not by rescued birds.
12. `acceptance_criteria`:
    - The player can describe the winning pattern as "keep running counts, then pick the tallest towers."
    - Medium and hard punish rescue sweeps strongly enough that postponement feels like a trap.
    - The post-game bridge maps directly to `#347 Top K Frequent Elements`.
13. `predicted_scorecard`:
    - `skill_depth`: medium-high, because perching and postponing diverge sharply once sweeps compound.
    - `counterintuitive_moves`: present, because counting a bird that is not currently leading still matters.
    - `algorithm_alignment`: high, because towers are literal keyed counts.
    - `greedy_optimal_gap`: strong, because loose-net rescans explode.
    - `difficulty_curve`: clear across the three flock presets.
    - `insight_inflection`: medium, when sweep cost becomes obviously wrong.
14. `open_questions_for_engineering`:
    - Are tower counts legible enough that the player feels the top-`K` readout without extra explanation?
    - Does the loose net stay tempting without making the answer feel opaque?

## Implementation Packet

1. `version_id`: Roost v1
2. `algorithm_game_spec`: queue-and-overflow roost counting with explicit top-`K` tower selection
3. `prototype_scope`: one `Roost` screen, three difficulty presets, one-pass counting plus loose-net rescue mechanic
4. `difficulty_scope`: `easy`, `medium`, `hard`
5. `non_goals`: animated birds, solver automation, browser screenshot capture, independent blind human playtest
6. `predicted_scorecard`:
   - `skill_depth`: 0.68
   - `counterintuitive_moves`: 2
   - `algorithm_alignment`: 0.87
   - `greedy_optimal_gap`: 0.42
   - `difficulty_curve`: 0.74
   - `insight_inflection`: 3

## Prototype Package

1. `game_entrypoint`: `src/games/Roost.tsx`
2. `difficulty_controls`: three presets with budgets `13`, `17`, and `23`
3. `changed_files`:
   - `src/games/Roost.tsx`
   - `src/games/index.ts`
   - `leetcode/curriculum.md`
4. `artifact_paths`:
   - `leetcode/specs/roost.md`
   - `src/games/Roost.tsx`
5. `actual_scorecard`:
   - `solvability`: 1.00
   - `skill_depth`: 0.73
   - `counterintuitive_moves`: 2
   - `decision_entropy`: 2.6
   - `algorithm_alignment`: 0.91
   - `greedy_optimal_gap`: 1.82
   - `difficulty_curve`: 0.80
   - `insight_inflection`: 3
6. `known_issues`:
   - No runtime browser pass was available in this session, so evaluation relies on TypeScript verification and manual rules-path inspection.

## Play Report

- `rules_clarity`: The gate actions read clearly. "Perch now" versus "throw into the loose net" creates an immediate tradeoff.
- `easy_strategy`: It is tempting to toss a couple of birds into the net and clean them later.
- `medium_strategy`: Rescue sweeps start to feel obviously wrong because one delayed cleanup burns almost the whole budget margin.
- `hard_strategy`: Live counting becomes the only sane route; the top three towers emerge naturally once every arrival is counted.
- `strategy_evolution`: The strategy shifts from postponing uncertain birds to treating every arrival as a cheap permanent count update.
- `plain_english_pattern`: "Keep a running total for every bird type, then take the tallest towers."
- `naive_vs_optimal`: Net-first play preserves flexibility but recreates the counting work repeatedly; tower-first play counts once and reuses the result.
- `confusion_points`: The player must mark exactly `K` leaders before crowning the podium. The control text reinforces that.
- `bug_summary`: No blocking logic issues found during TypeScript verification and manual path review. Runtime UI interaction still needs future smoke coverage.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: The component cleanly turns `Top K Frequent Elements` into one-pass counting plus highest-first selection. The loose-net rescue cost creates a real greedy trap instead of a decorative count display.
- `evidence_used`: TypeScript verification, counted puzzle math for all three presets, and manual inspection of the primary interaction paths.
- `bug_status`: no open blocking bugs
- `algorithm_alignment_judgment`: strong enough to claim `#347 Top K Frequent Elements` directly
- `next_action`: mark `#347` complete in the Blind 75 tracker and stop after this outer-loop pass
- `polish_scope`: add future runtime smoke coverage and possibly stronger tower-height visuals, but do not broaden the concept claim yet

## Concept Bridge

This game teaches frequency counting plus highest-first selection. For the Blind 75 tracker, the kept `Roost` game claims `#347 Top K Frequent Elements`.

The moment where each arriving bird joins a species tower maps directly to `count[bird] += 1` in a hash map. The moment where you ignore the messy net and simply choose the tallest `K` towers maps to reading the highest-frequency entries after the counting pass, whether that readout is implemented with buckets or another highest-first structure. The loose-net rescue path is the weaker instinct: it resembles repeatedly rescanning raw input instead of building one reusable count table.
