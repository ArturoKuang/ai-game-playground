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

/* ─── Types ─── */
type Cell = [number, number]; // [row, col]
type Shape = Cell[];
type PlacedShape = { shapeIdx: number; cells: Cell[]; rotation: number };

/* ─── Constants ─── */
const GRID = 6;
const GAP = 2;

const SHAPE_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6',
  '#e67e22', '#1abc9c', '#e91e63',
];

/* ─── Polyomino definitions (relative to origin) ─── */
const POLYOMINOES: Shape[] = [
  // Trominoes (3 cells)
  [[0,0],[0,1],[1,0]],           // L-tri
  [[0,0],[0,1],[0,2]],           // I-tri
  // Tetrominoes (4 cells)
  [[0,0],[0,1],[0,2],[0,3]],     // I
  [[0,0],[0,1],[1,0],[1,1]],     // O
  [[0,0],[0,1],[0,2],[1,1]],     // T
  [[0,0],[0,1],[1,1],[1,2]],     // S
  [[0,1],[0,2],[1,0],[1,1]],     // Z
  [[0,0],[0,1],[0,2],[1,0]],     // L
  [[0,0],[0,1],[0,2],[1,2]],     // J
];

/* ─── Shape utilities ─── */
function rotateShape(shape: Shape): Shape {
  // 90° clockwise: (r,c) -> (c, -r) then normalize
  const rotated: Shape = shape.map(([r, c]) => [c, -r]);
  const minR = Math.min(...rotated.map(([r]) => r));
  const minC = Math.min(...rotated.map(([, c]) => c));
  return rotated.map(([r, c]) => [r - minR, c - minC]);
}

function normalizeShape(shape: Shape): string {
  const sorted = [...shape].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return sorted.map(([r, c]) => `${r},${c}`).join('|');
}

function getRotations(shape: Shape): Shape[] {
  const seen = new Set<string>();
  const rots: Shape[] = [];
  let current = shape;
  for (let i = 0; i < 4; i++) {
    const key = normalizeShape(current);
    if (!seen.has(key)) {
      seen.add(key);
      rots.push(current);
    }
    current = rotateShape(current);
  }
  return rots;
}

function shapeBounds(shape: Shape): { rows: number; cols: number } {
  const maxR = Math.max(...shape.map(([r]) => r));
  const maxC = Math.max(...shape.map(([, c]) => c));
  return { rows: maxR + 1, cols: maxC + 1 };
}

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  // Mon: 3 shapes (1 tri + 2 tet), Fri: 5 shapes (1 tri + 4 tet)
  // Only 2 tromino types exist, so cap at 2
  const numTri = d <= 2 ? 2 : 1;
  const numTet = d <= 2 ? 1 + Math.floor(d / 2) : d - 1;
  const totalShapes = Math.min(numTri + numTet, 5);
  return { numTri: Math.min(numTri, 2), numTet: totalShapes - Math.min(numTri, 2) };
}

