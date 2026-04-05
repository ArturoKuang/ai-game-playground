import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  legalMoves,
  solve,
  getMoveScore,
  type NestState,
  type Move,
} from '../solvers/Nest.solver';

/* ─── Constants ─── */
const BRACKET_COLORS = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
  '#f39c12', // orange
  '#9b59b6', // purple
  '#1abc9c', // teal
];

const OPEN_CHARS = ['(', '[', '{', '<', '\u27E8', '\u2329'];
const CLOSE_CHARS = [')', ']', '}', '>', '\u27E9', '\u232A'];

export default function Nest() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const par = useMemo(() => {
    const sol = solve(initialState, 5);
    return sol ? sol.score : 0;
  }, [initialState]);

  const [state, setState] = useState<NestState>(() => ({
    ...initialState,
    brackets: initialState.brackets.map(b => ({ ...b })),
    matched: [...initialState.matched],
  }));
  const [history, setHistory] = useState<NestState[]>([]);
  const [selectedOpen, setSelectedOpen] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);
  const [scorePopup, setScorePopup] = useState<{ x: number; points: number } | null>(null);

  const solved = isGoal(state);
  const legal = legalMoves(state);
  const { width: screenWidth } = useWindowDimensions();

  // Animations
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupTranslateY = useRef(new Animated.Value(0)).current;

  const pairsMatched = state.matched.filter((m, i) => m && state.brackets[i].isOpen).length;
  const totalPairs = state.brackets.length / 2;

  // Find which brackets are part of a legal move
  const legalIndices = useMemo(() => {
    const set = new Set<number>();
    for (const [oi, ci] of legal) {
      set.add(oi);
      set.add(ci);
    }
    return set;
  }, [legal]);

  // Show score popup animation
  const showScoreAnim = useCallback((points: number) => {
    popupOpacity.setValue(1);
    popupTranslateY.setValue(0);
    Animated.parallel([
      Animated.timing(popupOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(popupTranslateY, {
        toValue: -40,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [popupOpacity, popupTranslateY]);

  const handleBracketTap = useCallback((index: number) => {
    if (solved) return;
    if (state.matched[index]) return;

    const bracket = state.brackets[index];

    if (selectedOpen === null) {
      // First tap: select an open bracket
      if (bracket.isOpen) {
        setSelectedOpen(index);
      }
      return;
    }

    // Second tap: try to match the pair
    if (index === selectedOpen) {
      // Deselect
      setSelectedOpen(null);
      return;
    }

    // Check if this is a valid match
    const move: Move = [selectedOpen, index];
    const isLegal = legal.some(([oi, ci]) => oi === move[0] && ci === move[1]);

    if (isLegal) {
      const points = getMoveScore(state, move);
      const next = applyMove(state, move);
      setHistory(h => [...h, state]);
      setState(next);
      setSelectedOpen(null);

      // Show score popup
      setScorePopup({ x: index, points });
      showScoreAnim(points);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('nest', next.score, par).then(s => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    } else {
      // Invalid match - deselect
      setSelectedOpen(null);
    }
  }, [state, solved, legal, selectedOpen, par, gameRecorded, showScoreAnim]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || solved) return;
    setState(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
    setSelectedOpen(null);
    setScorePopup(null);
  }, [history, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('nest');
    setStatsData(s);
    setShowStats(true);
  }, []);

  // Bracket sizing
  const maxBrackets = state.brackets.length;
  const bracketSize = Math.min(
    36,
    Math.max(24, Math.floor((screenWidth - 40) / maxBrackets) - 2),
  );

  function buildShareText() {
    const colorEmojis = ['\uD83D\uDD34', '\uD83D\uDD35', '\uD83D\uDFE2', '\uD83D\uDFE0', '\uD83D\uDFE3', '\uD83D\uDFE4'];
    const matchOrder = history.map((_, i) => {
      if (i >= history.length - 1) return '';
      return colorEmojis[0]; // simplified
    }).filter(Boolean).join('');

    return [
      `Nest Day #${puzzleDay} \uD83E\uDE86`,
      `Score: ${state.score}/${par} | ${pairsMatched}/${totalPairs} pairs`,
      state.score >= par ? '\u2B50 Optimal score!' : `Matched all pairs!`,
    ].join('\n');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nest</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Match nested brackets from the inside out
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Score</Text>
          <Text style={[
            styles.infoVal,
            solved && state.score >= par && styles.infoGood,
          ]}>
            {state.score}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Moves</Text>
          <Text style={styles.infoVal}>
            {state.moves}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Pairs</Text>
          <Text style={styles.infoVal}>
            {pairsMatched}/{totalPairs}
          </Text>
        </View>
        {state.comboStreak > 1 && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Combo</Text>
            <Text style={[styles.infoVal, styles.comboText]}>
              x{state.comboStreak}
            </Text>
          </View>
        )}
      </View>

      {/* Bracket sequence */}
      <View style={styles.bracketArea}>
        <View style={[styles.bracketRow, { maxWidth: screenWidth - 24 }]}>
          {state.brackets.map((bracket, i) => {
            const isMatched = state.matched[i];
            const isSelected = selectedOpen === i;
            const isMatchOfSelected = selectedOpen !== null &&
              bracket.matchIndex === selectedOpen;
            const isLegal = legalIndices.has(i);
            const color = BRACKET_COLORS[bracket.color % BRACKET_COLORS.length];
            const char = bracket.isOpen
              ? OPEN_CHARS[bracket.color % OPEN_CHARS.length]
              : CLOSE_CHARS[bracket.color % CLOSE_CHARS.length];
            // Indent based on depth
            const indent = Math.max(0, (bracket.depth - 1)) * 2;

            if (isMatched) {
              return (
                <View
                  key={i}
                  style={[
                    styles.bracketCell,
                    { width: bracketSize, height: bracketSize + indent },
                    styles.matchedCell,
                  ]}
                >
                  <Text style={styles.matchedDot}>{'\u00B7'}</Text>
                </View>
              );
            }

            return (
              <Pressable
                key={i}
                onPress={() => handleBracketTap(i)}
                style={[
                  styles.bracketCell,
                  {
                    width: bracketSize,
                    height: bracketSize + indent,
                    paddingTop: indent,
                  },
                  isSelected && styles.selectedCell,
                  isMatchOfSelected && isLegal && styles.matchTargetCell,
                  !isSelected && !isMatchOfSelected && isLegal && styles.legalCell,
                ]}
              >
                <Text
                  style={[
                    styles.bracketChar,
                    { color, fontSize: Math.max(14, bracketSize - 8) },
                    isSelected && styles.selectedChar,
                    isMatchOfSelected && isLegal && styles.matchTargetChar,
                  ]}
                >
                  {char}
                </Text>
                {isLegal && !isSelected && !isMatchOfSelected && (
                  <View style={[styles.legalDot, { backgroundColor: color }]} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Score popup */}
        {scorePopup && (
          <Animated.View
            style={[
              styles.scorePopup,
              {
                opacity: popupOpacity,
                transform: [{ translateY: popupTranslateY }],
              },
            ]}
          >
            <Text style={styles.scorePopupText}>+{scorePopup.points}</Text>
          </Animated.View>
        )}
      </View>

      {/* Depth legend */}
      <View style={styles.depthLegend}>
        <Text style={styles.depthLegendText}>
          Deeper nesting = more points | Same-color combos = bonus
        </Text>
      </View>

      {/* Undo */}
      {!solved && history.length > 0 && (
        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      )}

      {/* No legal moves warning */}
      {!solved && legal.length === 0 && (
        <View style={styles.stuckMsg}>
          <Text style={styles.stuckText}>
            No legal moves! Try undoing.
          </Text>
        </View>
      )}

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {state.score >= par ? '\uD83C\uDF1F' : '\uD83E\uDE86'}
          </Text>
          <Text style={styles.endText}>
            {state.score >= par
              ? `Optimal! Score: ${state.score}`
              : `Complete! Score: ${state.score}/${par}`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap an opening bracket, then its matching closing bracket to match the pair.
          {'\n\n'}
          {'\u2022'} Only innermost pairs can be matched (no unmatched brackets between them)
          {'\n'}{'\u2022'} Deeper nesting = higher score ({state.depthMultiplier}x multiplier)
          {'\n'}{'\u2022'} Same-color combos give bonus points
          {'\n'}{'\u2022'} Plan your matching order to maximize total score!
          {'\n\n'}
          The optimal order isn't always obvious. Sometimes matching a lower-scoring
          pair first enables higher-scoring combos later.
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
    paddingHorizontal: 12,
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

  /* Info bar */
  infoBar: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 11, marginBottom: 2 },
  infoVal: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  infoGood: { color: '#2ecc71' },
  infoPar: { color: '#818384', fontSize: 22, fontWeight: '800' },
  comboText: { color: '#f39c12' },

  /* Bracket area */
  bracketArea: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    width: '100%',
  },
  bracketRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
  },

  /* Bracket cells */
  bracketCell: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  matchedCell: {
    opacity: 0.2,
    justifyContent: 'center',
  },
  matchedDot: {
    color: '#555',
    fontSize: 14,
  },
  selectedCell: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: '#ffffff',
    borderWidth: 2,
  },
  matchTargetCell: {
    backgroundColor: 'rgba(46,204,113,0.2)',
    borderColor: '#2ecc71',
    borderWidth: 2,
  },
  legalCell: {
    borderColor: 'rgba(255,255,255,0.1)',
  },

  /* Bracket text */
  bracketChar: {
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  selectedChar: {
    textShadowColor: '#ffffff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  matchTargetChar: {
    textShadowColor: '#2ecc71',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  legalDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
    marginBottom: 2,
    opacity: 0.5,
  },

  /* Score popup */
  scorePopup: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(46,204,113,0.9)',
    borderRadius: 12,
  },
  scorePopupText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },

  /* Depth legend */
  depthLegend: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  depthLegendText: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  /* Undo */
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  undoText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },

  /* Stuck */
  stuckMsg: {
    backgroundColor: 'rgba(231,76,60,0.15)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.3)',
  },
  stuckText: {
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* End */
  endMsg: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },

  /* How to */
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: '#818384', fontSize: 13, lineHeight: 20 },
});
