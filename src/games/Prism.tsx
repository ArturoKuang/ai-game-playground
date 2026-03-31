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
const SIZE = 4;
const NUM_COLORS = 4;
const GAP = 4;

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
const COLOR_EMOJI = ['🔴', '🔵', '🟢', '🟡'];
const COLOR_DIM = ['#7a2a20', '#1c5a7a', '#1a7a3e', '#7a6210'];

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1 (Mon) – 5 (Fri)
  const preReveals = Math.max(1, 6 - d); // Mon: 5, Fri: 1
  return { preReveals, difficulty: d };
}

/* ─── Latin Square Generator ─── */
function generateLatinSquare(seed: number): number[][] {
  const rng = seededRandom(seed);
  const grid: number[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(-1));

  function shuffle(arr: number[]): number[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function isValid(row: number, col: number, val: number): boolean {
    for (let c = 0; c < col; c++) if (grid[row][c] === val) return false;
    for (let r = 0; r < row; r++) if (grid[r][col] === val) return false;
    return true;
  }

  function fill(pos: number): boolean {
    if (pos === SIZE * SIZE) return true;
    const row = Math.floor(pos / SIZE);
    const col = pos % SIZE;
    const candidates = shuffle(Array.from({ length: NUM_COLORS }, (_, i) => i));
    for (const val of candidates) {
      if (isValid(row, col, val)) {
        grid[row][col] = val;
        if (fill(pos + 1)) return true;
        grid[row][col] = -1;
      }
    }
    return false;
  }

  fill(0);
  return grid;
}

/* ─── Select pre-reveal cells (spread across rows/cols) ─── */
function selectPreReveals(seed: number, count: number): Set<number> {
  const rng = seededRandom(seed + 9999);
  const revealed = new Set<number>();
  const usedRows = new Set<number>();
  const usedCols = new Set<number>();

  // First pass: one per row/col for diversity
  const positions = Array.from({ length: SIZE * SIZE }, (_, i) => i);
  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  for (const pos of positions) {
    if (revealed.size >= count) break;
    const r = Math.floor(pos / SIZE);
    const c = pos % SIZE;
    if (!usedRows.has(r) && !usedCols.has(c)) {
      revealed.add(pos);
      usedRows.add(r);
      usedCols.add(c);
    }
  }

  // Second pass: fill remaining if needed
  for (const pos of positions) {
    if (revealed.size >= count) break;
    if (!revealed.has(pos)) revealed.add(pos);
  }

  return revealed;
}

/* ─── Compute possibilities per cell ─── */
function computePossibilities(
  solvedCells: Map<number, number>,
): Map<number, Set<number>> {
  const possibilities = new Map<number, Set<number>>();

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const key = r * SIZE + c;
      if (solvedCells.has(key)) continue;

      const possible = new Set(Array.from({ length: NUM_COLORS }, (_, i) => i));

      // Eliminate colors already placed in this row
      for (let cc = 0; cc < SIZE; cc++) {
        const nk = r * SIZE + cc;
        if (solvedCells.has(nk)) possible.delete(solvedCells.get(nk)!);
      }
      // Eliminate colors already placed in this column
      for (let rr = 0; rr < SIZE; rr++) {
        const nk = rr * SIZE + c;
        if (solvedCells.has(nk)) possible.delete(solvedCells.get(nk)!);
      }

      possibilities.set(key, possible);
    }
  }

  return possibilities;
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Prism() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const hiddenGrid = useMemo(() => generateLatinSquare(seed), [seed]);
  const preRevealedSet = useMemo(
    () => selectPreReveals(seed, diff.preReveals),
    [seed, diff.preReveals],
  );

  const cellsToSolve = SIZE * SIZE - diff.preReveals;
  const par = cellsToSolve + 2; // Allow 2 wrong guesses

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  /* State */
  const [selectedColor, setSelectedColor] = useState<number>(0);
  const [solvedCells, setSolvedCells] = useState<Map<number, number>>(() => {
    const m = new Map<number, number>();
    for (const pos of preRevealedSet) {
      const r = Math.floor(pos / SIZE);
      const c = pos % SIZE;
      m.set(pos, hiddenGrid[r][c]);
    }
    return m;
  });
  const [triedColors, setTriedColors] = useState<Map<number, Set<number>>>(
    () => new Map(),
  );
  const [guessCount, setGuessCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  // Track guesses per cell for share text
  const [guessesPerCell, setGuessesPerCell] = useState<Map<number, number>>(
    () => new Map(),
  );

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  const shakeXValues = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(0)),
  ).current;

  /* Derived: possibilities per unsolved cell */
  const possibilities = useMemo(
    () => computePossibilities(solvedCells),
    [solvedCells],
  );

  /* ─── Handle cell tap ─── */
  const handleCellTap = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      const key = r * SIZE + c;
      if (solvedCells.has(key)) return; // Already solved

      const hiddenColor = hiddenGrid[r][c];
      const newGuessCount = guessCount + 1;
      setGuessCount(newGuessCount);

      const newGuessesPerCell = new Map(guessesPerCell);
      newGuessesPerCell.set(key, (newGuessesPerCell.get(key) || 0) + 1);
      setGuessesPerCell(newGuessesPerCell);

      if (selectedColor === hiddenColor) {
        // CORRECT — green!
        const newSolved = new Map(solvedCells);
        newSolved.set(key, hiddenColor);
        setSolvedCells(newSolved);

        // Success animation: bounce
        Animated.sequence([
          Animated.timing(cellScales[key], {
            toValue: 1.25,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(cellScales[key], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();

        // Check win
        if (newSolved.size === SIZE * SIZE) {
          setGameOver(true);
          recordGame('prism', newGuessCount, par, false).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        }
      } else {
        // WRONG — yellow! Mark as tried
        const newTried = new Map(triedColors);
        const cellTried = new Set(newTried.get(key) || []);
        cellTried.add(selectedColor);
        newTried.set(key, cellTried);
        setTriedColors(newTried);

        // Shake animation
        Animated.sequence([
          Animated.timing(shakeXValues[key], {
            toValue: 6,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(shakeXValues[key], {
            toValue: -6,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(shakeXValues[key], {
            toValue: 4,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(shakeXValues[key], {
            toValue: -4,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(shakeXValues[key], {
            toValue: 0,
            duration: 40,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
    [
      gameOver,
      selectedColor,
      solvedCells,
      triedColors,
      guessCount,
      guessesPerCell,
      hiddenGrid,
      par,
      cellScales,
      shakeXValues,
    ],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('prism');
    setStats(s);
    setShowStats(true);
  }, []);

  /* ─── Share text ─── */
  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const key = r * SIZE + c;
        if (preRevealedSet.has(key)) {
          row += '⬜';
        } else {
          const tries = guessesPerCell.get(key) || 0;
          if (tries <= 1) row += '🟩';
          else if (tries === 2) row += '🟨';
          else row += '🟥';
        }
      }
      rows.push(row);
    }
    const status = guessCount <= par ? '⚡' : '';
    return `🔮 Prism — Day #${puzzleDay} ${status}\n${guessCount} guesses (par ${par})\n\n${rows.join('\n')}\n\n⬜ given 🟩 first try 🟨 2 tries 🟥 3+`;
  }

  /* ─── Render ─── */
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <Text style={styles.dayLabel}>Day #{puzzleDay}</Text>
      <Text style={styles.subtitle}>
        Find the hidden colors — each color appears once per row & column
      </Text>

      {/* Score bar */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Guesses</Text>
          <Text style={styles.scoreValue}>{guessCount}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Par</Text>
          <Text style={styles.scoreValue}>{par}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Solved</Text>
          <Text style={styles.scoreValue}>
            {solvedCells.size - preRevealedSet.size}/{cellsToSolve}
          </Text>
        </View>
        <Pressable onPress={handleShowStats} style={styles.statsBtn}>
          <Text style={styles.statsBtnText}>📊</Text>
        </Pressable>
      </View>

      {/* Column constraint indicators */}
      <View style={[styles.colIndicatorRow, { width: gridWidth, marginLeft: 'auto', marginRight: 'auto' }]}>
        {Array.from({ length: SIZE }, (_, c) => {
          const placed: number[] = [];
          for (let r = 0; r < SIZE; r++) {
            const key = r * SIZE + c;
            if (solvedCells.has(key)) placed.push(solvedCells.get(key)!);
          }
          return (
            <View key={c} style={[styles.colIndicator, { width: cellSize }]}>
              {Array.from({ length: NUM_COLORS }, (_, ci) => (
                <View
                  key={ci}
                  style={[
                    styles.miniDot,
                    {
                      backgroundColor: placed.includes(ci)
                        ? COLORS[ci]
                        : '#2a2a2c',
                      opacity: placed.includes(ci) ? 1 : 0.3,
                    },
                  ]}
                />
              ))}
            </View>
          );
        })}
      </View>

      {/* Grid */}
      <View style={[styles.gridContainer, { width: gridWidth }]}>
        {Array.from({ length: SIZE }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {/* Row constraint indicator */}
            <View style={styles.rowIndicator}>
              {Array.from({ length: NUM_COLORS }, (_, ci) => {
                const placed = Array.from({ length: SIZE }, (__, c) => {
                  const key = r * SIZE + c;
                  return solvedCells.has(key) ? solvedCells.get(key)! : -1;
                }).includes(ci);
                return (
                  <View
                    key={ci}
                    style={[
                      styles.miniDot,
                      {
                        backgroundColor: placed ? COLORS[ci] : '#2a2a2c',
                        opacity: placed ? 1 : 0.3,
                      },
                    ]}
                  />
                );
              })}
            </View>

            {Array.from({ length: SIZE }, (_, c) => {
              const key = r * SIZE + c;
              const isSolved = solvedCells.has(key);
              const isPreRevealed = preRevealedSet.has(key);
              const solvedColor = isSolved ? solvedCells.get(key)! : -1;
              const cellTried = triedColors.get(key) || new Set<number>();
              const cellPossible = possibilities.get(key);

              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [
                      { scale: cellScales[key] },
                      { translateX: shakeXValues[key] },
                    ],
                  }}
                >
                  <Pressable
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: isSolved
                          ? COLORS[solvedColor]
                          : '#1a1a1b',
                        borderColor: isSolved
                          ? isPreRevealed
                            ? '#ffffff40'
                            : '#6aaa64'
                          : selectedColor !== null && !isSolved
                            ? COLORS[selectedColor] + '40'
                            : '#3a3a3c',
                        borderWidth: isSolved && !isPreRevealed ? 3 : 2,
                      },
                    ]}
                    onPress={() => handleCellTap(r, c)}
                    disabled={gameOver || isSolved}
                  >
                    {/* Show tried colors as small x-ed out dots */}
                    {!isSolved && cellTried.size > 0 && (
                      <View style={styles.triedRow}>
                        {Array.from(cellTried).map((ci) => (
                          <View
                            key={ci}
                            style={[
                              styles.triedDot,
                              { backgroundColor: COLOR_DIM[ci] },
                            ]}
                          >
                            <Text style={styles.triedX}>✕</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Show remaining possibilities count for unsolved cells */}
                    {!isSolved && cellPossible && cellPossible.size <= 2 && (
                      <View style={styles.possibleRow}>
                        {Array.from(cellPossible).map((ci) => (
                          <View
                            key={ci}
                            style={[
                              styles.possibleDot,
                              { backgroundColor: COLORS[ci] + '80' },
                            ]}
                          />
                        ))}
                      </View>
                    )}

                    {/* Pre-revealed indicator */}
                    {isPreRevealed && (
                      <Text style={styles.preRevealStar}>★</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Color palette */}
      <View style={styles.palette}>
        {COLORS.map((color, i) => {
          // Count how many of this color are placed
          let placedCount = 0;
          solvedCells.forEach((v) => {
            if (v === i) placedCount++;
          });
          const allPlaced = placedCount >= SIZE;

          return (
            <Pressable
              key={i}
              style={[
                styles.paletteBtn,
                {
                  backgroundColor: allPlaced ? color + '30' : color,
                  borderColor:
                    selectedColor === i ? '#ffffff' : 'transparent',
                  borderWidth: 3,
                  transform: [{ scale: selectedColor === i ? 1.1 : 1 }],
                },
              ]}
              onPress={() => !gameOver && setSelectedColor(i)}
              disabled={gameOver}
            >
              <Text style={styles.paletteBtnText}>
                {placedCount}/{SIZE}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Game over */}
      {gameOver && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>
            {guessCount <= par ? 'Brilliant! ⚡' : 'Solved!'}
          </Text>
          <Text style={styles.resultText}>
            {guessCount} guesses — par {par}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <CelebrationBurst show={gameOver && guessCount <= par} />

      {stats && showStats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
    </ScrollView>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#121213' },
  container: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  dayLabel: {
    color: '#818384',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    color: '#565758',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 280,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  scoreBox: { alignItems: 'center' },
  scoreLabel: { color: '#818384', fontSize: 11, fontWeight: '600' },
  scoreValue: { color: '#ffffff', fontSize: 22, fontWeight: '700' },
  statsBtn: { padding: 8 },
  statsBtnText: { fontSize: 20 },
  colIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  colIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
  },
  rowIndicator: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    marginRight: 4,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gridContainer: { alignSelf: 'center' },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: GAP,
  },
  cell: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GAP,
    position: 'relative',
  },
  triedRow: {
    flexDirection: 'row',
    gap: 3,
    position: 'absolute',
    top: 4,
    left: 4,
    flexWrap: 'wrap',
  },
  triedDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triedX: {
    color: '#ffffff80',
    fontSize: 8,
    fontWeight: '900',
  },
  possibleRow: {
    flexDirection: 'row',
    gap: 3,
    position: 'absolute',
    bottom: 4,
  },
  possibleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  preRevealStar: {
    color: '#ffffff30',
    fontSize: 10,
    position: 'absolute',
    bottom: 3,
    right: 5,
  },
  palette: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  paletteBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paletteBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: '#00000060',
    textShadowRadius: 2,
  },
  resultBox: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  resultText: {
    color: '#818384',
    fontSize: 15,
    marginBottom: 8,
  },
});
