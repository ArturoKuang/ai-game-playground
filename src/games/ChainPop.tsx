import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { getDailySeed, seededRandom, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';

const ARENA_SIZE = 340;
const BUBBLE_RADIUS = 16;
const EXPLOSION_RADIUS = 48;
const CHAIN_DELAY = 250;
const MAX_TAPS = 3;

function getDifficulty() {
  const d = getDayDifficulty(); // 1 (Mon) to 5 (Fri)
  const numBubbles = 15 + d * 2; // Mon: 17, Fri: 25
  const parPops = numBubbles - 2 - d; // Mon: 14/17, Fri: 18/25
  return { numBubbles, parPops };
}

type Bubble = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alive: boolean;
  popping: boolean;
};

const BUBBLE_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];

function generateBubbles(seed: number, count: number): Bubble[] {
  const rng = seededRandom(seed);
  const bubbles: Bubble[] = [];

  for (let i = 0; i < count; i++) {
    const margin = BUBBLE_RADIUS + 10;
    bubbles.push({
      id: i,
      x: margin + rng() * (ARENA_SIZE - 2 * margin),
      y: margin + rng() * (ARENA_SIZE - 2 * margin),
      vx: (rng() - 0.5) * 1.0,
      vy: (rng() - 0.5) * 1.0,
      color: BUBBLE_COLORS[Math.floor(rng() * BUBBLE_COLORS.length)],
      alive: true,
      popping: false,
    });
  }

  return bubbles;
}