/* ─── Puzzle generation: place shapes, derive clues, verify uniqueness ─── */
function generatePuzzle(seed: number) {
  const rng = seededRandom(seed);
  const diff = getDifficulty();
  const numShapes = diff.numTri + diff.numTet;

  // Pick shape templates
  const triIndices = [0, 1]; // indices into POLYOMINOES
  const tetIndices = [2, 3, 4, 5, 6, 7, 8];

  function pickRandom<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  // Try to generate a valid puzzle (with retries)
  for (let attempt = 0; attempt < 200; attempt++) {
    const chosenTri = pickRandom(triIndices, diff.numTri);
    const chosenTet = pickRandom(tetIndices, diff.numTet);
    const chosenIndices = [...chosenTri, ...chosenTet];

    // For each shape, pick a random rotation
    const shapeRotations: Shape[] = chosenIndices.map((idx) => {
      const rots = getRotations(POLYOMINOES[idx]);
      return rots[Math.floor(rng() * rots.length)];
    });

    // Try to place all shapes on the grid without overlap
    const grid: number[][] = Array.from({ length: GRID }, () => Array(GRID).fill(-1));
    const placements: PlacedShape[] = [];
    let success = true;

    for (let si = 0; si < shapeRotations.length; si++) {
      const shape = shapeRotations[si];
      const bounds = shapeBounds(shape);

      // Collect all valid positions
      const validPositions: Cell[] = [];
      for (let r = 0; r <= GRID - bounds.rows; r++) {
        for (let c = 0; c <= GRID - bounds.cols; c++) {
          const canPlace = shape.every(
            ([sr, sc]) => grid[r + sr][c + sc] === -1
          );
          if (canPlace) validPositions.push([r, c]);
        }
      }

      if (validPositions.length === 0) {
        success = false;
        break;
      }

      // Pick a random valid position
      const [pr, pc] = validPositions[Math.floor(rng() * validPositions.length)];
      const cells: Cell[] = shape.map(([sr, sc]) => [pr + sr, pc + sc]);
      cells.forEach(([cr, cc]) => { grid[cr][cc] = si; });
      placements.push({ shapeIdx: chosenIndices[si], cells, rotation: 0 });
    }

    if (!success) continue;

    // Derive row and column clues
    const rowClues = Array(GRID).fill(0);
    const colClues = Array(GRID).fill(0);
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (grid[r][c] !== -1) {
          rowClues[r]++;
          colClues[c]++;
        }
      }
    }

    // Verify uniqueness via backtracking solver
    const solutionCount = countSolutions(
      chosenIndices.map((idx) => POLYOMINOES[idx]),
      rowClues,
      colClues,
      2 // stop after finding 2 solutions
    );

    if (solutionCount === 1) {
      // Compute par: number of shapes (each placement is 1 move; rotations add more)
      const totalCells = placements.reduce((s, p) => s + p.cells.length, 0);
      const par = numShapes; // par = placing each shape once (ideal)
      return {
        shapes: chosenIndices.map((idx) => POLYOMINOES[idx]),
        rowClues,
        colClues,
        solution: placements,
        par,
        totalCells,
      };
    }
  }

  // Fallback: return a simple puzzle if generation fails
  // (Should rarely happen with enough retries)
  const shapes = [POLYOMINOES[0]]; // single L-tri
  const rowClues = [2, 1, 0, 0, 0, 0];
  const colClues = [2, 1, 0, 0, 0, 0];
  return {
    shapes,
    rowClues,
    colClues,
    solution: [{ shapeIdx: 0, cells: [[0,0],[0,1],[1,0]] as Cell[], rotation: 0 }],
    par: 1,
    totalCells: 3,
  };
}

