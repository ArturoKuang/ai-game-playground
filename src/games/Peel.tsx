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
  SIZE,
  COLOR_NAMES,
  generatePuzzle,
  applyMove,
  isGoal,
  countUnsatisfiedLines,
  visibleColor,
  solve,
  type PeelState,
  type Move,
  type Target,
} from '../solvers/Peel.solver';

/* ─── Constants ─── */
const GAP = 3;
const CELL_BORDER_RADIUS = 10;

const COLOR_HEX: Record<number, string> = {
  0: '#e74c3c', // Red
  1: '#3498db', // Blue
  2: '#2ecc71', // Green
};

const COLOR_EMOJI: Record<number, string> = {
  0: '\uD83D\uDFE5', // red square
  1: '\uD83D\uDFE6', // blue square
  2: '\uD83D\uDFE9', // green square
};

const COLOR_LABELS = ['R', 'B', 'G'];

/* ─── Target display ─── */
function formatTarget(target: Target, numColors: number): string {
  const parts: string[] = [];
  for (let i = 0; i < numColors; i++) {
    if (target[i] > 0) {
      parts.push(`${target[i]}${COLOR_LABELS[i]}`);
    }
  }
  return parts.join(' ');
}

/* ─── Check if a row matches its target ─── */
function rowSatisfied(state: PeelState, r: number): boolean {
  const counts = [0, 0, 0];
  for (let c = 0; c < SIZE; c++) {
    counts[visibleColor(state.grid, state.peeled, r, c)]++;
  }
  for (let k = 0; k < 3; k++) {
    if (counts[k] !== state.rowTargets[r][k]) return false;
  }
  return true;
}

/* ─── Check if a column matches its target ─── */
function colSatisfied(state: PeelState, c: number): boolean {
  const counts = [0, 0, 0];
  for (let r = 0; r < SIZE; r++) {
    counts[visibleColor(state.grid, state.peeled, r, c)]++;
  }
  for (let k = 0; k < 3; k++) {
    if (counts[k] !== state.colTargets[c][k]) return false;
  }
  return true;
}

