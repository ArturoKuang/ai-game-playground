import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import ShareButton from '../components/ShareButton';
import StatsModal from '../components/StatsModal';
import { getDailySeed, seededRandom } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';

const NUM_COLORS = 4;
const BALLS_PER_TUBE = 4;
const NUM_TUBES = NUM_COLORS + 2; // 2 empty tubes to work with
const PAR_MOVES = 20;

const COLORS = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
  '#f1c40f', // yellow
];

const COLOR_EMOJI: Record<string, string> = {
  '#e74c3c': '\ud83d\udfe5',
  '#3498db': '\ud83d\udfe6',
  '#2ecc71': '\ud83d\udfe9',
  '#f1c40f': '\ud83d\udfe8',
};

type Tube = string[]; // bottom to top

function generateTubes(seed: number): Tube[] {
  const rng = seededRandom(seed);

  // Create all balls
  const balls: string[] = [];
  for (let c = 0; c < NUM_COLORS; c++) {
    for (let b = 0; b < BALLS_PER_TUBE; b++) {
      balls.push(COLORS[c]);
    }
  }

  // Fisher-Yates shuffle
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [balls[i], balls[j]] = [balls[j], balls[i]];
  }

  // Distribute into tubes
  const tubes: Tube[] = [];
  for (let t = 0; t < NUM_COLORS; t++) {
    tubes.push(balls.slice(t * BALLS_PER_TUBE, (t + 1) * BALLS_PER_TUBE));
  }
  // Add empty tubes
  for (let t = 0; t < NUM_TUBES - NUM_COLORS; t++) {
    tubes.push([]);
  }

  // Ensure it's not already solved
  const solved = tubes.every(
    (tube) =>
      tube.length === 0 ||
      (tube.length === BALLS_PER_TUBE && tube.every((b) => b === tube[0]))
  );
  if (solved) {
    // Swap a ball between first two tubes
    const tmp = tubes[0][0];
    tubes[0][0] = tubes[1][0];
    tubes[1][0] = tmp;
  }

  return tubes;
}

function isSolved(tubes: Tube[]): boolean {
  return tubes.every(
    (tube) =>
      tube.length === 0 ||
      (tube.length === BALLS_PER_TUBE && tube.every((b) => b === tube[0]))
  );
}

function canPour(from: Tube, to: Tube): boolean {
  if (from.length === 0) return false;
  if (to.length >= BALLS_PER_TUBE) return false;
  if (to.length === 0) return true;
  return from[from.length - 1] === to[to.length - 1];
}

