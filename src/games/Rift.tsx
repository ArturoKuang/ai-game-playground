import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Animated,
  Platform,
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
  legalMoves,
  type RiftState,
  type Move,
} from '../solvers/Rift.solver';

/* ─── Constants ─── */
const GAP = 2;
const STABLE_COLOR = '#27ae60';   // green for stable terrain
const UNSTABLE_COLOR = '#c0392b'; // red for unstable terrain
const UNKNOWN_COLOR = '#1a1a1c';  // dark gray for unprobed
const BOUNDARY_COLOR = '#f39c12'; // gold for traced boundary
const MUTED = '#818384';

export default function Rift() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const [state, setState] = useState<RiftState>(() => ({ ...initialState }));
  const [history, setHistory] = useState<RiftState[]>(() => [state]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(state);
  const probesUsed = initialState.budget - state.budget;
  const rowsTraced = state.traced.filter((t) => t).length;

  const { width: screenWidth } = useWindowDimensions();
  const gridAreaMax = Math.min(screenWidth - 48, 360);
  const cellSize = Math.floor(
    (gridAreaMax - (state.cols - 1) * GAP) / state.cols,
  );
  const gridWidth = state.cols * cellSize + (state.cols - 1) * GAP;

  /* ─── Animations ─── */
  const cellScales = useRef(
    Array.from({ length: state.rows * state.cols }, () => new Animated.Value(1)),
  ).current;

  /* ─── Check if a cell is part of the traced boundary ─── */
  const isBoundaryCell = useCallback(
    (row: number, col: number): boolean => {
      if (!state.traced[row]) return false;
      // Check if this cell and an adjacent cell straddle the boundary
      const key = `${row},${col}`;
      if (!state.probes.has(key)) return false;
      const val = state.probes.get(key)!;

      // Check right neighbor
      const rightKey = `${row},${col + 1}`;
      if (col + 1 < state.cols && state.probes.has(rightKey)) {
        if (state.probes.get(rightKey)! !== val) return true;
      }
      // Check left neighbor
      const leftKey = `${row},${col - 1}`;
      if (col - 1 >= 0 && state.probes.has(leftKey)) {
        if (state.probes.get(leftKey)! !== val) return true;
      }

      // Edge case: boundary at col 0 (all unstable in row)
      if (state.faultLine[row] === 0 && col === 0 && !val) return true;
      // Edge case: boundary at cols (all stable in row)
      if (state.faultLine[row] >= state.cols && col === state.cols - 1 && val) return true;

      return false;
    },
    [state],
  );

  /* ─── Tap handler ─── */
  const handleTap = useCallback(
    (row: number, col: number) => {
      if (solved) return;
      const key = `${row},${col}`;
      if (state.probes.has(key) || state.budget <= 0) return;

      const cellIdx = row * state.cols + col;

      // Spring scale animation
      Animated.sequence([
        Animated.timing(cellScales[cellIdx], {
          toValue: 1.15,
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

      const move: Move = { row, col };
      const next = applyMove(state, move);
      setState(next);
      setHistory((h) => [...h, next]);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        const used = initialState.budget - next.budget;
        recordGame('rift', used, initialState.budget).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, initialState, gameRecorded, cellScales],
  );

  /* ─── Undo ─── */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prev = history[history.length - 2];
    setState(prev);
    setHistory((h) => h.slice(0, -1));
  }, [history, solved]);

  /* ─── Reset ─── */
  const handleReset = useCallback(() => {
    if (solved) return;
    const init: RiftState = { ...initialState, probes: new Map(), traced: new Array(initialState.rows).fill(false), budget: initialState.budget };
    setState(init);
    setHistory([init]);
  }, [initialState, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('rift');
    setStats(s);
    setShowStats(true);
  }, []);

  /* ─── Share text ─── */
  function buildShareText() {
    const rows: string[] = [];
    for (let r = 0; r < state.rows; r++) {
      let row = '';
      for (let c = 0; c < state.cols; c++) {
        const key = `${r},${c}`;
        if (state.probes.has(key)) {
          if (isBoundaryCell(r, c)) {
            row += '\uD83D\uDFE1'; // yellow = boundary
          } else if (state.probes.get(key)!) {
            row += '\uD83D\uDFE9'; // green = stable
          } else {
            row += '\uD83D\uDFE5'; // red = unstable
          }
        } else {
          row += '\u2B1B'; // black = unknown
        }
      }
      rows.push(row);
    }
    const underBudget = probesUsed <= initialState.budget;
    return [
      `Rift Day #${puzzleDay} \uD83C\uDF0B`,
      rows.join('\n'),
      `${probesUsed} probes / ${initialState.budget} budget`,
      `${rowsTraced}/${state.rows} rows traced`,
      underBudget ? '\u2B50 Fault line found!' : `Traced in ${probesUsed}`,
    ].join('\n');
  }

  const outOfProbes = !solved && state.budget === 0;

  return (
    <View style={styles.outerContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Rift</Text>
          <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
          <Pressable onPress={handleShowStats}>
            <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Drop probes to trace the hidden fault line
        </Text>

        {/* Info bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Probes</Text>
            <Text
              style={[
                styles.infoVal,
                solved && styles.infoGood,
              ]}
            >
              {probesUsed}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Budget</Text>
            <Text style={styles.infoPar}>{initialState.budget}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Traced</Text>
            <Text
              style={[
                styles.infoVal,
                solved && styles.infoGood,
              ]}
            >
              {rowsTraced}/{state.rows}
            </Text>
          </View>
        </View>

        {/* Grid */}
        <View style={{ width: gridWidth }}>
          {Array.from({ length: state.rows }).map((_, r) => (
            <View
              key={r}
              style={{
                flexDirection: 'row',
                marginBottom: r < state.rows - 1 ? GAP : 0,
              }}
            >
              {Array.from({ length: state.cols }).map((_, c) => {
                const cellIdx = r * state.cols + c;
                const key = `${r},${c}`;
                const isProbed = state.probes.has(key);
                const isStable = isProbed ? state.probes.get(key)! : false;
                const isBoundary = isBoundaryCell(r, c);
                const canProbe = !isProbed && !solved && state.budget > 0;

                let bg = UNKNOWN_COLOR;
                let borderColor = '#333';
                let borderWidth = 1;

                if (isProbed) {
                  if (isBoundary) {
                    bg = '#7d5a00'; // dark gold for boundary
                    borderColor = BOUNDARY_COLOR;
                    borderWidth = 2;
                  } else if (isStable) {
                    bg = '#1a4a2e'; // dark green
                    borderColor = STABLE_COLOR;
                    borderWidth = 1;
                  } else {
                    bg = '#4a1a1a'; // dark red
                    borderColor = UNSTABLE_COLOR;
                    borderWidth = 1;
                  }
                } else if (canProbe) {
                  bg = 'rgba(52,152,219,0.1)';
                  borderColor = '#2a2a2c';
                }

                return (
                  <Animated.View
                    key={c}
                    style={{
                      transform: [{ scale: cellScales[cellIdx] }],
                      marginRight: c < state.cols - 1 ? GAP : 0,
                    }}
                  >
                    <Pressable
                      onPress={() => handleTap(r, c)}
                      {...(Platform.OS === 'web'
                        ? {
                            role: 'button' as any,
                            tabIndex: 0,
                            style: [
                              styles.cell,
                              {
                                width: cellSize,
                                height: cellSize,
                                backgroundColor: bg,
                                borderColor,
                                borderWidth,
                                cursor: canProbe ? 'pointer' : 'default',
                                userSelect: 'none',
                              } as any,
                            ],
                          }
                        : {
                            style: [
                              styles.cell,
                              {
                                width: cellSize,
                                height: cellSize,
                                backgroundColor: bg,
                                borderColor,
                                borderWidth,
                              },
                            ],
                          })}
                    >
                      {isProbed && (
                        <Text
                          style={{
                            fontSize: Math.max(8, cellSize * 0.35),
                            fontWeight: '800',
                            color: isBoundary
                              ? BOUNDARY_COLOR
                              : isStable
                                ? STABLE_COLOR
                                : UNSTABLE_COLOR,
                          }}
                        >
                          {isBoundary ? '\u26A0' : isStable ? '\u2713' : '\u2717'}
                        </Text>
                      )}
                      {!isProbed && canProbe && (
                        <Text
                          style={{
                            color: '#3498db',
                            fontSize: Math.max(8, cellSize * 0.4),
                            fontWeight: '800',
                          }}
                        >
                          {'\u00B7'}
                        </Text>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Row trace indicators */}
        <View style={styles.traceBar}>
          {state.traced.map((t, i) => (
            <View
              key={i}
              style={[
                styles.traceDot,
                { backgroundColor: t ? BOUNDARY_COLOR : '#333' },
              ]}
            />
          ))}
        </View>

        {/* Out of probes warning */}
        {outOfProbes && (
          <View style={styles.stuckBanner}>
            <Text style={styles.stuckText}>
              Out of probes! {rowsTraced}/{state.rows} rows traced. Reset to try again.
            </Text>
          </View>
        )}

        <CelebrationBurst show={solved} />

        {solved && (
          <View style={styles.endMsg}>
            <Text style={styles.endEmoji}>
              {probesUsed < initialState.budget * 0.7
                ? '\uD83C\uDF1F'
                : probesUsed <= initialState.budget
                  ? '\u2B50'
                  : '\uD83C\uDF0B'}
            </Text>
            <Text style={styles.endText}>
              {probesUsed < initialState.budget * 0.7
                ? `Expert! ${probesUsed} probes`
                : probesUsed <= initialState.budget
                  ? `Traced! ${probesUsed} probes`
                  : `Found it in ${probesUsed} probes`}
            </Text>
            <ShareButton text={buildShareText()} />
          </View>
        )}

        <View style={styles.howTo}>
          <Text style={styles.howToTitle}>How to play</Text>
          <Text style={styles.howToText}>
            A hidden fault line divides the terrain into stable (green) and
            unstable (red) zones. Tap cells to drop seismic probes and reveal
            their stability.
            {'\n\n'}
            Trace the fault line by finding adjacent cells that differ (one stable,
            one unstable) in every row. The boundary between them IS the fault line.
            {'\n\n'}
            Tip: Instead of scanning one cell at a time, try probing the MIDDLE of
            the unknown range to cut your search in half each time!
            {'\n\n'}
            Budget: {initialState.budget} probes for {state.rows} rows.
            Difficulty: {'★'.repeat(difficulty)}{'☆'.repeat(5 - difficulty)}
          </Text>
        </View>

        {/* Spacer for fixed bottom bar */}
        {!solved && probesUsed > 0 && <View style={{ height: 72 }} />}

        {showStats && stats && (
          <StatsModal stats={stats} onClose={() => setShowStats(false)} />
        )}
      </ScrollView>

      {/* Fixed bottom bar */}
      {!solved && probesUsed > 0 && (
        <View style={styles.fixedBottomBar}>
          {history.length > 1 && (
            <Pressable style={styles.undoBtn} onPress={handleUndo}>
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
          )}
          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#121213',
  },
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
    color: MUTED,
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
  infoLabel: { color: MUTED, fontSize: 11, marginBottom: 2 },
  infoVal: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  infoGood: { color: '#2ecc71' },
  infoPar: { color: MUTED, fontSize: 22, fontWeight: '800' },
  cell: {
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative',
  },
  traceBar: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  traceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stuckBanner: {
    marginTop: 10,
    backgroundColor: '#4a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  stuckText: { color: '#e74c3c', fontSize: 13, fontWeight: '600' },
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1c',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  undoText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  resetBtn: {
    backgroundColor: '#4a1a1a',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetText: { color: '#e74c3c', fontWeight: '600', fontSize: 14 },
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
  howToText: { color: MUTED, fontSize: 13, lineHeight: 20 },
});
