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
import {
  getDailySeed,
  seededRandom,
  getPuzzleDay,
  getDayDifficulty,
} from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';

/* ─── Constants ─── */
const GRID = 6;
const GAP = 2;
const PATH_COLOR = '#3498db';
const PATH_GHOST = '#3498db44';
const START_COLOR = '#2ecc71';
const END_COLOR = '#e74c3c';

type Cell = [number, number];

function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

function getNeighbors(r: number, c: number): Cell[] {
  const result: Cell[] = [];
  if (r > 0) result.push([r - 1, c]);
  if (r < GRID - 1) result.push([r + 1, c]);
  if (c > 0) result.push([r, c - 1]);
  if (c < GRID - 1) result.push([r, c + 1]);
  return result;
}

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  // Mon: short path, many clues. Fri: long path, few clues.
  const minPathLen = 8 + d * 2;    // Mon: 10, Fri: 18
  const maxPathLen = 12 + d * 2;   // Mon: 14, Fri: 22
  const numClues = 22 - d * 2;     // Mon: 20, Fri: 12
  return { minPathLen, maxPathLen, numClues };
}

/* ─── Puzzle generation ─── */
function generatePuzzle(seed: number) {
  const rng = seededRandom(seed);
  const diff = getDifficulty();

  for (let attempt = 0; attempt < 300; attempt++) {
    // Pick random start and end on different edges of the grid
    const start = pickEdgeCell(rng);
    let end = pickEdgeCell(rng);
    while (cellKey(end[0], end[1]) === cellKey(start[0], start[1]) ||
           manhattan(start, end) < 3) {
      end = pickEdgeCell(rng);
    }

    // Generate random self-avoiding path from start to end
    const path = randomWalk(rng, start, end, diff.minPathLen, diff.maxPathLen);
    if (!path) continue;

    // Compute clue values for ALL cells
    const pathSet = new Set(path.map(([r, c]) => cellKey(r, c)));
    const allClues = new Map<string, number>();
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        let count = 0;
        for (const [nr, nc] of getNeighbors(r, c)) {
          if (pathSet.has(cellKey(nr, nc))) count++;
        }
        allClues.set(cellKey(r, c), count);
      }
    }

    // Select most informative clue cells
    const clueSelection = selectClues(allClues, pathSet, start, end, diff.numClues, rng);

    // Verify uniqueness with solver
    const solutions = solvePuzzle(start, end, clueSelection, 2);
    if (solutions === 1) {
      const par = path.length; // par = path length (optimal moves = mark each cell once)
      return {
        start,
        end,
        clues: clueSelection,
        solutionPath: path,
        par,
      };
    }
  }

  // Fallback: simple L-shaped path with heavy clues
  const start: Cell = [0, 0];
  const end: Cell = [5, 5];
  const path: Cell[] = [
    [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 5], [2, 5], [3, 5], [4, 5], [5, 5],
  ];
  const pathSet = new Set(path.map(([r, c]) => cellKey(r, c)));
  const clues = new Map<string, number>();
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      let count = 0;
      for (const [nr, nc] of getNeighbors(r, c)) {
        if (pathSet.has(cellKey(nr, nc))) count++;
      }
      clues.set(cellKey(r, c), count);
    }
  }
  return { start, end, clues, solutionPath: path, par: path.length };
}

function pickEdgeCell(rng: () => number): Cell {
  const edge = Math.floor(rng() * 4);
  const pos = Math.floor(rng() * GRID);
  switch (edge) {
    case 0: return [0, pos];       // top
    case 1: return [GRID - 1, pos]; // bottom
    case 2: return [pos, 0];       // left
    default: return [pos, GRID - 1]; // right
  }
}

