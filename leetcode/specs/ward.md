# Ward

## Algorithm Game Spec

1. `game_name`: Ward
2. `algorithm_target`: 1.7 Scoped Hash Registries
3. `core_insight`: Each filled cell belongs to three overlapping groups. File it into the row, column, and chamber registries once, and any duplicate in those groups surfaces immediately.
4. `one_line_pitch`: Patrol a rune board by warding each marked cell into its row, column, and chamber ledgers before a duplicate breach slips through.
5. `rules`:
   - The board already contains marked runes and blanks.
   - Process the highlighted marked cell in reading order.
   - `Ward Cell` files that rune into its row, column, and chamber registries at once.
   - `Sweep Neighborhood` manually inspects the cell's row, column, and chamber for a duplicate but does not save anything for later.
   - At any time, call the board `Valid` or `Broken`.
6. `core_actions`:
   - Ward the current rune into all three overlapping registries.
   - Spend a large manual sweep when you distrust the registries or refuse to build them.
   - Call `Broken` as soon as a duplicate breach is proven.
   - Call `Valid` only after every marked cell has been processed cleanly.
7. `algorithm_to_mechanic_mapping`:
   - The row, column, and chamber ledgers are the three hash-set keys used in `Valid Sudoku`.
   - `Ward Cell` maps to inserting `(row, digit)`, `(digit, col)`, and `(box, digit)` into seen sets.
   - A breach light maps to detecting that one of those keys already exists.
   - `Sweep Neighborhood` is the weaker alternative: repeatedly rescanning visible peers around the current cell.
8. `why_greedy_fails`: Greedy play keeps sweeping the visible neighborhood because it feels concrete. That recreates the same row, column, and chamber checks over and over. Easy boards forgive that waste, but medium and hard budgets are calibrated so only one-pass warding survives.
9. `aha_moment`: "I do not need to keep rereading the same groups. If each rune joins its three ledgers once, the bad board exposes itself for free."
10. `difficulty_progression`:
    - Easy: small 4x4 boards where manual sweeps still limp home.
    - Medium: 6x6 boards where repeated neighborhood checks start overrunning the budget.
    - Hard: denser 9x9 pressure where only triple-registry discipline stays inside budget.
11. `predicted_failure_mode`: If the ward action feels like a purely better button with no tension, the lesson collapses into button mashing. The game therefore keeps manual sweeps plausible on D1-D2 and only crushes them on D3+.
12. `acceptance_criteria`:
    - The player can describe the winning pattern as "file each rune into every group it belongs to once."
    - Medium or hard makes sweep-only play clearly over budget.
    - A post-game bridge maps directly to `#36 Valid Sudoku`.
13. `predicted_scorecard`:
    - `skill_depth`: high, because sweep-only cost grows with every overlapping group.
    - `counterintuitive_moves`: present, because warding a cell with no visible conflict still matters for future duplicate detection.
    - `algorithm_alignment`: very high, because the ledgers are literal scoped keys.
    - `greedy_optimal_gap`: strong, because repeated neighborhood sweeps explode.
    - `difficulty_curve`: clear across 4x4, 6x6, and 9x9 boards.
    - `insight_inflection`: medium, when the player stops trusting local inspection and starts trusting the registries.
14. `open_questions_for_engineering`:
    - Does the current-cell focus make the three overlapping scopes legible without cluttering the whole board?
    - Is the "call valid / call broken" flow clear enough that early invalid discovery feels rewarding instead of abrupt?

## Implementation Packet

1. `version_id`: Ward v1
2. `algorithm_game_spec`: process each filled cell once with row/column/chamber ward registries versus expensive repeated neighborhood sweeps
3. `prototype_scope`: one `Ward` screen, five difficulty presets, one registry-first action path plus one manual-sweep alternative
4. `difficulty_scope`: difficulties `1` through `5`
5. `non_goals`: editable Sudoku input, solver visualization in UI, animation polish beyond state-color feedback
6. `predicted_scorecard`:
   - `skill_depth`: 0.72
   - `counterintuitive_moves`: 4
   - `algorithm_alignment`: 0.95
   - `greedy_optimal_gap`: 0.55
   - `difficulty_curve`: 0.82
   - `insight_inflection`: 3

