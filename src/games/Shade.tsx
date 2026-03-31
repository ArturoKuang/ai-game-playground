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
const COLORS = ['#6b7280', '#3498db', '#e74c3c'];
const COLOR_BORDER = ['#9ca3af', '#2980b9', '#c0392b'];
const MULTS = [1, 2, 3];
const COLOR_LABEL = ['\u00d71', '\u00d72', '\u00d73'];
const COLOR_EMOJI = ['\u2b1c', '\ud83d\udd35', '\ud83d\udd34'];
const NODE_R = 22;

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  return {
    numNodes: 7 + d, // Mon:8, Fri:12
    maxVal: 4 + d, // Mon:5, Fri:9
    diagProb: 0.15 + d * 0.06, // Mon:0.21, Fri:0.45
  };
}

/* ─── Graph generation ─── */
function generateGraph(rng: () => number, n: number, diagP: number) {
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const actual = Math.min(n, cols * rows);
  const edges: [number, number][] = [];

  for (let i = 0; i < actual; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    if (c + 1 < cols && i + 1 < actual) edges.push([i, i + 1]);
    if (i + cols < actual) edges.push([i, i + cols]);
    if (c + 1 < cols && i + cols + 1 < actual && rng() < diagP)
      edges.push([i, i + cols + 1]);
    if (c > 0 && i + cols - 1 < actual && rng() < diagP * 0.5)
      edges.push([i, i + cols - 1]);
  }
  return { edges, cols, rows, numNodes: actual };
}

function buildAdj(n: number, edges: [number, number][]): number[][] {
  const a: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    a[u].push(v);
    a[v].push(u);
  }
  return a;
}

/* ─── 3-colorability check ─── */
function is3Col(n: number, adj: number[][]): boolean {
  const c = Array(n).fill(-1);
  function bt(i: number): boolean {
    if (i === n) return true;
    for (let k = 0; k < 3; k++) {
      if (adj[i].every((nb) => c[nb] !== k)) {
        c[i] = k;
        if (bt(i + 1)) return true;
        c[i] = -1;
      }
    }
    return false;
  }
  return bt(0);
}

/* ─── Par solver: max-score valid 3-coloring ─── */
function solvePar(n: number, adj: number[][], vals: number[]): number {
  let best = 0;
  const c = Array(n).fill(-1);
  function bt(i: number, sc: number) {
    if (i === n) {
      best = Math.max(best, sc);
      return;
    }
    let ub = sc;
    for (let j = i; j < n; j++) ub += vals[j] * 3;
    if (ub <= best) return;
    for (let k = 0; k < 3; k++) {
      if (adj[i].every((nb) => c[nb] !== k)) {
        c[i] = k;
        bt(i + 1, sc + vals[i] * MULTS[k]);
        c[i] = -1;
      }
    }
  }
  bt(0, 0);
  return best;
}

