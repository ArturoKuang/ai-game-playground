# Sieve

## Rules
A 4x4 grid of icons, each with 3 visible attributes (color, shape, fill). The 16 icons are secretly divided into 4 groups of 4. Each group shares exactly one attribute value. Tap an icon to "sieve" it -- learn which group it belongs to. Identify the shared attribute of all 4 groups within a limited number of sieves.

## Mechanic Type
Constraint Satisfaction

## Why It Works

### Stare Test
All 16 icons and their attributes are visible, but the GROUP ASSIGNMENTS are hidden. The player sees a red solid circle, a blue striped square, a red dotted triangle, etc. -- but doesn't know which 4 icons form Group 1, which form Group 2, etc. More critically, the player doesn't know the GROUPING RULE for each group: is Group 1 "all red icons" or "all circles" or "all solid fills"? Each sieve reveals one icon's group number, which is partial information. After sieving 3 icons and learning they're in groups 1, 2, and 1, the player knows icons A and C share a group. They examine A and C's attributes: both are red, but one is a circle and one is a triangle; one is solid and one is dotted. The shared attribute must be COLOR (red). Group 1's rule is "red." Now the player can predict: all other red icons are also in Group 1. They test this by sieving another red icon -- if it's Group 1, the hypothesis is confirmed.

The game CANNOT be solved by staring. The group assignments are hidden and must be revealed through sieving. Even after 4-5 sieves, multiple grouping hypotheses may be consistent with the evidence, requiring targeted sieves to disambiguate.

### Dominant Strategy Test
"Sieve icons that look the most different from each other" is reasonable (maximizes information by sampling diverse attributes) but fails as a one-sentence strategy. The VALUE of each sieve depends on the player's current HYPOTHESIS about the grouping. If the player suspects Group 1 is "all red" after seeing two red icons in Group 1, the highest-value sieve is NOT "something different" -- it's a SPECIFIC BLUE CIRCLE to test whether circles form another group (which would confirm that color, not shape, is the dominant grouping principle). The sieve's value is hypothesis-dependent.

"Sieve one icon of each color first" fails because the grouping might NOT be by color. If the grouping is by shape, the first 3 color-diverse sieves might all land in different groups with no pattern, wasting moves. "Sieve icons that share one attribute but differ in others" is the expert strategy, but WHICH attribute to test depends on which hypotheses have been eliminated, which depends on previous sieve results. The decision tree is 3+ levels deep.

The incommensurable cost: sieving icon X reveals X's group, which constrains hypotheses for ALL 16 icons. Whether X is the right icon to sieve depends on which hypotheses are still alive, which depends on previous sieves, which the player can't undo. Each sieve is an irreversible information investment whose return depends on the (hidden) grouping structure.

### Family Test
Attribute-based group deduction with strategic probing. This is NOT:
- Connections (guess whole groups at once; binary right/wrong; word-based semantic categories -- Sieve reveals individual assignments; attribute-based visual categories)
- Probe/Minesweeper (spatial deduction from adjacency -- Sieve has no spatial structure; grouping is by visual attributes)
- Seek (distance-based triangulation -- different information structure entirely)
- BitMap (all clues visible, pure deduction -- Sieve requires active probing to reveal hidden state)
- Peel (layer removal for constraint satisfaction -- different hidden structure)

The defining novelty: the player is solving TWO nested puzzles simultaneously. The OUTER puzzle is "what is each group's grouping rule?" (meta-deduction about the structure). The INNER puzzle is "which icons are in which group?" (instance deduction about membership). Solving one helps solve the other: learning that two icons share a group reveals their shared attribute (outer -> inner); hypothesizing a grouping rule predicts group membership for untested icons (inner -> outer). This dual-level deduction is the core mechanic that creates depth.

The closest analog is the card game SET (identify sets based on attribute matching), but SET is pattern recognition in parallel, while Sieve is sequential hypothesis testing. Sieve adds the strategic PROBING layer -- the player chooses WHICH icons to test, creating information-value decisions that SET lacks.

**Unoccupied family**: Attribute-based group deduction with strategic probing.

