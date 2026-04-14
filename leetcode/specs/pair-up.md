# Pair Up

## Algorithm Target
1.5 Hash Map
Trade space for time - precompute to avoid re-scanning.

## Rules
Face-down number tiles; flip one per turn (costs a move). Tap a revealed tile to stamp it into your registry. If the complement of a stamped value appears, the pair auto-matches.

## Mechanic Type
Optimization

## Algorithm-Mechanic Mapping
- **Flip -> Array access**: Each flip reveals one value, like reading arr[i].
- **Stamp -> Hash map insert**: Saving a value to the registry is map.set(value, index).
- **Auto-pair -> Complement lookup**: When you stamp and the complement exists, that is map.has(target - value).
- **Why the strongest plausible wrong strategy fails**: A player who memorizes tiles but never stamps runs out of moves re-flipping. STM (3 tiles) vs. persistent registry creates the efficiency gap.
- **The aha moment**: Realizing that stamping every tile gives you a permanent lookup table, so you never waste flips re-finding values.

## Why It Works

### Algorithm Emergence Test
Optimal play IS the two-sum algorithm: for each new value, check if target-value is in the registry, then stamp. The registry is literally a hash map.

### Wrong Strategy Trap Test
Players who rely on memory (no stamps) hit the wall at D3 (12 tiles, 4 pairs needed). STM of 3 tiles cannot track enough complements. L2 win rate drops from 90% at D2 to 60% at D3.

### Stare Test
All tiles are face-down. You cannot plan which pairs exist until you flip. Each flip reveals new information that changes your decision.

### Transferability Test
Directly builds intuition for LeetCode #1 Two Sum, #49 Group Anagrams, #217 Contains Duplicate, and any problem requiring O(1) lookup via hash map.

### Not a Quiz Test
No algorithm terminology during play. The registry is presented as a "stamp board" - a visual workspace. The connection to hash maps is revealed only on win.

## Predicted Failure Mode
Player forgets to stamp and relies on re-flipping. Budget runs out at D3+.

## Expected Metrics

### Algorithm Gate
| Gate | Prediction | Reasoning |
|---|---|---|
| Structural Fit | PASS | board->array, flip->access, stamp->insert, win->all pairs found |
| Difficulty Breakpoint | D3 | 12 tiles exceed STM capacity of 3 |
| Efficiency Gap (L5 vs L2) | 65% | L5 never re-flips; L2 wastes ~2x flips |
| Wasted Work Ratio | 187% | L2 uses nearly 3x as many flips at D3 |
| Difficulty Scaling | monotonic | [1.0, 0.9, 0.6, 0.2, 0.0] - clean decline |

### Fun Gate
| Gate | Prediction | Reasoning |
|---|---|---|
| Comprehension Speed | 2-3 moves | Flip/stamp/pair is intuitive after first pair |
| Decision Density | 72% | Every flip and stamp/skip is a real decision |
| Replay Pull | 4/5 | Different targets and tile layouts each game |
| Best Moment Intensity | 4/5 | Complement-found auto-pair feels great |

## Difficulty Progression
- **Level 1-2 (Easy)**: 6-8 tiles, 2 pairs. Memory alone can handle it.
- **Level 3-4 (Medium)**: 12-16 tiles, 4-5 pairs. Must stamp consistently.
- **Level 5 (Hard)**: 20 tiles, 6 pairs. Full hash map strategy required.

## Player Experience
D1-D2: "I can just remember where things are." D3: "Wait, I keep losing track..." D3+: "Oh! If I stamp everything, I never need to re-flip!" D5: "This is like building a lookup table."

## Difficulty Knobs
- Tile count (6-20) and pairs needed (2-6) - linked, more tiles = more to track
- Move budget (30-36) - tighter budgets punish re-flipping harder

## Game Feel

### Accent Color
#60a5fa - sky blue (Hash Map family)

### Signature Animation
Complement-found pulse: when you stamp a tile and its complement is already in the registry, both tiles pulse with a golden glow before sliding together and turning green. This is the hash map "hit" moment.

### Player Description
Pair Up is a number-matching puzzle. Flip face-down tiles to reveal values, then stamp them to your registry. Find all pairs that sum to the target before you run out of flips. Teaches the hash map pattern from coding interviews.

---

## Solver Metrics

Run: 2026-04-12

| Metric | Value |
|---|---|
| Efficiency Gap | 65.1% |
| Wasted Work | 186.6% |
| Decision Density | 72% |
| L2 Win Rates | [1.0, 0.9, 0.6, 0.2, 0.0] |
| Breakpoint | D3 |

## Play Report

## Decision
