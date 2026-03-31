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
const DIAL_COLORS = ['#3a3a3c', '#3498db', '#2ecc71', '#f1c40f'];
const DIAL_BORDER = ['#6aaa64', '#2980b9', '#27ae60', '#f39c12'];
const COLOR_EMOJI = ['\u2b1b', '\ud83d\udd35', '\ud83d\udfe2', '\ud83d\udfe1'];
const DIAL_SIZE = 64;
const MAX_DIALS = 8;

/* ─── Coupling graph generation ─── */
function generateCouplings(
  rng: () => number,
  n: number,
  maxC: number,
): number[][] {
  const c: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const count = 1 + (maxC > 1 ? Math.floor(rng() * maxC) : 0);
    const cands: number[] = [];
    for (let j = 0; j < n; j++) if (j !== i) cands.push(j);
    for (let k = cands.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [cands[k], cands[j]] = [cands[j], cands[k]];
    }
    for (let k = 0; k < Math.min(count, cands.length); k++) c[i].push(cands[k]);
  }
  return c;
}

/* ─── Tap: advance tapped dial + all its couplings ─── */
function applyTap(
  state: number[],
  dial: number,
  couplings: number[][],
): number[] {
  const s = [...state];
  s[dial] = (s[dial] + 1) % 4;
  for (const t of couplings[dial]) s[t] = (s[t] + 1) % 4;
  return s;
}

/* ─── Backward-scramble: start solved, apply random taps ─── */
function generatePuzzle(
  rng: () => number,
  n: number,
  couplings: number[][],
  scramble: number,
): number[] {
  let s = Array(n).fill(0);
  for (let i = 0; i < scramble; i++) {
    s = applyTap(s, Math.floor(rng() * n), couplings);
  }
  if (s.every((v) => v === 0)) s = applyTap(s, 0, couplings);
  return s;
}

