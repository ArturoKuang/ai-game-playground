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
  type PaneState,
  type Move,
} from '../solvers/Pane.solver';

/* ─── Constants ─── */
const GEM_COLORS = [
  '#e74c3c', // red
  '#e67e22', // orange
  '#f1c40f', // yellow
  '#2ecc71', // green
  '#3498db', // blue
  '#9b59b6', // purple
];
const GEM_EMOJIS = ['\uD83D\uDD34', '\uD83D\uDFE0', '\uD83D\uDFE1', '\uD83D\uDFE2', '\uD83D\uDD35', '\uD83D\uDFE3'];
const GEM_NAMES = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple'];
const GEM_SIZE = 36;
const GEM_GAP = 4;

export default function Pane() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const [state, setState] = useState<PaneState>(() => ({
    ...initialState,
    colorCounts: new Map(),
    coveredColors: 0,
    left: 0,
    right: -1,
    moves: 0,
    bestWindow: null,
    validWindowsFound: 0,
  }));
  const [history, setHistory] = useState<PaneState[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(state);
  const { width: screenWidth } = useWindowDimensions();
  const legal = legalMoves(state);

  /* ── Animations ── */
  const windowAnim = useRef(new Animated.Value(0)).current;

  const pulseWindow = useCallback(() => {
    Animated.sequence([
      Animated.timing(windowAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: false,
      }),
      Animated.spring(windowAnim, {
        toValue: 0,
        friction: 3,
        tension: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [windowAnim]);

  /* ── Move handlers ── */
  const handleMove = useCallback(
    (move: Move) => {
      if (solved) return;
      if (!legal.includes(move)) return;

      const next = applyMove(state, move);
      pulseWindow();
      setHistory((h) => [...h, state]);
      setState(next);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('pane', next.moves, initialState.budget).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, legal, initialState.budget, gameRecorded, pulseWindow],
  );

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (history.length === 0 || solved) return;
    setState(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  }, [history, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('pane');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const under = state.moves <= initialState.budget;
    const bestSize = state.bestWindow
      ? state.bestWindow[1] - state.bestWindow[0] + 1
      : '?';
    // Build a mini visualization of the gem row with window
    const gemLine = state.gems
      .map((c, i) => {
        if (state.bestWindow && i >= state.bestWindow[0] && i <= state.bestWindow[1]) {
          return GEM_EMOJIS[c] ?? '\u2B1C';
        }
        return '\u2B1B';
      })
      .join('');

    return [
      `Pane Day #${puzzleDay} \uD83D\uDD0D`,
      `${state.moves}/${initialState.budget} moves | Window: ${bestSize}`,
      under ? '\u2B50 Solved within budget!' : `Solved in ${state.moves} moves`,
      '',
      gemLine,
    ].join('\n');
  }

  const windowActive = state.right >= 0;
  const windowWidth = windowActive ? state.right - state.left + 1 : 0;
  const bestSize = state.bestWindow
    ? state.bestWindow[1] - state.bestWindow[0] + 1
    : null;

  // Calculate gem row dimensions
  const totalGemWidth = state.gems.length * (GEM_SIZE + GEM_GAP) - GEM_GAP;
  const maxRowWidth = Math.min(screenWidth - 32, 600);

  // Scale gems if they don't fit
  const scale = totalGemWidth > maxRowWidth ? maxRowWidth / totalGemWidth : 1;
  const effectiveGemSize = GEM_SIZE * scale;
  const effectiveGap = GEM_GAP * scale;

  /* ── Color legend with check marks ── */
  function renderColorLegend() {
    const items = [];
    for (let c = 0; c < state.numColors; c++) {
      const inWindow = (state.colorCounts.get(c) ?? 0) > 0;
      items.push(
        <View key={c} style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: GEM_COLORS[c] },
              inWindow && styles.legendDotActive,
            ]}
          />
          <Text style={[styles.legendText, inWindow && styles.legendTextActive]}>
            {GEM_NAMES[c]}
          </Text>
          {inWindow && <Text style={styles.checkMark}>{'\u2713'}</Text>}
        </View>,
      );
    }
    return <View style={styles.legend}>{items}</View>;
  }

  /* ── Gem row ── */
  function renderGemRow() {
    return (
      <View style={styles.gemRowContainer}>
        <View style={[styles.gemRow, { width: state.gems.length * (effectiveGemSize + effectiveGap) - effectiveGap }]}>
          {state.gems.map((color, i) => {
            const inWindow = windowActive && i >= state.left && i <= state.right;
            const inBest = state.bestWindow !== null && i >= state.bestWindow[0] && i <= state.bestWindow[1];

            return (
              <View
                key={i}
                style={[
                  styles.gem,
                  {
                    width: effectiveGemSize,
                    height: effectiveGemSize,
                    borderRadius: effectiveGemSize / 2,
                    backgroundColor: GEM_COLORS[color],
                    marginRight: i < state.gems.length - 1 ? effectiveGap : 0,
                  },
                  inWindow && styles.gemInWindow,
                  inBest && !inWindow && styles.gemInBest,
                ]}
              >
                <Text style={[styles.gemIndex, { fontSize: Math.max(8, effectiveGemSize * 0.3) }]}>
                  {i}
                </Text>
              </View>
            );
          })}

          {/* Window overlay */}
          {windowActive && (
            <View
              style={[
                styles.windowOverlay,
                {
                  left: state.left * (effectiveGemSize + effectiveGap) - 3,
                  width: windowWidth * (effectiveGemSize + effectiveGap) - effectiveGap + 6,
                  height: effectiveGemSize + 6,
                  top: -3,
                  borderRadius: effectiveGemSize / 2 + 3,
                },
              ]}
            />
          )}

          {/* Best window indicator */}
          {state.bestWindow && !solved && (
            <View
              style={[
                styles.bestWindowOverlay,
                {
                  left: state.bestWindow[0] * (effectiveGemSize + effectiveGap) - 4,
                  width:
                    (state.bestWindow[1] - state.bestWindow[0] + 1) *
                      (effectiveGemSize + effectiveGap) -
                    effectiveGap +
                    8,
                  height: effectiveGemSize + 8,
                  top: -4,
                  borderRadius: effectiveGemSize / 2 + 4,
                },
              ]}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pane</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Find the smallest window containing all {state.numColors} colors
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Moves</Text>
          <Text
            style={[
              styles.infoVal,
              solved && state.moves <= initialState.budget && styles.infoGood,
            ]}
          >
            {state.moves}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Budget</Text>
          <Text style={styles.infoPar}>{initialState.budget}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Colors</Text>
          <Text
            style={[
              styles.infoVal,
              state.coveredColors === state.numColors && styles.infoGood,
            ]}
          >
            {state.coveredColors}/{state.numColors}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Best</Text>
          <Text style={[styles.infoVal, solved && styles.infoGood]}>
            {bestSize !== null ? bestSize : '-'}
          </Text>
        </View>
      </View>

      {/* Window info */}
      {windowActive && (
        <View style={styles.windowInfo}>
          <Text style={styles.windowInfoText}>
            Window [{state.left}..{state.right}] = {windowWidth} gems
          </Text>
        </View>
      )}

      {/* Color legend */}
      {renderColorLegend()}

      {/* Gem row */}
      {renderGemRow()}

      {/* Action buttons */}
      {!solved && (
        <View style={styles.buttonRow}>
          <Pressable
            style={[
              styles.actionBtn,
              styles.expandBtn,
              !legal.includes('expand') && styles.actionBtnDisabled,
            ]}
            onPress={() => handleMove('expand')}
            disabled={!legal.includes('expand')}
          >
            <Text style={styles.actionBtnText}>
              Expand {'\u2192'}
            </Text>
            <Text style={styles.actionBtnSub}>Right edge +1</Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionBtn,
              styles.shrinkBtn,
              !legal.includes('shrink') && styles.actionBtnDisabled,
            ]}
            onPress={() => handleMove('shrink')}
            disabled={!legal.includes('shrink')}
          >
            <Text style={styles.actionBtnText}>
              {'\u2190'} Shrink
            </Text>
            <Text style={styles.actionBtnSub}>Left edge +1</Text>
          </Pressable>
        </View>
      )}

      {/* Record button */}
      {!solved && (
        <Pressable
          style={[
            styles.recordBtn,
            !legal.includes('record') && styles.recordBtnDisabled,
          ]}
          onPress={() => handleMove('record')}
          disabled={!legal.includes('record')}
        >
          <Text style={styles.recordBtnText}>
            {legal.includes('record')
              ? `\u2705 Record Window (size ${windowWidth})`
              : state.coveredColors < state.numColors
                ? `Missing ${state.numColors - state.coveredColors} color(s)`
                : bestSize !== null && windowWidth >= bestSize
                  ? `Current (${windowWidth}) not smaller than best (${bestSize})`
                  : 'No window to record'}
          </Text>
        </Pressable>
      )}

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
            {state.moves < initialState.budget * 0.5
              ? '\uD83C\uDF1F'
              : state.moves <= initialState.budget
                ? '\u2B50'
                : '\uD83D\uDD0D'}
          </Text>
          <Text style={styles.endText}>
            {state.moves <= initialState.budget
              ? `Found it! Window size ${bestSize} in ${state.moves} moves`
              : `Solved in ${state.moves} moves (budget was ${initialState.budget})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Find the smallest contiguous window of gems that contains at least one
          of every color.{'\n\n'}
          <Text style={{ fontWeight: '700', color: '#fff' }}>Expand</Text> moves
          the right edge one gem to the right.{'\n'}
          <Text style={{ fontWeight: '700', color: '#fff' }}>Shrink</Text> moves
          the left edge one gem to the right.{'\n'}
          <Text style={{ fontWeight: '700', color: '#fff' }}>Record</Text> saves
          the current window as your best (free, only when all colors present).{'\n\n'}
          Each expand/shrink costs 1 move. Budget: {initialState.budget} moves.{'\n'}
          The key insight: you never need to move the right edge backward!
        </Text>
      </View>

      {/* Difficulty selector */}
      <View style={styles.diffRow}>
        <Text style={styles.diffLabel}>Difficulty: </Text>
        {[1, 2, 3, 4, 5].map((d) => (
          <Text
            key={d}
            style={[
              styles.diffDot,
              d <= difficulty && styles.diffDotActive,
            ]}
          >
            {'\u25CF'}
          </Text>
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
    maxWidth: 360,
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
  windowInfo: {
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
  },
  windowInfoText: {
    color: '#3498db',
    fontSize: 12,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.4,
  },
  legendDotActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#fff',
  },
  legendText: {
    color: '#555',
    fontSize: 11,
    fontWeight: '600',
  },
  legendTextActive: {
    color: '#fff',
  },
  checkMark: {
    color: '#2ecc71',
    fontSize: 12,
    fontWeight: '800',
  },
  gemRowContainer: {
    marginBottom: 16,
    alignItems: 'center',
    overflow: 'visible',
  },
  gemRow: {
    flexDirection: 'row',
    position: 'relative',
    paddingVertical: 8,
  },
  gem: {
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  gemInWindow: {
    opacity: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  gemInBest: {
    opacity: 0.8,
    borderWidth: 2,
    borderColor: 'rgba(106,170,100,0.5)',
  },
  gemIndex: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
  },
  windowOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#3498db',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  bestWindowOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#6aaa64',
    backgroundColor: 'rgba(106, 170, 100, 0.08)',
    borderStyle: 'dashed',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  actionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
  },
  expandBtn: {
    backgroundColor: '#2980b9',
  },
  shrinkBtn: {
    backgroundColor: '#e67e22',
  },
  actionBtnDisabled: {
    opacity: 0.3,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  actionBtnSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 2,
  },
  recordBtn: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  recordBtnDisabled: {
    backgroundColor: '#3a3a3c',
    opacity: 0.5,
  },
  recordBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 4,
  },
  undoText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  endMsg: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 380 },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  diffLabel: { color: '#818384', fontSize: 11, fontWeight: '600' },
  diffDot: { color: '#3a3a3c', fontSize: 14, marginHorizontal: 2 },
  diffDotActive: { color: '#6aaa64' },
});
