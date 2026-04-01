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
  edgeId,
  allEdges,
  findRegions,
  isGoal,
  heuristic,
  applyMove,
  solve,
  type SplitState,
  type Move,
  type Edge,
} from '../solvers/Split.solver';

/* ─── Constants ─── */
const CELL_COLORS = [
  '#e74c3c', // 0 red
  '#3498db', // 1 blue
  '#2ecc71', // 2 green
  '#f1c40f', // 3 yellow
  '#9b59b6', // 4 purple
  '#e67e22', // 5 orange (for 6-color mode)
];

const REGION_BORDER_COLORS = [
  'rgba(255,255,255,0.6)',
  'rgba(100,200,255,0.6)',
  'rgba(255,200,100,0.6)',
  'rgba(100,255,200,0.6)',
  'rgba(255,100,200,0.6)',
  'rgba(200,100,255,0.6)',
];

const GAP = 2;
const EDGE_HIT_SIZE = 20; // tap target for edges

export default function Split() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const par = useMemo(() => {
    const sol = solve(initialState, 5);
    return sol ? sol.steps : 15;
  }, [initialState]);

  const [state, setState] = useState<SplitState>(() => ({ ...initialState }));
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<SplitState[]>(() => [initialState]);

  const solved = isGoal(state);
  const h = heuristic(state);
  const regions = useMemo(() => findRegions(state), [state]);

  const { width: screenWidth } = useWindowDimensions();
  const boardPad = 40; // extra space for edge taps on borders
  const maxBoardWidth = Math.min(screenWidth - 32, 360);
  const cellSize = Math.floor((maxBoardWidth - boardPad) / state.size);
  const boardWidth = cellSize * state.size;

  /* ── Edge toggle handler ── */
  const handleEdgeToggle = useCallback(
    (eid: string) => {
      if (solved) return;
      const toggle = state.edges.has(eid) ? 'remove' : 'add';
      const move: Move = { edgeId: eid, toggle };
      const next = applyMove(state, move);
      const nextMoves = moves + 1;
      setState(next);
      setMoves(nextMoves);
      setHistory((h) => [...h, next]);
    },
    [state, solved, moves],
  );

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prev = history[history.length - 2];
    setState(prev);
    setMoves((m) => m - 1);
    setHistory((h) => h.slice(0, -1));
  }, [history, solved]);

  /* ── Region color assignments for visual feedback ── */
  const regionColorMap = useMemo(() => {
    const map = new Map<number, number>(); // cellIdx -> regionIndex
    regions.forEach((region, ri) => {
      for (const cell of region) {
        map.set(cell, ri);
      }
    });
    return map;
  }, [regions]);

  /* ── Check which regions are valid ── */
  const regionValidity = useMemo(() => {
    return regions.map((region) => {
      if (region.length !== state.colors) return false;
      const colorCount = new Array(state.colors).fill(0);
      for (const cellIdx of region) {
        const r = Math.floor(cellIdx / state.size);
        const c = cellIdx % state.size;
        colorCount[state.grid[r][c]]++;
      }
      return colorCount.every((cnt: number) => cnt === 1);
    });
  }, [regions, state]);

  /* ── Render grid cells ── */
  function renderCells() {
    const cells: React.ReactNode[] = [];
    for (let r = 0; r < state.size; r++) {
      for (let c = 0; c < state.size; c++) {
        const color = state.grid[r][c];
        const cellIdx = r * state.size + c;
        const regionIdx = regionColorMap.get(cellIdx) ?? 0;
        const isValid = regionValidity[regionIdx];
        cells.push(
          <View
            key={`cell-${r}-${c}`}
            style={[
              styles.cell,
              {
                width: cellSize - GAP,
                height: cellSize - GAP,
                left: c * cellSize + GAP / 2,
                top: r * cellSize + GAP / 2,
                backgroundColor: CELL_COLORS[color] ?? '#888',
                opacity: solved ? 1 : 0.85,
              },
            ]}
          >
            {isValid && solved && (
              <Text style={styles.checkMark}>{'\u2713'}</Text>
            )}
          </View>,
        );
      }
    }
    return cells;
  }

  /* ── Render active edges (drawn lines) ── */
  function renderEdges() {
    const lines: React.ReactNode[] = [];
    for (const eid of state.edges) {
      const parts = eid.split('-');
      const [r1s, c1s] = parts[0].split(',');
      const [r2s, c2s] = parts[1].split(',');
      const r1 = parseInt(r1s, 10);
      const c1 = parseInt(c1s, 10);
      const r2 = parseInt(r2s, 10);
      const c2 = parseInt(c2s, 10);

      const isHorizontal = r1 !== r2; // cells are vertically adjacent -> horizontal line between them
      if (isHorizontal) {
        // Horizontal line between row r1 and r2 (at the bottom of r1)
        const topR = Math.min(r1, r2);
        lines.push(
          <View
            key={`line-${eid}`}
            style={{
              position: 'absolute',
              left: Math.min(c1, c2) * cellSize,
              top: (topR + 1) * cellSize - 2,
              width: cellSize,
              height: 4,
              backgroundColor: '#fff',
              borderRadius: 2,
              zIndex: 10,
            }}
          />,
        );
      } else {
        // Vertical line between column c1 and c2 (at the right of c1)
        const leftC = Math.min(c1, c2);
        lines.push(
          <View
            key={`line-${eid}`}
            style={{
              position: 'absolute',
              left: (leftC + 1) * cellSize - 2,
              top: Math.min(r1, r2) * cellSize,
              width: 4,
              height: cellSize,
              backgroundColor: '#fff',
              borderRadius: 2,
              zIndex: 10,
            }}
          />,
        );
      }
    }
    return lines;
  }

  /* ── Render edge tap targets (invisible pressable areas) ── */
  function renderEdgeTapTargets() {
    if (solved) return null;
    const targets: React.ReactNode[] = [];
    const edges = allEdges(state.size);
    for (const edge of edges) {
      const { r1, c1, r2, c2, id } = edge;
      const isHorizontal = r1 !== r2;
      const isActive = state.edges.has(id);

      if (isHorizontal) {
        const topR = Math.min(r1, r2);
        targets.push(
          <Pressable
            key={`tap-${id}`}
            onPress={() => handleEdgeToggle(id)}
            style={{
              position: 'absolute',
              left: Math.min(c1, c2) * cellSize,
              top: (topR + 1) * cellSize - EDGE_HIT_SIZE / 2,
              width: cellSize,
              height: EDGE_HIT_SIZE,
              zIndex: 20,
              // Debug: uncomment to see tap targets
              // backgroundColor: 'rgba(255,0,0,0.2)',
            }}
          />,
        );
      } else {
        const leftC = Math.min(c1, c2);
        targets.push(
          <Pressable
            key={`tap-${id}`}
            onPress={() => handleEdgeToggle(id)}
            style={{
              position: 'absolute',
              left: (leftC + 1) * cellSize - EDGE_HIT_SIZE / 2,
              top: Math.min(r1, r2) * cellSize,
              width: EDGE_HIT_SIZE,
              height: cellSize,
              zIndex: 20,
            }}
          />,
        );
      }
    }
    return targets;
  }

  /* ── Region info display ── */
  function renderRegionInfo() {
    return (
      <View style={styles.regionInfo}>
        {regions.map((region, ri) => {
          const colorCount = new Array(state.colors).fill(0);
          for (const cellIdx of region) {
            const r = Math.floor(cellIdx / state.size);
            const c = cellIdx % state.size;
            colorCount[state.grid[r][c]]++;
          }
          const isValid = regionValidity[ri];
          const hasRight = region.length === state.colors;
          return (
            <View
              key={ri}
              style={[
                styles.regionChip,
                {
                  borderColor: isValid
                    ? '#2ecc71'
                    : hasRight
                      ? '#e67e22'
                      : '#e74c3c',
                },
              ]}
            >
              <Text style={styles.regionChipText}>
                {region.length}/{state.colors}
              </Text>
              <View style={styles.regionDots}>
                {colorCount.map((cnt: number, ci: number) => (
                  <View
                    key={ci}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: CELL_COLORS[ci],
                        opacity: cnt > 0 ? 1 : 0.2,
                      },
                    ]}
                  >
                    {cnt > 1 && (
                      <Text style={styles.dotCount}>{cnt}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Split</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
      </View>
      <Text style={styles.subtitle}>
        Draw lines to split the grid into regions.{'\n'}
        Each region needs exactly one of every color.
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Lines</Text>
          <Text
            style={[
              styles.infoVal,
              solved && state.edges.size <= par && styles.infoGood,
            ]}
          >
            {state.edges.size}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Regions</Text>
          <Text style={styles.infoVal}>
            {regions.length}/{state.colors}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Issues</Text>
          <Text style={[styles.infoVal, h === 0 && styles.infoGood]}>
            {h}
          </Text>
        </View>
      </View>

      {/* Board */}
      <View
        style={[
          styles.board,
          {
            width: boardWidth + GAP,
            height: boardWidth + GAP,
          },
        ]}
      >
        {renderCells()}
        {renderEdges()}
        {renderEdgeTapTargets()}
      </View>

      {/* Region info */}
      {renderRegionInfo()}

      {/* Undo + Reset */}
      {!solved && (
        <View style={styles.btnRow}>
          {history.length > 1 && (
            <Pressable style={styles.undoBtn} onPress={handleUndo}>
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
          )}
          {state.edges.size > 0 && (
            <Pressable
              style={styles.undoBtn}
              onPress={() => {
                setState({ ...state, edges: new Set<string>() });
                setMoves(0);
                setHistory([initialState]);
              }}
            >
              <Text style={styles.undoText}>Clear All</Text>
            </Pressable>
          )}
        </View>
      )}

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {state.edges.size < par
              ? '\ud83c\udf1f'
              : state.edges.size === par
                ? '\u2b50'
                : '\u2702\ufe0f'}
          </Text>
          <Text style={styles.endText}>
            {state.edges.size < par
              ? `Under par! ${state.edges.size} lines`
              : state.edges.size === par
                ? `At par! ${state.edges.size} lines`
                : `Solved with ${state.edges.size} lines`}
          </Text>
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap the edges between cells to draw boundary lines.{'\n'}
          Lines divide the grid into separate regions.{'\n'}
          Each region must contain exactly one cell of every color.{'\n'}
          {state.size === 5
            ? 'Make 5 regions of 5 cells each.'
            : 'Make 6 regions of 6 cells each.'}
          {'\n'}Par: {par} lines.
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
    gap: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 11, marginBottom: 2 },
  infoVal: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  infoGood: { color: '#2ecc71' },
  infoPar: { color: '#818384', fontSize: 20, fontWeight: '800' },
  board: {
    position: 'relative',
    backgroundColor: '#1a1a1b',
    borderRadius: 8,
    overflow: 'visible',
    marginBottom: 12,
  },
  cell: {
    position: 'absolute',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  regionInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
    justifyContent: 'center',
    maxWidth: 360,
  },
  regionChip: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
    backgroundColor: '#1a1a1b',
  },
  regionChipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  regionDots: {
    flexDirection: 'row',
    gap: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotCount: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
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
