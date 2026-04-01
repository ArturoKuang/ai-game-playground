import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Animated,
} from 'react-native';
import {
  generatePuzzle,
  applyMoveWithInfo,
  isGoal,
  heuristic,
  solve,
  DIRECTIONS,
  type HerdState,
  type Move,
  type Direction,
} from '../solvers/Herd.solver';

/* ─── Constants ─── */
const ANIMAL_EMOJI: string[] = ['\uD83E\uDD8A', '\uD83D\uDC26', '\uD83D\uDC38', '\uD83D\uDC3B'];
const COLOR_NAMES = ['Red', 'Blue', 'Green', 'Brown'];
const COLOR_VALUES = ['#e74c3c', '#3498db', '#2ecc71', '#8d6e63'];
const PEN_BG = ['rgba(231,76,60,0.15)', 'rgba(52,152,219,0.15)', 'rgba(46,204,113,0.15)', 'rgba(141,110,99,0.15)'];
const PEN_BORDER = ['rgba(231,76,60,0.5)', 'rgba(52,152,219,0.5)', 'rgba(46,204,113,0.5)', 'rgba(141,110,99,0.5)'];
const GAP = 2;

/* ─── Seed utilities (self-contained) ─── */
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

/* ─── Herd Game Component ─── */
export default function Herd() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );
  const par = useMemo(() => {
    const sol = solve(initialState, 5);
    return sol ? sol.steps : 10;
  }, [initialState]);

  const [state, setState] = useState<HerdState>(() => ({
    ...initialState,
    animals: initialState.animals.map((a) => ({ ...a, pos: { ...a.pos } })),
  }));
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<{ state: HerdState; moveCount: number }[]>([]);
  const [solved, setSolved] = useState(false);
  const [selectedColor, setSelectedColor] = useState<number>(0);

  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = Math.min(screenWidth - 32, 360);
  const cellSize = Math.floor((containerWidth - GAP * (state.gridSize - 1)) / state.gridSize);

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: state.gridSize * state.gridSize }, () => new Animated.Value(1)),
  ).current;

  // Shake animation for no-op moves
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const bounceCell = useCallback(
    (r: number, c: number) => {
      const idx = r * state.gridSize + c;
      if (cellScales[idx]) {
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
      }
    },
    [cellScales, state.gridSize],
  );

  const shakeGrid = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  /* ── Move handler ── */
  const handleMove = useCallback(
    (dir: Direction) => {
      if (solved) return;
      const move: Move = { color: selectedColor, dir };
      const { state: next, moved } = applyMoveWithInfo(state, move);

      // If no animal moved, shake and don't increment counter
      if (!moved) {
        shakeGrid();
        return;
      }

      // Bounce moved animals
      for (const animal of next.animals) {
        if (animal.color === selectedColor) {
          bounceCell(animal.pos.r, animal.pos.c);
        }
      }

      const nextMoves = moves + 1;
      setHistory((h) => [...h, { state, moveCount: moves }]);
      setState(next);
      setMoves(nextMoves);

      if (isGoal(next)) {
        setSolved(true);
      }
    },
    [state, solved, moves, selectedColor, bounceCell, shakeGrid],
  );

  /* ── Undo (fully reverses state INCLUDING move counter) ── */
  const handleUndo = useCallback(() => {
    if (history.length === 0 || solved) return;
    const prev = history[history.length - 1];
    setState(prev.state);
    setMoves(prev.moveCount);
    setHistory((h) => h.slice(0, -1));
    setSolved(false);
  }, [history, solved]);

  /* ── Build grid ── */
  const h = heuristic(state);
  const colors = useMemo(() => {
    const cs = new Set<number>();
    for (const a of state.animals) cs.add(a.color);
    return Array.from(cs).sort();
  }, [state.animals]);

  // Build occupancy map: position -> animal
  const animalMap = new Map<string, { color: number; idx: number; locked: boolean }>();
  state.animals.forEach((a, idx) => {
    animalMap.set(`${a.pos.r},${a.pos.c}`, { color: a.color, idx, locked: !!a.locked });
  });

  // Build pen map: position -> pen color
  const penMap = new Map<string, number>();
  state.pens.forEach((p) => {
    penMap.set(`${p.pos.r},${p.pos.c}`, p.color);
  });

  // Check if selected color still has unlocked animals
  const hasUnlocked = state.animals.some((a) => a.color === selectedColor && !a.locked);
  // Auto-switch to first color with unlocked animals if needed
  const activeColor = hasUnlocked
    ? selectedColor
    : colors.find((c) => state.animals.some((a) => a.color === c && !a.locked)) ?? selectedColor;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Herd</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
      </View>
      <Text style={styles.subtitle}>
        Move animals to their matching pens. All same-color move together.
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Moves</Text>
          <Text style={[styles.infoVal, solved && moves <= par && styles.infoGood]}>
            {moves}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Distance</Text>
          <Text style={styles.infoVal}>{h}</Text>
        </View>
      </View>

      {/* Grid with shake animation */}
      <Animated.View
        style={[
          styles.gridContainer,
          { width: containerWidth, transform: [{ translateX: shakeAnim }] },
        ]}
      >
        {Array.from({ length: state.gridSize }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: state.gridSize }, (_, c) => {
              const key = `${r},${c}`;
              const animal = animalMap.get(key);
              const penColor = penMap.get(key);
              const idx = r * state.gridSize + c;

              return (
                <Animated.View
                  key={`${r}-${c}`}
                  style={{
                    transform: [{ scale: cellScales[idx] }],
                  }}
                >
                  <View
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                      },
                      penColor !== undefined && {
                        backgroundColor: PEN_BG[penColor],
                        borderColor: PEN_BORDER[penColor],
                        borderWidth: 2,
                      },
                    ]}
                  >
                    {/* Pen marker (show when no animal or animal of different color) */}
                    {penColor !== undefined && (!animal || animal.color !== penColor) && (
                      <Text style={[styles.penMarker, { color: COLOR_VALUES[penColor] }]}>
                        {ANIMAL_EMOJI[penColor]}
                      </Text>
                    )}
                    {/* Animal */}
                    {animal && (
                      <View style={styles.animalContainer}>
                        <Text style={[styles.animalEmoji, animal.locked && styles.animalLocked]}>
                          {ANIMAL_EMOJI[animal.color]}
                        </Text>
                        {/* Lock indicator when animal is on its pen */}
                        {animal.locked && (
                          <Text style={styles.lockBadge}>{'\u2705'}</Text>
                        )}
                      </View>
                    )}
                  </View>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* Controls: color selector + direction pad (ABOVE the fold) */}
      {!solved && (
        <View style={styles.controlsArea}>
          {/* Color selector tabs */}
          <View style={styles.colorTabs}>
            {colors.map((color) => {
              const colorUnlocked = state.animals.some((a) => a.color === color && !a.locked);
              const isActive = color === activeColor;
              return (
                <Pressable
                  key={color}
                  style={[
                    styles.colorTab,
                    {
                      borderColor: COLOR_VALUES[color],
                      backgroundColor: isActive ? COLOR_VALUES[color] + '33' : 'transparent',
                      opacity: colorUnlocked ? 1 : 0.3,
                    },
                  ]}
                  onPress={() => colorUnlocked && setSelectedColor(color)}
                  disabled={!colorUnlocked}
                >
                  <Text style={styles.colorTabEmoji}>{ANIMAL_EMOJI[color]}</Text>
                  <Text style={[styles.colorTabLabel, { color: COLOR_VALUES[color] }]}>
                    {COLOR_NAMES[color]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* D-pad style direction controls */}
          <View style={styles.dpad}>
            <View style={styles.dpadRow}>
              <View style={styles.dpadSpacer} />
              <Pressable
                style={[styles.dpadBtn, { borderColor: COLOR_VALUES[activeColor] }]}
                onPress={() => handleMove('N')}
              >
                <Text style={styles.dpadBtnText}>{'\u2191'}</Text>
              </Pressable>
              <View style={styles.dpadSpacer} />
            </View>
            <View style={styles.dpadRow}>
              <Pressable
                style={[styles.dpadBtn, { borderColor: COLOR_VALUES[activeColor] }]}
                onPress={() => handleMove('W')}
              >
                <Text style={styles.dpadBtnText}>{'\u2190'}</Text>
              </Pressable>
              <View style={styles.dpadCenter}>
                <Text style={styles.dpadCenterEmoji}>{ANIMAL_EMOJI[activeColor]}</Text>
              </View>
              <Pressable
                style={[styles.dpadBtn, { borderColor: COLOR_VALUES[activeColor] }]}
                onPress={() => handleMove('E')}
              >
                <Text style={styles.dpadBtnText}>{'\u2192'}</Text>
              </Pressable>
            </View>
            <View style={styles.dpadRow}>
              <View style={styles.dpadSpacer} />
              <Pressable
                style={[styles.dpadBtn, { borderColor: COLOR_VALUES[activeColor] }]}
                onPress={() => handleMove('S')}
              >
                <Text style={styles.dpadBtnText}>{'\u2193'}</Text>
              </Pressable>
              <View style={styles.dpadSpacer} />
            </View>
          </View>

          {/* Undo button */}
          {history.length > 0 && (
            <Pressable style={styles.undoBtn} onPress={handleUndo}>
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Win message */}
      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {moves < par ? '\uD83C\uDF1F' : moves === par ? '\u2B50' : '\uD83D\uDC3E'}
          </Text>
          <Text style={styles.endText}>
            {moves < par
              ? `Under par! ${moves} moves`
              : moves === par
                ? `At par! ${moves} moves`
                : `Solved in ${moves} moves (par: ${par})`}
          </Text>
        </View>
      )}

      {/* How to play */}
      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Each colored animal must reach its matching colored pen.{'\n'}
          Select a color, then tap a direction to move ALL of that color.{'\n'}
          Animals lock in place when they reach their pen.{'\n'}
          Blocked animals don't move. Solve in {par} moves or fewer for par.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#121213',
    paddingVertical: 12,
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
    marginBottom: 6,
    textAlign: 'center',
    maxWidth: 300,
  },
  infoBar: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 6,
    alignItems: 'center',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 11, marginBottom: 2 },
  infoVal: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  infoGood: { color: '#2ecc71' },
  infoPar: { color: '#818384', fontSize: 22, fontWeight: '800' },
  gridContainer: {
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  cell: {
    borderRadius: 8,
    backgroundColor: '#1a1a1b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  penMarker: {
    fontSize: 18,
    opacity: 0.35,
  },
  animalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  animalEmoji: {
    fontSize: 26,
  },
  animalLocked: {
    opacity: 0.85,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -4,
    right: -6,
    fontSize: 10,
  },
  /* ── Controls area ── */
  controlsArea: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  colorTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  colorTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
  },
  colorTabEmoji: { fontSize: 16 },
  colorTabLabel: { fontSize: 12, fontWeight: '700' },
  /* ── D-pad ── */
  dpad: {
    alignItems: 'center',
    gap: 2,
  },
  dpadRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dpadBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1a1a1b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  dpadBtnText: { color: '#ffffff', fontSize: 22, fontWeight: '700' },
  dpadSpacer: { width: 44, height: 44 },
  dpadCenter: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2a2a2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dpadCenterEmoji: { fontSize: 20 },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  undoText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  endMsg: { alignItems: 'center', marginTop: 16 },
  endEmoji: { fontSize: 48 },
  endText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  howTo: { marginTop: 16, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
});
