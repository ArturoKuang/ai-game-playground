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
const GAP = 3;
const PATH_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f1c40f',
  '#9b59b6', '#e67e22', '#1abc9c', '#e91e63',
];
const PATH_EMOJI = [
  '\ud83d\udd34', '\ud83d\udd35', '\ud83d\udfe2', '\ud83d\udfe1',
  '\ud83d\udfe3', '\ud83d\udfe0', '\u26ab', '\u2b1c',
];

/* ─── Helpers ─── */
function neighbors(idx: number, size: number): number[] {
  const r = Math.floor(idx / size);
  const c = idx % size;
  const res: number[] = [];
  if (r > 0) res.push((r - 1) * size + c);
  if (r < size - 1) res.push((r + 1) * size + c);
  if (c > 0) res.push(r * size + c - 1);
  if (c < size - 1) res.push(r * size + c + 1);
  return res;
}

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  return {
    size: d <= 2 ? 5 : d <= 4 ? 6 : 7, // Mon-Tue:5, Wed-Thu:6, Fri:7
    numPaths: 2 + d, // Mon:3, Fri:7
  };
}

/* ─── Hamiltonian path via Warnsdorff heuristic ─── */
function generateHamiltonianPath(
  rng: () => number,
  size: number,
): number[] | null {
  const n = size * size;
  const visited = Array(n).fill(false);
  const start = Math.floor(rng() * n);
  const path = [start];
  visited[start] = true;

  while (path.length < n) {
    const cur = path[path.length - 1];
    const nbs = neighbors(cur, size).filter((nb) => !visited[nb]);
    if (nbs.length === 0) return null;

    // Warnsdorff: pick neighbor with fewest unvisited neighbors
    nbs.sort((a, b) => {
      const da = neighbors(a, size).filter((x) => !visited[x]).length;
      const db = neighbors(b, size).filter((x) => !visited[x]).length;
      return da - db || (rng() - 0.5);
    });
    const next = nbs[0];
    path.push(next);
    visited[next] = true;
  }
  return path;
}

/* ─── Partition path into segments ─── */
function partitionPath(
  path: number[],
  numPaths: number,
  rng: () => number,
): number[][] {
  const n = path.length;
  const cuts = [0];
  for (let i = 1; i < numPaths; i++) {
    const target = Math.round((i * n) / numPaths);
    const jitter = Math.floor(rng() * 3) - 1;
    const minCut = cuts[cuts.length - 1] + 2;
    const maxCut = n - (numPaths - i) * 2;
    cuts.push(Math.max(minCut, Math.min(maxCut, target + jitter)));
  }
  cuts.push(n);
  return Array.from({ length: numPaths }, (_, i) =>
    path.slice(cuts[i], cuts[i + 1]),
  );
}

