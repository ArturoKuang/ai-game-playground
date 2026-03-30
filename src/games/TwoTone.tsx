import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Animated,
} from 'react-native';
import ShareButton from '../components/ShareButton';
import StatsModal from '../components/StatsModal';
import CelebrationBurst from '../components/CelebrationBurst';
import {
  getDailySeed,
  seededRandom,
  getPuzzleDay,
  getDayDifficulty,
} from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';

/* ─── Constants ─── */
const G = 6; // grid size (must be even)
const GAP = 2;
const DARK = 0;
const LIGHT = 1;

const DARK_COLOR = '#2c3e50';
const DARK_BORDER = '#1a252f';
const LIGHT_COLOR = '#f1c40f';
const LIGHT_BORDER = '#d4ac0d';
const EMPTY_BG = '#1a1a1b';
const EMPTY_BORDER = '#2a2a2c';

type Cell = number | null; // 0=dark, 1=light, null=empty
type Grid = Cell[][];

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1-5
  // More clues on easy days, fewer on hard
  const numClues = 18 - d * 2; // Mon: 16, Fri: 8
  const parSeconds = 30 + d * 30; // Mon: 60s, Fri: 180s
  return { numClues, parSeconds };
}

/* ─── Constraint checking ─── */
function canPlace(grid: Grid, r: number, c: number, val: number): boolean {
  // Triple in row
  if (c >= 2 && grid[r][c - 1] === val && grid[r][c - 2] === val) return false;
  if (
    c >= 1 &&
    c < G - 1 &&
    grid[r][c - 1] === val &&
    grid[r][c + 1] === val
  )
    return false;
  if (c < G - 2 && grid[r][c + 1] === val && grid[r][c + 2] === val)
    return false;

  // Triple in column
  if (r >= 2 && grid[r - 1][c] === val && grid[r - 2][c] === val) return false;
  if (
    r >= 1 &&
    r < G - 1 &&
    grid[r - 1][c] === val &&
    grid[r + 1][c] === val
  )
    return false;
  if (r < G - 2 && grid[r + 1][c] === val && grid[r + 2][c] === val)
    return false;

  // Row count
  let rc = 0;
  for (let cc = 0; cc < G; cc++) if (grid[r][cc] === val) rc++;
  if (rc >= G / 2) return false;

  // Column count
  let cc2 = 0;
  for (let rr = 0; rr < G; rr++) if (grid[rr][c] === val) cc2++;
  if (cc2 >= G / 2) return false;

  return true;
}

/* ─── Find all triple violations ─── */
function findTriples(grid: Grid): Set<number> {
  const bad = new Set<number>();
  for (let r = 0; r < G; r++) {
    for (let c = 0; c <= G - 3; c++) {
      if (
        grid[r][c] !== null &&
        grid[r][c] === grid[r][c + 1] &&
        grid[r][c] === grid[r][c + 2]
      ) {
        bad.add(r * G + c);
        bad.add(r * G + c + 1);
        bad.add(r * G + c + 2);
      }
    }
  }
  for (let c = 0; c < G; c++) {
    for (let r = 0; r <= G - 3; r++) {
      if (
        grid[r][c] !== null &&
        grid[r][c] === grid[r + 1][c] &&
        grid[r][c] === grid[r + 2][c]
      ) {
        bad.add(r * G + c);
        bad.add((r + 1) * G + c);
        bad.add((r + 2) * G + c);
      }
    }
  }
  return bad;
}

/* ─── Count values in row/col ─── */
function lineCounts(grid: Grid): {
  rows: [number, number][];
  cols: [number, number][];
} {
  const rows: [number, number][] = [];
  const cols: [number, number][] = [];
  for (let r = 0; r < G; r++) {
    let d = 0,
      l = 0;
    for (let c = 0; c < G; c++) {
      if (grid[r][c] === DARK) d++;
      else if (grid[r][c] === LIGHT) l++;
    }
    rows.push([d, l]);
  }
  for (let c = 0; c < G; c++) {
    let d = 0,
      l = 0;
    for (let r = 0; r < G; r++) {
      if (grid[r][c] === DARK) d++;
      else if (grid[r][c] === LIGHT) l++;
    }
    cols.push([d, l]);
  }
  return { rows, cols };
}