function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function randomWalk(
  rng: () => number,
  start: Cell,
  end: Cell,
  minLen: number,
  maxLen: number,
): Cell[] | null {
  const endKey = cellKey(end[0], end[1]);

  for (let trial = 0; trial < 50; trial++) {
    const path: Cell[] = [start];
    const visited = new Set<string>([cellKey(start[0], start[1])]);

    for (let step = 0; step < maxLen - 1; step++) {
      const [cr, cc] = path[path.length - 1];
      const neighbors = getNeighbors(cr, cc).filter(
        ([nr, nc]) => !visited.has(cellKey(nr, nc)) && cellKey(nr, nc) !== endKey,
      );

      // Can we reach end from here?
      const canEnd = getNeighbors(cr, cc).some(
        ([nr, nc]) => cellKey(nr, nc) === endKey,
      );

      if (canEnd && path.length >= minLen) {
        // End with some probability or if we're at max length
        if (rng() < 0.25 || step >= maxLen - 2) {
          path.push(end);
          return path;
        }
      }

      if (neighbors.length === 0) {
        // Stuck — try to end if possible
        if (canEnd && path.length >= minLen - 2) {
          path.push(end);
          return path;
        }
        break; // stuck, retry
      }

      // Bias toward end when path is getting long
      const biased = [...neighbors].sort((a, b) => {
        const dA = manhattan(a, end);
        const dB = manhattan(b, end);
        return dA - dB;
      });

      // Pick with slight bias toward end direction
      const idx = rng() < 0.4
        ? 0 // closest to end
        : Math.floor(rng() * neighbors.length);
      const next = biased[Math.min(idx, biased.length - 1)];

      path.push(next);
      visited.add(cellKey(next[0], next[1]));
    }

    // Try to end at end cell
    const last = path[path.length - 1];
    const canEnd = getNeighbors(last[0], last[1]).some(
      ([nr, nc]) => cellKey(nr, nc) === endKey,
    );
    if (canEnd && path.length >= minLen - 2) {
      path.push(end);
      return path;
    }
  }

  return null;
}

function selectClues(
  allClues: Map<string, number>,
  pathSet: Set<string>,
  start: Cell,
  end: Cell,
  targetCount: number,
  rng: () => number,
): Map<string, number> {
  // Prioritize: 0s (dead zones), 3s/4s (forcing), then others
  // Don't include start/end as clues (they're visually marked)
  const startKey = cellKey(start[0], start[1]);
  const endKey = cellKey(end[0], end[1]);

  const entries = Array.from(allClues.entries())
    .filter(([key]) => key !== startKey && key !== endKey);

  // Score by informativeness
  const scored = entries.map(([key, val]) => {
    let priority = 0;
    if (val === 0) priority = 10; // most constraining
    if (val === 4) priority = 9;
    if (val === 3) priority = 8;
    if (val === 1 && !pathSet.has(key)) priority = 6; // off-path with 1 neighbor
    if (val === 2) priority = 3; // common, less informative
    if (val === 1 && pathSet.has(key)) priority = 5; // endpoint indicator
    // Add randomness for variety
    priority += rng() * 2;
    return { key, val, priority };
  });

  scored.sort((a, b) => b.priority - a.priority);
  const selected = new Map<string, number>();
  for (let i = 0; i < Math.min(targetCount, scored.length); i++) {
    selected.set(scored[i].key, scored[i].val);
  }
  return selected;
}

