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
type SeedInfo = { r: number; c: number; target: number; color: number };
type Phase = 'placing' | 'animating' | 'result';

/* ─── Constants ─── */
const SIZE = 5;
const GAP = 2;

const PALETTE = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
const PALETTE_LIGHT = ['#f5b7b1', '#aed6f1', '#a9dfbf', '#fad7a0', '#d2b4de'];
const PALETTE_BORDER = ['#c0392b', '#2980b9', '#27ae60', '#e67e22', '#8e44ad'];
const EMOJI = ['\uD83D\uDFE5', '\uD83D\uDFE6', '\uD83D\uDFE9', '\uD83D\uDFE8', '\uD83D\uDFEA'];

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  const numSeeds = d <= 2 ? 3 : 4;
  const numBarriers = d <= 1 ? 2 : d <= 3 ? 3 : 4;
  const parAttempts = d <= 2 ? 3 : 4;
  return { numSeeds, numBarriers, parAttempts };
}

/* ─── Multi-source BFS territories (simultaneous expansion) ─── */
function computeTerritories(
  seeds: { r: number; c: number }[],
  barriers: Set<number>,
): { territory: number[][]; sizes: number[] } {
  const territory: number[][] = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(-1),
  );
  const dist: number[][] = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(Infinity),
  );

  const queue: [number, number, number][] = [];
  for (let i = 0; i < seeds.length; i++) {
    const { r, c } = seeds[i];
    territory[r][c] = i;
    dist[r][c] = 0;
    queue.push([r, c, i]);
  }

  let head = 0;
  while (head < queue.length) {
    const [r, c, seed] = queue[head++];
    const d = dist[r][c];
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (
        nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE &&
        !barriers.has(nr * SIZE + nc) &&
        dist[nr][nc] > d + 1
      ) {
        dist[nr][nc] = d + 1;
        territory[nr][nc] = seed;
        queue.push([nr, nc, seed]);
      }
    }
  }

  const sizes = new Array(seeds.length).fill(0);
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (territory[r][c] >= 0) sizes[territory[r][c]]++;
  return { territory, sizes };
}

