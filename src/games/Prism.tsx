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
const GAP = 3;
const MAX_LIVES = 3;

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
const COLOR_DIM = ['#7a2a20', '#1c5a7a', '#1a7a3e', '#7a6210'];

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1 (Mon) – 5 (Fri)
  const preReveals = Math.max(0, 6 - d); // Mon: 5, Fri: 1
  return { preReveals, difficulty: d };
}

/* ─── Latin Square Generator ─── */
function generateLatinSquare(seed: number): number[][] {
  const rng = seededRandom(seed);
  const grid: number[][] = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(-1),
  );

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
    const candidates = shuffle(
      Array.from({ length: NUM_COLORS }, (_, i) => i),
    );
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
  if (count === 0) return new Set();
  const rng = seededRandom(seed + 9999);
  const revealed = new Set<number>();
  const usedRows = new Set<number>();
  const usedCols = new Set<number>();

  const positions = Array.from({ length: SIZE * SIZE }, (_, i) => i);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // First pass: spread across rows/cols
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

  // Fill remaining
  for (const pos of positions) {
    if (revealed.size >= count) break;
    if (!revealed.has(pos)) revealed.add(pos);
  }

  return revealed;
}

/* ─── Compute possibilities per cell (also considering tried colors) ─── */
function computePossibilities(
  solvedCells: Map<number, number>,
  triedColors: Map<number, Set<number>>,
): Map<number, Set<number>> {
  const possibilities = new Map<number, Set<number>>();

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const key = r * SIZE + c;
      if (solvedCells.has(key)) continue;

      const possible = new Set(
        Array.from({ length: NUM_COLORS }, (_, i) => i),
      );

      // Eliminate colors placed in this row
      for (let cc = 0; cc < SIZE; cc++) {
        const nk = r * SIZE + cc;
        if (solvedCells.has(nk)) possible.delete(solvedCells.get(nk)!);
      }
      // Eliminate colors placed in this column
      for (let rr = 0; rr < SIZE; rr++) {
        const nk = rr * SIZE + c;
        if (solvedCells.has(nk)) possible.delete(solvedCells.get(nk)!);
      }
      // Eliminate colors the player already tried wrong here
      const tried = triedColors.get(key);
      if (tried) tried.forEach((v) => possible.delete(v));

      possibilities.set(key, possible);
    }
  }

  return possibilities;
}

