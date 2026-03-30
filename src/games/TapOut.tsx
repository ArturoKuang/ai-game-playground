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
import { getDailySeed, seededRandom } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';

const GRID_SIZE = 5;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
const PAR_TIME = 15; // seconds — par for tapping all 25 in order

const TILE_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6',
  '#e67e22', '#1abc9c', '#e84393',
];

function generateTilePositions(seed: number): number[] {
  const rng = seededRandom(seed);
  // Create array [1..25] and shuffle
  const tiles = Array.from({ length: TOTAL_TILES }, (_, i) => i + 1);
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

export default function TapOut() {
  const seed = useMemo(() => getDailySeed(), []);
  const tiles = useMemo(() => generateTilePositions(seed), [seed]);
  const { width: screenWidth } = useWindowDimensions();

  const [nextNumber, setNextNumber] = useState(1);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [tappedTiles, setTappedTiles] = useState<Set<number>>(new Set());
  const [wrongTap, setWrongTap] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const maxWidth = Math.min(screenWidth - 48, 360);
  const cellSize = Math.floor(maxWidth / GRID_SIZE) - 6;

  const gameOver = nextNumber > TOTAL_TILES;
  const elapsedTime = endTime && startTime
    ? ((endTime - startTime) / 1000)
    : startTime
      ? ((Date.now() - startTime) / 1000)
      : 0;
  const finalTime = endTime && startTime ? (endTime - startTime) / 1000 : 0;
  const underPar = finalTime > 0 && finalTime <= PAR_TIME;

  // Timer refresh
  const [, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => setTick((t) => t + 1), 100);
  }, []);

  // Bounce animation per cell
  const cellScales = useRef(
    Array.from({ length: TOTAL_TILES }, () => new Animated.Value(1))
  ).current;

  const handleTileTap = useCallback(
    (tileNumber: number, index: number) => {
      if (gameOver) return;

      if (!startTime) {
        setStartTime(Date.now());
        startTimer();
      }

      if (tileNumber === nextNumber) {
        // Correct tap — bounce and mark
        Animated.sequence([
          Animated.timing(cellScales[index], {
            toValue: 0.7,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(cellScales[index], {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();

        setTappedTiles((prev) => new Set(prev).add(tileNumber));
        setNextNumber((n) => n + 1);
        setWrongTap(null);

        // Check if game over
        if (tileNumber === TOTAL_TILES) {
          const finishTime = Date.now();
          setEndTime(finishTime);
          if (timerRef.current) clearInterval(timerRef.current);

          const timeScore = Math.round((finishTime - (startTime || finishTime)) / 1000);
          recordGame('tapout', timeScore, PAR_TIME).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        }
      } else {
        // Wrong tap — flash red
        setWrongTap(index);
        Animated.sequence([
          Animated.timing(cellScales[index], {
            toValue: 1.2,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.spring(cellScales[index], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();
        setTimeout(() => setWrongTap(null), 300);
      }
    },
    [nextNumber, startTime, gameOver, cellScales, startTimer]
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('tapout');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const time = finalTime.toFixed(1);
    return `TapOut ${time}s / ${PAR_TIME}s \u23f1\ufe0f\n${underPar ? '\ud83c\udf1f Speed demon!' : `Cleared in ${time}s`}\n${'1\ufe0f\u20e3'.repeat(Math.min(5, Math.floor(PAR_TIME / finalTime * 5)))}`;
  }

  function getTileColor(num: number): string {
    return TILE_COLORS[(num - 1) % TILE_COLORS.length];
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TapOut</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Tap the numbers in order: 1, 2, 3... as fast as you can!
      </Text>

      <View style={styles.moveCounter}>
        <Text style={styles.moveLabel}>Time</Text>
        <Text
          style={[
            styles.moveCount,
            gameOver && underPar && styles.moveCountGood,
            gameOver && !underPar && styles.moveCountOver,
          ]}
        >
          {gameOver ? finalTime.toFixed(1) : elapsedTime.toFixed(1)}s
        </Text>
        <Text style={styles.movePar}>Par: {PAR_TIME}s</Text>
        {!gameOver && (
          <Text style={styles.nextHint}>Next: {nextNumber}</Text>
        )}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {Array.from({ length: GRID_SIZE }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: GRID_SIZE }).map((_, c) => {
              const index = r * GRID_SIZE + c;
              const tileNum = tiles[index];
              const isTapped = tappedTiles.has(tileNum);
              const isNext = tileNum === nextNumber;
              const isWrong = wrongTap === index;

              return (
                <Animated.View
                  key={c}
                  style={{
                    transform: [{ scale: cellScales[index] }],
                  }}
                >
                  <Pressable
                    onPress={() => handleTileTap(tileNum, index)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: isTapped
                          ? '#1a1a2e'
                          : isWrong
                            ? '#c0392b'
                            : getTileColor(tileNum),
                        borderColor: isNext && !gameOver
                          ? '#ffffff'
                          : isTapped
                            ? '#2c2c2e'
                            : 'rgba(255,255,255,0.15)',
                      },
                    ]}
                  >
                    {!isTapped && (
                      <Text style={styles.tileNum}>{tileNum}</Text>
                    )}
                    {isTapped && (
                      <Text style={styles.tileCheck}>{'\u2713'}</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {!startTime && (
        <Text style={styles.tapHint}>Tap tile #1 to start the timer!</Text>
      )}

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {underPar ? '\u26a1' : '\u23f1\ufe0f'}
          </Text>
          <Text style={styles.winText}>
            {underPar
              ? `Speed demon! ${finalTime.toFixed(1)}s`
              : `Done in ${finalTime.toFixed(1)}s (par: ${PAR_TIME}s)`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Find and tap tile #1 to start the clock. Then tap #2, #3, #4... all
          the way to #{TOTAL_TILES} as fast as you can. Wrong taps flash red
          but don't penalize — speed is all that matters!{'\n\n'}
          Beat {PAR_TIME} seconds for a star!
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
    maxWidth: 300,
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
  nextHint: { color: '#5dade2', fontSize: 14, marginLeft: 8, fontWeight: '700' },
  grid: {
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileNum: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 20,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  tileCheck: {
    color: '#3a3a3c',
    fontSize: 16,
  },
  tapHint: {
    color: '#6aaa64',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
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
