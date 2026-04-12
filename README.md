# Algorithm Arcade

Puzzle games that teach algorithm and data structure concepts through play. Each game maps to a coding interview topic (binary search, BFS, dynamic programming, etc.) — players learn the intuition by playing, then see the connection after winning.

Built with React Native (Expo) for web and mobile.

## Quick Start

```bash
npm install
npm start        # starts Expo dev server
```

Then press `w` for web or scan the QR code for mobile.

## How It Works

Games are designed through an automated three-agent loop (Designer, Engineer, Playtester) orchestrated by Claude Code. Each game goes through concept design, prototyping with solver-based quality metrics, and blind playtesting before shipping.

The curriculum covers 20 algorithm topics across 4 tiers:

| Tier | Topics |
|------|--------|
| 1 — Foundations | Binary Search, Two Pointers, Stack, Sliding Window, Hash Map |
| 2 — Data Structures | Heap, BFS, DFS/Backtracking, Trie, Monotonic Stack |
| 3 — Patterns | 1D DP, Greedy, Topological Sort, Union-Find, Binary Search on Answer |
| 4 — Advanced | 2D DP, Dijkstra, Interval Scheduling, Divide & Conquer, Bit Manipulation |

## Project Structure

- `src/games/` — one self-contained file per game, registered in `index.ts`
- `src/solvers/` — pure-logic solvers for quality metrics
- `src/components/` — shared UI (GameScreenTemplate, Tile, MoveCounter, etc.)
- `leetcode/` — design loop prompts, curriculum, specs, and experiment log
- `memory/` — SQLite-backed memory system for tracking design cycles
- `tools/` — CLI tools for memory, playtesting, and automation

## Adding a Game

Games are created through the design loop — see `run-program.md` to get started, or run:

```
/loop "Read run-program.md. Find the first unchecked problem. Run one cycle from leetcode/program.md."
```

See `CLAUDE.md` for full design process documentation and quality gates.
