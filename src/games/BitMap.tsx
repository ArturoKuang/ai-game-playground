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
import { getDailySeed, seededRandom, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';

/* ─── Constants ���── */
const N = 5;
const GAP = 2;

function getParTime(): number {
  const d = getDayDifficulty();
  return 120 - d * 10; // Mon=110s, Fri=70s
}

/* ─── Nonogram logic ─── */

/** Extract run-length clue from a boolean line */
function getClue(line: boolean[]): number[] {
  const runs: number[] = [];
  let count = 0;
  for (const cell of line) {
    if (cell) {
      count++;
    } else {
      if (count > 0) runs.push(count);
      count = 0;
    }
  }
  if (count > 0) runs.push(count);
  return runs.length > 0 ? runs : [0];
}

/** Check if a boolean pattern matches a clue */
function matchesClue(pattern: boolean[], clue: number[]): boolean {
  const runs = getClue(pattern);
  if (runs.length !== clue.length) return false;
  return runs.every((r, i) => r === clue[i]);
}

/** Precompute all 32 patterns for a 5-cell line */
const ALL_PATTERNS: boolean[][] = [];
for (let mask = 0; mask < (1 << N); mask++) {
  ALL_PATTERNS.push(
    Array.from({ length: N }, (_, i) => ((mask >> (N - 1 - i)) & 1) === 1)
  );
}

/** Get valid patterns for a given clue */
function getPatternsForClue(clue: number[]): boolean[][] {
  return ALL_PATTERNS.filter((p) => matchesClue(p, clue));
}

/** Count solutions using backtracking with column pruning */
function countSolutions(
  rowClues: number[][],
  colClues: number[][],
  maxCount: number = 2
): number {
  const rowPatterns = rowClues.map((c) => getPatternsForClue(c));
  const colValid = colClues.map((c) => getPatternsForClue(c));

  let count = 0;
  const grid: boolean[][] = [];

  function backtrack(row: number) {
    if (count >= maxCount) return; // early exit
    if (row === N) {
      // Verify columns
      for (let c = 0; c < N; c++) {
        const col = grid.map((r) => r[c]);
        if (!matchesClue(col, colClues[c])) return;
      }
      count++;
      return;
    }

    for (const pattern of rowPatterns[row]) {
      // Column pruning: check partial columns are compatible
      grid.push(pattern);
      let feasible = true;
      for (let c = 0; c < N && feasible; c++) {
        const partial = grid.map((r) => r[c]);
        const ok = colValid[c].some((cp) =>
          partial.every((v, i) => cp[i] === v)
        );
        if (!ok) feasible = false;
      }

      if (feasible) backtrack(row + 1);
      grid.pop();
    }
  }

  backtrack(0);
  return count;
}

/** Generate a uniquely solvable 5x5 nonogram puzzle */
function generatePuzzle(seed: number) {
  const rng = seededRandom(seed);
  const d = getDayDifficulty(); // 1 (Mon) to 5 (Fri)
  // Monday: sparser (35%), Friday: denser (55%)
  const fillRate = 0.3 + d * 0.05; // Mon=0.35, Fri=0.55
  const minFill = 5 + d;           // Mon=6, Fri=10
  const maxFill = 12 + d * 2;      // Mon=14, Fri=22

  for (let attempt = 0; attempt < 500; attempt++) {
    const target: boolean[][] = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => rng() < fillRate)
    );

    const filled = target.flat().filter(Boolean).length;
    if (filled < minFill || filled > maxFill) continue;

    // Compute clues
    const rowClues = target.map((row) => getClue(row));
    const colClues = Array.from({ length: N }, (_, c) =>
      getClue(target.map((row) => row[c]))
    );

    // Check no trivial rows/cols (all filled or all empty)
    const trivial = [...rowClues, ...colClues].filter(
      (c) => (c.length === 1 && c[0] === 0) || (c.length === 1 && c[0] === N)
    );
    if (trivial.length > 2) continue;

    // Check uniqueness
    if (countSolutions(rowClues, colClues, 2) !== 1) continue;

    return { target, rowClues, colClues };
  }

  // Fallback: known good puzzle
  const target = [
    [false, true, true, true, false],
    [true, false, false, false, true],
    [true, true, true, true, true],
    [true, false, true, false, true],
    [false, true, false, true, false],
  ];
  const rowClues = target.map((row) => getClue(row));
  const colClues = Array.from({ length: N }, (_, c) =>
    getClue(target.map((row) => row[c]))
  );
  return { target, rowClues, colClues };
}

