# Crate

## Algorithm Target
1.3 Stack
"Most-recent-first processing solves nested structure problems"

## Rules
Crates arrive on a conveyor belt in random order. Push them onto a staging stack, then pop to load the truck in the required order. Clear all crates within the move budget.

## Mechanic Type
Constraint Satisfaction

## Algorithm-Mechanic Mapping
- **Algorithm step → Game action**: Pushing a crate = stack push. Popping when the top crate matches the next truck slot = stack pop. The player IS operating a stack to reorder a sequence.
- **Why greedy fails**: Greedy = "always pop if top matches next truck slot." Fails when the staging stack is nearly full — player must sometimes pop non-matching crates to the discard area (costs 2 moves) to make room for incoming crates. The decision "push now or discard the top to make room?" is the strategic core.
- **The aha moment**: "I need to think about what's coming next! If I push this crate, will I be able to pop it before the stack fills up and forces expensive discards?" This is stack-based planning — understanding LIFO ordering constraints.

## Why It Works

### Algorithm Emergence Test
The player's optimal strategy is: examine incoming crate, decide whether to push or discard. When the top of stack matches the next truck slot, pop immediately. This is the classic "sort using a stack" algorithm. The key insight is that LIFO ordering constrains what can be on top when — some sequences are stack-sortable and some aren't without discards.

### Greedy Trap Test
Greedy "always push, pop when matching" fails when incoming crates arrive in a descending order that fills the stack before the needed crate appears. Example: truck wants [1,2,3,4], crates arrive [4,3,2,1] — greedy pushes all four, then pops perfectly. But crates arrive [3,1,4,2] with stack size 3 — greedy pushes 3,1,4 (stack full), can't push 2, forced to discard. Optimal: push 3, push 1, pop 1 (discard costs 2 if not matching), push 4, push 2... The planning horizon matters.

### Stare Test
Incoming crate sequence is only partially visible (next 2-3 crates shown). The player can't see the full sequence, so must make decisions under uncertainty. Even with visible crates, the stack's LIFO constraint creates combinatorial complexity that exceeds working memory at medium+ difficulty.

### Transferability Test
- #20 Valid Parentheses: the "push opener, pop on matching closer" pattern IS this game
- #155 Min Stack: awareness of what's in the stack while making push/pop decisions
- #739 Daily Temperatures: "hold items until a condition is met, then process backward" — the timing of pops mirrors temperature lookback

### Not a Quiz Test
Player sees a conveyor belt, a staging area (the stack), and a truck with numbered slots. They think about warehouse logistics, timing, and space management — not "stack data structure." The interface uses crate emojis, truck imagery, and spatial stacking.

## Predicted Failure Mode
Risk of A8 (low branching factor) — at many steps, there may be only one sensible action (push the incoming crate, or pop because top matches). Mitigation: the discard option and stack size limit create 3-way decisions (push, pop-to-truck, pop-to-discard) at critical moments. Multiple incoming crates visible creates a planning horizon.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 12-18 bits | 2-3 choices per step × 15-25 steps |
| Skill-Depth | 35-50% | Planned push/pop vs random significantly differs |
| Counterintuitive Moves | 2-4 per puzzle | Discarding a "useful" crate to make room for a more urgent one |
| Drama | 0.5-0.7 | Stack filling up creates tension; last few crates are dramatic |
| Decision Entropy | 1.5-2.5 bits | Push/pop/discard = ~1.5 bits, sometimes fewer valid options |
| Info Gain Ratio | 1.5-2.0 | Planned push order significantly better than random |
| Algorithm Alignment | 70-85% | Most moves are literal stack operations |
| Greedy-Optimal Gap | 20-35% | Greedy fills stack and forces expensive discards |

## Difficulty Progression
- **Level 1-2 (Easy)**: 6 crates, stack size 4, sequence nearly sorted, generous budget. Push everything, pop in order. Stack concepts are obvious.
- **Level 3-4 (Medium)**: 10 crates, stack size 4, unsorted sequence, budget = 1.3× optimal. Must plan discards. Players learn to look ahead at incoming crates.
- **Level 5 (Hard)**: 15 crates, stack size 4, adversarial sequence (maximizes required discards), budget = 1.1× optimal. Only careful stack management works.

## Player Experience
Level 1: "Crates come in, I push them, pop when they match. Simple!" (Confidence)
Level 3: "The stack is full and the crate I need is buried! I have to discard something. But what?" (Tension)  
Level 5: "I need to plan 4-5 moves ahead. If I push this now, will I have room when the crate I need arrives? Sometimes I need to waste a discard now to save two later." (Strategic depth)

## Difficulty Knobs
- **Number of crates**: 6 → 15
- **Stack capacity**: 5 → 3 (smaller = harder)
- **Visible incoming crates**: 3 → 1 (less lookahead = harder)
- **Move budget ratio**: 2.0 → 1.1

---
<!-- BELOW THIS LINE: filled by engineer and playtester -->

## Solver Metrics

**5 difficulties x 5 seeds = 25 puzzles**

| Metric | D1 | D2 | D3 | D4 | D5 | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |
| Puzzle Entropy | 5.60 | 7.40 | 9.20 | 11.40 | 14.40 | 9.60 |
| Skill-Depth | 93.0% | 89.6% | 85.8% | 82.9% | 78.9% | 86.0% |
| Decision Entropy | 0.47 | 0.46 | 0.46 | 0.47 | 0.48 | 0.47 |
| CI Moves | 3.8 | 5.6 | 6.6 | 6.8 | 11.0 | 6.8 |
| Drama | 0.10 | 0.00 | 0.00 | 0.00 | 0.00 | 0.02 |
| Info Gain Ratio | 14.41 | 9.68 | 7.06 | 5.85 | 4.74 | 8.35 |
| Algorithm Alignment | 83.3% | 70.0% | 58.0% | 57.5% | 59.3% | 65.6% |
| Greedy-Optimal Gap | 80.0% | 100.0% | 100.0% | 100.0% | 100.0% | 96.0% |
| Optimal Steps | 14.0 | 20.8 | 28.4 | 34.2 | 42.2 | 27.9 |

**Auto-kill check**: PASSED - all thresholds cleared

**Notes**:
- Decision entropy is low (0.47 bits) because the game has inherently low branching (push/pop/discard, often only 1-2 valid). Strategic depth comes from the push-vs-discard decision at critical moments, not from high branching.
- Greedy (level 2) fails on 96% of puzzles because it never discards -- the stack fills and gets stuck. This validates the spec's "greedy trap" prediction.
- Algorithm alignment is 65.6% -- most moves are literal stack push/pop operations.
- CI moves increase with difficulty (3.8 to 11.0), reflecting more counterintuitive discards needed.
- Drama is low because progress (truck loading) is monotonic -- you never "unload" the truck.

## Play Report

## Decision