/* ─── Generate a valid complete grid ─── */
function generateSolution(rng: () => number): Grid {
  const grid: Grid = Array.from({ length: G }, () => Array(G).fill(null));

  function solve(pos: number): boolean {
    if (pos === G * G) return true;
    const r = Math.floor(pos / G);
    const c = pos % G;
    const first = rng() < 0.5 ? DARK : LIGHT;
    const opts = [first, 1 - first];
    for (const val of opts) {
      if (canPlace(grid, r, c, val)) {
        grid[r][c] = val;
        if (solve(pos + 1)) return true;
        grid[r][c] = null;
      }
    }
    return false;
  }

  solve(0);
  return grid;
}

/* ─── Count solutions (for uniqueness) ─── */
function countSolutions(puzzle: Grid, limit: number = 2): number {
  const grid: Grid = puzzle.map((row) => [...row]);
  let count = 0;

  function solve(): boolean {
    // Constraint propagation
    let changed = true;
    const saved: [number, number][] = [];
    while (changed) {
      changed = false;
      for (let r = 0; r < G; r++) {
        for (let c = 0; c < G; c++) {
          if (grid[r][c] !== null) continue;
          const c0 = canPlace(grid, r, c, DARK);
          const c1 = canPlace(grid, r, c, LIGHT);
          if (!c0 && !c1) {
            for (const [sr, sc] of saved) grid[sr][sc] = null;
            return false;
          }
          if (c0 && !c1) {
            grid[r][c] = DARK;
            saved.push([r, c]);
            changed = true;
          } else if (!c0 && c1) {
            grid[r][c] = LIGHT;
            saved.push([r, c]);
            changed = true;
          }
        }
      }
    }

    // Find first empty
    for (let r = 0; r < G; r++) {
      for (let c = 0; c < G; c++) {
        if (grid[r][c] !== null) continue;
        for (const val of [DARK, LIGHT]) {
          if (!canPlace(grid, r, c, val)) continue;
          const clone = grid.map((row) => [...row]);
          clone[r][c] = val;
          const sub = countInner(clone);
          count += sub;
          if (count >= limit) {
            for (const [sr, sc] of saved) grid[sr][sc] = null;
            return true;
          }
        }
        for (const [sr, sc] of saved) grid[sr][sc] = null;
        return false;
      }
    }

    // All filled
    count++;
    for (const [sr, sc] of saved) grid[sr][sc] = null;
    return count >= limit;
  }

  function countInner(g: Grid): number {
    // Simple recursive count with propagation
    let innerCount = 0;

    // Propagate
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < G; r++) {
        for (let c = 0; c < G; c++) {
          if (g[r][c] !== null) continue;
          const c0 = canPlace(g, r, c, DARK);
          const c1 = canPlace(g, r, c, LIGHT);
          if (!c0 && !c1) return 0;
          if (c0 && !c1) {
            g[r][c] = DARK;
            changed = true;
          } else if (!c0 && c1) {
            g[r][c] = LIGHT;
            changed = true;
          }
        }
      }
    }

    // Find first empty
    for (let r = 0; r < G; r++) {
      for (let c = 0; c < G; c++) {
        if (g[r][c] !== null) continue;
        for (const val of [DARK, LIGHT]) {
          if (!canPlace(g, r, c, val)) continue;
          const clone = g.map((row) => [...row]);
          clone[r][c] = val;
          innerCount += countInner(clone);
          if (innerCount >= 2) return innerCount;
        }
        return innerCount;
      }
    }

    return 1; // all filled = 1 solution
  }

  solve();
  return count;
}

/* ─── Create puzzle from solution ─── */
function createPuzzle(
  solution: Grid,
  rng: () => number,
  targetClues: number,
): { puzzle: Grid; clueSet: Set<number> } {
  const puzzle: Grid = solution.map((row) => [...row]);
  const clueSet = new Set<number>();
  for (let i = 0; i < G * G; i++) clueSet.add(i);

  // Shuffle positions
  const positions: number[] = Array.from({ length: G * G }, (_, i) => i);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  for (const pos of positions) {
    if (clueSet.size <= targetClues) break;
    const r = Math.floor(pos / G);
    const c = pos % G;
    const val = puzzle[r][c];
    puzzle[r][c] = null;

    if (countSolutions(puzzle) === 1) {
      clueSet.delete(pos);
    } else {
      puzzle[r][c] = val;
    }
  }

  return { puzzle, clueSet };
}

