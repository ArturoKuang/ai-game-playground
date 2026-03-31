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
const SIZE = 5;

/* Edges are identified by position + orientation.
   Horizontal edges: between row r and r+1, at column c. Key: `h,${r},${c}` (r: 0..SIZE, c: 0..SIZE-1)
   Vertical edges: between col c and c+1, at row r. Key: `v,${r},${c}` (r: 0..SIZE-1, c: 0..SIZE)
*/

type EdgeKey = string;

function hEdge(r: number, c: number): EdgeKey {
  return `h,${r},${c}`;
}
function vEdge(r: number, c: number): EdgeKey {
  return `v,${r},${c}`;
}

/* Get the 4 edges surrounding cell (r, c) */
function cellEdges(r: number, c: number): EdgeKey[] {
  return [
    hEdge(r, c),     // top
    hEdge(r + 1, c), // bottom
    vEdge(r, c),     // left
    vEdge(r, c + 1), // right
  ];
}

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  // More clues on easy days (more constrained = easier to solve)
  const clueCount = Math.max(8, 18 - d * 2); // Mon:16, Fri:8
  return { clueCount };
}

/* ─── Puzzle generation: build solution first, then derive clues ─── */
function generatePuzzle(seed: number, clueCount: number) {
  const rng = seededRandom(seed);

  // Generate a random set of walls (edges) that form a connected network
  const allEdges: EdgeKey[] = [];
  for (let r = 0; r <= SIZE; r++)
    for (let c = 0; c < SIZE; c++) allEdges.push(hEdge(r, c));
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c <= SIZE; c++) allEdges.push(vEdge(r, c));

  // Start with a spanning tree of cells, placing walls on shared edges
  // Use random walk to create an interesting wall pattern
  const solution = new Set<EdgeKey>();

  // Place ~40-60% of edges as walls
  const targetWalls = Math.floor(allEdges.length * (0.35 + rng() * 0.2));
  const shuffled = [...allEdges];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  for (let i = 0; i < targetWalls && i < shuffled.length; i++) {
    solution.add(shuffled[i]);
  }

  // Compute clue numbers for each cell
  const clueGrid: (number | null)[][] = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(null),
  );

  // All cells get clue values computed from solution
  const allCells: [number, number][] = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) allCells.push([r, c]);

  // Shuffle and pick clueCount cells to show
  const cellShuffled = [...allCells];
  for (let i = cellShuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cellShuffled[i], cellShuffled[j]] = [cellShuffled[j], cellShuffled[i]];
  }

  for (let i = 0; i < Math.min(clueCount, cellShuffled.length); i++) {
    const [r, c] = cellShuffled[i];
    let count = 0;
    for (const e of cellEdges(r, c)) {
      if (solution.has(e)) count++;
    }
    clueGrid[r][c] = count;
  }

  return { solution, clueGrid };
}

/* ─── Check if current walls satisfy all clues ─── */
function checkSolved(
  walls: Set<EdgeKey>,
  clueGrid: (number | null)[][],
): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (clueGrid[r][c] === null) continue;
      let count = 0;
      for (const e of cellEdges(r, c)) {
        if (walls.has(e)) count++;
      }
      if (count !== clueGrid[r][c]) return false;
    }
  }
  return true;
}

/* ─── Count walls around a cell ─── */
function wallCount(walls: Set<EdgeKey>, r: number, c: number): number {
  let count = 0;
  for (const e of cellEdges(r, c)) if (walls.has(e)) count++;
  return count;
}