/* ─── Solver for uniqueness verification ─── */
function solvePuzzle(
  start: Cell,
  end: Cell,
  clues: Map<string, number>,
  maxSolutions: number,
): number {
  let count = 0;
  let iterations = 0;
  const MAX_ITER = 200000;
  const endKey = cellKey(end[0], end[1]);

  const path: Cell[] = [start];
  const visited = new Set<string>([cellKey(start[0], start[1])]);

  function clueViolated(): boolean {
    for (const [key, target] of clues) {
      const [r, c] = key.split(',').map(Number);
      let pathNeighbors = 0;
      for (const [nr, nc] of getNeighbors(r, c)) {
        if (visited.has(cellKey(nr, nc))) pathNeighbors++;
      }
      if (pathNeighbors > target) return true; // too many
    }
    return false;
  }

  function allCluesSatisfied(): boolean {
    for (const [key, target] of clues) {
      const [r, c] = key.split(',').map(Number);
      let pathNeighbors = 0;
      for (const [nr, nc] of getNeighbors(r, c)) {
        if (visited.has(cellKey(nr, nc))) pathNeighbors++;
      }
      if (pathNeighbors !== target) return false;
    }
    return true;
  }

  function dfs(): void {
    if (count >= maxSolutions || iterations >= MAX_ITER) return;
    iterations++;

    const [cr, cc] = path[path.length - 1];

    // Try ending at end cell
    if (!visited.has(endKey)) {
      const canReachEnd = getNeighbors(cr, cc).some(
        ([nr, nc]) => cellKey(nr, nc) === endKey,
      );
      if (canReachEnd && path.length >= 3) {
        visited.add(endKey);
        path.push(end);
        if (allCluesSatisfied()) count++;
        path.pop();
        visited.delete(endKey);
        if (count >= maxSolutions) return;
      }
    }

    // Extend path
    for (const [nr, nc] of getNeighbors(cr, cc)) {
      const nk = cellKey(nr, nc);
      if (visited.has(nk) || nk === endKey) continue;

      visited.add(nk);
      path.push([nr, nc]);

      if (!clueViolated()) {
        dfs();
      }

      path.pop();
      visited.delete(nk);
      if (count >= maxSolutions || iterations >= MAX_ITER) return;
    }
  }

  dfs();
  return count;
}

/* ─── Path validation ─── */
function isValidPath(
  pathCells: Set<string>,
  start: Cell,
  end: Cell,
): boolean {
  const startKey = cellKey(start[0], start[1]);
  const endKey = cellKey(end[0], end[1]);

  if (!pathCells.has(startKey) || !pathCells.has(endKey)) return false;
  if (pathCells.size < 2) return false;

  // Walk from start following adjacent path cells
  const walked = new Set<string>();
  let current = startKey;
  walked.add(current);

  // Start should have exactly 1 path neighbor
  const startNeighborCount = getNeighbors(start[0], start[1])
    .filter(([nr, nc]) => pathCells.has(cellKey(nr, nc))).length;
  if (startNeighborCount !== 1) return false;

  // Walk until we reach end or get stuck
  for (let step = 0; step < pathCells.size; step++) {
    const [cr, cc] = current.split(',').map(Number);
    const neighbors = getNeighbors(cr, cc)
      .filter(([nr, nc]) => pathCells.has(cellKey(nr, nc)) && !walked.has(cellKey(nr, nc)));

    if (neighbors.length === 0) {
      // Should be at end
      return current === endKey && walked.size === pathCells.size;
    }
    if (neighbors.length > 1) return false; // branching

    const [nr, nc] = neighbors[0];
    current = cellKey(nr, nc);
    walked.add(current);
  }

  return current === endKey && walked.size === pathCells.size;
}

