# Pocket Puzzle Lab

This repo adapts Andrej Karpathy's `autoresearch` loop to mobile game design.

The target is not "make another Wordle clone." The target is: capture the product principles that made Wordle sticky, then combine them with the design discipline of the best puzzle games.

Think in the lineage of `Tetris`, `Threes`, `Portal`, `Baba Is You`, `Monument Valley`, and `The Witness`, but scaled down to a small daily mobile game. Physics is allowed.

## Principles

Optimize for these:

1. Anyone can play, regardless of age.
2. The core loop is easy to understand in seconds.
3. Daily streaks and statistics make tomorrow's puzzle matter.
4. The game is easy to learn but hard to master.
5. The game needs one signature moment, toy-like interaction, or surprising behavior that feels fresh in the first 30 seconds.

## Puzzle Canon

Take inspiration from these reference strengths:

- `Tetris`: one core verb, instant readability, infinite improvement
- `Threes`: tiny ruleset, high consequence per move, warm personality, endless "one more run"
- `Portal`: puzzles that teach through play instead of manuals, with clear setup and payoff
- `Baba Is You`: surprising recombination from a very small rule vocabulary
- `Monument Valley`: touch-friendly elegance, striking presentation, and puzzles that feel like toys
- `The Witness`: a single input language that keeps unfolding into deeper pattern recognition

Steal the structure, not the scope.

Do not accidentally aim for:

- a 10-hour campaign
- a lore-heavy prestige puzzle game
- a content-hungry level factory
- a mechanic that only becomes interesting after many tutorials

Aim for a compact, phone-native daily game that distills the strongest lessons from those classics into something immediately playable.

## Fun Filter

Do not confuse "clean" with "fun."

A concept is not good enough just because it is:

- readable
- low-risk
- family-friendly
- easy to score well

Prefer concepts that have at least one of these qualities:

- a mechanic that teaches itself by the second or third move
- tactile and satisfying interactions
- a clear "one more try" feeling
- a charming fantasy or toy-like premise
- a surprising interaction or aha moment
- a visible skill ceiling that players will want to chase
- a board state that looks interesting from a screenshot

Discard concepts that feel generic, joyless, or over-optimized for the evaluator even if they slightly improve the score.

## Setup

To start a new autonomous design run:

1. Agree on a run tag based on today's date, for example `mar29`.
2. Create a branch named `game-lab/<tag>` from the current mainline branch.
3. Read these in-scope files:
   - `README.md`
   - `program.md`
   - `game-lab.json`
   - `scripts/evaluate-game-lab.mjs`
   - `App.tsx`
   - `src/gameLab.ts`
   - `src/playerStats.ts`
   - `src/GameLabScreen.tsx`
4. Run `npm run init:results` if `results.tsv` does not exist yet.
5. Establish the baseline with:
   - `npm run evaluate:ideas > run.log 2>&1`
   - `npm run typecheck`
6. Confirm the shell is healthy, then start iterating.

## What Is Mutable

Default to editing `game-lab.json`, but do not treat that as a hard prison.

You may also edit the playable shell when the current prototype format is blocking a clearly stronger game idea.

Keep the write scope small and intentional. Prefer one of these two modes:

- concept search mode: edit `game-lab.json` only
- prototype expansion mode: edit `game-lab.json` plus the minimum shell files needed to make one stronger concept actually playable

That file defines:

- candidate concepts
- the currently selected concept
- descriptive metadata
- whichever concept currently has playable prototype data

In a no-human loop, unsupported or non-playable concepts are informational only. They should score badly until they expose measurable prototype data.

If you enter prototype expansion mode, the allowed implementation surface is:

- `src/gameLab.ts`
- `src/GameLabScreen.tsx`
- `src/playerStats.ts`
- small new helper modules under `src/`

## What Is Fixed

Keep these fixed unless the human explicitly asks otherwise:

- `scripts/evaluate-game-lab.mjs`
- `App.tsx`
- `package.json`

The evaluator should stay fixed during a run. The prototype shell can evolve when necessary to unlock a better mechanic.

## Objective

Use `selected_score` as a compass, not as the goal.

The actual goal is to find a game that is:

- immediately understandable
- meaningfully replayable tomorrow
- more fun after 10 rounds than after 1 round
- distinct enough that a player could describe its hook in one sentence
- strong enough that players can imagine getting better at it for weeks

Keep high-scoring concepts only if the score comes from measurable puzzle strength rather than inflated metadata.

The score now comes from prototype analysis, not hand-authored fun claims.

It rewards:

