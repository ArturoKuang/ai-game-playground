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
const MAX_LIVES = 3;

const NEIGHBOR_DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty(); // 1 (Mon) – 5 (Fri)
  return {
    numTargets: 3 + d,    // Mon: 4, Fri: 8
    maxProbes: 14 - d,    // Mon: 13, Fri: 9
  };
}

/* ─── Neighbors ─── */
function getNeighbors(key: number): number[] {
  const r = Math.floor(key / SIZE);
  const c = key % SIZE;
  const result: number[] = [];
  for (const [dr, dc] of NEIGHBOR_DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
      result.push(nr * SIZE + nc);
    }
  }
  return result;
}

/* ─── Count adjacent targets ─── */
function countAdjacent(key: number, targets: Set<number>): number {
  return getNeighbors(key).filter((n) => targets.has(n)).length;
}

/* ─── Solvability checker via constraint propagation ─── */
function isSolvable(targets: Set<number>): boolean {
  // Compute clue grid (number for each non-target cell)
  const clues = new Map<number, number>();
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (!targets.has(i)) {
      clues.set(i, countAdjacent(i, targets));
    }
  }

  // Constraint propagation
  const known = new Map<number, boolean>(); // key → isTarget
  // Non-target cells with clues are known safe
  for (const [k] of clues) known.set(k, false);

  let changed = true;
  while (changed) {
    changed = false;
    for (const [k, clue] of clues) {
      const neighbors = getNeighbors(k);
      const unknownNeighbors = neighbors.filter((n) => !known.has(n));
      const knownTargetNeighbors = neighbors.filter(
        (n) => known.get(n) === true,
      ).length;
      const knownSafeNeighbors = neighbors.filter(
        (n) => known.get(n) === false,
      ).length;

      const remaining = clue - knownTargetNeighbors;

      // All remaining unknowns must be targets
      if (remaining === unknownNeighbors.length && remaining > 0) {
        for (const n of unknownNeighbors) {
          known.set(n, true);
          changed = true;
        }
      }

      // All targets accounted for — remaining unknowns are safe
      if (remaining === 0 && unknownNeighbors.length > 0) {
        for (const n of unknownNeighbors) {
          known.set(n, false);
          changed = true;
        }
      }
    }
  }

  // Check if all targets were found
  for (const t of targets) {
    if (known.get(t) !== true) return false;
  }
  return true;
}