/* ─── BFS solver (state space ≤ 4^6 = 4096 — instant) ─── */
function solveBFS(initial: number[], couplings: number[][]): number {
  const n = initial.length;
  const tgt = Array(n).fill(0).join(',');
  const key0 = initial.join(',');
  if (key0 === tgt) return 0;
  const visited = new Set<string>([key0]);
  let front: number[][] = [initial];
  for (let d = 1; d <= 30; d++) {
    const next: number[][] = [];
    for (const st of front) {
      for (let i = 0; i < n; i++) {
        const ns = applyTap(st, i, couplings);
        const k = ns.join(',');
        if (k === tgt) return d;
        if (!visited.has(k)) {
          visited.add(k);
          next.push(ns);
        }
      }
    }
    front = next;
    if (front.length === 0) break;
  }
  return -1;
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Dial() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);

  /* ── Generate puzzle deterministically from seed ── */
  const puzzle = useMemo(() => {
    const d = getDayDifficulty();
    const numDials = 3 + Math.ceil(d / 2); // Mon:4  Wed:5  Fri:6
    const maxC = d <= 2 ? 1 : 2;
    const scramble = 2 + d; // Mon:3  Fri:7

    for (let a = 0; a < 50; a++) {
      const rng = seededRandom(seed + a * 997);
      const couplings = generateCouplings(rng, numDials, maxC);
      const initial = generatePuzzle(rng, numDials, couplings, scramble);
      const par = solveBFS(initial, couplings);
      if (par >= 2) return { numDials, couplings, initial, par };
    }
    // Fallback (should never reach)
    const rng = seededRandom(seed);
    const couplings = generateCouplings(rng, numDials, maxC);
    const initial = generatePuzzle(rng, numDials, couplings, scramble);
    return {
      numDials,
      couplings,
      initial,
      par: Math.max(solveBFS(initial, couplings), 1),
    };
  }, [seed]);

  const { numDials, couplings, initial, par } = puzzle;
  const moveLimit = par + numDials + 3;

  /* ── State ── */
  const [state, setState] = useState(() => [...initial]);
  const [moves, setMoves] = useState(0);
  const [discovered, setDiscovered] = useState<Set<string>>(() => new Set());
  const [tapHistory, setTapHistory] = useState<number[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = state.every((v) => v === 0);
  const failed = !solved && moves >= moveLimit;
  const gameOver = solved || failed;

  /* ── Layout ── */
  const { width: screenWidth } = useWindowDimensions();
  const containerSize = Math.min(screenWidth - 48, 340);
  const ringRadius = containerSize * 0.33;
  const ctr = containerSize / 2;

  const positions = useMemo(
    () =>
      Array.from({ length: numDials }, (_, i) => {
        const a = (i / numDials) * Math.PI * 2 - Math.PI / 2;
        return {
          x: ctr + ringRadius * Math.cos(a) - DIAL_SIZE / 2,
          y: ctr + ringRadius * Math.sin(a) - DIAL_SIZE / 2,
          cx: ctr + ringRadius * Math.cos(a),
          cy: ctr + ringRadius * Math.sin(a),
        };
      }),
    [numDials, ctr, ringRadius],
  );

  /* ── Animations ── */
  const scales = useRef(
    Array.from({ length: MAX_DIALS }, () => new Animated.Value(1)),
  ).current;
  const linkOps = useRef(new Map<string, Animated.Value>()).current;

  const getOp = useCallback(
    (key: string) => {
      if (!linkOps.has(key)) linkOps.set(key, new Animated.Value(0));
      return linkOps.get(key)!;
    },
    [linkOps],
  );

  const bounceDial = useCallback(
    (i: number) => {
      Animated.sequence([
        Animated.timing(scales[i], {
          toValue: 1.2,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.spring(scales[i], {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [scales],
  );

  /* ── Tap handler ── */
  const handleTap = useCallback(
    (idx: number) => {
      if (gameOver) return;

      const next = applyTap(state, idx, couplings);
      const nextMoves = moves + 1;

      // Bounce tapped dial
      bounceDial(idx);

      // Discover & animate couplings
      const newDisc = new Set(discovered);
      for (const c of couplings[idx]) {
        bounceDial(c);
        const lk = `${idx}-${c}`;
        if (!newDisc.has(lk)) {
          newDisc.add(lk);
          Animated.timing(getOp(lk), {
            toValue: 0.6,
            duration: 300,
            useNativeDriver: true,
          }).start();
        } else {
          const op = getOp(lk);
          Animated.sequence([
            Animated.timing(op, {
              toValue: 1,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.timing(op, {
              toValue: 0.6,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }

      setState(next);
      setMoves(nextMoves);
      setDiscovered(newDisc);
      setTapHistory((h) => [...h, idx]);

      // Record game on solve or failure
      const isSolved = next.every((v) => v === 0);
      if (isSolved || nextMoves >= moveLimit) {
        if (!gameRecorded) {
          setGameRecorded(true);
          const score = isSolved ? nextMoves : moveLimit + 1;
          recordGame('dial', score, par).then((s) => {
            setStatsData(s);
            setShowStats(true);
          });
        }
      }
    },
    [state, moves, gameOver, discovered, gameRecorded, couplings, par, moveLimit, bounceDial, getOp],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('dial');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText(): string {
    const under = moves <= par;
    const initEmoji = initial.map((v) => COLOR_EMOJI[v]).join('');
    const targetEmoji = COLOR_EMOJI[0].repeat(numDials);
    return [
      `Dial Day #${puzzleDay} \ud83d\udd04`,
      `${moves}/${par} moves`,
      `${initEmoji}\u2192${targetEmoji}`,
      under ? '\u2b50 Under par!' : `Solved in ${moves} moves`,
    ].join('\n');
  }

  const remaining = moveLimit - moves;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dial</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Tap dials to cycle colors. Discover hidden links. All dials{' '}
        {'\u2192'} dark.
      </Text>

      {/* Move counter */}
      <View style={styles.moveCounter}>
        <Text style={styles.moveLabel}>Moves</Text>
        <Text
          style={[
            styles.moveCount,
            solved && moves <= par && styles.moveCountGood,
          ]}
        >
          {moves}
        </Text>
        <Text style={styles.movePar}>Par: {par}</Text>
        <Text
          style={[
            styles.movesLeft,
            remaining <= 3 && !gameOver && styles.movesLeftDanger,
          ]}
        >
          {remaining} left
        </Text>
      </View>

      {/* Progress dots */}
      <View style={styles.progress}>
        {Array.from({ length: numDials }, (_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              state[i] === 0 && styles.progressDotDone,
            ]}
          />
        ))}
      </View>

      {/* Dial ring */}
      <View
        style={[styles.ring, { width: containerSize, height: containerSize }]}
      >
        {/* Connection lines (rendered first = behind dials) */}
        {Array.from(discovered).map((lk) => {
          const [fi, ti] = lk.split('-').map(Number);
          const fp = positions[fi];
          const tp = positions[ti];
          if (!fp || !tp) return null;
          const dx = tp.cx - fp.cx;
          const dy = tp.cy - fp.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          return (
            <Animated.View
              key={lk}
              style={{
                position: 'absolute',
                left: (fp.cx + tp.cx) / 2 - dist / 2,
                top: (fp.cy + tp.cy) / 2 - 1.5,
                width: dist,
                height: 3,
                backgroundColor: '#6aaa64',
                opacity: getOp(lk),
                transform: [{ rotate: `${angle}rad` }],
                borderRadius: 2,
              }}
            />
          );
        })}

        {/* Dials */}
        {state.map((val, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: positions[i].x,
              top: positions[i].y,
              transform: [{ scale: scales[i] }],
            }}
          >
            <Pressable
              onPress={() => handleTap(i)}
              style={[
                styles.dial,
                {
                  backgroundColor: DIAL_COLORS[val],
                  borderColor: DIAL_BORDER[val],
                },
              ]}
            >
              <Text style={styles.dialNum}>{i}</Text>
              {val === 0 && <Text style={styles.dialCheck}>{'\u2713'}</Text>}
            </Pressable>
          </Animated.View>
        ))}
      </View>

      <CelebrationBurst show={solved && moves <= par} />

      {/* Win */}
      {solved && (
        <View style={styles.endMessage}>
          <Text style={styles.endEmoji}>
            {moves <= par ? '\ud83c\udf1f' : '\ud83d\udd04'}
          </Text>
          <Text style={styles.endText}>
            {moves <= par
              ? `Under par! ${moves} moves`
              : `Synced in ${moves} moves`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      {/* Fail */}
      {failed && (
        <View style={styles.endMessage}>
          <Text style={styles.endEmoji}>{'\ud83d\ude35'}</Text>
          <Text style={styles.endText}>Out of moves!</Text>
        </View>
      )}

      {/* How to play */}
      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Each dial cycles through 4 colors when tapped. Some dials are secretly
          linked — tapping one also changes its linked dials.{'\n\n'}
          Discover the hidden links and get every dial to dark ({'\u2b1b'}).
          {'\n'}You have {moveLimit} moves. Par: {par}.
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
    maxWidth: 300,
  },
  moveCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  moveLabel: { color: '#818384', fontSize: 14 },
  moveCount: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  moveCountGood: { color: '#2ecc71' },
  movePar: { color: '#818384', fontSize: 14 },
  movesLeft: { color: '#818384', fontSize: 14, marginLeft: 8 },
  movesLeftDanger: { color: '#e74c3c' },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#555555',
  },
  progressDotDone: { backgroundColor: '#6aaa64' },
  ring: { position: 'relative' },
  dial: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialNum: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    fontWeight: '700',
  },
  dialCheck: {
    position: 'absolute',
    bottom: 4,
    color: '#6aaa64',
    fontSize: 16,
    fontWeight: '900',
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
