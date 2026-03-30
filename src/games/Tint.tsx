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
const GRID = 6;
const GAP = 1;
const NUM_COLORS = 4;

const PALETTE = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
const PALETTE_LIGHT = ['#ff6b6b', '#5dade2', '#58d68d', '#f7dc6f'];
const COLOR_EMOJI = ['\uD83D\uDFE5', '\uD83D\uDFE6', '\uD83D\uDFE9', '\uD83D\uDFE8'];
const UNCOLORED_BG = '#3a3a3c';
const BORDER_NORMAL = '#222';
const BORDER_CONFLICT = '#ff4444';

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1=Mon … 5=Fri, 3=weekend
  return { numRegions: Math.min(6 + d * 2, 15) };
}

/* ─── Region generation (BFS Voronoi on 6x6 grid) ─── */
type RegionData = {
  regionMap: number[][];
  numRegions: number;
  adj: boolean[][];
};

function generateRegions(seed: number, target: number): RegionData {
  const rng = seededRandom(seed);
  const n = Math.min(target, GRID * GRID);

  // Place seed cells (no duplicates)
  const seeds: [number, number][] = [];
  const used = new Set<number>();
  let attempts = 0;
  while (seeds.length < n && attempts < 500) {
    const r = Math.floor(rng() * GRID);
    const c = Math.floor(rng() * GRID);
    const key = r * GRID + c;
    if (!used.has(key)) {
      used.add(key);
      seeds.push([r, c]);
    }
    attempts++;
  }
  const numRegions = seeds.length;

  // BFS from all seeds simultaneously
  const regionMap: number[][] = Array.from({ length: GRID }, () =>
    Array(GRID).fill(-1),
  );
  const queue: [number, number, number][] = [];
  for (let i = 0; i < numRegions; i++) {
    const [r, c] = seeds[i];
    regionMap[r][c] = i;
    queue.push([r, c, i]);
  }
  let qi = 0;
  while (qi < queue.length) {
    const [r, c, reg] = queue[qi++];
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      if (
        nr >= 0 &&
        nr < GRID &&
        nc >= 0 &&
        nc < GRID &&
        regionMap[nr][nc] === -1
      ) {
        regionMap[nr][nc] = reg;
        queue.push([nr, nc, reg]);
      }
    }
  }

  // Adjacency matrix
  const adj: boolean[][] = Array.from({ length: numRegions }, () =>
    Array(numRegions).fill(false),
  );
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const a = regionMap[r][c];
      if (c + 1 < GRID) {
        const b = regionMap[r][c + 1];
        if (b !== a) {
          adj[a][b] = true;
          adj[b][a] = true;
        }
      }
      if (r + 1 < GRID) {
        const b = regionMap[r + 1][c];
        if (b !== a) {
          adj[a][b] = true;
          adj[b][a] = true;
        }
      }
    }
  }

  return { regionMap, numRegions, adj };
}

/* ─── Quadratic score ─── */
function quadScore(colors: number[]): number {
  const counts = [0, 0, 0, 0];
  for (const c of colors) if (c >= 0) counts[c]++;
  return counts.reduce((s, n) => s + n * n, 0);
}

/* ─── Optimal coloring solver (backtracking + UB pruning) ─── */
function findOptimalScore(numRegions: number, adj: boolean[][]): number {
  const coloring = new Array(numRegions).fill(-1);
  let best = 0;

  // Order by degree descending (most constrained first)
  const order = Array.from({ length: numRegions }, (_, i) => i);
  order.sort((a, b) => {
    let da = 0,
      db = 0;
    for (let j = 0; j < numRegions; j++) {
      if (adj[a][j]) da++;
      if (adj[b][j]) db++;
    }
    return db - da;
  });

  function ub(assigned: number): number {
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < numRegions; i++)
      if (coloring[i] >= 0) counts[coloring[i]]++;
    const rem = numRegions - assigned;
    const sorted = [...counts].sort((a, b) => b - a);
    sorted[0] += rem; // optimistic: all remaining go to the biggest
    return sorted.reduce((s, n) => s + n * n, 0);
  }

  function dfs(step: number) {
    if (step === numRegions) {
      const s = quadScore(coloring);
      if (s > best) best = s;
      return;
    }
    if (ub(step) <= best) return;

    const region = order[step];
    for (let color = 0; color < NUM_COLORS; color++) {
      let valid = true;
      for (let j = 0; j < numRegions; j++) {
        if (adj[region][j] && coloring[j] === color) {
          valid = false;
          break;
        }
      }
      if (valid) {
        coloring[region] = color;
        dfs(step + 1);
        coloring[region] = -1;
      }
    }
  }

  dfs(0);
  return best;
}

