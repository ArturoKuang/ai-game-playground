# Trailhead

## Algorithm Target
1.5 Hash Map
"Store every number once, then only grow consecutive runs from values that have no predecessor."

## Rules
Unsorted mile markers arrive at base camp. Stake markers into the ridge map, then survey runs by sending a scout upward from chosen markers and crown the longest trail before the action budget runs out.

## Mechanic Type
Optimization

## Algorithm-Mechanic Mapping
- **Algorithm step -> Game action**: Staking a marker into the ridge map is inserting a value into a hash set. Surveying from a staked marker walks `+1` steps while the next marker exists. The only efficient survey starts are trailheads: markers whose `value - 1` is absent from the map.
- **Why the strongest plausible wrong strategy fails**: A naive player stakes everything, then surveys from every marker "just to be safe." On overlapping runs this re-walks the same ridge suffixes again and again, so the budget disappears at medium difficulty even though the correct longest trail is present.
- **The aha moment**: "I do not need to start from every marker. If a lower neighbor exists, this marker lives inside a trail I can discover earlier. Only clear-left markers deserve a survey."

## Why It Works

### Algorithm Emergence Test
Optimal play is the standard `Longest Consecutive Sequence` set solution in physical form: register all markers, find the ones with no predecessor, then walk forward until the run ends.

### Wrong Strategy Trap Test
At Easy, surveying every marker still squeaks by. At Medium+, repeated suffix walks explode from roughly `2N` work to `N + sum(L * (L + 1) / 2)` across runs, so the player must stop launching from interior markers.

### Stare Test
Markers arrive in an unsorted stream, and the player only gets a reusable trailhead signal after staking them. The budget pressure is on action sequence, not on perfect paper sorting before acting.

### Transferability Test
The game directly targets `#128 Longest Consecutive Sequence`: stake values into a set, identify heads by checking `value - 1`, then count only from those heads. The same "store once, reuse membership" instinct also supports other hash-set membership problems, but this spec only claims `#128`.

### Not a Quiz Test
The player is managing a ridge survey under budget pressure. They think about which camps deserve a scout, not about set operations or time complexity.

## Predicted Failure Mode
If the trailhead signal is too obvious, the game may flatten into rote badge-following instead of discovery. The countermeasure is to keep Easy forgiving, then let the budget punish interior starts before the player fully trusts the signal.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| LeetCode Fit | 0.95-1.00 | Input, operations, bottleneck, and goal all match the standard set-based solution closely |
| Best Alternative Gap | 0.35-0.55 | Surveying every marker should be dramatically more expensive on overlapping runs |
| Invariant Pressure | 0.30-0.45 | Ignoring the "no predecessor" gate should destroy medium and hard efficiency |
| Difficulty Breakpoint | D3 | Easy can tolerate rescans; Medium should force trailhead-only thinking |
| Pattern Match | 0.80-0.90 | Blind reports should describe "only start where nothing smaller connects" |
| Strategy Shift | 0.70-0.85 | Expect a visible move from "check every marker" to "check only starts" |
| Skill-Depth | 0.40-0.65 | Random or panicky play should waste surveys and miss the crown |
| Decision Entropy | 1.5-3.0 | Intake is binary; survey phase offers several candidate starts |
| Counterintuitive Moves | 2-5 per puzzle | The strongest move is often to ignore dense interior markers that look promising |

## Difficulty Progression
- **Level 1-2 (Easy)**: Two short runs. Surveying every marker is inefficient but still survivable.
- **Level 3-4 (Medium)**: Longer overlapping runs. Interior starts now consume the entire budget.
- **Level 5 (Hard)**: Three competing runs plus duplicates and decoy singletons. Only full registration plus trailhead-only surveys leave enough budget to claim the answer.

## Player Experience
The first instinct is to chase obviously large markers and survey from everywhere. The shift comes when the player notices that interior markers merely replay a trail that a lower start would have covered already, and the little trailhead cues become budget-saving anchors instead of decoration.

## Difficulty Knobs
- **Total unique markers**: 5 -> 14
- **Longest run length**: 3 -> 8
- **Number of competing runs**: 2 -> 3
- **Budget ratio vs optimal**: ~1.5 -> ~1.1
- **Duplicate / singleton decoys**: 0 -> 3

## Acceptance Criteria
- Level 5 solver can win every generated puzzle using the intended trailhead strategy.
- The strongest wrong strategy can still win Easy but clearly breaks by D3-D4.
- The UI makes the best-run search legible without explaining the algorithm in jargon.

## Predicted Scorecard
- `skill_depth`: 0.52
- `counterintuitive_moves`: 3.2
- `algorithm_alignment`: 0.95
- `greedy_optimal_gap`: 0.44
- `difficulty_curve`: monotonic with a D3 breakpoint
- `insight_inflection`: D3

## Open Questions For Engineering
- How visible should trailhead status be before the player has staked most markers?
- Does claiming the current best run feel readable, or does the game need stronger surveyed-run history in the HUD?