/* ═══════════════════════════════════════════ */
/*                 Component                   */
/* ═══════════════════════════════════════════ */
export default function Coil() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const puzzle = useMemo(() => generatePuzzle(seed), [seed]);

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor(maxGrid / GRID);
  const gridPx = GRID * (cellSize + GAP) - GAP;

  // Path cells always include start and end
  const startKey = cellKey(puzzle.start[0], puzzle.start[1]);
  const endKey = cellKey(puzzle.end[0], puzzle.end[1]);

  const [pathCells, setPathCells] = useState<Set<string>>(
    () => new Set([startKey, endKey]),
  );
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [moveCount, setMoveCount] = useState(0);

  // Animation refs
  const scaleRefs = useRef<Map<string, Animated.Value>>(new Map());
  function getScale(key: string): Animated.Value {
    if (!scaleRefs.current.has(key)) {
      scaleRefs.current.set(key, new Animated.Value(1));
    }
    return scaleRefs.current.get(key)!;
  }

  /* Count path neighbors for a cell */
  function pathNeighborCount(r: number, c: number): number {
    let count = 0;
    for (const [nr, nc] of getNeighbors(r, c)) {
      if (pathCells.has(cellKey(nr, nc))) count++;
    }
    return count;
  }

  /* Clue status */
  function clueStatus(r: number, c: number): 'none' | 'ok' | 'over' | 'under' {
    const key = cellKey(r, c);
    if (!puzzle.clues.has(key)) return 'none';
    const target = puzzle.clues.get(key)!;
    const actual = pathNeighborCount(r, c);
    if (actual === target) return 'ok';
    if (actual > target) return 'over';
    return 'under';
  }

  /* Toggle a cell on/off the path */
  const toggleCell = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      const key = cellKey(r, c);
      if (key === startKey || key === endKey) return; // can't toggle start/end

      const newPath = new Set(pathCells);
      const wasOn = newPath.has(key);

      if (wasOn) {
        newPath.delete(key);
      } else {
        newPath.add(key);
      }

      // Animate
      const scale = getScale(key);
      if (!wasOn) {
        scale.setValue(0.6);
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.sequence([
          Animated.timing(scale, { toValue: 0.8, duration: 60, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, friction: 5, tension: 150, useNativeDriver: true }),
        ]).start();
      }

      setPathCells(newPath);
      setMoveCount((m) => m + 1);

      // Check win: all clues satisfied + valid path
      let allOk = true;
      for (const [ck, target] of puzzle.clues) {
        const [cr, cc] = ck.split(',').map(Number);
        let count = 0;
        for (const [nr, nc] of getNeighbors(cr, cc)) {
          if (newPath.has(cellKey(nr, nc))) count++;
        }
        if (count !== target) { allOk = false; break; }
      }

      if (allOk && isValidPath(newPath, puzzle.start, puzzle.end)) {
        setGameOver(true);
        const moves = moveCount + 1;
        recordGame('coil', moves, puzzle.par, false).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [gameOver, pathCells, puzzle, moveCount, startKey, endKey],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('coil');
    setStats(s);
    setShowStats(true);
  }, []);

  /* Share text */
  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < GRID; r++) {
      let row = '';
      for (let c = 0; c < GRID; c++) {
        const key = cellKey(r, c);
        if (key === startKey) row += '\uD83D\uDFE2'; // green
        else if (key === endKey) row += '\uD83D\uDD34'; // red
        else if (pathCells.has(key)) row += '\uD83D\uDFE6'; // blue
        else row += '\u2B1B'; // black
      }
      rows.push(row);
    }
    const parText = moveCount <= puzzle.par
      ? `${moveCount} moves (par ${puzzle.par}) \u2B50`
      : `${moveCount} moves (par ${puzzle.par})`;
    return [
      `Coil Day #${puzzleDay} \uD83D\uDC0D`,
      rows.join('\n'),
      parText,
    ].join('\n');
  }

  /* Check if two adjacent cells are both on the path (for drawing connections) */
  function hasConnection(r1: number, c1: number, r2: number, c2: number): boolean {
    return pathCells.has(cellKey(r1, c1)) && pathCells.has(cellKey(r2, c2));
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Coil</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Mark cells to build a path from {'\uD83D\uDFE2'} to {'\uD83D\uDD34'}.
        Numbers show adjacent path cells.
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Moves</Text>
          <Text style={styles.infoValue}>{moveCount}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoValue}>{puzzle.par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Path</Text>
          <Text style={styles.infoValue}>{pathCells.size}</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridPx + GAP, height: gridPx + GAP }]}>
        {/* Connection lines between adjacent path cells */}
        {Array.from({ length: GRID }).map((_, r) =>
          Array.from({ length: GRID }).map((_, c) => {
            const connections: React.ReactNode[] = [];
            // Right connection
            if (c < GRID - 1 && hasConnection(r, c, r, c + 1)) {
              connections.push(
                <View
                  key={`conn-h-${r}-${c}`}
                  style={[
                    styles.connectionH,
                    {
                      left: c * (cellSize + GAP) + cellSize / 2,
                      top: r * (cellSize + GAP) + cellSize / 2 - 2,
                      width: cellSize + GAP,
                    },
                  ]}
                />,
              );
            }
            // Down connection
            if (r < GRID - 1 && hasConnection(r, c, r + 1, c)) {
              connections.push(
                <View
                  key={`conn-v-${r}-${c}`}
                  style={[
                    styles.connectionV,
                    {
                      left: c * (cellSize + GAP) + cellSize / 2 - 2,
                      top: r * (cellSize + GAP) + cellSize / 2,
                      height: cellSize + GAP,
                    },
                  ]}
                />,
              );
            }
            return connections;
          }),
        )}

        {/* Cells */}
        {Array.from({ length: GRID }).map((_, r) =>
          Array.from({ length: GRID }).map((_, c) => {
            const key = cellKey(r, c);
            const isOnPath = pathCells.has(key);
            const isStart = key === startKey;
            const isEnd = key === endKey;
            const clue = puzzle.clues.get(key);
            const status = clueStatus(r, c);
            const scale = getScale(key);

            let bgColor = '#1e1e20';
            if (isStart) bgColor = START_COLOR;
            else if (isEnd) bgColor = END_COLOR;
            else if (isOnPath) bgColor = PATH_COLOR;

            return (
              <Pressable
                key={key}
                onPress={() => toggleCell(r, c)}
              >
                <Animated.View
                  style={[
                    styles.cell,
                    {
                      position: 'absolute',
                      left: c * (cellSize + GAP),
                      top: r * (cellSize + GAP),
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: bgColor,
                      transform: [{ scale }],
                    },
                  ]}
                >
                  {clue !== undefined && (
                    <Text
                      style={[
                        styles.clueText,
                        status === 'ok' && styles.clueOk,
                        status === 'over' && styles.clueOver,
                        (isOnPath || isStart || isEnd) && styles.clueOnPath,
                      ]}
                    >
                      {clue}
                    </Text>
                  )}
                  {isStart && clue === undefined && (
                    <Text style={styles.marker}>{'\uD83D\uDFE2'}</Text>
                  )}
                  {isEnd && clue === undefined && (
                    <Text style={styles.marker}>{'\uD83D\uDD34'}</Text>
                  )}
                </Animated.View>
              </Pressable>
            );
          }),
        )}
      </View>

      <CelebrationBurst show={gameOver} />

      {gameOver && (
        <View style={styles.endMessage}>
          <Text style={styles.endEmoji}>{'\uD83D\uDC0D'}</Text>
          <Text style={styles.endText}>
            {moveCount <= puzzle.par
              ? `Perfect! ${moveCount} moves (par ${puzzle.par})`
              : `Solved in ${moveCount} moves (par ${puzzle.par})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      {!gameOver && (
        <View style={styles.howTo}>
          <Text style={styles.howToTitle}>How to play</Text>
          <Text style={styles.howToText}>
            Tap cells to mark them as part of the path.{'\n'}
            The path must connect {'\uD83D\uDFE2'} to {'\uD83D\uDD34'} without branching.{'\n'}
            Each number shows how many of that cell{'\u2019'}s neighbors are on the path.{'\n'}
            Green = correct, Red = too many.
          </Text>
        </View>
      )}

      {showStats && stats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
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
  statsIcon: { fontSize: 24 },
  subtitle: {
    fontSize: 13,
    color: '#818384',
    marginTop: 2,
    marginBottom: 12,
    textAlign: 'center',
    maxWidth: 340,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
    alignItems: 'baseline',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 12 },
  infoValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  grid: {
    position: 'relative',
    marginBottom: 16,
  },
  cell: {
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  clueText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#777',
  },
  clueOk: { color: '#2ecc71' },
  clueOver: { color: '#e74c3c' },
  clueOnPath: { color: '#fff' },
  marker: { fontSize: 14 },
  connectionH: {
    position: 'absolute',
    height: 4,
    backgroundColor: PATH_COLOR,
    borderRadius: 2,
    zIndex: 1,
  },
  connectionV: {
    position: 'absolute',
    width: 4,
    backgroundColor: PATH_COLOR,
    borderRadius: 2,
    zIndex: 1,
  },
  endMessage: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
  },
  howTo: { marginTop: 8, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
});