export default function ChainPop() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const [bubbles, setBubbles] = useState(() => generateBubbles(seed, diff.numBubbles));
  const [tapsLeft, setTapsLeft] = useState(MAX_TAPS);
  const [popped, setPopped] = useState(0);
  const [popsPerTap, setPopsPerTap] = useState<number[]>([]);
  const [chainRunning, setChainRunning] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const scale = Math.min(screenWidth - 32, ARENA_SIZE) / ARENA_SIZE;

  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);

  const allPopped = bubbles.every((b) => !b.alive);
  const gameOver = (tapsLeft === 0 || allPopped) && !chainRunning;
  const won = popped >= diff.parPops;

  // Animate bubbles floating around
  useEffect(() => {
    animRef.current = setInterval(() => {
      setBubbles((prev) =>
        prev.map((b) => {
          if (!b.alive || b.popping) return b;
          let nx = b.x + b.vx;
          let ny = b.y + b.vy;
          let nvx = b.vx;
          let nvy = b.vy;

          if (nx <= BUBBLE_RADIUS || nx >= ARENA_SIZE - BUBBLE_RADIUS) nvx *= -1;
          if (ny <= BUBBLE_RADIUS || ny >= ARENA_SIZE - BUBBLE_RADIUS) nvy *= -1;

          nx = Math.max(BUBBLE_RADIUS, Math.min(ARENA_SIZE - BUBBLE_RADIUS, nx));
          ny = Math.max(BUBBLE_RADIUS, Math.min(ARENA_SIZE - BUBBLE_RADIUS, ny));

          return { ...b, x: nx, y: ny, vx: nvx, vy: nvy };
        })
      );
    }, 33);

    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, []);

  // Chain reaction logic — supports multiple taps
  const triggerChain = useCallback(
    (tapX: number, tapY: number) => {
      if (tapsLeft <= 0 || chainRunning) return;
      setTapsLeft((t) => t - 1);
      setChainRunning(true);

      // Track pops for this specific tap
      const poppedIds = new Set<number>();

      // Find bubbles in explosion radius of tap
      const explosionQueue: number[] = [];
      for (const b of bubbles) {
        if (b.alive && Math.hypot(b.x - tapX, b.y - tapY) < EXPLOSION_RADIUS) {
          explosionQueue.push(b.id);
          poppedIds.add(b.id);
        }
      }

      // Process chain in waves
      const processWave = () => {
        if (explosionQueue.length === 0) {
          setChainRunning(false);
          setPopsPerTap((prev) => [...prev, poppedIds.size]);
          setPopped((prev) => prev + poppedIds.size);
          return;
        }

        const currentWave = [...explosionQueue];
        explosionQueue.length = 0;

        // Mark current wave as popping
        setBubbles((prev) =>
          prev.map((b) =>
            currentWave.includes(b.id) ? { ...b, popping: true } : b
          )
        );

        setTimeout(() => {
          // Kill popped bubbles and find chain reactions
          setBubbles((prev) => {
            const updated = prev.map((b) =>
              currentWave.includes(b.id) ? { ...b, alive: false, popping: false } : b
            );

            // Check for chain: alive bubbles near any popped bubble
            for (const poppedId of currentWave) {
              const poppedBubble = updated.find((b) => b.id === poppedId)!;
              for (const b of updated) {
                if (!b.alive || poppedIds.has(b.id)) continue;
                if (
                  Math.hypot(b.x - poppedBubble.x, b.y - poppedBubble.y) <
                  EXPLOSION_RADIUS
                ) {
                  explosionQueue.push(b.id);
                  poppedIds.add(b.id);
                }
              }
            }

            return updated;
          });

          setTimeout(processWave, CHAIN_DELAY);
        }, CHAIN_DELAY);
      };

      processWave();
    },
    [bubbles, tapsLeft, chainRunning]
  );

  // Record stats when game over
  useEffect(() => {
    if (gameOver && popped > 0) {
      const score = diff.numBubbles - popped; // lower is better
      recordGame('chainpop', score, diff.numBubbles - diff.parPops).then((s) => {
        setStatsData(s);
        setShowStats(true);
      });
    }
  }, [gameOver, popped, diff.numBubbles, diff.parPops]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('chainpop');
    setStatsData(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const tapRows = popsPerTap
      .map((count, i) => `Tap ${i + 1}: ${'💥'.repeat(Math.min(count, 10))} ${count}`)
      .join('\n');
    return `ChainPop Day #${puzzleDay} 💥\n${popped}/${diff.numBubbles} popped\n${tapRows}\n${
      allPopped ? '🌟 Total wipeout!' : won ? '⭐ Chain master!' : `${popped} popped`
    }`;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ChainPop</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        {MAX_TAPS} taps. Chain reactions pop nearby bubbles. Pop {diff.parPops}+ to win!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Taps</Text>
          <Text style={[styles.infoValue, tapsLeft === 0 && styles.infoValueDim]}>
            {'💥'.repeat(tapsLeft)}{'⬛'.repeat(MAX_TAPS - tapsLeft)}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Popped</Text>
          <Text style={[styles.infoValue, gameOver && won && styles.infoValueGood]}>
            {popped}/{diff.numBubbles}
          </Text>
        </View>
      </View>

      {/* Per-tap breakdown */}
      {popsPerTap.length > 0 && (
        <View style={styles.tapBreakdown}>
          {popsPerTap.map((count, i) => (
            <Text key={i} style={styles.tapLine}>
              Tap {i + 1}: {count} popped
            </Text>
          ))}
        </View>
      )}

      {/* Arena */}
      <Pressable
        onPressIn={(e) => {
          if (tapsLeft <= 0 || chainRunning) return;
          const { locationX, locationY } = e.nativeEvent;
          setPreviewPos({ x: locationX / scale, y: locationY / scale });
        }}
        onPressOut={() => setPreviewPos(null)}
        onPress={(e) => {
          if (tapsLeft <= 0 || chainRunning) return;
          const { locationX, locationY } = e.nativeEvent;
          setPreviewPos(null);
          triggerChain(locationX / scale, locationY / scale);
        }}
        style={[
          styles.arena,
          {
            width: ARENA_SIZE * scale,
            height: ARENA_SIZE * scale,
          },
        ]}
      >
        <View style={[styles.arenaInner, { transform: [{ scale }], transformOrigin: 'top left' }]}>
          {/* Blast radius preview */}
          {previewPos && tapsLeft > 0 && !chainRunning && (
            <View
              style={[
                styles.blastPreview,
                {
                  left: previewPos.x - EXPLOSION_RADIUS,
                  top: previewPos.y - EXPLOSION_RADIUS,
                  width: EXPLOSION_RADIUS * 2,
                  height: EXPLOSION_RADIUS * 2,
                  borderRadius: EXPLOSION_RADIUS,
                },
              ]}
            >
              <Text style={styles.blastCount}>
                {bubbles.filter(
                  (b) =>
                    b.alive &&
                    Math.hypot(b.x - previewPos.x, b.y - previewPos.y) <
                      EXPLOSION_RADIUS
                ).length}
              </Text>
            </View>
          )}

          {bubbles.map((b) =>
            b.alive ? (
              <View
                key={b.id}
                style={[
                  styles.bubble,
                  {
                    left: b.x - BUBBLE_RADIUS,
                    top: b.y - BUBBLE_RADIUS,
                    width: BUBBLE_RADIUS * 2,
                    height: BUBBLE_RADIUS * 2,
                    borderRadius: BUBBLE_RADIUS,
                    backgroundColor: b.color,
                    transform: b.popping ? [{ scale: 1.8 }] : [{ scale: 1 }],
                    opacity: b.popping ? 0.3 : 1,
                  },
                ]}
              >
                <View style={styles.bubbleShine} />
              </View>
            ) : null
          )}
        </View>
      </Pressable>

      {tapsLeft > 0 && !chainRunning && !gameOver && (
        <Text style={styles.tapHint}>
          {tapsLeft === MAX_TAPS ? 'Tap anywhere to start!' : `${tapsLeft} tap${tapsLeft > 1 ? 's' : ''} remaining`}
        </Text>
      )}
      {chainRunning && (
        <Text style={styles.tapHint}>Chain reacting...</Text>
      )}

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {allPopped ? '\ud83c\udf1f' : won ? '\ud83d\udca5' : '\ud83d\udcad'}
          </Text>
          <Text style={styles.winText}>
            {allPopped
              ? `Total wipeout! All ${diff.numBubbles} popped!`
              : won
                ? `Chain master! ${popped}/${diff.numBubbles} popped`
                : `${popped}/${diff.numBubbles} — need ${diff.parPops}+ to win`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Bubbles float around the arena. You get {MAX_TAPS} taps — each
          creates an explosion that pops nearby bubbles. Popped bubbles
          explode too, creating chain reactions.{'\n\n'}
          Time your taps to catch clusters. Pop {diff.parPops}+ to win!
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
    gap: 24,
    marginBottom: 8,
    alignItems: 'center',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: { color: '#818384', fontSize: 12 },
  infoValue: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  infoValueGood: { color: '#2ecc71' },
  infoValueDim: { opacity: 0.5 },
  tapBreakdown: {
    marginBottom: 8,
  },
  tapLine: {
    color: '#818384',
    fontSize: 12,
    textAlign: 'center',
  },
  arena: {
    backgroundColor: '#0d1117',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3a3a3c',
    overflow: 'hidden',
  },
  arenaInner: {
    width: ARENA_SIZE,
    height: ARENA_SIZE,
    position: 'relative',
  },
  blastPreview: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 100, 100, 0.4)',
    backgroundColor: 'rgba(255, 100, 100, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  blastCount: {
    color: 'rgba(255, 100, 100, 0.7)',
    fontSize: 18,
    fontWeight: '800',
  },
  bubble: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  bubbleShine: {
    width: '35%',
    height: '35%',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    position: 'absolute',
    top: '15%',
    left: '15%',
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
