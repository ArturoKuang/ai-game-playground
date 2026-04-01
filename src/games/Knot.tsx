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
  type KnotState,
  type Move,
} from '../solvers/Knot.solver';

/* ─── Constants ─── */
const GAP = 2;
const ENTRY_COLOR = '#3498db'; // blue for entry wall
const EXIT_COLOR = '#f1c40f';  // gold for exit wall


export default function Knot() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );
  const par = useMemo(() => {
    const sol = solve(initialState, 5);
    return sol ? sol.steps + (difficulty <= 2 ? 3 : difficulty <= 4 ? 2 : 1) : initialState.par;
  }, [initialState, difficulty]);

  const [state, setState] = useState<KnotState>(() => ({
    ...initialState,
    path: [],
    closed: false,
    marked: initialState.marked.map((m) => ({
      ...m,
      satisfied: false,
    })),
  }));
  const [history, setHistory] = useState<KnotState[]>(() => [state]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(state);
  const moves = state.path.length;
  const legal = useMemo(() => new Set(legalMoves(state)), [state]);
  const pathSet = useMemo(() => new Set(state.path), [state.path]);
  const h = heuristic(state);

  const { width: screenWidth } = useWindowDimensions();
  const gridAreaMax = Math.min(screenWidth - 48, 360);
  const cellSize = Math.floor(
    (gridAreaMax - (state.size - 1) * GAP) / state.size,
  );
  const gridWidth = state.size * cellSize + (state.size - 1) * GAP;

  /* ─── Animations ─── */
  const cellScales = useRef(
    Array.from({ length: state.size * state.size }, () => new Animated.Value(1)),
  ).current;

  /* ─── Count visited marked cells ─── */
  const visitedMarked = useMemo(() => {
    return state.marked.filter((m) => pathSet.has(m.idx)).length;
  }, [state.marked, pathSet]);

  /* ─── Tap handler ─── */
  const handleTap = useCallback(
    (cellIdx: number) => {
      if (solved) return;
      if (!legal.has(cellIdx)) return;

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

      const next = applyMove(state, cellIdx as Move);
      setState(next);
      setHistory((h) => [...h, next]);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('knot', next.path.length, par * 2).then((s) => {
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
    // Full reset wipes ALL discovered constraints (except constraintMemory count).
    // This prevents the probe-all-then-plan exploit.
    const memory = initialState.constraintMemory;
    // Collect indices of constraints that were discovered during play (not pre-revealed)
    const discoveredDuringPlay = state.marked
      .map((m, i) => ({ ...m, originalIdx: i }))
      .filter((m) => m.revealed && !initialState.marked[m.originalIdx].revealed);
    // Keep at most `memory` of the discovered constraints (first ones found)
    const keepSet = new Set(
      discoveredDuringPlay.slice(0, memory).map((m) => m.originalIdx),
    );

    const init: KnotState = {
      ...initialState,
      path: [],
      closed: false,
      marked: initialState.marked.map((m, i) => ({
        ...m,
        // Pre-revealed stay revealed; others only if in keepSet
        revealed: m.revealed || keepSet.has(i),
        satisfied: false,
      })),
    };
    setState(init);
    setHistory([init]);
  }, [initialState, state.marked, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('knot');
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
        if (i === state.startCell) {
          row += '\uD83D\uDFE2'; // green = start
        } else if (state.markedSet.includes(i) && pathSet.has(i)) {
          row += '\uD83D\uDFE1'; // yellow = marked + visited
        } else if (pathSet.has(i)) {
          row += '\uD83D\uDFE6'; // blue = path
        } else {
          row += '\u2B1B'; // black = empty
        }
      }
      rows.push(row);
    }
    const under = moves <= par;
    return [
      `Knot Day #${puzzleDay} \uD83E\uDDF6`,
      rows.join('\n'),
      `${moves} segments, ${visitedMarked}/${state.marked.length} cells`,
      under ? '\u2B50 Under par!' : `Solved in ${moves}`,
    ].join('\n');
  }

  /* ─── Check if stuck ─── */
  const isStuck = !solved && moves > 0 && legal.size === 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Knot</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Draw a loop through all marked cells. Constraints reveal on arrival.
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Segments</Text>
          <Text
            style={[
              styles.infoVal,
              solved && moves <= par && styles.infoGood,
            ]}
          >
            {moves}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Cells</Text>
          <Text style={styles.infoVal}>
            {visitedMarked}/{state.marked.length}
          </Text>
        </View>
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
              const isStart = i === state.startCell;
              const isOnPath = pathSet.has(i);
              const isLegal = legal.has(i);
              const isLast = moves > 0 && state.path[moves - 1] === i;

              // Check if marked
              const markedInfo = state.marked.find((m) => m.idx === i);
              const isMarked = !!markedInfo;
              const isRevealed = markedInfo?.revealed ?? false;
              const isSatisfied = markedInfo?.satisfied ?? false;

              let bg = '#1a1a1c';
              // Per-side border colors and widths for constraint display
              let bTop = '#333', bRight = '#333', bBottom = '#333', bLeft = '#333';
              let bwTop = 1, bwRight = 1, bwBottom = 1, bwLeft = 1;

              if (isStart && !isOnPath) {
                bg = '#1a4a1a';
                bTop = bRight = bBottom = bLeft = '#2ecc71';
                bwTop = bwRight = bwBottom = bwLeft = 2;
              } else if (isOnPath) {
                const pathIdx = state.path.indexOf(i);
                const frac = pathIdx / Math.max(1, state.path.length - 1);
                bg = frac < 0.5 ? '#1a3d5c' : '#3d1a1a';
                const baseColor = isLast ? '#f1c40f' : '#555';
                const baseWidth = isLast ? 3 : 1;
                bTop = bRight = bBottom = bLeft = baseColor;
                bwTop = bwRight = bwBottom = bwLeft = baseWidth;
                if (isMarked && isRevealed) {
                  // Satisfied/violated overall glow
                  const statusColor = isSatisfied ? '#2ecc71' : '#e74c3c';
                  bTop = bRight = bBottom = bLeft = statusColor;
                  bwTop = bwRight = bwBottom = bwLeft = 2;
                  // Overlay entry (blue) and exit (gold) on specific walls
                  const enterDir = markedInfo!.constraint.enter;
                  const exitDir = markedInfo!.constraint.exit;
                  // Entry wall = blue
                  if (enterDir === 0) { bwTop = 4; bTop = ENTRY_COLOR; }
                  if (enterDir === 1) { bwRight = 4; bRight = ENTRY_COLOR; }
                  if (enterDir === 2) { bwBottom = 4; bBottom = ENTRY_COLOR; }
                  if (enterDir === 3) { bwLeft = 4; bLeft = ENTRY_COLOR; }
                  // Exit wall = gold
                  if (exitDir === 0) { bwTop = 4; bTop = EXIT_COLOR; }
                  if (exitDir === 1) { bwRight = 4; bRight = EXIT_COLOR; }
                  if (exitDir === 2) { bwBottom = 4; bBottom = EXIT_COLOR; }
                  if (exitDir === 3) { bwLeft = 4; bLeft = EXIT_COLOR; }
                }
              } else if (isMarked) {
                bg = '#2c2c3e';
                if (isRevealed) {
                  // Show entry/exit borders on revealed but unvisited marked cells
                  const enterDir = markedInfo!.constraint.enter;
                  const exitDir = markedInfo!.constraint.exit;
                  bTop = bRight = bBottom = bLeft = '#555';
                  bwTop = bwRight = bwBottom = bwLeft = 1;
                  if (enterDir === 0) { bwTop = 4; bTop = ENTRY_COLOR; }
                  if (enterDir === 1) { bwRight = 4; bRight = ENTRY_COLOR; }
                  if (enterDir === 2) { bwBottom = 4; bBottom = ENTRY_COLOR; }
                  if (enterDir === 3) { bwLeft = 4; bLeft = ENTRY_COLOR; }
                  if (exitDir === 0) { bwTop = 4; bTop = EXIT_COLOR; }
                  if (exitDir === 1) { bwRight = 4; bRight = EXIT_COLOR; }
                  if (exitDir === 2) { bwBottom = 4; bBottom = EXIT_COLOR; }
                  if (exitDir === 3) { bwLeft = 4; bLeft = EXIT_COLOR; }
                } else {
                  bTop = bRight = bBottom = bLeft = '#6c5ce7';
                  bwTop = bwRight = bwBottom = bwLeft = 2;
                }
              } else if (isLegal) {
                bg = 'rgba(52,152,219,0.2)';
                bTop = bRight = bBottom = bLeft = '#3498db';
                bwTop = bwRight = bwBottom = bwLeft = 2;
              }

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
                        borderTopColor: bTop,
                        borderRightColor: bRight,
                        borderBottomColor: bBottom,
                        borderLeftColor: bLeft,
                        borderTopWidth: bwTop,
                        borderRightWidth: bwRight,
                        borderBottomWidth: bwBottom,
                        borderLeftWidth: bwLeft,
                      },
                    ]}
                  >
                    {isStart && (
                      <Text style={styles.startDot}>{'\u25C9'}</Text>
                    )}
                    {isMarked && !isOnPath && !isRevealed && (
                      <Text style={styles.markedDot}>{'\u25CF'}</Text>
                    )}
                    {isMarked && isRevealed && !isOnPath && (
                      <Text style={styles.constraintHint}>{'\u25CB'}</Text>
                    )}
                    {isOnPath && isMarked && isRevealed && (
                      <Text style={[
                        styles.constraintStatus,
                        { color: isSatisfied ? '#2ecc71' : '#e74c3c' },
                      ]}>
                        {isSatisfied ? '\u2713' : '\u2717'}
                      </Text>
                    )}
                    {isOnPath && !isMarked && !isStart && (
                      <Text style={styles.pathNum}>
                        {state.path.indexOf(i) + 1}
                      </Text>
                    )}
                    {isLegal && !isOnPath && !isMarked && !isStart && (
                      <Text style={styles.legalDot}>{'\u00B7'}</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Stuck indicator */}
      {isStuck && (
        <View style={styles.stuckBanner}>
          <Text style={styles.stuckText}>
            Dead end! No moves available. Undo or reset.
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
                : '\uD83E\uDDF6'}
          </Text>
          <Text style={styles.endText}>
            {moves < par
              ? `Under par! ${moves} segments`
              : moves === par
                ? `At par! ${moves} segments`
                : `Solved in ${moves} segments`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Draw a closed loop that passes through every marked cell (purple dots).
          {'\n\n'}
          Each marked cell has a hidden directional constraint revealed when your
          loop reaches it. Blue border = entry wall, gold border = exit wall.
          Match both to satisfy the constraint (green check). If violated, the cell
          shows a red X — undo and reroute!
          {'\n\n'}
          Undo preserves discovered constraints, but full reset clears them all.
          {'\n\n'}
          The loop must close back at the green start cell. Par: {par} segments.
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
  cell: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startDot: {
    color: '#2ecc71',
    fontSize: 18,
    fontWeight: '800',
  },
  markedDot: {
    color: '#6c5ce7',
    fontSize: 16,
    fontWeight: '800',
  },
  constraintHint: {
    color: '#9b59b6',
    fontSize: 14,
    fontWeight: '700',
  },
  constraintStatus: {
    fontSize: 16,
    fontWeight: '800',
  },
  pathNum: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '700',
  },
  legalDot: {
    color: '#3498db',
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