/* ─── Generate puzzle with guaranteed solvability ─── */
function generatePuzzle(
  seed: number,
  numTargets: number,
): Set<number> {
  const rng = seededRandom(seed);
  const allCells = Array.from({ length: SIZE * SIZE }, (_, i) => i);

  // Try up to 200 random placements
  for (let attempt = 0; attempt < 200; attempt++) {
    // Shuffle and pick first numTargets
    const shuffled = [...allCells];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const targets = new Set(shuffled.slice(0, numTargets));
    if (isSolvable(targets)) return targets;
  }

  // Fallback: place targets in a known-solvable pattern (diagonal-ish)
  const fallback = new Set<number>();
  for (let i = 0; i < numTargets && i < SIZE; i++) {
    fallback.add(i * SIZE + (i % SIZE));
  }
  return fallback;
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Probe() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const targets = useMemo(
    () => generatePuzzle(seed, diff.numTargets),
    [seed, diff.numTargets],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 32, 320);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  /* State */
  type Mode = 'probe' | 'flag';
  const [mode, setMode] = useState<Mode>('probe');
  const [probed, setProbed] = useState<Map<number, number>>(() => new Map());
  const [flagged, setFlagged] = useState<Set<number>>(() => new Set());
  const [wrongFlags, setWrongFlags] = useState<Set<number>>(() => new Set());
  const [probesUsed, setProbesUsed] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;
  const shakeXValues = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(0)),
  ).current;

  /* ─── Derived: how many targets still need flagging ─── */
  const targetsRemaining = useMemo(() => {
    let count = 0;
    for (const t of targets) {
      if (!flagged.has(t)) count++;
    }
    return count;
  }, [targets, flagged]);

  /* ─── Handle cell tap ─── */
  const handleCellTap = useCallback(
    (key: number) => {
      if (gameOver) return;

      if (mode === 'probe') {
        // Can't probe an already-probed cell, a flagged cell, or if out of probes
        if (probed.has(key) || flagged.has(key)) return;
        if (probesUsed >= diff.maxProbes) return;
        // Can't probe a target cell (it would reveal the answer)
        // Actually — probing a target IS allowed in Minesweeper (it's how you lose).
        // But in Probe, probing is safe. If the cell is a target, show "?" or special feedback.
        // Design choice: probing a target reveals it as a target (costs a probe but gives info).
        // Actually, let me make probing safe ONLY for non-target cells.
        // If you probe a target, it should reveal it as such (like flagging for free but costing a probe).

        const newProbesUsed = probesUsed + 1;
        setProbesUsed(newProbesUsed);

        if (targets.has(key)) {
          // Probing a target: reveal it (auto-flag, no life cost)
          const newFlagged = new Set(flagged);
          newFlagged.add(key);
          setFlagged(newFlagged);

          // Bounce animation
          Animated.sequence([
            Animated.timing(cellScales[key], {
              toValue: 1.25,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[key], {
              toValue: 1,
              friction: 3,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();

          // Check win
          let newTargetsRemaining = 0;
          for (const t of targets) {
            if (!newFlagged.has(t)) newTargetsRemaining++;
          }
          if (newTargetsRemaining === 0) {
            setGameOver(true);
            setWon(true);
            recordGame('probe', newProbesUsed, diff.maxProbes, false).then(
              (s) => {
                setStats(s);
                setShowStats(true);
              },
            );
          }
        } else {
          // Probing a safe cell: reveal its clue number
          const clue = countAdjacent(key, targets);
          const newProbed = new Map(probed);
          newProbed.set(key, clue);
          setProbed(newProbed);

          // Bounce animation
          Animated.sequence([
            Animated.timing(cellScales[key], {
              toValue: 1.15,
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
        }
      } else {
        // FLAG mode
        if (probed.has(key) || flagged.has(key) || wrongFlags.has(key)) return;

        if (targets.has(key)) {
          // Correct flag!
          const newFlagged = new Set(flagged);
          newFlagged.add(key);
          setFlagged(newFlagged);

          // Bounce animation
          Animated.sequence([
            Animated.timing(cellScales[key], {
              toValue: 1.3,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[key], {
              toValue: 1,
              friction: 3,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();

          // Check win
          let newTargetsRemaining = 0;
          for (const t of targets) {
            if (!newFlagged.has(t)) newTargetsRemaining++;
          }
          if (newTargetsRemaining === 0) {
            setGameOver(true);
            setWon(true);
            recordGame('probe', probesUsed, diff.maxProbes, false).then(
              (s) => {
                setStats(s);
                setShowStats(true);
              },
            );
          }
        } else {
          // Wrong flag! Lose a life
          const newLives = lives - 1;
          setLives(newLives);

          const newWrong = new Set(wrongFlags);
          newWrong.add(key);
          setWrongFlags(newWrong);

          // Shake animation
          Animated.sequence([
            Animated.timing(shakeXValues[key], {
              toValue: 6,
              duration: 40,
              useNativeDriver: true,
            }),
            Animated.timing(shakeXValues[key], {
              toValue: -6,
              duration: 40,
              useNativeDriver: true,
            }),
            Animated.timing(shakeXValues[key], {
              toValue: 4,
              duration: 40,
              useNativeDriver: true,
            }),
            Animated.timing(shakeXValues[key], {
              toValue: -4,
              duration: 40,
              useNativeDriver: true,
            }),
            Animated.timing(shakeXValues[key], {
              toValue: 0,
              duration: 40,
              useNativeDriver: true,
            }),
          ]).start();

          // Also reveal the clue at this cell (it was wrong, so it's safe)
          const clue = countAdjacent(key, targets);
          const newProbed = new Map(probed);
          newProbed.set(key, clue);
          setProbed(newProbed);

          if (newLives <= 0) {
            setGameOver(true);
            setWon(false);
            recordGame(
              'probe',
              probesUsed + 99,
              diff.maxProbes,
              false,
            ).then((s) => {
              setStats(s);
              setShowStats(true);
            });
          }
        }
      }
    },
    [
      gameOver,
      mode,
      probed,
      flagged,
      wrongFlags,
      probesUsed,
      lives,
      targets,
      diff.maxProbes,
      cellScales,
      shakeXValues,
    ],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('probe');
    setStats(s);
    setShowStats(true);
  }, []);

  /* ─── Share text ─── */
  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const key = r * SIZE + c;
        if (flagged.has(key)) {
          row += '🎯';
        } else if (probed.has(key)) {
          row += '🔍';
        } else if (wrongFlags.has(key)) {
          row += '❌';
        } else {
          row += '⬛';
        }
      }
      rows.push(row);
    }
    const livesEmoji = '❤️'.repeat(lives) + '🖤'.repeat(MAX_LIVES - lives);
    const result = won ? `${probesUsed} probes` : 'Failed';
    return `🎯 Probe — Day #${puzzleDay}\n${result} ${livesEmoji}\n\n${rows.join('\n')}\n\n🔍probed 🎯found ❌miss ⬛hidden`;
  }

  /* ─── Cell content ─── */
  function getCellContent(key: number) {
    if (flagged.has(key)) {
      return { text: '🎯', bg: '#2ecc71', border: '#27ae60' };
    }
    if (wrongFlags.has(key) && probed.has(key)) {
      return {
        text: String(probed.get(key)!),
        bg: '#3a1a1a',
        border: '#e74c3c',
      };
    }
    if (probed.has(key)) {
      const clue = probed.get(key)!;
      const colors = [
        '#1a1a2e', // 0: dark blue-gray
        '#1a3a5c', // 1: blue
        '#1a5c3a', // 2: green
        '#5c3a1a', // 3: orange
        '#5c1a1a', // 4: red
        '#5c1a5c', // 5+: purple
      ];
      return {
        text: String(clue),
        bg: colors[Math.min(clue, 5)],
        border: '#4a4a4c',
      };
    }
    // Unrevealed
    return { text: '', bg: '#1a1a1b', border: '#3a3a3c' };
  }

  // Clue number colors (Minesweeper-inspired)
  function getClueColor(clue: number): string {
    const colors = [
      '#565758', // 0
      '#3498db', // 1: blue
      '#2ecc71', // 2: green
      '#e74c3c', // 3: red
      '#9b59b6', // 4: purple
      '#e67e22', // 5: orange
    ];
    return colors[Math.min(clue, 5)];
  }

  const livesDisplay = Array.from({ length: MAX_LIVES }, (_, i) =>
    i < lives ? '❤️' : '🖤',
  ).join('');

  const probesLeft = diff.maxProbes - probesUsed;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <Text style={styles.dayLabel}>Day #{puzzleDay}</Text>
      <Text style={styles.subtitle}>
        Probe to reveal clues. Flag the {diff.numTargets} hidden targets.
      </Text>

      {/* Score bar */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Probes</Text>
          <Text
            style={[
              styles.scoreValue,
              probesLeft <= 3 && { color: '#e74c3c' },
            ]}
          >
            {probesLeft}
          </Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Lives</Text>
          <Text style={styles.livesValue}>{livesDisplay}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Targets</Text>
          <Text style={styles.scoreValue}>
            {diff.numTargets - targetsRemaining}/{diff.numTargets}
          </Text>
        </View>
        <Pressable onPress={handleShowStats} style={styles.statsBtn}>
          <Text style={styles.statsBtnText}>📊</Text>
        </Pressable>
      </View>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <Pressable
          style={[
            styles.modeBtn,
            mode === 'probe' && styles.modeBtnActive,
          ]}
          onPress={() => !gameOver && setMode('probe')}
        >
          <Text
            style={[
              styles.modeBtnText,
              mode === 'probe' && styles.modeBtnTextActive,
            ]}
          >
            🔍 Probe
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.modeBtn,
            mode === 'flag' && styles.modeBtnActiveFlag,
          ]}
          onPress={() => !gameOver && setMode('flag')}
        >
          <Text
            style={[
              styles.modeBtnText,
              mode === 'flag' && styles.modeBtnTextActive,
            ]}
          >
            🎯 Flag
          </Text>
        </Pressable>
      </View>

      {/* Grid */}
      <View style={[styles.gridContainer, { width: gridWidth }]}>
        {Array.from({ length: SIZE }, (_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }, (_, c) => {
              const key = r * SIZE + c;
              const cell = getCellContent(key);
              const isProbed = probed.has(key);
              const isFlagged = flagged.has(key);
              const isWrong = wrongFlags.has(key);
              const isRevealed = isProbed || isFlagged || isWrong;
              const canInteract = !gameOver && !isRevealed;
              const showHighlight =
                canInteract &&
                ((mode === 'probe' && probesLeft > 0) ||
                  mode === 'flag');

              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [
                      { scale: cellScales[key] },
                      { translateX: shakeXValues[key] },
                    ],
                  }}
                >
                  <Pressable
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: cell.bg,
                        borderColor: showHighlight
                          ? mode === 'probe'
                            ? '#3498db60'
                            : '#e74c3c60'
                          : cell.border,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => handleCellTap(key)}
                    disabled={gameOver || isRevealed}
                  >
                    {isFlagged && (
                      <Text style={styles.flagEmoji}>🎯</Text>
                    )}
                    {isProbed && !isWrong && (
                      <Text
                        style={[
                          styles.clueText,
                          { color: getClueColor(probed.get(key)!) },
                        ]}
                      >
                        {probed.get(key) === 0 ? '' : probed.get(key)}
                      </Text>
                    )}
                    {isWrong && (
                      <View style={styles.wrongCell}>
                        <Text style={styles.wrongX}>✕</Text>
                        <Text
                          style={[
                            styles.clueTextSmall,
                            {
                              color: getClueColor(probed.get(key) || 0),
                            },
                          ]}
                        >
                          {probed.get(key)}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Game over */}
      {gameOver && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>
            {won
              ? lives === MAX_LIVES
                ? 'Flawless! ✨'
                : 'Cleared! 🎯'
              : 'Out of lives 💔'}
          </Text>
          <Text style={styles.resultText}>
            {won
              ? `${probesUsed} probes used — ${lives}/${MAX_LIVES} lives`
              : `${diff.numTargets - targetsRemaining}/${diff.numTargets} targets found`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      {/* Reveal remaining targets on loss */}
      {gameOver && !won && (
        <View style={styles.revealBox}>
          <Text style={styles.revealTitle}>Hidden targets were at:</Text>
          <Text style={styles.revealText}>
            {Array.from(targets)
              .map((t) => `(${Math.floor(t / SIZE)},${t % SIZE})`)
              .join(', ')}
          </Text>
        </View>
      )}

      <CelebrationBurst show={gameOver && won && lives === MAX_LIVES} />

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
    color: '#565758',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 300,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  scoreBox: { alignItems: 'center' },
  scoreLabel: { color: '#818384', fontSize: 10, fontWeight: '600' },
  scoreValue: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  livesValue: { fontSize: 18, marginTop: 2 },
  statsBtn: { padding: 6 },
  statsBtnText: { fontSize: 18 },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  modeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a1b',
    borderWidth: 2,
    borderColor: '#3a3a3c',
  },
  modeBtnActive: {
    backgroundColor: '#1a2a3a',
    borderColor: '#3498db',
  },
  modeBtnActiveFlag: {
    backgroundColor: '#3a1a1a',
    borderColor: '#e74c3c',
  },
  modeBtnText: {
    color: '#818384',
    fontSize: 14,
    fontWeight: '700',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  gridContainer: { alignSelf: 'center' },
  gridRow: {
    flexDirection: 'row',
    marginBottom: GAP,
  },
  cell: {
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GAP,
  },
  flagEmoji: {
    fontSize: 24,
  },
  clueText: {
    fontSize: 22,
    fontWeight: '900',
  },
  clueTextSmall: {
    fontSize: 12,
    fontWeight: '700',
  },
  wrongCell: {
    alignItems: 'center',
    gap: 0,
  },
  wrongX: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  resultBox: {
    alignItems: 'center',
    marginTop: 16,
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
  revealBox: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#1a1a1b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  revealTitle: {
    color: '#818384',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  revealText: {
    color: '#565758',
    fontSize: 11,
  },
});
