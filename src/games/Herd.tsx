import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Modal,
} from 'react-native';
import {
  generatePuzzle,
  applyMoveWithInfo,
  isGoal,
  heuristic,
  solve,
  type HerdState,
  type Move,
  type Direction,
} from '../solvers/Herd.solver';

/* --- Constants --- */
const ANIMAL_EMOJI: string[] = ['\uD83E\uDD8A', '\uD83D\uDC26', '\uD83D\uDC38', '\uD83D\uDC3B'];
const COLOR_NAMES = ['Red', 'Blue', 'Green', 'Brown'];
const COLOR_VALUES = ['#e74c3c', '#3498db', '#2ecc71', '#8d6e63'];
const PEN_BG = ['rgba(231,76,60,0.15)', 'rgba(52,152,219,0.15)', 'rgba(46,204,113,0.15)', 'rgba(141,110,99,0.15)'];
const PEN_BORDER = ['rgba(231,76,60,0.5)', 'rgba(52,152,219,0.5)', 'rgba(46,204,113,0.5)', 'rgba(141,110,99,0.5)'];
const GAP = 2;

/*
 * HARD VIEWPORT CONSTRAINT: everything must fit in 800x600.
 * Budget: header=40px, subtitle=16px, infoBar=36px, gap=4px, grid=5*48+4*2=248px,
 * colorTabs=34px, dpad=3*40+2*2=124px, counter=24px, padding=24px*2=48px
 * Total: 40+16+36+4+248+4+34+4+124+4+24+48 = 586px < 600px
 */
const CELL_SIZE = 48;
const DPAD_SIZE = 40;

/* --- Seed utilities --- */
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