## Predicted Failure Mode
**Most likely death: too cerebral / not tactile enough.** If the game feels like a logic homework problem ("which attribute is shared?"), casual players will bounce. MITIGATION: (a) Icons must be visually rich and SATISFYING to interact with -- large, colorful, animated on tap. Sieving should feel like opening a mystery box (the group number appears with a pop animation and color coding). (b) The attribute deduction should feel like RECOGNITION, not calculation. When two sieved icons share a group, the shared attribute should POP OUT visually: "Oh, they're both red! That's the connection!" The game teaches the player to SEE patterns. (c) Monday puzzles have ONE dominant grouping dimension (e.g., color is the ONLY consistent grouping, shape and fill are randomized within groups). By Friday, two dimensions are relevant (color AND shape each define two groups).

**Second risk: too easy (small state space).** 4 groups x 3 possible attributes x N values per attribute. With 4 colors, 4 shapes, and 4 fills, there are only 3 possible "grouping types" (by color, by shape, by fill). After 2-3 sieves, the player eliminates 1-2 grouping types and deduces the rest. Par of 4-5 sieves might be too generous. MITIGATION: MIXED grouping rules. Group 1 is "all red" (color), Group 2 is "all circles" (shape), Group 3 is "all striped" (fill), Group 4 is "everything else." Different groups use DIFFERENT attributes as their unifying principle. This blows up the hypothesis space: the player can't just determine "the game is grouped by color" -- each group might use a different attribute. With 3 attribute types and 4 groups, the number of possible grouping schemes is much larger, requiring more targeted sieves to disambiguate.

**Third risk: ambiguous groupings.** If icons share multiple attributes (e.g., two red circles), they could be grouped by color OR by shape, creating ambiguity that feels unfair. MITIGATION: the generator ensures that within each group, the DEFINING attribute is the ONLY attribute shared by all 4 members. If Group 1 is "all red," then the 4 red icons must have 4 different shapes and 4 different fills. This guarantees that the grouping rule is uniquely deducible: only one attribute is shared by all group members.

**Anti-pattern proximity: A4 (Connections clone), A5 (too few decisions).** Defense against A4: Sieve uses visual attributes (not semantic), individual probing (not group guessing), and mixed grouping rules (not uniform-dimension). These three differences create fundamentally different gameplay. Defense against A5: with par of 5-7 sieves on harder days, each sieve is a genuine decision about where to invest limited information budget. The meta-deduction between sieves (revising hypotheses) creates rich cognitive engagement between actions.

## Expected Metrics
| Metric | Prediction | Reasoning |
|---|---|---|
| Puzzle Entropy | 12-22 | 16 icons, 4 groups. Initial uncertainty: 4^16 / symmetry = ~10^6 possible groupings. Each sieve eliminates large hypothesis classes. With mixed grouping rules, entropy is higher than uniform grouping. Total information in the decision sequence: ~12 bits (Monday, uniform grouping) to ~22 bits (Friday, mixed grouping with attribute ambiguity). |
| Skill-Depth | 40-65% | Strategic players use DIAGNOSTIC sieves: "Icons A (red circle solid) and B (red square striped) are both in Group 1. Shared attribute: red. Hypothesis: Group 1 = red. To CONFIRM, I should sieve icon C (red triangle dotted) -- if Group 1, confirmed. To test ALTERNATIVE, sieve icon D (blue circle solid) -- if also Group 1, then the grouping is NOT by color (since D is blue)." This hypothesis-testing discipline eliminates hypotheses efficiently. Random sieving gathers information slowly because it doesn't target disambiguation. |
| Counterintuitive Moves | 2-3 | "Sieve an icon I'm already pretty sure about" -- to CONFIRM a hypothesis and unlock deductions about the remaining groups. Also: "Sieve an icon that I think is in Group 4 (the leftovers)" -- even though Group 4 is the "boring" group, confirming a Group 4 member eliminates it from consideration for the other 3 groups, tightening the constraint. The CI is in choosing CONFIRMATION sieves over EXPLORATION sieves when confirmation unlocks more total information. |
| Drama | 0.5-0.7 | Near-miss: "6 sieves used, par was 5. After sieve 3, I had two hypotheses: Group 2 is 'all circles' or 'all striped.' Sieve 4 tested a striped square -- it was Group 3, not Group 2. This eliminated 'striped' for Group 2, confirming 'circles.' But I wasted sieve 4 on a Group 3 icon when I could have sieved a circle to get the same answer AND learn more about Group 3." The tension is in optimal sieve targeting under uncertainty. |
| Decision Entropy | 2.0-3.5 | 16 icons to choose from, but hypothesis-driven reasoning prunes to 3-6 meaningful sieve targets (icons that distinguish between remaining hypotheses). Tight enough for genuine comparison without being overwhelming. |
| Info Gain Ratio | 2.0-3.0 | Strategic players identify the grouping rules in 4-5 sieves through targeted hypothesis testing. Random sievers need 7-9 sieves to accumulate enough data. The gap comes from DIAGNOSTIC sieving (choose the icon that maximally disambiguates) vs. random sampling. |

