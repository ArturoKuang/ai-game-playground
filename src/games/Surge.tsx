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
import { getDailySeed, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';
import {
  generatePuzzle,
  applyMove,
  isGoal,
  heuristic,
  solve,
  tapCell,
  type SurgeState,
  type Move,
} from '../solvers/Surge.solver';

/* ─── Constants ─── */
const GAP = 3;

const PRESSURE_COLORS = [
  '#2a2a2c', // 0: empty/dark
  '#2d6a4f', // 1: low green
  '#e9c46a', // 2: medium yellow
  '#e76f51', // 3: high orange-red
];

const PRESSURE_EMOJI = ['\u25CB', '\u25D4', '\u25D1', '\u25D5']; // ○ ◔ ◑ ◕

/* ─── Component ─── */
export default function Surge() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );
  const par = initialState.par;

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor(
    (maxGrid - (initialState.size - 1) * GAP) / initialState.size,
  );
  const gridWidth =
    initialState.size * cellSize + (initialState.size - 1) * GAP;

  const [state, setState] = useState<SurgeState>(() => ({
    ...initialState,
    grid: [...initialState.grid],
    taps: 0,
  }));
  const [history, setHistory] = useState<SurgeState[]>(() => [
    { ...initialState, grid: [...initialState.grid], taps: 0 },
  ]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(state);
  const totalCells = state.size * state.size;

  const cellScales = useRef(
    Array.from({ length: totalCells }, () => new Animated.Value(1)),
  ).current;

  /* ── Tap handler ── */
  const handleTap = useCallback(
    (cellIdx: number) => {
      if (solved) return;

      // Animate tapped cell
      Animated.sequence([
        Animated.timing(cellScales[cellIdx], {
          toValue: 1.2,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.spring(cellScales[cellIdx], {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate cascade neighbors if cell is at 3 (will cascade)
      if (state.grid[cellIdx] === 3) {
        const adj = getAdj(cellIdx, state.size);
        for (const a of adj) {
          Animated.sequence([
            Animated.timing(cellScales[a], {
              toValue: 1.15,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[a], {
              toValue: 1,
              friction: 4,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }

      const next = applyMove(state, cellIdx);

      setState(next);
      setHistory((h) => [...h, next]);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('surge', next.taps, par * 3).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, par, gameRecorded, cellScales],
  );

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prev = history[history.length - 2];
    setState({ ...prev, grid: [...prev.grid] });
    setHistory((h) => h.slice(0, -1));
  }, [history, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('surge');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const rows: string[] = [];
    const { size, grid, target } = state;
    for (let r = 0; r < size; r++) {
      let row = '';
      for (let c = 0; c < size; c++) {
        const i = r * size + c;
        if (grid[i] === target[i]) {
          row += '\uD83D\uDFE9'; // green
        } else {
          row += PRESSURE_EMOJI[grid[i]] || '\u25CB';
        }
      }
      rows.push(row);
    }
    const under = state.taps <= par;
    return [
      `Surge Day #${puzzleDay} \uD83C\uDF0B`,
      rows.join('\n'),
      `${state.taps}/${par} taps`,
      under ? '\u2B50 Within par!' : `Solved in ${state.taps}`,
    ].join('\n');
  }

  const h = heuristic(state);

  // Count cells matching target
  let matchCount = 0;
  for (let i = 0; i < totalCells; i++) {
    if (state.grid[i] === state.target[i]) matchCount++;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Surge</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Tap cells to add pressure. Reach the target configuration!
      </Text>

      {/* Info */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Taps</Text>
          <Text
            style={[
              styles.infoVal,
              solved && state.taps <= par && styles.infoGood,
            ]}
          >
            {state.taps}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Match</Text>
          <Text style={styles.infoVal}>
            {matchCount}/{totalCells}
          </Text>
        </View>
      </View>

      {/* Target grid label */}
      <Text style={styles.gridLabel}>TARGET</Text>

      {/* Target grid (read-only, smaller) */}
      <View style={[styles.gridContainer, { width: gridWidth * 0.6 }]}>
        {Array.from({ length: state.size }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: state.size }).map((_, c) => {
              const i = r * state.size + c;
              const val = state.target[i];
              const smallCell = Math.floor(cellSize * 0.6);
              return (
                <View
                  key={c}
                  style={[
                    styles.cell,
                    {
                      width: smallCell,
                      height: smallCell,
                      backgroundColor: PRESSURE_COLORS[val],
                      borderColor: '#555',
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text style={[styles.cellValue, { fontSize: 12 }]}>
                    {val}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Current grid label */}
      <Text style={styles.gridLabel}>CURRENT</Text>

      {/* Main grid */}
      <View style={[styles.gridContainer, { width: gridWidth }]}>
        {Array.from({ length: state.size }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: state.size }).map((_, c) => {
              const i = r * state.size + c;
              const val = state.grid[i];
              const tgt = state.target[i];
              const matches = val === tgt;
              const isCascadeReady = val === 3;

              let borderColor = '#555';
              let borderWidth = 1;
              if (matches) {
                borderColor = '#2ecc71';
                borderWidth = 3;
              } else if (isCascadeReady) {
                borderColor = '#e74c3c';
                borderWidth = 2;
              }

              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[i] }] }}
                >
                  <Pressable
                    onPress={() => handleTap(i)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: PRESSURE_COLORS[val],
                        borderColor,
                        borderWidth,
                      },
                    ]}
                  >
                    <Text style={styles.cellValue}>{val}</Text>
                    {/* Show target as ghost */}
                    {!matches && (
                      <Text style={styles.ghostTarget}>{tgt}</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Cascade hint */}
      {!solved && (
        <View style={styles.cascadeHint}>
          <Text style={styles.cascadeText}>
            {'\uD83D\uDCA5'} Red border = cascade at next tap
          </Text>
        </View>
      )}

      {/* Undo */}
      {!solved && history.length > 1 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      )}

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {state.taps < par
              ? '\uD83C\uDF1F'
              : state.taps === par
                ? '\u2B50'
                : '\uD83C\uDF0B'}
          </Text>
          <Text style={styles.endText}>
            {state.taps < par
              ? `Under par! ${state.taps} taps`
              : state.taps === par
                ? `At par! ${state.taps} taps`
                : `Solved in ${state.taps} taps`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap any cell to add +1 pressure. When a cell reaches 4, it resets to 0
          and pushes +1 to each neighbor (cascading!).
          {'\n\n'}
          Match every cell to its target value within par taps. Red borders mark
          cells at pressure 3 — one more tap triggers a cascade.
          {'\n\n'}
          Par: {par} taps.
        </Text>
      </View>

      {showStats && stats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
    </ScrollView>
  );
}

/* ─── Helper (duplicated for animation, no import needed) ─── */
function getAdj(index: number, size: number): number[] {
  const r = Math.floor(index / size);
  const c = index % size;
  const adj: number[] = [];
  if (r > 0) adj.push(r * size - size + c);
  if (r < size - 1) adj.push((r + 1) * size + c);
  if (c > 0) adj.push(r * size + c - 1);
  if (c < size - 1) adj.push(r * size + c + 1);
  return adj;
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
  infoBar: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 11, marginBottom: 2 },
  infoVal: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  infoGood: { color: '#2ecc71' },
  infoPar: { color: '#818384', fontSize: 22, fontWeight: '800' },
  gridLabel: {
    color: '#818384',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
    marginTop: 8,
  },
  gridContainer: { gap: GAP, marginBottom: 8 },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  ghostTarget: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
  },
  cascadeHint: {
    marginTop: 6,
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cascadeText: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: '600',
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
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
