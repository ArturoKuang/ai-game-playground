# Pocket Puzzle Lab

This repo experiments with a Karpathy-style `autoresearch` loop, but for casual mobile game design instead of model training.

The goal is not to make a Wordle copy. The goal is to design daily games that reuse the product strengths behind Wordle's popularity:

- anyone can play
- the rules land quickly
- streaks and statistics create a daily habit
- the game is easy to learn but hard to master

Any 2D puzzle format is allowed. Physics-driven ideas are allowed too.

## Repo Shape

The project keeps the same shape as `karpathy/autoresearch`:

- `game-lab.json` is the only file the autonomous loop is supposed to edit
- `scripts/evaluate-game-lab.mjs` is the fixed scoring harness
- `src/GameLabScreen.tsx` is the fixed React Native shell
- `src/playerStats.ts` stores local streak and performance data
- `program.md` defines the loop

## Current Prototype

The active concept is currently `Trail Weaver`, a daily 2D route-building puzzle:

- tap a row arrow to shift that row right
- tap a column arrow to shift that column down
- connect the left gate to the right goal
- chase a lower move count for mastery

The wider concept pool is intentionally broader than that one prototype and includes physics-lite ideas such as `Gravity Grove`.

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Initialize the results log:

   ```bash
   npm run init:results
   ```

3. Score the current concepts:

   ```bash
   npm run evaluate:ideas
   ```

   The evaluator is prototype-first. Concepts without a supported playable prototype are intentionally scored badly because the loop has no human fallback.

4. Verify the fixed shell still typechecks:

   ```bash
   npm run typecheck
   ```

5. Run the prototype:

   ```bash
   npm run web
   ```

   You can also use `npm run ios` or `npm run android`.

## Iteration Model

During the autonomous loop, the agent should only modify `game-lab.json`.

That file controls:

- which concept is selected
- descriptive metadata for the concept cards
- whichever concept currently has playable daily board data

The fixed shell then renders the selected concept, today's puzzle, and the local streak statistics.

The evaluator no longer trusts hand-authored fun scores. For `path-shift` prototypes it scores measurable properties such as solvability, optimal solution depth, par tightness, first-move signal, snap potential, solved-state density, and puzzle variety.