- solvable boards
- optimal solutions in a short but non-trivial move band
- tight par values
- a readable first move with a small number of improving actions
- snap potential, where one move can meaningfully extend the route
- board density and solution coverage that read well on a phone
- a low solved-state ratio, so the puzzle is not trivial
- puzzle variety across the daily set

It penalizes:

- concepts without a playable prototype
- unsupported prototype formats
- impossible par values
- unsolved or broken boards
- prototype formats that exceed the current shell's practical complexity

Do not game the evaluator with fake metadata. If the loop cannot measure it from a playable prototype, it does not count yet.

## Design Heuristics

Bias toward ideas with:

- one dominant toy-like verb: drop, bounce, rotate, merge, slide, stack, cut, herd, route
- board states that read instantly on a phone-sized screen
- outcomes that are visually legible without reading
- short runs with score or efficiency mastery
- moves that create both short-term tactics and long-term consequences
- rules that can combine into surprising outcomes instead of staying flat
- failure states that teach something and invite an immediate retry
- enough systemic behavior that small improvements in skill feel meaningful
- audiovisual response that makes touching the puzzle pleasant even before mastery
- a mechanic that can support daily remixing without needing a huge content budget

Avoid ideas that rely on:

- trivia, spelling, or niche knowledge
- long explanations
- multi-step UI setup before the first interesting action
- opaque gotchas or hidden rules that the player could not reasonably infer
- desktop-style precision, camera control, or interface friction that fights touch input
- too many verbs competing for attention in the first session
- campaign-scale content volume before the mechanic gets interesting
- mastery that comes only from patience instead of skill
- stat screens trying to compensate for a weak core loop

## Reference Questions

Before you get attached to a concept, ask:

- would a new player understand the first move almost as fast as `Tetris` or `Threes`?
- does the mechanic allow at least one surprising interaction in the spirit of `Portal` or `Baba Is You`?
- would the board still look intriguing in a static screenshot?
- does the interaction feel good enough that a player may toy with it even after failing?
- can the idea stay compelling in a tiny daily format instead of depending on campaign scope?

If the answer is "no" to most of these, keep searching.

## Automated Metrics

The evaluator is deliberately mechanical.

For `path-shift` prototypes it measures:

- solvability inside a bounded search horizon around the starting board
- optimal move count from the actual starting board
- `parMoves - optimalMoves`
- how many first actions improve distance to the nearest solved state
- how many distinct first states the controls produce
- how much the best first move extends the visible route
- non-dot tile density on the starting board
- nearest-solution route coverage
- solved-state ratio inside the explored neighborhood
- variety across the puzzle set

This means there is no human checkpoint in the loop. If a concept is only described in words, the scorer should treat it as weak evidence.

## Pre-Score Validation

Before scoring any change, first verify that the game still works.

There are no formal automated gameplay tests in this repo yet, so use this validation sequence:

1. Run `npm run typecheck`
2. Run `npx expo export --platform web`
3. If the change touched the playable shell or puzzle data, confirm the app still loads and the core input loop is not obviously broken.

If validation fails, do not score the idea yet. Fix the issue first or discard the change.

## Experiment Loop

Loop until the user stops you:

1. Inspect the current branch and commit.
2. Choose either concept search mode or prototype expansion mode.
3. Make one concrete change that should improve fun, not just score.
4. If you changed the prototype shell, keep the implementation minimal and focused on the new interaction.
5. Run the pre-score validation sequence above.
6. Only after validation passes, run `npm run evaluate:ideas > run.log 2>&1`
7. Read the summary with `grep "^selected_score:\|^selected_game:\|^best_game:\|^selected_rank:" run.log`
8. Inspect the evaluator output for the real reason a concept moved:
   - are all puzzles solvable?
   - is `par_gap` non-negative and reasonably tight?
   - does `first` indicate at least one improving move without becoming mushy?
   - is `snap` positive?
   - is `solved` low enough that the board is not trivial?
9. Keep the change only if validation passed and the automated metrics improved in a meaningful direction.
10. Revert changes that are buggy, flat, confusing, generic, or only cosmetically different.
11. Record the attempt in `results.tsv` with tab-separated columns:
   - `commit`
   - `score`
   - `selected_game`
   - `status`
   - `description`
   - optionally append a short note like `fun=high`, `clarity=medium`, or `retry=strong`

## Status Values

Use:

- `keep` for ideas that improve the game, not just the score
- `discard` for valid but flat, generic, confusing, or non-improving ideas
- `crash` for invalid JSON or typecheck failures

## No Human Gate

There is no required human review step in this loop.

The tradeoff is strict:

- if the evaluator cannot score a quality automatically, the loop should not pretend that quality is proven
- if a concept needs human interpretation to survive, it is not ready for autonomous selection yet
- the right fix is usually a stronger measurable prototype, not a nicer description