/* ─── Cell state: 0 = unknown, 1 = filled, 2 = marked empty ─── */
type CellState = 0 | 1 | 2;

export default function BitMap() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const puzzle = useMemo(() => generatePuzzle(seed), [seed]);
  const parTime = useMemo(() => getParTime(), []);

  const { width: screenWidth } = useWindowDimensions();
  const clueWidth = 55;
  const clueHeight = 50;
  const maxGrid = Math.min(screenWidth - 48 - clueWidth, 300);
  const cellSize = Math.floor((maxGrid - (N - 1) * GAP) / N);
  const gridPixels = N * cellSize + (N - 1) * GAP;

  const [grid, setGrid] = useState<CellState[][]>(() =>
    Array.from({ length: N }, () => Array(N).fill(0))
  );
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: N * N }, () => new Animated.Value(1))
  ).current;

  const won = useMemo(() => {
    return grid.every((row, r) =>
      row.every((cell, c) =>
        puzzle.target[r][c] ? cell === 1 : cell !== 1
      )
    );
  }, [grid, puzzle]);

  const elapsed = endTime && startTime
    ? (endTime - startTime) / 1000
    : startTime
      ? (Date.now() - startTime) / 1000
      : 0;
  const finalTime = endTime && startTime ? Math.round((endTime - startTime) / 1000) : 0;
  const underPar = finalTime > 0 && finalTime <= parTime;

  // Timer tick
  const [, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleTap = useCallback(
    (r: number, c: number) => {
      if (won) return;

      if (!startTime) {
        setStartTime(Date.now());
        timerRef.current = setInterval(() => setTick((t) => t + 1), 200);
      }

      // Cycle: 0 → 1 → 2 → 0
      const idx = r * N + c;
      Animated.sequence([
        Animated.timing(cellScales[idx], {
          toValue: 0.85,
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

      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        next[r][c] = ((prev[r][c] + 1) % 3) as CellState;
        return next;
      });
    },
    [won, startTime, cellScales]
  );

  // Check win after grid update
  React.useEffect(() => {
    if (won && !endTime) {
      const finish = Date.now();
      setEndTime(finish);
      if (timerRef.current) clearInterval(timerRef.current);
      const time = Math.round((finish - (startTime || finish)) / 1000);
      recordGame('bitmap', time, parTime).then((s) => {
        setStats(s);
        setShowStats(true);
      });
    }
  }, [won, endTime, startTime]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('bitmap');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const rows = puzzle.target
      .map((row) =>
        row.map((cell) => (cell ? '\u2b1b' : '\u2b1c')).join('')
      )
      .join('\n');
    return `BitMap Day #${puzzleDay} \ud83d\uddbc\ufe0f\n${finalTime}s / ${parTime}s\n${rows}\n${
      underPar ? '\u2b50 Under par!' : `Solved in ${finalTime}s`
    }`;
  }

  /** Check if a row's filled cells match the clue */
  function isRowComplete(r: number): boolean {
    return grid[r].every((cell, c) =>
      puzzle.target[r][c] ? cell === 1 : cell !== 1
    );
  }

  function isColComplete(c: number): boolean {
    return grid.every((row, r) =>
      puzzle.target[r][c] ? row[c] === 1 : row[c] !== 1
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BitMap</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Fill cells to match the row and column clues.
      </Text>

      <View style={styles.timerRow}>
        <Text style={styles.timerLabel}>Time</Text>
        <Text
          style={[
            styles.timerValue,
            won && underPar && styles.timerGood,
            won && !underPar && styles.timerOver,
          ]}
        >
          {won ? `${finalTime}s` : `${Math.floor(elapsed)}s`}
        </Text>
        <Text style={styles.timerPar}>Par: {parTime}s</Text>
      </View>

      {/* Puzzle grid with clues */}
      <View style={styles.puzzleArea}>
        {/* Column clues */}
        <View style={[styles.colCluesRow, { marginLeft: clueWidth + GAP }]}>
          {puzzle.colClues.map((clue, c) => (
            <View
              key={c}
              style={[
                styles.colClue,
                { width: cellSize },
                isColComplete(c) && styles.clueComplete,
              ]}
            >
              {clue.map((num, i) => (
                <Text
                  key={i}
                  style={[
                    styles.clueNum,
                    isColComplete(c) && styles.clueNumComplete,
                  ]}
                >
                  {num}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Grid with row clues */}
        <View style={styles.gridArea}>
          {Array.from({ length: N }).map((_, r) => (
            <View key={r} style={styles.gridRow}>
              {/* Row clue */}
              <View
                style={[
                  styles.rowClue,
                  { width: clueWidth, height: cellSize },
                  isRowComplete(r) && styles.clueComplete,
                ]}
              >
                <Text
                  style={[
                    styles.clueText,
                    isRowComplete(r) && styles.clueNumComplete,
                  ]}
                >
                  {puzzle.rowClues[r].join(' ')}
                </Text>
              </View>

              {/* Cells */}
              {Array.from({ length: N }).map((_, c) => {
                const state = grid[r][c];
                const idx = r * N + c;
                return (
                  <Animated.View
                    key={c}
                    style={{ transform: [{ scale: cellScales[idx] }] }}
                  >
                    <Pressable
                      onPress={() => handleTap(r, c)}
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor:
                            state === 1
                              ? '#3498db'
                              : state === 2
                                ? '#1a1a2e'
                                : '#2a2a3c',
                          borderColor:
                            state === 1
                              ? '#2980b9'
                              : state === 2
                                ? '#2a2a3c'
                                : '#3a3a4c',
                        },
                      ]}
                    >
                      {state === 2 && (
                        <Text style={styles.xMark}>{'\u2715'}</Text>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <CelebrationBurst show={won} />

      {won && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {underPar ? '\u2b50' : '\ud83d\uddbc\ufe0f'}
          </Text>
          <Text style={styles.winText}>
            {underPar
              ? `Under par! ${finalTime}s`
              : `Solved in ${finalTime}s (par: ${parTime}s)`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Numbers on each row and column show groups of consecutive filled
          cells. For example, "2 1" means a group of 2, a gap, then a group
          of 1.{'\n\n'}
          Tap to fill a cell. Tap again to mark it empty ({'\u2715'}). Tap a
          third time to clear.{'\n\n'}
          Solve in under {parTime}s for a star!
        </Text>
      </View>

      {showStats && stats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
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
    maxWidth: 300,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  timerLabel: { color: '#818384', fontSize: 14 },
  timerValue: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  timerGood: { color: '#2ecc71' },
  timerOver: { color: '#e67e22' },
  timerPar: { color: '#818384', fontSize: 14 },
  puzzleArea: {
    alignItems: 'flex-start',
  },
  colCluesRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  colClue: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 40,
    paddingBottom: 2,
  },
  clueComplete: {
    opacity: 0.4,
  },
  rowClue: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  clueText: {
    color: '#b0b0b0',
    fontSize: 13,
    fontWeight: '700',
  },
  clueNum: {
    color: '#b0b0b0',
    fontSize: 13,
    fontWeight: '700',
  },
  clueNumComplete: {
    color: '#6aaa64',
  },
  gridArea: {
    gap: GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
    alignItems: 'center',
  },
  cell: {
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  xMark: {
    color: '#555',
    fontSize: 14,
    fontWeight: '800',
  },
  winMessage: {
    alignItems: 'center',
    marginTop: 20,
  },
  winEmoji: { fontSize: 48 },
  winText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  howTo: {
    marginTop: 28,
    paddingHorizontal: 12,
    maxWidth: 360,
  },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: {
    color: '#818384',
    fontSize: 13,
    lineHeight: 20,
  },
});