/* ═══════════════════════════════════════════ */
/*                 Component                   */
/* ═══════════════════════════════════════════ */
export default function Tint() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const data = useMemo(
    () => generateRegions(seed, diff.numRegions),
    [seed, diff.numRegions],
  );
  const par = useMemo(
    () => findOptimalScore(data.numRegions, data.adj),
    [data],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (GRID - 1) * GAP) / GRID);
  const gridWidth = GRID * cellSize + (GRID - 1) * GAP;

  /* state */
  const [regionColors, setRegionColors] = useState<number[]>(
    () => new Array(data.numRegions).fill(-1),
  );
  const [activeColor, setActiveColor] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: GRID * GRID }, () => new Animated.Value(1)),
  ).current;

  /* derived */
  const score = useMemo(() => quadScore(regionColors), [regionColors]);

  const conflicts = useMemo(() => {
    let c = 0;
    for (let i = 0; i < data.numRegions; i++) {
      for (let j = i + 1; j < data.numRegions; j++) {
        if (
          data.adj[i][j] &&
          regionColors[i] >= 0 &&
          regionColors[j] >= 0 &&
          regionColors[i] === regionColors[j]
        ) {
          c++;
        }
      }
    }
    return c;
  }, [regionColors, data]);

  const allColored = useMemo(
    () => regionColors.every((c) => c >= 0),
    [regionColors],
  );

  /* check for auto-completion */
  const justCompleted = allColored && conflicts === 0 && !gameOver;

  const completeGame = useCallback(() => {
    if (gameOver) return;
    setGameOver(true);
    recordGame('tint', score, par, true).then((s) => {
      setStats(s);
      setShowStats(true);
    });
  }, [score, par, gameOver]);

  /* tap a cell → paint its region */
  const handleTapCell = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      const reg = data.regionMap[r][c];

      const newColors = [...regionColors];
      if (regionColors[reg] === activeColor) {
        newColors[reg] = -1; // erase
      } else {
        newColors[reg] = activeColor;
      }

      // animate all cells in the region
      for (let rr = 0; rr < GRID; rr++) {
        for (let cc = 0; cc < GRID; cc++) {
          if (data.regionMap[rr][cc] === reg) {
            const idx = rr * GRID + cc;
            Animated.sequence([
              Animated.timing(cellScales[idx], {
                toValue: 1.12,
                duration: 60,
                useNativeDriver: true,
              }),
              Animated.spring(cellScales[idx], {
                toValue: 1,
                friction: 3,
                tension: 200,
                useNativeDriver: true,
              }),
            ]).start();
          }
        }
      }

      setRegionColors(newColors);

      // Check completion after this paint
      const nowAllColored = newColors.every((cc) => cc >= 0);
      if (nowAllColored) {
        let nowConflicts = 0;
        for (let i = 0; i < data.numRegions; i++) {
          for (let j = i + 1; j < data.numRegions; j++) {
            if (
              data.adj[i][j] &&
              newColors[i] >= 0 &&
              newColors[j] >= 0 &&
              newColors[i] === newColors[j]
            ) {
              nowConflicts++;
            }
          }
        }
        if (nowConflicts === 0) {
          const finalScore = quadScore(newColors);
          setGameOver(true);
          recordGame('tint', finalScore, par, true).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        }
      }
    },
    [gameOver, activeColor, regionColors, data, par, cellScales],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('tint');
    setStats(s);
    setShowStats(true);
  }, []);

  /* border helpers */
  function cellBorder(r: number, c: number, dr: number, dc: number): [number, string] {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) return [2, BORDER_NORMAL];
    const regA = data.regionMap[r][c];
    const regB = data.regionMap[nr][nc];
    if (regA === regB) return [0, 'transparent'];
    // Region boundary — check for conflict
    if (
      regionColors[regA] >= 0 &&
      regionColors[regB] >= 0 &&
      regionColors[regA] === regionColors[regB]
    ) {
      return [3, BORDER_CONFLICT];
    }
    return [2, BORDER_NORMAL];
  }

  /* share text */
  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < GRID; r++) {
      let row = '';
      for (let c = 0; c < GRID; c++) {
        const reg = data.regionMap[r][c];
        const col = regionColors[reg];
        row += col >= 0 ? COLOR_EMOJI[col] : '\u2B1B';
      }
      rows.push(row);
    }
    const finalScore = quadScore(regionColors);
    return [
      `Tint Day #${puzzleDay} \uD83C\uDFA8`,
      rows.join('\n'),
      `Score: ${finalScore} / ${par}${finalScore >= par ? ' \u2B50' : ''}`,
    ].join('\n');
  }

  /* score breakdown */
  const colorCounts = useMemo(() => {
    const counts = [0, 0, 0, 0];
    for (const c of regionColors) if (c >= 0) counts[c]++;
    return counts;
  }, [regionColors]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tint</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Paint {data.numRegions} regions — no matching neighbors — maximize
        your score!
      </Text>

      {/* Info row */}
      <View style={styles.infoRow}>
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
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Conflicts</Text>
          <Text
            style={[
              styles.infoValue,
              conflicts > 0 && styles.infoValueBad,
              conflicts === 0 && allColored && styles.infoValueGood,
            ]}
          >
            {conflicts}
          </Text>
        </View>
      </View>

      {/* Score breakdown */}
      <View style={styles.breakdownRow}>
        {PALETTE.map((color, i) => (
          <View key={i} style={styles.breakdownItem}>
            <View
              style={[styles.breakdownSwatch, { backgroundColor: color }]}
            />
            <Text style={styles.breakdownText}>
              {colorCounts[i]}{colorCounts[i] > 0 ? `\u00B2=${colorCounts[i] * colorCounts[i]}` : ''}
            </Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth, height: gridWidth }]}>
        {Array.from({ length: GRID }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: GRID }).map((_, c) => {
              const reg = data.regionMap[r][c];
              const col = regionColors[reg];
              const bg = col >= 0 ? PALETTE[col] : UNCOLORED_BG;

              const [btw, btc] = cellBorder(r, c, -1, 0);
              const [bbw, bbc] = cellBorder(r, c, 1, 0);
              const [blw, blc] = cellBorder(r, c, 0, -1);
              const [brw, brc] = cellBorder(r, c, 0, 1);

              const isActive = col === activeColor && col >= 0;

              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[r * GRID + c] }] }}
                >
                  <Pressable
                    onPress={() => handleTapCell(r, c)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: bg,
                        borderTopWidth: btw,
                        borderTopColor: btc,
                        borderBottomWidth: bbw,
                        borderBottomColor: bbc,
                        borderLeftWidth: blw,
                        borderLeftColor: blc,
                        borderRightWidth: brw,
                        borderRightColor: brc,
                      },
                    ]}
                  >
                    {col < 0 && (
                      <Text style={styles.regionLabel}>
                        {reg + 1}
                      </Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Color palette */}
      {!gameOver && (
        <View style={styles.palette}>
          {PALETTE.map((color, i) => (
            <Pressable
              key={i}
              onPress={() => setActiveColor(i)}
              style={[
                styles.paletteSwatch,
                { backgroundColor: color },
                activeColor === i && styles.paletteSelected,
              ]}
            />
          ))}
        </View>
      )}

      <CelebrationBurst show={gameOver && score >= par} />

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {score >= par ? '\u2B50' : '\uD83C\uDFA8'}
          </Text>
          <Text style={styles.winText}>
            {score >= par
              ? `Score ${score} \u2014 beat par (${par})!`
              : `Score ${score} / ${par}`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Select a color below, then tap regions to paint them.
          Adjacent regions can't share a color.
          {'\n\n'}
          Score = sum of (count per color){'\u00B2'}. Concentrate one
          color to score big! The puzzle completes when every region is
          painted with no conflicts.
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
    maxWidth: 340,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
    alignItems: 'baseline',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 12 },
  infoValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  infoValueGood: { color: '#2ecc71' },
  infoValueBad: { color: '#e74c3c' },
  infoPar: { color: '#818384', fontSize: 18, fontWeight: '600', marginTop: 2 },
  breakdownRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  breakdownItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breakdownSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  breakdownText: { color: '#aaa', fontSize: 12, fontFamily: 'monospace' },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  regionLabel: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
  },
  palette: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  paletteSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  paletteSelected: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
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
