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
const SIZE = 5;
const GAP = 3;

type Cell = number | null; // null = empty, 0-3 = color
type Grid = Cell[][];
type Dir = 'up' | 'down' | 'left' | 'right';

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
const BORDERS = ['#c0392b', '#2980b9', '#27ae60', '#e67e22'];
const EMOJI = ['\uD83D\uDFE5', '\uD83D\uDFE6', '\uD83D\uDFE9', '\uD83D\uDFE8'];
const DR: Record<Dir, number> = { up: -1, down: 1, left: 0, right: 0 };
const DC: Record<Dir, number> = { up: 0, down: 0, left: -1, right: 1 };
const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  const numColors = d <= 2 ? 3 : 4;
  const fillRate = 0.55 + d * 0.05; // Mon: 60%, Fri: 80%
  const numPushes = 3 + Math.ceil(d / 2); // Mon: 4, Fri: 6
  return { numColors, fillRate, numPushes };
}

/* ─── Generate grid ─── */
function generateGrid(seed: number, numColors: number, fillRate: number): Grid {
  const rng = seededRandom(seed);
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () =>
      rng() < fillRate ? Math.floor(rng() * numColors) : null,
    ),
  );
}

/* ─── Find where a block would slide to ─── */
function slideTo(
  grid: Grid,
  r: number,
  c: number,
  dir: Dir,
): { r: number; c: number } | null {
  let cr = r + DR[dir];
  let cc = c + DC[dir];
  let lr = r;
  let lc = c;
  while (cr >= 0 && cr < SIZE && cc >= 0 && cc < SIZE) {
    if (grid[cr][cc] !== null) break;
    lr = cr;
    lc = cc;
    cr += DR[dir];
    cc += DC[dir];
  }
  if (lr === r && lc === c) return null; // didn't move
  return { r: lr, c: lc };
}

/* ─── Find connected groups of 3+ ─── */
function findGroups(grid: Grid): number[][] {
  const visited = new Set<number>();
  const groups: number[][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const key = r * SIZE + c;
      if (grid[r][c] === null || visited.has(key)) continue;
      const color = grid[r][c];
      const group: number[] = [];
      const stack = [key];
      visited.add(key);
      while (stack.length > 0) {
        const k = stack.pop()!;
        group.push(k);
        const kr = Math.floor(k / SIZE);
        const kc = k % SIZE;
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nr = kr + dr;
          const nc = kc + dc;
          const nk = nr * SIZE + nc;
          if (
            nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE &&
            !visited.has(nk) && grid[nr][nc] === color
          ) {
            visited.add(nk);
            stack.push(nk);
          }
        }
      }
      if (group.length >= 3) groups.push(group);
    }
  }
  return groups;
}

/* ─── Apply gravity: blocks fall down within each column ─── */
function applyGravity(grid: Grid): Grid {
  const g: Grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  for (let c = 0; c < SIZE; c++) {
    const blocks: number[] = [];
    for (let r = 0; r < SIZE; r++) {
      if (grid[r][c] !== null) blocks.push(grid[r][c]!);
    }
    for (let i = 0; i < blocks.length; i++) {
      g[SIZE - blocks.length + i][c] = blocks[i];
    }
  }
  return g;
}

/* ─── Simulate a push: move block + score groups + clear + gravity ─── */
function simulatePush(
  grid: Grid,
  fromR: number,
  fromC: number,
  dir: Dir,
): { grid: Grid; score: number; toR: number; toC: number } | null {
  const dest = slideTo(grid, fromR, fromC, dir);
  if (!dest) return null;

  let g: Grid = grid.map((row) => [...row]);
  g[dest.r][dest.c] = g[fromR][fromC];
  g[fromR][fromC] = null;

  const groups = findGroups(g);
  let score = 0;
  for (const group of groups) {
    score += group.length * group.length;
    for (const k of group) g[Math.floor(k / SIZE)][k % SIZE] = null;
  }

  // Apply gravity after clearing (blocks settle down, no auto-chain)
  if (score > 0) g = applyGravity(g);

  return { grid: g, score, toR: dest.r, toC: dest.c };
}

