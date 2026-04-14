# Top Pick

## Concept

**Algorithm**: Hash Map (Top K Frequent Elements)
**LeetCode**: #347 Top K Frequent Elements, #692 Top K Frequent Words
**Tier**: 1

## Rules

A grid of face-down emoji tiles. Flip tiles to discover types; a frequency tracker auto-counts
each type you reveal. Nominate the K most frequent types, then verify. Win by correctly identifying
the top-K before running out of flips.

### Tile States
- **hidden**: face-down, can be flipped (costs 1 move)
- **revealed**: face-up, shows emoji. Permanently revealed once flipped.

### Core Mechanic
1. **Flip** (1 move): Tap a hidden tile to reveal it. The frequency tracker auto-increments the count for that emoji type.
2. **Nominate** (free): Tap a type in the tracker to nominate it as one of the top-K. Can unnominate.
3. **Verify** (free, once): When exactly K types are nominated, tap Verify. The true frequencies are revealed. If all nominated types are in the actual top-K, you win.
4. **Lose condition**: Verify with wrong nominations, or exhaust the move budget without ever verifying correctly.

### Key Insight
You don't need to flip every tile. By sampling strategically (spreading flips across the grid),
you can identify the most frequent types from partial information -- just like building a hash map
of frequencies and extracting the top K.

## Mechanic Mapping

| Game | Algorithm |
|------|-----------|
| Grid of emoji tiles | Input array |
| Flip a tile | Process an element |
| Frequency tracker | Hash map (frequency count) |
| Nominate top K | Extract top K from frequency map |
| Verify | Return result |

## Difficulty Table

| D | Grid | Types | K | Budget | Top Freq | Distribution |
|---|------|-------|---|--------|----------|-------------|
| 1 | 4x3 | 2 | 1 | 10 | 11 | [11,1] |
| 2 | 4x4 | 4 | 2 | 14 | 7 | [7,7,1,1] |
| 3 | 5x5 | 5 | 2 | 20 | 9 | [9,9,3,2,2] |
| 4 | 6x5 | 6 | 3 | 20 | 8 | [8,8,8,2,2,2] |
| 5 | 6x6 | 8 | 3 | 24 | 9 | [9,9,9,2,2,2,2,1] |

## Solver Levels

- **L1** (Random): Flip all tiles randomly. Nominate K random discovered types.
- **L2** (First-K): Flip all tiles randomly. Nominate the first K distinct types discovered.
- **L3** (Count-based): Flip all tiles randomly. Nominate the K types with highest observed counts.
- **L4** (Spatial): Flip tiles maximizing spatial diversity (Manhattan distance). Nominate top K by count.
- **L5** (Stratified): Divide grid into sectors, sample from each. Early-stop when confident. Nominate top K by count.

## Solver Metrics

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Solvability (L5) | 100% all D | 100% | PASS |
| Efficiency Gap D3 | 23.5% | >= 20% | PASS |
| Wasted Work D3 | 30.7% | >= 30% | PASS |
| Decision Density D3 | 100% | > 60% | PASS |
| Breakpoint | D3 | D3-D4 | PASS |
| L2 Win Rates | [90, 90, 55, 35, 5] | monotonic | PASS |
| Algorithm Alignment | 100% | >= 90% | PASS |

## Play Report

### Fun Gate Scores

| Metric | Score | Target | Status |
|--------|-------|--------|--------|
| Comprehension Speed | 2 moves | <= 5 | PASS |
| Dead Moments | 0 | 0 | PASS |
| Confusion Count | 2 | <= 2 | PASS |
| Strategy Shifts | 2 | >= 1 | PASS |
| Replay Pull | 3/5 | >= 3 | PASS |
| Best Moment Intensity | 4/5 | >= 3 | PASS |

### Strategy Evolution
- **D1**: Flip anything, pick the only type you see. Trivially obvious.
- **D3**: Sample the grid in a spread pattern. Flip ~40% of tiles, pick types with highest counts.
- **D5**: Two-wave sampling -- initial broad sample, then targeted verification. Commit early when separation is clear.

### Key Observations
- Playtester naturally discovered sampling/frequency-counting strategy without algorithm hints
- Algorithm reveal ("Top K Frequent Elements") produced a genuine "oh!" moment
- D1 is very easy (11/12 same type) -- serves as tutorial
- D3 is the learning edge where brute-force stops working and sampling becomes necessary
- D5 requires deliberate spatial spreading and confidence-based early stopping

## Decision

**KEEP**

### Rationale
All Algorithm Gate metrics PASS. All Fun Gate metrics PASS. Playtester independently discovered frequency-counting + sampling strategy that maps directly to hash map + top K extraction. Strategy evolution D1->D3->D5 shows clear learning progression.

### Strengths
- Clean mechanic mapping: flip=process, tracker=hash map, nominate=extract top K
- Strong algorithm alignment: playtester described exact algorithm pattern in plain English
- Good comprehension (2 moves to understand rules)
- Satisfying reveal moment when true frequencies shown
- 2 meaningful strategy shifts across difficulty levels

### Minor Issues (non-blocking)
- D1 is almost trivially easy (11/12 same type) -- acceptable as tutorial
- Replay pull is moderate (3/5) -- core loop is somewhat one-dimensional
