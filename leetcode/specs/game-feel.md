# Game Feel & Polish Specification

This document defines the fun, polish, and animation standards for every algorithm game. Read this alongside the engineer and designer prompts.

---

## Core Principle

> **A game is fun enough when the player's optimal move produces a visibly disproportionate effect on the board, and that effect is animated in a way that feels rewarding.**

The algorithm IS the force multiplier. When binary search eliminates half the board in one move instead of scanning one-by-one, that efficiency gap should feel like a cascade — the board responding with more than you put in.

> **If the player has to wait for an animation to finish before they can think about their next move, it's too much.**

Animations reinforce what just happened. They never compete for attention or block flow.

---

## Fun References

These games define the quality bar:

| Game | Why it's compulsive | The dopamine moment |
|---|---|---|
| **Candy Crush** | Chain reactions cascade beyond what you planned | 3 combos triggering in sequence from one swap |
| **2048** | Merges feel inevitable-but-surprising, big numbers = achievement | Two 512s merging into 1024 |
| **Wordle** | Constraints tighten with each guess, you feel yourself narrowing in | Green tile on an uncertain letter |
| **Connections** | The group "clicks" all at once after staring | Getting the purple (hardest) group |
| **Threes** | Every slide has consequences you didn't fully predict | A multi-merge chain from one swipe |

Common thread: **the game gives back MORE than you put in.** One action triggers a response that feels bigger than the input.

---

## Keep/Ship Gate

A game must pass BOTH gates to ship.

### Algorithm Gate (all must pass)

| # | Gate | Threshold | Source |
|---|---|---|---|
| A1 | **Structural Fit** | Board maps to problem input, moves map to algorithm operations, win maps to problem goal — all three yes | Engineer judgment, binary |
| A2 | **Difficulty Breakpoint** | Wrong strategy fails by D3-D4 | Solver |
| A3 | **Efficiency Gap** | L5 (optimal) outperforms L2 (strongest wrong strategy) by ≥ 20% | Solver |
| A4 | **Wasted Work Ratio** | L2 spends ≥ 30% more moves than L5 at D3 | Solver |
| A5 | **Difficulty Scaling** | L2 win rate drops monotonically D1→D5 | Solver |
| A6 | **Strategy Match** | Playtester's evolved strategy matches target algorithm in plain English | Playtester report |

### Fun Gate (all must pass)

| # | Gate | Threshold | Source |
|---|---|---|---|
| F1 | **Comprehension Speed** | ≤ 5 moves to understand rules | Playtester |
| F2 | **Dead Moments** | 0 unresponsive taps | Playtester |
| F3 | **Confusion Count** | ≤ 2 moments of genuine confusion | Playtester |
| F4 | **Strategy Shift** | ≥ 1 shift between D1 and D3 | Playtester |
| F5 | **Replay Pull** | ≥ 3/5 ("Would you immediately play again?") | Playtester |
| F6 | **Best Moment Intensity** | ≥ 3/5 ("How satisfying was your peak moment?") | Playtester |
| F7 | **Decision Density** | > 60% of moves have ≥ 2 meaningful options | Solver |
| F8 | **Juice Checklist** | 8/8 items from the checklist below | Engineer |

### Optional Diagnostics (not gates)

These are available for debugging but do not block ship decisions:
- **Algorithm Alignment** — % of L5 moves matching target algorithm pattern
- **Counterintuitive Moves** — steps where heuristic worsens in optimal path
- **Solvability** — sanity check, should always be 100%

### Ship Decision Flow

```
Pass Algorithm Gate?  ──No──→  Design iteration (rework mechanic)
        │ Yes
Pass Fun Gate?  ──No──→  Polish iteration (more juice, max 2 rounds)
        │ Yes
Ship
```

A game that passes algorithm metrics but fails the fun gate goes back for a polish iteration, not a design iteration. A game that's fun but doesn't teach the algorithm gets redesigned.

---

## Animation Budget

Every action has a budget. Nothing blocks input except the win state.

| Event | Animation | Duration | Blocks input? |
|---|---|---|---|
| Tap a tile | Spring scale (1 → 1.12 → 1) | 150ms | No |
| Valid move result | Affected tiles fade/slide to new state | 250ms | No |
| Wrong move | Tile shakes (±3px, 2 cycles) | 200ms | No |
| Algorithm effect (e.g. half the board eliminated) | Dimmed tiles fade to 30% opacity, remaining tiles subtly brighten | 300ms | No |
| Win | Board settles, then one clean burst + score reveal | 500ms | Yes (game is over) |
| Near-miss (budget exhausted close to goal) | Sympathetic feedback that motivates retry, not punishment | 300ms | Yes (game is over) |
| Budget ticking down | Counter color shifts smoothly (green → yellow → red), no bounce per tick | Continuous | No |
| Difficulty transition | Smooth crossfade to new board, not hard cut | 400ms | Yes (brief) |

---

## Juice Checklist (Minimum for Ship)

Every prototype must ship with ALL of these. No exceptions.