## Player Experience
**Opening (10s):** A 4x4 grid of colorful icons. Each is a combination of color (red/blue/green/yellow), shape (circle/square/triangle/diamond), and fill (solid/striped/dotted/empty). They're large and vivid -- a red solid circle, a blue striped diamond, a green dotted square, a yellow empty triangle. Below the grid: "Find the 4 groups. Each group shares one trait." A sieve counter: "Sieves: 0 / 6 (par)." You tap the red solid circle. It flips with a satisfying card-flip animation, revealing "Group 1" in a red badge. One down. You tap the blue striped diamond. Flip: "Group 2" in a blue badge. Now you know two icons in different groups. Red circle and blue diamond share... nothing obvious. Different color, different shape, different fill. That's expected -- they're in different groups.

**Middle (1.5min):** Four sieves used. Group 1 has the red circle AND a red triangle (both sieved). They share: RED. Hypothesis: Group 1 = all red icons. You scan the grid for other red icons: a red dotted square and a red empty diamond. If your hypothesis is right, both should be Group 1. You sieve the red dotted square. Flip: Group 1! Confirmed -- Group 1 is "all red." Three reds in Group 1, and the fourth (red empty diamond) must also be Group 1. No need to sieve it. One group SOLVED without sieving all members.

Group 2 has the blue diamond. Only one member known. Group 3 has a green striped circle (sieved in move 3). The remaining 11 icons are in Groups 2, 3, or 4. You need to figure out Group 2's rule. The blue diamond's attributes: blue, diamond, striped. Hypothesis A: Group 2 = blue. Hypothesis B: Group 2 = diamonds. Hypothesis C: Group 2 = striped. To distinguish: sieve an icon that is blue but NOT a diamond and NOT striped. The blue solid triangle: if it's Group 2, then "blue" is the rule (eliminating diamond and striped). You sieve it. Flip: Group 2! Confirmed: Group 2 = all blue. Solved in 5 sieves.

**Ending (15s):** Two groups solved (red, blue). Remaining: green and yellow icons in Groups 3 and 4. The green circle is in Group 3. Is Group 3 = green? Scanning: there are 4 green icons and 4 yellow icons left. If Group 3 = green and Group 4 = yellow, all 12 remaining icons are assigned. But you have 1 sieve left before par. You could sieve a yellow icon to confirm Group 4 = yellow, or a green icon to confirm Group 3 = green, or you could just SUBMIT your answer. Wait -- the game doesn't have a submit for the full solution. You just need to identify all 4 groups' shared traits. You have enough information: Group 1 = red, Group 2 = blue, Group 3 = green (inferred from the sieved green circle), Group 4 = yellow (by elimination). You submit: "Color, Color, Color, Color." But this is Monday -- all 4 groups use the same attribute type. On Friday, the groups might be: Group 1 = red (color), Group 2 = circles (shape), Group 3 = striped (fill), Group 4 = remainder. Much harder.

Celebration burst! "Sieve #42: All 4 groups identified in 5 sieves. Par: 6. Perfect!"

**The aha moment:** "Wait -- I don't need to sieve all 4 members of a group. Once I know TWO members share a group AND I identify their shared attribute, I can PREDICT the other members. Three sieves to solve a 4-member group instead of four."

**The near-miss:** "7 sieves, par was 6. On sieve 3, I tested a yellow square to see if it was in Group 2 (the group with the blue diamond). It wasn't -- it was Group 4. I learned what Group 4 contained but NOT what Group 2's rule was. If I'd instead tested the blue triangle, I would have confirmed Group 2 = blue in 3 sieves instead of 5, finishing under par."

