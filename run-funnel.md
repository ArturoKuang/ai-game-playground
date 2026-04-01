# Run the Design Funnel

**Usage**: Tell Claude Code: `"Follow run-funnel.md. Run N cycles."` (default: 3 cycles)

This is a fully autonomous runbook. No human input required. Each cycle takes one batch of concepts from brainstorm through keep/iterate/kill.

---

## Pre-Flight

1. Read `program.md` to understand the funnel structure.
2. Verify the dev server is running (or start it): `npx expo start --web`
3. Note the current git branch and HEAD commit for the log.

---

## One Cycle

### Phase 1: Design

Spawn a **Designer agent** (`subagent_type: "general-purpose"`):

**Prompt:**
> You are the Designer agent. Read and internalize `prompts/designer.md` — that is your identity and process.
>
> Then read `learnings.md` and `results.tsv` to know what's been tried.
> Read any existing specs in `specs/` (skip `_template.md`).
>
> Brainstorm 5-8 new game concepts. Filter each through the three litmus tests (Dominant Strategy, Stare Test, Mechanical Family). Be ruthless — kill anything that fails.
>
> For the 2-3 survivors, write spec files to `specs/<game-name>.md` using the template in `prompts/designer.md`. Use the `Write` tool to create the files.
>
> Return the list of spec filenames you created.

Collect the list of spec filenames from the agent's response.

### Phase 2: Engineer (parallel)

For **each** spec file, spawn an **Engineer agent** in an **isolated worktree** (`isolation: "worktree"`):

**Prompt:**
> You are the Engineer agent. Read and internalize `prompts/engineer.md` — that is your identity and process.
>
> Your assigned spec is `specs/<GAME_NAME>.md`. Read it.
>
> 1. Build the prototype in `src/games/<GameName>.tsx` following existing game patterns in `src/games/`.
> 2. Build the solver in `src/solvers/<GameName>.solver.ts`.
> 3. Run `npx tsc --noEmit` to verify compilation.
> 4. Compute quality metrics per the spec (5 puzzles, 5 skill levels).
> 5. Check auto-kill thresholds. If ANY threshold is met, mark as auto-killed.
> 6. Append the `## Solver Metrics` section to the spec file with raw numbers.
> 7. Commit: `git add -A && git commit -m "prototype: <GameName> — <mechanic>"`
>
> Return: the game name, whether it was auto-killed or passed, and the key metrics (entropy, skill-depth, counterintuitive moves).

Run all engineer agents **in parallel**. Wait for all to complete.

Collect results. For any auto-killed games, note them — they skip playtesting.

### Phase 3: Merge Engineer Work

For each engineer that produced changes (not auto-killed), merge their worktree branch into the current branch. If there are merge conflicts between parallel engineers, resolve them (game files are independent so conflicts should be rare).

### Phase 4: Playtest (parallel for survivors)

For **each** game that passed auto-kill, spawn a **Playtester agent** (`subagent_type: "general-purpose"`):

**Prompt:**
> You are an independent playtester. Read and internalize `tools/review-prompt.md` — that is your identity and process.
>
> Play the game `<GameName>`. Follow the workflow in your prompt exactly:
> 1. Start the game with `node tools/playtest.mjs start <game_id>`
> 2. Play 3 sessions (intuitive, strategic, exploratory)
> 3. Run the bug check
> 4. Return the full BLIND PLAY REPORT
>
> CRITICAL: Do NOT read any source code. Do NOT read learnings.md or results.tsv. Play blind.

Collect the blind play reports. Append each report to the corresponding spec file under `## Play Report`.

### Phase 5: Designer Decision

Spawn the **Designer agent** again:

**Prompt:**
> You are the Designer agent. Read and internalize `prompts/designer.md`.
>
> Decision round. For each spec in `specs/` that has BOTH a `## Solver Metrics` section AND a `## Play Report` section but does NOT yet have a `## Decision` section:
>
> 1. Read the full spec (your original design + metrics + play report).
> 2. Decide: KEEP, ITERATE, or KILL per the criteria in your prompt.
> 3. Append a `## Decision` section to the spec with your verdict and reasoning.
> 4. For KILL: write a 1-line entry for `results.tsv` with the metrics and status.
> 5. For ITERATE: revise the spec (update rules, player experience, difficulty knobs) and explain what to change and why. Do NOT touch the metrics or play report sections.
> 6. For KEEP: note it for the polish phase.
>
> Also handle any auto-killed specs (those with metrics but no play report): read the metrics, confirm the kill, append a Decision section, and log to results.tsv.
>
> Return: for each spec, the game name, decision (keep/iterate/kill), and one-sentence reason.

### Phase 6: Handle Decisions

Based on designer decisions:

**For ITERATE specs** (max 3 iterations per concept):
- Check how many times this spec has been iterated (count `## Decision` sections or iteration markers).
- If < 3 iterations: go back to Phase 2 for this spec only (spawn engineer with the revised spec).
- If >= 3 iterations: force-kill it, log to results.tsv.

**For KEEP specs**:
- Spawn an engineer agent for the polish pass:

> You are the Engineer agent. Read `prompts/engineer.md`.
>
> The game `specs/<game-name>.md` has been marked KEEP. Do the polish pass:
> 1. Add day-of-week difficulty scaling using the difficulty knobs in the spec.
> 2. Add share text (iconic emoji grid).
> 3. Integrate stats via `src/utils/stats.ts`.
> 4. Refine animations.
> 5. Re-run metrics to verify polish didn't break depth.
> 6. Run the 9-point bug check.
> 7. Commit: `git add -A && git commit -m "polish: <GameName> — <what was added>"`

- Then spawn a final playtester for a polish review.
- If the final review is positive and metrics hold: **mark the spec as FROZEN** and add the game to the frozen list in `program.md`.

**For KILL specs**: already logged. Move on.

### Phase 7: Log

After all decisions are resolved for this cycle:

1. Ensure all results are in `results.tsv`.
2. If any experiment revealed a genuinely new reusable insight not in `learnings.md`, update it.
3. Log a summary: how many concepts brainstormed, how many survived filtering, how many auto-killed, how many playtested, how many kept.

---

## Repeat

That's one cycle. Go back to Phase 1 for the next cycle. Run as many cycles as requested.

Between cycles, briefly review: are specs accumulating in `specs/` without decisions? Clean up any loose ends before starting a new batch.

---

## Error Handling

- If the dev server isn't running and playtesting fails, skip Phase 4 and note it. The designer can still decide based on metrics alone (with lower confidence).
- If an engineer agent fails to compile, mark that spec as FAILED and include the compiler error in the spec. Designer treats it as an auto-kill.
- If a playtester agent can't interact with the game (crashes, blank screen), record the bug in the spec. Designer decides based on metrics + bug severity.
- If a merge conflict occurs between parallel engineer worktrees, resolve by keeping both games (they should be in separate files).

---

## Session Summary

At the end of all cycles, print a summary:

```
FUNNEL SESSION SUMMARY
======================
Cycles run: N
Concepts brainstormed: X
Specs written: Y
Auto-killed (metrics): Z
Playtested: W
Kept: K
Killed (designer): D
Iterating: I

New frozen games: <list or "none">

Best prospect: <game name> — <why>
```