/* ─── Full generation ─── */
function generateGame(
  seed: number,
  numClues: number,
): { puzzle: Grid; solution: Grid; clueSet: Set<number> } {
  const rng = seededRandom(seed);
  const solution = generateSolution(rng);
  const { puzzle, clueSet } = createPuzzle(solution, rng, numClues);
  return { puzzle, solution, clueSet };
}

/* ─── Check win ─── */
function isComplete(grid: Grid): boolean {
  for (let r = 0; r < G; r++)
    for (let c = 0; c < G; c++) if (grid[r][c] === null) return false;
  if (findTriples(grid).size > 0) return false;
  const { rows, cols } = lineCounts(grid);
  return (
    rows.every(([d, l]) => d === G / 2 && l === G / 2) &&
    cols.every(([d, l]) => d === G / 2 && l === G / 2)
  );
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function TwoTone() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const game = useMemo(
    () => generateGame(seed, diff.numClues),
    [seed, diff.numClues],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (G - 1) * GAP) / G);
  const gridWidth = G * cellSize + (G - 1) * GAP;

  const [grid, setGrid] = useState<Grid>(() =>
    game.puzzle.map((row) => [...row]),
  );
  const [gameOver, setGameOver] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: G * G }, () => new Animated.Value(1)),
  ).current;

  const triples = useMemo(() => findTriples(grid), [grid]);
  const counts = useMemo(() => lineCounts(grid), [grid]);
  const filled = useMemo(() => {
    let n = 0;
    for (const row of grid) for (const c of row) if (c !== null) n++;
    return n;
  }, [grid]);

  /* ─── tap cell ─── */
  const handleTap = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      const key = r * G + c;
      if (game.clueSet.has(key)) return; // pre-filled

      Animated.sequence([
        Animated.timing(cellScales[key], {
          toValue: 1.15,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.spring(cellScales[key], {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const newGrid = grid.map((row) => [...row]);
      const cur = newGrid[r][c];
      if (cur === null) newGrid[r][c] = DARK;
      else if (cur === DARK) newGrid[r][c] = LIGHT;
      else newGrid[r][c] = null;

      setGrid(newGrid);

      if (isComplete(newGrid)) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        setEndTime(elapsed);
        setGameOver(true);
        recordGame('twotone', elapsed, diff.parSeconds).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [grid, gameOver, game.clueSet, cellScales, startTime, diff.parSeconds],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('twotone');
    setStats(s);
    setShowStats(true);
  }, []);

  /* ─── share text ─── */
  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < G; r++) {
      let row = '';
      for (let c = 0; c < G; c++) {
        row += grid[r][c] === DARK ? '\uD83C\uDF11' : '\uD83C\uDF15';
      }
      rows.push(row);
    }
    const t = endTime ?? 0;
    const min = Math.floor(t / 60);
    const sec = t % 60;
    const timeStr = min > 0 ? `${min}:${String(sec).padStart(2, '0')}` : `${sec}s`;
    const under = t <= diff.parSeconds;
    return [
      `TwoTone Day #${puzzleDay} \uD83C\uDF13`,
      rows.join('\n'),
      under ? `\u2B50 ${timeStr}` : `${timeStr} (par ${Math.floor(diff.parSeconds / 60)}:${String(diff.parSeconds % 60).padStart(2, '0')})`,
    ].join('\n');
  }

  /* ─── render ─── */
  const half = G / 2;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TwoTone</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Fill every cell — no 3 in a row, {half} of each per line!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Filled</Text>
          <Text style={styles.infoValue}>
            {filled}/{G * G}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>
            {Math.floor(diff.parSeconds / 60)}:
            {String(diff.parSeconds % 60).padStart(2, '0')}
          </Text>
        </View>
      </View>

      {/* Grid with row/col counts */}
      <View style={styles.gridArea}>
        {/* Column headers */}
        <View style={[styles.colHeaders, { width: gridWidth }]}>
          {counts.cols.map(([d, l], c) => (
            <View
              key={c}
              style={[styles.countCell, { width: cellSize }]}
            >
              <Text
                style={[
                  styles.countText,
                  d > half && styles.countBad,
                  d === half && styles.countDone,
                ]}
              >
                {d}
              </Text>
              <Text
                style={[
                  styles.countText,
                  styles.countLight,
                  l > half && styles.countBad,
                  l === half && styles.countDone,
                ]}
              >
                {l}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.gridRow2}>
          {/* Grid */}
          <View
            style={[styles.grid, { width: gridWidth, height: gridWidth }]}
          >
            {Array.from({ length: G }).map((_, r) => (
              <View key={r} style={styles.gridRow}>
                {Array.from({ length: G }).map((_, c) => {
                  const key = r * G + c;
                  const val = grid[r][c];
                  const isClue = game.clueSet.has(key);
                  const isTriple = triples.has(key);

                  let bg = EMPTY_BG;
                  let border = EMPTY_BORDER;
                  let bw = 1;
                  if (val === DARK) {
                    bg = DARK_COLOR;
                    border = isTriple ? '#e74c3c' : DARK_BORDER;
                    bw = isClue ? 3 : 2;
                  } else if (val === LIGHT) {
                    bg = LIGHT_COLOR;
                    border = isTriple ? '#e74c3c' : LIGHT_BORDER;
                    bw = isClue ? 3 : 2;
                  }

                  return (
                    <Animated.View
                      key={c}
                      style={{
                        transform: [{ scale: cellScales[key] }],
                      }}
                    >
                      <Pressable
                        onPress={() => handleTap(r, c)}
                        style={[
                          styles.cell,
                          {
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: bg,
                            borderColor: border,
                            borderWidth: bw,
                            opacity: isClue ? 1 : 0.85,
                          },
                        ]}
                      />
                    </Animated.View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Row counts */}
          <View style={styles.rowCounts}>
            {counts.rows.map(([d, l], r) => (
              <View
                key={r}
                style={[styles.rowCountCell, { height: cellSize }]}
              >
                <Text
                  style={[
                    styles.countText,
                    d > half && styles.countBad,
                    d === half && styles.countDone,
                  ]}
                >
                  {d}
                </Text>
                <Text
                  style={[
                    styles.countText,
                    styles.countLight,
                    l > half && styles.countBad,
                    l === half && styles.countDone,
                  ]}
                >
                  {l}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <CelebrationBurst show={gameOver} />

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {(endTime ?? 0) <= diff.parSeconds ? '\u2B50' : '\uD83C\uDF13'}
          </Text>
          <Text style={styles.winText}>
            {(endTime ?? 0) <= diff.parSeconds
              ? `Solved in ${Math.floor((endTime ?? 0) / 60)}:${String((endTime ?? 0) % 60).padStart(2, '0')} \u2014 under par!`
              : `Solved in ${Math.floor((endTime ?? 0) / 60)}:${String((endTime ?? 0) % 60).padStart(2, '0')}`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap cells to cycle: empty {'\u2192'} dark {'\u2192'} light{' '}
          {'\u2192'} empty.{'\n\n'}
          Rules:{'\n'}
          {'\u2022'} Each row and column must have exactly {half} dark and{' '}
          {half} light{'\n'}
          {'\u2022'} No three consecutive same-color in any row or column
          {'\n\n'}
          Numbers on the edges show current dark/light counts per line.
          Red = violation.
        </Text>
      </View>

      {showStats && stats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
    </ScrollView>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#121213',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  dayBadge: { color: '#6aaa64', fontSize: 13, fontWeight: '600' },
  statsIcon: { fontSize: 24 },
  subtitle: {
    fontSize: 13,
    color: '#818384',
    marginTop: 2,
    marginBottom: 12,
    textAlign: 'center',
    maxWidth: 320,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
    alignItems: 'baseline',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 12 },
  infoValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  infoPar: { color: '#818384', fontSize: 14, marginTop: 2 },
  gridArea: { alignItems: 'flex-start' },
  colHeaders: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: 4,
    marginLeft: 0,
  },
  countCell: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 2 },
  rowCounts: { marginLeft: 6, gap: GAP, justifyContent: 'center' },
  rowCountCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
  },
  countLight: { color: '#a08520' },
  countBad: { color: '#e74c3c' },
  countDone: { color: '#2ecc71' },
  gridRow2: { flexDirection: 'row', alignItems: 'flex-start' },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: { borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  winMessage: { alignItems: 'center', marginTop: 20 },
  winEmoji: { fontSize: 48 },
  winText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
});
