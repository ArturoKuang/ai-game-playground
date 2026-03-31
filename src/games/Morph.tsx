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
const GRID = 4;
const CELLS = GRID * GRID;
const MAX_ATTEMPTS = 4;

/* ─── Transform definitions ─── */
type Transform = {
  name: string;
  apply: (grid: boolean[]) => boolean[];
  difficulty: number; // 1=easy, 2=medium, 3=hard
};

function rotate90(g: boolean[]): boolean[] {
  const r: boolean[] = Array(CELLS).fill(false);
  for (let row = 0; row < GRID; row++)
    for (let col = 0; col < GRID; col++)
      r[col * GRID + (GRID - 1 - row)] = g[row * GRID + col];
  return r;
}

function rotate180(g: boolean[]): boolean[] {
  return rotate90(rotate90(g));
}

function rotate270(g: boolean[]): boolean[] {
  return rotate90(rotate90(rotate90(g)));
}

function flipH(g: boolean[]): boolean[] {
  const r: boolean[] = Array(CELLS).fill(false);
  for (let row = 0; row < GRID; row++)
    for (let col = 0; col < GRID; col++)
      r[row * GRID + (GRID - 1 - col)] = g[row * GRID + col];
  return r;
}

function flipV(g: boolean[]): boolean[] {
  const r: boolean[] = Array(CELLS).fill(false);
  for (let row = 0; row < GRID; row++)
    for (let col = 0; col < GRID; col++)
      r[(GRID - 1 - row) * GRID + col] = g[row * GRID + col];
  return r;
}

function shiftRight(g: boolean[]): boolean[] {
  const r: boolean[] = Array(CELLS).fill(false);
  for (let row = 0; row < GRID; row++)
    for (let col = 0; col < GRID; col++)
      r[row * GRID + ((col + 1) % GRID)] = g[row * GRID + col];
  return r;
}

function shiftDown(g: boolean[]): boolean[] {
  const r: boolean[] = Array(CELLS).fill(false);
  for (let row = 0; row < GRID; row++)
    for (let col = 0; col < GRID; col++)
      r[((row + 1) % GRID) * GRID + col] = g[row * GRID + col];
  return r;
}

function invert(g: boolean[]): boolean[] {
  return g.map((v) => !v);
}

const TRANSFORMS: Transform[] = [
  { name: 'Rotate 90\u00b0', apply: rotate90, difficulty: 1 },
  { name: 'Rotate 180\u00b0', apply: rotate180, difficulty: 1 },
  { name: 'Rotate 270\u00b0', apply: rotate270, difficulty: 1 },
  { name: 'Flip horizontal', apply: flipH, difficulty: 1 },
  { name: 'Flip vertical', apply: flipV, difficulty: 1 },
  { name: 'Shift right', apply: shiftRight, difficulty: 1 },
  { name: 'Shift down', apply: shiftDown, difficulty: 1 },
  { name: 'Invert', apply: invert, difficulty: 1 },
  {
    name: 'Rotate 90\u00b0 + invert',
    apply: (g) => invert(rotate90(g)),
    difficulty: 2,
  },
  {
    name: 'Flip H + shift down',
    apply: (g) => shiftDown(flipH(g)),
    difficulty: 2,
  },
  {
    name: 'Rotate 180\u00b0 + invert',
    apply: (g) => invert(rotate180(g)),
    difficulty: 2,
  },
  {
    name: 'Flip V + shift right',
    apply: (g) => shiftRight(flipV(g)),
    difficulty: 2,
  },
  {
    name: 'Rotate 90\u00b0 + flip H',
    apply: (g) => flipH(rotate90(g)),
    difficulty: 3,
  },
  {
    name: 'Shift right + shift down',
    apply: (g) => shiftDown(shiftRight(g)),
    difficulty: 3,
  },
  {
    name: 'Invert + flip V + rotate 90\u00b0',
    apply: (g) => rotate90(flipV(invert(g))),
    difficulty: 3,
  },
];

/* ─── Generate puzzle ─── */
function generatePuzzle(seed: number) {
  const d = getDayDifficulty();
  const maxDiff = d <= 2 ? 1 : d <= 4 ? 2 : 3;
  const rng = seededRandom(seed);

  // Pick a transform at appropriate difficulty
  const candidates = TRANSFORMS.filter((t) => t.difficulty <= maxDiff);
  const transform = candidates[Math.floor(rng() * candidates.length)];

  // Generate example input (ensure not trivially symmetric)
  let exampleIn: boolean[];
  let attempts = 0;
  do {
    exampleIn = Array.from({ length: CELLS }, () => rng() < 0.45);
    attempts++;
  } while (
    attempts < 50 &&
    (exampleIn.filter(Boolean).length < 3 ||
      exampleIn.filter(Boolean).length > CELLS - 3 ||
      arrEq(exampleIn, transform.apply(exampleIn))) // skip if transform is identity for this input
  );

  const exampleOut = transform.apply(exampleIn);

  // Generate test input (different from example)
  let testIn: boolean[];
  do {
    testIn = Array.from({ length: CELLS }, () => rng() < 0.45);
  } while (
    testIn.filter(Boolean).length < 3 ||
    testIn.filter(Boolean).length > CELLS - 3 ||
    arrEq(testIn, exampleIn)
  );

  const answer = transform.apply(testIn);

  return { exampleIn, exampleOut, testIn, answer, transformName: transform.name };
}

