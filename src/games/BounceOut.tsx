import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  PanResponder,
  Animated,
} from 'react-native';
import ShareButton from '../components/ShareButton';
import StatsModal from '../components/StatsModal';
import { getDailySeed, seededRandom, getPuzzleDay } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';

const ARENA_SIZE = 340;
const BALL_RADIUS = 8;
const TARGET_RADIUS = 14;
const WALL_THICKNESS = 4;
const NUM_TARGETS = 5;
const PAR_SHOTS = 3;
const PHYSICS_DT = 1000 / 60;
const BALL_SPEED = 6;
const MAX_BOUNCES = 20;

type Vec2 = { x: number; y: number };
type Target = Vec2 & { alive: boolean; id: number };
type Wall = { x: number; y: number; w: number; h: number };

function generateLevel(seed: number): { targets: Target[]; walls: Wall[] } {
  const rng = seededRandom(seed);
  const margin = 40;
  const targets: Target[] = [];

  for (let i = 0; i < NUM_TARGETS; i++) {
    let x: number, y: number, tooClose: boolean;
    let attempts = 0;
    do {
      x = margin + rng() * (ARENA_SIZE - 2 * margin);
      y = margin + rng() * (ARENA_SIZE - 2 * margin);
      tooClose = targets.some(
        (t) => Math.hypot(t.x - x, t.y - y) < TARGET_RADIUS * 3
      );
      attempts++;
    } while (tooClose && attempts < 50);
    targets.push({ x, y, alive: true, id: i });
  }

  // Generate 2-3 internal walls for bouncing
  const numWalls = 2 + Math.floor(rng() * 2);
  const walls: Wall[] = [];
  for (let i = 0; i < numWalls; i++) {
    const horizontal = rng() > 0.5;
    const wx = 60 + rng() * (ARENA_SIZE - 160);
    const wy = 60 + rng() * (ARENA_SIZE - 160);
    walls.push({
      x: wx,
      y: wy,
      w: horizontal ? 60 + rng() * 60 : WALL_THICKNESS,
      h: horizontal ? WALL_THICKNESS : 60 + rng() * 60,
    });
  }

  return { targets, walls };
}

function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  return len === 0 ? { x: 0, y: -1 } : { x: v.x / len, y: v.y / len };
}