export default function Peel() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const numColors = 3;

  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const par = initialState.maxMoves;

  const [state, setState] = useState<PeelState>(() => ({
    ...initialState,
    peeled: initialState.peeled.map(row => [...row]),
  }));
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);

  const solved = isGoal(state);
  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 80, 320); // leave room for row targets
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);

  /* ── Animations ── */
  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  /* ── Peel handler ── */
  const handlePeel = useCallback(
    (r: number, c: number) => {
      if (solved) return;
      if (state.peeled[r][c] >= 2) return; // already fully peeled

      const key = r * SIZE + c;

      // Peel animation
      Animated.sequence([
        Animated.timing(cellScales[key], {
          toValue: 1.2,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.spring(cellScales[key], {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const move: Move = { r, c };
      const next: PeelState = applyMove(state, move);
      setState(next);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('peel', next.moves, par * 2).then(s => {
          setStatsData(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, par, gameRecorded, cellScales],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('peel');
    setStatsData(s);
    setShowStats(true);
  }, []);

  /* ── Share text ── */
  function buildShareText() {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        if (state.peeled[r][c] > 0) {
          row += COLOR_EMOJI[visibleColor(state.grid, state.peeled, r, c)];
        } else {
          row += '\u2B1C'; // white square (unpeeled)
        }
      }
      rows.push(row);
    }
    const under = state.moves <= par;
    return [
      `Peel Day #${puzzleDay}`,
      rows.join('\n'),
      `${state.moves}/${par} peels`,
      under ? 'Under par!' : `Solved in ${state.moves}`,
    ].join('\n');
  }

  const violationsRemaining = countUnsatisfiedLines(state);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Peel</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Peel cells to reveal colors that match row & column targets.
      </Text>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Peels</Text>
          <Text
            style={[
              styles.infoVal,
              solved && state.moves <= par && styles.infoGood,
            ]}
          >
            {state.moves}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Violations</Text>
          <Text style={[
            styles.infoVal,
            violationsRemaining === 0 && styles.infoGood,
          ]}>
            {violationsRemaining}
          </Text>
        </View>
      </View>

      {/* Column targets (above grid) with satisfied/unsatisfied indicators */}
      <View style={{ flexDirection: 'row', marginLeft: 52, marginBottom: 4 }}>
        {state.colTargets.map((target, c) => {
          const sat = colSatisfied(state, c);
          return (
            <View
              key={c}
              style={{
                width: cellSize,
                marginRight: c < SIZE - 1 ? GAP : 0,
                alignItems: 'center',
              }}
            >
              <Text
                style={[
                  styles.targetText,
                  sat ? styles.targetSatisfied : styles.targetUnsatisfied,
                ]}
              >
                {sat ? '\u2713' : ''} {formatTarget(target, numColors)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Grid with row targets */}
      {Array.from({ length: SIZE }).map((_, r) => {
        const rSat = rowSatisfied(state, r);
        return (
          <View key={r} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: r < SIZE - 1 ? GAP : 0 }}>
            {/* Row target (left side) with satisfied/unsatisfied indicator */}
            <View style={{ width: 48, alignItems: 'flex-end', marginRight: 4 }}>
              <Text
                style={[
                  styles.targetText,
                  rSat ? styles.targetSatisfied : styles.targetUnsatisfied,
                ]}
              >
                {rSat ? '\u2713' : ''} {formatTarget(state.rowTargets[r], numColors)}
              </Text>
            </View>

            {/* Grid cells */}
            {Array.from({ length: SIZE }).map((_, c) => {
              const key = r * SIZE + c;
              const color = visibleColor(state.grid, state.peeled, r, c);
              const peelDepth = state.peeled[r][c];
              const canPeel = peelDepth < 2 && !solved;

              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [{ scale: cellScales[key] }],
                    marginRight: c < SIZE - 1 ? GAP : 0,
                  }}
                >
                  <Pressable
                    onPress={() => handlePeel(r, c)}
                    disabled={!canPeel}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: COLOR_HEX[color],
                        borderColor: peelDepth > 0 ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
                        borderWidth: peelDepth > 0 ? 2 : 1,
                      },
                    ]}
                  >
                    {/* Layer indicator */}
                    {peelDepth > 0 && (
                      <View style={styles.peelBadge}>
                        <Text style={styles.peelBadgeText}>
                          {peelDepth === 2 ? '\u25CF' : '\u25CB'}
                        </Text>
                      </View>
                    )}
                    {/* Color letter */}
                    <Text style={styles.cellLabel}>
                      {COLOR_NAMES[color]}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        );
      })}

      {/* Undo removed per v2 spec — irreversibility is core tension */}

      <CelebrationBurst show={solved} />

      {solved && (
        <View style={styles.endMsg}>
          <Text style={styles.endEmoji}>
            {state.moves < par ? '\uD83C\uDF1F' : state.moves === par ? '\u2B50' : '\uD83D\uDCC4'}
          </Text>
          <Text style={styles.endText}>
            {state.moves < par
              ? `Under par! ${state.moves} peels`
              : state.moves === par
                ? `At par! ${state.moves} peels`
                : `Solved in ${state.moves} peels`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Each cell has hidden color layers beneath. Tap to peel away the top
          layer and reveal what's underneath.{'\n\n'}
          Goal: make every row and column match its color count target.
          Green checks show satisfied constraints. Peels are irreversible.{'\n'}
          Par: {par} peels.
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
  targetText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  targetSatisfied: {
    color: '#2ecc71',
  },
  targetUnsatisfied: {
    color: '#c0392b',
  },
  cell: {
    borderRadius: CELL_BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cellLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  peelBadge: {
    position: 'absolute',
    top: 2,
    right: 4,
  },
  peelBadgeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 8,
  },
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