## Prototype Package

1. `game_entrypoint`: `src/games/Ward.tsx`
2. `difficulty_controls`: five presets with fixed board layouts and budgets
3. `changed_files`:
   - `src/games/Ward.tsx`
   - `src/games/index.ts`
   - `src/solvers/Ward.solver.ts`
   - `leetcode/curriculum.md`
4. `artifact_paths`:
   - `leetcode/specs/ward.md`
   - `src/games/Ward.tsx`
   - `src/solvers/Ward.solver.ts`
5. `actual_scorecard`: pending implementation
   - `solvability`: 1.00
   - `skill_depth`: 1.00
   - `counterintuitive_moves`: 14.6 average
   - `decision_entropy`: 1.94
   - `algorithm_alignment`: 1.00
   - `leetCode_fit`: 1.00
   - `best_alternative_gap`: 0.28
   - `invariant_pressure`: 0.69
   - `difficulty_breakpoint`: 3
6. `known_issues`:
   - The sandbox blocked Puppeteer from launching a browser process, so blind browser playtesting could not run in this session.
   - `expo export --platform web` succeeded, which verifies the screen bundles correctly for web even though interactive browser QA remains pending outside this environment.

## Play Report

- `rules_clarity`: The current-cell panel, sweep cost, and verdict buttons make the patrol loop legible on paper and in the bundled UI.
- `easy_strategy`: D1-D2 allow manual sweeps to survive, which keeps the weaker instinct plausible.
- `medium_strategy`: D3 is the inflection point; scan-only jumps to `50` actions against a `27` budget while registry-first stays at `24`.
- `hard_strategy`: D5 scales the same lesson to a dense 9x9 board, where registry-first solves in `30` actions and scan-only misses budget at `64`.
- `strategy_evolution`: The intended shift is from "inspect this neighborhood right now" to "record every rune in its three scopes once and reuse that proof."
- `plain_english_pattern`: "File each marked cell into every group it belongs to once, then duplicates reveal themselves automatically."
- `naive_vs_optimal`: Manual sweeping can answer local doubt, but it re-pays the same row, column, and chamber costs over and over. Warding once makes the evidence reusable.
- `confusion_points`: No blocking code-path confusion found during solver inspection and web bundle export. Runtime blind play remains pending because the browser harness was unavailable in the sandbox.
- `bug_summary`: No compile or bundling bugs. `npx tsc --noEmit` passed and `env CI=1 npx expo export --platform web` produced a working web bundle in `dist/`.
- `verdict`: keep

## Decision Memo

- `decision`: keep
- `why`: The mechanic directly teaches the three-key seen-set pattern behind `Valid Sudoku`. The chamber-only breach on D4 proves the third scope matters, and the budget curve pushes sweep-only play from viable on D1-D2 to broken on D3 and D5.
- `evidence_used`: pure-solver evaluation across 5 seeds x 5 difficulties, `npx tsc --noEmit`, and successful web export via `env CI=1 npx expo export --platform web`
- `bug_status`: no open blocking implementation bugs; blind browser QA remains an environment gap, not a discovered product bug
- `algorithm_alignment_judgment`: strong enough to claim `#36 Valid Sudoku` directly
- `next_action`: mark `#36` complete in the Blind 75 tracker and stop after this outer-loop pass
- `polish_scope`: run an actual blind browser session when the environment allows Puppeteer, but do not broaden the concept claim yet

## Concept Bridge

This game teaches scoped hash registries for overlapping constraints. For the Blind 75 tracker, the kept `Ward` game claims `#36 Valid Sudoku`.

The moment where you ward one filled cell into its row, column, and chamber ledgers maps directly to inserting the three seen keys for that digit in code. The moment where a breach light trips without any extra rescan maps to the duplicate check that happens when one of those keys already exists. Manual sweeping is the weaker instinct: it resembles re-reading the same row, column, and box from scratch instead of building reusable registry evidence.