---
<!-- BELOW THIS LINE: filled by engineer and playtester -->

## Solver Metrics

Computed on 5 puzzles x 5 difficulties x 5 skill levels.

### Standard Health Metrics
| Metric | D1 | D2 | D3 | D4 | D5 | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100.0% |
| Puzzle Entropy | 13.5 | 16.7 | 22.3 | 26.5 | 34.5 | 22.7 |
| Skill-Depth | 100% | 100% | 100% | 100% | 100% | 100.0% |
| Decision Entropy | 1.50 | 1.52 | 1.59 | 1.56 | 1.64 | 1.56 |
| Counterintuitive | 2.0 | 3.0 | 6.0 | 8.0 | 10.0 | 5.8 |
| Drama | 0.67 | 0.67 | 0.72 | 0.73 | 0.82 | 0.72 |
| Info Gain Ratio | 1.29 | 1.30 | 1.33 | 1.36 | 1.12 | 1.28 |

### Learning Metrics
| Metric | Value | Notes |
|---|---|---|
| Input Shape Match | 1.00 | Unsorted integers with gaps and duplicates collapse into a unique marker set |
| Operation Match | 1.00 | Register membership, check predecessor absence, then walk `+1` while present |
| Constraint Match | 1.00 | Efficiency is entirely about avoiding repeated suffix surveys |
| Goal Match | 1.00 | Winning means identifying the longest consecutive run |
| LeetCode Fit | 1.00 | Near-direct physicalization of the standard set solution |
| Best Alternative Gap | 0.64 | Strongest wrong strategy: stake all markers, then survey every marker |
| Invariant Pressure | 0.63 | Invariant breaker: only survey interior markers, never true starts |
| Difficulty Breakpoint | D3 | Wrong strategy survives Easy and breaks once long overlaps appear |
| Algorithm Alignment | 1.00 | Level 5 solver is exactly the trailhead-gated set scan |

### Strongest Alternative Baseline
| Topic | Baseline strategy | Why this is the real competitor |
|---|---|---|
| Hash Set / Longest Consecutive | Survey from every staked marker in ascending order | It is the obvious "check everything just in case" approach a player reaches for before trusting trailheads |

### Difficulty Curve
| Difficulty | Avg Moves (L5) | Avg Moves (L2) | L2 Solves? |
|---|---|---|---|
| 1 | 10 | 12 | yes |
| 2 | 12 | 16 | yes |
| 3 | 18 | 31 | no |
| 4 | 22 | 43 | no |
| 5 | 28 | 62 | no |

### Interpretation
- The invariant is simple and strict: if a predecessor exists, this start is an overlapping suffix and should not get its own scout.
- The strongest wrong strategy remains viable on D1-D2, which preserves a learning curve, but the move cost explodes at D3 once the longest run reaches length 5.
- Skill-depth saturates at 100% because random play usually fails to crown any valid best run at all; the gap is real, but the metric is clipped by the scoring formula rather than by over-forcing the puzzle.

**Auto-kill check**: PASSED
- Solvability: 100%
- LeetCode Fit: 1.00
- Best Alternative Gap: 0.64
- Invariant Pressure: 0.63
- Difficulty Curve: monotonic
- Difficulty Breakpoint: D3

## Play Report

Playtest skipped in this environment. The required browser harness could not launch a Chromium process inside the sandbox, and the Expo web route never exposed `localhost:8081` for a fallback manual session. This decision therefore uses solver metrics plus source-level UI review only.

## Decision

- `decision`: keep
- `why`: The mechanic cleanly isolates the missing `#128` insight that `Tag` did not teach strongly enough: storing numbers is necessary, but the decisive transfer is only surveying values whose predecessor is absent. Solver metrics are unusually clean: perfect solvability and LeetCode fit, strong alternative gap and invariant pressure, and the desired D3 breakpoint where "check every marker" finally collapses.
- `evidence_used`: solver evaluation across 25 puzzles, state-machine inspection, `npx tsc --noEmit`, and manual review for information leaks after removing the accidental target-length and suffix-length UI reveals.
- `bug_status`: No confirmed gameplay bugs from runtime play because runtime play was blocked; no static or state-machine defects found in the reachable logic.
- `algorithm_alignment_judgment`: Strong. The winning policy is the exact set-plus-trailhead scan used in `Longest Consecutive Sequence`.
- `next_action`: Claim the problem in the Blind 75 tracker and keep Trailhead as the dedicated game for `#128`.
- `polish_scope`: When browser automation is available, run a real blind session, validate that the trailhead badge reads as a discovery rather than a spoiler, and add stats/share polish only if the live play report stays aligned.

**Concept Bridge**: This game teaches the head-gated hash-set solution for consecutive runs. For the Blind 75 tracker, the kept `Trailhead` game explicitly claims `#128 Longest Consecutive Sequence`. The moment where a staked marker lights up as a true start maps to the code check `if (!set.has(num - 1))`, and the scout walking uphill until the ridge breaks maps to the `while (set.has(current + 1)) current += 1` expansion that counts one run exactly once.
