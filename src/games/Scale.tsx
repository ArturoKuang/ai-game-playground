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
const BEAM_POSITIONS = 7; // positions 0-6
const FULCRUM_POS = 3; // center
const MAX_WEIGHT = 6;

const WEIGHT_COLORS = [
  '', // 0 (unused)
  '#3498db', // 1
  '#2ecc71', // 2
  '#e67e22', // 3
  '#e74c3c', // 4
  '#9b59b6', // 5
  '#1abc9c', // 6
];

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1 (Mon) – 5 (Fri)
  return {
    emptySlots: 1 + d, // Mon: 2, Fri: 6
    extraWeights: 1 + Math.floor(d / 2), // Mon: 1 extra, Fri: 3 extra
  };
}

/* ─── Compute torque (positive = tilts right) ─── */
function computeTorque(weights: (number | null)[]): number {
  let torque = 0;
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] !== null && weights[i]! > 0) {
      torque += weights[i]! * (i - FULCRUM_POS);
    }
  }
  return torque;
}

/* ─── Generate a balanced puzzle ─── */
function generatePuzzle(
  seed: number,
  emptySlots: number,
  extraWeights: number,
): {
  solution: (number | null)[];
  given: (number | null)[];
  tray: number[];
} {
  const rng = seededRandom(seed);

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Try generating balanced beams
  for (let attempt = 0; attempt < 200; attempt++) {
    const weights: (number | null)[] = new Array(BEAM_POSITIONS).fill(null);

    // Place weights at all non-fulcrum positions
    const positions = shuffle(
      Array.from({ length: BEAM_POSITIONS }, (_, i) => i).filter(
        (i) => i !== FULCRUM_POS,
      ),
    );

    // Fill positions with random weights
    for (const pos of positions) {
      weights[pos] = 1 + Math.floor(rng() * MAX_WEIGHT);
    }

    // Check if balanced
    const torque = computeTorque(weights);

    // Try to balance by adjusting one weight
    if (torque !== 0) {
      // Find a position where we can adjust
      for (const pos of positions) {
        const dist = pos - FULCRUM_POS;
        if (dist === 0) continue;
        const needed = weights[pos]! - torque / dist;
        if (Number.isInteger(needed) && needed >= 1 && needed <= MAX_WEIGHT) {
          weights[pos] = needed;
          break;
        }
      }
    }

    if (computeTorque(weights) !== 0) continue;

    // We have a balanced beam! Now remove some weights to create the puzzle
    const filledPositions = positions.filter(
      (p) => weights[p] !== null && weights[p]! > 0,
    );
    if (filledPositions.length < emptySlots + 2) continue;

    const toRemove = shuffle(filledPositions).slice(0, emptySlots);
    const solution = [...weights];
    const given = [...weights];
    const tray: number[] = [];

    for (const pos of toRemove) {
      tray.push(given[pos]!);
      given[pos] = null;
    }

    // Add extra (wrong) weights as red herrings
    for (let i = 0; i < extraWeights; i++) {
      let extra = 1 + Math.floor(rng() * MAX_WEIGHT);
      // Avoid duplicating tray values if possible
      tray.push(extra);
    }

    return {
      solution,
      given,
      tray: shuffle(tray),
    };
  }

  // Fallback
  return {
    solution: [3, 2, 1, null, 1, 2, 3],
    given: [3, null, 1, null, 1, null, 3],
    tray: [2, 2, 4, 5],
  };
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Scale() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const puzzle = useMemo(
    () => generatePuzzle(seed, diff.emptySlots, diff.extraWeights),
    [seed, diff.emptySlots, diff.extraWeights],
  );

  const { width: screenWidth } = useWindowDimensions();
  const beamWidth = Math.min(screenWidth - 40, 360);
  const slotWidth = Math.floor(beamWidth / BEAM_POSITIONS);

  /* State */
  const [currentWeights, setCurrentWeights] = useState<(number | null)[]>(
    () => [...puzzle.given],
  );
  const [trayWeights, setTrayWeights] = useState<(number | null)[]>(
    () => [...puzzle.tray],
  );
  const [selectedTrayIdx, setSelectedTrayIdx] = useState<number | null>(
    null,
  );
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const beamTilt = useRef(new Animated.Value(0)).current;
  const slotScales = useRef(
    Array.from({ length: BEAM_POSITIONS }, () => new Animated.Value(1)),
  ).current;

  /* Torque and tilt */
  const torque = useMemo(
    () => computeTorque(currentWeights),
    [currentWeights],
  );

  // Animate beam tilt when torque changes
  React.useEffect(() => {
    const maxTilt = 8; // degrees
    const tiltDeg = Math.max(-maxTilt, Math.min(maxTilt, torque * 1.5));
    Animated.spring(beamTilt, {
      toValue: tiltDeg,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [torque, beamTilt]);

  /* Is the beam balanced? */
  const isBalanced = torque === 0;
  const allFilled = currentWeights.every(
    (w, i) => i === FULCRUM_POS || (w !== null && w > 0),
  );

  /* ─── Handle beam slot tap ─── */
  const handleSlotTap = useCallback(
    (pos: number) => {
      if (gameOver || pos === FULCRUM_POS) return;

      // If slot is a given weight, ignore
      if (puzzle.given[pos] !== null) return;

      // If slot has a placed weight, return it to tray
      if (currentWeights[pos] !== null) {
        const weight = currentWeights[pos]!;
        const newWeights = [...currentWeights];
        newWeights[pos] = null;
        setCurrentWeights(newWeights);

        // Find first empty tray slot
        const newTray = [...trayWeights];
        const emptyIdx = newTray.findIndex((w) => w === null);
        if (emptyIdx !== -1) {
          newTray[emptyIdx] = weight;
        } else {
          newTray.push(weight);
        }
        setTrayWeights(newTray);
        setSelectedTrayIdx(null);

        Animated.sequence([
          Animated.timing(slotScales[pos], {
            toValue: 0.85,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.spring(slotScales[pos], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();

        return;
      }

      // If a tray weight is selected, place it
      if (selectedTrayIdx !== null && trayWeights[selectedTrayIdx] !== null) {
        const weight = trayWeights[selectedTrayIdx]!;
        const newWeights = [...currentWeights];
        newWeights[pos] = weight;
        setCurrentWeights(newWeights);

        const newTray = [...trayWeights];
        newTray[selectedTrayIdx] = null;
        setTrayWeights(newTray);
        setSelectedTrayIdx(null);
        setMoves(moves + 1);

        Animated.sequence([
          Animated.timing(slotScales[pos], {
            toValue: 1.2,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(slotScales[pos], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();

        // Check win
        const newAllFilled = newWeights.every(
          (w, i) => i === FULCRUM_POS || (w !== null && w > 0),
        );
        if (newAllFilled && computeTorque(newWeights) === 0) {
          setGameOver(true);
          recordGame(
            'scale',
            moves + 1,
            diff.emptySlots,
            false,
          ).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        }
      }
    },
    [
      gameOver,
      selectedTrayIdx,
      currentWeights,
      trayWeights,
      moves,
      puzzle.given,
      diff.emptySlots,
      slotScales,
    ],
  );

  /* ─── Handle tray tap ─── */
  const handleTrayTap = useCallback(
    (idx: number) => {
      if (gameOver || trayWeights[idx] === null) return;
      setSelectedTrayIdx(selectedTrayIdx === idx ? null : idx);
    },
    [gameOver, trayWeights, selectedTrayIdx],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('scale');
    setStats(s);
    setShowStats(true);
  }, []);

  /* ─── Share text ─── */
  function buildShareText(): string {
    const beamStr = currentWeights
      .map((w, i) =>
        i === FULCRUM_POS ? '⚖️' : w !== null ? `${w}` : '_',
      )
      .join(' ');
    const status = moves <= diff.emptySlots ? '⚡' : '';
    return `⚖️ Scale — Day #${puzzleDay} ${status}\n${moves} moves (par ${diff.emptySlots})\n\n${beamStr}\n\n⚖️ Balanced!`;
  }

  /* ─── Tilt indicator ─── */
  const tiltLabel =
    torque === 0
      ? '⚖️ Balanced!'
      : torque > 0
        ? `→ Tilting right (+${torque})`
        : `← Tilting left (${torque})`;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.dayLabel}>Day #{puzzleDay}</Text>
      <Text style={styles.subtitle}>
        Place weights to balance the beam.{'\n'}Tap a weight below, then
        tap an empty slot.
      </Text>

      {/* Score bar */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Moves</Text>
          <Text style={styles.scoreValue}>{moves}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Par</Text>
          <Text style={styles.scoreValue}>{diff.emptySlots}</Text>
        </View>
        <Pressable onPress={handleShowStats} style={styles.statsBtn}>
          <Text style={styles.statsBtnText}>📊</Text>
        </Pressable>
      </View>

      {/* Tilt indicator */}
      <Text
        style={[
          styles.tiltLabel,
          torque === 0 && styles.tiltBalanced,
        ]}
      >
        {tiltLabel}
      </Text>

      {/* Beam assembly */}
      <Animated.View
        style={[
          styles.beamAssembly,
          { width: beamWidth },
          {
            transform: [
              {
                rotate: beamTilt.interpolate({
                  inputRange: [-10, 10],
                  outputRange: ['-10deg', '10deg'],
                }),
              },
            ],
          },
        ]}
      >
        {/* Position labels */}
        <View style={styles.posLabels}>
          {Array.from({ length: BEAM_POSITIONS }, (_, i) => (
            <View key={i} style={[styles.posLabel, { width: slotWidth }]}>
              <Text style={styles.posLabelText}>
                {i === FULCRUM_POS
                  ? ''
                  : Math.abs(i - FULCRUM_POS)}
              </Text>
            </View>
          ))}
        </View>

        {/* Weight slots */}
        <View style={styles.slotsRow}>
          {currentWeights.map((w, i) => {
            if (i === FULCRUM_POS) {
              return (
                <View
                  key={i}
                  style={[styles.fulcrum, { width: slotWidth }]}
                >
                  <Text style={styles.fulcrumText}>▲</Text>
                </View>
              );
            }

            const isGiven = puzzle.given[i] !== null;
            const isEmpty = w === null;
            const canPlace =
              isEmpty && selectedTrayIdx !== null && !gameOver;

            return (
              <Animated.View
                key={i}
                style={{ transform: [{ scale: slotScales[i] }] }}
              >
                <Pressable
                  style={[
                    styles.slot,
                    {
                      width: slotWidth - 4,
                      height: slotWidth + 8,
                      backgroundColor: isEmpty
                        ? canPlace
                          ? '#2a3a2a'
                          : '#1a1a1b'
                        : WEIGHT_COLORS[w] || '#3a3a3c',
                      borderColor: isEmpty
                        ? canPlace
                          ? '#6aaa64'
                          : '#3a3a3c'
                        : isGiven
                          ? '#ffffff40'
                          : '#6aaa64',
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => handleSlotTap(i)}
                  disabled={gameOver && isGiven}
                >
                  {!isEmpty && (
                    <Text style={styles.weightText}>{w}</Text>
                  )}
                  {isEmpty && canPlace && (
                    <Text style={styles.placeholderText}>+</Text>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* Beam bar */}
        <View style={[styles.beamBar, { width: beamWidth }]} />
      </Animated.View>

      {/* Fulcrum base (doesn't tilt) */}
      <View style={styles.fulcrumBase}>
        <Text style={styles.fulcrumBaseText}>△</Text>
      </View>

      {/* Weight tray */}
      <Text style={styles.trayLabel}>Available Weights</Text>
      <View style={styles.tray}>
        {trayWeights.map((w, i) => {
          if (w === null) return <View key={i} style={styles.trayEmpty} />;
          const isSelected = selectedTrayIdx === i;
          return (
            <Pressable
              key={i}
              style={[
                styles.trayWeight,
                {
                  backgroundColor: WEIGHT_COLORS[w] || '#3a3a3c',
                  borderColor: isSelected ? '#ffffff' : 'transparent',
                  borderWidth: 3,
                  transform: [{ scale: isSelected ? 1.15 : 1 }],
                },
              ]}
              onPress={() => handleTrayTap(i)}
            >
              <Text style={styles.trayWeightText}>{w}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Game over */}
      {gameOver && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>
            {moves <= diff.emptySlots ? 'Perfect! ⚖️' : 'Balanced! ⚖️'}
          </Text>
          <Text style={styles.resultText}>
            {moves} moves — par {diff.emptySlots}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <CelebrationBurst
        show={gameOver && moves <= diff.emptySlots}
      />

      {stats && showStats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
    </ScrollView>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#121213' },
  container: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dayLabel: {
    color: '#818384',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 2,
  },
  subtitle: {
    color: '#818384',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 8,
  },
  scoreBox: { alignItems: 'center' },
  scoreLabel: { color: '#818384', fontSize: 10, fontWeight: '600' },
  scoreValue: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  statsBtn: { padding: 6 },
  statsBtnText: { fontSize: 18 },
  tiltLabel: {
    color: '#e67e22',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  tiltBalanced: {
    color: '#6aaa64',
  },
  beamAssembly: {
    alignItems: 'center',
    marginBottom: 4,
  },
  posLabels: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  posLabel: {
    alignItems: 'center',
  },
  posLabelText: {
    color: '#565758',
    fontSize: 10,
    fontWeight: '600',
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  slot: {
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  weightText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: '#00000060',
    textShadowRadius: 3,
  },
  placeholderText: {
    color: '#6aaa6480',
    fontSize: 18,
    fontWeight: '700',
  },
  fulcrum: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  fulcrumText: {
    color: '#f1c40f',
    fontSize: 24,
    fontWeight: '900',
  },
  beamBar: {
    height: 6,
    backgroundColor: '#8b7355',
    borderRadius: 3,
    marginTop: -2,
  },
  fulcrumBase: {
    alignItems: 'center',
    marginTop: -4,
    marginBottom: 20,
  },
  fulcrumBaseText: {
    color: '#f1c40f',
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 36,
  },
  trayLabel: {
    color: '#818384',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  tray: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  trayWeight: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trayWeightText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: '#00000060',
    textShadowRadius: 3,
  },
  trayEmpty: {
    width: 50,
    height: 50,
  },
  resultBox: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  resultText: {
    color: '#818384',
    fontSize: 14,
    marginBottom: 8,
  },
});
