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
const GRID = 5;
const CELLS = GRID * GRID;
const GAP = 4;

/* Knight's move offsets */
const KNIGHT_OFFSETS: [number, number][] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

/* ─── Helpers ─── */
function getAffected(cellIdx: number): number[] {
  const r = Math.floor(cellIdx / GRID);
  const c = cellIdx % GRID;
  const result = [cellIdx]; // self
  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) {
      result.push(nr * GRID + nc);
    }
  }
  return result;
}

function toggle(board: boolean[], cellIdx: number): boolean[] {
  const next = [...board];
  for (const idx of getAffected(cellIdx)) {
    next[idx] = !next[idx];
  }
  return next;
}

function isSolved(board: boolean[]): boolean {
  return board.every((c) => !c);
}

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  return {
    minTaps: 3 + d,        // Mon:4, Fri:8
    tapRange: 2 + d,       // Mon:3, Fri:7
    parTaps: 12 - d,       // Mon:11, Fri:7 (generous)
  };
}

/* ─── Generate puzzle (backward scramble) ─── */
function generateBoard(seed: number, minTaps: number, tapRange: number): boolean[] {
  const rng = seededRandom(seed);
  const board = Array(CELLS).fill(false);
  const numTaps = minTaps + Math.floor(rng() * tapRange);
  for (let i = 0; i < numTaps; i++) {
    const cell = Math.floor(rng() * CELLS);
    const affected = getAffected(cell);
    for (const idx of affected) board[idx] = !board[idx];
  }
  if (isSolved(board)) {
    const affected = getAffected(0);
    for (const idx of affected) board[idx] = !board[idx];
  }
  return board;
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Leap() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const { minTaps, tapRange, parTaps } = useMemo(() => getDifficulty(), []);
  const initialBoard = useMemo(
    () => generateBoard(seed, minTaps, tapRange),
    [seed, minTaps, tapRange],
  );

  const [board, setBoard] = useState(() => [...initialBoard]);
  const [taps, setTaps] = useState(0);
  const [tapHistory, setTapHistory] = useState<number[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);

  const solved = isSolved(board);
  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor(maxWidth / GRID) - GAP;

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: CELLS }, () => new Animated.Value(1)),
  ).current;

  const bounceAffected = useCallback(
    (cellIdx: number) => {
      const affected = getAffected(cellIdx);
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

  /* ── Tap ── */
  const handleTap = useCallback(
    (cellIdx: number) => {
      if (solved) return;
      bounceAffected(cellIdx);
      const next = toggle(board, cellIdx);
      setBoard(next);
      setTaps((t) => t + 1);
      setTapHistory((h) => [...h, cellIdx]);

      if (isSolved(next)) {
        recordGame('leap', taps + 1, parTaps).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [board, solved, taps, parTaps, bounceAffected],
  );

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (tapHistory.length === 0 || solved) return;
    const lastCell = tapHistory[tapHistory.length - 1];
    const next = toggle(board, lastCell);
    setBoard(next);
    setTaps((t) => t - 1);
    setTapHistory((h) => h.slice(0, -1));
  }, [board, tapHistory, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('leap');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const under = taps <= parTaps;
    const tapCounts = Array(CELLS).fill(0);
    for (const c of tapHistory) tapCounts[c]++;
    const rows: string[] = [];
    for (let r = 0; r < GRID; r++) {
      let row = '';
      for (let c = 0; c < GRID; c++) {
        const count = tapCounts[r * GRID + c];
        row += count === 0 ? '\u2b1b' : count === 1 ? '\ud83d\udfe8' : '\ud83d\udfe7';
      }
      rows.push(row);
    }
    return [
      `Leap Day #${puzzleDay} \u265e`,
      `${taps}/${parTaps} taps`,
      ...rows,
      under ? '\u2b50 All lights off!' : `Solved in ${taps} taps`,
    ].join('\n');
  }

  const lightsOn = board.filter(Boolean).length;

  /* ── Preview affected cells on press ── */
  const [hovered, setHovered] = useState<number | null>(null);
  const previewSet = useMemo(() => {
    if (hovered === null || solved) return new Set<number>();
    return new Set(getAffected(hovered));
  }, [hovered, solved]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Leap</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Tap to toggle cells at knight&apos;s-move distance. Turn all lights off.
      </Text>

      {/* Tap counter */}
      <View style={styles.tapBar}>
        <Text style={styles.tapLabel}>Taps</Text>
        <Text
          style={[
            styles.tapCount,
            solved && taps <= parTaps && styles.tapCountGood,
          ]}
        >
          {taps}
        </Text>
        <Text style={styles.tapPar}>Par: {parTaps}</Text>
        <Text style={styles.lightsLeft}>
          {'\ud83d\udca1'} {lightsOn} left
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
                    onPressIn={() => setHovered(idx)}
                    onPressOut={() => setHovered(null)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: lit ? '#9b59b6' : '#2c2c2e',
                        borderColor: previewed
                          ? '#6aaa64'
                          : lit
                            ? '#8e44ad'
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

      <CelebrationBurst show={solved && taps <= parTaps} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {taps <= parTaps ? '\ud83c\udf1f' : '\u265e'}
          </Text>
          <Text style={styles.endText}>
            {taps <= parTaps
              ? `Under par! ${taps} taps`
              : `Lights out in ${taps} taps`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap any cell to toggle it and all cells a knight&apos;s move away (the
          L-shaped chess move).{'\n\n'}
          Unlike LightsOut, the affected cells are far away — you must think
          across the board, not just locally.{'\n\n'}
          Turn every purple cell dark. Par: {parTaps} taps.
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
  lightsLeft: { color: '#9b59b6', fontSize: 14, marginLeft: 8 },
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
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
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
