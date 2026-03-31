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
const GRID = 4;
const CELLS = GRID * GRID;
const GAP = 4;

/* Phase patterns: offsets from tapped cell */
const PHASES: { name: string; icon: string; offsets: [number, number][] }[] = [
  {
    name: 'Cross',
    icon: '\u271a',
    offsets: [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ],
  },
  {
    name: 'Line',
    icon: '\u2194',
    offsets: [
      [0, 0],
      [0, -1],
      [0, 1],
    ],
  },
  {
    name: 'X',
    icon: '\u2716',
    offsets: [
      [0, 0],
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ],
  },
];
const NUM_PHASES = PHASES.length;

/* ─── Helpers ─── */
function boardToKey(board: boolean[], phase: number): string {
  let bits = 0;
  for (let i = 0; i < CELLS; i++) if (board[i]) bits |= 1 << i;
  return `${bits}:${phase}`;
}

function isSolved(board: boolean[]): boolean {
  return board.every((c) => !c);
}

function applyTap(
  board: boolean[],
  cellIdx: number,
  phase: number,
): boolean[] {
  const next = [...board];
  const r = Math.floor(cellIdx / GRID);
  const c = cellIdx % GRID;
  for (const [dr, dc] of PHASES[phase].offsets) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) {
      const ni = nr * GRID + nc;
      next[ni] = !next[ni];
    }
  }
  return next;
}

/* ─── Affected cells for preview ─── */
function getAffected(cellIdx: number, phase: number): number[] {
  const r = Math.floor(cellIdx / GRID);
  const c = cellIdx % GRID;
  const result: number[] = [];
  for (const [dr, dc] of PHASES[phase].offsets) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) {
      result.push(nr * GRID + nc);
    }
  }
  return result;
}

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  return {
    scrambleTaps: 3 + d * 2, // Mon:5, Fri:13
  };
}

/* ─── Generate puzzle (forward scramble) ─── */
function generatePuzzle(seed: number) {
  const diff = getDifficulty();
  const rng = seededRandom(seed);
  let board = Array(CELLS).fill(false);
  let phase = 0;

  for (let i = 0; i < diff.scrambleTaps; i++) {
    const cell = Math.floor(rng() * CELLS);
    board = applyTap(board, cell, phase);
    phase = (phase + 1) % NUM_PHASES;
  }

  // Ensure not already solved
  if (isSolved(board)) {
    board = applyTap(board, 0, 0);
  }

  return { initialBoard: board };
}

