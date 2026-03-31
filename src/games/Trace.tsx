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
const GAP = 4;
const MAX_GUESSES = 6;
const FB_GREEN = '#538d4e';
const FB_YELLOW = '#b59f3b';
const FB_GRAY = '#3a3a3c';
const FB_COLORS = { green: FB_GREEN, yellow: FB_YELLOW, gray: FB_GRAY };

/* ─── Adjacency helpers ─── */
function neighbors(idx: number): number[] {
  const r = Math.floor(idx / SIZE);
  const c = idx % SIZE;
  const res: number[] = [];
  if (r > 0) res.push((r - 1) * SIZE + c);
  if (r < SIZE - 1) res.push((r + 1) * SIZE + c);
  if (c > 0) res.push(r * SIZE + c - 1);
  if (c < SIZE - 1) res.push(r * SIZE + c + 1);
  return res;
}

function isConnected(cells: Set<number>): boolean {
  if (cells.size === 0) return true;
  const arr = [...cells];
  const visited = new Set<number>([arr[0]]);
  const queue = [arr[0]];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nb of neighbors(cur)) {
      if (cells.has(nb) && !visited.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }
  return visited.size === cells.size;
}

/* ─── Generate all connected pentomino placements on SIZE×SIZE ─── */
function allConnectedPatterns(patternSize: number): Set<number>[] {
  const results: Set<number>[] = [];
  const seen = new Set<string>();

  function dfs(current: Set<number>, frontier: number[]) {
    if (current.size === patternSize) {
      const key = [...current].sort((a, b) => a - b).join(',');
      if (!seen.has(key)) {
        seen.add(key);
        results.push(new Set(current));
      }
      return;
    }
    for (let fi = 0; fi < frontier.length; fi++) {
      const cell = frontier[fi];
      if (current.has(cell)) continue;
      const next = new Set(current);
      next.add(cell);
      const newFrontier = [...frontier];
      for (const nb of neighbors(cell)) {
        if (!next.has(nb) && !newFrontier.includes(nb)) {
          newFrontier.push(nb);
        }
      }
      dfs(next, newFrontier);
    }
  }

  for (let start = 0; start < SIZE * SIZE; start++) {
    dfs(new Set([start]), neighbors(start));
  }
  return results;
}

/* ─── Difficulty ─── */
function getPatternSize(): number {
  const d = getDayDifficulty();
  return 3 + Math.min(d, 4); // Mon:4, Tue:5, Wed:5, Thu:6, Fri:7
}

/* ─── Generate daily puzzle ─── */
function generatePuzzle(seed: number) {
  const patternSize = getPatternSize();
  const patterns = allConnectedPatterns(patternSize);
  const rng = seededRandom(seed);
  const idx = Math.floor(rng() * patterns.length);
  return { answer: patterns[idx], patternSize, totalPatterns: patterns.length };
}

/* ─── Evaluate guess ─── */
type Feedback = 'green' | 'yellow' | 'gray';

