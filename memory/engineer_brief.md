# Engineer Brief

_Generated from the SQLite memory store on 2026-04-12T18:32:02.910Z._

Task: Build and evaluate the next algorithm prototype for Blind 75 #62 Unique Paths

Engineer brief with 4 ranked memory items plus metric thresholds and implementation warnings.

## Thresholds
- Solvability must stay at 100%.
- Skill-depth should stay above 30%; below 10% is an auto-kill.
- Counterintuitive moves should be present; zero across the board is an auto-kill.
- Decision entropy should stay within 1.0 to 4.5 unless the mechanic is intentionally binary and justified.

## Islemark v1
- Source: version
- Rank: 0.65
- Feedback: useful
- Decision: keep
- Tags: bfs, blind-75, connected-components, dfs, flood-fill, grid, kept-game, number-of-islands
- Hypothesis: A row-major storm-map sweep can teach Number of Islands directly if the player spends one launch only on fresh land and the launch instantly charts the whole orthogonally connected coast before the sweep continues.
- Notes: Strong enough to claim Blind 75 #200 directly because optimal play counts fresh land once and immediately consumes the whole orthogonally connected coast before the scan continues.

## Number of Islands games need one visible full-component kill per fresh root
- Source: principle
- Rank: 0.60
- Feedback: irrelevant
- Status: candidate
- Confidence: 0.30
- Tags: bfs, blind-75, connected-components, dfs, flood-fill, grid, number-of-islands
- Statement: A Number of Islands game teaches the real solution only when one action on fresh land visibly kills the whole orthogonally connected component, so later land from that coast must be passed rather than counted again.

## Word Search games need visible local backtracking and one-use trail locks
- Source: principle
- Rank: 0.59
- Feedback: irrelevant
- Status: candidate
- Confidence: 0.34
- Tags: backtracking, blind-75, dfs, grid, word-search
- Statement: A Word Search game teaches the real DFS only when the current letter trail stays visible, tiles lock only the active trail, and dead branches are recovered by peeling back one letter instead of restarting from the board root.

## Crosstide v1
- Source: version
- Rank: 0.57
- Feedback: useful
- Decision: keep
- Tags: bfs, blind-75, dfs, grid, kept-game, multi-source, pacific-atlantic-water-flow, reverse-reachability
- Hypothesis: A dual-border tide chart can teach Pacific Atlantic Water Flow directly if both oceans begin at their full borders, each tide climbs only into equal-or-higher neighbors, and the player wins by sealing the overlap of the two completed reverse maps.
- Notes: Strong enough to claim Blind 75 #417 directly.

