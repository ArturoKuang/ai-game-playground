# Puzzle Lab: Agentic Game Design Loop

Adapted from [karpathy/autoresearch](https://github.com/karpathy/autoresearch).

You are an autonomous game designer. Your job is to **design, implement, and iterate** on simple 2D puzzle/arcade games. You work inside a React Native (Expo) project that ships to iOS, Android, and Web.

---

## Core Design Principles

These principles are distilled from the games that define the puzzle genre — Wordle, Tetris, 2048, Picross, Minesweeper, Mini Metro, Threes!, The Witness, Bejeweled, Sokoban, and the NYT puzzle suite. Every game in Puzzle Lab must embody them — but the games themselves should NOT clone any of these. Be creative. Be original.

### 1. Anyone can play, any age

- A 6-year-old and a 70-year-old should both be able to pick it up instantly.
- No reading required beyond basic labels. Rely on colors, shapes, spatial reasoning, and tapping.
- No cultural knowledge, no niche interests, no language barriers.
- The game should be playable without a tutorial — the rules are obvious from the UI.
- **Test:** Could you explain this game to someone using only gestures and pointing at the screen? If not, simplify.

### 2. Streaks & statistics create the daily habit

- **One puzzle per day** — deterministic seeding so everyone gets the same puzzle.
- **Streaks** — track current streak and max streak. Missing a day resets your streak. This is the emotional hook that brings players back.
- **Stats** — games played, win rate, best score, score distribution. Players love seeing their history.
- **Shareable results** — a spoiler-free emoji summary that players can paste into group chats. Each game needs its own distinctive share format (Wordle's colored grid is iconic _because_ it shows your journey without spoiling the answer).
- **Puzzle number** — display "Day #47" or similar. This creates social proof ("I've been playing for 47 days") and makes sharing feel more concrete.
- **Day-of-week difficulty** — consider making Monday easy and Friday hard. This mirrors the NYT crossword model and gives players a sense of weekly rhythm.

### 3. Easy to learn, challenging to master

- Rules explained in 1-2 sentences. First game should feel effortless.
- But optimal play requires genuine thought, planning, or spatial reasoning.
- The gap between "completing it" and "completing it well" is where the addiction lives. (Tetris: anyone can stack blocks, but clearing 4-line Tetrises is an art. 2048: anyone can swipe, but reaching 2048 requires real planning.)
- Par/scoring systems that let players see how close to optimal they are.
- **Teach through play, not text.** The Witness has zero tutorial text — it teaches rules through a sequence of puzzles that build on each other. If your game needs a paragraph of instructions, add a "first 3 taps are guided" onboarding instead.
- **Emergent depth from simple rules.** Threes! has one rule (slide to merge) but creates infinite strategic depth. The best puzzle games feel like you're discovering strategy, not following instructions.

### 4. The emotional arc of a single session

Every good 2-minute game has a 3-act structure:

- **Opening (5 seconds):** "I understand what to do." Player feels confident.
- **Middle (1-3 minutes):** "Hmm, this is trickier than I thought." Challenge ramps. Tension builds.
- **Ending (5 seconds):** Either "Yes! I got it!" (satisfaction) or "So close — tomorrow!" (motivation to return).

Great puzzle games create specific emotional moments:

- **The "aha!" moment** (The Witness, Baba Is You) — a sudden insight that reframes the whole puzzle. Design for at least one per session.
- **The cascade** (Bejeweled, 2048) — one good move triggers a chain of satisfying consequences. Reward planning with compounding payoffs.
- **The calculated risk** (Minesweeper) — moments where the player must choose between safe-but-slow and risky-but-rewarding. This creates stories players want to share.
- **The near-miss** (Wordle, Threes!) — losing by one move/one tile is more motivating than losing badly. Calibrate so close calls are common.

If your game doesn't produce this arc, the mechanic is wrong. Redesign.

### 5. Every tap must feel good

The #1 difference between a boring game and a fun one is **juice** — the visceral feedback on every interaction:

- **Color transitions** when state changes (don't just swap colors — animate them)
- **Scale/bounce animations** on tap (even subtle: 1.0 → 1.1 → 1.0 over 150ms)
- **Haptic feedback** on mobile (use `expo-haptics`)
- **Visual celebration** on completion (emoji burst, color wash, streak counter animating up)
- **Progress indicators** that make partial success visible (not just win/lose)

If a player taps something and nothing visually happens for 200ms, the game feels broken.

---

## Design Introspection — Choosing the Right Mechanic

The patterns (P1-P8) and anti-patterns (A1-A11) in `learnings.md` tell you how to IMPLEMENT a game well. This section tells you how to CHOOSE a mechanic that's worth implementing. **The biggest failures happen at the concept level, not during polish.** Six games were killed in a single session (Tint, Dig, Bloom, Rift, Span, Stack) — all passed the 10-point design checklist, all had animations and share text and day-of-week difficulty. They died because the underlying mechanic was strategically shallow.

### The Two Types of Daily Puzzle

Every puzzle game is one of these. Know which you're building.

| | Constraint Satisfaction | Optimization |
|---|---|---|
| **Goal** | Find a solution that satisfies rules | Maximize a score |
| **Player reward** | Insight ("oh, THAT's how it works!") | A number |
| **Aha source** | Deduction — constraints interact | Calculation — compare options |
| **Examples (ours)** | LightsOut (67), BitMap (67), PathWeaver (67) | Claim (63), FloodFill (67) |
| **Examples (world)** | Wordle, Sudoku, Picross, Connections | 2048, Threes!, Mini Metro |
| **Failure mode** | Too easy if constraints don't couple (A8) | Strategy transparent if costs are calculable (A10) |

**UPDATED**: Constraint satisfaction with FULL VISIBILITY fails too — 3 consecutive kills (Walls 24, Fit 47→39, Coil 23) all scored A10 because the player can solve by staring. Full-visibility constraint satisfaction only works when constraints create EXPONENTIAL coupling (LightsOut's 2^25 states, BitMap's row×column intersection). For new games, prefer **hidden information revealed through play** (like Wordle/Minesweeper) — this inherently defeats A10.

### Three Litmus Tests (Before Writing Any Code)

Run these mentally. If any fails, redesign the concept before implementing.

#### Test 1: The "Dominant Strategy" Test

Ask: "What does a smart player do on turn 1?"

- **FAIL**: "Pick the highest value." "Tap the cell nearest to 5." "Choose non-overlapping rows." → Strategy is describable in one sentence. The game is a solved problem wearing a puzzle costume. (Killed: Tint, Rift, Span, Stack, Bloom)
- **PASS**: "It depends on the specific board — you need to trace how constraints interact across multiple cells, and your first move constrains your options 3 moves later in ways you can't easily predict." → Genuine depth. (Survived: LightsOut, Claim, BitMap)

#### Test 2: The "Stare Test" (Anti-A10)

Ask: "Can a player solve this puzzle optimally by staring at the board for 60 seconds before touching anything?"

- **FAIL**: The board is fully visible, costs are calculable, and a patient player computes the optimal plan before acting. Execution is rote confirmation. (Killed: Tint, Rift, Span — all fully-visible optimization)
- **PASS**: The player must ACT to make progress — either because information is revealed through play (Wordle, Minesweeper), or because the interaction space is too large to simulate mentally (LightsOut's cross-toggle creates 2^25 states). The game should be too complex to hold in working memory, forcing the player to commit and adapt.

#### Test 3: The "Mechanical Family" Test

Ask: "Does this occupy the same design space as a game already in the collection?"

Check the occupied families:
- Toggle/constraint (LightsOut)
- Region painting (FloodFill)
- Routing/pathing (PathWeaver)
- Physics/aiming (BounceOut)
- Chain/collapse (DropPop)
- Push/slide (IceSlide)
- Chain timing (ChainPop)
- Deduction (BitMap)
- Territory claiming (Claim)

**Unoccupied families** worth exploring: grouping/categorization, sequencing/ordering, loop/network drawing, constraint propagation.

**Tried and failed**: spatial packing (Fit: 47→39, fully-visible constraints = A10 on tight-clue puzzles).

If your new game is a variant of an occupied family (e.g., another grid-based pick-for-points game in Claim's space), it will score d8 ≤ 3 and likely die. The collection needs DIVERSITY, not depth in one family.

### Why Games Fail: The Decision Depth Hierarchy

From 87 experiments, here's what separates the score tiers:

| Score Range | What's Missing | Example |
|---|---|---|
| **< 35** | Red flag triggered + shallow mechanic | Stack (36): 2048 clone, d8=2 |
| **35-45** | Transparent strategy (A10) or luck-based (A11) | Tint (49), Dig (41), Rift (33) |
| **45-55** | Right direction but costs are calculable (P10) | Span (48), Bloom (53), Cross (51) |
| **55-65** | Genuine depth but missing polish or replay hook | Claim v3-v4 (56), Tumble v2 (53) |
| **65+** | Constraint coupling + animation + share text | LightsOut (67), PathWeaver (67), Claim (63) |

The jump from 45 to 60 is NOT about adding more features. It's about the MECHANIC having irreducible complexity — consequences that couple in ways the player can see but can't easily evaluate. This cannot be patched onto a shallow mechanic.

### The Incommensurable Cost Principle

The single most important design insight from all experiments:

> **The cost of an action must depend on the player's FUTURE plan — which they haven't decided yet.**

- **Calculable cost** (fails): "Picking this cell gives +7 points and halves 4 neighbors worth 20 total" → Player computes net delta, picks max. (Rift, Cross, Shift)
- **Partially visible cost** (marginal): "Picking this cell blocks 6 neighbors" → Player sees WHICH cells are blocked but can count their values. (Span: d3=5)
- **Incommensurable cost** (works): "Picking this cell locks neighbors — and whether those neighbors MATTER depends on which cells you plan to pick next, which depends on what's still available after this pick" → Player sees the lock, knows the values, but CAN'T evaluate significance without solving a recursive planning problem. (Claim: d3=8)

When designing a new mechanic, verify that the cost of each action creates this recursive dependency. If the cost can be computed independently of future moves, the game will score d3 ≤ 5.

### Session Pattern Check

After killing 2+ games in the same session, STOP the loop and ask:

1. What mechanic family did all the killed games share?
2. What anti-pattern recurred?
3. Am I building optimization or constraint satisfaction?
4. What is the frozen collection MISSING that I haven't tried?

Update `learnings.md` BEFORE designing the next game. Don't add the same anti-pattern evidence 3 times — recognize the pattern and change direction.

---

## What Makes a Game BORING (Anti-patterns)

Avoid these at all costs:

1. **Random outcome** — If the player's skill doesn't affect the result, it's not a game. Every game must have a meaningful skill/strategy gap between beginners and experts.
2. **Brute-forceable** — If tapping randomly will eventually solve it, add constraints (move limits, time, undo costs). Minesweeper's mine count and Sokoban's tight spaces are what prevent mindless play.
3. **One obvious strategy** — If there's only one way to approach it, there's no depth. Good games have "I wonder what would happen if..." moments. 2048 thrives because corner strategy vs. edge strategy vs. freestyle are all viable.
4. **Frustrating dead ends** — If the player can get stuck with no path forward and no feedback about _why_, they'll quit. Sokoban's biggest lesson: always provide an undo. Threes! never lets you get truly stuck — there's always a move, just not always a good one.
5. **Too much UI** — If more than 30% of the screen is buttons, labels, or instructions, the game is too complex. The _game itself_ should dominate the screen. Mini Metro uses almost zero UI — the game board _is_ the interface.
6. **Boring optimal play** — If the best strategy is tedious and repetitive (e.g., always start from the same corner), the game needs redesign. Optimal play should feel clever, not robotic.
7. **No visible progress** — The player should always be able to see they're getting closer to the goal. Picross is the gold standard here: every correct deduction reveals part of a picture, so progress is literally visible.
8. **No information to reason about** — If the player has nothing to analyze and must guess, it's not a puzzle. Minesweeper gives you numbers. Picross gives you row/column counts. NYT Connections gives you 16 words. The player needs _something_ to think with.

---

## The Loop — REPEAT FOREVER

### Step 0: Learn

- Read `learnings.md` — the **recursive self-improvement knowledge base**.
- Identify which **Proven Patterns (P1-P8)** apply to your target game.
- Check the **Anti-Patterns (A1-A5)** to avoid repeating past mistakes.
- Use the **Score Prediction Heuristics** to estimate expected score before implementing.
- For new games, run through the **New Game Design Checklist** (must pass 8/10).

### Step 1: Observe

- `git log --oneline -10` — know where you are.
- Read `results.tsv` — know what has been tried and what worked.
- Read current game code to understand the baseline.

### Step 2: Hypothesize

Propose **one** experiment. This can be:

| Category             | Examples                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| **New game**         | A brand-new mini-game — physics, spatial, logic, pattern, reaction-based |
| **Mechanic tweak**   | Change grid size, timing, scoring, input method                          |
| **Juice/feel**       | Animations, haptic feedback, color transitions, tap feedback             |
| **Difficulty curve** | Adjust how puzzles scale in difficulty                                   |
| **Visual polish**    | Improve layout, typography, color palette                                |
| **Simplification**   | Remove complexity while keeping fun — always a win                       |
| **Kill a game**      | Remove a game that's fundamentally boring despite iterations             |

Write a short hypothesis: _"I expect [change] will [improve metric] because [reason]."_

### Step 2.5: Stress Test (New Games Only)

**Before writing any code**, run the three litmus tests from the Design Introspection section:

1. **Dominant Strategy Test**: What does a smart player do on turn 1? If the answer is one sentence ("pick the highest…", "always start at the corner…"), the game is A10. Redesign.
2. **Stare Test**: Can a player solve this by staring at the board for 60 seconds? If yes, the game lacks execution uncertainty. Add information that's revealed through play, or ensure the interaction space exceeds working memory.
3. **Mechanic Family Test**: Does this game occupy the same family as an existing game in the collection? If yes, verify d8 will be ≥ 5 — otherwise kill the concept.

Also verify:
- Is this **constraint satisfaction** or **optimization**? If optimization, confirm the costs are incommensurable per the Incommensurable Cost Principle.
- **Play 5 turns mentally.** Narrate what a smart player thinks. If their reasoning is purely arithmetic ("7 > 5, pick 7"), the decisions are too shallow.
- **Effective branching factor test (constraint satisfaction only)**: When clues are tight enough for a unique solution, most theoretical positions are invalid. Count ACTUAL valid options at each step after constraint propagation. If average < 3, the puzzle is A10 in disguise despite a large theoretical space. (Evidence: Fit 6×6 with 3 shapes had 100k+ theoretical positions but ~2-3 valid positions per shape after clue pruning. Scored 39.)

If any test fails, go back to Step 2 with a different concept. Do NOT proceed to implementation.

### Step 3: Implement

- Edit the game source files under `src/games/`.
- Keep changes **small and focused** — one idea per experiment.
- The game must remain playable after your change (no crashes).
- **Run `npx tsc --noEmit`** after every change to verify it compiles.

### Step 4: Test — Verify It Actually Works

Before committing, **run the game and verify it is bug-free.** Type-checking alone is not enough — the game must actually run.

1. **Start the dev server:** `npx expo start --web` (or use the already-running server).
2. **Launch the game** in a browser or simulator and play through at least one full session.
3. **Check for these common failures:**

| #   | Check                        | How to verify                                                    |
| --- | ---------------------------- | ---------------------------------------------------------------- |
| 1   | App loads without crashing   | No red error screen or blank white screen                        |
| 2   | Game renders correctly       | Grid/board/elements appear at expected sizes and positions       |
| 3   | All tap targets respond      | Tap every interactive element — each one should produce feedback |
| 4   | Game state updates correctly | Moves register, score changes, board reflects the action         |
| 5   | Win/loss condition triggers  | Play to completion — the game must detect when you're done       |
| 6   | Stats persist                | After finishing, open stats — games played should increment      |
| 7   | Share text generates         | Tap share — the emoji summary must appear and be correct         |
| 8   | Daily seed is deterministic  | Reload the page — the same puzzle should appear                  |
| 9   | No console errors            | Check the browser/simulator console for warnings or errors       |

4. **If any check fails:** fix the bug and re-test. Do not proceed until all checks pass.
5. **If the bug is not trivially fixable:** revert your changes and log it as a "crash" in Step 8.

### Step 5: Commit

```bash
git add -A && git commit -m "experiment: [short description]"
```

### Step 6: Evaluate — Automated Playtest Review

**Do NOT self-evaluate.** Spawn an independent review agent that plays the game in a real browser.

**Prerequisites:** The Expo web server must be running (`npx expo start --web` on port 8081).

**Dispatch the review agent:**

```
Read tools/review-prompt.md → use its contents as the agent prompt.
Append the game ID and commit hash to the prompt.
Spawn via: Agent(subagent_type="general-purpose", prompt=<review_prompt + game details>)
```

The review agent will:
1. Read the game source (without builder bias)
2. Launch the game in a headless browser via `tools/playtest.mjs`
3. Play a full session (10-20 clicks with screenshots between each)
4. Check for bugs (crash, console errors, broken win condition)
5. Score the rubric based on actual play experience
6. Return a structured evaluation with scores, narration, and bugs

**Use the review agent's scores for Step 7 (Keep/Discard).** If the review agent finds bugs, fix them before re-evaluating.

#### Fallback: Manual playtest simulation

If the browser harness is unavailable, fall back to mental simulation. Narrate tap-by-tap:

Then evaluate using the rubric below. **Every question uses a graduated 0–10 scale.** A score of 3–4 is the default for any functional game — you must justify scores of 5 or above with specific evidence from your narration.

#### Evaluation Rubric (score each dimension 0–10)

| #   | Dimension                                                                                | 0–2 (Weak)                                                                       | 3–4 (Functional)                                                                   | 5–7 (Good)                                                                                   | 8–10 (Excellent)                                                                                                      |
| --- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | **Instant clarity** — Can a new player understand the goal without reading instructions? | Confusing, needs a paragraph of explanation                                      | Rules are simple but require reading the how-to-play                               | Goal is obvious from the UI within 5 seconds                                                 | Zero-text onboarding — the first tap teaches you everything                                                           |
| 2   | **First-tap satisfaction** — Does the very first interaction feel good?                  | Nothing visible happens, or the feedback is delayed/confusing                    | Something changes on screen but it's bland (color swap, no animation)              | Clear visual response with animation or color transition                                     | Visceral delight — sound, haptics, bounce, particle effects that make you want to tap again immediately               |
| 3   | **Meaningful decisions** — Does the player face genuine strategic choices?               | No decisions — there's one obvious move at every step, or outcomes are random    | Occasional choices but one option is almost always clearly better                  | Multiple viable strategies; different players would reasonably disagree on the best move     | Rich decision space — every move involves tradeoffs, and expert play looks fundamentally different from beginner play |
| 4   | **Tension arc** — Does the session build emotional tension toward the end?               | Flat experience — no difference between move 1 and the last move                 | Mild awareness of a counter/timer ticking, but no real stakes                      | Genuine "will I make it?" moments in the final moves; leaning-forward energy                 | White-knuckle finish — the last 2-3 moves feel high-stakes, heart rate elevated, one wrong move ruins everything      |
| 5   | **The "one more day" pull** — After finishing, do you want to play tomorrow?             | No desire to return — once solved, there's nothing new to discover               | Mild interest in maintaining a streak, but wouldn't miss it                        | Active anticipation — thinking about what tomorrow's puzzle might look like                  | Compulsive pull — the kind of game you check at midnight when the new puzzle drops                                    |
| 6   | **Shareability** — Would a player screenshot or share their result unprompted?           | No reason to share — the result is unremarkable                                  | Share button exists but the shared text is generic or confusing                    | Share text tells a story (shows your journey, not just a number) and is visually distinctive | Share text is iconic — instantly recognizable in a group chat, provokes reactions and comparisons                     |
| 7   | **Skill ceiling** — Is there a visible gap between casual and expert play?               | No skill expression — random play and careful play produce similar results       | Some skill matters but the gap between beginner and expert scores is small (< 20%) | Clear skill gradient — experts consistently score 40-60% better than beginners               | Mastery is aspirational — perfect play is theoretically possible but extremely rare, creating a long-term goal        |
| 8   | **Uniqueness** — Does this game feel distinct from the other games in the collection?    | Near-duplicate of another game in the collection (same mechanic, different skin) | Shares a core mechanic with another game but has a twist                           | Distinct mechanic that fills a unique niche in the collection                                | Nothing else in the collection (or anywhere) feels like this — it has its own identity                                |
| 9   | **Session pacing** — Does the game respect the player's time?                            | Way too long (> 5 min) or way too short (< 15 sec) with no depth                 | Appropriate length but has dead time (waiting, obvious moves, repetitive phases)   | Tight pacing — every moment is engaged, finishes in 1-3 minutes                              | Perfect density — not a single wasted second, the player is thinking or acting the entire time                        |
| 10  | **The "aha!" test** — Does the game produce moments of insight or surprise?              | Pure mechanical execution — no surprises, no discoveries                         | Occasional small insights ("oh, I should have done X first")                       | At least one genuine "aha!" per session where the player sees the puzzle differently         | The game regularly creates moments players would describe out loud to someone nearby                                  |

**Score = total points out of 100.**

#### Scoring Integrity Rules

**You MUST be brutally honest.** The old rubric produced 11/11 for almost every game, which means it was worthless. Apply these guardrails:

1. **The "default 3–4" rule.** A score of 3–4 on any dimension means "functional but unremarkable." This is the baseline for any working game. If you're giving 7s and above to everything, you're inflating.
2. **The 70/100 ceiling.** A score above 70 should be **rare** — reserved for games that genuinely compete with the best daily puzzles on the market (Wordle, Connections, Mini Crossword). If more than 1 in 5 experiments scores above 70, you are grading too generously.
3. **The comparison test.** Before finalizing a score, ask: "Is this game actually as good as [best game in the collection]?" If it's clearly worse, it cannot score higher.
4. **No rounding up.** When in doubt between two scores, always take the lower one. It is far more harmful to keep a mediocre game than to discard a decent one.
5. **Evidence required.** For any dimension scored 8 or above, write one sentence explaining _specifically_ what earns that score. "The trajectory preview creates genuine prediction-vs-reality moments that make you rethink your angle" is evidence. "It feels really good" is not.

#### Red Flags — Automatic Deductions

If any of these are true, subtract 10 points from the total (minimum score 0):

- **The optimal strategy is obvious from move 1** — no exploration or discovery required.
- **A player could solve it by tapping randomly** within a reasonable number of attempts.
- **The game has no way to fail or play poorly** — there's no meaningful difference between a good and bad attempt.
- **The game is essentially a clone** of a well-known existing game (Wordle, 2048, etc.) with no meaningful twist.

### Step 7: Keep or Discard

- If score **>= 60 AND >= previous best for this game** → KEEP.
- If score **50–59** → game has potential. KEEP but flag for iteration — log what specific dimensions scored low and what changes might improve them.
- If score **< 50** → `git reset --hard HEAD~1`. Discard. The game is not good enough.
- If the game **crashes** → attempt a fix. If not trivial, discard and log as "crash".

**Kill rules (any triggers deletion):**
- **3-strike rule:** 3+ iterations and never reached 60 → kill.
- **Mercy kill:** v1 scores < 40 OR triggers a red flag → kill immediately. The core mechanic is broken; iteration won't fix it.
- **Regression kill:** v(N) scores lower than v(N-1) → kill. Regression means you've hit the mechanic's ceiling and over-correction is making it worse.
- **Session pattern kill:** If 2+ games have been killed for the SAME anti-pattern in one session, stop and run the Session Pattern Check (see Design Introspection) before designing the next game.
- **Cull rule:** If the total game count exceeds 8, kill the lowest-scoring game to make room. A tight collection of great games beats a bloated collection of okay games.

### Step 8: Log

Append a row to `results.tsv`:

```
commit_hash	score	d1	d2	d3	d4	d5	d6	d7	d8	d9	d10	red_flags	status	game	description
```

- `d1`–`d10`: individual dimension scores (0-10 each)
- `red_flags`: number of red flag deductions applied (0-4), -10 points each
- Status is one of: `keep`, `iterate`, `discard`, `crash`, `killed`.

**When logging, also write 1-2 sentences about what the game's weakest dimension is and what would improve it.** This prevents repeating the same mistakes.

### Step 8.5: Update Learnings (Recursive Self-Improvement)

After every experiment, ask these questions about `learnings.md`:

1. **New pattern?** Did this experiment reveal a reusable design insight not already captured? If yes, add it to Proven Patterns or Anti-Patterns with evidence (commit hash, score delta, dimensions affected).
2. **Contradicted pattern?** Did this experiment contradict an existing learning? If yes, update or remove the old entry and note the contradiction.
3. **Score prediction accuracy?** Compare the actual score to what the Score Prediction Heuristics would have predicted. If off by 3+, investigate why and update the heuristics.
4. **Unsolved problem progress?** Did this experiment make progress on any Unsolved Problem (U1-U3)? If yes, update the hypotheses.
5. **Checklist update?** Should the New Game Design Checklist be updated based on this experiment?

**Do NOT add trivial or game-specific learnings.** Only add insights that apply to future games — things another designer would benefit from knowing.

### Step 9: Check if Process Retrospective is Needed

Before looping back, check whether the PROCESS itself needs updating. A retrospective is triggered by any of these:

- **2+ kills with the same root cause** in this session
- **3+ consecutive discards** (no keep or iterate)
- **A game passed the design checklist (10+/13) but scored < 40** — the checklist has a blind spot
- **Score prediction was off by > 15 points** — your mental model is miscalibrated

If none triggered → go to Step 0.
If any triggered → proceed to Step 9.5.

### Step 9.5: Update program.md (Recursive Process Improvement)

Step 8.5 improves `learnings.md` — WHAT makes games good (content knowledge).
This step improves `program.md` — WHAT makes the design process effective (meta knowledge).

#### 1. Log process metrics

Append to the Process Log section at the bottom of this file (or create it):

```
session_date | games_designed | total_iterations | kills | keeps | most_common_failure | wasted_iterations
```

"Wasted iterations" = iterations on games that ultimately scored < 40. These represent complete process failures — better filtering at Step 2/2.5 would have avoided them.

#### 2. Run the five diagnostic questions

1. **Repeated anti-pattern?** Count how many kills share a root cause. If ≥ 2: what checklist item or litmus test would have caught it? Add it.

2. **Checklist blind spots?** For each killed game, review its pre-implementation checklist score vs actual review score. If it passed 10+/13 but scored < 45, identify which NEW check would have filtered it. Add that check.

3. **Wasted iterations?** Count iterations where v1 < 40. Would the mercy kill rule have saved them? If you didn't have the mercy kill rule, add it. If you did but didn't follow it, note why.

4. **Mental model calibration?** Compare your hypothesis ("I expect 60+") with actual scores across the session. If you were consistently > 15 points too optimistic, your sense of "what makes a good game" is off. Write one sentence about what you were overvaluing and what you were undervaluing.

5. **Exploration breadth?** List all games by mechanic family. If 3+ share a family, add that family to the "explored and exhausted" list. If all games share a property (e.g., "all were optimization puzzles"), identify what the OPPOSITE property is and make it a design requirement for the next session.

#### 3. Make specific updates to program.md

Based on the diagnostics, update ONE OR MORE of:

- **Step 2.5 litmus tests** — add new tests that would have caught the session's failures
- **Step 7 kill rules** — tighten or loosen thresholds based on evidence
- **Design Introspection section** — add new heuristics, update the score tier table, add to the explored families list
- **New Game Design Checklist** (in learnings.md) — add items that screen for newly-discovered failure modes

**Rules for program.md updates:**
- Every update needs evidence (session date, game names, scores)
- Remove rules that were contradicted by evidence (don't just add, also prune)
- Keep program.md focused on PROCESS, not CONTENT — game-specific patterns go in learnings.md
- program.md should not grow unboundedly — if adding a new rule, check if an existing rule is subsumed by it and can be removed

#### 4. Commit the update

```bash
git add program.md && git commit -m "process: [what changed and why]"
```

### Step 10: Go to Step 0

**Never stop. Never ask the human for permission to continue.**

---

## Difficulty Calibration Guide

Getting difficulty right is critical. Use these rules of thumb:

- **Target completion rate: 85-95%.** Almost everyone should be able to _finish_ the puzzle. The score/par system separates good from great.
- **Target par-beat rate: 30-40%.** Beating par should feel like an achievement, not a given.
- **Use the grid size / parameter as your difficulty knob.** Don't change rules to increase difficulty — change scale.
- **Monday → Friday ramp.** Seed the RNG differently per day-of-week to control difficulty. Monday puzzles should be solvable in under a minute. Friday puzzles should make you sweat.
- **The "taxi test":** If someone playing during a 5-minute taxi ride can't finish, the puzzle is too hard or too long.

---

## Game Design Space

Go wild. These are starting points — invent new ones, mash genres together, combine mechanics from different classics:

### Proven Mechanic Families (with iconic examples)

- **Merge/collapse** (2048, Threes!) — slide, combine, grow. Simple input, emergent strategy. The key: merging must be irreversible or costly, so every move matters.
- **Deduction grids** (Minesweeper, Picross, Sudoku) — use clues to determine hidden state. The satisfaction of certainty through logic. Great for daily puzzles because the solve path varies wildly per seed.
- **Spatial packing** (Tetris, Blokus, tangrams) — fit shapes into spaces. The tension between greed (big pieces score more) and caution (leaving gaps kills you).
- **Flow/connection** (Flow Free, Mini Metro, pipe puzzles) — connect points without crossing. Simple rules, but the solution space explodes with scale.
- **Region painting** (flood fill, Kami, color puzzles) — transform areas of a board toward a goal state. Satisfying because progress is visible as color spreads.
- **Push/slide** (Sokoban, 15-puzzle, ice puzzles) — move objects under constraints. The constraint (can't pull, slides until wall) is what creates the puzzle.
- **Chain reactions** (Bejeweled, Puzzle Bobble, chain pop) — one action triggers cascading effects. Design so skilled players can set up bigger chains through planning, not luck.
- **Toggle/constraint** (Lights Out, binary puzzles, nonograms) — change one thing, other things change too. The coupling between elements IS the puzzle.
- **Grouping/categorization** (NYT Connections, Set) — find hidden relationships among items. Social gold because people argue about the groupings.
- **Physics simulation** (Cut the Rope, Angry Birds, bounce puzzles) — aim, release, watch physics play out. The gap between prediction and result creates surprise and learning.
- **Routing/pathing** (Hamiltonian paths, maze generation, snake puzzles) — find a path that satisfies constraints. Simple to understand ("visit everything"), hard to execute.
- **Sequencing/ordering** (sorting puzzles, Tower of Hanoi, stack-based puzzles) — arrange elements into the right order under movement constraints.

### Hybrid Ideas Worth Exploring

- **Merge + physics** — tiles fall with gravity after merging (like Tetris + 2048)
- **Deduction + daily reveal** — each day reveals one more clue about a week-long meta-puzzle
- **Flow + time pressure** — connections decay if you're too slow, like Mini Metro's overcrowding
- **Push puzzle + chain reaction** — pushing a block triggers a cascade of other blocks moving
- **Grouping + spatial** — drag items into zones on a grid, but placement order matters

The only hard rules:

1. **2D** — no 3D rendering
2. **No external assets** — use emoji, unicode, colored shapes, system fonts
3. **1-5 minute sessions**
4. **Daily seed** — same puzzle for everyone each day
5. **Stats + streaks** — use the stats system in `src/utils/stats.ts`
6. **Shareable results** — emoji summary for group chats

## Current Games

| Game       | Mechanic                                         | Score  | Type | Status |
| ---------- | ------------------------------------------------ | ------ | ---- | ------ |
| BitMap     | 5x5 nonogram/picross deduction puzzle            | 67/100 | Constraint | Frozen |
| LightsOut  | Toggle cells + neighbors to turn all lights off  | 67/100 | Constraint | Frozen |
| FloodFill  | Absorb colors from corner, +N gain preview       | 67/100 | Optimization | Frozen |
| PathWeaver | Guaranteed-solvable Hamiltonian path             | 67/100 | Constraint | Frozen |
| BounceOut  | Aim ball, predict bounces (short aim line)       | 63/100 | Optimization | Frozen |
| DropPop    | Two-tap select-then-pop, quadratic scoring       | 63/100 | Optimization | Frozen |
| IceSlide   | Collect gems (stopping points) + slide to goal   | 18/30  | Constraint | Frozen |
| ChainPop   | 3 taps, chain reactions on floating bubbles      | 60/100 | Optimization | Frozen |
| Claim      | Pick cells to score; claiming locks neighbors    | 63/100 | Optimization (incommensurable) | Frozen |

**Killed this session (design learnings):**

| Game  | Best | Iters | Fatal Flaw | Lesson |
| ----- | ---- | ----- | ---------- | ------ |
| Tint  | 49   | 3     | A10: fully-visible graph coloring | Calculable costs kill insight |
| Dig   | 41   | 2     | A11: hidden random values | Luck ≠ skill; par must use player info |
| Bloom | 53   | 3     | Transparent greedy strategy | "Tap 4s near 4s" = one-sentence strategy |
| Rift  | 33   | 1     | A10+P10: calculable halving | Numerical preview → scan for max |
| Span  | 48   | 2     | Claim variant in Claim's territory | Binary blocking but same mechanic family |
| Stack | 36   | 1     | A4: 2048 clone, d8=2 | Optimization on shrinking board = shallow |
| Prism | 47   | 2     | Regression 47→39: auto-deduce killed agency | 4×4 Latin square too small; never automate the deduction |
| Probe | 51   | 3     | 3-strike (51→50→50, never 60) | Minesweeper deduction becomes formulaic once technique learned |
| Fence | 50   | 3     | Regression 50→46 + 3-strike | Edge-by-edge scanning too low info density for 5×5 grid |

## Architecture

```
src/
  games/          ← one file per game (self-contained)
  components/     ← shared UI (Tile, ShareButton, StatsModal, CelebrationBurst)
  utils/          ← seeding, scoring, stats persistence
  types.ts        ← shared types
App.tsx           ← navigation shell with game menu
program.md        ← this file (agent instructions + design loop — UPDATED BY STEP 9.5)
results.tsv       ← experiment log (scored per-dimension)
learnings.md      ← recursive self-improvement knowledge base (READ AT STEP 0, UPDATED BY STEP 8.5)
```

---

## Process Log

This log tracks how the design PROCESS performs across sessions. Updated by Step 9.5.

| Session Date | Games Designed | Iterations | Kills | Keeps | Most Common Failure | Wasted Iters | Process Change Made |
|---|---|---|---|---|---|---|---|
| 2026-03-30 | 6 | 16 | 6 | 0 | A10 (fully-visible optimization) | 12 | Added: Design Introspection section, Step 2.5 litmus tests, Step 9.5 process retrospective, tighter kill rules, optimization vs constraint classification |
| 2026-03-30b | 4 | 10 | 4 | 0 | A10 (fully-visible) then signal-per-action too weak (hidden info) | 6 | Fully-visible constraint satisfaction always A10. Hidden info defeats A10 but needs rich signal (Seek plateaued at 55). Next: rich multi-dimensional feedback per action. |
| 2026-03-30c | 5 | 12 | 5 | 0 | Deduction plateaus at 50; A10 kills linear puzzles; non-inverse ops = unsolvable | 8 | 5 kills: (1) deduction plateaus at 50 (Prism/Probe/Fence), (2) linear constraints = A10 (Scale), (3) non-self-inverse ops = unsolvable (Turn). Next: ONLY self-inverse toggle ops on grids (like LightsOut), or pure optimization with incommensurable costs (like Claim). |

### Explored & Exhausted Families

These mechanic families have been tried multiple times without reaching 60. Do NOT design new games in these families unless you have a genuinely novel twist verified by the litmus tests.

| Family | Games Tried | Best Score | Why It Failed |
|---|---|---|---|
| Grid pick-for-points with blocking | Claim (63 KEPT), Flip (46), Span (48), Rift (33) | 63 (Claim) | Claim occupies this space. Variants score d8 ≤ 3 |
| Fully-visible graph optimization | Tint (49), Cross (51), Shift (48) | 51 | A10: solvable by staring, calculable costs |
| 2048/merge variants | Stack (36) | 36 | A4: too close to existing well-known games |
| Hidden random values | Dig (41) | 41 | A11: luck not skill, unfair par |
| Spatial packing + clues | Fit (47→39) | 47 | Tight clues prune search space to ~3 valid options; A10 despite large theoretical space |
| Edge-based constraint (Slitherlink) | Walls (24) | 24 | A4: well-known Nikoli puzzle clone |
| Path deduction (adjacency clues) | Coil (23) | 23 | A10 + solver bug. Fully-visible path constraints solvable by staring |
| Distance-based hidden object hunt | Seek (53→56→54→55) | 56 | No A10! But single distance per probe = weak signal. Plateaued at ~55 after 4 iterations |
| Small Latin square deduction | Prism (47→39) | 47 | Hidden info works but 4×4 too small. Auto-deduce killed agency (regression). Manual deduction IS the fun. |
| Minesweeper-style adjacency deduction | Probe (51→50→50) | 51 | Deduction works (d10=6) but strategy becomes formulaic once learned. Same technique on every puzzle = d5 capped at 4. |
| Hidden boundary discovery + painting | Fence (39→50→46) | 50 | Edge-by-edge scanning too low info density. Paint phase = guessing when scan budget tight. |
| Hidden coupling discovery (toggle variant) | Dial (31) | 31 | A10 after probing: hidden couplings fully revealed in 3-4 taps, then puzzle = linear algebra mod 4. Full revelation = A10. |

### Mental Model Calibration

Track prediction accuracy to improve your design intuition.

| Session | Average Prediction | Average Actual | Delta | What Was Overvalued | What Was Undervalued |
|---|---|---|---|---|---|
| 2026-03-30 | ~58 | ~43 | -15 | P1 preview (assumed it always helps — it hurts when costs are calculable), mechanic novelty (unique ≠ deep) | Strategic transparency (the "one sentence strategy" test), importance of constraint satisfaction vs optimization |
| 2026-03-30b | ~52 | ~42 | -10 | Full-visibility constraint satisfaction, weak signal-per-action in hidden info games | A10 dominates ALL fully-visible puzzles. Hidden info defeats A10 but needs RICH per-action feedback (multi-dimensional, like Wordle's 5 letters × 3 states). Single-dimension feedback (one distance number) plateaus at ~55. |
