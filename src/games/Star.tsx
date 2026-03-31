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

/* ─── Constants ─── */
const GAP = 2;
const REGION_COLORS = [
  '#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad',
  '#16a085', '#d35400', '#2c3e50',
];
const REGION_BG = [
  '#3d1517', '#162d40', '#163d21', '#3d2f0a', '#2d1639',
  '#0d302a', '#3d1f0a', '#1a2530',
];

/* ─── Helpers ─── */
function neighbors8(idx: number, size: number): number[] {
  const r = Math.floor(idx / size);
  const c = idx % size;
  const res: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        res.push(nr * size + nc);
      }
    }
  }
  return res;
}

function neighbors4(idx: number, size: number): number[] {
  const r = Math.floor(idx / size);
  const c = idx % size;
  const res: number[] = [];
  if (r > 0) res.push((r - 1) * size + c);
  if (r < size - 1) res.push((r + 1) * size + c);
  if (c > 0) res.push(r * size + c - 1);
  if (c < size - 1) res.push(r * size + c + 1);
  return res;
}

/* ─── Region generation (random flood fill) ─── */
function generateRegions(rng: () => number, size: number): number[] {
  const n = size * size;
  const region = Array(n).fill(-1);

  // Place seeds spread out
  const seeds: number[] = [];
  const used = new Set<number>();
  for (let i = 0; i < size; i++) {
    let attempts = 0;
    let cell: number;
    do {
      cell = Math.floor(rng() * n);
      attempts++;
    } while (used.has(cell) && attempts < 100);
    seeds.push(cell);
    used.add(cell);
    region[cell] = i;
  }

  // Grow regions by BFS
  const queues: number[][] = seeds.map((s) => [s]);
  let unassigned = n - size;
  while (unassigned > 0) {
    // Pick a random region to grow
    const ri = Math.floor(rng() * size);
    if (queues[ri].length === 0) continue;
    const frontier = queues[ri];
    // Try to expand from a random frontier cell
    const fi = Math.floor(rng() * frontier.length);
    const cell = frontier[fi];
    const nbs = neighbors4(cell, size).filter((nb) => region[nb] === -1);
    if (nbs.length === 0) {
      frontier.splice(fi, 1);
      continue;
    }
    const nb = nbs[Math.floor(rng() * nbs.length)];
    region[nb] = ri;
    frontier.push(nb);
    unassigned--;
  }

  // Fill any remaining unassigned cells
  for (let i = 0; i < n; i++) {
    if (region[i] === -1) {
      const nbs = neighbors4(i, size);
      for (const nb of nbs) {
        if (region[nb] >= 0) {
          region[i] = region[nb];
          break;
        }
      }
    }
  }

  return region;
}

/* ─── Solver: find all solutions ─── */
function solve(
  size: number,
  regions: number[],
  maxSolutions: number,
): number[][] {
  const solutions: number[][] = [];
  const stars = Array(size).fill(-1); // stars[row] = col
  const usedCols = new Set<number>();
  const usedRegions = new Set<number>();

  function isValid(row: number, col: number): boolean {
    // Check column
    if (usedCols.has(col)) return false;
    // Check region
    const reg = regions[row * size + col];
    if (usedRegions.has(reg)) return false;
    // Check no-touch (8-directional)
    for (let pr = 0; pr < row; pr++) {
      const pc = stars[pr];
      if (pc === -1) continue;
      if (Math.abs(row - pr) <= 1 && Math.abs(col - pc) <= 1) return false;
    }
    return true;
  }

  function bt(row: number) {
    if (row === size) {
      solutions.push([...stars]);
      return;
    }
    for (let col = 0; col < size; col++) {
      if (isValid(row, col)) {
        stars[row] = col;
        usedCols.add(col);
        usedRegions.add(regions[row * size + col]);
        bt(row + 1);
        stars[row] = -1;
        usedCols.delete(col);
        usedRegions.delete(regions[row * size + col]);
        if (solutions.length >= maxSolutions) return;
      }
    }
  }

  bt(0);
  return solutions;
}

