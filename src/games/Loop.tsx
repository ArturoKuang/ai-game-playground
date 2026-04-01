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
import { getDailySeed, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';
import {
  TOTAL,
  LOOP_A,
  LOOP_B,
  generatePuzzle,
  applyMove,
  isGoal,
  heuristic,
  solve,
  type Move,
} from '../solvers/Loop.solver';

/* ─── Constants ─── */
const NODE_SIZE = 44;
const TILE_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#e91e63', '#795548', '#607d8b',
];

/* ─── Layout: figure-8 positions ─── */
// Position each of the 10 nodes in a figure-eight layout
// Loop A forms the left ring, Loop B the right ring
// Shared: positions 2 (top-center) and 5 (bottom-center)
function getNodePositions(width: number, height: number) {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width * 0.28; // ring x-radius
  const ry = height * 0.35; // ring y-radius

  // Loop A: positions 0,1,2,3,4,5 — left ring
  // Loop B: positions 2,6,7,8,9,5 — right ring
  // Position 2 = top shared, Position 5 = bottom shared

  const positions: { x: number; y: number }[] = [];
  // A: 0=left, 1=top-left, 2=top-center(shared), 3=left-below, 4=bottom-left, 5=bottom-center(shared)
  const aAngles = [Math.PI, Math.PI * 0.65, Math.PI * 0.35, Math.PI * 1.35, Math.PI * 1.65, 0];
  for (let i = 0; i < 6; i++) {
    const a = aAngles[i];
    positions.push({
      x: cx - rx * 0.5 + rx * Math.cos(a),
      y: cy + ry * Math.sin(a),
    });
  }
  // B: 6=top-right, 7=right, 8=bottom-right, 9=bottom-right-inner
  const bAngles = [Math.PI * 0.65, 0, Math.PI * 1.35, Math.PI * 1.65];
  for (let i = 0; i < 4; i++) {
    const a = bAngles[i];
    positions.push({
      x: cx + rx * 0.5 + rx * Math.cos(a),
      y: cy + ry * Math.sin(a),
    });
  }

  return positions;
}

