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
const SIZE = 5;
const GAP = 3;

const SURFACE_BG = '#c4a35a';
const UNDERGROUND_BG = '#7a5c1e';
const EMPTY_BG = '#2a2a2c';
const SURFACE_TEXT = '#1a1a1a';
const UNDERGROUND_TEXT = '#ffe0a0';

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1..5
  // Surface values are LOW to force underground digging
  // Underground values are HIGH to reward strategic exploration
  return {
    picks: 6 + d,                          // Mon:7, Fri:11
    maxSurface: 2 + Math.ceil(d * 0.6),    // Mon:3, Fri:5
    maxUnder: 5 + d,                        // Mon:6, Fri:10→capped at 9
  };
}

/* ─── Board generation ─── */
function generateBoard(seed: number, maxS: number, maxU: number) {
  const rng = seededRandom(seed);
  const surface = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => 1 + Math.floor(rng() * maxS)),
  );
  const effectiveMaxU = Math.min(maxU, 9);
  const underground = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => Math.floor(rng() * (effectiveMaxU + 1))),
  );
  return { surface, underground };
}

/* ─── Optimal solver (DP knapsack) ─── */
function optimalScore(
  surface: number[][],
  underground: number[][],
  picks: number,
): number {
  // Each cell has 3 options: skip(0), surface-only(cost 1, val S), both(cost 2, val S+U)
  const dp = new Array(picks + 1).fill(0);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const s = surface[r][c];
      const u = underground[r][c];
      for (let j = picks; j >= 1; j--) {
        dp[j] = Math.max(dp[j], dp[j - 1] + s);
        if (j >= 2) dp[j] = Math.max(dp[j], dp[j - 2] + s + u);
      }
    }
  }
  return dp[picks];
}

/* ─── Cell states ─── */
type CellState = 'surface' | 'underground' | 'empty';