/* ═══════════════════════════════════════════ */
/*                 Component                   */
/* ═══════════════════════════════════════════ */
export default function Walls() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const { solution, clueGrid } = useMemo(
    () => generatePuzzle(seed, diff.clueCount),
    [seed, diff],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor(maxGrid / SIZE);
  const gridWidth = SIZE * cellSize;

  const [walls, setWalls] = useState<Set<EdgeKey>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [moveCount, setMoveCount] = useState(0);

  const wallsPlaced = walls.size;
  const solutionSize = solution.size;

  /* Toggle a wall edge */
  const toggleEdge = useCallback(
    (edgeKey: EdgeKey) => {
      if (gameOver) return;
      const newWalls = new Set(walls);
      if (newWalls.has(edgeKey)) {
        newWalls.delete(edgeKey);
      } else {
        newWalls.add(edgeKey);
      }
      setWalls(newWalls);
      setMoveCount((m) => m + 1);

      // Check solution
      if (checkSolved(newWalls, clueGrid)) {
        // Verify wall count matches solution size (prevents trivial solutions)
        if (newWalls.size === solution.size) {
          setGameOver(true);
          recordGame('walls', moveCount + 1, solutionSize, false).then(
            (s) => {
              setStats(s);
              setShowStats(true);
            },
          );
        }
      }
    },
    [gameOver, walls, clueGrid, solution, moveCount, solutionSize],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('walls');
    setStats(s);
    setShowStats(true);
  }, []);

  /* Check if a cell's clue is satisfied, violated, or in progress */
  function clueStatus(
    r: number,
    c: number,
  ): 'none' | 'ok' | 'over' | 'under' {
    const clue = clueGrid[r][c];
    if (clue === null) return 'none';
    const count = wallCount(walls, r, c);
    if (count === clue) return 'ok';
    if (count > clue) return 'over';
    return 'under';
  }

  function buildShareText(): string {
    // Build a simplified wall map
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const status = clueStatus(r, c);
        if (clueGrid[r][c] !== null) {
          row +=
            status === 'ok'
              ? '\uD83D\uDFE2'
              : status === 'over'
                ? '\uD83D\uDFE5'
                : '\uD83D\uDFE1';
        } else {
          row += '\u2B1C';
        }
      }
      rows.push(row);
    }
    return [
      `Walls Day #${puzzleDay} \uD83E\uDDF1`,
      rows.join('\n'),
      gameOver
        ? `Solved in ${moveCount} moves! \u2B50`
        : `${wallsPlaced} walls placed`,
    ].join('\n');
  }

  /* ─── Render edge tap targets ─── */
  const EDGE_THICK = 6;
  const TAP_SIZE = 20;

  function renderHEdge(r: number, c: number) {
    const ek = hEdge(r, c);
    const active = walls.has(ek);
    const x = c * cellSize;
    const y = r * cellSize - EDGE_THICK / 2;
    return (
      <Pressable
        key={ek}
        onPress={() => toggleEdge(ek)}
        style={[
          styles.hEdge,
          {
            left: x + TAP_SIZE / 2,
            top: y,
            width: cellSize - TAP_SIZE,
            height: TAP_SIZE,
          },
        ]}
      >
        <View
          style={[
            styles.edgeLine,
            {
              width: cellSize - TAP_SIZE,
              height: EDGE_THICK,
              backgroundColor: active ? '#e74c3c' : 'transparent',
              borderColor: active ? '#e74c3c' : '#444',
              borderWidth: active ? 0 : 1,
              borderStyle: 'dashed',
            },
          ]}
        />
      </Pressable>
    );
  }

  function renderVEdge(r: number, c: number) {
    const ek = vEdge(r, c);
    const active = walls.has(ek);
    const x = c * cellSize - EDGE_THICK / 2;
    const y = r * cellSize;
    return (
      <Pressable
        key={ek}
        onPress={() => toggleEdge(ek)}
        style={[
          styles.vEdge,
          {
            left: x,
            top: y + TAP_SIZE / 2,
            width: TAP_SIZE,
            height: cellSize - TAP_SIZE,
          },
        ]}
      >
        <View
          style={[
            styles.edgeLine,
            {
              width: EDGE_THICK,
              height: cellSize - TAP_SIZE,
              backgroundColor: active ? '#e74c3c' : 'transparent',
              borderColor: active ? '#e74c3c' : '#444',
              borderWidth: active ? 0 : 1,
              borderStyle: 'dashed',
            },
          ]}
        />
      </Pressable>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Walls</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Place walls on edges. Each number tells how many of its 4 edges
        have walls.
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Walls</Text>
          <Text style={styles.infoValue}>{wallsPlaced}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Moves</Text>
          <Text style={styles.infoValue}>{moveCount}</Text>
        </View>
      </View>

      {/* Grid with edge tap targets */}
      <View
        style={[
          styles.gridContainer,
          { width: gridWidth + TAP_SIZE, height: gridWidth + TAP_SIZE },
        ]}
      >
        {/* Cells with clue numbers */}
        {Array.from({ length: SIZE }).map((_, r) =>
          Array.from({ length: SIZE }).map((_, c) => {
            const clue = clueGrid[r][c];
            const status = clueStatus(r, c);
            return (
              <View
                key={`cell-${r}-${c}`}
                style={[
                  styles.cell,
                  {
                    left: c * cellSize + TAP_SIZE / 2,
                    top: r * cellSize + TAP_SIZE / 2,
                    width: cellSize - 1,
                    height: cellSize - 1,
                  },
                  status === 'ok' && styles.cellOk,
                  status === 'over' && styles.cellOver,
                ]}
              >
                {clue !== null && (
                  <Text
                    style={[
                      styles.clueText,
                      status === 'ok' && styles.clueOk,
                      status === 'over' && styles.clueOver,
                    ]}
                  >
                    {clue}
                  </Text>
                )}
              </View>
            );
          }),
        )}

        {/* Horizontal edges */}
        {Array.from({ length: SIZE + 1 }).map((_, r) =>
          Array.from({ length: SIZE }).map((_, c) =>
            renderHEdge(r, c),
          ),
        )}

        {/* Vertical edges */}
        {Array.from({ length: SIZE }).map((_, r) =>
          Array.from({ length: SIZE + 1 }).map((_, c) =>
            renderVEdge(r, c),
          ),
        )}

        {/* Grid dots at intersections */}
        {Array.from({ length: SIZE + 1 }).map((_, r) =>
          Array.from({ length: SIZE + 1 }).map((_, c) => (
            <View
              key={`dot-${r}-${c}`}
              style={[
                styles.dot,
                {
                  left: c * cellSize + TAP_SIZE / 2 - 3,
                  top: r * cellSize + TAP_SIZE / 2 - 3,
                },
              ]}
            />
          )),
        )}
      </View>

      <CelebrationBurst show={gameOver} />

      {gameOver && (
        <View style={styles.endMessage}>
          <Text style={styles.endEmoji}>{'\u2B50'}</Text>
          <Text style={styles.endText}>
            Solved in {moveCount} moves!
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap edges between cells to place or remove walls.
          Each number tells exactly how many of that cell{'\u2019'}s
          4 edges should have walls.{'\n\n'}
          Green numbers are satisfied. Red means too many walls.
          Deduce where every wall goes!
        </Text>
      </View>

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
  gridContainer: {
    position: 'relative',
  },
  cell: {
    position: 'absolute',
    backgroundColor: '#1e1e20',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  cellOk: { backgroundColor: '#1a3a1a' },
  cellOver: { backgroundColor: '#3a1a1a' },
  clueText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#999',
  },
  clueOk: { color: '#2ecc71' },
  clueOver: { color: '#e74c3c' },
  hEdge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  vEdge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  edgeLine: {
    borderRadius: 3,
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
    zIndex: 20,
  },
  endMessage: { alignItems: 'center', marginTop: 20 },
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
