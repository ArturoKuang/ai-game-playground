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

/* ─── Types ─── */
type Dir = 'up' | 'down' | 'left' | 'right';
type MirrorType = '/' | '\\';

/* ─── Constants ─── */
const SIZE = 7;
const GAP = 2;
const DR: Record<Dir, number> = { up: -1, down: 1, left: 0, right: 0 };
const DC: Record<Dir, number> = { up: 0, down: 0, left: -1, right: 1 };
const DIR_ARROW: Record<Dir, string> = {
  down: '\u25BC',
  up: '\u25B2',
  left: '\u25C0',
  right: '\u25B6',
};

/* ─── Difficulty ─── */
function getDifficulty() {
  const d = getDayDifficulty();
  const numMirrors = d <= 2 ? 2 : d <= 4 ? 3 : 4;
  const numTargets = d <= 1 ? 2 : d <= 3 ? 3 : 4;
  const parSeconds = 30 + d * 25;
  return { numMirrors, numTargets, parSeconds };
}

/* ─── Mirror reflection ─── */
function reflect(dir: Dir, mirror: MirrorType): Dir {
  if (mirror === '/') {
    return ({ right: 'up', left: 'down', up: 'right', down: 'left' } as Record<Dir, Dir>)[dir];
  }
  return ({ right: 'down', left: 'up', up: 'left', down: 'right' } as Record<Dir, Dir>)[dir];
}

function getMirrorForTurn(from: Dir, to: Dir): MirrorType {
  if (
    (from === 'right' && to === 'up') ||
    (from === 'up' && to === 'right') ||
    (from === 'left' && to === 'down') ||
    (from === 'down' && to === 'left')
  ) return '/';
  return '\\';
}

/* ─── Trace beam ─── */
function traceBeam(
  startR: number,
  startC: number,
  startDir: Dir,
  mirrors: Map<number, MirrorType>,
): number[] {
  const path: number[] = [];
  let r = startR, c = startC, dir = startDir;
  const visited = new Set<string>();

  while (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
    const state = `${r},${c},${dir}`;
    if (visited.has(state)) break;
    visited.add(state);
    path.push(r * SIZE + c);

    const mirror = mirrors.get(r * SIZE + c);
    if (mirror) dir = reflect(dir, mirror);

    r += DR[dir];
    c += DC[dir];
  }
  return path;
}

/* ─── Generate puzzle ─── */
function generatePuzzle(
  seed: number,
  numMirrors: number,
  numTargets: number,
): {
  laserR: number;
  laserC: number;
  laserDir: Dir;
  targets: Set<number>;
  solutionMirrors: Map<number, MirrorType>;
} {
  const PERP: Record<Dir, Dir[]> = {
    up: ['left', 'right'],
    down: ['left', 'right'],
    left: ['up', 'down'],
    right: ['up', 'down'],
  };

  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = seededRandom(seed + attempt * 7919);

    // Random edge entry
    const side = Math.floor(rng() * 4);
    const pos = Math.floor(rng() * SIZE);
    let startR: number, startC: number, startDir: Dir;
    switch (side) {
      case 0: startR = 0; startC = pos; startDir = 'down'; break;
      case 1: startR = pos; startC = SIZE - 1; startDir = 'left'; break;
      case 2: startR = SIZE - 1; startC = pos; startDir = 'up'; break;
      default: startR = pos; startC = 0; startDir = 'right'; break;
    }

    const mirrors = new Map<number, MirrorType>();
    const pathCells: number[] = [];
    const usedCells = new Set<number>();
    let r = startR, c = startC, dir = startDir;
    let ok = true;

    for (let m = 0; m < numMirrors; m++) {
      // Travel 2-4 straight cells
      const steps = 2 + Math.floor(rng() * 3);
      let traveled = 0;
      for (let s = 0; s < steps; s++) {
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) break;
        if (usedCells.has(r * SIZE + c)) break;
        pathCells.push(r * SIZE + c);
        usedCells.add(r * SIZE + c);
        traveled++;
        if (s < steps - 1) { r += DR[dir]; c += DC[dir]; }
      }
      if (traveled === 0 || r < 0 || r >= SIZE || c < 0 || c >= SIZE) {
        ok = false; break;
      }

      // Turn at current position
      const validTurns = PERP[dir].filter((d) => {
        const nr = r + DR[d], nc = c + DC[d];
        return nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !usedCells.has(nr * SIZE + nc);
      });
      if (validTurns.length === 0) { ok = false; break; }

      const newDir = validTurns[Math.floor(rng() * validTurns.length)];
      mirrors.set(r * SIZE + c, getMirrorForTurn(dir, newDir));
      dir = newDir;
      r += DR[dir];
      c += DC[dir];
    }
    if (!ok) continue;

    // Continue to grid exit
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && !usedCells.has(r * SIZE + c)) {
      pathCells.push(r * SIZE + c);
      usedCells.add(r * SIZE + c);
      r += DR[dir];
      c += DC[dir];
    }

    // Enough path cells for targets?
    const mirrorKeys = new Set(mirrors.keys());
    const candidates = pathCells.filter((k) => !mirrorKeys.has(k));
    if (candidates.length < numTargets) continue;

    // Spread targets across the path (not clustered)
    const step = Math.max(1, Math.floor(candidates.length / (numTargets + 1)));
    const targets = new Set<number>();
    for (let i = 0; i < numTargets; i++) {
      const idx = Math.min(step * (i + 1), candidates.length - 1);
      targets.add(candidates[idx]);
    }

    // Verify beam actually hits all targets
    const beamPath = new Set(traceBeam(startR, startC, startDir, mirrors));
    if ([...targets].every((t) => beamPath.has(t))) {
      return {
        laserR: startR,
        laserC: startC,
        laserDir: startDir,
        targets,
        solutionMirrors: mirrors,
      };
    }
  }

  // Fallback
  return {
    laserR: 0, laserC: 0, laserDir: 'right',
    targets: new Set([3]),
    solutionMirrors: new Map(),
  };
}

