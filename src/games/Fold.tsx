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
import CelebrationBurst from '../components/CelebrationBurst';
import { getDailySeed, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import {
  generatePuzzle,
  applyMove,
  isGoal,
  heuristic,
  legalMoves,
  solve,
  countActiveCells,
  countFrozenCells,
  type FoldState,
  type Move,
} from '../solvers/Fold.solver';

/* ─── Constants ─── */
const CELL_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
const CELL_EMOJIS = ['\u{1F534}', '\u{1F535}', '\u{1F7E2}', '\u{1F7E1}']; // for frozen display

export default function Fold() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );
  const par = useMemo(() => {
    const sol = solve(initialState, 5);
    return sol ? sol.steps : 6;
  }, [initialState]);

  const [state, setState] = useState<FoldState>(() => ({
    ...initialState,
    grid: initialState.grid.map(row => row.map(c =>
      c ? { colors: [...c.colors], frozen: c.frozen, cleared: c.cleared } : null
    )),
  }));
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<FoldState[]>(() => [initialState]);
  const [selectedFold, setSelectedFold] = useState<{
    axis: 'row' | 'col';
    line: number;
  } | null>(null);

  const solved = isGoal(state);
  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = Math.min(screenWidth - 32, 360);

  // Cell size based on current grid dimensions
  const cellSize = Math.min(
    Math.floor((containerWidth - 16) / state.cols),
    70,
  );
  const gridWidth = cellSize * state.cols;
  const gridHeight = cellSize * state.rows;

  /* ── Animations ── */
  const scaleAnims = useRef(
    Array.from({ length: 16 }, () => new Animated.Value(1)),
  ).current;

  const bounceCell = useCallback(
    (idx: number) => {
      if (idx < scaleAnims.length) {
        Animated.sequence([
          Animated.timing(scaleAnims[idx], {
            toValue: 1.15,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnims[idx], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
    [scaleAnims],
  );

  /* ── Fold handler ── */
  const handleFold = useCallback(
    (move: Move) => {
      if (solved) return;
      const next = applyMove(state, move);
      const nextMoves = moves + 1;
      setState(next);
      setMoves(nextMoves);
      setHistory(h => [...h, next]);
      setSelectedFold(null);

      // Bounce all cells
      for (let i = 0; i < next.rows * next.cols && i < scaleAnims.length; i++) {
        bounceCell(i);
      }
    },
    [state, solved, moves, scaleAnims, bounceCell],
  );

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prev = history[history.length - 2];
    setState(prev);
    setMoves(m => m - 1);
    setHistory(h => h.slice(0, -1));
    setSelectedFold(null);
  }, [history, solved]);

  /* ── Get available fold lines ── */
  const availableMoves = useMemo(() => legalMoves(state), [state]);
  const foldLines = useMemo(() => {
    const lines: { axis: 'row' | 'col'; line: number }[] = [];
    const seen = new Set<string>();
    for (const m of availableMoves) {
      const key = `${m.axis}-${m.line}`;
      if (!seen.has(key)) {
        seen.add(key);
        lines.push({ axis: m.axis, line: m.line });
      }
    }
    return lines;
  }, [availableMoves]);

  const h = heuristic(state);
  const active = countActiveCells(state);
  const frozen = countFrozenCells(state);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fold</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
      </View>
      <Text style={styles.subtitle}>
        Fold the grid to stack matching colors. Clear all cells.
      </Text>

      {/* Info */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Folds</Text>
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
          <Text style={styles.infoVal}>{active}</Text>
        </View>
        {frozen > 0 && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Frozen</Text>
            <Text style={[styles.infoVal, { color: '#e74c3c' }]}>{frozen}</Text>
          </View>
        )}
      </View>

      {/* Grid */}
      <View
        style={[
          styles.gridContainer,
          { width: gridWidth + 8, height: gridHeight + 8 },
        ]}
      >
        {/* Fold line indicators */}
        {!solved && foldLines.map(({ axis, line }) => {
          const isSelected =
            selectedFold?.axis === axis && selectedFold?.line === line;
          if (axis === 'row') {
            return (
              <Pressable
                key={`foldline-row-${line}`}
                onPress={() =>
                  setSelectedFold(
                    isSelected ? null : { axis: 'row', line },
                  )
                }
                style={[
                  styles.foldLineH,
                  {
                    top: line * cellSize + 4 - 2,
                    width: gridWidth,
                    left: 4,
                  },
                  isSelected && styles.foldLineSelected,
                ]}
              />
            );
          } else {
            return (
              <Pressable
                key={`foldline-col-${line}`}
                onPress={() =>
                  setSelectedFold(
                    isSelected ? null : { axis: 'col', line },
                  )
                }
                style={[
                  styles.foldLineV,
                  {
                    left: line * cellSize + 4 - 2,
                    height: gridHeight,
                    top: 4,
                  },
                  isSelected && styles.foldLineSelected,
                ]}
              />
            );
          }
        })}

        {/* Cells */}
        {state.grid.map((row, r) =>
          row.map((cell, c) => {
            if (!cell || cell.cleared) {
              return (
                <View
                  key={`${r}-${c}`}
                  style={[
                    styles.cell,
                    styles.cellEmpty,
                    {
                      width: cellSize - 4,
                      height: cellSize - 4,
                      left: c * cellSize + 4,
                      top: r * cellSize + 4,
                    },
                  ]}
                />
              );
            }

            const idx = r * state.cols + c;
            const topColor = cell.colors[cell.colors.length - 1] ?? 0;
            const layerCount = cell.colors.length;

            return (
              <Animated.View
                key={`${r}-${c}`}
                style={{
                  position: 'absolute',
                  left: c * cellSize + 4,
                  top: r * cellSize + 4,
                  transform: [
                    { scale: idx < scaleAnims.length ? scaleAnims[idx] : 1 },
                  ],
                }}
              >
                <View
                  style={[
                    styles.cell,
                    {
                      width: cellSize - 4,
                      height: cellSize - 4,
                      backgroundColor: CELL_COLORS[topColor] || CELL_COLORS[0],
                      borderColor: cell.frozen
                        ? '#ffffff'
                        : 'rgba(0,0,0,0.3)',
                      borderWidth: cell.frozen ? 2 : 1,
                    },
                  ]}
                >
                  {cell.frozen && (
                    <Text style={styles.frozenIcon}>{'\u{1F512}'}</Text>
                  )}
                  {layerCount > 1 && (
                    <Text style={styles.layerCount}>{layerCount}</Text>
                  )}
                </View>
              </Animated.View>
            );
          }),
        )}
      </View>

      {/* Direction buttons when a fold line is selected */}
      {!solved && selectedFold && (
        <View style={styles.dirBtnRow}>
          <Text style={styles.dirLabel}>
            Fold {selectedFold.axis === 'row' ? 'row' : 'col'} line{' '}
            {selectedFold.line}:
          </Text>
          <View style={styles.dirBtns}>
            <Pressable
              style={styles.dirBtn}
              onPress={() =>
                handleFold({
                  axis: selectedFold.axis,
                  line: selectedFold.line,
                  direction: -1,
                })
              }
            >
              <Text style={styles.dirBtnText}>
                {selectedFold.axis === 'row' ? '\u2B06 Up' : '\u2B05 Left'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.dirBtn}
              onPress={() =>
                handleFold({
                  axis: selectedFold.axis,
                  line: selectedFold.line,
                  direction: 1,
                })
              }
            >
              <Text style={styles.dirBtnText}>
                {selectedFold.axis === 'row' ? '\u2B07 Down' : '\u27A1 Right'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {!solved && !selectedFold && (
        <Text style={styles.hint}>Tap a fold line (dashed) to fold</Text>
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
            {moves < par ? '\u{1F31F}' : moves === par ? '\u2B50' : '\u{1F4DC}'}
          </Text>
          <Text style={styles.endText}>
            {moves < par
              ? `Under par! ${moves} folds`
              : moves === par
                ? `At par! ${moves} folds`
                : `Solved in ${moves} folds`}
          </Text>
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Fold the grid along row or column lines to stack cells.{'\n'}
          When stacked cells share the same color, they clear.{'\n'}
          Mismatched stacks freeze (lock icon).{'\n'}
          Clear all cells in the fewest folds.{'\n\n'}
          Tap a dashed fold line, then choose a direction.{'\n'}
          Par: {par} folds.
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
    position: 'relative',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    marginBottom: 12,
  },
  cell: {
    position: 'absolute',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellEmpty: {
    backgroundColor: '#2a2a3e',
    opacity: 0.3,
  },
  frozenIcon: {
    fontSize: 14,
    position: 'absolute',
    top: 2,
    right: 2,
  },
  layerCount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  foldLineH: {
    position: 'absolute',
    height: 4,
    borderStyle: 'dashed',
    borderTopWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    zIndex: 10,
  },
  foldLineV: {
    position: 'absolute',
    width: 4,
    borderStyle: 'dashed',
    borderLeftWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    zIndex: 10,
  },
  foldLineSelected: {
    borderColor: '#f1c40f',
    backgroundColor: 'rgba(241,196,15,0.15)',
  },
  dirBtnRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  dirLabel: {
    color: '#818384',
    fontSize: 12,
    marginBottom: 6,
  },
  dirBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  dirBtn: {
    backgroundColor: '#3a3a5c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6a6a8c',
  },
  dirBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  hint: {
    color: '#818384',
    fontSize: 12,
    marginBottom: 8,
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