export default function Loop() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );
  const par = useMemo(() => {
    const sol = solve(initialState, 5);
    return sol ? sol.steps : 10;
  }, [initialState]);

  const [state, setState] = useState(() => [...initialState]);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<number[][]>(() => [[...initialState]]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(state);
  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = Math.min(screenWidth - 32, 340);
  const containerHeight = containerWidth * 0.7;

  const positions = useMemo(
    () => getNodePositions(containerWidth, containerHeight),
    [containerWidth, containerHeight],
  );

  /* ── Animations ── */
  const nodeScales = useRef(
    Array.from({ length: TOTAL }, () => new Animated.Value(1)),
  ).current;

  const bounceLoop = useCallback(
    (loop: number[]) => {
      const anims = loop.map((idx) =>
        Animated.sequence([
          Animated.timing(nodeScales[idx], {
            toValue: 1.2,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.spring(nodeScales[idx], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]),
      );
      Animated.parallel(anims).start();
    },
    [nodeScales],
  );

  /* ── Rotate handler ── */
  const handleRotate = useCallback(
    (move: Move) => {
      if (solved) return;
      bounceLoop(move < 2 ? LOOP_A : LOOP_B);
      const next = applyMove(state, move);
      const nextMoves = moves + 1;
      setState(next);
      setMoves(nextMoves);
      setHistory((h) => [...h, next]);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('loop', nextMoves, par).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, moves, par, gameRecorded, bounceLoop],
  );

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    setState([...history[history.length - 2]]);
    setMoves((m) => m - 1);
    setHistory((h) => h.slice(0, -1));
  }, [history, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('loop');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const under = moves <= par;
    return [
      `Loop Day #${puzzleDay} \ud83d\udd04`,
      `${moves}/${par} rotations`,
      under ? '\u2b50 Under par!' : `Solved in ${moves}`,
    ].join('\n');
  }

  const h = heuristic(state);
  const sharedSet = new Set([2, 5]); // positions shared by both loops

  /* ── Draw loop connection lines ── */
  function renderLoopEdges(loop: number[], color: string) {
    const edges = [];
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      const pa = positions[a];
      const pb = positions[b];
      if (!pa || !pb) continue;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      edges.push(
        <View
          key={`${a}-${b}`}
          style={{
            position: 'absolute',
            left: (pa.x + pb.x) / 2 - dist / 2,
            top: (pa.y + pb.y) / 2 - 1.5,
            width: dist,
            height: 3,
            backgroundColor: color,
            opacity: 0.3,
            transform: [{ rotate: `${angle}rad` }],
            borderRadius: 2,
          }}
        />,
      );
    }
    return edges;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Loop</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Rotate the rings to sort tiles. Shared tiles move with both.
      </Text>

      {/* Info */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Moves</Text>
          <Text
            style={[
              styles.infoVal,
              solved && moves <= par && styles.infoGood,
            ]}
          >
            {moves}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Wrong</Text>
          <Text style={styles.infoVal}>{h}</Text>
        </View>
      </View>

      {/* Ring display */}
      <View
        style={[
          styles.ringContainer,
          { width: containerWidth, height: containerHeight },
        ]}
      >
        {/* Loop edges */}
        {renderLoopEdges(LOOP_A, '#3498db')}
        {renderLoopEdges(LOOP_B, '#e74c3c')}

        {/* Nodes */}
        {positions.map((pos, i) => {
          if (!pos) return null;
          const tile = state[i];
          const isCorrect = tile === i;
          const isShared = sharedSet.has(i);
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: pos.x - NODE_SIZE / 2,
                top: pos.y - NODE_SIZE / 2,
                transform: [{ scale: nodeScales[i] }],
              }}
            >
              <View
                style={[
                  styles.node,
                  {
                    backgroundColor: TILE_COLORS[tile],
                    borderColor: isCorrect
                      ? '#6aaa64'
                      : isShared
                        ? '#ffffff'
                        : 'rgba(0,0,0,0.3)',
                    borderWidth: isCorrect ? 3 : isShared ? 2 : 1,
                  },
                ]}
              >
                <Text style={styles.nodeNum}>{tile}</Text>
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* Rotation buttons */}
      {!solved && (
        <View style={styles.btnRow}>
          <View style={styles.btnGroup}>
            <Text style={styles.btnGroupLabel}>Ring A</Text>
            <View style={styles.btnPair}>
              <Pressable
                style={[styles.rotBtn, styles.rotBtnA]}
                onPress={() => handleRotate(1)}
              >
                <Text style={styles.rotBtnText}>{'\u21ba'}</Text>
              </Pressable>
              <Pressable
                style={[styles.rotBtn, styles.rotBtnA]}
                onPress={() => handleRotate(0)}
              >
                <Text style={styles.rotBtnText}>{'\u21bb'}</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.btnGroup}>
            <Text style={styles.btnGroupLabel}>Ring B</Text>
            <View style={styles.btnPair}>
              <Pressable
                style={[styles.rotBtn, styles.rotBtnB]}
                onPress={() => handleRotate(3)}
              >
                <Text style={styles.rotBtnText}>{'\u21ba'}</Text>
              </Pressable>
              <Pressable
                style={[styles.rotBtn, styles.rotBtnB]}
                onPress={() => handleRotate(2)}
              >
                <Text style={styles.rotBtnText}>{'\u21bb'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Undo */}
      {!solved && history.length > 1 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      )}

      <CelebrationBurst show={solved && moves <= par} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {moves <= par ? '\ud83c\udf1f' : '\ud83d\udd04'}
          </Text>
          <Text style={styles.endText}>
            {moves <= par
              ? `Under par! ${moves} rotations`
              : `Solved in ${moves} rotations`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Two rings share two tiles. Rotate either ring to sort tiles so each
          number matches its position.{'\n\n'}
          The shared tiles (white border) belong to both rings — rotating either
          ring moves them.{'\n'}
          Par: {par} rotations.
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
  infoBar: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 11, marginBottom: 2 },
  infoVal: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  infoGood: { color: '#2ecc71' },
  infoPar: { color: '#818384', fontSize: 22, fontWeight: '800' },
  ringContainer: { position: 'relative', marginBottom: 12 },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeNum: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnRow: { flexDirection: 'row', gap: 24, marginBottom: 8 },
  btnGroup: { alignItems: 'center' },
  btnGroupLabel: {
    color: '#818384',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  btnPair: { flexDirection: 'row', gap: 8 },
  rotBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  rotBtnA: {
    backgroundColor: '#1a3d5c',
    borderColor: '#3498db',
  },
  rotBtnB: {
    backgroundColor: '#5c1a1a',
    borderColor: '#e74c3c',
  },
  rotBtnText: { color: '#ffffff', fontSize: 22, fontWeight: '700' },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  undoText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
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