export default function BounceOut() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const level = useMemo(() => generateLevel(seed), [seed]);
  const { width: screenWidth } = useWindowDimensions();
  const scale = Math.min(screenWidth - 32, ARENA_SIZE) / ARENA_SIZE;

  const [targets, setTargets] = useState<Target[]>(() =>
    level.targets.map((t) => ({ ...t }))
  );
  const [shots, setShots] = useState(0);
  const [aiming, setAiming] = useState(false);
  const [aimDir, setAimDir] = useState<Vec2>({ x: 0, y: -1 });
  const [ballTrail, setBallTrail] = useState<Vec2[] | null>(null);
  const [animating, setAnimating] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStatsData] = useState<Stats | null>(null);

  const launchPos: Vec2 = { x: ARENA_SIZE / 2, y: ARENA_SIZE - 20 };
  const allDead = targets.every((t) => !t.alive);

  // Simulate a shot and return trail + hit targets
  const simulateShot = useCallback(
    (dir: Vec2): { trail: Vec2[]; hitIds: number[] } => {
      const trail: Vec2[] = [];
      const hitIds: number[] = [];
      let pos = { ...launchPos };
      let vel = { x: dir.x * BALL_SPEED, y: dir.y * BALL_SPEED };
      let bounces = 0;

      for (let step = 0; step < 600 && bounces <= MAX_BOUNCES; step++) {
        trail.push({ x: pos.x, y: pos.y });
        pos.x += vel.x;
        pos.y += vel.y;

        // Arena walls
        if (pos.x <= BALL_RADIUS) { pos.x = BALL_RADIUS; vel.x *= -1; bounces++; }
        if (pos.x >= ARENA_SIZE - BALL_RADIUS) { pos.x = ARENA_SIZE - BALL_RADIUS; vel.x *= -1; bounces++; }
        if (pos.y <= BALL_RADIUS) { pos.y = BALL_RADIUS; vel.y *= -1; bounces++; }
        if (pos.y >= ARENA_SIZE - BALL_RADIUS) { pos.y = ARENA_SIZE - BALL_RADIUS; vel.y *= -1; bounces++; }

        // Internal walls
        for (const wall of level.walls) {
          if (
            pos.x + BALL_RADIUS > wall.x &&
            pos.x - BALL_RADIUS < wall.x + wall.w &&
            pos.y + BALL_RADIUS > wall.y &&
            pos.y - BALL_RADIUS < wall.y + wall.h
          ) {
            // Simple push-out + reflect
            const fromLeft = pos.x - wall.x;
            const fromRight = wall.x + wall.w - pos.x;
            const fromTop = pos.y - wall.y;
            const fromBottom = wall.y + wall.h - pos.y;
            const minPen = Math.min(fromLeft, fromRight, fromTop, fromBottom);
            if (minPen === fromLeft || minPen === fromRight) vel.x *= -1;
            else vel.y *= -1;
            bounces++;
          }
        }

        // Hit targets
        for (const t of targets) {
          if (!t.alive || hitIds.includes(t.id)) continue;
          if (Math.hypot(pos.x - t.x, pos.y - t.y) < BALL_RADIUS + TARGET_RADIUS) {
            hitIds.push(t.id);
          }
        }
      }

      return { trail, hitIds };
    },
    [targets, level.walls]
  );

  const fireShot = useCallback(() => {
    if (animating || allDead) return;
    setAnimating(true);
    const { trail, hitIds } = simulateShot(aimDir);
    setBallTrail(trail);

    // Animate: show trail, then resolve
    setTimeout(() => {
      setTargets((prev) =>
        prev.map((t) => (hitIds.includes(t.id) ? { ...t, alive: false } : t))
      );
      setShots((s) => s + 1);
      setBallTrail(null);
      setAnimating(false);
      setAiming(false);
    }, Math.min(trail.length * 8, 2000));
  }, [aimDir, animating, allDead, simulateShot]);

  // Record stats when won
  useEffect(() => {
    if (allDead && shots > 0) {
      recordGame('bounceout', shots, PAR_SHOTS).then((s) => {
        setStatsData(s);
        setShowStats(true);
      });
    }
  }, [allDead, shots]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('bounceout');
    setStatsData(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    return `BounceOut ${shots}/${PAR_SHOTS} shots \ud83c\udfb1\n${shots <= PAR_SHOTS ? '\ud83c\udf1f Under par!' : `Cleared in ${shots}`}`;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BounceOut</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Bounce a ball to hit all {NUM_TARGETS} targets
      </Text>

      <View style={styles.moveCounter}>
        <Text style={styles.moveLabel}>Shots</Text>
        <Text style={styles.moveCount}>{shots}</Text>
        <Text style={styles.movePar}>Par: {PAR_SHOTS}</Text>
      </View>

      {/* Arena */}
      <Pressable
        onPress={(e) => {
          if (animating || allDead) return;
          const { locationX, locationY } = e.nativeEvent;
          const dx = locationX / scale - launchPos.x;
          const dy = locationY / scale - launchPos.y;
          const dir = normalize({ x: dx, y: dy });
          setAimDir(dir);
          setAiming(true);
        }}
        style={[
          styles.arena,
          {
            width: ARENA_SIZE * scale,
            height: ARENA_SIZE * scale,
            transform: [{ scale }],
            transformOrigin: 'top left',
          },
        ]}
      >
        {/* Walls */}
        {level.walls.map((wall, i) => (
          <View
            key={`wall-${i}`}
            style={[
              styles.wall,
              {
                left: wall.x,
                top: wall.y,
                width: wall.w,
                height: wall.h,
              },
            ]}
          />
        ))}

        {/* Targets */}
        {targets.map((t) =>
          t.alive ? (
            <View
              key={t.id}
              style={[
                styles.target,
                {
                  left: t.x - TARGET_RADIUS,
                  top: t.y - TARGET_RADIUS,
                  width: TARGET_RADIUS * 2,
                  height: TARGET_RADIUS * 2,
                  borderRadius: TARGET_RADIUS,
                },
              ]}
            />
          ) : (
            <View
              key={t.id}
              style={[
                styles.targetDead,
                {
                  left: t.x - TARGET_RADIUS,
                  top: t.y - TARGET_RADIUS,
                  width: TARGET_RADIUS * 2,
                  height: TARGET_RADIUS * 2,
                  borderRadius: TARGET_RADIUS,
                },
              ]}
            />
          )
        )}

        {/* Launch point */}
        <View
          style={[
            styles.launcher,
            {
              left: launchPos.x - BALL_RADIUS,
              top: launchPos.y - BALL_RADIUS,
            },
          ]}
        />

        {/* Trajectory preview */}
        {aiming && !animating && (() => {
          const previewSteps = 80;
          const dots: { x: number; y: number }[] = [];
          let px = launchPos.x;
          let py = launchPos.y;
          let vx = aimDir.x * BALL_SPEED;
          let vy = aimDir.y * BALL_SPEED;
          for (let i = 0; i < previewSteps; i++) {
            px += vx;
            py += vy;
            if (px <= BALL_RADIUS) { px = BALL_RADIUS; vx *= -1; }
            if (px >= ARENA_SIZE - BALL_RADIUS) { px = ARENA_SIZE - BALL_RADIUS; vx *= -1; }
            if (py <= BALL_RADIUS) { py = BALL_RADIUS; vy *= -1; }
            if (py >= ARENA_SIZE - BALL_RADIUS) { py = ARENA_SIZE - BALL_RADIUS; vy *= -1; }
            if (i % 3 === 0) dots.push({ x: px, y: py });
          }
          return dots.map((d, i) => (
            <View
              key={`aim-${i}`}
              style={{
                position: 'absolute' as const,
                left: d.x - 2,
                top: d.y - 2,
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(52, 152, 219, 0.5)',
                opacity: 1 - (i / dots.length) * 0.7,
              }}
            />
          ));
        })()}

        {/* Ball trail (simple dots) */}
        {ballTrail &&
          ballTrail
            .filter((_, i) => i % 4 === 0)
            .map((p, i) => (
              <View
                key={`trail-${i}`}
                style={[
                  styles.trailDot,
                  {
                    left: p.x - 3,
                    top: p.y - 3,
                    opacity: 0.3 + (i / (ballTrail.length / 4)) * 0.7,
                  },
                ]}
              />
            ))}
      </Pressable>

      {/* Fire button */}
      {aiming && !animating && !allDead && (
        <Pressable style={styles.fireBtn} onPress={fireShot}>
          <Text style={styles.fireBtnText}>Fire!</Text>
        </Pressable>
      )}

      {allDead && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {shots <= PAR_SHOTS ? '\ud83c\udf1f' : '\ud83c\udfaf'}
          </Text>
          <Text style={styles.winText}>
            {shots <= PAR_SHOTS
              ? `Under par! ${shots} shots`
              : `Cleared in ${shots} shots`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap the arena to aim, then hit Fire. The ball bounces off walls and
          obstacles. Hit all the red targets in as few shots as possible.{'\n\n'}
          Par: {PAR_SHOTS} shots
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
  },
  moveCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  moveLabel: { color: '#818384', fontSize: 14 },
  moveCount: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  movePar: { color: '#818384', fontSize: 14 },
  arena: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3a3a3c',
    position: 'relative',
    overflow: 'hidden',
  },
  wall: {
    position: 'absolute',
    backgroundColor: '#4a4a5c',
    borderRadius: 2,
  },
  target: {
    position: 'absolute',
    backgroundColor: '#e74c3c',
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  targetDead: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3a3a3c',
    borderStyle: 'dashed',
  },
  launcher: {
    position: 'absolute',
    width: BALL_RADIUS * 2,
    height: BALL_RADIUS * 2,
    borderRadius: BALL_RADIUS,
    backgroundColor: '#3498db',
    borderWidth: 2,
    borderColor: '#5dade2',
  },
  aimLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: 'rgba(52, 152, 219, 0.6)',
  },
  trailDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3498db',
  },
  fireBtn: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 16,
  },
  fireBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 18,
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