/* ─── Puzzle generation ─── */
function generatePuzzle(seed: number) {
  const d = getDayDifficulty();
  const size = d <= 2 ? 6 : 7; // Mon-Tue:6, Wed-Fri:7

  for (let attempt = 0; attempt < 500; attempt++) {
    const rng = seededRandom(seed + attempt * 997);
    const regions = generateRegions(rng, size);

    // Check each region has at least 2 cells (for non-trivial deduction)
    const regSizes = Array(size).fill(0);
    for (const r of regions) regSizes[r]++;
    if (regSizes.some((s) => s < 2)) continue;

    const sols = solve(size, regions, 2);
    if (sols.length === 1) {
      return { size, regions, solution: sols[0] };
    }
  }

  // Fallback: 5x5 with simple regions
  const size5 = 5;
  const simpleRegions = Array(25)
    .fill(0)
    .map((_, i) => Math.floor(i / 5));
  const sols = solve(size5, simpleRegions, 2);
  return {
    size: size5,
    regions: simpleRegions,
    solution: sols[0] || [0, 2, 4, 1, 3],
  };
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Star() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const puzzle = useMemo(() => generatePuzzle(seed), [seed]);
  const { size, regions, solution } = puzzle;
  const totalCells = size * size;

  const [placed, setPlaced] = useState<Set<number>>(() => new Set());
  const [marks, setMarks] = useState<Set<number>>(() => new Set()); // pencil X marks
  const [markMode, setMarkMode] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [locked, setLocked] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [solveTime, setSolveTime] = useState<number | null>(null);

  /* ── Timer display ── */
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (locked) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startTime, locked]);

  /* ── Check solution ── */
  const solved = useMemo(() => {
    if (placed.size !== size) return false;
    const rows = new Set<number>();
    const cols = new Set<number>();
    const regs = new Set<number>();
    for (const idx of placed) {
      rows.add(Math.floor(idx / size));
      cols.add(idx % size);
      regs.add(regions[idx]);
    }
    if (rows.size !== size || cols.size !== size || regs.size !== size)
      return false;
    // No-touch check
    const arr = [...placed];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const ri = Math.floor(arr[i] / size);
        const ci = arr[i] % size;
        const rj = Math.floor(arr[j] / size);
        const cj = arr[j] % size;
        if (Math.abs(ri - rj) <= 1 && Math.abs(ci - cj) <= 1) return false;
      }
    }
    return true;
  }, [placed, size, regions]);

  /* ── Conflict detection ── */
  const conflicts = useMemo(() => {
    const bad = new Set<number>();
    const arr = [...placed];
    // Row conflicts
    const rowCount = Array(size).fill(0);
    const colCount = Array(size).fill(0);
    const regCount = Array(size).fill(0);
    for (const idx of placed) {
      rowCount[Math.floor(idx / size)]++;
      colCount[idx % size]++;
      regCount[regions[idx]]++;
    }
    for (const idx of placed) {
      if (rowCount[Math.floor(idx / size)] > 1) bad.add(idx);
      if (colCount[idx % size] > 1) bad.add(idx);
      if (regCount[regions[idx]] > 1) bad.add(idx);
    }
    // Touch conflicts
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const ri = Math.floor(arr[i] / size);
        const ci = arr[i] % size;
        const rj = Math.floor(arr[j] / size);
        const cj = arr[j] % size;
        if (Math.abs(ri - rj) <= 1 && Math.abs(ci - cj) <= 1) {
          bad.add(arr[i]);
          bad.add(arr[j]);
        }
      }
    }
    return bad;
  }, [placed, size, regions]);

  /* ── Layout ── */
  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor(maxWidth / size) - GAP;

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: 49 }, () => new Animated.Value(1)),
  ).current;

  const bounce = useCallback(
    (idx: number) => {
      if (idx >= cellScales.length) return;
      Animated.sequence([
        Animated.timing(cellScales[idx], {
          toValue: 1.15,
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
    },
    [cellScales],
  );

  /* ── Cell tap ── */
  const handleTap = useCallback(
    (idx: number) => {
      if (locked) return;
      bounce(idx);
      setMoveCount((m) => m + 1);

      if (markMode) {
        // Pencil mode: toggle X mark
        setMarks((prev) => {
          const next = new Set(prev);
          if (next.has(idx)) next.delete(idx);
          else next.add(idx);
          return next;
        });
        // Remove star if present
        setPlaced((prev) => {
          if (prev.has(idx)) {
            const next = new Set(prev);
            next.delete(idx);
            return next;
          }
          return prev;
        });
      } else {
        // Star mode: toggle star
        setPlaced((prev) => {
          const next = new Set(prev);
          if (next.has(idx)) next.delete(idx);
          else next.add(idx);
          return next;
        });
        // Remove mark if present
        setMarks((prev) => {
          if (prev.has(idx)) {
            const next = new Set(prev);
            next.delete(idx);
            return next;
          }
          return prev;
        });
      }
    },
    [locked, bounce, markMode],
  );

  /* ── Auto-record on solve ── */
  const prevSolved = useRef(false);
  if (solved && !prevSolved.current && !locked) {
    prevSolved.current = true;
    const time = Math.floor((Date.now() - startTime) / 1000);
    setSolveTime(time);
    setLocked(true);
    // Par time: 30s for 6x6, 60s for 7x7
    const parTime = size <= 6 ? 30 : 60;
    recordGame('star', time, parTime).then((s) => {
      setStatsData(s);
      setShowStats(true);
    });
  }

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('star');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Border detection for region boundaries ── */
  function getRegionBorders(r: number, c: number) {
    const idx = r * size + c;
    const reg = regions[idx];
    return {
      top: r === 0 || regions[(r - 1) * size + c] !== reg,
      bottom: r === size - 1 || regions[(r + 1) * size + c] !== reg,
      left: c === 0 || regions[r * size + c - 1] !== reg,
      right: c === size - 1 || regions[r * size + c + 1] !== reg,
    };
  }

  /* ── Share text ── */
  function buildShareText() {
    const time = solveTime ?? elapsed;
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    const timeStr = mins > 0 ? `${mins}m${secs}s` : `${secs}s`;
    // Show region pattern (no solution spoiler)
    const rows: string[] = [];
    for (let r = 0; r < size; r++) {
      let row = '';
      for (let c = 0; c < size; c++) {
        const reg = regions[r * size + c];
        row += ['\ud83d\udfe5', '\ud83d\udfe6', '\ud83d\udfe9', '\ud83d\udfe8', '\ud83d\udfe3', '\u2b1b', '\ud83d\udfe7', '\u2b1c'][reg % 8];
      }
      rows.push(row);
    }
    return [
      `Star Day #${puzzleDay} \u2b50`,
      `${size}\u00d7${size} \u2022 ${timeStr} \u2022 ${moveCount} moves`,
      ...rows,
      solved ? '\u2b50 Solved!' : '',
    ].join('\n');
  }

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Star</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Place 1 star per row, column, and region. Stars can&apos;t touch.
      </Text>

      {/* Progress + timer + mode toggle */}
      <View style={styles.progressBar}>
        <Text style={styles.progressText}>
          {'\u2b50'} {placed.size}/{size}
        </Text>
        <Text style={styles.timerText}>
          {'\u23f1'} {formatTime(locked ? (solveTime ?? elapsed) : elapsed)}
        </Text>
        {conflicts.size > 0 && (
          <Text style={styles.conflictText}>
            {'\u26a0'} {conflicts.size}
          </Text>
        )}
      </View>
      {/* Pencil mode toggle */}
      {!locked && (
        <View style={styles.modeBar}>
          <Pressable
            onPress={() => setMarkMode(false)}
            style={[styles.modeBtn, !markMode && styles.modeBtnActive]}
          >
            <Text style={styles.modeBtnText}>{'\u2b50'} Star</Text>
          </Pressable>
          <Pressable
            onPress={() => setMarkMode(true)}
            style={[styles.modeBtn, markMode && styles.modeBtnActive]}
          >
            <Text style={styles.modeBtnText}>{'\u2716'} Mark</Text>
          </Pressable>
        </View>
      )}

      {/* Grid */}
      <View style={styles.grid}>
        {Array.from({ length: size }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: size }, (_, c) => {
              const idx = r * size + c;
              const reg = regions[idx];
              const hasStar = placed.has(idx);
              const hasConflict = conflicts.has(idx);
              const borders = getRegionBorders(r, c);
              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [
                      {
                        scale:
                          idx < cellScales.length ? cellScales[idx] : 1,
                      },
                    ],
                  }}
                >
                  <Pressable
                    onPress={() => handleTap(idx)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor:
                          REGION_BG[reg % REGION_BG.length],
                        borderTopWidth: borders.top ? 3 : 1,
                        borderBottomWidth: borders.bottom ? 3 : 1,
                        borderLeftWidth: borders.left ? 3 : 1,
                        borderRightWidth: borders.right ? 3 : 1,
                        borderTopColor: borders.top
                          ? REGION_COLORS[reg % REGION_COLORS.length]
                          : '#2a2a2c',
                        borderBottomColor: borders.bottom
                          ? REGION_COLORS[reg % REGION_COLORS.length]
                          : '#2a2a2c',
                        borderLeftColor: borders.left
                          ? REGION_COLORS[reg % REGION_COLORS.length]
                          : '#2a2a2c',
                        borderRightColor: borders.right
                          ? REGION_COLORS[reg % REGION_COLORS.length]
                          : '#2a2a2c',
                      },
                    ]}
                  >
                    {hasStar && (
                      <Text
                        style={[
                          styles.star,
                          hasConflict && styles.starConflict,
                        ]}
                      >
                        {'\u2b50'}
                      </Text>
                    )}
                    {marks.has(idx) && !hasStar && (
                      <Text style={styles.mark}>{'\u2716'}</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>{'\ud83c\udf1f'}</Text>
          <Text style={styles.endText}>
            Solved in {formatTime(solveTime ?? elapsed)}!
          </Text>
          <Text style={styles.endSub}>{moveCount} moves</Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Place exactly 1 star ({'\u2b50'}) in each row, each column, and each
          colored region.{'\n\n'}
          Stars cannot touch each other — not even diagonally.{'\n'}
          Tap to place or remove a star.
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
    marginBottom: 10,
    textAlign: 'center',
    maxWidth: 300,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  progressText: { color: '#f1c40f', fontSize: 16, fontWeight: '700' },
  timerText: { color: '#818384', fontSize: 14, fontWeight: '600' },
  conflictText: { color: '#e74c3c', fontSize: 14, fontWeight: '600' },
  modeBar: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2a2a2c',
    borderWidth: 2,
    borderColor: '#3a3a3c',
  },
  modeBtnActive: { borderColor: '#6aaa64', backgroundColor: '#1e331e' },
  modeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  grid: { gap: 0 },
  gridRow: { flexDirection: 'row', gap: 0 },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: { fontSize: 22 },
  starConflict: { opacity: 0.5 },
  mark: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  endSub: { color: '#818384', fontSize: 13, marginTop: 4 },
  endMsg: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: {
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
