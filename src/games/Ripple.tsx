import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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

/* ─── Types ─── */
type Seed = { r: number; c: number; target: number; color: number };

/* ─── Constants ─── */
const SIZE = 5;
const GAP = 2;
const NUM_SEEDS = 4;

const PALETTE = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
const PALETTE_LIGHT = ['#fadbd8', '#d4e6f1', '#d5f5e3', '#fdebd0', '#e8daef'];
const PALETTE_BORDER = ['#c0392b', '#2980b9', '#27ae60', '#e67e22', '#8e44ad'];
const EMOJI = ['\uD83D\uDFE5', '\uD83D\uDFE6', '\uD83D\uDFE9', '\uD83D\uDFE8', '\uD83D\uDFEA'];

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1-5
  const numSeeds = d <= 3 ? 4 : 5;
  const parAttempts = d <= 2 ? 2 : 3;
  return { numSeeds, parAttempts };
}

/* ─── BFS distances from each seed to every cell ─── */
function bfsDistances(seeds: { r: number; c: number }[]): number[][][] {
  const result: number[][][] = [];
  for (const { r: sr, c: sc } of seeds) {
    const dist: number[][] = Array.from({ length: SIZE }, () =>
      Array(SIZE).fill(Infinity),
    );
    dist[sr][sc] = 0;
    const queue: [number, number][] = [[sr, sc]];
    let head = 0;
    while (head < queue.length) {
      const [r, c] = queue[head++];
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && dist[nr][nc] === Infinity) {
          dist[nr][nc] = dist[r][c] + 1;
          queue.push([nr, nc]);
        }
      }
    }
    result.push(dist);
  }
  return result;
}

/* ─── Compute territories for a given ordering ─── */
function computeTerritories(
  numSeeds: number,
  ordering: number[],
  distances: number[][][],
): { territory: number[][]; sizes: number[] } {
  const territory: number[][] = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(-1),
  );
  const headStarts = ordering.map((_, i) => ordering.length - 1 - i);

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      let best = -1;
      let bestEff = Infinity;
      for (let i = 0; i < ordering.length; i++) {
        const seedIdx = ordering[i];
        const eff = distances[seedIdx][r][c] - headStarts[i];
        if (eff < bestEff || (eff === bestEff && i < best)) {
          bestEff = eff;
          best = i;
        }
      }
      territory[r][c] = ordering[best];
    }
  }

  const sizes = new Array(numSeeds).fill(0);
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) sizes[territory[r][c]]++;
  return { territory, sizes };
}

/* ─── Count valid orderings (for uniqueness check) ─── */
function countSolutions(
  numSeeds: number,
  targets: number[],
  distances: number[][][],
): number {
  let count = 0;
  function permute(ordering: number[], remaining: number[]) {
    if (remaining.length === 0) {
      const { sizes } = computeTerritories(numSeeds, ordering, distances);
      if (sizes.every((s, i) => s === targets[i])) count++;
      if (count > 3) return; // early exit — too many solutions
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      permute(
        [...ordering, remaining[i]],
        [...remaining.slice(0, i), ...remaining.slice(i + 1)],
      );
      if (count > 3) return;
    }
  }
  permute([], Array.from({ length: numSeeds }, (_, i) => i));
  return count;
}

/* ─── Generate puzzle ─── */
function generatePuzzle(
  seed: number,
  numSeeds: number,
): { seeds: Seed[]; distances: number[][][]; solutionOrder: number[] } {
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = seededRandom(seed + attempt * 7919);

    // Place seeds with minimum Manhattan distance 2
    const positions: { r: number; c: number }[] = [];
    for (let tries = 0; tries < 500 && positions.length < numSeeds; tries++) {
      const r = Math.floor(rng() * SIZE);
      const c = Math.floor(rng() * SIZE);
      const tooClose = positions.some(
        (p) => Math.abs(r - p.r) + Math.abs(c - p.c) < 2,
      );
      if (!tooClose) positions.push({ r, c });
    }
    if (positions.length < numSeeds) continue;

    const distances = bfsDistances(positions);

    // Random ordering as the solution
    const order = Array.from({ length: numSeeds }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    const { sizes } = computeTerritories(numSeeds, order, distances);

    // Reject if any seed has 0 territory
    if (sizes.some((s) => s === 0)) continue;

    // Reject if all territories are the same (trivial — any ordering works)
    if (sizes.every((s) => s === sizes[0])) continue;

    // Count solutions (want 1-2 valid orderings)
    const targets = sizes;
    const solCount = countSolutions(numSeeds, targets, distances);
    if (solCount < 1 || solCount > 2) continue;

    return {
      seeds: positions.map((p, i) => ({
        ...p,
        target: targets[i],
        color: i,
      })),
      distances,
      solutionOrder: order,
    };
  }

  // Fallback: corners with a known ordering
  const positions = [
    { r: 0, c: 0 },
    { r: 0, c: 4 },
    { r: 4, c: 0 },
    { r: 4, c: 4 },
  ].slice(0, numSeeds);
  const distances = bfsDistances(positions);
  const order = Array.from({ length: numSeeds }, (_, i) => i);
  const { sizes } = computeTerritories(numSeeds, order, distances);
  return {
    seeds: positions.map((p, i) => ({ ...p, target: sizes[i], color: i })),
    distances,
    solutionOrder: order,
  };
}

