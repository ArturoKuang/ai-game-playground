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
  generatePuzzle,
  applyMove,
  isGoal,
  heuristic,
  solve,
  type FerryState,
  type Move,
} from '../solvers/Ferry.solver';

/* ─── Constants ─── */
const TOKEN_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6',
  '#e67e22', '#1abc9c', '#e91e63', '#795548', '#607d8b',
];
const TOKEN_LABELS = [
  'R', 'B', 'G', 'Y', 'P', 'O', 'T', 'M', 'W', 'S',
];

export default function Ferry() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );
  const par = useMemo(() => {
    const sol = solve(initialState, 5);
    const optimal = sol ? sol.steps : 8;
    // Par generosity: Mon = optimal+4, Fri = optimal+1
    const bonus = Math.max(1, 5 - difficulty);
    return optimal + bonus;
  }, [initialState, difficulty]);

  const [state, setState] = useState<FerryState>(() => ({
    tokens: [...initialState.tokens],
    graph: initialState.graph,
  }));
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<number[][]>(() => [[...initialState.tokens]]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(state);
  const { width: screenWidth } = useWindowDimensions();
  const containerSize = Math.min(screenWidth - 32, 340);

  const nodeCount = state.graph.nodes.length;

  /* ─── Animations ─── */
  const nodeScales = useRef(
    Array.from({ length: 12 }, () => new Animated.Value(1)),
  ).current;

  const bounceNode = useCallback(
    (idx: number) => {
      if (idx >= nodeScales.length) return;
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
      ]).start();
    },
    [nodeScales],
  );

  /* ─── Tap handler ─── */
  const handleTap = useCallback(
    (nodeIdx: number) => {
      if (solved) return;

      if (selected === null) {
        // Select the node
        setSelected(nodeIdx);
        bounceNode(nodeIdx);
        return;
      }

      if (selected === nodeIdx) {
        // Deselect
        setSelected(null);
        return;
      }

      // Check if edge exists between selected and nodeIdx
      const isAdjacent = state.graph.adjacency[selected].includes(nodeIdx);
      if (!isAdjacent) {
        // Invalid — select new node instead
        setSelected(nodeIdx);
        bounceNode(nodeIdx);
        return;
      }

      // Perform swap
      const move: Move = [selected, nodeIdx];
      bounceNode(selected);
      bounceNode(nodeIdx);
      const next = applyMove(state, move);
      const nextMoves = moves + 1;
      setState(next);
      setMoves(nextMoves);
      setHistory((h) => [...h, [...next.tokens]]);
      setSelected(null);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('ferry', nextMoves, par * 3).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, selected, moves, par, gameRecorded, bounceNode],
  );

  /* ─── Undo ─── */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prevTokens = history[history.length - 2];
    setState({ tokens: [...prevTokens], graph: state.graph });
    setMoves((m) => m - 1);
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
  }, [history, solved, state.graph]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('ferry');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ─── Share text ─── */
  function buildShareText() {
    const under = moves <= par;
    return [
      `Ferry Day #${puzzleDay} \u26f4\uFE0F`,
      `${moves}/${par} swaps`,
      under ? '\u2b50 Under par!' : `Solved in ${moves}`,
    ].join('\n');
  }

  const h = heuristic(state);

  /* ─── Compute pixel positions from normalized graph coords ─── */
  const padding = 36;
  const nodeRadius = Math.max(18, Math.min(24, containerSize / (nodeCount + 2)));

  function toPixel(nx: number, ny: number): { x: number; y: number } {
    return {
      x: padding + nx * (containerSize - 2 * padding),
      y: padding + ny * (containerSize - 2 * padding),
    };
  }

  /* ─── Render edges ─── */
  function renderEdges() {
    return state.graph.edges.map(([a, b]) => {
      const pa = toPixel(state.graph.nodes[a].x, state.graph.nodes[a].y);
      const pb = toPixel(state.graph.nodes[b].x, state.graph.nodes[b].y);
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Highlight if one end is selected
      const highlight = selected === a || selected === b;

      return (
        <View
          key={`edge-${a}-${b}`}
          style={{
            position: 'absolute',
            left: (pa.x + pb.x) / 2 - dist / 2,
            top: (pa.y + pb.y) / 2 - 1.5,
            width: dist,
            height: highlight ? 4 : 3,
            backgroundColor: highlight ? '#f1c40f' : '#555',
            opacity: highlight ? 0.8 : 0.4,
            transform: [{ rotate: `${angle}rad` }],
            borderRadius: 2,
          }}
        />
      );
    });
  }

  /* ─── Render nodes ─── */
  function renderNodes() {
    return state.graph.nodes.map((node, i) => {
      const pos = toPixel(node.x, node.y);
      const tokenColor = state.tokens[i];
      const isCorrect = tokenColor === i;
      const isSelected = selected === i;
      const isSelectable =
        selected !== null && state.graph.adjacency[selected].includes(i);

      return (
        <Animated.View
          key={`node-${i}`}
          style={{
            position: 'absolute',
            left: pos.x - nodeRadius,
            top: pos.y - nodeRadius,
            transform: [{ scale: i < nodeScales.length ? nodeScales[i] : 1 }],
            zIndex: isSelected ? 10 : 1,
          }}
        >
          <Pressable onPress={() => handleTap(i)}>
            {/* Goal ring (destination color) */}
            <View
              style={[
                styles.goalRing,
                {
                  width: nodeRadius * 2 + 8,
                  height: nodeRadius * 2 + 8,
                  borderRadius: nodeRadius + 4,
                  borderColor: isCorrect
                    ? '#6aaa64'
                    : isSelected
                      ? '#ffffff'
                      : isSelectable
                        ? '#f1c40f'
                        : TOKEN_COLORS[i],
                  borderWidth: isCorrect ? 3 : isSelected ? 3 : isSelectable ? 2 : 2,
                  opacity: isCorrect ? 1 : 0.5,
                },
              ]}
            />
            {/* Token (colored circle) */}
            <View
              style={[
                styles.token,
                {
                  width: nodeRadius * 2,
                  height: nodeRadius * 2,
                  borderRadius: nodeRadius,
                  backgroundColor: TOKEN_COLORS[tokenColor],
                  borderColor: isSelected ? '#ffffff' : 'rgba(0,0,0,0.3)',
                  borderWidth: isSelected ? 3 : 1,
                },
              ]}
            >
              <Text style={[styles.tokenText, { fontSize: nodeRadius * 0.7 }]}>
                {TOKEN_LABELS[tokenColor]}
              </Text>
            </View>
            {/* Goal label */}
            {!isCorrect && (
              <Text
                style={[
                  styles.goalLabel,
                  {
                    color: TOKEN_COLORS[i],
                    fontSize: Math.max(9, nodeRadius * 0.45),
                  },
                ]}
              >
                {TOKEN_LABELS[i]}
              </Text>
            )}
          </Pressable>
        </Animated.View>
      );
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ferry</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Tap two connected islands to swap ferries. Get each ferry to its matching port.
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Swaps</Text>
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

      {/* Graph display */}
      <View
        style={[
          styles.graphContainer,
          { width: containerSize, height: containerSize },
        ]}
      >
        {renderEdges()}
        {renderNodes()}
      </View>

      {/* Undo */}
      {!solved && history.length > 1 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      )}

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {moves < par ? '\ud83c\udf1f' : moves === par ? '\u2b50' : '\u26f4\uFE0F'}
          </Text>
          <Text style={styles.endText}>
            {moves < par
              ? `Under par! ${moves} swaps`
              : moves === par
                ? `At par! ${moves} swaps`
                : `Solved in ${moves} swaps`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Each island has a colored ferry and a colored port (ring).{'\n'}
          Tap two connected islands to swap their ferries.{'\n'}
          Get each ferry to the matching port within par.{'\n\n'}
          The outer ring shows which ferry belongs at that island.{'\n'}
          Green ring = ferry is home!{'\n'}
          Par: {par} swaps.
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
  graphContainer: {
    position: 'relative',
    marginBottom: 12,
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
  },
  goalRing: {
    position: 'absolute',
    left: -4,
    top: -4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  token: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenText: { color: '#fff', fontWeight: '800' },
  goalLabel: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
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