/* ═══════════════════════════════════════════ */
/*                Component                    */
/* ═══════════════════════════════════════════ */
export default function Reflect() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const diff = useMemo(() => getDifficulty(), []);
  const puzzle = useMemo(
    () => generatePuzzle(seed, diff.numMirrors, diff.numTargets),
    [seed, diff.numMirrors, diff.numTargets],
  );

  const { width: screenWidth } = useWindowDimensions();
  const maxGrid = Math.min(screenWidth - 48, 360);
  const cellSize = Math.floor((maxGrid - (SIZE - 1) * GAP) / SIZE);
  const gridWidth = SIZE * cellSize + (SIZE - 1) * GAP;

  const [mirrors, setMirrors] = useState<Map<number, MirrorType>>(new Map());
  const [gameOver, setGameOver] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: SIZE * SIZE }, () => new Animated.Value(1)),
  ).current;

  // Beam path updates in real-time
  const beamPath = useMemo(
    () => new Set(traceBeam(puzzle.laserR, puzzle.laserC, puzzle.laserDir, mirrors)),
    [puzzle, mirrors],
  );

  const litTargets = useMemo(
    () => new Set([...puzzle.targets].filter((t) => beamPath.has(t))),
    [puzzle.targets, beamPath],
  );

  const mirrorsPlaced = mirrors.size;

  /* ─── tap cell: cycle mirror ─── */
  const handleTap = useCallback(
    (r: number, c: number) => {
      if (gameOver) return;
      const key = r * SIZE + c;
      // Can't place on laser or target cells
      if (key === puzzle.laserR * SIZE + puzzle.laserC) return;
      if (puzzle.targets.has(key)) return;

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

      const next = new Map(mirrors);
      const cur = next.get(key);
      if (cur === undefined) {
        next.set(key, '/');
      } else if (cur === '/') {
        next.set(key, '\\');
      } else {
        next.delete(key);
      }
      setMirrors(next);

      // Check win
      const newBeam = new Set(
        traceBeam(puzzle.laserR, puzzle.laserC, puzzle.laserDir, next),
      );
      if ([...puzzle.targets].every((t) => newBeam.has(t))) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        setEndTime(elapsed);
        setGameOver(true);
        recordGame('reflect', elapsed, diff.parSeconds).then((s) => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [mirrors, gameOver, puzzle, cellScales, startTime, diff.parSeconds],
  );

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('reflect');
    setStats(s);
    setShowStats(true);
  }, []);

  function fmtTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0
      ? `${m}:${String(sec).padStart(2, '0')}`
      : `${sec}s`;
  }

  function buildShareText(): string {
    const rows: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let row = '';
      for (let c = 0; c < SIZE; c++) {
        const key = r * SIZE + c;
        if (key === puzzle.laserR * SIZE + puzzle.laserC) row += '\uD83D\uDD26';
        else if (puzzle.targets.has(key) && litTargets.has(key))
          row += '\u2B50';
        else if (beamPath.has(key)) row += '\uD83D\uDFE7';
        else row += '\u2B1B';
      }
      rows.push(row);
    }
    const t = endTime ?? 0;
    const under = t <= diff.parSeconds;
    return [
      `Reflect Day #${puzzleDay} \uD83D\uDD26`,
      rows.join('\n'),
      `${mirrorsPlaced} mirrors | ${fmtTime(t)}`,
      under ? '\u2B50 Under par!' : `Par: ${fmtTime(diff.parSeconds)}`,
    ].join('\n');
  }

  /* ─── render ─── */
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reflect</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Place mirrors to bounce the beam through every star!
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Mirrors</Text>
          <Text style={styles.infoValue}>{mirrorsPlaced}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Targets</Text>
          <Text
            style={[
              styles.infoValue,
              litTargets.size === puzzle.targets.size && styles.infoValueGood,
            ]}
          >
            {litTargets.size}/{puzzle.targets.size}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Par</Text>
          <Text style={styles.infoPar}>{fmtTime(diff.parSeconds)}</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridWidth, height: gridWidth }]}>
        {Array.from({ length: SIZE }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: SIZE }).map((_, c) => {
              const key = r * SIZE + c;
              const isLaser =
                r === puzzle.laserR && c === puzzle.laserC;
              const isTarget = puzzle.targets.has(key);
              const isLit = litTargets.has(key);
              const onBeam = beamPath.has(key);
              const mirror = mirrors.get(key);

              let bg = '#1a1a1b';
              let border = '#2a2a2c';
              if (isLaser) {
                bg = '#ffffff';
                border = '#cccccc';
              } else if (isTarget) {
                bg = isLit ? '#2ecc71' : '#3a3a3c';
                border = isLit ? '#27ae60' : '#555';
              } else if (mirror) {
                bg = onBeam ? '#e8751a' : '#4a4a4c';
                border = onBeam ? '#d35400' : '#666';
              } else if (onBeam) {
                bg = '#e74c3c33';
                border = '#e74c3c55';
              }

              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[key] }] }}
                >
                  <Pressable
                    onPress={() => handleTap(r, c)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: bg,
                        borderColor: border,
                        borderWidth: isLaser || isTarget ? 2 : 1,
                      },
                    ]}
                  >
                    {isLaser && (
                      <Text style={styles.laserArrow}>
                        {DIR_ARROW[puzzle.laserDir]}
                      </Text>
                    )}
                    {isTarget && (
                      <Text
                        style={[
                          styles.targetStar,
                          isLit && styles.targetLit,
                        ]}
                      >
                        {'\u2605'}
                      </Text>
                    )}
                    {mirror && (
                      <Text style={[styles.mirrorText, onBeam && styles.mirrorOnBeam]}>
                        {mirror === '/' ? '\u2571' : '\u2572'}
                      </Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      <CelebrationBurst show={gameOver} />

      {gameOver && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {(endTime ?? 0) <= diff.parSeconds ? '\u2B50' : '\uD83D\uDD26'}
          </Text>
          <Text style={styles.winText}>
            {(endTime ?? 0) <= diff.parSeconds
              ? `Solved in ${fmtTime(endTime ?? 0)} \u2014 under par!`
              : `Solved in ${fmtTime(endTime ?? 0)}`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          A laser beam enters from the arrow. Tap empty cells to place
          mirrors (/ or \) that bounce the beam 90{'\u00B0'}. Tap again
          to rotate, again to remove.
          {'\n\n'}
          Guide the beam through every {'\u2605'} star to win!
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
    maxWidth: 320,
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
  infoPar: { color: '#818384', fontSize: 14, marginTop: 2 },
  grid: { gap: GAP },
  gridRow: { flexDirection: 'row', gap: GAP },
  cell: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laserArrow: { color: '#333', fontSize: 20, fontWeight: '900' },
  targetStar: { color: '#888', fontSize: 22 },
  targetLit: { color: '#f1c40f' },
  mirrorText: { color: '#aaa', fontSize: 24, fontWeight: '300' },
  mirrorOnBeam: { color: '#fff' },
  winMessage: { alignItems: 'center', marginTop: 20 },
  winEmoji: { fontSize: 48 },
  winText: {
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