**Screenshot:** A 4x4 grid of icons with group badges revealed on sieved icons (Group 1 in red, Group 2 in blue, etc.). Unsieved icons show a question mark overlay. The grouping rules are listed below: "G1: Red | G2: Circles | G3: Striped | G4: Remainder." "Sieve #42: 5 sieves, par 6."

## Difficulty Knobs
1. **Grouping rule uniformity** (Monday: all 4 groups use the SAME attribute type -- all grouped by color; Friday: groups use MIXED attribute types -- G1 by color, G2 by shape, G3 by fill, G4 by remainder. Mixed grouping dramatically increases the hypothesis space.)
2. **Sieve budget** (Monday: par = 7, generous; Friday: par = 5, requiring efficient diagnostic sieving with minimal wasted probes)
3. **Attribute value count** (Monday: 4 colors, 4 shapes, 2 fills -- fill has fewer values so it's less likely as a grouping dimension, simplifying deduction; Friday: 4 colors, 4 shapes, 4 fills -- all attribute types equally viable, maximal ambiguity)
4. **Attribute overlap within groups** (Monday: group members share ONLY the defining attribute, all other attributes differ -- easy to spot the shared trait; Friday: group members share the defining attribute PLUS coincidental matches in other attributes -- "these two icons are both red AND both circles, but the group is defined by red, not circles" requires deeper analysis)

---
<!-- BELOW THIS LINE: filled by engineer and playtester, not designer -->

## Solver Metrics

Computed on 5 puzzles (Mon-Fri seeds), 5 skill levels each.

| Metric | Mon | Tue | Wed | Thu | Fri | Avg |
|---|---|---|---|---|---|---|
| Solvability | 100% | 100% | 100% | 100% | 100% | 100% |
| Puzzle Entropy | 4.0 | 29.0 | 29.0 | 29.0 | 29.0 | 24.0 |
| Skill-Depth | 66.7% | 38.5% | 11.1% | 27.3% | 11.1% | 30.9% |
| Decision Entropy | 4.0 | 3.6 | 3.6 | 3.6 | 3.6 | 3.7 |
| Counterintuitive | 0 | 0 | 0 | 0 | 0 | 0.0 |
| Drama | 0.13 | 0.50 | 0.50 | 0.50 | 0.50 | 0.42 |
| Duration (ms) | 0 | 0 | 0 | 0 | 1 | 0.2 |
| Info Gain Ratio | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Solution Uniqueness | 2 | 1 | 4 | 1 | 2 | 2.0 |

**Auto-kill check**: FAILED (CI = 0 across all puzzles)
**Weakest metric**: Counterintuitive Moves -- 0.0 avg (greedy sieving IS optimal; no aha moments possible because every sieve monotonically reduces uncertainty -- there is no sieve that strategically increases ambiguity to gain later. This is structural to information-gathering games where observations cannot be "bad.")
**Strongest metric**: Skill-Depth -- 30.9% avg (strategic sieving uses 30% fewer sieves than random; optimal solver finds solution in 1 sieve on Monday uniform-grouping puzzles vs 3 for random)

## Play Report
<!-- Playtester fills this section with blind play observations -->

## Decision

**Status: KILL (auto-killed, CI = 0)**

CI=0 across all 5 puzzles is a fatal structural flaw. Greedy sieving IS optimal because every observation monotonically reduces uncertainty -- there is no sieve that could be "counterintuitive" because information-gathering can never make things worse. This is intrinsic to pure information-gathering games: every probe is beneficial, so there are no sacrifice/recovery moments, no detours, no aha moments where you must "give up" information to gain more later.

Additionally, IGR=1.00 confirms that strategic sieving is no better than random sieving -- the solver finds the grouping in the same number of sieves regardless of which icons are probed. This means the game has no skill gradient: a thoughtful player and a random player perform identically.

**Lesson learned**: Pure information-gathering mechanics (probe to reveal hidden state) are structurally incompatible with CI>0. For CI, the player must sometimes make a move that APPEARS to worsen their position but enables a better outcome later. In information games, every observation is pure gain -- there is no cost to revealing information. For an information-gathering game to have CI, there must be a COST to probing (e.g., probing the wrong cell locks you out of probing a better one, or revealed information decays over time) that creates genuine tradeoffs in probe selection. Sieve's unlimited sieve budget with no probe-order penalties eliminates all such tradeoffs.