/* ═══════════════════════════════════════════ */
/*                 Component                   */
/* ═══════════════════════════════════════════ */
export default function Dig() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const board = useMemo(
    () => generateBoard(seed, diff.maxSurface, diff.maxUnder),
    [seed, diff],
  );
  const par = useMemo(
    () => optimalScore(board.surface, board.underground, diff.picks),
    [board, diff.picks],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 320);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  const [cellStates, setCellStates] = useState<CellState[][]>(() =>
    Array.from({ length: SIZE }, () => Array(SIZE).fill('surface') as CellState[]),
  );
  const [picksUsed, setPicksUsed] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  const picksLeft = diff.picks - picksUsed;

  /* Column clues: sum of HIDDEN underground values */
  const columnClues = useMemo(() => {
    return Array.from({ length: SIZE }, (_, c) => {
      let sum = 0;
      for (let r = 0; r < SIZE; r++) {
        if (cellStates[r][c] === 'surface') sum += board.underground[r][c];
      }
      return sum;
    });
  }, [cellStates, board.underground]);

  /* Tap a cell */
  const handleTap = useCallback(
    (r: number, c: number) => {
      if (gameOver || picksLeft <= 0) return;
      const state = cellStates[r][c];
      if (state === 'empty') return;

      const newStates = cellStates.map((row) => [...row]);
      let gained = 0;

      if (state === 'surface') {
        gained = board.surface[r][c];
        newStates[r][c] = 'underground';
      } else {
        gained = board.underground[r][c];
        newStates[r][c] = 'empty';
      }

      const newScore = score + gained;
      const newPicksUsed = picksUsed + 1;

      // Animate
      const idx = r * SIZE + c;
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

      setCellStates(newStates);
      setScore(newScore);
      setPicksUsed(newPicksUsed);

      // End when all picks used
      if (newPicksUsed >= diff.picks) {
        setGameOver(true);
        recordGame('dig', newScore, par, true).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [gameOver, picksLeft, cellStates, board, score, picksUsed, diff.picks, par, cellScales],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('dig');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const st = cellStates[r][c];
        if (st === 'surface') row += '\u2B1C';
        else if (st === 'underground') row += '\uD83D\uDFE7';
        else row += '\uD83D\uDFEB';
      }
      rows.push(row);
    }
    return [
      `Dig Day #${puzzleDay} \u26CF\uFE0F`,
      rows.join('\n'),
      `Score: ${score} / ${par}${score >= par ? ' \u2B50' : ''}`,
    ].join('\n');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dig</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Collect gems! Taking a surface gem reveals what{'\u2019'}s buried below.
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Score</Text>
          <Text
            style={[
              styles.infoValue,
              gameOver && score >= par && styles.infoValueGood,
            ]}
          >
            {score}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{par}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Picks</Text>
          <Text
            style={[
              styles.infoValue,
              picksLeft <= 2 && picksLeft > 0 && styles.infoValueWarn,
              picksLeft <= 0 && styles.infoValueBad,
            ]}
          >
            {picksLeft}
          </Text>
        </View>
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth }]}>
        {Array.from({ length: SIZE }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }).map((_, c) => {
              const state = cellStates[r][c];
              let bg = SURFACE_BG;
              let textColor = SURFACE_TEXT;
              let val = '';

              let isJackpot = false;
              let isBust = false;
              if (state === 'surface') {
                bg = SURFACE_BG;
                textColor = SURFACE_TEXT;
                val = String(board.surface[r][c]);
              } else if (state === 'underground') {
                const uVal = board.underground[r][c];
                isJackpot = uVal >= 5;
                isBust = uVal === 0;
                bg = isJackpot ? '#b8860b' : isBust ? '#4a3a2a' : UNDERGROUND_BG;
                textColor = isJackpot ? '#fff700' : isBust ? '#888' : UNDERGROUND_TEXT;
                val = String(uVal);
              } else {
                bg = EMPTY_BG;
              }

              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [{ scale: cellScales[r * SIZE + c] }],
                  }}
                >
                  <Pressable
                    onPress={() => handleTap(r, c)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: bg,
                      },
                    ]}
                  >
                    {val !== '' && (
                      <Text
                        style={[styles.cellValue, { color: textColor }]}
                      >
                        {val}
                      </Text>
                    )}
                    {state === 'underground' && (
                      <View style={styles.underBadge}>
                        <Text style={styles.underBadgeText}>
                          {'\u26CF'}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}

        {/* Column clues */}
        <View style={[styles.clueRow, { width: gridWidth }]}>
          {columnClues.map((clue, c) => (
            <View
              key={c}
              style={[styles.clueCell, { width: cellSize }]}
            >
              <Text style={styles.clueValue}>{clue}</Text>
              <Text style={styles.clueLabel}>hidden</Text>
            </View>
          ))}
        </View>
      </View>

      <CelebrationBurst show={gameOver && score >= par} />

      {gameOver && (
        <View style={styles.endMessage}>
          <Text style={styles.endEmoji}>
            {score >= par ? '\u2B50' : '\u26CF\uFE0F'}
          </Text>
          <Text style={styles.endText}>
            {score >= par
              ? `Score ${score} \u2014 beat par (${par})!`
              : `Score ${score} / ${par}`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap to collect! Surface gems (gold) are small but safe.
          Taking one reveals a hidden gem below {'\u2014'} underground
          gems can be much bigger!{'\n\n'}
          Column numbers show hidden underground totals. Use them
          to find where the jackpots hide. Each pick costs 1 of
          your {diff.picks} total.
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
    marginBottom: 12,
    textAlign: 'center',
    maxWidth: 300,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
    alignItems: 'baseline',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: '#818384', fontSize: 12 },
  infoValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  infoValueGood: { color: '#2ecc71' },
  infoValueWarn: { color: '#f1c40f' },
  infoValueBad: { color: '#e74c3c' },
  infoPar: {
    color: '#818384',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  cellValue: { fontSize: 24, fontWeight: '800' },
  underBadge: {
    position: 'absolute',
    bottom: 2,
    right: 4,
  },
  underBadgeText: { fontSize: 10, color: '#ccc' },
  clueRow: {
    flexDirection: 'row',
    gap: GAP,
    marginTop: 8,
  },
  clueCell: { alignItems: 'center', paddingVertical: 2 },
  clueValue: {
    color: '#c4a35a',
    fontSize: 16,
    fontWeight: '700',
  },
  clueLabel: { color: '#666', fontSize: 9 },
  endMessage: { alignItems: 'center', marginTop: 20 },
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