1. **Tap feedback** — every interactive element responds to touch with a spring animation and subtle color flash.
2. **Move result** — affected tiles visibly animate to their new state (slide, fade, bounce, merge). No instant state swaps.
3. **Algorithm effect** — the signature animation plays when the algorithm's advantage becomes visible (see below).
4. **Wrong move feedback** — subtle shake or color shift. Informative, not punishing. The player should understand what went wrong.
5. **Progress indicator** — animated budget/move counter with color transitions. The player always knows how many resources remain.
6. **Win celebration** — CelebrationBurst + score reveal. The board should do one final satisfying animation (tiles clearing, elements settling, etc.).
7. **Color palette** — each game has a distinct accent color. No all-gray boards.
8. **Board readability** — state is visually parseable at a glance. Color, shape, and size all encode meaning. The player shouldn't need to count or calculate to understand the board.

---

## Signature Animations

Every game spec must define ONE signature animation — the moment where the algorithm's effect is most visible and satisfying. This is the Candy Crush cascade equivalent.

### Examples by algorithm family

| Algorithm | Signature animation | What it teaches |
|---|---|---|
| **Binary Search** | Half the board dims/fades in one move, remaining half brightens | Space-halving feels powerful vs. checking one-by-one |
| **Two Pointers** | Two markers visibly slide toward each other from opposite ends | Convergence is O(n), not O(n²) |
| **Sliding Window** | Window edges glow and stretch/shrink smoothly, interior tiles highlighted | "Never restart from scratch" — the window slides, not rebuilds |
| **Hash Map** | Stamped value sends a pulse to all matching values on the board, connecting lines flash briefly | O(1) lookup is instant — you see it reach everything at once |
| **Stack (LIFO)** | Top item pops off with a satisfying eject, revealing what was buried | Most-recent-first processing |
| **BFS** | Frontier ripple expands outward ring-by-ring from the source | Level-by-level exploration |
| **DFS / Backtracking** | Path traces forward, then smoothly rewinds when it hits a dead end | Go deep, fail fast, undo |
| **Dynamic Programming** | Previously solved subproblem glows and auto-fills when encountered again | "You already solved this" — reuse, not recompute |
| **Greedy** | Locally optimal choice highlights with a confident pulse | The obvious move IS correct (when it works) |
| **Topological Sort** | Completed prerequisite fades and unlocks its dependents with a cascade | Process dependencies before dependents |

The signature animation:
- Plays at most once per move (not on every frame)
- Lasts 200-400ms
- Does NOT block input
- Uses the game's accent color
- Makes the efficient path feel visibly different from the brute-force path

---

## Color & Visual Identity

### Per-game accent color

Each game gets its own accent color chosen from a curated palette. The accent is used for:
- Active/selected tiles
- The signature animation
- The progress indicator at healthy levels
- The win celebration

### Background & surface colors (shared)

| Element | Color | Notes |
|---|---|---|
| Screen background | `#0a0a0b` | Near-black, consistent across all games |
| Card / surface | `#141416` | Elevated content areas |
| Board background | `#0a0a0b` | Same as screen, board feels embedded |
| Border | `#1e1e22` | Subtle separation |
| Muted text | `#6b7280` | Secondary info |
| Primary text | `#ffffff` | Game state, scores |

### Tile design principles

- Tiles should have **rounded corners** (borderRadius 8-12) — sharp corners feel harsh.
- Interactive tiles should have **visible depth** (subtle border or shadow) — flat tiles don't invite tapping.
- State changes should use **color transitions**, not instant swaps.
- Distinguish tile states with **both color AND shape/icon** — don't rely on color alone.

---

## Game Description Format

Every game's description (shown on the home screen and in-game) must include three parts:

1. **What it is** — one sentence explaining the game mechanic in plain language. Use a verb the player understands: slide, pop, match, trace, explore.
2. **How to play** — one sentence explaining the goal and the constraint (what you're trying to do and what limits you).
3. **What it teaches** — one sentence connecting the game to the algorithm concept and listing the primary LeetCode problems.

### Example

> **Rift** — Drop probes onto a terrain grid to find the hidden fault line. You have a limited budget of probes, so scan smart: checking the middle eliminates half the terrain at once. Teaches Binary Search (#704, #33, #875).

The player knows exactly what they're getting into. This is pure learning — no need to hide the algorithm.

---

## Playtester Juice Check

After the standard blind play report, the playtester must also answer:

1. **Responsiveness**: Did every tap feel like it registered? Was there ever a dead moment where nothing happened?
2. **Animation quality**: Did animations help you understand what happened, or were they distracting/confusing?
3. **Signature moment**: Was there a moment where the board responded in a way that felt satisfying or surprising? Describe it.
4. **Replay motivation**: After finishing, did you want to play again immediately? Why or why not?
5. **Visual clarity**: Could you always tell what your options were? Was the board ever confusing to read?

---

## Designer Spec Addition

Every spec must include a new section:

```markdown
## Game Feel

### Accent Color
<hex code + name, e.g. "#7bdff2 — arctic blue">

### Signature Animation
<Describe the ONE moment where the algorithm's effect is most visible.
What triggers it, what the player sees, why it feels good.>

### Player Description
<The three-part description: what it is, how to play, what it teaches.>
```

---

## Loop Changes

The design loop adds a polish gate after the standard metrics gate:

```
Design → Build → Metrics gate (algorithm) → Polish pass → Juice playtest → Fun gate → Ship
```

If a game passes metrics but fails the fun gate:
- It goes back for a **polish iteration** (more animation, better colors, clearer feedback)
- NOT a design iteration (the mechanic is sound, the feel is wrong)
- Max 2 polish iterations before killing

If a game passes fun but fails metrics:
- It goes back for a **design iteration** (the mechanic needs rework)
- The fun elements that worked should be preserved in the redesign
