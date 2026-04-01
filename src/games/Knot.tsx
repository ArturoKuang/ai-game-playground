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

/**
 * Fix 2: Arrow position helper.
 * Places the arrow indicator at the edge of the cell corresponding to the direction.
 * Dir: 0=up, 1=right, 2=down, 3=left
 */
function getArrowPosition(dir: number, cellSize: number, arrowSize: number): any {
  const offset = -1; // slightly inside the cell edge
  switch (dir) {
    case 0: // top
      return { top: offset, left: (cellSize - arrowSize) / 2 - 1 };
    case 1: // right
      return { right: offset, top: (cellSize - arrowSize) / 2 - 1 };
    case 2: // bottom
      return { bottom: offset, left: (cellSize - arrowSize) / 2 - 1 };
    case 3: // left
      return { left: offset, top: (cellSize - arrowSize) / 2 - 1 };
    default:
      return {};
  }
}

/**
 * Fix 2: Arrow rotation helper.
 * Entry arrows point INTO the cell, exit arrows point OUT of the cell.
 * Base triangle points up (border-bottom trick). Rotate to point in the correct direction.
 * Dir: 0=up, 1=right, 2=down, 3=left
 * isEntry: true = arrow points into cell, false = arrow points out of cell
 */
function getArrowRotation(dir: number, isEntry: boolean): any {
  // For entry: arrow should point INTO the cell from that side
  // For exit: arrow should point OUT of the cell toward that side
  // Base triangle points UP (toward top of screen)
  // Entry from top: arrow points down (into cell) = rotate 180
  // Entry from right: arrow points left (into cell) = rotate 270
  // Entry from bottom: arrow points up (into cell) = rotate 0
  // Entry from left: arrow points right (into cell) = rotate 90
  // Exit toward top: arrow points up (out of cell) = rotate 0
  // Exit toward right: arrow points right (out of cell) = rotate 90
  // Exit toward bottom: arrow points down (out of cell) = rotate 180
  // Exit toward left: arrow points left (out of cell) = rotate 270
  let rotation: number;
  if (isEntry) {
    // "Enter from dir X" means the path comes FROM direction X into the cell
    // Arrow should point INWARD from that side
    switch (dir) {
      case 0: rotation = 180; break; // from top -> arrow points down
      case 1: rotation = 270; break; // from right -> arrow points left
      case 2: rotation = 0; break;   // from bottom -> arrow points up
      case 3: rotation = 90; break;  // from left -> arrow points right
      default: rotation = 0;
    }
  } else {
    // "Exit toward dir X" means the path leaves toward direction X
    // Arrow should point OUTWARD toward that side
    switch (dir) {
      case 0: rotation = 0; break;   // toward top -> arrow points up
      case 1: rotation = 90; break;  // toward right -> arrow points right
      case 2: rotation = 180; break; // toward bottom -> arrow points down
      case 3: rotation = 270; break; // toward left -> arrow points left
      default: rotation = 0;
    }
  }
  return { transform: [{ rotate: `${rotation}deg` }] };
}


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

  // Segment extension pulse: each cell gets an opacity-based pulse when added to path
  const segmentPulse = useRef(
    Array.from({ length: state.size * state.size }, () => new Animated.Value(0)),
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

      // Cell scale animation (tap feedback)
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

      // Fix 4: Segment extension pulse animation (overshoot-and-settle)
      segmentPulse[cellIdx].setValue(0);
      Animated.sequence([
        Animated.timing(segmentPulse[cellIdx], {
          toValue: 1.3, // overshoot
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(segmentPulse[cellIdx], {
          toValue: 1, // settle
          friction: 4,
          tension: 180,
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
    [state, solved, legal, par, gameRecorded, cellScales, segmentPulse],
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
              let borderColor = '#333';
              let borderWidth = 1;

              if (isStart && !isOnPath) {
                bg = '#1a4a1a';
                borderColor = '#2ecc71';
                borderWidth = 2;
              } else if (isOnPath) {
                const pathIdx = state.path.indexOf(i);
                const frac = pathIdx / Math.max(1, state.path.length - 1);
                bg = frac < 0.5 ? '#1a3d5c' : '#3d1a1a';
                borderColor = isLast ? '#f1c40f' : '#555';
                borderWidth = isLast ? 3 : 1;
                if (isMarked && isRevealed) {
                  borderColor = isSatisfied ? '#2ecc71' : '#e74c3c';
                  borderWidth = 2;
                }
              } else if (isMarked) {
                bg = '#2c2c3e';
                if (isRevealed) {
                  borderColor = '#555';
                  borderWidth = 1;
                } else {
                  borderColor = '#6c5ce7';
                  borderWidth = 2;
                }
              } else if (isLegal) {
                bg = 'rgba(52,152,219,0.2)';
                borderColor = '#3498db';
                borderWidth = 2;
              }

              // Fix 2: Arrow constraint indicators
              // Entry arrow: points INTO the cell (blue)
              // Exit arrow: points OUT of the cell (gold)
              const showConstraintArrows = isMarked && isRevealed;
              const enterDir = markedInfo?.constraint.enter;
              const exitDir = markedInfo?.constraint.exit;

              // Arrow size relative to cell
              const arrowSize = Math.max(6, Math.floor(cellSize * 0.22));

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
                    // Fix 1: Ensure mouse clicks work on web
                    {...(Platform.OS === 'web' ? {
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
                          cursor: (isLegal || isStart) ? 'pointer' : 'default',
                          // Ensure pointer events work through Animated.View
                          userSelect: 'none',
                        } as any,
                      ],
                    } : {
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
                    {/* Fix 4: Segment extension pulse glow */}
                    {isOnPath && (
                      <Animated.View
                        style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: 'rgba(52,152,219,0.25)',
                          borderRadius: 4,
                          opacity: segmentPulse[i].interpolate({
                            inputRange: [0, 1, 1.3],
                            outputRange: [0, 0, 0.6],
                            extrapolate: 'clamp',
                          }),
                          transform: [{
                            scale: segmentPulse[i].interpolate({
                              inputRange: [0, 1, 1.3],
                              outputRange: [0.8, 1, 1.15],
                              extrapolate: 'clamp',
                            }),
                          }],
                        }}
                      />
                    )}

                    {/* Fix 2: Constraint arrow indicators */}
                    {showConstraintArrows && enterDir !== undefined && (
                      <View
                        style={[
                          styles.arrowIndicator,
                          getArrowPosition(enterDir, cellSize, arrowSize),
                        ]}
                      >
                        <View style={[
                          styles.arrowTriangle,
                          getArrowRotation(enterDir, true),
                          {
                            borderBottomColor: ENTRY_COLOR,
                            borderLeftWidth: arrowSize / 2,
                            borderRightWidth: arrowSize / 2,
                            borderBottomWidth: arrowSize,
                          },
                        ]} />
                      </View>
                    )}
                    {showConstraintArrows && exitDir !== undefined && (
                      <View
                        style={[
                          styles.arrowIndicator,
                          getArrowPosition(exitDir, cellSize, arrowSize),
                        ]}
                      >
                        <View style={[
                          styles.arrowTriangle,
                          getArrowRotation(exitDir, false),
                          {
                            borderBottomColor: EXIT_COLOR,
                            borderLeftWidth: arrowSize / 2,
                            borderRightWidth: arrowSize / 2,
                            borderBottomWidth: arrowSize,
                          },
                        ]} />
                      </View>
                    )}

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
          loop reaches it. Blue arrow = entry direction (points into cell), gold
          arrow = exit direction (points out of cell). Match both to satisfy the
          constraint (green check). If violated, the cell shows a red X — undo and
          reroute!
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
    overflow: 'visible',
    position: 'relative',
  },
  arrowIndicator: {
    position: 'absolute',
    zIndex: 10,
  },
  arrowTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopWidth: 0,
    borderTopColor: 'transparent',
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