/* ─── Uniqueness solver ─── */
function countSolutions(
  shapes: Shape[],
  rowClues: number[],
  colClues: number[],
  maxCount: number
): number {
  let count = 0;
  const grid: number[][] = Array.from({ length: GRID }, () => Array(GRID).fill(-1));

  function canPlace(shape: Shape, r: number, c: number, idx: number): boolean {
    const bounds = shapeBounds(shape);
    if (r + bounds.rows > GRID || c + bounds.cols > GRID) return false;
    return shape.every(([sr, sc]) => grid[r + sr][c + sc] === -1);
  }

  function placeShape(shape: Shape, r: number, c: number, idx: number) {
    shape.forEach(([sr, sc]) => { grid[r + sr][c + sc] = idx; });
  }

  function removeShape(shape: Shape, r: number, c: number) {
    shape.forEach(([sr, sc]) => { grid[r + sr][c + sc] = -1; });
  }

  function checkClues(): boolean {
    for (let r = 0; r < GRID; r++) {
      let filled = 0;
      for (let c = 0; c < GRID; c++) if (grid[r][c] !== -1) filled++;
      if (filled !== rowClues[r]) return false;
    }
    for (let c = 0; c < GRID; c++) {
      let filled = 0;
      for (let r = 0; r < GRID; r++) if (grid[r][c] !== -1) filled++;
      if (filled !== colClues[c]) return false;
    }
    return true;
  }

  function partialCheck(shapeIdx: number): boolean {
    // Check that no row/col is OVER the target
    for (let r = 0; r < GRID; r++) {
      let filled = 0;
      for (let c = 0; c < GRID; c++) if (grid[r][c] !== -1) filled++;
      if (filled > rowClues[r]) return false;
    }
    for (let c = 0; c < GRID; c++) {
      let filled = 0;
      for (let r = 0; r < GRID; r++) if (grid[r][c] !== -1) filled++;
      if (filled > colClues[c]) return false;
    }
    return true;
  }

  function solve(shapeIdx: number) {
    if (count >= maxCount) return;

    if (shapeIdx === shapes.length) {
      if (checkClues()) count++;
      return;
    }

    const shape = shapes[shapeIdx];
    const rotations = getRotations(shape);

    for (const rot of rotations) {
      const bounds = shapeBounds(rot);
      for (let r = 0; r <= GRID - bounds.rows; r++) {
        for (let c = 0; c <= GRID - bounds.cols; c++) {
          if (canPlace(rot, r, c, shapeIdx)) {
            placeShape(rot, r, c, shapeIdx);
            if (partialCheck(shapeIdx)) {
              solve(shapeIdx + 1);
            }
            removeShape(rot, r, c);
            if (count >= maxCount) return;
          }
        }
      }
    }
  }

  solve(0);
  return count;
}