/* ─── Generate puzzle ─── */
function generatePuzzle(seed: number) {
  const diff = getDifficulty();
  const { size, numPaths } = diff;

  for (let attempt = 0; attempt < 100; attempt++) {
    const rng = seededRandom(seed + attempt * 997);
    const ham = generateHamiltonianPath(rng, size);
    if (!ham) continue;
    const segments = partitionPath(ham, numPaths, rng);
    // Extract endpoints as dots
    const dots: { a: number; b: number; color: number }[] = segments.map(
      (seg, i) => ({
        a: seg[0],
        b: seg[seg.length - 1],
        color: i,
      }),
    );
    return { size, numPaths, dots, solution: segments };
  }
  // Fallback — should never reach
  return { size: 5, numPaths: 3, dots: [], solution: [] };
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Flow() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const puzzle = useMemo(() => generatePuzzle(seed), [seed]);
  const { size, numPaths, dots } = puzzle;
  const totalCells = size * size;

  /* ── Cell ownership: which path (color index) owns each cell, -1 = empty ─── */
  const [cellOwner, setCellOwner] = useState<number[]>(() =>
    Array(totalCells).fill(-1),
  );
  /* Paths: for each color, ordered list of cells in the drawn path */
  const [paths, setPaths] = useState<number[][]>(() =>
    Array.from({ length: numPaths }, () => []),
  );
  const [activeColor, setActiveColor] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [locked, setLocked] = useState(false);

  /* ── Dot map ── */
  const dotMap = useMemo(() => {
    const m = new Map<number, number>(); // cellIdx -> colorIdx
    for (const d of dots) {
      m.set(d.a, d.color);
      m.set(d.b, d.color);
    }
    return m;
  }, [dots]);

  /* ── Check completion ── */
  const allFilled = cellOwner.every((o) => o >= 0);
  const allConnected = paths.every((p, i) => {
    if (p.length < 2) return false;
    const d = dots[i];
    return (
      (p[0] === d.a && p[p.length - 1] === d.b) ||
      (p[0] === d.b && p[p.length - 1] === d.a)
    );
  });
  const solved = allFilled && allConnected;

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
          toValue: 1.1,
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
    },
    [cellScales],
  );

  /* ── Clear a path ── */
  const clearPath = useCallback(
    (colorIdx: number) => {
      setCellOwner((prev) => {
        const next = [...prev];
        for (let i = 0; i < next.length; i++) {
          if (next[i] === colorIdx) next[i] = -1;
        }
        return next;
      });
      setPaths((prev) => {
        const next = [...prev];
        next[colorIdx] = [];
        return next;
      });
      setActiveColor(null);
    },
    [],
  );

  /* ── Cell tap ── */
  const handleCellTap = useCallback(
    (idx: number) => {
      if (locked) return;
      bounce(idx);

      const isDot = dotMap.has(idx);
      const dotColor = dotMap.get(idx);

      // If tapping a dot...
      if (isDot && dotColor !== undefined) {
        // Check if this is the TARGET endpoint of the active path → complete it
        if (
          activeColor !== null &&
          dotColor === activeColor &&
          paths[activeColor].length > 0
        ) {
          const path = paths[activeColor];
          const lastCell = path[path.length - 1];
          const d = dots[activeColor];
          const isTarget =
            (idx === d.a || idx === d.b) && idx !== path[0];
          if (isTarget && neighbors(lastCell, size).includes(idx)) {
            // Complete the path
            setCellOwner((prev) => {
              const next = [...prev];
              next[idx] = activeColor;
              return next;
            });
            setPaths((prev) => {
              const next = [...prev];
              next[activeColor] = [...path, idx];
              return next;
            });
            setMoves((m) => m + 1);
            setActiveColor(null);
            return;
          }
        }

        // Otherwise start or restart that color's path
        if (paths[dotColor].length > 0) {
          clearPath(dotColor);
        }
        setActiveColor(dotColor);
        setCellOwner((prev) => {
          const next = [...prev];
          next[idx] = dotColor;
          return next;
        });
        setPaths((prev) => {
          const next = [...prev];
          next[dotColor] = [idx];
          return next;
        });
        setMoves((m) => m + 1);
        return;
      }

      // If we have an active color, try to extend the path
      if (activeColor !== null) {
        const path = paths[activeColor];
        if (path.length === 0) return;

        const lastCell = path[path.length - 1];
        const isAdj = neighbors(lastCell, size).includes(idx);
        if (!isAdj) return;

        // Can't extend into a cell owned by another color (unless it's the target dot)
        if (cellOwner[idx] >= 0 && cellOwner[idx] !== activeColor) return;

        // If this cell is already in our path, trim back to it
        const existingIdx = path.indexOf(idx);
        if (existingIdx >= 0) {
          // Trim path to this point
          const removed = path.slice(existingIdx + 1);
          setCellOwner((prev) => {
            const next = [...prev];
            for (const r of removed) next[r] = -1;
            return next;
          });
          setPaths((prev) => {
            const next = [...prev];
            next[activeColor] = path.slice(0, existingIdx + 1);
            return next;
          });
          setMoves((m) => m + 1);
          return;
        }

        // Extend path
        const d = dots[activeColor];
        const isTargetDot =
          (idx === d.a || idx === d.b) && idx !== path[0];

        setCellOwner((prev) => {
          const next = [...prev];
          next[idx] = activeColor;
          return next;
        });
        setPaths((prev) => {
          const next = [...prev];
          next[activeColor] = [...path, idx];
          return next;
        });
        setMoves((m) => m + 1);

        // If we reached the target dot, deactivate
        if (isTargetDot) {
          setActiveColor(null);
        }
      }
    },
    [activeColor, cellOwner, paths, dots, size, locked, dotMap, bounce, clearPath],
  );

  /* ── Lock in ── */
  const handleLock = useCallback(() => {
    if (!solved || locked) return;
    setLocked(true);
    recordGame('flow', moves, totalCells, false).then((s) => {
      setStatsData(s);
      setShowStats(true);
    });
  }, [solved, locked, moves, totalCells]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('flow');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const rows: string[] = [];
    for (let r = 0; r < size; r++) {
      let row = '';
      for (let c = 0; c < size; c++) {
        const idx = r * size + c;
        const owner = cellOwner[idx];
        row += owner >= 0 ? PATH_EMOJI[owner % PATH_EMOJI.length] : '\u2b1b';
      }
      rows.push(row);
    }
    return [
      `Flow Day #${puzzleDay} \ud83c\udf0a`,
      `${numPaths} paths \u2022 ${size}\u00d7${size}`,
      ...rows,
      solved ? '\u2b50 All connected!' : '',
    ].join('\n');
  }

  const filledCount = cellOwner.filter((o) => o >= 0).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Flow</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Connect matching dots. Fill every cell. Paths can&apos;t cross.
      </Text>

      {/* Progress */}
      <View style={styles.progressBar}>
        <Text style={styles.progressText}>
          {filledCount}/{totalCells} cells
        </Text>
        <Text style={styles.progressPaths}>
          {paths.filter(
            (p, i) =>
              p.length >= 2 &&
              ((p[0] === dots[i].a && p[p.length - 1] === dots[i].b) ||
                (p[0] === dots[i].b && p[p.length - 1] === dots[i].a)),
          ).length}
          /{numPaths} paths
        </Text>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {Array.from({ length: size }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: size }, (_, c) => {
              const idx = r * size + c;
              const owner = cellOwner[idx];
              const isDot = dotMap.has(idx);
              const isActive = activeColor !== null && owner === activeColor;
              const isEnd =
                activeColor !== null &&
                paths[activeColor].length > 0 &&
                paths[activeColor][paths[activeColor].length - 1] === idx;
              const color =
                owner >= 0
                  ? PATH_COLORS[owner % PATH_COLORS.length]
                  : '#1a1a1b';
              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [
                      { scale: idx < cellScales.length ? cellScales[idx] : 1 },
                    ],
                  }}
                >
                  <Pressable
                    onPress={() => handleCellTap(idx)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: color,
                        borderColor: isEnd
                          ? '#ffffff'
                          : isActive
                            ? 'rgba(255,255,255,0.4)'
                            : owner >= 0
                              ? 'rgba(255,255,255,0.15)'
                              : '#2a2a2c',
                        borderWidth: isEnd ? 3 : isDot ? 2 : 1,
                      },
                    ]}
                  >
                    {isDot && (
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor:
                              PATH_COLORS[
                                (dotMap.get(idx) ?? 0) % PATH_COLORS.length
                              ],
                          },
                        ]}
                      />
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Lock in */}
      {solved && !locked && (
        <Pressable style={styles.lockBtn} onPress={handleLock}>
          <Text style={styles.lockText}>Complete!</Text>
        </Pressable>
      )}

      <CelebrationBurst show={locked} />

      {locked && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>{'\ud83c\udf1f'}</Text>
          <Text style={styles.endText}>All paths connected!</Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap a colored dot to start drawing, then tap adjacent cells to extend
          the path. Reach the matching dot to complete it.{'\n\n'}
          Fill every cell. Paths cannot cross or overlap.{'\n'}
          Tap a dot again to restart that path.
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
  progressText: { color: '#818384', fontSize: 14 },
  progressPaths: { color: '#6aaa64', fontSize: 14, fontWeight: '600' },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: '55%',
    height: '55%',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  lockBtn: {
    backgroundColor: '#6aaa64',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  lockText: { color: '#fff', fontWeight: '700', fontSize: 16 },
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
