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
const CONFLICT_PENALTY = 5;

const PALETTE = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
const COLOR_EMOJI = [
  '\uD83D\uDFE5',
  '\uD83D\uDFE6',
  '\uD83D\uDFE9',
  '\uD83D\uDFE8',
];
const UNCOLORED_BG = '#3a3a3c';
const BORDER_NORMAL = '#222';
const BORDER_CONFLICT = '#ff4444';

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  return { numRegions: Math.min(6 + d * 2, 15) };
}

/* ─── Region generation ─── */
type RegionData = {
  regionMap: number[][];
  numRegions: number;
  adj: boolean[][];
};

function generateRegions(seed: number, target: number): RegionData {
  const rng = seededRandom(seed);
  const n = Math.min(target, GRID * GRID);
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

/* ─── Scoring: quadratic - penalty × conflicts ─── */
function computeScore(
  colors: number[],
  adj: boolean[][],
): { quad: number; conflicts: number; total: number } {
  const counts = [0, 0, 0, 0];
  for (const c of colors) if (c >= 0) counts[c]++;
  const quad = counts.reduce((s, n) => s + n * n, 0);
  let conflicts = 0;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      if (adj[i][j] && colors[i] >= 0 && colors[j] >= 0 && colors[i] === colors[j])
        conflicts++;
    }
  }
  return { quad, conflicts, total: quad - CONFLICT_PENALTY * conflicts };
}

/* ─── Optimal solver (exact for ≤12 regions, greedy+local for >12) ─── */
function findOptimalScore(numRegions: number, adj: boolean[][]): number {
  if (numRegions <= 12) return exactSolve(numRegions, adj);
  return greedyLocalSolve(numRegions, adj);
}

function exactSolve(numRegions: number, adj: boolean[][]): number {
  const coloring = new Array(numRegions).fill(-1);
  let best = -Infinity;

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

  function objective(): number {
    const counts = [0, 0, 0, 0];
    let conflicts = 0;
    for (let i = 0; i < numRegions; i++) {
      if (coloring[i] >= 0) counts[coloring[i]]++;
    }
    for (let i = 0; i < numRegions; i++) {
      for (let j = i + 1; j < numRegions; j++) {
        if (adj[i][j] && coloring[i] >= 0 && coloring[j] >= 0 && coloring[i] === coloring[j])
          conflicts++;
      }
    }
    return counts.reduce((s, n) => s + n * n, 0) - CONFLICT_PENALTY * conflicts;
  }

  function ub(step: number): number {
    const counts = [0, 0, 0, 0];
    let currentConflicts = 0;
    for (let i = 0; i < numRegions; i++) {
      if (coloring[i] >= 0) {
        counts[coloring[i]]++;
        for (let j = i + 1; j < numRegions; j++) {
          if (
            coloring[j] >= 0 &&
            adj[i][j] &&
            coloring[i] === coloring[j]
          )
            currentConflicts++;
        }
      }
    }
    const rem = numRegions - step;
    const sorted = [...counts].sort((a, b) => b - a);
    sorted[0] += rem;
    return sorted.reduce((s, n) => s + n * n, 0) - CONFLICT_PENALTY * currentConflicts;
  }

  function dfs(step: number) {
    if (step === numRegions) {
      const s = objective();
      if (s > best) best = s;
      return;
    }
    if (ub(step) <= best) return;

    const region = order[step];
    for (let color = 0; color < NUM_COLORS; color++) {
      coloring[region] = color;
      dfs(step + 1);
      coloring[region] = -1;
    }
  }

  dfs(0);
  return best;
}