/* ─── Count valid barrier placements (solution count) ─── */
function countSolutions(
  seeds: { r: number; c: number }[],
  numBarriers: number,
  targets: number[],
): number {
  const seedSet = new Set(seeds.map((s) => s.r * SIZE + s.c));
  const empties: number[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (!seedSet.has(i)) empties.push(i);

  let count = 0;
  function search(idx: number, chosen: number[]) {
    if (chosen.length === numBarriers) {
      const bs = new Set(chosen);
      const { sizes } = computeTerritories(seeds, bs);
      if (sizes.every((s, i) => s === targets[i])) count++;
      return;
    }
    if (count > 4) return;
    for (let i = idx; i < empties.length; i++) {
      search(i + 1, [...chosen, empties[i]]);
      if (count > 4) return;
    }
  }
  search(0, []);
  return count;
}

/* ─── Generate puzzle ─── */
function generatePuzzle(
  seed: number,
  numSeeds: number,
  numBarriers: number,
): { seeds: SeedInfo[]; solutionBarriers: number[] } {
  for (let attempt = 0; attempt < 300; attempt++) {
    const rng = seededRandom(seed + attempt * 7919);

    // Place seeds with min distance 2
    const positions: { r: number; c: number }[] = [];
    for (let t = 0; t < 500 && positions.length < numSeeds; t++) {
      const r = Math.floor(rng() * SIZE);
      const c = Math.floor(rng() * SIZE);
      if (positions.some((p) => Math.abs(r - p.r) + Math.abs(c - p.c) < 2))
        continue;
      positions.push({ r, c });
    }
    if (positions.length < numSeeds) continue;

    const seedSet = new Set(positions.map((p) => p.r * SIZE + p.c));

    // Natural territories (no barriers)
    const { sizes: naturalSizes } = computeTerritories(
      positions,
      new Set(),
    );

    // Pick random barrier cells
    const empties: number[] = [];
    for (let i = 0; i < SIZE * SIZE; i++) if (!seedSet.has(i)) empties.push(i);
    for (let i = empties.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [empties[i], empties[j]] = [empties[j], empties[i]];
    }
    const barriers = empties.slice(0, numBarriers);
    const barrierSet = new Set(barriers);

    // Compute territories WITH barriers
    const { sizes } = computeTerritories(positions, barrierSet);

    // Reject if any seed has 0 territory
    if (sizes.some((s) => s === 0)) continue;

    // Reject if barriers don't change anything
    if (sizes.every((s, i) => s === naturalSizes[i])) continue;

    // Check solution count (want 1-3)
    const solCount = countSolutions(positions, numBarriers, sizes);
    if (solCount < 1 || solCount > 3) continue;

    return {
      seeds: positions.map((p, i) => ({
        ...p,
        target: sizes[i],
        color: i,
      })),
      solutionBarriers: barriers,
    };
  }

  // Fallback
  const positions = [
    { r: 0, c: 0 },
    { r: 0, c: 4 },
    { r: 4, c: 0 },
  ].slice(0, numSeeds);
  const { sizes } = computeTerritories(positions, new Set([12]));
  return {
    seeds: positions.map((p, i) => ({ ...p, target: sizes[i], color: i })),
    solutionBarriers: [12],
  };
}

/* ─── Build animation frames (simultaneous BFS, step by step) ─── */
function buildAnimFrames(
  seeds: { r: number; c: number }[],
  barriers: Set<number>,
): number[][][] {
  const frames: number[][][] = [];
  const territory: number[][] = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(-1),
  );
  const dist: number[][] = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(Infinity),
  );

  // BFS level by level
  type Entry = [number, number, number]; // r, c, seedIdx
  let current: Entry[] = [];
  for (let i = 0; i < seeds.length; i++) {
    const { r, c } = seeds[i];
    territory[r][c] = i;
    dist[r][c] = 0;
    current.push([r, c, i]);
  }
  frames.push(territory.map((row) => [...row]));

  while (current.length > 0) {
    const next: Entry[] = [];
    for (const [r, c, seed] of current) {
      const d = dist[r][c];
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE &&
          !barriers.has(nr * SIZE + nc) &&
          dist[nr][nc] > d + 1
        ) {
          dist[nr][nc] = d + 1;
          territory[nr][nc] = seed;
          next.push([nr, nc, seed]);
        }
      }
    }
    if (next.length > 0) frames.push(territory.map((row) => [...row]));
    current = next;
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
    () => generatePuzzle(seed, diff.numSeeds, diff.numBarriers),
    [seed, diff.numSeeds, diff.numBarriers],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  const seedSet = useMemo(
    () => new Set(puzzle.seeds.map((s) => s.r * SIZE + s.c)),
    [puzzle.seeds],
  );

  /* state */
  const [barriers, setBarriers] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<Phase>('placing');
  const [attempts, setAttempts] = useState(0);
  const [animFrame, setAnimFrame] = useState<number[][] | null>(null);
  const [resultTerritory, setResultTerritory] = useState<number[][] | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  /* ─── tap cell: toggle barrier ─── */
  const handleCellTap = useCallback(
    (r: number, c: number) => {
      if (phase !== 'placing' || gameOver) return;
      const key = r * SIZE + c;
      if (seedSet.has(key)) return; // can't place on seeds

      const next = new Set(barriers);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < diff.numBarriers) {
        next.add(key);
      } else {
        return; // max barriers placed
      }

      // Bounce animation
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

      setBarriers(next);
    },
    [phase, gameOver, barriers, diff.numBarriers, seedSet, cellScales],
  );

  /* ─── launch waves ─── */
  const handleGo = useCallback(() => {
    if (barriers.size !== diff.numBarriers) return;
    setPhase('animating');

    const frames = buildAnimFrames(puzzle.seeds, barriers);
    let i = 0;

    function showFrame() {
      if (i >= frames.length) {
        const final = frames[frames.length - 1];
        setResultTerritory(final);
        setAnimFrame(null);
        setPhase('result');

        const { sizes } = computeTerritories(puzzle.seeds, barriers);
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
      animTimerRef.current = setTimeout(showFrame, 180);
    }
    showFrame();
  }, [barriers, diff.numBarriers, diff.parAttempts, puzzle, attempts]);

  /* ─── retry ─── */
  const handleRetry = useCallback(() => {
    setBarriers(new Set());
    setAnimFrame(null);
    setResultTerritory(null);
    setPhase('placing');
    cellScales.forEach((s) => s.setValue(1));
  }, [cellScales]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('ripple');
    setStats(s);
    setShowStats(true);
  }, []);

  /* ─── target check ─── */
  const targetMet = useMemo(() => {
    if (!resultTerritory) return null;
    const sizes = new Array(diff.numSeeds).fill(0);
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (resultTerritory[r][c] >= 0) sizes[resultTerritory[r][c]]++;
    return puzzle.seeds.map((s, i) => sizes[i] === s.target);
  }, [resultTerritory, puzzle.seeds, diff.numSeeds]);

  /* ─── display grid ─── */
  const displayGrid = animFrame ?? resultTerritory;

  /* ─── share text ─── */
  function buildShareText(): string {
    if (!resultTerritory) return '';
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        if (barriers.has(r * SIZE + c)) {
          row += '\u2B1B';
        } else {
          const owner = resultTerritory[r][c];
          row += owner >= 0 ? EMOJI[owner] : '\u2B1C';
        }
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
        : `Solved in ${attempts} (par ${diff.parAttempts})`,
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
        Place barriers to shape each wave's territory!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Barriers</Text>
          <Text style={styles.infoValue}>
            {barriers.size}/{diff.numBarriers}
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

      {/* Seed legend with targets */}
      <View style={styles.legendRow}>
        {puzzle.seeds.map((s, i) => {
          const met = targetMet ? targetMet[i] : null;
          return (
            <View key={i} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: PALETTE[s.color] },
                ]}
              />
              <Text
                style={[
                  styles.legendTarget,
                  met === true && styles.legendMet,
                  met === false && styles.legendMissed,
                ]}
              >
                {s.target} cells
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
              const key = r * SIZE + c;
              const isSeed = seedSet.has(key);
              const seedIdx = isSeed
                ? puzzle.seeds.findIndex((s) => s.r === r && s.c === c)
                : -1;
              const isBarrier = barriers.has(key);
              const owner = displayGrid ? displayGrid[r][c] : -1;

              let bgColor = '#1a1a1b';
              let borderColor = '#2a2a2c';
              let borderWidth = 1;

              if (isBarrier) {
                bgColor = '#333';
                borderColor = '#555';
                borderWidth = 2;
              } else if (isSeed) {
                bgColor = PALETTE[puzzle.seeds[seedIdx].color];
                borderColor = PALETTE_BORDER[puzzle.seeds[seedIdx].color];
                borderWidth = 3;
              } else if (owner >= 0 && displayGrid) {
                bgColor = PALETTE_LIGHT[owner];
                borderColor = PALETTE_BORDER[owner];
                borderWidth = 1;
              }

              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[key] }] }}
                >
                  <Pressable
                    onPress={() => handleCellTap(r, c)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: bgColor,
                        borderColor,
                        borderWidth,
                      },
                    ]}
                  >
                    {isSeed && (
                      <Text style={styles.seedText}>
                        {puzzle.seeds[seedIdx].target}
                      </Text>
                    )}
                    {isBarrier && !displayGrid && (
                      <Text style={styles.barrierX}>{'\u2716'}</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Go button */}
      {phase === 'placing' && barriers.size === diff.numBarriers && (
        <Pressable style={styles.goBtn} onPress={handleGo}>
          <Text style={styles.goBtnText}>Release the waves!</Text>
        </Pressable>
      )}

      {/* Retry */}
      {phase === 'result' && !gameOver && (
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
                ? `Solved in ${attempts} \u2014 under par!`
                : `Solved in ${attempts} (par ${diff.parAttempts})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Each colored seed sends out a wave that claims territory. Waves
          expand equally in all directions and stop at barriers.
          {'\n\n'}
          Place {diff.numBarriers} barriers to shape the territories so each
          seed claims exactly its target number of cells. Tap cells to
          toggle barriers, then press Go!
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
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendTarget: { color: '#818384', fontSize: 13, fontWeight: '600' },
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
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  barrierX: { color: '#888', fontSize: 16, fontWeight: '700' },
  goBtn: {
    marginTop: 16,
    backgroundColor: '#6aaa64',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  goBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
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