function evaluate(
  guess: Set<number>,
  answer: Set<number>,
): Map<number, Feedback> {
  const answerAdj = new Set<number>();
  for (const cell of answer) {
    for (const nb of neighbors(cell)) {
      if (!answer.has(nb)) answerAdj.add(nb);
    }
  }
  const result = new Map<number, Feedback>();
  for (const cell of guess) {
    if (answer.has(cell)) {
      result.set(cell, 'green');
    } else if (answerAdj.has(cell)) {
      result.set(cell, 'yellow');
    } else {
      result.set(cell, 'gray');
    }
  }
  return result;
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Trace() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const { answer, patternSize } = useMemo(() => generatePuzzle(seed), [seed]);

  /* ── State ── */
  const [currentGuess, setCurrentGuess] = useState<Set<number>>(
    () => new Set(),
  );
  const [guesses, setGuesses] = useState<
    { cells: Set<number>; feedback: Map<number, Feedback> }[]
  >([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = guesses.length > 0 &&
    [...guesses[guesses.length - 1].feedback.values()].every(
      (f) => f === 'green',
    );
  const failed = !solved && guesses.length >= MAX_GUESSES;
  const gameOver = solved || failed;
  const guessReady =
    currentGuess.size === patternSize && isConnected(currentGuess);

  /* ── Layout ── */
  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor(maxWidth / SIZE) - GAP;

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  const bounceCell = useCallback(
    (idx: number) => {
      Animated.sequence([
        Animated.timing(cellScales[idx], {
          toValue: 1.15,
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
    },
    [cellScales],
  );

  /* ── Best feedback per cell (accumulated across all guesses) ── */
  const accFeedback = useMemo(() => {
    const best = new Map<number, Feedback>();
    for (const g of guesses) {
      for (const [cell, fb] of g.feedback) {
        const prev = best.get(cell);
        if (!prev || fb === 'green' || (fb === 'yellow' && prev === 'gray')) {
          best.set(cell, fb);
        }
      }
    }
    return best;
  }, [guesses]);

  /* ── Cell tap ── */
  const handleCellTap = useCallback(
    (idx: number) => {
      if (gameOver) return;
      bounceCell(idx);
      setCurrentGuess((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) {
          next.delete(idx);
        } else if (next.size < patternSize) {
          next.add(idx);
        }
        return next;
      });
    },
    [gameOver, patternSize, bounceCell],
  );

  /* ── Submit guess ── */
  const handleSubmit = useCallback(() => {
    if (!guessReady || gameOver) return;
    const fb = evaluate(currentGuess, answer);
    const newGuess = { cells: new Set(currentGuess), feedback: fb };
    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);
    setCurrentGuess(new Set());

    // Check win/loss
    const isSolved = [...fb.values()].every((f) => f === 'green');
    const isFailed = !isSolved && newGuesses.length >= MAX_GUESSES;

    if ((isSolved || isFailed) && !gameRecorded) {
      setGameRecorded(true);
      const score = isSolved ? newGuesses.length : MAX_GUESSES + 1;
      recordGame('trace', score, 3).then((s) => {
        // par = 3 guesses (good performance)
        setStatsData(s);
        setShowStats(true);
      });
    }
  }, [guessReady, gameOver, currentGuess, answer, guesses, gameRecorded]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('trace');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const lines: string[] = [`Trace Day #${puzzleDay} \ud83d\udd0d`];
    for (const g of guesses) {
      let greenCount = 0;
      let yellowCount = 0;
      for (const fb of g.feedback.values()) {
        if (fb === 'green') greenCount++;
        else if (fb === 'yellow') yellowCount++;
      }
      lines.push(
        '\ud83d\udfe9'.repeat(greenCount) +
          '\ud83d\udfe8'.repeat(yellowCount) +
          '\u2b1b'.repeat(patternSize - greenCount - yellowCount),
      );
    }
    lines.push(
      solved
        ? `Found in ${guesses.length}/${MAX_GUESSES} \u2b50`
        : `${guesses.length}/${MAX_GUESSES} \ud83d\ude14`,
    );
    return lines.join('\n');
  }

  /* ── Get cell color ── */
  function getCellStyle(idx: number) {
    const inCurrent = currentGuess.has(idx);
    const fb = accFeedback.get(idx);

    if (gameOver && answer.has(idx)) {
      return { bg: FB_GREEN, border: '#4c7c45' };
    }
    if (inCurrent) {
      return { bg: '#555', border: '#ffffff' };
    }
    if (fb === 'green') {
      return { bg: FB_GREEN, border: '#4c7c45' };
    }
    if (fb === 'yellow') {
      return { bg: FB_YELLOW, border: '#a38f35' };
    }
    if (fb === 'gray') {
      return { bg: FB_GRAY, border: '#333' };
    }
    return { bg: '#1a1a1b', border: '#3a3a3c' };
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trace</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Find the hidden {patternSize}-cell shape. Tap cells, then submit.
      </Text>

      {/* Guess counter */}
      <View style={styles.guessBar}>
        {Array.from({ length: MAX_GUESSES }, (_, i) => (
          <View
            key={i}
            style={[
              styles.guessDot,
              i < guesses.length && styles.guessDotUsed,
              i < guesses.length &&
                i === guesses.length - 1 &&
                solved &&
                styles.guessDotWin,
            ]}
          />
        ))}
        <Text style={styles.guessText}>
          {guesses.length}/{MAX_GUESSES}
        </Text>
      </View>

      {/* Selection info */}
      {!gameOver && (
        <Text style={styles.selInfo}>
          {currentGuess.size}/{patternSize} cells
          {currentGuess.size === patternSize && !isConnected(currentGuess)
            ? ' \u26a0 not connected'
            : ''}
        </Text>
      )}

      {/* Grid */}
      <View style={styles.grid}>
        {Array.from({ length: SIZE }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }, (_, c) => {
              const idx = r * SIZE + c;
              const { bg, border } = getCellStyle(idx);
              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[idx] }] }}
                >
                  <Pressable
                    onPress={() => handleCellTap(idx)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: bg,
                        borderColor: border,
                        borderWidth: currentGuess.has(idx) ? 3 : 1,
                      },
                    ]}
                  />
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Submit button */}
      {!gameOver && (
        <Pressable
          style={[styles.submitBtn, !guessReady && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!guessReady}
        >
          <Text style={styles.submitText}>Submit Guess</Text>
        </Pressable>
      )}

      <CelebrationBurst show={solved} />

      {/* End state */}
      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>{'\ud83c\udf1f'}</Text>
          <Text style={styles.endText}>
            Found in {guesses.length} guess{guesses.length > 1 ? 'es' : ''}!
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}
      {failed && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>{'\ud83d\ude14'}</Text>
          <Text style={styles.endText}>Not found</Text>
          <Text style={styles.endSub}>The pattern is shown in green.</Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      {/* Previous guesses summary */}
      {guesses.length > 0 && !gameOver && (
        <View style={styles.history}>
          <Text style={styles.histTitle}>Guesses</Text>
          {guesses.map((g, gi) => {
            let greens = 0;
            let yellows = 0;
            for (const fb of g.feedback.values()) {
              if (fb === 'green') greens++;
              else if (fb === 'yellow') yellows++;
            }
            return (
              <Text key={gi} style={styles.histLine}>
                #{gi + 1}: {'\ud83d\udfe9'}{greens} {'\ud83d\udfe8'}{yellows}{' '}
                {'\u2b1b'}{patternSize - greens - yellows}
              </Text>
            );
          })}
        </View>
      )}

      {/* How to play */}
      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          A {patternSize}-cell connected shape is hidden on the grid. Tap{' '}
          {patternSize} connected cells and submit your guess.{'\n\n'}
          {'\ud83d\udfe9'} Green = correct cell{'\n'}
          {'\ud83d\udfe8'} Yellow = adjacent to the shape{'\n'}
          {'\u2b1b'} Gray = far from the shape{'\n\n'}
          Find the shape in {MAX_GUESSES} guesses or fewer.
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
    marginBottom: 10,
    textAlign: 'center',
    maxWidth: 300,
  },
  guessBar: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  guessDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3a3a3c',
  },
  guessDotUsed: { backgroundColor: '#818384' },
  guessDotWin: { backgroundColor: FB_GREEN },
  guessText: { color: '#818384', fontSize: 13, marginLeft: 8 },
  selInfo: { color: '#818384', fontSize: 13, marginBottom: 8 },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: { borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  submitBtn: {
    backgroundColor: '#6aaa64',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  submitBtnDisabled: { backgroundColor: '#3a3a3c' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  endMsg: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  endSub: { color: '#818384', fontSize: 13, marginTop: 4 },
  history: { marginTop: 16, alignItems: 'center' },
  histTitle: {
    color: '#818384',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  histLine: { color: '#818384', fontSize: 13 },
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
});