export default function ColorSort() {
  const seed = useMemo(() => getDailySeed(), []);
  const initialTubes = useMemo(() => generateTubes(seed), [seed]);
  const { width: screenWidth } = useWindowDimensions();

  const [tubes, setTubes] = useState<Tube[]>(() =>
    initialTubes.map((t) => [...t])
  );
  const [moves, setMoves] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [moveHistory, setMoveHistory] = useState<Tube[][]>([]);

  const solved = isSolved(tubes);
  const underPar = moves <= PAR_MOVES;

  const tubeWidth = Math.min(52, (screenWidth - 48) / NUM_TUBES - 8);
  const ballSize = tubeWidth - 8;

  const handleTubeTap = useCallback(
    (tubeIdx: number) => {
      if (gameOver) return;

      if (selected === null) {
        // Select a tube (must have balls)
        if (tubes[tubeIdx].length > 0) {
          setSelected(tubeIdx);
        }
        return;
      }

      if (selected === tubeIdx) {
        // Deselect
        setSelected(null);
        return;
      }

      // Try to pour
      if (canPour(tubes[selected], tubes[tubeIdx])) {
        // Save history for undo
        setMoveHistory((h) => [...h, tubes.map((t) => [...t])]);

        const next = tubes.map((t) => [...t]);
        // Pour all matching top balls
        const fromColor = next[selected][next[selected].length - 1];
        while (
          next[selected].length > 0 &&
          next[selected][next[selected].length - 1] === fromColor &&
          next[tubeIdx].length < BALLS_PER_TUBE
        ) {
          next[tubeIdx].push(next[selected].pop()!);
        }

        setTubes(next);
        setMoves((m) => m + 1);
        setSelected(null);

        if (isSolved(next)) {
          setGameOver(true);
          recordGame('colorsort', moves + 1, PAR_MOVES).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        }
      } else {
        // Invalid pour — select the new tube instead if it has balls
        if (tubes[tubeIdx].length > 0) {
          setSelected(tubeIdx);
        } else {
          setSelected(null);
        }
      }
    },
    [tubes, selected, moves, gameOver]
  );

  const handleUndo = useCallback(() => {
    if (moveHistory.length === 0 || gameOver) return;
    const prev = moveHistory[moveHistory.length - 1];
    setTubes(prev);
    setMoveHistory((h) => h.slice(0, -1));
    setMoves((m) => m - 1);
    setSelected(null);
  }, [moveHistory, gameOver]);

  const handleReset = useCallback(() => {
    setTubes(initialTubes.map((t) => [...t]));
    setMoves(0);
    setSelected(null);
    setGameOver(false);
    setMoveHistory([]);
  }, [initialTubes]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('colorsort');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const emoji = tubes
      .filter((t) => t.length > 0)
      .map((t) => COLOR_EMOJI[t[0]] || '\u2b1c')
      .join('');
    return `ColorSort ${moves}/${PAR_MOVES} moves ${underPar ? '\ud83c\udf1f' : '\ud83e\udde9'}\n${emoji}\n${underPar ? 'Under par!' : `Sorted in ${moves}`}`;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ColorSort</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Sort the balls so each tube has one color
      </Text>

      <View style={styles.moveCounter}>
        <Text style={styles.moveLabel}>Moves</Text>
        <Text
          style={[
            styles.moveCount,
            gameOver && underPar && styles.moveCountGood,
            gameOver && !underPar && styles.moveCountOver,
          ]}
        >
          {moves}
        </Text>
        <Text style={styles.movePar}>Par: {PAR_MOVES}</Text>
      </View>

      {/* Tubes */}
      <View style={styles.tubeRow}>
        {tubes.map((tube, tIdx) => (
          <Pressable
            key={tIdx}
            onPress={() => handleTubeTap(tIdx)}
            style={[
              styles.tube,
              {
                width: tubeWidth,
                height: tubeWidth * BALLS_PER_TUBE + 12,
              },
              selected === tIdx && styles.tubeSelected,
            ]}
          >
            {/* Render balls bottom-to-top */}
            {Array.from({ length: BALLS_PER_TUBE }).map((_, slotIdx) => {
              const ball = tube[slotIdx];
              return (
                <View
                  key={slotIdx}
                  style={[
                    styles.ballSlot,
                    {
                      width: ballSize,
                      height: ballSize,
                      borderRadius: ballSize / 2,
                      backgroundColor: ball || 'transparent',
                      borderColor: ball ? 'rgba(255,255,255,0.2)' : 'transparent',
                      borderWidth: ball ? 2 : 0,
                    },
                  ]}
                >
                  {ball && <View style={styles.ballShine} />}
                </View>
              );
            }).reverse()}
          </Pressable>
        ))}
      </View>

      {/* Controls */}
      {!gameOver && (
        <View style={styles.controls}>
          {moveHistory.length > 0 && (
            <Pressable style={styles.controlBtn} onPress={handleUndo}>
              <Text style={styles.controlBtnText}>Undo</Text>
            </Pressable>
          )}
          {moves > 0 && (
            <Pressable style={styles.controlBtn} onPress={handleReset}>
              <Text style={styles.controlBtnText}>Reset</Text>
            </Pressable>
          )}
        </View>
      )}

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {underPar ? '\ud83c\udf89' : '\ud83d\udc4d'}
          </Text>
          <Text style={styles.winText}>
            {underPar
              ? `Under par! ${moves} moves`
              : `Sorted in ${moves} moves (par: ${PAR_MOVES})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap a tube to select it, then tap another tube to pour. Balls can
          only be poured onto matching colors (or into an empty tube). A pour
          moves all matching balls from the top.{'\n\n'}
          Sort all colors into separate tubes in {PAR_MOVES} moves or fewer!
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  statsIcon: { fontSize: 24 },
  subtitle: {
    fontSize: 13,
    color: '#818384',
    marginTop: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  moveCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  moveLabel: { color: '#818384', fontSize: 14 },
  moveCount: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  moveCountGood: { color: '#2ecc71' },
  moveCountOver: { color: '#e67e22' },
  movePar: { color: '#818384', fontSize: 14 },
  tubeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  tube: {
    backgroundColor: '#1a1a2e',
    borderRadius: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: '#3a3a3c',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  tubeSelected: {
    borderColor: '#5dade2',
    backgroundColor: '#1a2a3e',
  },
  ballSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ballShine: {
    width: '40%',
    height: '40%',
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.3)',
    position: 'absolute',
    top: '15%',
    left: '15%',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  controlBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  controlBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  winMessage: {
    alignItems: 'center',
    marginTop: 20,
  },
  winEmoji: { fontSize: 48 },
  winText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  howTo: {
    marginTop: 28,
    paddingHorizontal: 12,
    maxWidth: 360,
  },
  howToTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: {
    color: '#818384',
    fontSize: 13,
    lineHeight: 20,
  },
});
