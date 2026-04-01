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
  initialState,
  applyMove,
  isGoal,
  heuristic,
  type RelayPuzzle,
  type PlayerState,
  type Move,
} from '../solvers/Relay.solver';

/* ─── Constants ─── */
const GAP = 2;
const WIRE_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22',
  '#1abc9c', '#e91e63',
];
const TX_LABEL = 'ABCDEFGH';
const RX_LABEL = '12345678';

/* ─── Seed helpers (self-contained) ─── */
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

/* ─── Component ─── */
export default function Relay() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const puzzle = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const [state, setState] = useState<PlayerState>(() => initialState(puzzle));
  const [selectedTx, setSelectedTx] = useState<number | null>(null);
  const [highlightedActivation, setHighlightedActivation] = useState<number | null>(null);

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 360);
  const cellSize = Math.floor((maxGrid - (puzzle.gridSize - 1) * GAP) / puzzle.gridSize);
  const gridWidth = puzzle.gridSize * cellSize + (puzzle.gridSize - 1) * GAP;

  /* ── Animated scales for cells ── */
  const totalCells = puzzle.gridSize * puzzle.gridSize;
  const cellScales = useRef(
    Array.from({ length: totalCells }, () => new Animated.Value(1)),
  ).current;

  // Precompute cell info
  const txCellMap = useMemo(() => {
    const map = new Map<number, number>();
    for (let i = 0; i < puzzle.transmitters.length; i++) {
      const t = puzzle.transmitters[i];
      map.set(t.r * puzzle.gridSize + t.c, i);
    }
    return map;
  }, [puzzle]);

  const rxCellMap = useMemo(() => {
    const map = new Map<number, number>();
    for (let i = 0; i < puzzle.receivers.length; i++) {
      const r = puzzle.receivers[i];
      map.set(r.r * puzzle.gridSize + r.c, i);
    }
    return map;
  }, [puzzle]);

  // Which cells are currently lit (union of all activation lit cells)
  const litCellColors = useMemo(() => {
    const map = new Map<number, string[]>();
    for (let i = 0; i < state.activations.length; i++) {
      const act = state.activations[i];
      const color = WIRE_COLORS[act.transmitterIdx % WIRE_COLORS.length];
      for (const cell of act.litCells) {
        if (!map.has(cell)) map.set(cell, []);
        map.get(cell)!.push(color);
      }
    }
    return map;
  }, [state.activations]);

  // Cells highlighted from selected activation in history
  const highlightedCells = useMemo(() => {
    if (highlightedActivation === null) return new Set<number>();
    const act = state.activations[highlightedActivation];
    if (!act) return new Set<number>();
    return new Set(act.litCells);
  }, [highlightedActivation, state.activations]);

  /* ── Handlers ── */
  const handleActivate = useCallback(
    (txIdx: number) => {
      if (state.submitted) return;
      if (state.activationsUsed >= puzzle.activationBudget) return;

      const move: Move = { type: 'activate', transmitterIdx: txIdx };
      const next = applyMove(state, move);

      // Animate the lit cells
      const wire = puzzle.wires[txIdx];
      for (const ci of wire.path) {
        if (ci < cellScales.length) {
          Animated.sequence([
            Animated.timing(cellScales[ci], {
              toValue: 1.2,
              duration: 60,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[ci], {
              toValue: 1,
              friction: 3,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }

      setState(next);
      setSelectedTx(null);
    },
    [state, puzzle, cellScales],
  );

  const handleAssign = useCallback(
    (txIdx: number, rxIdx: number) => {
      if (state.submitted) return;
      const move: Move = { type: 'assign', transmitterIdx: txIdx, receiverIdx: rxIdx };
      const next = applyMove(state, move);
      setState(next);
      setSelectedTx(null);
    },
    [state],
  );

  const handleUnassign = useCallback(
    (txIdx: number) => {
      if (state.submitted) return;
      const move: Move = { type: 'unassign', transmitterIdx: txIdx };
      const next = applyMove(state, move);
      setState(next);
    },
    [state],
  );

  const handleSubmit = useCallback(() => {
    if (state.submitted) return;
    if (state.mapping.some((r) => r === null)) return;
    const move: Move = { type: 'submit' };
    const next = applyMove(state, move);
    setState(next);
  }, [state]);

  const handleReset = useCallback(() => {
    setState(initialState(puzzle));
    setSelectedTx(null);
    setHighlightedActivation(null);
  }, [puzzle]);

  const solved = isGoal(state);
  const wrong = heuristic(state);
  const allAssigned = state.mapping.every((r) => r !== null);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Relay</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
      </View>
      <Text style={styles.subtitle}>
        Activate transmitters to trace hidden wires. Deduce all connections.
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Activations</Text>
          <Text style={styles.infoVal}>
            {state.activationsUsed}/{puzzle.activationBudget}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Pairs</Text>
          <Text style={styles.infoVal}>{puzzle.numPairs}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{puzzle.par}</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth, height: gridWidth }]}>
        {Array.from({ length: puzzle.gridSize }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: puzzle.gridSize }).map((_, c) => {
              const idx = r * puzzle.gridSize + c;
              const txIdx = txCellMap.get(idx);
              const rxIdx = rxCellMap.get(idx);
              const isTx = txIdx !== undefined;
              const isRx = rxIdx !== undefined;
              const colors = litCellColors.get(idx);
              const isLit = colors !== undefined && colors.length > 0;
              const isHighlighted = highlightedCells.has(idx);
              const isOverlap = isLit && colors !== undefined && colors.length > 1;

              let bg = '#1a1a1b';
              let border = '#333';
              let bw = 1;

              if (isHighlighted) {
                bg = '#2c3e50';
                border = '#ecf0f1';
                bw = 2;
              } else if (isLit && colors) {
                if (isOverlap) {
                  bg = '#4a3500';
                  border = '#f39c12';
                  bw = 2;
                } else {
                  bg = colors[0] + '40';
                  border = colors[0];
                  bw = 2;
                }
              }

              if (isTx) {
                border = WIRE_COLORS[txIdx! % WIRE_COLORS.length];
                bw = 3;
                if (!isLit) bg = '#1a2a3a';
              }
              if (isRx) {
                border = '#f1c40f';
                bw = 3;
                if (!isLit) bg = '#2a2a1a';
              }

              const isSelectedTx = isTx && selectedTx === txIdx;
              if (isSelectedTx) {
                border = '#ffffff';
                bw = 3;
              }

              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[idx] }] }}
                >
                  <Pressable
                    onPress={() => {
                      if (isTx && !state.submitted) {
                        if (selectedTx === txIdx) {
                          handleActivate(txIdx!);
                        } else {
                          setSelectedTx(txIdx!);
                        }
                      } else if (isRx && selectedTx !== null && !state.submitted) {
                        handleAssign(selectedTx, rxIdx!);
                      }
                    }}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: bg,
                        borderColor: border,
                        borderWidth: bw,
                      },
                    ]}
                  >
                    {isTx && (
                      <Text
                        style={[
                          styles.cellLabel,
                          { color: WIRE_COLORS[txIdx! % WIRE_COLORS.length] },
                        ]}
                      >
                        {TX_LABEL[txIdx!]}
                      </Text>
                    )}
                    {isRx && (
                      <Text style={[styles.cellLabel, { color: '#f1c40f' }]}>
                        {RX_LABEL[rxIdx!]}
                      </Text>
                    )}
                    {isOverlap && !isTx && !isRx && (
                      <Text style={styles.overlapDot}>{'\u2716'}</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Transmitter buttons */}
      {!state.submitted && (
        <View style={styles.txRow}>
          {Array.from({ length: puzzle.numPairs }).map((_, i) => {
            const color = WIRE_COLORS[i % WIRE_COLORS.length];
            const isSelected = selectedTx === i;
            return (
              <Pressable
                key={i}
                style={[
                  styles.txBtn,
                  {
                    backgroundColor: isSelected ? color : color + '30',
                    borderColor: color,
                  },
                ]}
                onPress={() => {
                  if (selectedTx === i) {
                    handleActivate(i);
                  } else {
                    setSelectedTx(i);
                  }
                }}
              >
                <Text
                  style={[
                    styles.txBtnText,
                    { color: isSelected ? '#fff' : color },
                  ]}
                >
                  {TX_LABEL[i]}
                </Text>
                {state.mapping[i] !== null && (
                  <Text style={styles.txMappingLabel}>
                    {'\u2192'}{RX_LABEL[state.mapping[i]!]}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Instruction for selected transmitter */}
      {selectedTx !== null && !state.submitted && (
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>
            Tap {TX_LABEL[selectedTx]} again to activate ({state.activationsUsed}/{puzzle.activationBudget} used).
            {'\n'}Or tap a receiver (1-{puzzle.numPairs}) to assign connection.
          </Text>
        </View>
      )}

      {/* Mapping display */}
      <View style={styles.mappingSection}>
        <Text style={styles.mappingSectionTitle}>Connections</Text>
        <View style={styles.mappingRow}>
          {Array.from({ length: puzzle.numPairs }).map((_, tx) => {
            const rx = state.mapping[tx];
            const color = WIRE_COLORS[tx % WIRE_COLORS.length];
            const isCorrectAfterSubmit =
              state.submitted && rx === puzzle.wires[tx].receiver;
            const isWrongAfterSubmit =
              state.submitted && rx !== puzzle.wires[tx].receiver;
            return (
              <Pressable
                key={tx}
                onPress={() => {
                  if (!state.submitted && rx !== null) {
                    handleUnassign(tx);
                  }
                }}
                style={[
                  styles.mappingItem,
                  {
                    borderColor: isCorrectAfterSubmit
                      ? '#2ecc71'
                      : isWrongAfterSubmit
                        ? '#e74c3c'
                        : color,
                  },
                ]}
              >
                <Text style={[styles.mappingTx, { color }]}>
                  {TX_LABEL[tx]}
                </Text>
                <Text style={styles.mappingArrow}>{'\u2192'}</Text>
                <Text
                  style={[
                    styles.mappingRx,
                    rx !== null && { color: '#f1c40f' },
                  ]}
                >
                  {rx !== null ? RX_LABEL[rx] : '?'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Submit button */}
      {!state.submitted && allAssigned && (
        <Pressable style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>Submit Mapping</Text>
        </Pressable>
      )}

      {/* Reset button */}
      {!state.submitted && state.activationsUsed > 0 && (
        <Pressable style={styles.resetBtn} onPress={handleReset}>
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      )}

      {/* Activation history */}
      {state.activations.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>Activation Log</Text>
          {state.activations.map((act, i) => {
            const color = WIRE_COLORS[act.transmitterIdx % WIRE_COLORS.length];
            return (
              <Pressable
                key={i}
                onPress={() =>
                  setHighlightedActivation(
                    highlightedActivation === i ? null : i,
                  )
                }
                style={[
                  styles.historyItem,
                  highlightedActivation === i && styles.historyItemActive,
                ]}
              >
                <Text style={[styles.historyLabel, { color }]}>
                  {TX_LABEL[act.transmitterIdx]}
                </Text>
                <Text style={styles.historyDetail}>
                  lit {act.litCells.length} cells
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {state.submitted && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {solved ? '\u2b50' : '\u274c'}
          </Text>
          <Text style={styles.endText}>
            {solved
              ? `Correct! ${state.activationsUsed} activations (par ${puzzle.par})`
              : `Wrong! ${wrong} pair${wrong !== 1 ? 's' : ''} incorrect`}
          </Text>
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Hidden wires connect transmitters (colored letters on edges) to
          receivers (numbered cells inside).{'\n\n'}
          Tap a transmitter to select it, then tap again to activate and see its
          wire path light up. Wires can overlap on shared cells!{'\n\n'}
          Assign each transmitter to a receiver by selecting a transmitter then
          tapping a receiver. Submit when all connections are mapped.{'\n\n'}
          Par: {puzzle.par} activations.
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
  infoPar: { color: '#818384', fontSize: 22, fontWeight: '800' },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  overlapDot: {
    color: '#f39c12',
    fontSize: 10,
    fontWeight: '800',
  },
  txRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  txBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    minWidth: 48,
  },
  txBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  txMappingLabel: {
    color: '#f1c40f',
    fontSize: 10,
    fontWeight: '600',
  },
  hintBar: {
    marginTop: 8,
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  hintText: {
    color: '#818384',
    fontSize: 12,
    textAlign: 'center',
  },
  mappingSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  mappingSectionTitle: {
    color: '#818384',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  mappingRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  mappingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mappingTx: {
    fontSize: 16,
    fontWeight: '800',
  },
  mappingArrow: {
    color: '#818384',
    fontSize: 14,
  },
  mappingRx: {
    fontSize: 16,
    fontWeight: '800',
    color: '#555',
  },
  submitBtn: {
    marginTop: 16,
    backgroundColor: '#2ecc71',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  resetBtn: {
    marginTop: 8,
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  historySection: {
    marginTop: 16,
    alignItems: 'center',
  },
  historySectionTitle: {
    color: '#818384',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  historyItem: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 2,
  },
  historyItemActive: {
    backgroundColor: '#2c3e50',
  },
  historyLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  historyDetail: {
    color: '#818384',
    fontSize: 13,
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
