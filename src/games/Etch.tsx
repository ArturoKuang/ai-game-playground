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
  legalMoves,
  solve,
  type EtchState,
  type Move,
} from '../solvers/Etch.solver';

/* ─── Constants ─── */
const GAP = 2;
const TARGET_LABEL_W = 28;

/* ─── Colors ─── */
const BLOCK_COLOR = '#546e7a';
const BLOCK_REMOVED = '#1a1a1c';
const BLOCK_HIGHLIGHT = '#e67e22';
const BLOCK_LEGAL = 'rgba(230,126,34,0.35)';

export default function Etch() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );
  const par = useMemo(() => {
    const sol = solve(initialState, 5);
    return sol ? sol.steps + (difficulty <= 2 ? 3 : difficulty <= 4 ? 2 : 1) : initialState.toRemove + 3;
  }, [initialState, difficulty]);

  const [state, setState] = useState<EtchState>(() => ({
    ...initialState,
    grid: [...initialState.grid],
    path: [...initialState.path],
  }));
  const [history, setHistory] = useState<EtchState[]>(() => [state]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(state);
  const moves = state.path.length;
  const legal = useMemo(() => new Set(legalMoves(state)), [state]);
  const h = heuristic(state);

  const { width: screenWidth } = useWindowDimensions();
  const gridAreaMax = Math.min(screenWidth - 48 - TARGET_LABEL_W * 2, 340);
  const cellSize = Math.floor(
    (gridAreaMax - (state.size - 1) * GAP) / state.size,
  );
  const gridWidth = state.size * cellSize + (state.size - 1) * GAP;

  /* ─── Animations ─── */
  const cellScales = useRef(
    Array.from({ length: state.size * state.size }, () => new Animated.Value(1)),
  ).current;

  /* ─── Row/col current counts ─── */
  const rowCounts = useMemo(() => {
    const counts: number[] = [];
    for (let r = 0; r < state.size; r++) {
      let c = 0;
      for (let col = 0; col < state.size; col++) {
        if (state.grid[r * state.size + col] === 1) c++;
      }
      counts.push(c);
    }
    return counts;
  }, [state.grid, state.size]);

  const colCounts = useMemo(() => {
    const counts: number[] = [];
    for (let c = 0; c < state.size; c++) {
      let cnt = 0;
      for (let r = 0; r < state.size; r++) {
        if (state.grid[r * state.size + c] === 1) cnt++;
      }
      counts.push(cnt);
    }
    return counts;
  }, [state.grid, state.size]);

  /* ─── Tap handler ─── */
  const handleTap = useCallback(
    (cellIdx: number) => {
      if (solved) return;
      if (!legal.has(cellIdx)) return;

      // Animate
      Animated.sequence([
        Animated.timing(cellScales[cellIdx], {
          toValue: 0.7,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(cellScales[cellIdx], {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const next = applyMove(state, cellIdx as Move);
      setState(next);
      setHistory((h) => [...h, next]);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('etch', next.path.length, par * 2).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, legal, par, gameRecorded, cellScales],
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
    const init = {
      ...initialState,
      grid: [...initialState.grid],
      path: [...initialState.path],
    };
    setState(init);
    setHistory([init]);
  }, [initialState, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('etch');
    setStats(s);
    setShowStats(true);
  }, []);

  /* ─── Share text ─── */
  function buildShareText() {
    const rows: string[] = [];
    for (let r = 0; r < state.size; r++) {
      let row = '';
      for (let c = 0; c < state.size; c++) {
        const i = r * state.size + c;
        if (state.grid[i] === 1) {
          row += '\u2B1C'; // white square = remaining
        } else if (state.path.indexOf(i) >= 0) {
          // Show path order: early = light, late = dark
          const pathPos = state.path.indexOf(i);
          const frac = pathPos / Math.max(1, state.path.length - 1);
          row += frac < 0.33 ? '\uD83D\uDFE8' : frac < 0.66 ? '\uD83D\uDFE7' : '\uD83D\uDFE5';
        } else {
          row += '\u2B1B';
        }
      }
      rows.push(row);
    }
    const under = moves <= par;
    return [
      `Etch Day #${puzzleDay} \uD83E\uDDF1`,
      rows.join('\n'),
      `${moves}/${par} removals`,
      under ? '\u2B50 Under par!' : `Solved in ${moves}`,
    ].join('\n');
  }

  /* ─── Check if game is stuck (no legal moves but not solved) ─── */
  const isStuck = !solved && moves > 0 && moves < state.toRemove && legal.size === 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Etch</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Carve a path to match row & column targets.
      </Text>

      {/* Info */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Removed</Text>
          <Text
            style={[
              styles.infoVal,
              solved && moves <= par && styles.infoGood,
            ]}
          >
            {moves}/{state.toRemove}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Off</Text>
          <Text style={styles.infoVal}>{h}</Text>
        </View>
      </View>

      {/* Column targets (top) */}
      <View style={{ flexDirection: 'row', marginLeft: TARGET_LABEL_W + 4 }}>
        {state.colTargets.map((t, c) => {
          const met = colCounts[c] === t;
          const over = colCounts[c] < t;
          return (
            <View
              key={c}
              style={{
                width: cellSize,
                marginRight: c < state.size - 1 ? GAP : 0,
                alignItems: 'center',
              }}
            >
              <Text
                style={[
                  styles.targetText,
                  met && styles.targetMet,
                  over && styles.targetOver,
                ]}
              >
                {t}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Grid with row targets */}
      <View style={{ flexDirection: 'row' }}>
        {/* Row targets (left) */}
        <View style={{ width: TARGET_LABEL_W, justifyContent: 'flex-start' }}>
          {state.rowTargets.map((t, r) => {
            const met = rowCounts[r] === t;
            const over = rowCounts[r] < t;
            return (
              <View
                key={r}
                style={{
                  height: cellSize,
                  marginBottom: r < state.size - 1 ? GAP : 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={[
                    styles.targetText,
                    met && styles.targetMet,
                    over && styles.targetOver,
                  ]}
                >
                  {t}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Grid */}
        <View style={{ width: gridWidth }}>
          {Array.from({ length: state.size }).map((_, r) => (
            <View
              key={r}
              style={{
                flexDirection: 'row',
                marginBottom: r < state.size - 1 ? GAP : 0,
              }}
            >
              {Array.from({ length: state.size }).map((_, c) => {
                const i = r * state.size + c;
                const isPresent = state.grid[i] === 1;
                const isLegal = legal.has(i);
                const isLast =
                  state.path.length > 0 &&
                  state.path[state.path.length - 1] === i;
                const isOnPath = !isPresent;

                let bg = BLOCK_COLOR;
                let borderColor = '#333';
                let borderWidth = 1;

                if (!isPresent) {
                  bg = BLOCK_REMOVED;
                  borderColor = isLast ? BLOCK_HIGHLIGHT : '#222';
                  borderWidth = isLast ? 2 : 1;
                } else if (isLegal) {
                  bg = BLOCK_LEGAL;
                  borderColor = BLOCK_HIGHLIGHT;
                  borderWidth = 2;
                }

                // Show path order number on removed cells
                const pathIdx = isOnPath ? state.path.indexOf(i) : -1;

                return (
                  <Animated.View
                    key={c}
                    style={{
                      transform: [{ scale: cellScales[i] }],
                      marginRight: c < state.size - 1 ? GAP : 0,
                    }}
                  >
                    <Pressable
                      onPress={() => handleTap(i)}
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: bg,
                          borderColor,
                          borderWidth,
                        },
                      ]}
                    >
                      {isOnPath && pathIdx >= 0 && (
                        <Text style={styles.pathNum}>{pathIdx + 1}</Text>
                      )}
                      {isPresent && isLegal && (
                        <Text style={styles.legalDot}>{'\u00B7'}</Text>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Stuck indicator */}
      {isStuck && (
        <View style={styles.stuckBanner}>
          <Text style={styles.stuckText}>
            Dead end! No adjacent blocks to remove. Undo or reset.
          </Text>
        </View>
      )}

      {/* Controls */}
      {!solved && (
        <View style={styles.btnRow}>
          {history.length > 1 && (
            <Pressable style={styles.undoBtn} onPress={handleUndo}>
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
          )}
          {moves > 0 && (
            <Pressable style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>
          )}
        </View>
      )}

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {moves < par
              ? '\uD83C\uDF1F'
              : moves === par
                ? '\u2B50'
                : '\uD83E\uDDF1'}
          </Text>
          <Text style={styles.endText}>
            {moves < par
              ? `Under par! ${moves} removals`
              : moves === par
                ? `At par! ${moves} removals`
                : `Solved in ${moves} removals`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Remove blocks to make each row and column match its target count.
          {'\n\n'}
          Each removal must be adjacent to the previous one — you carve a
          connected path through the grid. Plan ahead to avoid dead ends!
          {'\n'}
          Par: {par} removals.
        </Text>
      </View>

      {showStats && stats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
    </ScrollView>
  );
}

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
  targetText: {
    color: '#818384',
    fontSize: 14,
    fontWeight: '700',
  },
  targetMet: { color: '#2ecc71' },
  targetOver: { color: '#e74c3c' },
  cell: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathNum: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '700',
  },
  legalDot: {
    color: '#e67e22',
    fontSize: 28,
    fontWeight: '800',
  },
  stuckBanner: {
    marginTop: 10,
    backgroundColor: '#4a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  stuckText: { color: '#e74c3c', fontSize: 13, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
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
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
});
