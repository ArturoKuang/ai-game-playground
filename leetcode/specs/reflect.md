# Reflect

**Algorithm Target**: 1.2 Two Pointers -- "Two ends converging is O(n), not O(n^2) -- early-exit on mismatch saves even more."

**Status**: prototype

## Rules

Face-down tile rows appear one at a time. Reveal tiles (1 energy each) to determine if the sequence is a palindrome. Classify each row as "Mirror" (palindrome) or "Break" (not palindrome) before your shared energy budget runs out. Wrong classification costs 3 energy penalty.

## Algorithm-Mechanic Mapping

| Algorithm Step | Game Mechanic |
|---|---|
| Two-pointer init (left=0, right=n-1) | Reveal left + right tiles |
| Early exit (if s[left]!=s[right]: return false) | Mismatch found -> press Break |
| Converge inward (left++; right--) | Match found -> reveal next pair |
| Skip non-alphanumeric | Skip noise tiles (gray) |

## Difficulty Progression

| Level | Rounds | Tiles/Row | Noise/Row | Budget |
|---|---|---|---|---|
| D1 | 3 | 5 | 0 | 16 |
| D2 | 3 | 7 | 1 | 22 |
| D3 | 4 | 9 | 2 | 26 |
| D4 | 5 | 9 | 2 | 32 |
| D5 | 6 | 11 | 3 | 50 |

## Puzzle Generation

- ~50% of rounds are palindromes, ~50% not (Fisher-Yates shuffled)
- Non-palindromes have mismatches at varying depths (some at first pair for early-exit, some deeper)
- Value tiles use colored emoji shapes: red, blue, green, yellow, purple, orange
- Noise tiles display as (null symbol) in gray once revealed

## Solver Skill Levels

- L1 (random): Reveal random tiles, classify randomly
- L2 (sequential -- strongest wrong strategy): Reveal all tiles left-to-right, then classify
- L3 (sequential + early classify): Same as L2 but classifies based on what is seen
- L4 (two-pointer no early exit): Reveal from both ends, always checks all pairs, also reveals noise
- L5 (optimal two-pointer): Reveal from both ends, early-exit on mismatch, skip noise tiles

## Solver Metrics (5 seeds/difficulty)

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Solvability (L5) | 100% all D | 100% | PASS |
| Efficiency Gap (D3) | 26.2% | >= 20% | PASS |
| Wasted Work Ratio (D3) | 35.4% | >= 30% | PASS |
| Difficulty Breakpoint | D3 | D3-D4 | PASS |
| Decision Density (D3) | 100.0% | > 60% | PASS |
| Algorithm Alignment (D3) | 100.0% | >= 90% | PASS |

### L2 Win Rates

| D1 | D2 | D3 | D4 | D5 |
|---|---|---|---|---|
| 100% | 100% | 20% | 60% | 60% |

### L5 Win Rates

| D1 | D2 | D3 | D4 | D5 |
|---|---|---|---|---|
| 100% | 100% | 100% | 100% | 100% |

## Game Feel

- Accent color: #c084fc (lavender)
- Tile reveal: spring scale animation on tap
- Correct classification: brief green flash
- Wrong classification: shake + red flash, -3 energy penalty
- Win: WinOverlay with CelebrationBurst

## LeetCode Problems

| # | Title | Connection |
|---|---|---|
| 125 | Valid Palindrome | Revealing from both ends and skipping noise mirrors two-pointer palindrome check with non-alphanumeric skip |
| 15 | 3Sum | 3Sum fixes one element then converges two pointers based on sum comparison — the inner convergence IS Reflect reveal-from-both-ends. Dedicated game (Equilibrium) killed: sum-guided L2 inner loop identical to L5 |
| 11 | Container With Most Water | Two pointers from both ends, moving the shorter/weaker side inward mirrors Reflect reveal-from-both-ends with early-exit |