/* ─── BFS solver ─── */
function solveBFS(initialBoard: boolean[]): number {
  const startKey = boardToKey(initialBoard, 0);
  const targetBits = 0; // all off
  if (isSolved(initialBoard)) return 0;

  const visited = new Set<string>([startKey]);
  let frontier: { board: boolean[]; phase: number }[] = [
    { board: initialBoard, phase: 0 },
  ];

  for (let depth = 1; depth <= 20; depth++) {
    const next: { board: boolean[]; phase: number }[] = [];
    for (const { board, phase } of frontier) {
      for (let cell = 0; cell < CELLS; cell++) {
        const nb = applyTap(board, cell, phase);
        const np = (phase + 1) % NUM_PHASES;
        if (isSolved(nb)) return depth;
        const key = boardToKey(nb, np);
        if (!visited.has(key)) {
          visited.add(key);
          next.push({ board: nb, phase: np });
        }
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return -1; // unreachable
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Phase() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const { initialBoard } = useMemo(() => generatePuzzle(seed), [seed]);
  const par = useMemo(() => solveBFS(initialBoard), [initialBoard]);

  const [board, setBoard] = useState(() => [...initialBoard]);
  const [phase, setPhase] = useState(0);
  const [taps, setTaps] = useState(0);
  const [tapHistory, setTapHistory] = useState<number[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  const solved = isSolved(board);
  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 48, 320);
  const cellSize = Math.floor(maxWidth / GRID) - GAP;

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: CELLS }, () => new Animated.Value(1)),
  ).current;

  const bounceAffected = useCallback(
    (cellIdx: number, ph: number) => {
      const affected = getAffected(cellIdx, ph);
      const anims = affected.map((idx) =>
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
        ]),
      );
      Animated.parallel(anims).start();
    },
    [cellScales],
  );

  /* ── Tap handler ── */
  const handleTap = useCallback(
    (cellIdx: number) => {
      if (solved) return;
      bounceAffected(cellIdx, phase);
      const next = applyTap(board, cellIdx, phase);
      const nextPhase = (phase + 1) % NUM_PHASES;
      const nextTaps = taps + 1;

      setBoard(next);
      setPhase(nextPhase);
      setTaps(nextTaps);
      setTapHistory((h) => [...h, cellIdx]);

      if (isSolved(next)) {
        recordGame('phase', nextTaps, par).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [board, phase, taps, solved, par, bounceAffected],
  );

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (tapHistory.length === 0 || solved) return;
    // Reverse the last tap at the previous phase
    const prevPhase = (phase - 1 + NUM_PHASES) % NUM_PHASES;
    const lastCell = tapHistory[tapHistory.length - 1];
    const next = applyTap(board, lastCell, prevPhase);
    setBoard(next);
    setPhase(prevPhase);
    setTaps((t) => t - 1);
    setTapHistory((h) => h.slice(0, -1));
  }, [board, phase, tapHistory, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('phase');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const under = taps <= par;
    const grid: string[] = [];
    for (let r = 0; r < GRID; r++) {
      let row = '';
      for (let c = 0; c < GRID; c++) {
        const idx = r * GRID + c;
        const tapped = tapHistory.includes(idx);
        row += tapped ? '\ud83d\udfe2' : '\u2b1b';
      }
      grid.push(row);
    }
    return [
      `Phase Day #${puzzleDay} \ud83d\udd04`,
      `${taps}/${par} taps`,
      ...grid,
      under ? '\u2b50 Under par!' : `Solved in ${taps}`,
    ].join('\n');
  }

  /* ── Preview affected cells ── */
  const previewSet = useMemo(() => {
    if (hoveredCell === null || solved) return new Set<number>();
    return new Set(getAffected(hoveredCell, phase));
  }, [hoveredCell, phase, solved]);

  const lightsOn = board.filter(Boolean).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Phase</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Toggle cells off. The pattern changes each tap.
      </Text>

      {/* Phase indicator */}
      <View style={styles.phaseBar}>
        {PHASES.map((p, i) => (
          <View
            key={i}
            style={[
              styles.phaseItem,
              i === phase && styles.phaseItemActive,
            ]}
          >
            <Text
              style={[
                styles.phaseIcon,
                i === phase && styles.phaseIconActive,
              ]}
            >
              {p.icon}
            </Text>
            <Text
              style={[
                styles.phaseName,
                i === phase && styles.phaseNameActive,
              ]}
            >
              {p.name}
            </Text>
          </View>
        ))}
      </View>

      {/* Tap counter */}
      <View style={styles.tapBar}>
        <Text style={styles.tapLabel}>Taps</Text>
        <Text
          style={[
            styles.tapCount,
            solved && taps <= par && styles.tapCountGood,
          ]}
        >
          {taps}
        </Text>
        <Text style={styles.tapPar}>Par: {par >= 0 ? par : '?'}</Text>
        <Text style={styles.lightsLeft}>
          {'\ud83d\udfe1'} {lightsOn}
        </Text>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {Array.from({ length: GRID }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: GRID }, (_, c) => {
              const idx = r * GRID + c;
              const lit = board[idx];
              const previewed = previewSet.has(idx);
              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[idx] }] }}
                >
                  <Pressable
                    onPress={() => handleTap(idx)}
                    onPressIn={() => setHoveredCell(idx)}
                    onPressOut={() => setHoveredCell(null)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: lit ? '#f1c40f' : '#2c2c2e',
                        borderColor: previewed
                          ? '#6aaa64'
                          : lit
                            ? '#f39c12'
                            : '#3a3a3c',
                        borderWidth: previewed ? 3 : 2,
                      },
                    ]}
                  >
                    {lit && <View style={styles.glow} />}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Undo */}
      {!solved && tapHistory.length > 0 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      )}

      <CelebrationBurst show={solved && taps <= par} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {taps <= par ? '\ud83c\udf1f' : '\ud83d\udd04'}
          </Text>
          <Text style={styles.endText}>
            {taps <= par
              ? `Under par! ${taps} taps`
              : `Solved in ${taps} taps`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Turn off all the yellow cells. Each tap toggles a pattern — but the
          pattern SHIFTS with every tap:{'\n\n'}
          {'\u271a'} Cross — cell + 4 neighbors{'\n'}
          {'\u2194'} Line — cell + left & right{'\n'}
          {'\u2716'} X — cell + 4 diagonals{'\n\n'}
          Plan your taps across all three phases. Par: {par >= 0 ? par : '?'}.
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
  phaseBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  phaseItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1a1a1b',
    borderWidth: 2,
    borderColor: '#3a3a3c',
  },
  phaseItemActive: {
    borderColor: '#6aaa64',
    backgroundColor: '#1e331e',
  },
  phaseIcon: { fontSize: 18, color: '#818384' },
  phaseIconActive: { color: '#6aaa64' },
  phaseName: { fontSize: 10, color: '#818384', marginTop: 2 },
  phaseNameActive: { color: '#6aaa64', fontWeight: '700' },
  tapBar: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  tapLabel: { color: '#818384', fontSize: 14 },
  tapCount: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  tapCountGood: { color: '#2ecc71' },
  tapPar: { color: '#818384', fontSize: 14 },
  lightsLeft: { color: '#f1c40f', fontSize: 14, marginLeft: 8 },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: '60%',
    height: '60%',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  undoText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
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
