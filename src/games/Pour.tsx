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
  legalMoves,
  solve,
  type PourState,
  type Move,
  type Glass,
} from '../solvers/Pour.solver';

/* ─── Constants ─── */
const LIQUID_COLORS = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
];
const LIQUID_NAMES = ['Red', 'Blue', 'Green'];
const GLASS_MAX_HEIGHT = 140;
const GLASS_WIDTH = 48;
const GLASS_GAP = 6;

export default function Pour() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );
  const par = initialState.par;

  const [state, setState] = useState<PourState>(() => ({
    ...initialState,
    glasses: initialState.glasses.map((g) => ({
      ...g,
      layers: g.layers.map((l) => ({ ...l })),
    })),
  }));
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<PourState[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);
  const [selectedGlass, setSelectedGlass] = useState<number | null>(null);

  const solved = isGoal(state);
  const { width: screenWidth } = useWindowDimensions();

  /* ── Animations ── */
  const glassScales = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(1)),
  ).current;

  const bounceGlass = useCallback(
    (idx: number) => {
      if (glassScales[idx]) {
        Animated.sequence([
          Animated.timing(glassScales[idx], {
            toValue: 1.1,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.spring(glassScales[idx], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
    [glassScales],
  );

  /* ── Pour handler ── */
  const handleGlassTap = useCallback(
    (idx: number) => {
      if (solved) return;

      if (selectedGlass === null) {
        // Select source glass (must have liquid)
        if (state.glasses[idx].layers.length > 0) {
          setSelectedGlass(idx);
          bounceGlass(idx);
        }
        return;
      }

      if (idx === selectedGlass) {
        // Deselect
        setSelectedGlass(null);
        return;
      }

      // Check adjacency
      if (Math.abs(idx - selectedGlass) !== 1) {
        // Not adjacent -- deselect and select new if it has liquid
        if (state.glasses[idx].layers.length > 0) {
          setSelectedGlass(idx);
          bounceGlass(idx);
        } else {
          setSelectedGlass(null);
        }
        return;
      }

      // Attempt pour
      const move: Move = { from: selectedGlass, to: idx };
      const legal = legalMoves(state);
      const isLegal = legal.some((m) => m.from === move.from && m.to === move.to);

      if (!isLegal) {
        setSelectedGlass(null);
        return;
      }

      const next = applyMove(state, move);
      const nextMoves = moves + 1;

      bounceGlass(idx);
      setHistory((h) => [...h, state]);
      setState(next);
      setMoves(nextMoves);
      setSelectedGlass(null);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('pour', nextMoves, par).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, moves, par, selectedGlass, gameRecorded, bounceGlass],
  );

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (history.length === 0 || solved) return;
    setState(history[history.length - 1]);
    setMoves((m) => m - 1);
    setHistory((h) => h.slice(0, -1));
    setSelectedGlass(null);
  }, [history, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('pour');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const under = moves <= par;
    const emojiMap = ['\uD83D\uDFE5', '\uD83D\uDFE6', '\uD83D\uDFE9'];
    const glassEmojis = state.glasses.map((g) => {
      if (g.layers.length === 0) return '\u2B1C';
      return g.layers.map((l) => emojiMap[l.color] ?? '\u2B1C').join('');
    });
    return [
      `Pour Day #${puzzleDay} \uD83E\uDD43`,
      `${moves}/${par} pours`,
      under ? '\u2B50 At or under par!' : `Solved in ${moves}`,
      '',
      glassEmojis.join(' '),
    ].join('\n');
  }

  const h = heuristic(state);

  /* ── Render a single glass column ── */
  function renderGlass(glass: Glass, idx: number, isTarget: boolean) {
    const total = glass.layers.reduce((s, l) => s + l.amount, 0);
    const unitHeight = GLASS_MAX_HEIGHT / glass.capacity;
    const isSelected = !isTarget && idx === selectedGlass;
    const matchesTarget =
      !isTarget &&
      JSON.stringify(glass.layers) === JSON.stringify(state.target[idx].layers);

    return (
      <Animated.View
        key={`${isTarget ? 'tgt' : 'cur'}-${idx}`}
        style={[
          !isTarget && { transform: [{ scale: glassScales[idx] }] },
        ]}
      >
        <Pressable
          onPress={() => !isTarget && handleGlassTap(idx)}
          style={[
            styles.glassOuter,
            isSelected && styles.glassSelected,
            matchesTarget && !isTarget && styles.glassCorrect,
          ]}
        >
          {/* Capacity label */}
          <Text style={styles.capacityLabel}>{glass.capacity}</Text>

          {/* Glass body */}
          <View
            style={[
              styles.glassBody,
              { height: GLASS_MAX_HEIGHT, width: GLASS_WIDTH },
            ]}
          >
            {/* Empty space at top */}
            <View style={{ flex: glass.capacity - total }} />

            {/* Liquid layers from top to bottom (reverse order for rendering) */}
            {[...glass.layers].reverse().map((layer, li) => (
              <View
                key={li}
                style={{
                  height: unitHeight * layer.amount,
                  backgroundColor: LIQUID_COLORS[layer.color] ?? '#888',
                  borderTopWidth: li === 0 ? 0 : 1,
                  borderTopColor: 'rgba(0,0,0,0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 8,
                }}
              >
                <Text style={styles.layerAmount}>{layer.amount}</Text>
              </View>
            ))}
          </View>

          {/* Glass number */}
          <Text style={styles.glassNumber}>{idx + 1}</Text>
        </Pressable>
      </Animated.View>
    );
  }

  /* ── Pour preview ── */
  function renderPourPreview() {
    if (selectedGlass === null || solved) return null;

    const src = state.glasses[selectedGlass];
    if (src.layers.length === 0) return null;

    const topLayer = src.layers[src.layers.length - 1];
    const colorName = LIQUID_NAMES[topLayer.color] ?? '?';

    // Show what can pour left and right
    const previews: string[] = [];
    if (selectedGlass > 0) {
      const dst = state.glasses[selectedGlass - 1];
      const rem = dst.capacity - dst.layers.reduce((s, l) => s + l.amount, 0);
      if (rem > 0) {
        const amt = Math.min(topLayer.amount, rem);
        previews.push(`\u2190 ${amt} ${colorName}`);
      }
    }
    if (selectedGlass < state.glasses.length - 1) {
      const dst = state.glasses[selectedGlass + 1];
      const rem = dst.capacity - dst.layers.reduce((s, l) => s + l.amount, 0);
      if (rem > 0) {
        const amt = Math.min(topLayer.amount, rem);
        previews.push(`${amt} ${colorName} \u2192`);
      }
    }

    if (previews.length === 0) return null;

    return (
      <View style={styles.previewBar}>
        <Text style={styles.previewText}>
          Pour: {previews.join('  |  ')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pour</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Pour liquid between adjacent glasses to match the target.
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Pours</Text>
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

      {/* Pour preview */}
      {renderPourPreview()}

      {/* Current glasses */}
      <Text style={styles.sectionLabel}>Current</Text>
      <View style={styles.glassRow}>
        {state.glasses.map((g, i) => renderGlass(g, i, false))}
      </View>

      {/* Target glasses */}
      <Text style={styles.sectionLabel}>Target</Text>
      <View style={styles.glassRow}>
        {state.target.map((g, i) => renderGlass(g, i, true))}
      </View>

      {/* Undo */}
      {!solved && history.length > 0 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      )}

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {moves < par ? '\uD83C\uDF1F' : moves === par ? '\u2B50' : '\uD83E\uDD43'}
          </Text>
          <Text style={styles.endText}>
            {moves < par
              ? `Under par! ${moves} pours`
              : moves === par
                ? `At par! ${moves} pours`
                : `Solved in ${moves} pours`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap a glass to select it, then tap an adjacent glass to pour.
          The top layer of liquid pours first, limited by the receiving
          glass's remaining capacity.{'\n\n'}
          Match the target distribution of colored liquid in each glass.
          Numbers on layers show units. Numbers above glasses show capacity.{'\n'}
          Par: {par} pours.
        </Text>
      </View>

      {/* Color legend */}
      <View style={styles.legend}>
        {LIQUID_COLORS.slice(0, state.glasses.length > 5 ? 3 : 2).map((c, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c }]} />
            <Text style={styles.legendText}>{LIQUID_NAMES[i]}</Text>
          </View>
        ))}
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
    maxWidth: 340,
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
  sectionLabel: {
    color: '#818384',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  glassRow: {
    flexDirection: 'row',
    gap: GLASS_GAP,
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  glassOuter: {
    alignItems: 'center',
    padding: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  glassSelected: {
    borderColor: '#f1c40f',
    backgroundColor: 'rgba(241,196,15,0.1)',
  },
  glassCorrect: {
    borderColor: '#6aaa64',
  },
  glassBody: {
    borderWidth: 2,
    borderColor: '#555',
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#1a1a1b',
  },
  capacityLabel: {
    color: '#818384',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  glassNumber: {
    color: '#555',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  layerAmount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '800',
  },
  previewBar: {
    backgroundColor: 'rgba(241,196,15,0.15)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(241,196,15,0.3)',
  },
  previewText: {
    color: '#f1c40f',
    fontSize: 12,
    fontWeight: '600',
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
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: '#818384',
    fontSize: 11,
    fontWeight: '600',
  },
});
