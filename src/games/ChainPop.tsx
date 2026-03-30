import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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

const ARENA_SIZE = 340;
const NUM_BUBBLES = 20;
const BUBBLE_RADIUS = 16;
const EXPLOSION_RADIUS = 48;
const CHAIN_DELAY = 300;
const PAR_POPS = 15; // need to pop at least this many to be "under par"

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

function generateBubbles(seed: number): Bubble[] {
  const rng = seededRandom(seed);
  const bubbles: Bubble[] = [];

  for (let i = 0; i < NUM_BUBBLES; i++) {
    const margin = BUBBLE_RADIUS + 10;
    bubbles.push({
      id: i,
      x: margin + rng() * (ARENA_SIZE - 2 * margin),
      y: margin + rng() * (ARENA_SIZE - 2 * margin),
      vx: (rng() - 0.5) * 1.5,
      vy: (rng() - 0.5) * 1.5,
      color: BUBBLE_COLORS[Math.floor(rng() * BUBBLE_COLORS.length)],
      alive: true,
      popping: false,
    });
  }

  return bubbles;
}

export default function ChainPop() {
  const seed = useMemo(() => getDailySeed(), []);
  const [bubbles, setBubbles] = useState(() => generateBubbles(seed));
  const [started, setStarted] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [popped, setPopped] = useState(0);
  const [chainRunning, setChainRunning] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const scale = Math.min(screenWidth - 32, ARENA_SIZE) / ARENA_SIZE;

  const gameOver = tapped && !chainRunning;
  const won = popped >= PAR_POPS;

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

  // Chain reaction logic
  const triggerChain = useCallback(
    (tapX: number, tapY: number) => {
      if (tapped) return;
      setTapped(true);
      setChainRunning(true);

      // Work with a mutable copy for the chain
      let currentBubbles = bubbles.map((b) => ({ ...b }));
      let poppedIds = new Set<number>();

      // Find bubbles in explosion radius of tap
      const explosionQueue: number[] = [];
      for (const b of currentBubbles) {
        if (Math.hypot(b.x - tapX, b.y - tapY) < EXPLOSION_RADIUS) {
          explosionQueue.push(b.id);
          poppedIds.add(b.id);
        }
      }

      // Process chain in waves
      let wave = 0;
      const processWave = () => {
        if (explosionQueue.length === 0) {
          setChainRunning(false);
          setPopped(poppedIds.size);
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

            setPopped(poppedIds.size);
            return updated;
          });

          wave++;
          setTimeout(processWave, CHAIN_DELAY);
        }, CHAIN_DELAY);
      };

      processWave();
    },
    [bubbles, tapped]
  );

  // Record stats when game over
  useEffect(() => {
    if (gameOver && popped > 0) {
      // Invert score: more pops = better
      const score = NUM_BUBBLES - popped; // lower is better
      recordGame('chainpop', score, NUM_BUBBLES - PAR_POPS).then((s) => {
        setStatsData(s);
        setShowStats(true);
      });
    }
  }, [gameOver, popped]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('chainpop');
    setStatsData(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    return `ChainPop ${popped}/${NUM_BUBBLES} popped \ud83d\udca5\n${won ? '\ud83c\udf1f Massive chain!' : `Popped ${popped} bubbles`}`;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ChainPop</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Tap once. Chain reaction pops nearby bubbles. Pop {PAR_POPS}+ to win!
      </Text>

      <View style={styles.moveCounter}>
        <Text style={styles.moveLabel}>Popped</Text>
        <Text
          style={[
            styles.moveCount,
            gameOver && won && styles.moveCountGood,
          ]}
        >
          {popped}
        </Text>
        <Text style={styles.movePar}>/ {NUM_BUBBLES}</Text>
      </View>

      {/* Arena */}
      <Pressable
        onPress={(e) => {
          if (tapped) return;
          const { locationX, locationY } = e.nativeEvent;
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
                    transform: b.popping ? [{ scale: 1.6 }] : [{ scale: 1 }],
                    opacity: b.popping ? 0.5 : 1,
                  },
                ]}
              >
                <View style={styles.bubbleShine} />
              </View>
            ) : null
          )}
        </View>
      </Pressable>

      {!tapped && (
        <Text style={styles.tapHint}>Tap anywhere in the arena!</Text>
      )}

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {won ? '\ud83d\udca5' : '\ud83d\udcad'}
          </Text>
          <Text style={styles.winText}>
            {won
              ? `Chain reaction! ${popped} popped`
              : `${popped} popped — try to get ${PAR_POPS}+`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Bubbles float around the arena. You get ONE tap — it creates an
          explosion that pops nearby bubbles. Those bubbles explode too,
          creating a chain reaction.{'\n\n'}
          Time your tap to catch the biggest cluster. Pop {PAR_POPS}+ to win!
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
    marginBottom: 12,
  },
  moveLabel: { color: '#818384', fontSize: 14 },
  moveCount: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  moveCountGood: { color: '#2ecc71' },
  movePar: { color: '#818384', fontSize: 14 },
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