function greedyLocalSolve(numRegions: number, adj: boolean[][]): number {
  const coloring = new Array(numRegions).fill(-1);
  const counts = [0, 0, 0, 0];

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

  // Greedy pass
  for (const region of order) {
    let bestC = 0,
      bestDelta = -Infinity;
    for (let c = 0; c < NUM_COLORS; c++) {
      let delta = 2 * counts[c] + 1;
      for (let j = 0; j < numRegions; j++) {
        if (adj[region][j] && coloring[j] === c) delta -= CONFLICT_PENALTY;
      }
      if (delta > bestDelta) {
        bestDelta = delta;
        bestC = c;
      }
    }
    coloring[region] = bestC;
    counts[bestC]++;
  }

  // Local search
  function obj(): number {
    return computeScore(coloring, adj).total;
  }
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < numRegions; i++) {
      const old = coloring[i];
      const oldObj = obj();
      for (let c = 0; c < NUM_COLORS; c++) {
        if (c === old) continue;
        coloring[i] = c;
        if (obj() > oldObj) {
          improved = true;
          break;
        }
        coloring[i] = old;
      }
    }
  }
  return obj();
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

  const [regionColors, setRegionColors] = useState<number[]>(
    () => new Array(data.numRegions).fill(-1),
  );
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [painted, setPainted] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: GRID * GRID }, () => new Animated.Value(1)),
  ).current;

  const scoreInfo = useMemo(
    () => computeScore(regionColors, data.adj),
    [regionColors, data.adj],
  );

  const regionsLeft = data.numRegions - painted;

  /* P1 preview: delta for each color on the selected region */
  const colorDeltas = useMemo(() => {
    if (selectedRegion === null) return [0, 0, 0, 0];
    const counts = [0, 0, 0, 0];
    for (const c of regionColors) if (c >= 0) counts[c]++;
    return [0, 1, 2, 3].map((c) => {
      let delta = 2 * counts[c] + 1; // quadratic marginal
      for (let j = 0; j < data.numRegions; j++) {
        if (data.adj[selectedRegion][j] && regionColors[j] === c)
          delta -= CONFLICT_PENALTY;
      }
      return delta;
    });
  }, [selectedRegion, regionColors, data]);

  /* Tap a cell → select its region */
  const handleTapCell = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      const reg = data.regionMap[r][c];
      if (regionColors[reg] >= 0) return; // already painted
      setSelectedRegion(reg === selectedRegion ? null : reg);

      // Bounce animation on selection
      for (let rr = 0; rr < GRID; rr++) {
        for (let cc = 0; cc < GRID; cc++) {
          if (data.regionMap[rr][cc] === reg) {
            const idx = rr * GRID + cc;
            Animated.sequence([
              Animated.timing(cellScales[idx], {
                toValue: 1.08,
                duration: 50,
                useNativeDriver: true,
              }),
              Animated.spring(cellScales[idx], {
                toValue: 1,
                friction: 4,
                tension: 200,
                useNativeDriver: true,
              }),
            ]).start();
          }
        }
      }
    },
    [gameOver, data, regionColors, selectedRegion, cellScales],
  );

  /* Tap palette → paint selected region (irreversible) */
  const handlePaint = useCallback(
    (color: number) => {
      if (gameOver || selectedRegion === null) return;
      if (regionColors[selectedRegion] >= 0) return;

      const newColors = [...regionColors];
      newColors[selectedRegion] = color;
      const newPainted = painted + 1;

      // Animate the painted region
      for (let rr = 0; rr < GRID; rr++) {
        for (let cc = 0; cc < GRID; cc++) {
          if (data.regionMap[rr][cc] === selectedRegion) {
            const idx = rr * GRID + cc;
            Animated.sequence([
              Animated.timing(cellScales[idx], {
                toValue: 1.2,
                duration: 80,
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
      setPainted(newPainted);
      setSelectedRegion(null);

      // Check completion
      if (newPainted === data.numRegions) {
        const finalInfo = computeScore(newColors, data.adj);
        setGameOver(true);
        recordGame('tint', finalInfo.total, par, true).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [gameOver, selectedRegion, regionColors, painted, data, par, cellScales],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('tint');
    setStats(s);
    setShowStats(true);
  }, []);

  function cellBorder(
    r: number,
    c: number,
    dr: number,
    dc: number,
  ): [number, string] {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID)
      return [2, BORDER_NORMAL];
    const regA = data.regionMap[r][c];
    const regB = data.regionMap[nr][nc];
    if (regA === regB) return [0, 'transparent'];
    if (
      regionColors[regA] >= 0 &&
      regionColors[regB] >= 0 &&
      regionColors[regA] === regionColors[regB]
    )
      return [3, BORDER_CONFLICT];
    return [2, BORDER_NORMAL];
  }

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
    const info = computeScore(regionColors, data.adj);
    const parts = [`Tint Day #${puzzleDay} \uD83C\uDFA8`, rows.join('\n')];
    if (info.conflicts > 0) {
      parts.push(
        `${info.quad} \u2212 ${CONFLICT_PENALTY * info.conflicts} = ${info.total} / ${par}${info.total >= par ? ' \u2B50' : ''}`,
      );
    } else {
      parts.push(
        `Score: ${info.total} / ${par}${info.total >= par ? ' \u2B50' : ''}`,
      );
    }
    return parts.join('\n');
  }

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
        Select a region, then pick a color. Each paint is final!
        {'\n'}Matching neighbors cost {CONFLICT_PENALTY} pts each.
      </Text>

      {/* Score display */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Score</Text>
          <Text
            style={[
              styles.infoValue,
              gameOver && scoreInfo.total >= par && styles.infoValueGood,
            ]}
          >
            {scoreInfo.total}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Left</Text>
          <Text style={styles.infoValue}>{regionsLeft}</Text>
        </View>
        {scoreInfo.conflicts > 0 && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Clashes</Text>
            <Text style={[styles.infoValue, styles.infoValueBad]}>
              {scoreInfo.conflicts}
            </Text>
          </View>
        )}
      </View>

      {/* Score breakdown */}
      <View style={styles.breakdownRow}>
        {PALETTE.map((color, i) => (
          <View key={i} style={styles.breakdownItem}>
            <View
              style={[styles.breakdownSwatch, { backgroundColor: color }]}
            />
            <Text style={styles.breakdownText}>
              {colorCounts[i]}
              {colorCounts[i] > 0
                ? `\u00B2=${colorCounts[i] * colorCounts[i]}`
                : ''}
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
              const isSelected = selectedRegion === reg;
              const bg =
                col >= 0
                  ? PALETTE[col]
                  : isSelected
                    ? '#555'
                    : UNCOLORED_BG;

              const [btw, btc] = cellBorder(r, c, -1, 0);
              const [bbw, bbc] = cellBorder(r, c, 1, 0);
              const [blw, blc] = cellBorder(r, c, 0, -1);
              const [brw, brc] = cellBorder(r, c, 0, 1);

              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [{ scale: cellScales[r * GRID + c] }],
                  }}
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
                      isSelected && styles.cellSelected,
                    ]}
                  />
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Color palette with P1 deltas */}
      {!gameOver && (
        <View style={styles.palette}>
          {PALETTE.map((color, i) => {
            const delta = selectedRegion !== null ? colorDeltas[i] : null;
            return (
              <Pressable
                key={i}
                onPress={() => handlePaint(i)}
                disabled={selectedRegion === null}
                style={[
                  styles.paletteSwatch,
                  { backgroundColor: color },
                  selectedRegion === null && styles.paletteDisabled,
                ]}
              >
                {delta !== null && (
                  <Text
                    style={[
                      styles.deltaText,
                      delta > 0 && styles.deltaPositive,
                      delta <= 0 && styles.deltaNegative,
                    ]}
                  >
                    {delta > 0 ? '+' : ''}
                    {delta}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {selectedRegion !== null && !gameOver && (
        <Text style={styles.hint}>
          Tap a color to paint \u2014 higher is better!
        </Text>
      )}
      {selectedRegion === null && !gameOver && regionsLeft > 0 && (
        <Text style={styles.hint}>Tap an unpainted region to select it</Text>
      )}

      <CelebrationBurst show={gameOver && scoreInfo.total >= par} />

      {gameOver && (
        <View style={styles.endMessage}>
          <Text style={styles.endEmoji}>
            {scoreInfo.total >= par ? '\u2B50' : '\uD83C\uDFA8'}
          </Text>
          <Text style={styles.endText}>
            {scoreInfo.conflicts > 0
              ? `${scoreInfo.quad} \u2212 ${CONFLICT_PENALTY * scoreInfo.conflicts} penalty = ${scoreInfo.total}`
              : `Score: ${scoreInfo.total}`}
            {scoreInfo.total >= par
              ? ` \u2014 beat par (${par})!`
              : ` / ${par}`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap a region to select it, then tap a color to lock it in.
          Each paint is irreversible \u2014 think before you commit!
          {'\n\n'}
          Score = sum of (count per color){'\u00B2'}, minus{' '}
          {CONFLICT_PENALTY} for each pair of matching neighbors.
          Sometimes a clash is worth the bigger group!
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
  infoPar: {
    color: '#818384',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  breakdownRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  breakdownItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breakdownSwatch: { width: 12, height: 12, borderRadius: 3 },
  breakdownText: { color: '#aaa', fontSize: 12, fontFamily: 'monospace' },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  cellSelected: {
    borderColor: '#f1c40f',
    borderWidth: 2,
  },
  palette: { flexDirection: 'row', gap: 16, marginTop: 16 },
  paletteSwatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteDisabled: { opacity: 0.4 },
  deltaText: {
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  deltaPositive: { color: '#ffffff' },
  deltaNegative: { color: '#ffaaaa' },
  hint: {
    color: '#818384',
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  endMessage: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
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
