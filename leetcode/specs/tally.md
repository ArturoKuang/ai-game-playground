# Tally

## Concept

**Algorithm**: Hash Map (Frequency Counting)
**LeetCode**: #242 Valid Anagram, #49 Group Anagrams
**Tier**: 1

## Rules

Two rows of face-down emoji tiles (Shelf A and Shelf B). Flip a tile to discover its type,
then tally (tap again) to reveal and count ALL items of that type across both rows.
Verify the inventory matches before you run out of flips.

### Tile States
- **hidden**: face-down, can be flipped
- **revealed**: face-up, shows emoji. Can be tallied. Goes back to hidden if another tile is flipped without tallying.
- **counted**: permanently face-up. Green if counts matched, red if mismatched.

### Core Mechanic
1. **Flip** (1 move): Tap a hidden tile to reveal it. If another tile was previously revealed (not tallied), it goes back to hidden.
2. **Tally** (0 moves): Tap a revealed tile again to tally. ALL tiles of that type on BOTH rows simultaneously reveal and get permanently marked as counted.
3. **Win conditions**:
   - All types tallied and all counts match: WIN ("Same inventory!")
   - A type is tallied and counts do not match: WIN ("Found the difference!")
4. **Lose condition**: Move budget exhausted before all types resolved.

### Puzzle Types
~50% of puzzles are "matches" (same distribution), ~50% are "mismatches" (one type differs by 1-2).

## Mechanic Mapping

| Game | Algorithm |
|------|-----------|
| Shelf tiles | Input characters/elements |
| Tally a type | Build frequency map entry |
| Compare A vs B counts | Compare frequency maps |

## Difficulty Table

| D | tiles/row | types | moveBudget |
|---|-----------|-------|------------|
| 1 | 4 | 2 | 6 |
| 2 | 6 | 3 | 7 |
| 3 | 10 | 5 | 8 |
| 4 | 14 | 6 | 7 |
| 5 | 18 | 8 | 9 |

## Solver Levels

- **L1** (Random): Flip random tiles. Never tally.
- **L2** (STM Explorer): Flip randomly. Tally if type matches one in short-term memory (STM=3). FIFO evict.
- **L3** (Partial): Tally 50% of the time after flipping.
- **L4** (Always Tally): Always tally after flipping. Random tile selection.
- **L5** (Optimal): Flip one tile of each undiscovered type. Immediately tally. Uses exactly k flips.

## Solver Metrics

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Solvability | 100% | 100% | PASS |
| Efficiency Gap | 45.7% | >= 20% | PASS |
| Wasted Work | 84.2% | >= 30% | PASS |
| Decision Density | 0.70 | > 60% | PASS |
| Breakpoint | D3 | D3-D4 | PASS |
| L2 Win Rates | [1.0, 1.0, 0.4, 0.2, 0.2] | monotonic | PASS |

## Play Report

(To be filled after playtesting)

## Decision

(To be filled after review)