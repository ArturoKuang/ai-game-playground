import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Animated,
  Platform,
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
  legalMoves,
  solve,
  type PinchState,
  type Move,
} from '../solvers/Pinch.solver';

/* ─── Constants ─── */
const TILE_GAP = 4;
const LEFT_COLOR = '#3498db';   // blue for left cursor
const RIGHT_COLOR = '#e67e22';  // orange for right cursor
const MATCH_COLOR = '#2ecc71';  // green when sum matches
const DEAD_COLOR = '#333';      // gray for collected tiles
const TARGET_HIT_COLOR = '#27ae60';

export default function Pinch() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const [state, setState] = useState<PinchState>(() => ({
    ...initialState,
    dead: [...initialState.dead],
    found: [...initialState.found],
    collected: [...initialState.collected],
  }));
  const [history, setHistory] = useState<PinchState[]>(() => [state]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(state);
  const legal = useMemo(() => new Set(legalMoves(state)), [state]);
  const budgetExhausted = !solved && state.moves >= state.budget;

  const { width: screenWidth } = useWindowDimensions();
  const maxTileRow = Math.min(screenWidth - 48, 500);
  const tileSize = Math.min(
    44,
    Math.floor((maxTileRow - (state.tiles.length - 1) * TILE_GAP) / state.tiles.length),
  );
  const rowWidth = state.tiles.length * tileSize + (state.tiles.length - 1) * TILE_GAP;

  // Current sum
  const currentSum =
    state.left >= 0 && state.right >= 0 &&
    state.left < state.tiles.length && state.right < state.tiles.length &&
    !state.dead[state.left] && !state.dead[state.right]
      ? state.tiles[state.left] + state.tiles[state.right]
      : null;

  const remainingTargets = state.targets.filter(t => !state.found.includes(t));
  const sumMatchesTarget = currentSum !== null && remainingTargets.includes(currentSum);

  /* ─── Animations ─── */
  const tileScales = useRef(
    Array.from({ length: state.tiles.length }, () => new Animated.Value(1)),
  ).current;

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shakeRow = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const animateTile = useCallback((idx: number) => {
    Animated.sequence([
      Animated.timing(tileScales[idx], {
        toValue: 1.15,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.spring(tileScales[idx], {
        toValue: 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [tileScales]);

  /* ─── Move handlers ─── */
  const doMove = useCallback(
    (move: Move) => {
      if (solved || budgetExhausted) return;
      if (!legal.has(move)) {
        shakeRow();
        return;
      }

      // Animate affected tiles
      if (move === 'left') animateTile(state.left);
      else if (move === 'right') animateTile(state.right);
      else {
        animateTile(state.left);
        animateTile(state.right);
      }

      const next = applyMove(state, move);
      setState(next);
      setHistory(h => [...h, next]);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('pinch', next.moves, next.budget).then(s => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, budgetExhausted, legal, gameRecorded, shakeRow, animateTile],
  );

  /* ─── Undo ─── */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prev = history[history.length - 2];
    setState(prev);
    setHistory(h => h.slice(0, -1));
  }, [history, solved]);

  /* ─── Reset ─── */
  const handleReset = useCallback(() => {
    const init: PinchState = {
      ...initialState,
      dead: [...initialState.dead],
      found: [...initialState.found],
      collected: [...initialState.collected],
    };
    setState(init);
    setHistory([init]);
  }, [initialState]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('pinch');
    setStats(s);
    setShowStats(true);
  }, []);

  /* ─── Share text ─── */
  function buildShareText() {
    const tiles = state.tiles.map((v, i) => {
      if (state.dead[i]) return '\u2705'; // collected
      if (i === state.left || i === state.right) return '\uD83D\uDD35'; // cursor
      return '\u2B1C'; // remaining
    });
    const under = state.moves <= state.budget * 0.7;
    return [
      `Pinch Day #${puzzleDay} \uD83E\uDD0F`,
      tiles.join(''),
      `${state.found.length}/${state.targets.length} pairs in ${state.moves} moves`,
      under ? '\u2B50 Efficient!' : `Budget: ${state.moves}/${state.budget}`,
    ].join('\n');
  }

  return (
    <View style={styles.outerContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Pinch</Text>
          <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
          <Pressable onPress={handleShowStats}>
            <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Squeeze the ends to find matching pairs
        </Text>

        {/* Info bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Moves</Text>
            <Text style={[
              styles.infoVal,
              state.moves > state.budget * 0.8 && !solved && styles.infoDanger,
              solved && state.moves <= state.budget * 0.7 && styles.infoGood,
            ]}>
              {state.moves}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Budget</Text>
            <Text style={styles.infoPar}>{state.budget}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Pairs</Text>
            <Text style={[styles.infoVal, solved && styles.infoGood]}>
              {state.found.length}/{state.targets.length}
            </Text>
          </View>
        </View>

        {/* Target sums */}
        <View style={styles.targetRow}>
          <Text style={styles.targetLabel}>Targets:</Text>
          {state.targets.map((t, i) => (
            <View
              key={i}
              style={[
                styles.targetBadge,
                state.found.includes(t) && styles.targetFound,
              ]}
            >
              <Text style={[
                styles.targetText,
                state.found.includes(t) && styles.targetTextFound,
              ]}>
                {t}
                {state.found.includes(t) ? ' \u2713' : ''}
              </Text>
            </View>
          ))}
        </View>

        {/* Current sum display */}
        {!solved && currentSum !== null && (
          <View style={[
            styles.sumDisplay,
            sumMatchesTarget && styles.sumDisplayMatch,
          ]}>
            <Text style={styles.sumText}>
              <Text style={{ color: LEFT_COLOR }}>{state.tiles[state.left]}</Text>
              {' + '}
              <Text style={{ color: RIGHT_COLOR }}>{state.tiles[state.right]}</Text>
              {' = '}
              <Text style={[
                styles.sumResult,
                sumMatchesTarget && { color: MATCH_COLOR },
              ]}>
                {currentSum}
              </Text>
            </Text>
            {sumMatchesTarget && (
              <Text style={styles.matchHint}>Match! Tap Collect</Text>
            )}
          </View>
        )}

        {/* Tile row */}
        <Animated.View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: rowWidth + 16,
            transform: [{ translateX: shakeAnim }],
            marginVertical: 12,
          }}
        >
          {state.tiles.map((val, i) => {
            const isDead = state.dead[i];
            const isLeft = i === state.left && !isDead;
            const isRight = i === state.right && !isDead;
            const isCursor = isLeft || isRight;

            let bg = '#1a1a1c';
            let borderColor = '#444';
            let borderWidth = 1;
            let textColor = '#fff';

            if (isDead) {
              bg = '#0d0d0e';
              borderColor = '#222';
              textColor = '#555';
            } else if (isLeft) {
              bg = 'rgba(52,152,219,0.2)';
              borderColor = LEFT_COLOR;
              borderWidth = 2;
            } else if (isRight) {
              bg = 'rgba(230,126,34,0.2)';
              borderColor = RIGHT_COLOR;
              borderWidth = 2;
            }

            return (
              <Animated.View
                key={i}
                style={{
                  transform: [{ scale: tileScales[i] }],
                  marginRight: i < state.tiles.length - 1 ? TILE_GAP : 0,
                  marginBottom: TILE_GAP,
                }}
              >
                <View
                  style={[
                    styles.tile,
                    {
                      width: tileSize,
                      height: tileSize,
                      backgroundColor: bg,
                      borderColor,
                      borderWidth,
                    },
                  ]}
                >
                  <Text style={[
                    styles.tileText,
                    { color: textColor },
                    isDead && styles.tileTextDead,
                    tileSize < 32 && { fontSize: 10 },
                  ]}>
                    {isDead ? '' : val}
                  </Text>
                  {/* Cursor indicator below tile */}
                  {isCursor && (
                    <View
                      style={[
                        styles.cursorIndicator,
                        { backgroundColor: isLeft ? LEFT_COLOR : RIGHT_COLOR },
                      ]}
                    />
                  )}
                </View>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Collected pairs */}
        {state.collected.length > 0 && (
          <View style={styles.collectedArea}>
            <Text style={styles.collectedLabel}>Found pairs:</Text>
            <View style={styles.collectedRow}>
              {state.collected.map(([a, b], i) => (
                <View key={i} style={styles.collectedPair}>
                  <Text style={styles.collectedText}>
                    {a} + {b} = {a + b}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action buttons */}
        {!solved && (
          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.actionBtn,
                styles.leftBtn,
                !legal.has('left') && styles.actionBtnDisabled,
              ]}
              onPress={() => doMove('left')}
              disabled={!legal.has('left')}
              {...(Platform.OS === 'web' ? { role: 'button' as any, tabIndex: 0 } : {})}
            >
              <Text style={[
                styles.actionBtnText,
                !legal.has('left') && styles.actionBtnTextDisabled,
              ]}>
                Left {'\u2192'}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.actionBtn,
                styles.collectBtn,
                !legal.has('collect') && styles.actionBtnDisabled,
                legal.has('collect') && styles.collectBtnActive,
              ]}
              onPress={() => doMove('collect')}
              disabled={!legal.has('collect')}
              {...(Platform.OS === 'web' ? { role: 'button' as any, tabIndex: 0 } : {})}
            >
              <Text style={[
                styles.actionBtnText,
                styles.collectBtnText,
                !legal.has('collect') && styles.actionBtnTextDisabled,
              ]}>
                Collect
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.actionBtn,
                styles.rightBtn,
                !legal.has('right') && styles.actionBtnDisabled,
              ]}
              onPress={() => doMove('right')}
              disabled={!legal.has('right')}
              {...(Platform.OS === 'web' ? { role: 'button' as any, tabIndex: 0 } : {})}
            >
              <Text style={[
                styles.actionBtnText,
                !legal.has('right') && styles.actionBtnTextDisabled,
              ]}>
                {'\u2190'} Right
              </Text>
            </Pressable>
          </View>
        )}

        {/* Budget exhausted */}
        {budgetExhausted && (
          <View style={styles.stuckBanner}>
            <Text style={styles.stuckText}>
              Out of moves! Undo or reset.
            </Text>
          </View>
        )}

        {/* No legal moves */}
        {!solved && !budgetExhausted && legal.size === 0 && state.moves > 0 && (
          <View style={styles.stuckBanner}>
            <Text style={styles.stuckText}>
              No moves available! Undo or reset.
            </Text>
          </View>
        )}

        <CelebrationBurst show={solved} />

        {solved && (
          <View style={styles.endMsg}>
            <Text style={styles.endEmoji}>
              {state.moves <= state.budget * 0.7
                ? '\uD83C\uDF1F'
                : state.moves <= state.budget * 0.9
                  ? '\u2B50'
                  : '\uD83E\uDD0F'}
            </Text>
            <Text style={styles.endText}>
              {state.moves <= state.budget * 0.7
                ? `Efficient! ${state.moves} moves`
                : state.moves <= state.budget * 0.9
                  ? `Well done! ${state.moves} moves`
                  : `Solved in ${state.moves} moves`}
            </Text>
            <ShareButton text={buildShareText()} />
          </View>
        )}

        <View style={styles.howTo}>
          <Text style={styles.howToTitle}>How to play</Text>
          <Text style={styles.howToText}>
            Find pairs of numbers that sum to the target values.
            {'\n\n'}
            Move the blue left cursor right, or the orange right cursor left,
            to explore the sorted number row. When the two cursor values sum to
            a target, tap Collect to capture the pair.
            {'\n\n'}
            Find all pairs within the move budget. The key insight: if the sum
            is too small, move left. If too big, move right.
          </Text>
        </View>

        {/* Spacer for fixed bottom bar */}
        {!solved && state.moves > 0 && <View style={{ height: 72 }} />}

        {showStats && stats && (
          <StatsModal stats={stats} onClose={() => setShowStats(false)} />
        )}
      </ScrollView>

      {/* Fixed bottom bar for undo/reset */}
      {!solved && state.moves > 0 && (
        <View style={styles.fixedBottomBar}>
          {history.length > 1 && (
            <Pressable style={styles.undoBtn} onPress={handleUndo}>
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
          )}
          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#121213',
  },
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
  infoDanger: { color: '#e74c3c' },
  infoPar: { color: '#818384', fontSize: 22, fontWeight: '800' },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  targetLabel: { color: '#818384', fontSize: 13, fontWeight: '600' },
  targetBadge: {
    backgroundColor: '#2c2c3e',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6c5ce7',
  },
  targetFound: {
    backgroundColor: '#1a4a2e',
    borderColor: '#27ae60',
  },
  targetText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  targetTextFound: { color: '#2ecc71' },
  sumDisplay: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  sumDisplayMatch: {
    borderColor: '#2ecc71',
    backgroundColor: '#1a2e1a',
  },
  sumText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  sumResult: { fontWeight: '800' },
  matchHint: {
    color: '#2ecc71',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  tile: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tileText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tileTextDead: {
    textDecorationLine: 'line-through',
  },
  cursorIndicator: {
    position: 'absolute',
    bottom: -4,
    left: '25%' as any,
    width: '50%' as any,
    height: 3,
    borderRadius: 2,
  },
  collectedArea: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  collectedLabel: { color: '#818384', fontSize: 11, marginBottom: 4 },
  collectedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  collectedPair: {
    backgroundColor: '#1a2e1a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  collectedText: { color: '#2ecc71', fontSize: 12, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 90,
    alignItems: 'center',
  },
  leftBtn: {
    backgroundColor: 'rgba(52,152,219,0.2)',
    borderWidth: 1,
    borderColor: LEFT_COLOR,
  },
  rightBtn: {
    backgroundColor: 'rgba(230,126,34,0.2)',
    borderWidth: 1,
    borderColor: RIGHT_COLOR,
  },
  collectBtn: {
    backgroundColor: '#2c2c3e',
    borderWidth: 1,
    borderColor: '#555',
  },
  collectBtnActive: {
    backgroundColor: 'rgba(46,204,113,0.2)',
    borderColor: MATCH_COLOR,
  },
  actionBtnDisabled: {
    opacity: 0.3,
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  collectBtnText: {},
  actionBtnTextDisabled: {
    color: '#555',
  },
  stuckBanner: {
    marginTop: 10,
    backgroundColor: '#4a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  stuckText: { color: '#e74c3c', fontSize: 13, fontWeight: '600' },
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1c',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  undoText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  resetBtn: {
    backgroundColor: '#4a1a1a',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetText: { color: '#e74c3c', fontWeight: '600', fontSize: 14 },
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