/* ─── Find first non-fully-placed color ─── */
function firstAvailableColor(solvedCells: Map<number, number>): number {
  const counts = Array(NUM_COLORS).fill(0);
  solvedCells.forEach((v) => counts[v]++);
  for (let i = 0; i < NUM_COLORS; i++) {
    if (counts[i] < SIZE) return i;
  }
  return 0;
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

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 32, 300);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  /* State */
  const initSolved = useMemo(() => {
    const m = new Map<number, number>();
    for (const pos of preRevealedSet) {
      const r = Math.floor(pos / SIZE);
      const c = pos % SIZE;
      m.set(pos, hiddenGrid[r][c]);
    }
    return m;
  }, [preRevealedSet, hiddenGrid]);

  const [selectedColor, setSelectedColor] = useState<number>(() =>
    firstAvailableColor(initSolved),
  );
  const [solvedCells, setSolvedCells] = useState<Map<number, number>>(
    () => new Map(initSolved),
  );
  const [triedColors, setTriedColors] = useState<Map<number, Set<number>>>(
    () => new Map(),
  );
  const [guessCount, setGuessCount] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [guessesPerCell, setGuessesPerCell] = useState<Map<number, number>>(
    () => new Map(),
  );
  // Track auto-filled cells for share text
  const [autoFilled, setAutoFilled] = useState<Set<number>>(
    () => new Set(),
  );

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  const shakeXValues = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(0)),
  ).current;

  /* Derived: possibilities per unsolved cell */
  const possibilities = useMemo(
    () => computePossibilities(solvedCells, triedColors),
    [solvedCells, triedColors],
  );

  /* Auto-fill cells with exactly 1 possibility */
  const autoFillForced = useCallback(
    (
      currentSolved: Map<number, number>,
      currentTried: Map<number, Set<number>>,
    ): { newSolved: Map<number, number>; filledKeys: number[] } => {
      const newSolved = new Map(currentSolved);
      const filledKeys: number[] = [];
      let changed = true;

      while (changed) {
        changed = false;
        const poss = computePossibilities(newSolved, currentTried);
        for (const [key, possible] of poss) {
          if (possible.size === 1) {
            const val = [...possible][0];
            newSolved.set(key, val);
            filledKeys.push(key);
            changed = true;
          }
        }
      }

      return { newSolved, filledKeys };
    },
    [],
  );

  /* ─── Auto-select color when current is fully placed ─── */
  useEffect(() => {
    const counts = Array(NUM_COLORS).fill(0);
    solvedCells.forEach((v) => counts[v]++);
    if (counts[selectedColor] >= SIZE) {
      setSelectedColor(firstAvailableColor(solvedCells));
    }
  }, [solvedCells, selectedColor]);

  /* ─── Handle cell tap ─── */
  const handleCellTap = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      const key = r * SIZE + c;
      if (solvedCells.has(key)) return;

      // Don't allow guessing a color already tried wrong here
      const cellTried = triedColors.get(key);
      if (cellTried && cellTried.has(selectedColor)) return;

      // Don't allow guessing an impossible color (already placed in row/col)
      const cellPoss = possibilities.get(key);
      if (cellPoss && !cellPoss.has(selectedColor)) return;

      const hiddenColor = hiddenGrid[r][c];
      const newGuessCount = guessCount + 1;
      setGuessCount(newGuessCount);

      const newGuessesPerCell = new Map(guessesPerCell);
      newGuessesPerCell.set(key, (newGuessesPerCell.get(key) || 0) + 1);
      setGuessesPerCell(newGuessesPerCell);

      if (selectedColor === hiddenColor) {
        // ── CORRECT ──
        const directSolved = new Map(solvedCells);
        directSolved.set(key, hiddenColor);

        // Bounce animation
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

        // Auto-fill forced cells
        const { newSolved, filledKeys } = autoFillForced(
          directSolved,
          triedColors,
        );

        // Animate auto-filled cells with a cascade delay
        const newAutoFilled = new Set(autoFilled);
        filledKeys.forEach((fk, i) => {
          newAutoFilled.add(fk);
          setTimeout(() => {
            Animated.sequence([
              Animated.timing(cellScales[fk], {
                toValue: 1.15,
                duration: 60,
                useNativeDriver: true,
              }),
              Animated.spring(cellScales[fk], {
                toValue: 1,
                friction: 3,
                tension: 200,
                useNativeDriver: true,
              }),
            ]).start();
          }, (i + 1) * 120);
        });

        setAutoFilled(newAutoFilled);
        setSolvedCells(newSolved);

        // Check win
        if (newSolved.size === SIZE * SIZE) {
          setGameOver(true);
          setWon(true);
          recordGame('prism', newGuessCount, cellsToSolve, false).then(
            (s) => {
              setStats(s);
              setShowStats(true);
            },
          );
        }
      } else {
        // ── WRONG ──
        const newLives = lives - 1;
        setLives(newLives);

        const newTried = new Map(triedColors);
        const newCellTried = new Set(newTried.get(key) || []);
        newCellTried.add(selectedColor);
        newTried.set(key, newCellTried);
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

        // Auto-fill any cells now forced (wrong guess eliminates a possibility)
        const { newSolved, filledKeys } = autoFillForced(
          solvedCells,
          newTried,
        );

        const newAutoFilled = new Set(autoFilled);
        filledKeys.forEach((fk, i) => {
          newAutoFilled.add(fk);
          setTimeout(() => {
            Animated.sequence([
              Animated.timing(cellScales[fk], {
                toValue: 1.15,
                duration: 60,
                useNativeDriver: true,
              }),
              Animated.spring(cellScales[fk], {
                toValue: 1,
                friction: 3,
                tension: 200,
                useNativeDriver: true,
              }),
            ]).start();
          }, (i + 1) * 120);
        });

        if (filledKeys.length > 0) {
          setAutoFilled(newAutoFilled);
          setSolvedCells(newSolved);

          // Check win after auto-fill
          if (newSolved.size === SIZE * SIZE) {
            setGameOver(true);
            setWon(true);
            recordGame('prism', newGuessCount, cellsToSolve, false).then(
              (s) => {
                setStats(s);
                setShowStats(true);
              },
            );
            return;
          }
        }

        // Check fail
        if (newLives <= 0) {
          setGameOver(true);
          setWon(false);
          recordGame('prism', newGuessCount + 99, cellsToSolve, false).then(
            (s) => {
              setStats(s);
              setShowStats(true);
            },
          );
        }
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
      lives,
      cellsToSolve,
      possibilities,
      autoFillForced,
      autoFilled,
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
        } else if (autoFilled.has(key)) {
          row += '🧠'; // Deduced, not guessed
        } else {
          const tries = guessesPerCell.get(key) || 0;
          if (tries <= 1) row += '🟩';
          else if (tries === 2) row += '🟨';
          else row += '🟥';
        }
      }
      rows.push(row);
    }
    const livesEmoji = '❤️'.repeat(lives) + '🖤'.repeat(MAX_LIVES - lives);
    const result = won ? `${guessCount} guesses` : 'Failed';
    return `🔮 Prism — Day #${puzzleDay}\n${result} ${livesEmoji}\n\n${rows.join('\n')}\n\n⬜given 🟩1st try 🟨2nd 🟥3+ 🧠deduced`;
  }

  /* ─── Lives display ─── */
  const livesDisplay = Array.from({ length: MAX_LIVES }, (_, i) =>
    i < lives ? '❤️' : '🖤',
  ).join('');

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <Text style={styles.dayLabel}>Day #{puzzleDay}</Text>
      <Text style={styles.subtitle}>
        Each color once per row & column
      </Text>

      {/* Score bar */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Guesses</Text>
          <Text style={styles.scoreValue}>{guessCount}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Lives</Text>
          <Text style={styles.livesValue}>{livesDisplay}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Solved</Text>
          <Text style={styles.scoreValue}>
            {solvedCells.size}/{SIZE * SIZE}
          </Text>
        </View>
        <Pressable onPress={handleShowStats} style={styles.statsBtn}>
          <Text style={styles.statsBtnText}>📊</Text>
        </Pressable>
      </View>

      {/* Color palette — ABOVE grid for compact layout */}
      <View style={styles.palette}>
        {COLORS.map((color, i) => {
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

      {/* Grid */}
      <View style={[styles.gridContainer, { width: gridWidth + 28 }]}>
        {/* Column constraint indicators */}
        <View
          style={[
            styles.colIndicatorRow,
            { marginLeft: 28, width: gridWidth },
          ]}
        >
          {Array.from({ length: SIZE }, (_, c) => {
            const placed: number[] = [];
            for (let r = 0; r < SIZE; r++) {
              const key = r * SIZE + c;
              if (solvedCells.has(key)) placed.push(solvedCells.get(key)!);
            }
            return (
              <View
                key={c}
                style={[styles.colIndicator, { width: cellSize }]}
              >
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
              const isAutoFilled = autoFilled.has(key);
              const solvedColor = isSolved ? solvedCells.get(key)! : -1;
              const cellTried = triedColors.get(key) || new Set<number>();
              const cellPossible = possibilities.get(key);
              const canGuessHere =
                !isSolved &&
                !gameOver &&
                cellPossible?.has(selectedColor) &&
                !cellTried.has(selectedColor);

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
                            : isAutoFilled
                              ? '#a78bfa'
                              : '#6aaa64'
                          : canGuessHere
                            ? COLORS[selectedColor] + '60'
                            : '#3a3a3c',
                        borderWidth: isSolved && !isPreRevealed ? 3 : 2,
                      },
                    ]}
                    onPress={() => handleCellTap(r, c)}
                    disabled={gameOver || isSolved}
                  >
                    {/* Show tried colors */}
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

                    {/* Show remaining possibilities */}
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

                    {/* Pre-revealed star */}
                    {isPreRevealed && (
                      <Text style={styles.preRevealStar}>★</Text>
                    )}

                    {/* Auto-filled indicator */}
                    {isAutoFilled && !isPreRevealed && (
                      <Text style={styles.autoFillIcon}>✦</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Game over */}
      {gameOver && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>
            {won
              ? lives === MAX_LIVES
                ? 'Flawless! ✨'
                : 'Solved! 🔮'
              : 'Out of lives 💔'}
          </Text>
          <Text style={styles.resultText}>
            {won
              ? `${guessCount} guesses — ${lives}/${MAX_LIVES} lives`
              : `${guessCount} guesses — ${solvedCells.size}/${SIZE * SIZE} cells`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <CelebrationBurst show={gameOver && won && lives === MAX_LIVES} />

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
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dayLabel: {
    color: '#818384',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 2,
  },
  subtitle: {
    color: '#565758',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
  },
  scoreBox: { alignItems: 'center' },
  scoreLabel: { color: '#818384', fontSize: 10, fontWeight: '600' },
  scoreValue: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  livesValue: { fontSize: 18, marginTop: 2 },
  statsBtn: { padding: 6 },
  statsBtnText: { fontSize: 18 },
  palette: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  paletteBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paletteBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: '#00000060',
    textShadowRadius: 2,
  },
  colIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 3,
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
    gap: 1,
    marginRight: 4,
  },
  miniDot: {
    width: 5,
    height: 5,
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
    gap: 2,
    position: 'absolute',
    top: 3,
    left: 3,
    flexWrap: 'wrap',
  },
  triedDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triedX: {
    color: '#ffffff80',
    fontSize: 7,
    fontWeight: '900',
  },
  possibleRow: {
    flexDirection: 'row',
    gap: 3,
    position: 'absolute',
    bottom: 3,
  },
  possibleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  preRevealStar: {
    color: '#ffffff30',
    fontSize: 9,
    position: 'absolute',
    bottom: 2,
    right: 4,
  },
  autoFillIcon: {
    color: '#a78bfa80',
    fontSize: 9,
    position: 'absolute',
    bottom: 2,
    right: 4,
  },
  resultBox: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  resultText: {
    color: '#818384',
    fontSize: 14,
    marginBottom: 8,
  },
});