/* ═══════════════════════════════════════════ */
/*                 Component                   */
/* ═══════════════════════════════════════════ */
export default function Fit() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const puzzle = useMemo(() => generatePuzzle(seed), [seed]);

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 80, 320);
  const cellSize = Math.floor(maxGrid / GRID);
  const gridPx = GRID * (cellSize + GAP) - GAP;

  const [placedShapes, setPlacedShapes] = useState<Map<number, Cell[]>>(new Map());
  const [selectedShape, setSelectedShape] = useState<number | null>(null);
  const [selectedRotation, setSelectedRotation] = useState<number>(0);
  const [ghostCells, setGhostCells] = useState<Cell[] | null>(null); // preview before confirm
  const [ghostAnchor, setGhostAnchor] = useState<Cell | null>(null); // anchor cell of ghost
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [moveCount, setMoveCount] = useState(0);

  // Animation refs per cell
  const scaleRefs = useRef<Map<string, Animated.Value>>(new Map());
  function getScale(r: number, c: number): Animated.Value {
    const key = `${r},${c}`;
    if (!scaleRefs.current.has(key)) {
      scaleRefs.current.set(key, new Animated.Value(1));
    }
    return scaleRefs.current.get(key)!;
  }

  /* Build current grid state from placed shapes */
  const gridState = useMemo(() => {
    const g: number[][] = Array.from({ length: GRID }, () => Array(GRID).fill(-1));
    placedShapes.forEach((cells, shapeIdx) => {
      cells.forEach(([r, c]) => { g[r][c] = shapeIdx; });
    });
    return g;
  }, [placedShapes]);

  /* Current row/col fills */
  const rowFills = useMemo(() => {
    const fills = Array(GRID).fill(0);
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (gridState[r][c] !== -1) fills[r]++;
    return fills;
  }, [gridState]);

  const colFills = useMemo(() => {
    const fills = Array(GRID).fill(0);
    for (let c = 0; c < GRID; c++)
      for (let r = 0; r < GRID; r++)
        if (gridState[r][c] !== -1) fills[c]++;
    return fills;
  }, [gridState]);

  /* Get the preview cells for currently selected shape at hover position */
  const getPreviewCells = useCallback(
    (r: number, c: number): Cell[] | null => {
      if (selectedShape === null) return null;
      const shape = puzzle.shapes[selectedShape];
      const rots = getRotations(shape);
      const rot = rots[selectedRotation % rots.length];
      const cells: Cell[] = rot.map(([sr, sc]) => [r + sr, c + sc]);
      // Check bounds
      if (cells.some(([cr, cc]) => cr < 0 || cr >= GRID || cc < 0 || cc >= GRID))
        return null;
      // Check overlap with existing placements (but not the same shape if re-placing)
      if (cells.some(([cr, cc]) => {
        const occupant = gridState[cr][cc];
        return occupant !== -1 && occupant !== selectedShape;
      }))
        return null;
      return cells;
    },
    [selectedShape, selectedRotation, puzzle.shapes, gridState]
  );

  /* Place a shape */
  const placeShapeAt = useCallback(
    (r: number, c: number) => {
      if (selectedShape === null || gameOver) return;
      const cells = getPreviewCells(r, c);
      if (!cells) return;

      // Animate placement
      cells.forEach(([cr, cc]) => {
        const scale = getScale(cr, cc);
        scale.setValue(0.5);
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }).start();
      });

      const newPlaced = new Map(placedShapes);
      // Remove old placement if re-placing
      if (newPlaced.has(selectedShape)) {
        newPlaced.delete(selectedShape);
      }
      newPlaced.set(selectedShape, cells);
      setPlacedShapes(newPlaced);
      setMoveCount((m) => m + 1);
      setSelectedShape(null);
      setSelectedRotation(0);

      // Check if all shapes placed and clues satisfied
      if (newPlaced.size === puzzle.shapes.length) {
        const newGrid: number[][] = Array.from({ length: GRID }, () => Array(GRID).fill(-1));
        newPlaced.forEach((cs, idx) => cs.forEach(([cr, cc]) => { newGrid[cr][cc] = idx; }));

        let solved = true;
        for (let row = 0; row < GRID; row++) {
          let filled = 0;
          for (let col = 0; col < GRID; col++) if (newGrid[row][col] !== -1) filled++;
          if (filled !== puzzle.rowClues[row]) { solved = false; break; }
        }
        if (solved) {
          for (let col = 0; col < GRID; col++) {
            let filled = 0;
            for (let row = 0; row < GRID; row++) if (newGrid[row][col] !== -1) filled++;
            if (filled !== puzzle.colClues[col]) { solved = false; break; }
          }
        }

        if (solved) {
          setGameOver(true);
          const moves = moveCount + 1;
          recordGame('fit', moves, puzzle.par, false).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        }
      }
    },
    [selectedShape, gameOver, getPreviewCells, placedShapes, puzzle, moveCount]
  );

  /* Remove a placed shape (tap to pick it back up — costs a move) */
  const pickUpShape = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      const shapeIdx = gridState[r][c];
      if (shapeIdx === -1) return;
      setSelectedShape(shapeIdx);
      setSelectedRotation(0);
      setGhostCells(null);
      setGhostAnchor(null);
      const newPlaced = new Map(placedShapes);
      newPlaced.delete(shapeIdx);
      setPlacedShapes(newPlaced);
      setMoveCount((m) => m + 1); // re-placement penalty
    },
    [gameOver, gridState, placedShapes]
  );

  const handleCellPress = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;

      if (selectedShape !== null) {
        const cells = getPreviewCells(r, c);
        if (!cells) return;

        // Two-tap: first tap shows ghost, second tap on same anchor confirms
        if (ghostAnchor && ghostAnchor[0] === r && ghostAnchor[1] === c) {
          // Confirm placement
          placeShapeAt(r, c);
          setGhostCells(null);
          setGhostAnchor(null);
        } else {
          // Show ghost preview
          setGhostCells(cells);
          setGhostAnchor([r, c]);
        }
      } else if (gridState[r][c] !== -1) {
        pickUpShape(r, c);
      }
    },
    [gameOver, selectedShape, getPreviewCells, placeShapeAt, gridState, pickUpShape, ghostAnchor]
  );

  /* Rotate selected shape — clears ghost to force re-preview */
  const rotateSelected = useCallback(() => {
    if (selectedShape === null) return;
    const rots = getRotations(puzzle.shapes[selectedShape]);
    setSelectedRotation((r) => (r + 1) % rots.length);
    setGhostCells(null);
    setGhostAnchor(null);
  }, [selectedShape, puzzle.shapes]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('fit');
    setStats(s);
    setShowStats(true);
  }, []);

  /* Share text */
  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < GRID; r++) {
      let row = '';
      for (let c = 0; c < GRID; c++) {
        const idx = gridState[r][c];
        if (idx === -1) {
          row += '\u2B1B'; // black square
        } else {
          const emojis = ['\uD83D\uDFE5', '\uD83D\uDFE6', '\uD83D\uDFE9', '\uD83D\uDFE8', '\uD83D\uDFEA', '\uD83D\uDFE7'];
          row += emojis[idx % emojis.length];
        }
      }
      rows.push(row);
    }
    const parText = moveCount <= puzzle.par
      ? `${moveCount} moves (par ${puzzle.par}) \u2B50`
      : `${moveCount} moves (par ${puzzle.par})`;
    return [
      `Fit Day #${puzzleDay} \uD83E\uDDE9`,
      rows.join('\n'),
      parText,
    ].join('\n');
  }

  /* ─── Clue status ─── */
  function clueStatus(actual: number, target: number): 'ok' | 'over' | 'under' {
    if (actual === target) return 'ok';
    if (actual > target) return 'over';
    return 'under';
  }

  /* ─── Render selected shape preview in tray ─── */
  function renderShapePreview(shapeIdx: number) {
    const shape = puzzle.shapes[shapeIdx];
    const isSelected = selectedShape === shapeIdx;
    const isPlaced = placedShapes.has(shapeIdx);
    const rots = getRotations(shape);
    const displayShape = isSelected ? rots[selectedRotation % rots.length] : shape;
    const bounds = shapeBounds(displayShape);
    const previewCell = 24;

    return (
      <Pressable
        key={shapeIdx}
        onPress={() => {
          if (gameOver) return;
          if (isSelected) {
            setSelectedShape(null);
            setGhostCells(null);
            setGhostAnchor(null);
          } else {
            setSelectedShape(shapeIdx);
            setSelectedRotation(0);
            setGhostCells(null);
            setGhostAnchor(null);
          }
        }}
        style={[
          styles.shapeTray,
          isSelected && styles.shapeTraySelected,
          isPlaced && !isSelected && styles.shapeTrayPlaced,
        ]}
      >
        <View
          style={{
            width: bounds.cols * previewCell,
            height: bounds.rows * previewCell,
            position: 'relative',
          }}
        >
          {displayShape.map(([r, c], i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: c * previewCell,
                top: r * previewCell,
                width: previewCell - 1,
                height: previewCell - 1,
                backgroundColor: isPlaced && !isSelected
                  ? '#555'
                  : SHAPE_COLORS[shapeIdx % SHAPE_COLORS.length],
                borderRadius: 2,
              }}
            />
          ))}
        </View>
      </Pressable>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fit</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Place all shapes to match the row & column targets.
        {selectedShape !== null ? ' Tap to preview, tap again to place.' : ''}
      </Text>

      {/* Info row */}
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
          <Text style={styles.infoLabel}>Placed</Text>
          <Text style={styles.infoValue}>
            {placedShapes.size}/{puzzle.shapes.length}
          </Text>
        </View>
      </View>

      {/* Grid with column clues on top and row clues on left */}
      <View style={styles.gridArea}>
        {/* Column clues */}
        <View style={{ flexDirection: 'row', marginLeft: cellSize + GAP + 4 }}>
          {puzzle.colClues.map((clue, c) => {
            const status = clueStatus(colFills[c], clue);
            return (
              <View
                key={`cc-${c}`}
                style={[styles.clueBox, { width: cellSize + GAP }]}
              >
                <Text
                  style={[
                    styles.clueText,
                    status === 'ok' && styles.clueOk,
                    status === 'over' && styles.clueOver,
                  ]}
                >
                  {clue}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Grid rows with row clues */}
        {Array.from({ length: GRID }).map((_, r) => (
          <View key={`row-${r}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Row clue */}
            <View style={[styles.clueBox, { width: cellSize, height: cellSize + GAP }]}>
              <Text
                style={[
                  styles.clueText,
                  clueStatus(rowFills[r], puzzle.rowClues[r]) === 'ok' && styles.clueOk,
                  clueStatus(rowFills[r], puzzle.rowClues[r]) === 'over' && styles.clueOver,
                ]}
              >
                {puzzle.rowClues[r]}
              </Text>
            </View>

            {/* Grid cells */}
            {Array.from({ length: GRID }).map((_, c) => {
              const occupant = gridState[r][c];
              const isFilled = occupant !== -1;
              const isGhost = ghostCells?.some(([gr, gc]) => gr === r && gc === c) ?? false;
              const scale = getScale(r, c);

              let bgColor = '#1e1e20';
              if (isFilled) {
                bgColor = SHAPE_COLORS[occupant % SHAPE_COLORS.length];
              } else if (isGhost && selectedShape !== null) {
                bgColor = SHAPE_COLORS[selectedShape % SHAPE_COLORS.length] + '55'; // 33% opacity
              }

              return (
                <Pressable
                  key={`cell-${r}-${c}`}
                  onPress={() => handleCellPress(r, c)}
                >
                  <Animated.View
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        marginRight: c < GRID - 1 ? GAP : 0,
                        marginBottom: r < GRID - 1 ? GAP : 0,
                        backgroundColor: bgColor,
                        borderWidth: isGhost ? 2 : 0,
                        borderColor: isGhost && selectedShape !== null
                          ? SHAPE_COLORS[selectedShape % SHAPE_COLORS.length]
                          : 'transparent',
                        transform: [{ scale }],
                      },
                    ]}
                  >
                    {isFilled && (
                      <Text style={styles.cellShapeLabel}>
                        {occupant + 1}
                      </Text>
                    )}
                    {isGhost && !isFilled && (
                      <Text style={styles.ghostLabel}>{'?'}</Text>
                    )}
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Shape tray */}
      <View style={styles.trayContainer}>
        <Text style={styles.trayLabel}>Shapes</Text>
        <View style={styles.tray}>
          {puzzle.shapes.map((_, i) => renderShapePreview(i))}
        </View>
        {selectedShape !== null && (
          <Pressable onPress={rotateSelected} style={styles.rotateBtn}>
            <Text style={styles.rotateBtnText}>{'\uD83D\uDD04'} Rotate</Text>
          </Pressable>
        )}
      </View>

      <CelebrationBurst show={gameOver} />

      {gameOver && (
        <View style={styles.endMessage}>
          <Text style={styles.endEmoji}>{'\uD83E\uDDE9'}</Text>
          <Text style={styles.endText}>
            {moveCount <= puzzle.par
              ? `Perfect! ${moveCount} moves (par ${puzzle.par})`
              : `Solved in ${moveCount} moves (par ${puzzle.par})`}
          </Text>
          <ShareButton text={buildShareText()} />
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
  gridArea: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  clueBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clueText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#666',
  },
  clueOk: { color: '#2ecc71' },
  clueOver: { color: '#e74c3c' },
  cell: {
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellShapeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  ghostLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  trayContainer: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  trayLabel: {
    color: '#818384',
    fontSize: 12,
    marginBottom: 6,
  },
  tray: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  shapeTray: {
    padding: 8,
    backgroundColor: '#1e1e20',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    minHeight: 50,
  },
  shapeTraySelected: {
    borderColor: '#f1c40f',
    backgroundColor: '#2a2a2c',
  },
  shapeTrayPlaced: {
    opacity: 0.4,
  },
  rotateBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2a2a2c',
    borderRadius: 6,
  },
  rotateBtnText: {
    color: '#f1c40f',
    fontSize: 14,
    fontWeight: '700',
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
});
