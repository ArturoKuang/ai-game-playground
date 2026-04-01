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
  generatePuzzle,
  applyMove,
  isGoal,
  heuristic,
  legalMoves,
  solve,
  DIRECTIONS,
  DIR_NAMES,
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
  const [history, setHistory] = useState<HerdState[]>([]);
  const [solved, setSolved] = useState(false);

  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = Math.min(screenWidth - 32, 360);
  const cellSize = Math.floor((containerWidth - GAP * (state.gridSize - 1)) / state.gridSize);

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: state.gridSize * state.gridSize }, () => new Animated.Value(1)),
  ).current;

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

  /* ── Move handler ── */
  const handleMove = useCallback(
    (color: number, dir: Direction) => {
      if (solved) return;
      const move: Move = { color, dir };
      const next = applyMove(state, move);

      // Bounce moved animals
      for (const animal of next.animals) {
        if (animal.color === color) {
          bounceCell(animal.pos.r, animal.pos.c);
        }
      }

      const nextMoves = moves + 1;
      setHistory((h) => [...h, state]);
      setState(next);
      setMoves(nextMoves);

      if (isGoal(next)) {
        setSolved(true);
      }
    },
    [state, solved, moves, bounceCell],
  );

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (history.length === 0 || solved) return;
    const prev = history[history.length - 1];
    setState(prev);
    setMoves((m) => m - 1);
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
  const animalMap = new Map<string, { color: number; idx: number }>();
  state.animals.forEach((a, idx) => {
    animalMap.set(`${a.pos.r},${a.pos.c}`, { color: a.color, idx });
  });

  // Build pen map: position -> pen color
  const penMap = new Map<string, number>();
  state.pens.forEach((p) => {
    penMap.set(`${p.pos.r},${p.pos.c}`, p.color);
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Herd</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
      </View>
      <Text style={styles.subtitle}>
        Move animals to their matching pens. All same-color animals move together.
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

      {/* Grid */}
      <View style={[styles.gridContainer, { width: containerWidth }]}>
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
                    {/* Pen marker */}
                    {penColor !== undefined && !animal && (
                      <Text style={[styles.penMarker, { color: COLOR_VALUES[penColor] }]}>
                        {ANIMAL_EMOJI[penColor]}
                      </Text>
                    )}
                    {/* Animal */}
                    {animal && (
                      <View style={styles.animalContainer}>
                        <Text style={styles.animalEmoji}>
                          {ANIMAL_EMOJI[animal.color]}
                        </Text>
                        {/* Show if animal is on its matching pen */}
                        {penColor === animal.color && (
                          <View style={[styles.homeBadge, { backgroundColor: COLOR_VALUES[animal.color] }]} />
                        )}
                      </View>
                    )}
                  </View>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Direction buttons per color */}
      {!solved && (
        <View style={styles.controlsContainer}>
          {colors.map((color) => (
            <View key={color} style={styles.colorGroup}>
              <View style={styles.colorLabelRow}>
                <Text style={styles.colorEmoji}>{ANIMAL_EMOJI[color]}</Text>
                <Text style={[styles.colorLabel, { color: COLOR_VALUES[color] }]}>
                  {COLOR_NAMES[color]}
                </Text>
              </View>
              <View style={styles.dirBtnRow}>
                {DIRECTIONS.map((dir) => (
                  <Pressable
                    key={dir}
                    style={[styles.dirBtn, { borderColor: COLOR_VALUES[color] }]}
                    onPress={() => handleMove(color, dir)}
                  >
                    <Text style={styles.dirBtnText}>
                      {dir === 'N' ? '\u2191' : dir === 'S' ? '\u2193' : dir === 'E' ? '\u2192' : '\u2190'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Undo */}
      {!solved && history.length > 0 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
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
          Tap a direction arrow to move ALL animals of that color one step.{'\n'}
          Animals are blocked by walls and other animals.{'\n'}
          Solve in {par} moves or fewer for par.
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
  gridContainer: {
    marginBottom: 12,
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
  homeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#121213',
  },
  controlsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 8,
  },
  colorGroup: {
    alignItems: 'center',
    gap: 4,
  },
  colorLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colorEmoji: { fontSize: 16 },
  colorLabel: { fontSize: 12, fontWeight: '700' },
  dirBtnRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dirBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  dirBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
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