function arrEq(a: boolean[], b: boolean[]): boolean {
  return a.every((v, i) => v === b[i]);
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Morph() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const puzzle = useMemo(() => generatePuzzle(seed), [seed]);
  const { exampleIn, exampleOut, testIn, answer, transformName } = puzzle;

  const [guess, setGuess] = useState<boolean[]>(() => Array(CELLS).fill(false));
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<boolean[] | null>(null); // per-cell correct/wrong
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);
  const [revealRule, setRevealRule] = useState(false);

  const gameOver = solved || failed;
  const { width: screenWidth } = useWindowDimensions();
  const gridWidth = Math.min(screenWidth - 48, 150);
  const cellSize = Math.floor(gridWidth / GRID) - 2;

  /* ── Animations ── */
  const guessCellScales = useRef(
    Array.from({ length: CELLS }, () => new Animated.Value(1)),
  ).current;

  const bounceCell = useCallback(
    (idx: number) => {
      Animated.sequence([
        Animated.timing(guessCellScales[idx], {
          toValue: 1.15,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.spring(guessCellScales[idx], {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [guessCellScales],
  );

  /* ── Toggle guess cell ── */
  const handleGuessTap = useCallback(
    (idx: number) => {
      if (gameOver) return;
      bounceCell(idx);
      setGuess((prev) => {
        const next = [...prev];
        next[idx] = !next[idx];
        return next;
      });
      setFeedback(null); // clear feedback when editing
    },
    [gameOver, bounceCell],
  );

  /* ── Submit ── */
  const handleSubmit = useCallback(() => {
    if (gameOver) return;
    const fb = guess.map((v, i) => v === answer[i]);
    setFeedback(fb);
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (fb.every(Boolean)) {
      setSolved(true);
      setRevealRule(true);
      if (!gameRecorded) {
        setGameRecorded(true);
        recordGame('morph', nextAttempts, 1).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    } else if (nextAttempts >= MAX_ATTEMPTS) {
      setFailed(true);
      setRevealRule(true);
      setGuess([...answer]); // show correct answer
      if (!gameRecorded) {
        setGameRecorded(true);
        recordGame('morph', MAX_ATTEMPTS + 1, 1).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    }
  }, [guess, answer, attempts, gameOver, gameRecorded]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('morph');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const blocks = Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
      if (i < attempts - (solved ? 1 : 0)) return '\ud83d\udfe5'; // wrong attempt
      if (i === attempts - 1 && solved) return '\ud83d\udfe9'; // winning attempt
      return '\u2b1c'; // unused
    }).join('');
    return [
      `Morph Day #${puzzleDay} \ud83d\udd04`,
      blocks,
      solved
        ? `Solved in ${attempts}/${MAX_ATTEMPTS}! \u2b50`
        : `${attempts}/${MAX_ATTEMPTS} \ud83d\ude14`,
    ].join('\n');
  }

  /* ── Render mini grid ── */
  function MiniGrid({
    data,
    label,
    color,
    feedbackData,
    interactive,
    animated,
  }: {
    data: boolean[];
    label: string;
    color: string;
    feedbackData?: boolean[] | null;
    interactive?: boolean;
    animated?: boolean;
  }) {
    return (
      <View style={styles.miniGridWrap}>
        <Text style={styles.miniLabel}>{label}</Text>
        <View style={styles.miniGrid}>
          {Array.from({ length: GRID }, (_, r) => (
            <View key={r} style={styles.miniRow}>
              {Array.from({ length: GRID }, (_, c) => {
                const idx = r * GRID + c;
                const filled = data[idx];
                const correct =
                  feedbackData != null ? feedbackData[idx] : null;
                let bg = filled ? color : '#2c2c2e';
                if (correct === false) bg = '#e74c3c';
                if (correct === true && filled) bg = '#538d4e';
                const cellEl = (
                  <View
                    style={[
                      styles.miniCell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: bg,
                        borderColor:
                          correct === false
                            ? '#c0392b'
                            : correct === true
                              ? '#4c7c45'
                              : filled
                                ? '#555'
                                : '#3a3a3c',
                      },
                    ]}
                  />
                );
                if (interactive) {
                  return (
                    <Animated.View
                      key={c}
                      style={{
                        transform: [
                          {
                            scale: animated
                              ? guessCellScales[idx]
                              : 1,
                          },
                        ],
                      }}
                    >
                      <Pressable onPress={() => handleGuessTap(idx)}>
                        {cellEl}
                      </Pressable>
                    </Animated.View>
                  );
                }
                return <View key={c}>{cellEl}</View>;
              })}
            </View>
          ))}
        </View>
      </View>
    );
  }

  const correctCount = feedback
    ? feedback.filter(Boolean).length
    : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Morph</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        See the rule. Predict the result. Tap cells to draw your answer.
      </Text>

      {/* Attempt counter */}
      <View style={styles.attemptBar}>
        {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.attemptDot,
              i < attempts && !solved && styles.attemptDotUsed,
              i === attempts - 1 && solved && styles.attemptDotWin,
            ]}
          />
        ))}
        <Text style={styles.attemptText}>
          {attempts}/{MAX_ATTEMPTS}
        </Text>
        {correctCount !== null && !solved && (
          <Text style={styles.correctCount}>
            {correctCount}/{CELLS} correct
          </Text>
        )}
      </View>

      {/* Example: Before → After */}
      <Text style={styles.sectionLabel}>Example</Text>
      <View style={styles.exampleRow}>
        <MiniGrid data={exampleIn} label="Before" color="#3498db" />
        <Text style={styles.arrow}>{'\u2192'}</Text>
        <MiniGrid data={exampleOut} label="After" color="#3498db" />
      </View>

      {/* Test: Input → Your answer */}
      <Text style={styles.sectionLabel}>Your turn</Text>
      <View style={styles.exampleRow}>
        <MiniGrid data={testIn} label="Input" color="#9b59b6" />
        <Text style={styles.arrow}>{'\u2192'}</Text>
        <MiniGrid
          data={guess}
          label="Your answer"
          color="#2ecc71"
          feedbackData={feedback}
          interactive={!gameOver}
          animated
        />
      </View>

      {/* Submit */}
      {!gameOver && (
        <Pressable style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>Check</Text>
        </Pressable>
      )}

      {/* Rule reveal */}
      {revealRule && (
        <View style={styles.ruleReveal}>
          <Text style={styles.ruleLabel}>The rule was:</Text>
          <Text style={styles.ruleName}>{transformName}</Text>
        </View>
      )}

      <CelebrationBurst show={solved && attempts <= 2} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {attempts === 1 ? '\ud83c\udf1f' : '\ud83d\udd04'}
          </Text>
          <Text style={styles.endText}>
            {attempts === 1
              ? 'First try!'
              : `Got it in ${attempts} attempts`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      {failed && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>{'\ud83d\ude14'}</Text>
          <Text style={styles.endText}>Not this time</Text>
          <Text style={styles.endSub}>The correct answer is shown above.</Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          The Example shows a pattern before and after a hidden transformation
          (like rotation, flip, or shift).{'\n\n'}
          Figure out the rule, then apply it to the Input. Tap cells in
          &quot;Your answer&quot; to fill/empty them. Hit Check.{'\n\n'}
          {MAX_ATTEMPTS} attempts. Green = correct, Red = wrong.
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
  attemptBar: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  attemptDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3a3a3c',
  },
  attemptDotUsed: { backgroundColor: '#e74c3c' },
  attemptDotWin: { backgroundColor: '#538d4e' },
  attemptText: { color: '#818384', fontSize: 13, marginLeft: 8 },
  correctCount: { color: '#f39c12', fontSize: 13, marginLeft: 8 },
  sectionLabel: {
    color: '#818384',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 4,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  arrow: { color: '#818384', fontSize: 24, fontWeight: '700' },
  miniGridWrap: { alignItems: 'center' },
  miniLabel: { color: '#818384', fontSize: 10, marginBottom: 4 },
  miniGrid: { gap: 2 },
  miniRow: { flexDirection: 'row', gap: 2 },
  miniCell: {
    borderRadius: 4,
    borderWidth: 1,
  },
  submitBtn: {
    backgroundColor: '#6aaa64',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ruleReveal: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3498db',
    alignItems: 'center',
  },
  ruleLabel: { color: '#818384', fontSize: 12 },
  ruleName: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  endMsg: { alignItems: 'center', marginTop: 16 },
  endEmoji: { fontSize: 48 },
  endText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  endSub: { color: '#818384', fontSize: 13, marginTop: 4 },
  howTo: { marginTop: 24, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
});
