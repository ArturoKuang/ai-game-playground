import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Animated,
} from 'react-native';
import CelebrationBurst from '../components/CelebrationBurst';
import { getDailySeed, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import {
  ICE,
  WATER,
  EMPTY,
  generatePuzzle,
  applyMove,
  isGoal,
  heuristic,
  solve,
  previewMelt,
  type ThawState,
  type Move,
} from '../solvers/Thaw.solver';

/* ─── Constants ─── */
const GAP = 3;

export default function Thaw() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const par = useMemo(() => {
    const sol = solve(initialState, 5);
    return sol ? sol.steps : initialState.heatBudget;
  }, [initialState]);

  const rows = initialState.rows;
  const cols = initialState.cols;

  const [state, setState] = useState<ThawState>(() => ({
    ...initialState,
    grid: initialState.grid.map((row) => [...row]),
  }));
  const [history, setHistory] = useState<ThawState[]>([initialState]);
  const [selectedCell, setSelectedCell] = useState<{
    r: number;
    c: number;
  } | null>(null);
  const [meltPreview, setMeltPreview] = useState<Move[]>([]);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(state);
  const budgetExhausted =
    !solved && state.heatUsed >= state.heatBudget;
  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (cols - 1) * GAP) / cols);
  const gridWidth = cols * cellSize + (cols - 1) * GAP;
  const gridHeight = rows * cellSize + (rows - 1) * GAP;

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: rows * cols }, () => new Animated.Value(1)),
  ).current;

  /* ── Preview on select ── */
  useEffect(() => {
    if (selectedCell && state.grid[selectedCell.r][selectedCell.c] === ICE) {
      const targets = previewMelt(
        state.grid,
        rows,
        cols,
        selectedCell.r,
        selectedCell.c,
      );
      setMeltPreview(targets);
    } else {
      setMeltPreview([]);
    }
  }, [selectedCell, state.grid, rows, cols]);

  /* ── Tap handler: select then confirm ── */
  const handleTap = useCallback(
    (r: number, c: number) => {
      if (solved || budgetExhausted) return;
      if (state.grid[r][c] !== ICE) return;

      const key = r * cols + c;

      // First tap: select and preview
      if (!selectedCell || selectedCell.r !== r || selectedCell.c !== c) {
        setSelectedCell({ r, c });
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
        return;
      }

      // Second tap: confirm melt
      setSelectedCell(null);
      setMeltPreview([]);

      // Animate all cells that will melt
      const targets = previewMelt(state.grid, rows, cols, r, c);
      for (const t of targets) {
        const tk = t.r * cols + t.c;
        Animated.sequence([
          Animated.timing(cellScales[tk], {
            toValue: 1.3,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(cellScales[tk], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }

      const next = applyMove(state, { r, c });
      setState(next);
      setHistory((h) => [...h, next]);
    },
    [state, solved, budgetExhausted, selectedCell, cellScales, rows, cols],
  );

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prev = history[history.length - 2];
    setState({
      ...prev,
      grid: prev.grid.map((row) => [...row]),
    });
    setHistory((h) => h.slice(0, -1));
    setSelectedCell(null);
    setMeltPreview([]);
  }, [history, solved]);

  const remaining = heuristic(state);
  const heatLeft = state.heatBudget - state.heatUsed;

  const previewSet = useMemo(() => {
    const s = new Set<string>();
    for (const m of meltPreview) s.add(`${m.r},${m.c}`);
    return s;
  }, [meltPreview]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Thaw</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
      </View>

      <Text style={styles.subtitle}>
        Tap ice to melt in a cross. Water conducts heat further!
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Heat Left</Text>
          <Text
            style={[
              styles.infoVal,
              heatLeft <= 1 && !solved && styles.infoWarn,
              solved && state.heatUsed <= par && styles.infoGood,
            ]}
          >
            {heatLeft}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Ice</Text>
          <Text style={styles.infoVal}>{remaining}</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth, height: gridHeight }]}>
        {Array.from({ length: rows }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: cols }).map((_, c) => {
              const key = r * cols + c;
              const cell = state.grid[r][c];
              const isSelected =
                selectedCell !== null &&
                selectedCell.r === r &&
                selectedCell.c === c;
              const inPreview = previewSet.has(`${r},${c}`);

              let bg: string;
              let borderColor: string;
              let bw: number;

              if (cell === ICE) {
                bg = isSelected ? '#4fc3f7' : '#81d4fa';
                borderColor = isSelected
                  ? '#f1c40f'
                  : inPreview
                    ? '#ff7043'
                    : '#29b6f6';
                bw = isSelected ? 3 : inPreview ? 2 : 1;
              } else if (cell === WATER) {
                bg = '#1565c0';
                borderColor = '#0d47a1';
                bw = 1;
              } else {
                // EMPTY
                bg = '#1a1a1b';
                borderColor = '#333';
                bw = 1;
              }

              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[key] }] }}
                >
                  <Pressable
                    onPress={() => handleTap(r, c)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: bg,
                        borderColor,
                        borderWidth: bw,
                      },
                      cell === EMPTY && styles.cellEmpty,
                    ]}
                  >
                    {cell === ICE && (
                      <Text style={styles.iceEmoji}>
                        {inPreview ? '\uD83D\uDD25' : '\u2744\uFE0F'}
                      </Text>
                    )}
                    {cell === WATER && (
                      <Text style={styles.waterEmoji}>{'\uD83D\uDCA7'}</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Preview hint */}
      {selectedCell && !solved && !budgetExhausted && meltPreview.length > 0 && (
        <View style={styles.previewHint}>
          <Text style={styles.previewText}>
            Melts {meltPreview.length} cell{meltPreview.length !== 1 ? 's' : ''} -- tap
            again!
          </Text>
        </View>
      )}

      {/* Undo */}
      {!solved && !budgetExhausted && history.length > 1 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      )}

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {state.heatUsed < par
              ? '\uD83C\uDF1F'
              : state.heatUsed === par
                ? '\u2B50'
                : '\uD83D\uDD25'}
          </Text>
          <Text style={styles.endText}>
            {state.heatUsed < par
              ? `Under par! ${state.heatUsed} taps`
              : state.heatUsed === par
                ? `At par! ${state.heatUsed} taps`
                : `Thawed in ${state.heatUsed} taps (par ${par})`}
          </Text>
        </View>
      )}

      {budgetExhausted && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>{'\u2744\uFE0F'}</Text>
          <Text style={styles.endText}>
            Out of heat! {remaining} ice remaining.
          </Text>
          <Pressable style={styles.undoBtn} onPress={handleUndo}>
            <Text style={styles.undoText}>Undo last</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap an ice cell to preview, then tap again to melt it. Each tap melts
          ice in a cross (+) pattern.{'\n\n'}
          Water conducts heat: if a cross arm hits water, it continues through
          the water to melt the next ice cell in that direction.{'\n\n'}
          Build water bridges to amplify your reach. Melt all ice within your
          heat budget!
        </Text>
      </View>
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
  subtitle: {
    fontSize: 13,
    color: '#818384',
    marginTop: 2,
    marginBottom: 12,
    textAlign: 'center',
    maxWidth: 300,
  },
  infoBar: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 11, marginBottom: 2 },
  infoVal: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  infoGood: { color: '#2ecc71' },
  infoWarn: { color: '#e74c3c' },
  infoPar: { color: '#818384', fontSize: 22, fontWeight: '800' },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmpty: {
    opacity: 0.3,
  },
  iceEmoji: {
    fontSize: 18,
  },
  waterEmoji: {
    fontSize: 14,
    opacity: 0.6,
  },
  previewHint: {
    marginTop: 10,
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  previewText: {
    color: '#f1c40f',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
