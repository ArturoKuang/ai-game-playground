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
import {
  SIZE,
  generatePuzzle,
  applyMove,
  isGoal,
  countViolations,
  computePar,
  type SiftState,
  type Move,
} from '../solvers/Sift.solver';

/* ─── Visual constants ─── */
const GAP = 3;

const SHAPE_EMOJIS = ['\u25cf', '\u25a0', '\u25b2', '\u2605', '\u25c6']; // circle, square, triangle, star, diamond
const SHAPE_NAMES = ['Circle', 'Square', 'Triangle', 'Star', 'Diamond'];
const TILE_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6']; // red, blue, green, yellow, purple

/* ─── Selection highlight color ─── */
const SELECTION_COLOR = '#00e5ff';

/* ─── Seed helpers (inline since shared utils may not exist on this branch) ─── */
function getDailySeed(): number {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getPuzzleDay(): number {
  const EPOCH = new Date(2026, 2, 1);
  const now = new Date();
  const diffMs = now.getTime() - EPOCH.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

function getDayDifficulty(): number {
  const day = new Date().getDay();
  if (day === 0 || day === 6) return 3;
  return day;
}

export default function Sift() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  // v2: Par computed via lock-naive solver + buffer
  const par = useMemo(() => {
    return computePar(initialState, difficulty);
  }, [initialState, difficulty]);

  const [state, setState] = useState<SiftState>(() => ({
    ...initialState,
    grid: initialState.grid.map((row) => row.map((t) => ({ ...t }))),
    knownLocks: initialState.knownLocks.map((row) => [...row]),
  }));
  const [selected, setSelected] = useState<[number, number] | null>(null);

  const solved = isGoal(state);
  const violations = countViolations(state.grid);

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  const shakeAnims = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(0)),
  ).current;

  // v3: Lock icon fade-in opacity per cell
  const lockFadeAnims = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(0)),
  ).current;


  const animateBounce = useCallback(
    (key: number) => {
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
    },
    [cellScales],
  );

  const animateShake = useCallback(
    (key: number) => {
      Animated.sequence([
        Animated.timing(shakeAnims[key], { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnims[key], { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnims[key], { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnims[key], { toValue: -4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnims[key], { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    },
    [shakeAnims],
  );

  // v3: Animate lock icon fade-in when a lock is discovered
  const animateLockReveal = useCallback(
    (key: number) => {
      lockFadeAnims[key].setValue(0);
      Animated.timing(lockFadeAnims[key], {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    },
    [lockFadeAnims],
  );


  /* ── Tap handler ── */
  const handleTap = useCallback(
    (r: number, c: number) => {
      if (solved) return;

      // If this position has a known lock, ignore
      if (state.knownLocks[r][c]) return;

      if (selected === null) {
        // First tap: select this tile
        setSelected([r, c]);
        animateBounce(r * SIZE + c);
        return;
      }

      const [r1, c1] = selected;

      // Tapped same tile: deselect
      if (r1 === r && c1 === c) {
        setSelected(null);
        return;
      }

      // If tapped position has known lock, ignore
      if (state.knownLocks[r][c]) {
        setSelected(null);
        return;
      }

      // v3: Block identical-tile swaps (same color + same shape) — no move cost, just shake
      const t1 = state.grid[r1][c1];
      const t2 = state.grid[r][c];
      if (t1.shape === t2.shape && t1.color === t2.color) {
        animateShake(r1 * SIZE + c1);
        animateShake(r * SIZE + c);
        setSelected(null);
        return;
      }


      // Attempt swap
      const move: Move = { r1, c1, r2: r, c2: c };
      const nextState = applyMove(state, move);

      // Check if swap failed (lock revealed)
      const wasFailed = state.locks[r1][c1] || state.locks[r][c];

      if (wasFailed) {
        // v3: Non-blocking lock reveal — shake + padlock fade-in, NO toast
        if (state.locks[r1][c1]) {
          animateShake(r1 * SIZE + c1);
          animateLockReveal(r1 * SIZE + c1);
        }
        if (state.locks[r][c]) {
          animateShake(r * SIZE + c);
          animateLockReveal(r * SIZE + c);
        }
      } else {
        animateBounce(r1 * SIZE + c1);
        animateBounce(r * SIZE + c);
      }

      setState(nextState);
      setSelected(null);
    },
    [state, selected, solved, animateBounce, animateShake, animateLockReveal],
  );

  /* ── Check row/col violations for highlighting ── */
  function getCellViolations(r: number, c: number): { shapeViolation: boolean; colorViolation: boolean } {
    const tile = state.grid[r][c];
    let shapeViolation = false;
    let colorViolation = false;

    for (let cc = 0; cc < SIZE; cc++) {
      if (cc === c) continue;
      if (state.grid[r][cc].shape === tile.shape) shapeViolation = true;
      if (state.grid[r][cc].color === tile.color) colorViolation = true;
    }
    for (let rr = 0; rr < SIZE; rr++) {
      if (rr === r) continue;
      if (state.grid[rr][c].shape === tile.shape) shapeViolation = true;
      if (state.grid[rr][c].color === tile.color) colorViolation = true;
    }
    return { shapeViolation, colorViolation };
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sift</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
      </View>

      <Text style={styles.subtitle}>
        Swap tiles so no shape or color repeats in any row or column.{'\n'}
        Some positions are locked — failed swaps reveal locks!
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Moves</Text>
          <Text
            style={[
              styles.infoVal,
              solved && state.moves <= par && styles.infoGood,
            ]}
          >
            {state.moves}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Conflicts</Text>
          <Text style={styles.infoVal}>{violations}</Text>
        </View>
      </View>

      {/* v3: Removed the blocking feedbackBar/toast entirely.
          Lock discovery is communicated via inline padlock icon fade-in + cell shake. */}

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth, height: gridWidth }]}>
        {Array.from({ length: SIZE }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }).map((_, c) => {
              const key = r * SIZE + c;
              const tile = state.grid[r][c];
              const isSelected =
                selected !== null && selected[0] === r && selected[1] === c;
              const isKnownLock = state.knownLocks[r][c];
              const { shapeViolation, colorViolation } = getCellViolations(r, c);
              const hasViolation = shapeViolation || colorViolation;

              const bg = TILE_COLORS[tile.color];
              // v2: Much more visible selection indicator — thick cyan border
              let borderColor = '#333';
              let borderWidth = 1;
              if (isKnownLock) {
                borderColor = '#c0392b';
                borderWidth = 3;
              } else if (isSelected) {
                borderColor = SELECTION_COLOR;
                borderWidth = 4;
              } else if (hasViolation && !solved) {
                borderColor = '#e74c3c55';
                borderWidth = 2;
              }

              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [
                      { scale: cellScales[key] },
                      { translateX: shakeAnims[key] },
                    ],
                  }}
                >
                  {/* v2: Use onPress (Pressable) which handles both touch AND mouse clicks */}
                  <Pressable
                    onPress={() => handleTap(r, c)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: isKnownLock ? '#1a1a1a' : bg,
                        borderColor,
                        borderWidth,
                        opacity: isKnownLock ? 0.5 : 1,
                      },
                      // v2: Add shadow glow for selected tile
                      isSelected && styles.cellSelected,
                    ]}
                  >
                    {isKnownLock ? (
                      // v3: Padlock with fade-in animation (non-blocking lock reveal)
                      <Animated.Text style={[styles.lockIcon, { opacity: lockFadeAnims[key] }]}>
                        {'\ud83d\udd12'}
                      </Animated.Text>
                    ) : (
                      <Text style={styles.shapeEmoji}>
                        {SHAPE_EMOJIS[tile.shape]}
                      </Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          {SHAPE_EMOJIS.map((emoji, i) => (
            <View key={`shape-${i}`} style={styles.legendItem}>
              <Text style={styles.legendEmoji}>{emoji}</Text>
              <Text style={styles.legendText}>{SHAPE_NAMES[i]}</Text>
            </View>
          ))}
        </View>
        <View style={styles.legendRow}>
          {TILE_COLORS.map((color, i) => (
            <View key={`color-${i}`} style={styles.legendItem}>
              <View
                style={[styles.legendSwatch, { backgroundColor: color }]}
              />
              <Text style={styles.legendText}>
                {['Red', 'Blue', 'Green', 'Yellow', 'Purple'][i]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {state.moves < par
              ? '\ud83c\udf1f'
              : state.moves === par
                ? '\u2b50'
                : '\ud83d\udd0d'}
          </Text>
          <Text style={styles.endText}>
            {state.moves < par
              ? `Under par! ${state.moves} moves`
              : state.moves === par
                ? `At par! ${state.moves} moves`
                : `Solved in ${state.moves} moves`}
          </Text>
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap two tiles to swap them. Each row and column must have all 5 shapes
          and all 5 colors — no repeats!{'\n\n'}
          Some positions are secretly locked. Attempting to swap a locked tile
          costs a move but reveals the lock. Plan your swaps carefully!{'\n'}
          Par: {par} moves.
        </Text>
      </View>
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
  subtitle: {
    fontSize: 13,
    color: '#818384',
    marginTop: 2,
    marginBottom: 10,
    textAlign: 'center',
    maxWidth: 320,
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
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // v2: Glow effect for selected tile (visible on web via shadow)
  cellSelected: {
    shadowColor: SELECTION_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  shapeEmoji: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  lockIcon: {
    fontSize: 20,
  },
  legend: {
    marginTop: 12,
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendEmoji: {
    fontSize: 12,
    color: '#ffffff',
  },
  legendText: {
    fontSize: 10,
    color: '#818384',
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
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