/* ─── Greedy solver for par ─── */
function greedySolve(grid: Grid, numPushes: number): number {
  let g: Grid = grid.map((r) => [...r]);
  let total = 0;
  for (let p = 0; p < numPushes; p++) {
    let bestScore = 0;
    let bestResult: { grid: Grid; score: number } | null = null;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (g[r][c] === null) continue;
        for (const dir of DIRS) {
          const result = simulatePush(g, r, c, dir);
          if (result && result.score > bestScore) {
            bestScore = result.score;
            bestResult = result;
          }
        }
      }
    }
    if (bestResult) {
      g = bestResult.grid;
      total += bestResult.score;
    } else break;
  }
  return total;
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Shove() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const initialGrid = useMemo(
    () => applyGravity(generateGrid(seed, diff.numColors, diff.fillRate)),
    [seed, diff.numColors, diff.fillRate],
  );
  const par = useMemo(
    () => greedySolve(initialGrid, diff.numPushes),
    [initialGrid, diff.numPushes],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  const [grid, setGrid] = useState<Grid>(() =>
    initialGrid.map((r) => [...r]),
  );
  const [pushes, setPushes] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  /* ─── Ghost landing positions for selected block ─── */
  const ghosts = useMemo(() => {
    if (selectedBlock === null) return new Map<number, { dir: Dir; score: number }>();
    const sr = Math.floor(selectedBlock / SIZE);
    const sc = selectedBlock % SIZE;
    const result = new Map<number, { dir: Dir; score: number }>();
    for (const dir of DIRS) {
      const sim = simulatePush(grid, sr, sc, dir);
      if (sim) {
        result.set(sim.toR * SIZE + sim.toC, { dir, score: sim.score });
      }
    }
    return result;
  }, [selectedBlock, grid]);

  /* ─── handle tap ─── */
  const handleTap = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      const key = r * SIZE + c;

      // Tapping a ghost position → confirm push
      const ghost = ghosts.get(key);
      if (ghost && selectedBlock !== null) {
        const sr = Math.floor(selectedBlock / SIZE);
        const sc = selectedBlock % SIZE;
        const result = simulatePush(grid, sr, sc, ghost.dir);
        if (!result) return;

        // Animate block
        Animated.sequence([
          Animated.timing(cellScales[key], {
            toValue: 1.2,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(cellScales[key], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();

        const newScore = score + result.score;
        const newPushes = pushes + 1;

        setGrid(result.grid);
        setScore(newScore);
        setPushes(newPushes);
        setSelectedBlock(null);

        if (newPushes >= diff.numPushes) {
          setGameOver(true);
          recordGame('shove', newScore, par, true).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        }
        return;
      }

      // Tapping a block → select it
      if (grid[r][c] !== null) {
        setSelectedBlock(selectedBlock === key ? null : key);
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
        return;
      }

      // Tapping empty → deselect
      setSelectedBlock(null);
    },
    [grid, selectedBlock, ghosts, pushes, score, gameOver, diff.numPushes, par, cellScales],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('shove');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        row += v !== null ? EMOJI[v] : '\u2B1B';
      }
      rows.push(row);
    }
    return [
      `Shove Day #${puzzleDay} \uD83D\uDFE7`,
      rows.join('\n'),
      `Score: ${score} (par ${par})`,
      score >= par ? '\u2B50 Beat par!' : `${par - score} short`,
    ].join('\n');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shove</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Push blocks to slide — match 3+ to score and clear!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Pushes</Text>
          <Text style={styles.infoValue}>
            {pushes}/{diff.numPushes}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Score</Text>
          <Text
            style={[
              styles.infoValue,
              gameOver && score >= par && styles.infoValueGood,
            ]}
          >
            {score}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth, height: gridWidth }]}>
        {Array.from({ length: SIZE }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }).map((_, c) => {
              const key = r * SIZE + c;
              const val = grid[r][c];
              const isSelected = selectedBlock === key;
              const ghostInfo = ghosts.get(key);
              const isGhost = !!ghostInfo;

              if (val !== null) {
                // Block cell
                return (
                  <Animated.View
                    key={c}
                    style={{ transform: [{ scale: cellScales[key] }] }}
                  >
                    <Pressable
                      onPress={() => handleTap(r, c)}
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: COLORS[val],
                          borderColor: isSelected ? '#f1c40f' : BORDERS[val],
                          borderWidth: isSelected ? 3 : 2,
                        },
                      ]}
                    />
                  </Animated.View>
                );
              }

              // Empty cell (might be a ghost landing)
              if (isGhost && selectedBlock !== null) {
                const blockColor = grid[Math.floor(selectedBlock / SIZE)][selectedBlock % SIZE]!;
                return (
                  <Animated.View
                    key={c}
                    style={{ transform: [{ scale: cellScales[key] }] }}
                  >
                    <Pressable
                      onPress={() => handleTap(r, c)}
                      style={[
                        styles.cell,
                        styles.ghostCell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: COLORS[blockColor] + '44',
                          borderColor: ghostInfo.score > 0 ? '#2ecc71' : '#555',
                          borderWidth: 2,
                          borderStyle: 'dashed',
                        },
                      ]}
                    >
                      {ghostInfo.score > 0 && (
                        <Text style={styles.ghostScore}>+{ghostInfo.score}</Text>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              }

              return (
                <Pressable
                  key={c}
                  onPress={() => handleTap(r, c)}
                  style={[
                    styles.emptyCell,
                    { width: cellSize, height: cellSize },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>

      <CelebrationBurst show={gameOver && score >= par} />

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {score >= par ? '\u2B50' : '\uD83D\uDFE7'}
          </Text>
          <Text style={styles.winText}>
            {score >= par
              ? `Score ${score} \u2014 beat par (${par})!`
              : `Score ${score} (par ${par})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap a block to select it. Ghost markers show where it can
          slide. Green ghosts mean a group of 3+ will form and score!
          Tap a ghost to push.
          {'\n\n'}
          Bigger groups score more (size{'\u00B2'}). Clearing blocks
          opens space for longer slides. Plan your {diff.numPushes}{' '}
          pushes!
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
    maxWidth: 300,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
    alignItems: 'baseline',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 12 },
  infoValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  infoValueGood: { color: '#2ecc71' },
  infoPar: { color: '#818384', fontSize: 14, marginTop: 2 },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ghostCell: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ghostScore: {
    color: '#2ecc71',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyCell: {
    borderRadius: 8,
    backgroundColor: '#1a1a1b',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
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
