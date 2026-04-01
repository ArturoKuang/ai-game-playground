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
import CelebrationBurst from '../components/CelebrationBurst';
import { getDailySeed, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import {
  generatePuzzle,
  applyMove,
  isGoal,
  heuristic,
  solve,
  canDetermineAllRules,
  COLOR_HEX,
  SHAPE_SYMBOLS,
  GROUP_COLORS,
  GROUP_BG,
  COLOR_NAMES,
  SHAPE_NAMES,
  FILL_NAMES,
  type SieveState,
  type Move,
  type AttributeType,
} from '../solvers/Sieve.solver';

/* ─── Constants ─── */
const GRID_SIZE = 4;
const GAP = 6;

export default function Sieve() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const [state, setState] = useState<SieveState>(() => ({ ...initialState }));
  const [history, setHistory] = useState<SieveState[]>(() => [initialState]);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

  const solved = isGoal(state);
  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 340);
  const cellSize = Math.floor((maxGrid - (GRID_SIZE - 1) * GAP) / GRID_SIZE);

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: 16 }, () => new Animated.Value(1)),
  ).current;

  const animateSieve = useCallback(
    (idx: number) => {
      Animated.sequence([
        Animated.timing(cellScales[idx], {
          toValue: 1.2,
          duration: 80,
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

  /* ── Sieve handler ── */
  const handleSieve = useCallback(
    (idx: number) => {
      if (solved || state.sieved[idx]) return;
      animateSieve(idx);
      const move: Move = { type: 'sieve', index: idx };
      const next = applyMove(state, move);
      setState(next);
      setHistory((h) => [...h, next]);
      setSubmitFeedback(null);
    },
    [state, solved, animateSieve],
  );

  /* ── Submit handler ── */
  const handleSubmit = useCallback(() => {
    const rules = canDetermineAllRules(state);
    if (!rules) {
      setSubmitFeedback('Not enough info yet. Keep sieving!');
      return;
    }
    const move: Move = { type: 'submit', rules };
    const next = applyMove(state, move);
    setState(next);
    setHistory((h) => [...h, next]);

    if (!next.solved) {
      setSubmitFeedback('Incorrect grouping. Keep sieving!');
    } else {
      setSubmitFeedback(null);
    }
  }, [state]);

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prev = history[history.length - 2];
    setState(prev);
    setHistory((h) => h.slice(0, -1));
    setSubmitFeedback(null);
  }, [history, solved]);

  const getAttrDisplay = (attr: AttributeType, value: number): string => {
    if (attr === 'color') return COLOR_NAMES[value];
    if (attr === 'shape') return SHAPE_NAMES[value];
    return FILL_NAMES[value];
  };

  const h = heuristic(state);
  const groupsFound = 4 - h;

  const groupCounts: number[] = [0, 0, 0, 0];
  for (let i = 0; i < 16; i++) {
    if (state.revealedGroups[i] !== null) {
      groupCounts[state.revealedGroups[i]!]++;
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sieve</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
      </View>
      <Text style={styles.subtitle}>
        Tap icons to reveal their group. Find what each group shares.
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Sieves</Text>
          <Text
            style={[
              styles.infoVal,
              solved && state.sieveCount <= state.par && styles.infoGood,
            ]}
          >
            {state.sieveCount}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{state.par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Groups ID'd</Text>
          <Text style={styles.infoVal}>{groupsFound}/4</Text>
        </View>
      </View>

      {/* Group legend */}
      <View style={styles.legendRow}>
        {[0, 1, 2, 3].map((g) => (
          <View key={g} style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: GROUP_COLORS[g] }]}
            />
            <Text style={styles.legendText}>
              G{g + 1}
              {groupCounts[g] > 0 ? ` (${groupCounts[g]})` : ''}
            </Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.gridArea}>
        {Array.from({ length: GRID_SIZE }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: GRID_SIZE }, (_, c) => {
              const idx = r * GRID_SIZE + c;
              const icon = state.icons[idx];
              const isSieved = state.sieved[idx];
              const group = state.revealedGroups[idx];
              const fillOpacity =
                icon.fill === 0 ? 1.0 : icon.fill === 1 ? 0.7 : icon.fill === 2 ? 0.45 : 0.2;

              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[idx] }] }}
                >
                  <Pressable
                    onPress={() => handleSieve(idx)}
                    disabled={isSieved || solved}
                  >
                    <View
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor:
                            isSieved && group !== null
                              ? GROUP_BG[group]
                              : '#1e1e2e',
                          borderColor:
                            isSieved && group !== null
                              ? GROUP_COLORS[group]
                              : '#3a3a4c',
                          borderWidth: isSieved ? 3 : 1,
                        },
                      ]}
                    >
                      {/* Icon shape */}
                      <Text
                        style={[
                          styles.iconSymbol,
                          {
                            color: COLOR_HEX[icon.color],
                            opacity: fillOpacity,
                            fontSize: cellSize * 0.45,
                          },
                        ]}
                      >
                        {SHAPE_SYMBOLS[icon.shape]}
                      </Text>

                      {/* Fill indicator */}
                      <Text style={styles.fillLabel}>
                        {FILL_NAMES[icon.fill][0].toUpperCase()}
                      </Text>

                      {/* Group badge */}
                      {isSieved && group !== null && (
                        <View
                          style={[
                            styles.groupBadge,
                            { backgroundColor: GROUP_COLORS[group] },
                          ]}
                        >
                          <Text style={styles.groupBadgeText}>{group + 1}</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Buttons */}
      {!solved && (
        <View style={styles.btnRow}>
          {history.length > 1 && (
            <Pressable style={styles.undoBtn} onPress={handleUndo}>
              <Text style={styles.undoBtnText}>Undo</Text>
            </Pressable>
          )}
          <Pressable
            style={[
              styles.submitBtn,
              groupsFound < 4 && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
          >
            <Text style={styles.submitBtnText}>Submit Answer</Text>
          </Pressable>
        </View>
      )}

      {submitFeedback && !solved && (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackText}>{submitFeedback}</Text>
        </View>
      )}

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {state.sieveCount < state.par
              ? '\ud83c\udf1f'
              : state.sieveCount === state.par
                ? '\u2b50'
                : '\ud83d\udd0d'}
          </Text>
          <Text style={styles.endText}>
            {state.sieveCount < state.par
              ? `Under par! ${state.sieveCount} sieves (par ${state.par})`
              : state.sieveCount === state.par
                ? `At par! ${state.sieveCount} sieves`
                : `Solved in ${state.sieveCount} sieves (par ${state.par})`}
          </Text>

          <View style={styles.rulesBox}>
            {state.groupRules.map((rule, g) => (
              <View key={g} style={styles.ruleRow}>
                <View
                  style={[styles.ruleDot, { backgroundColor: GROUP_COLORS[g] }]}
                />
                <Text style={styles.ruleText}>
                  Group {g + 1}: {getAttrDisplay(rule.attr, rule.value)} ({rule.attr})
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          16 icons with 3 traits each (color, shape, fill) are secretly
          divided into 4 groups of 4. Each group shares exactly one trait.
          {'\n\n'}
          Tap an icon to sieve it and reveal which group it belongs to.
          Look for the shared trait between group members.{'\n\n'}
          Once you can identify all 4 groups' shared traits, submit your
          answer. Beat par ({state.par} sieves) for a star!
        </Text>
      </View>
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
  infoVal: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  infoGood: { color: '#2ecc71' },
  infoPar: { color: '#818384', fontSize: 20, fontWeight: '800' },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
  gridArea: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconSymbol: { fontWeight: '800' },
  fillLabel: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    fontSize: 9,
    color: '#666',
    fontWeight: '600',
  },
  groupBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#121213',
  },
  groupBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  undoBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: '#1e5a1e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2ecc71',
  },
  submitBtnDisabled: {
    backgroundColor: '#2a2a2c',
    borderColor: '#555',
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  feedbackBox: {
    marginTop: 10,
    backgroundColor: 'rgba(231,76,60,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 300,
  },
  feedbackText: {
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  endMsg: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  rulesBox: {
    marginTop: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#3a3a4c',
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleDot: { width: 14, height: 14, borderRadius: 7 },
  ruleText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
});