/* ─── Full generation with retry ─── */
function generateAll(seed: number) {
  const diff = getDifficulty();
  for (let a = 0; a < 50; a++) {
    const rng = seededRandom(seed + a * 997);
    const g = generateGraph(rng, diff.numNodes, diff.diagProb);
    const adj = buildAdj(g.numNodes, g.edges);
    if (!is3Col(g.numNodes, adj)) continue;
    const vals = Array.from({ length: g.numNodes }, () =>
      1 + Math.floor(rng() * diff.maxVal),
    );
    const par = solvePar(g.numNodes, adj, vals);
    if (par > 0) return { ...g, adj, vals, par };
  }
  // Fallback: path graph
  const rng = seededRandom(seed);
  const n = diff.numNodes;
  const edges: [number, number][] = [];
  for (let i = 0; i < n - 1; i++) edges.push([i, i + 1]);
  const adj = buildAdj(n, edges);
  const vals = Array.from({ length: n }, () =>
    1 + Math.floor(rng() * diff.maxVal),
  );
  const cols = Math.ceil(Math.sqrt(n));
  return {
    edges,
    cols,
    rows: Math.ceil(n / cols),
    numNodes: n,
    adj,
    vals,
    par: solvePar(n, adj, vals),
  };
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Shade() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const puzzle = useMemo(() => generateAll(seed), [seed]);
  const { numNodes, edges, cols, rows, adj, vals, par } = puzzle;

  const [coloring, setColoring] = useState<number[]>(() =>
    Array(numNodes).fill(-1),
  );
  const [brush, setBrush] = useState(2);
  const [locked, setLocked] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);

  /* ── Conflicts ── */
  const conflicts = useMemo(() => {
    const s = new Set<string>();
    for (const [a, b] of edges) {
      if (coloring[a] >= 0 && coloring[a] === coloring[b]) {
        s.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
      }
    }
    return s;
  }, [coloring, edges]);

  const allColored = coloring.every((c) => c >= 0);
  const isValid = allColored && conflicts.size === 0;
  const score = coloring.reduce(
    (sum, c, i) => (c >= 0 ? sum + vals[i] * MULTS[c] : sum),
    0,
  );

  /* ── Layout ── */
  const { width: screenWidth } = useWindowDimensions();
  const cw = Math.min(screenWidth - 48, 340);
  const ch = cw * Math.max(0.6, (rows / cols) * 0.85);
  const sx = cw / (cols + 0.4);
  const sy = ch / (rows + 0.4);

  const pos = useMemo(
    () =>
      Array.from({ length: numNodes }, (_, i) => ({
        x: (i % cols + 0.5) * sx,
        y: (Math.floor(i / cols) + 0.5) * sy,
      })),
    [numNodes, cols, sx, sy],
  );

  /* ── Animations ── */
  const scales = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(1)),
  ).current;
  const bounce = useCallback(
    (i: number) => {
      Animated.sequence([
        Animated.timing(scales[i], {
          toValue: 1.25,
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

  /* ── Handlers ── */
  const handleNode = useCallback(
    (i: number) => {
      if (locked) return;
      bounce(i);
      setColoring((prev) => {
        const next = [...prev];
        next[i] = next[i] === brush ? -1 : brush;
        return next;
      });
    },
    [brush, locked, bounce],
  );

  const handleLock = useCallback(() => {
    if (!isValid || locked) return;
    setLocked(true);
    recordGame('shade', score, par, true).then((s) => {
      setStatsData(s);
      setShowStats(true);
    });
  }, [isValid, locked, score, par]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('shade');
    setStatsData(s);
    setShowStats(true);
  }, []);

  function buildShareText() {
    const beat = score >= par;
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let row = '';
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx < numNodes)
          row += coloring[idx] >= 0 ? COLOR_EMOJI[coloring[idx]] : '\u2b1b';
      }
      lines.push(row);
    }
    return [
      `Shade Day #${puzzleDay} \ud83c\udfa8`,
      `${score}/${par} pts`,
      ...lines,
      beat ? '\u2b50 Beat par!' : `Scored ${score}`,
    ].join('\n');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Shade</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Color nodes so neighbors differ. Higher colors score more.
      </Text>

      {/* Score bar */}
      <View style={styles.scoreBar}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text
            style={[
              styles.scoreVal,
              locked && score >= par && styles.scoreGood,
            ]}
          >
            {score}
          </Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Par</Text>
          <Text style={styles.scorePar}>{par}</Text>
        </View>
        {conflicts.size > 0 && (
          <Text style={styles.conflictBadge}>
            {'\u26a0'} {conflicts.size}
          </Text>
        )}
      </View>

      {/* Palette */}
      <View style={styles.palette}>
        {COLORS.map((color, i) => (
          <Pressable
            key={i}
            onPress={() => !locked && setBrush(i)}
            style={[
              styles.palBtn,
              {
                backgroundColor: color,
                borderColor: brush === i ? '#ffffff' : COLOR_BORDER[i],
              },
              brush === i && styles.palBtnActive,
            ]}
          >
            <Text style={styles.palLabel}>{COLOR_LABEL[i]}</Text>
          </Pressable>
        ))}
      </View>

      {/* Graph */}
      <View style={[styles.graph, { width: cw, height: ch }]}>
        {/* Edges */}
        {edges.map(([a, b]) => {
          const pa = pos[a];
          const pb = pos[b];
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const ek = `${Math.min(a, b)}-${Math.max(a, b)}`;
          const bad = conflicts.has(ek);
          return (
            <View
              key={ek}
              style={{
                position: 'absolute',
                left: (pa.x + pb.x) / 2 - dist / 2,
                top: (pa.y + pb.y) / 2 - 1.5,
                width: dist,
                height: bad ? 4 : 3,
                backgroundColor: bad ? '#e74c3c' : '#3a3a3c',
                opacity: bad ? 1 : 0.4,
                transform: [{ rotate: `${angle}rad` }],
                borderRadius: 2,
              }}
            />
          );
        })}

        {/* Nodes */}
        {Array.from({ length: numNodes }, (_, i) => {
          const c = coloring[i];
          const p = pos[i];
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: p.x - NODE_R,
                top: p.y - NODE_R,
                transform: [{ scale: scales[i] }],
              }}
            >
              <Pressable
                onPress={() => handleNode(i)}
                style={[
                  styles.node,
                  {
                    backgroundColor: c >= 0 ? COLORS[c] : '#2a2a2c',
                    borderColor: c >= 0 ? COLOR_BORDER[c] : '#555',
                  },
                ]}
              >
                <Text style={styles.nodeVal}>{vals[i]}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {/* Lock in */}
      {isValid && !locked && (
        <Pressable style={styles.lockBtn} onPress={handleLock}>
          <Text style={styles.lockText}>Lock In Score</Text>
        </Pressable>
      )}

      <CelebrationBurst show={locked && score >= par} />

      {locked && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {score >= par ? '\ud83c\udf1f' : '\ud83c\udfa8'}
          </Text>
          <Text style={styles.endText}>
            {score >= par
              ? `Beat par! ${score} pts`
              : `Scored ${score} pts`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Pick a color below, then tap nodes to paint them. Connected nodes
          can&apos;t share a color.{'\n\n'}
          Gray = {'\u00d7'}1, Blue = {'\u00d7'}2, Red = {'\u00d7'}3.{' '}
          Maximize your score.{'\n'}Lock in when satisfied. Par: {par}.
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
  scoreBar: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
    alignItems: 'center',
  },
  scoreItem: { alignItems: 'center' },
  scoreLabel: { color: '#818384', fontSize: 12, marginBottom: 2 },
  scoreVal: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  scoreGood: { color: '#2ecc71' },
  scorePar: { color: '#818384', fontSize: 24, fontWeight: '800' },
  conflictBadge: { color: '#e74c3c', fontSize: 14, fontWeight: '700' },
  palette: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  palBtn: {
    width: 56,
    height: 38,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  palBtnActive: { borderWidth: 3 },
  palLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
  graph: { position: 'relative' },
  node: {
    width: NODE_R * 2,
    height: NODE_R * 2,
    borderRadius: NODE_R,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeVal: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  lockBtn: {
    backgroundColor: '#6aaa64',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  lockText: { color: '#fff', fontWeight: '700', fontSize: 16 },
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
