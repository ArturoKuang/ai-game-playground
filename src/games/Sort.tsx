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
  TOKEN_COLORS,
  TOKEN_LABELS,
  getDifficultyParams,
  type SortState,
  type Move,
} from '../solvers/Sort.solver';

/* ─── Constants ─── */
const TOKEN_SIZE = 38;
const TOKEN_GAP = 4;

export default function Sort() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );
  const { tokenCount } = useMemo(
    () => getDifficultyParams(difficulty),
    [difficulty],
  );
  const par = useMemo(() => {
    const sol = solve(initialState, 5);
    return sol ? sol.steps : 10;
  }, [initialState]);

  const [state, setState] = useState<SortState>(() => [...initialState]);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<SortState[]>(() => [[...initialState]]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  // Selection state: first tap picks start position, then choose length
  const [selectStart, setSelectStart] = useState<number | null>(null);

  const solved = isGoal(state);
  const { width: screenWidth } = useWindowDimensions();
  const rowWidth = Math.min(screenWidth - 32, tokenCount * (TOKEN_SIZE + TOKEN_GAP));

  /* ── Animations ── */
  const tokenScales = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(1)),
  ).current;

  const bounceTokens = useCallback(
    (indices: number[]) => {
      const anims = indices.map((idx) =>
        Animated.sequence([
          Animated.timing(tokenScales[idx], {
            toValue: 1.2,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.spring(tokenScales[idx], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]),
      );
      Animated.parallel(anims).start();
    },
    [tokenScales],
  );

  /* ── Apply reversal ── */
  const handleReversal = useCallback(
    (move: Move) => {
      if (solved) return;
      const indices: number[] = [];
      for (let i = move.start; i < move.start + move.length; i++) indices.push(i);
      bounceTokens(indices);
      const next = applyMove(state, move);
      const nextMoves = moves + 1;
      setState(next);
      setMoves(nextMoves);
      setHistory((h) => [...h, next]);
      setSelectStart(null);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('sort', nextMoves, par * 3).then((s) => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, moves, par, gameRecorded, bounceTokens],
  );

  /* ── Token tap: select start position ── */
  const handleTokenTap = useCallback(
    (idx: number) => {
      if (solved) return;
      if (selectStart === idx) {
        setSelectStart(null); // deselect
      } else {
        setSelectStart(idx);
      }
    },
    [solved, selectStart],
  );

  /* ── Length buttons (shown after selecting start) ── */
  const availableLengths = useMemo(() => {
    if (selectStart === null) return [];
    const lengths: (2 | 3 | 4)[] = [];
    const n = state.length;
    for (const len of [2, 3, 4] as const) {
      if (selectStart + len <= n) lengths.push(len);
    }
    return lengths;
  }, [selectStart, state.length]);

  /* ── Undo ── */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    setState([...history[history.length - 2]]);
    setMoves((m) => m - 1);
    setHistory((h) => h.slice(0, -1));
    setSelectStart(null);
  }, [history, solved]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('sort');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const under = moves <= par;
    return [
      `Sort Day #${puzzleDay} \uD83D\uDD00`,
      `${moves}/${par} reversals`,
      under ? '\u2B50 Under par!' : `Solved in ${moves}`,
    ].join('\n');
  }

  const h = heuristic(state);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sort</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Reverse groups of 2-4 to sort tokens by color.
      </Text>

      {/* Info bar */}
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
          <Text style={styles.infoLabel}>Breaks</Text>
          <Text style={styles.infoVal}>{h}</Text>
        </View>
      </View>

      {/* Token row */}
      <View style={[styles.tokenRow, { maxWidth: rowWidth + 16 }]}>
        {state.map((color, idx) => {
          const isSelected =
            selectStart !== null &&
            idx >= selectStart &&
            idx < selectStart + 1;
          const isInRange =
            selectStart !== null &&
            idx >= selectStart;
          return (
            <Animated.View
              key={idx}
              style={{ transform: [{ scale: tokenScales[idx] }] }}
            >
              <Pressable
                onPress={() => handleTokenTap(idx)}
                style={[
                  styles.token,
                  {
                    backgroundColor: TOKEN_COLORS[color],
                    borderColor:
                      selectStart === idx
                        ? '#ffffff'
                        : 'rgba(0,0,0,0.3)',
                    borderWidth: selectStart === idx ? 3 : 1,
                  },
                ]}
              >
                <Text style={styles.tokenText}>{TOKEN_LABELS[color]}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {/* Highlight which tokens will be reversed */}
      {selectStart !== null && !solved && (
        <View style={styles.lengthRow}>
          <Text style={styles.lengthLabel}>Reverse length:</Text>
          {availableLengths.map((len) => (
            <Pressable
              key={len}
              style={styles.lengthBtn}
              onPress={() =>
                handleReversal({ start: selectStart, length: len })
              }
            >
              <Text style={styles.lengthBtnText}>{len}</Text>
              <Text style={styles.lengthPreview}>
                {state
                  .slice(selectStart, selectStart + len)
                  .map((c) => TOKEN_LABELS[c])
                  .join('')}
                {' \u2192 '}
                {state
                  .slice(selectStart, selectStart + len)
                  .reverse()
                  .map((c) => TOKEN_LABELS[c])
                  .join('')}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

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
            {moves < par ? '\uD83C\uDF1F' : moves === par ? '\u2B50' : '\uD83D\uDD00'}
          </Text>
          <Text style={styles.endText}>
            {moves < par
              ? `Under par! ${moves} reversals`
              : moves === par
                ? `At par! ${moves} reversals`
                : `Solved in ${moves} reversals`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap a token to select a starting position, then choose a reversal
          length (2, 3, or 4). The selected group of tokens will be reversed
          in place.{'\n\n'}
          Goal: Group all same-colored tokens together within par reversals.
          {'\n'}Par: {par} reversals.
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
  tokenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: TOKEN_GAP,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  token: {
    width: TOKEN_SIZE,
    height: TOKEN_SIZE,
    borderRadius: TOKEN_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  lengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  lengthLabel: {
    color: '#818384',
    fontSize: 12,
    fontWeight: '600',
  },
  lengthBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  lengthBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  lengthPreview: {
    color: '#818384',
    fontSize: 10,
    marginTop: 2,
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