/* --- Herd Game Component --- */
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
  const [blockedTooltip, setBlockedTooltip] = useState(false);

  const gridWidth = state.gridSize * CELL_SIZE + (state.gridSize - 1) * GAP;

  /* -- Animations -- */
  const cellScales = useRef(
    Array.from({ length: state.gridSize * state.gridSize }, () => new Animated.Value(1)),
  ).current;

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

  /* -- Move handler -- */
  const handleMove = useCallback(
    (dir: Direction) => {
      if (solved) return;
      const move: Move = { color: selectedColor, dir };
      const { state: next, moved } = applyMoveWithInfo(state, move);

      // HARD REQUIREMENT: wall-press = no-op. Do NOT increment move counter.
      if (!moved) {
        shakeGrid();
        setBlockedTooltip(true);
        setTimeout(() => setBlockedTooltip(false), 800);
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

  /* -- Undo -- */
  const handleUndo = useCallback(() => {
    if (history.length === 0 || solved) return;
    const prev = history[history.length - 1];
    setState(prev.state);
    setMoves(prev.moveCount);
    setHistory((h) => h.slice(0, -1));
    setSolved(false);
  }, [history, solved]);

  /* -- Derived data -- */
  const h = heuristic(state);
  const colors = useMemo(() => {
    const cs = new Set<number>();
    for (const a of state.animals) cs.add(a.color);
    return Array.from(cs).sort();
  }, [state.animals]);

  const animalMap = new Map<string, { color: number; idx: number; locked: boolean }>();
  state.animals.forEach((a, idx) => {
    animalMap.set(`${a.pos.r},${a.pos.c}`, { color: a.color, idx, locked: !!a.locked });
  });

  const penMap = new Map<string, number>();
  state.pens.forEach((p) => {
    penMap.set(`${p.pos.r},${p.pos.c}`, p.color);
  });

  const wallSet = new Set<string>();
  if (state.walls) {
    for (const w of state.walls) wallSet.add(`${w.r},${w.c}`);
  }

  const hasUnlocked = state.animals.some((a) => a.color === selectedColor && !a.locked);
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
          { width: gridWidth, transform: [{ translateX: shakeAnim }] },
        ]}
      >
        {Array.from({ length: state.gridSize }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: state.gridSize }, (_, c) => {
              const key = `${r},${c}`;
              const isWall = wallSet.has(key);
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
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                      },
                      isWall && styles.wallCell,
                      !isWall && penColor !== undefined && {
                        backgroundColor: PEN_BG[penColor],
                        borderColor: PEN_BORDER[penColor],
                        borderWidth: 2,
                      },
                    ]}
                  >
                    {isWall && (
                      <Text style={styles.wallIcon}>{'\u2B1B'}</Text>
                    )}
                    {/* Pen marker */}
                    {!isWall && penColor !== undefined && (!animal || animal.color !== penColor) && (
                      <Text style={[styles.penMarker, { color: COLOR_VALUES[penColor] }]}>
                        {ANIMAL_EMOJI[penColor]}
                      </Text>
                    )}
                    {/* Animal */}
                    {!isWall && animal && (
                      <View style={styles.animalContainer}>
                        <Text style={[styles.animalEmoji, animal.locked && styles.animalLocked]}>
                          {ANIMAL_EMOJI[animal.color]}
                        </Text>
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

      {/* "Blocked!" tooltip */}
      {blockedTooltip && (
        <View style={styles.blockedTooltip}>
          <Text style={styles.blockedTooltipText}>Blocked!</Text>
        </View>
      )}

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

      {/* D-pad + undo row */}
      {!solved && (
        <View style={styles.dpadRow}>
          <View style={styles.dpad}>
            <View style={styles.dpadInnerRow}>
              <View style={styles.dpadSpacer} />
              <Pressable
                style={[styles.dpadBtn, { borderColor: COLOR_VALUES[activeColor] }]}
                onPress={() => handleMove('N')}
              >
                <Text style={styles.dpadBtnText}>{'\u2191'}</Text>
              </Pressable>
              <View style={styles.dpadSpacer} />
            </View>
            <View style={styles.dpadInnerRow}>
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
            <View style={styles.dpadInnerRow}>
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

          {history.length > 0 && (
            <Pressable style={styles.undoBtn} onPress={handleUndo}>
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Move counter (always visible) */}
      <Text style={styles.moveCounter}>
        {moves}/{par} moves {moves <= par ? '' : `(+${moves - par})`}
      </Text>

      {/* Win modal overlay -- HARD REQUIREMENT: centered modal, not inline text */}
      <Modal
        visible={solved}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>
              {moves < par ? '\uD83C\uDF1F' : moves === par ? '\u2B50' : '\uD83D\uDC3E'}
            </Text>
            <Text style={styles.modalTitle}>
              {moves < par
                ? 'Under Par!'
                : moves === par
                  ? 'At Par!'
                  : 'Solved!'}
            </Text>
            <Text style={styles.modalBody}>
              {moves < par
                ? `${moves} moves (par ${par})`
                : moves === par
                  ? `${moves} moves -- perfect!`
                  : `${moves} moves (par: ${par})`}
            </Text>
            <Text style={styles.modalSub}>
              Herd #{puzzleDay}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#121213',
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  dayBadge: { color: '#6aaa64', fontSize: 12, fontWeight: '600' },
  /* Info bar */
  infoBar: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 4,
    marginTop: 2,
    alignItems: 'center',
    height: 36,
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 10, marginBottom: 1 },
  infoVal: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  infoGood: { color: '#2ecc71' },
  infoPar: { color: '#818384', fontSize: 18, fontWeight: '800' },
  /* Grid */
  gridContainer: {
    marginBottom: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  cell: {
    borderRadius: 6,
    backgroundColor: '#1a1a1b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  wallCell: {
    backgroundColor: '#333336',
    borderColor: '#555558',
    borderWidth: 2,
  },
  wallIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
  penMarker: {
    fontSize: 16,
    opacity: 0.35,
  },
  animalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  animalEmoji: {
    fontSize: 22,
  },
  animalLocked: {
    opacity: 0.85,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -4,
    right: -6,
    fontSize: 8,
  },
  /* Blocked tooltip */
  blockedTooltip: {
    position: 'absolute',
    top: '45%' as unknown as number,
    backgroundColor: 'rgba(231,76,60,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 100,
  },
  blockedTooltipText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  /* Color tabs */
  colorTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
    height: 30,
    alignItems: 'center',
  },
  colorTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 2,
  },
  colorTabEmoji: { fontSize: 13 },
  colorTabLabel: { fontSize: 10, fontWeight: '700' },
  /* D-pad */
  dpadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dpad: {
    alignItems: 'center',
    gap: 1,
  },
  dpadInnerRow: {
    flexDirection: 'row',
    gap: 1,
  },
  dpadBtn: {
    width: DPAD_SIZE,
    height: DPAD_SIZE,
    borderRadius: 8,
    backgroundColor: '#1a1a1b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  dpadBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  dpadSpacer: { width: DPAD_SIZE, height: DPAD_SIZE },
  dpadCenter: {
    width: DPAD_SIZE,
    height: DPAD_SIZE,
    borderRadius: 8,
    backgroundColor: '#2a2a2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dpadCenterEmoji: { fontSize: 16 },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  undoText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
  /* Move counter */
  moveCounter: {
    color: '#818384',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
    height: 18,
  },
  /* Win modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6aaa64',
    minWidth: 260,
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalBody: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalSub: {
    color: '#818384',
    fontSize: 13,
  },
});