/* ─── Build step-by-step animation frames ─── */
function buildAnimationFrames(
  numSeeds: number,
  ordering: number[],
  distances: number[][][],
): number[][][] {
  const maxDist = SIZE * 2;
  const headStarts = ordering.map((_, i) => ordering.length - 1 - i);
  const frames: number[][][] = [];

  for (let step = 0; step <= maxDist + numSeeds; step++) {
    const frame: number[][] = Array.from({ length: SIZE }, () =>
      Array(SIZE).fill(-1),
    );
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        let best = -1;
        let bestEff = Infinity;
        for (let i = 0; i < ordering.length; i++) {
          const seedIdx = ordering[i];
          const eff = distances[seedIdx][r][c] - headStarts[i];
          if (eff <= step && (eff < bestEff || (eff === bestEff && i < best))) {
            bestEff = eff;
            best = i;
          }
        }
        if (best >= 0) frame[r][c] = ordering[best];
      }
    }
    frames.push(frame);

    // Stop when fully filled
    if (frame.every((row) => row.every((c) => c >= 0))) break;
  }
  return frames;
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Ripple() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const puzzle = useMemo(
    () => generatePuzzle(seed, diff.numSeeds),
    [seed, diff.numSeeds],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  /* state */
  const [ordering, setOrdering] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [animFrame, setAnimFrame] = useState<number[][] | null>(null);
  const [animating, setAnimating] = useState(false);
  const [finalTerritory, setFinalTerritory] = useState<number[][] | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─── handle seed tap (ordering phase) ─── */
  const handleSeedTap = useCallback(
    (seedIdx: number) => {
      if (animating || gameOver) return;
      if (ordering.includes(seedIdx)) return; // already ordered

      // Bounce the seed cell
      const idx = puzzle.seeds[seedIdx].r * SIZE + puzzle.seeds[seedIdx].c;
      Animated.sequence([
        Animated.timing(cellScales[idx], {
          toValue: 1.2,
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

      const newOrdering = [...ordering, seedIdx];
      setOrdering(newOrdering);

      // Auto-launch when all seeds are ordered
      if (newOrdering.length === diff.numSeeds) {
        launchWaves(newOrdering);
      }
    },
    [ordering, animating, gameOver, diff.numSeeds, puzzle, cellScales],
  );

  /* ─── launch wave animation ─── */
  const launchWaves = useCallback(
    (order: number[]) => {
      setAnimating(true);
      const frames = buildAnimationFrames(
        diff.numSeeds,
        order,
        puzzle.distances,
      );

      let i = 0;
      function showFrame() {
        if (i >= frames.length) {
          // Animation done — check result
          const final = frames[frames.length - 1];
          setFinalTerritory(final);
          setAnimFrame(null);
          setAnimating(false);

          const { sizes } = computeTerritories(
            diff.numSeeds,
            order,
            puzzle.distances,
          );
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);

          if (sizes.every((s, si) => s === puzzle.seeds[si].target)) {
            setGameOver(true);
            recordGame('ripple', newAttempts, diff.parAttempts).then((s) => {
              setStats(s);
              setShowStats(true);
            });
          }
          return;
        }
        setAnimFrame(frames[i]);
        i++;
        animTimerRef.current = setTimeout(showFrame, 150);
      }
      showFrame();
    },
    [diff.numSeeds, diff.parAttempts, puzzle, attempts],
  );

  /* cleanup timer on unmount */
  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  /* ─── reset for retry ─── */
  const handleRetry = useCallback(() => {
    setOrdering([]);
    setAnimFrame(null);
    setFinalTerritory(null);
    cellScales.forEach((s) => s.setValue(1));
  }, [cellScales]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('ripple');
    setStats(s);
    setShowStats(true);
  }, []);

  /* ─── display grid: animation frame > final territory > empty ─── */
  const displayGrid = animFrame ?? finalTerritory;

  /* ─── check which targets are met ─── */
  const targetMet = useMemo(() => {
    if (!finalTerritory) return null;
    const sizes = new Array(diff.numSeeds).fill(0);
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (finalTerritory[r][c] >= 0) sizes[finalTerritory[r][c]]++;
    return puzzle.seeds.map((s, i) => sizes[i] === s.target);
  }, [finalTerritory, puzzle.seeds, diff.numSeeds]);

  /* ─── share text ─── */
  function buildShareText(): string {
    if (!finalTerritory) return '';
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const owner = finalTerritory[r][c];
        row += owner >= 0 ? EMOJI[owner] : '\u2B1C';
      }
      rows.push(row);
    }
    const under = attempts <= diff.parAttempts;
    return [
      `Ripple Day #${puzzleDay} \uD83C\uDF0A`,
      rows.join('\n'),
      under
        ? attempts === 1
          ? '\u2B50 First try!'
          : `\u2B50 ${attempts} attempts (par ${diff.parAttempts})`
        : `Solved in ${attempts} attempts (par ${diff.parAttempts})`,
    ].join('\n');
  }

  /* ─── render ─── */
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ripple</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Tap seeds in order — first gets the biggest wave!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Order</Text>
          <Text style={styles.infoValue}>
            {ordering.length}/{diff.numSeeds}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Attempts</Text>
          <Text
            style={[
              styles.infoValue,
              gameOver && attempts <= diff.parAttempts && styles.infoValueGood,
            ]}
          >
            {attempts}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>
            {diff.parAttempts} {diff.parAttempts === 1 ? 'try' : 'tries'}
          </Text>
        </View>
      </View>

      {/* Seed targets legend */}
      <View style={styles.legendRow}>
        {puzzle.seeds.map((s, i) => {
          const ordered = ordering.indexOf(i);
          const met = targetMet ? targetMet[i] : null;
          return (
            <View key={i} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: PALETTE[s.color] },
                ]}
              >
                {ordered >= 0 && (
                  <Text style={styles.legendOrder}>{ordered + 1}</Text>
                )}
              </View>
              <Text
                style={[
                  styles.legendTarget,
                  met === true && styles.legendMet,
                  met === false && styles.legendMissed,
                ]}
              >
                {s.target}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth, height: gridWidth }]}>
        {Array.from({ length: SIZE }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }).map((_, c) => {
              const idx = r * SIZE + c;
              const seedIdx = puzzle.seeds.findIndex(
                (s) => s.r === r && s.c === c,
              );
              const isSeed = seedIdx >= 0;
              const ordered = isSeed ? ordering.indexOf(seedIdx) : -1;
              const owner = displayGrid ? displayGrid[r][c] : -1;

              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[idx] }] }}
                >
                  <Pressable
                    onPress={() => isSeed && handleSeedTap(seedIdx)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor:
                          owner >= 0
                            ? isSeed
                              ? PALETTE[owner]
                              : PALETTE_LIGHT[owner]
                            : isSeed
                              ? PALETTE[puzzle.seeds[seedIdx].color]
                              : '#1a1a1b',
                        borderColor:
                          owner >= 0
                            ? PALETTE_BORDER[owner]
                            : isSeed
                              ? PALETTE_BORDER[puzzle.seeds[seedIdx].color]
                              : '#2a2a2c',
                        borderWidth: isSeed ? 3 : 1,
                      },
                    ]}
                  >
                    {isSeed && (
                      <Text style={styles.seedText}>
                        {puzzle.seeds[seedIdx].target}
                      </Text>
                    )}
                    {isSeed && ordered >= 0 && !displayGrid && (
                      <View style={styles.orderBadge}>
                        <Text style={styles.orderText}>{ordered + 1}</Text>
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Retry button */}
      {!gameOver && finalTerritory && !animating && (
        <Pressable style={styles.retryBtn} onPress={handleRetry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      )}

      <CelebrationBurst show={gameOver} />

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {attempts <= diff.parAttempts ? '\u2B50' : '\uD83C\uDF0A'}
          </Text>
          <Text style={styles.winText}>
            {attempts === 1
              ? 'First try!'
              : attempts <= diff.parAttempts
                ? `Solved in ${attempts} attempts \u2014 under par!`
                : `Solved in ${attempts} attempts (par ${diff.parAttempts})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Each colored seed wants to claim a specific number of cells. Tap
          seeds to set their activation order — the first seed gets the
          biggest head start and claims the most territory.
          {'\n\n'}
          Think about each seed's position and target. Corner seeds need
          more head start than center seeds!
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
    marginBottom: 8,
    alignItems: 'baseline',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 12 },
  infoValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  infoValueGood: { color: '#2ecc71' },
  infoPar: { color: '#818384', fontSize: 14, marginTop: 2 },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  legendItem: { alignItems: 'center', gap: 2 },
  legendDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendOrder: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  legendTarget: {
    color: '#818384',
    fontSize: 13,
    fontWeight: '700',
  },
  legendMet: { color: '#2ecc71' },
  legendMissed: { color: '#e74c3c' },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seedText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  orderBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#f1c40f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: { color: '#f1c40f', fontSize: 15, fontWeight: '700' },
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
