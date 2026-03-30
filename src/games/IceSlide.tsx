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
import { getDailySeed, seededRandom, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';

/* ─── Constants ─── */
const GRID = 7;
const GAP = 2;

type Pos = { r: number; c: number };
type Dir = 'up' | 'down' | 'left' | 'right';

const DIR_DELTA: Record<Dir, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

const DIR_EMOJI: Record<Dir, string> = {
  up: '\u2b06\ufe0f',
  down: '\u2b07\ufe0f',
  left: '\u2b05\ufe0f',
  right: '\u27a1\ufe0f',
};

/* ─── Slide: glide until hitting a wall, edge, or uncollected gem ─── */
function slideStep(
  walls: Set<string>,
  uncollectedGems: Set<string>,
  from: Pos,
  dir: Dir
): { pos: Pos; hitGem: string | null } {
  const { dr, dc } = DIR_DELTA[dir];
  let { r, c } = from;
  while (true) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID || walls.has(`${nr},${nc}`))
      break;
    r = nr;
    c = nc;
    const gemKey = `${r},${c}`;
    if (uncollectedGems.has(gemKey)) {
      return { pos: { r, c }, hitGem: gemKey };
    }
  }
  return { pos: { r, c }, hitGem: null };
}

/* ─── BFS shortest path with gem collection state ─── */
function bfsWithGems(
  walls: Set<string>,
  gems: Pos[],
  start: Pos,
  goal: Pos
): Dir[] | null {
  const numGems = gems.length;
  const allCollected = (1 << numGems) - 1;

  const gemMap = new Map<string, number>();
  gems.forEach((g, i) => gemMap.set(`${g.r},${g.c}`, i));

  const maxMask = allCollected + 1;
  const stateKey = (pos: Pos, collected: number) =>
    (pos.r * GRID + pos.c) * maxMask + collected;

  const visited = new Set<number>();
  visited.add(stateKey(start, 0));
  const queue: { pos: Pos; collected: number; path: Dir[] }[] = [
    { pos: start, collected: 0, path: [] },
  ];

  while (queue.length > 0) {
    const { pos, collected, path } = queue.shift()!;

    for (const dir of ['up', 'down', 'left', 'right'] as Dir[]) {
      const uncollected = new Set<string>();
      gems.forEach((g, i) => {
        if (!(collected & (1 << i))) uncollected.add(`${g.r},${g.c}`);
      });

      const { pos: next, hitGem } = slideStep(walls, uncollected, pos, dir);
      if (next.r === pos.r && next.c === pos.c) continue;

      let newCollected = collected;
      if (hitGem !== null) {
        const idx = gemMap.get(hitGem);
        if (idx !== undefined) newCollected |= 1 << idx;
      }

      if (next.r === goal.r && next.c === goal.c && newCollected === allCollected) {
        return [...path, dir];
      }

      const sk = stateKey(next, newCollected);
      if (!visited.has(sk)) {
        visited.add(sk);
        queue.push({ pos: next, collected: newCollected, path: [...path, dir] });
      }
    }
  }

  return null;
}

/* ─── Puzzle generation ─── */
function generatePuzzle(seed: number) {
  const rng = seededRandom(seed);
  const d = getDayDifficulty(); // 1 (Mon) to 5 (Fri)
  const numGems = d <= 4 ? 2 : 3;
  const minMoves = 3 + d;      // Mon=4, Fri=8
  const maxMoves = 6 + d * 2;  // Mon=8, Fri=16
  const minWalls = 4 + d;      // Mon=5, Fri=9

  for (let attempt = 0; attempt < 500; attempt++) {
    const walls = new Set<string>();
    const numWalls = minWalls + Math.floor(rng() * 4);

    for (let i = 0; i < numWalls; i++) {
      walls.add(`${Math.floor(rng() * GRID)},${Math.floor(rng() * GRID)}`);
    }

    const empty: Pos[] = [];
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (!walls.has(`${r},${c}`)) empty.push({ r, c });

    if (empty.length < 15) continue;

    const start = empty[Math.floor(rng() * empty.length)];
    let goal: Pos;
    do {
      goal = empty[Math.floor(rng() * empty.length)];
    } while (goal.r === start.r && goal.c === start.c);

    // Place gems on empty cells (not start or goal)
    const gemCandidates = empty.filter(
      (p) =>
        !(p.r === start.r && p.c === start.c) &&
        !(p.r === goal.r && p.c === goal.c)
    );
    if (gemCandidates.length < numGems) continue;

    const gems: Pos[] = [];
    const usedGemCells = new Set<string>();
    for (let i = 0; i < numGems; i++) {
      let gem: Pos;
      let tries = 0;
      do {
        gem = gemCandidates[Math.floor(rng() * gemCandidates.length)];
        tries++;
      } while (usedGemCells.has(`${gem.r},${gem.c}`) && tries < 20);
      if (usedGemCells.has(`${gem.r},${gem.c}`)) break;
      gems.push(gem);
      usedGemCells.add(`${gem.r},${gem.c}`);
    }
    if (gems.length < numGems) continue;

    const solution = bfsWithGems(walls, gems, start, goal);
    if (!solution || solution.length < minMoves || solution.length > maxMoves) continue;
    if (new Set(solution).size < 3) continue;

    return { walls, start, goal, gems, par: solution.length };
  }

  // Fallback: simple symmetric puzzle with 1 gem
  const walls = new Set(['1,3', '2,5', '3,1', '4,4', '5,2', '6,0']);
  return {
    walls,
    start: { r: 0, c: 0 } as Pos,
    goal: { r: 6, c: 6 } as Pos,
    gems: [{ r: 3, c: 3 }] as Pos[],
    par: 8,
  };
}

/* ─── Component ─── */
export default function IceSlide() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const puzzle = useMemo(() => generatePuzzle(seed), [seed]);

  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 48, 380);
  const cellSize = Math.floor((maxWidth - (GRID - 1) * GAP) / GRID);
  const step = cellSize + GAP;
  const gridPixels = GRID * cellSize + (GRID - 1) * GAP;

  const [pos, setPos] = useState<Pos>(puzzle.start);
  const [moves, setMoves] = useState(0);
  const [moveHistory, setMoveHistory] = useState<Dir[]>([]);
  const [posHistory, setPosHistory] = useState<Pos[]>([puzzle.start]);
  const [collectedGems, setCollectedGems] = useState<Set<string>>(new Set());
  const [gemHistory, setGemHistory] = useState<(string | null)[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [animating, setAnimating] = useState(false);
  const [undos, setUndos] = useState(0);

  const animX = useRef(new Animated.Value(0)).current;
  const animY = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  const allGemsCollected = collectedGems.size === puzzle.gems.length;
  const won = pos.r === puzzle.goal.r && pos.c === puzzle.goal.c && allGemsCollected;

  const trailSet = useMemo(
    () => new Set(posHistory.map((p) => `${p.r},${p.c}`)),
    [posHistory]
  );

  const gemSet = useMemo(
    () => new Set(puzzle.gems.map((g) => `${g.r},${g.c}`)),
    [puzzle.gems]
  );

  // Projected landing positions for each direction (P1: pre-commitment info)
  const landingPreviews = useMemo(() => {
    if (won || animating) return new Map<string, Dir[]>();

    const uncollected = new Set<string>();
    puzzle.gems.forEach((g) => {
      const key = `${g.r},${g.c}`;
      if (!collectedGems.has(key)) uncollected.add(key);
    });

    const previews = new Map<string, Dir[]>();
    for (const dir of ['up', 'down', 'left', 'right'] as Dir[]) {
      const { pos: landing } = slideStep(puzzle.walls, uncollected, pos, dir);
      if (landing.r === pos.r && landing.c === pos.c) continue;
      const key = `${landing.r},${landing.c}`;
      const dirs = previews.get(key) || [];
      dirs.push(dir);
      previews.set(key, dirs);
    }
    return previews;
  }, [pos, won, animating, puzzle, collectedGems]);

  const handleMove = useCallback(
    (dir: Dir) => {
      if (won || animating) return;

      const uncollected = new Set<string>();
      puzzle.gems.forEach((g) => {
        const key = `${g.r},${g.c}`;
        if (!collectedGems.has(key)) uncollected.add(key);
      });

      const { pos: next, hitGem } = slideStep(puzzle.walls, uncollected, pos, dir);
      if (next.r === pos.r && next.c === pos.c) {
        Animated.sequence([
          Animated.timing(shakeX, {
            toValue: 6,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(shakeX, {
            toValue: -6,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(shakeX, {
            toValue: 4,
            duration: 30,
            useNativeDriver: true,
          }),
          Animated.timing(shakeX, {
            toValue: 0,
            duration: 30,
            useNativeDriver: true,
          }),
        ]).start();
        return;
      }

      setAnimating(true);
      const targetX = (next.c - puzzle.start.c) * step;
      const targetY = (next.r - puzzle.start.r) * step;
      const dist = Math.abs(next.r - pos.r) + Math.abs(next.c - pos.c);

      Animated.parallel([
        Animated.timing(animX, {
          toValue: targetX,
          duration: 80 + dist * 35,
          useNativeDriver: true,
        }),
        Animated.timing(animY, {
          toValue: targetY,
          duration: 80 + dist * 35,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setAnimating(false);
        const newMoves = moves + 1;
        setPos(next);
        setMoves(newMoves);
        setMoveHistory((h) => [...h, dir]);
        setPosHistory((h) => [...h, next]);
        setGemHistory((h) => [...h, hitGem]);

        const newCollected = new Set(collectedGems);
        if (hitGem !== null) {
          newCollected.add(hitGem);
        }
        setCollectedGems(newCollected);

        const nowAllCollected = newCollected.size === puzzle.gems.length;
        if (next.r === puzzle.goal.r && next.c === puzzle.goal.c && nowAllCollected) {
          recordGame('iceslide', newMoves, puzzle.par).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        }
      });
    },
    [pos, won, animating, puzzle, step, animX, animY, shakeX, moves, collectedGems]
  );

  const handleUndo = useCallback(() => {
    if (moveHistory.length === 0 || won || animating) return;

    const prevPos = posHistory[posHistory.length - 2];
    const lastGem = gemHistory[gemHistory.length - 1];

    setAnimating(true);

    Animated.parallel([
      Animated.timing(animX, {
        toValue: (prevPos.c - puzzle.start.c) * step,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(animY, {
        toValue: (prevPos.r - puzzle.start.r) * step,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAnimating(false);
      setPos(prevPos);
      setUndos((u) => u + 1);
      setMoveHistory((h) => h.slice(0, -1));
      setPosHistory((h) => h.slice(0, -1));
      setGemHistory((h) => h.slice(0, -1));

      if (lastGem !== null) {
        setCollectedGems((prev) => {
          const next = new Set(prev);
          next.delete(lastGem);
          return next;
        });
      }
    });
  }, [moveHistory, posHistory, gemHistory, won, animating, puzzle, step, animX, animY]);

  const handleRestart = useCallback(() => {
    if (won || animating) return;
    setPos(puzzle.start);
    setMoves(0);
    setMoveHistory([]);
    setPosHistory([puzzle.start]);
    setCollectedGems(new Set());
    setGemHistory([]);
    setUndos(0);
    animX.setValue(0);
    animY.setValue(0);
  }, [won, animating, puzzle, animX, animY]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('iceslide');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const under = moves <= puzzle.par;
    const arrows = moveHistory.map((d) => DIR_EMOJI[d]).join('');
    const wallSet = puzzle.walls;
    const pathSet = new Set(posHistory.map((p) => `${p.r},${p.c}`));
    const rows: string[] = [];
    for (let r = 0; r < GRID; r++) {
      let row = '';
      for (let c = 0; c < GRID; c++) {
        const key = `${r},${c}`;
        if (r === puzzle.goal.r && c === puzzle.goal.c) row += '\u2b50';
        else if (r === puzzle.start.r && c === puzzle.start.c) row += '\ud83d\udfe2';
        else if (gemSet.has(key)) row += '\ud83d\udc8e';
        else if (wallSet.has(key)) row += '\u2b1b';
        else if (pathSet.has(key)) row += '\ud83d\udfe6';
        else row += '\u2b1c';
      }
      rows.push(row);
    }
    const undoStr = undos > 0 ? ` (${undos} undo${undos > 1 ? 's' : ''})` : '';
    const gemStr = puzzle.gems.length > 0 ? ` \ud83d\udc8e${puzzle.gems.length}/${puzzle.gems.length}` : '';
    const result = moves < puzzle.par
      ? '\u2b50 Under par!'
      : moves === puzzle.par
        ? '\u2b50 Par!'
        : `Solved in ${moves} slides`;
    return `IceSlide Day #${puzzleDay} \ud83e\uddca\n${moves}/${puzzle.par} slides${undoStr}${gemStr}\n${arrows}\n${rows.join('\n')}\n${result}`;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>IceSlide</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Collect all gems, then reach the star. The puck stops on gems!
      </Text>

      <View style={styles.moveCounter}>
        <Text style={styles.moveLabel}>Moves</Text>
        <Text
          style={[
            styles.moveCount,
            won && moves <= puzzle.par && styles.moveCountGood,
            won && moves > puzzle.par && styles.moveCountOver,
          ]}
        >
          {moves}
        </Text>
        <Text style={styles.movePar}>Par: {puzzle.par}</Text>
        <Text style={[
          styles.gemCounter,
          allGemsCollected && styles.gemCounterDone,
        ]}>
          {'\ud83d\udc8e'} {collectedGems.size}/{puzzle.gems.length}
        </Text>
        {undos > 0 && (
          <Text style={styles.undoCount}>({undos} undo{undos > 1 ? 's' : ''})</Text>
        )}
        {moves > 0 && !won && (
          <Pressable onPress={handleRestart}>
            <Text style={styles.restartBtn}>{'\u21bb'}</Text>
          </Pressable>
        )}
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridPixels, height: gridPixels }]}>
        {Array.from({ length: GRID }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: GRID }).map((_, c) => {
              const key = `${r},${c}`;
              const isWall = puzzle.walls.has(key);
              const isGoal = r === puzzle.goal.r && c === puzzle.goal.c;
              const isGem = gemSet.has(key) && !collectedGems.has(key);
              const isCollectedGem = gemSet.has(key) && collectedGems.has(key);
              const isTrail =
                trailSet.has(key) && !(r === pos.r && c === pos.c);
              const isLanding = landingPreviews.has(key);
              const landingHitsGem = isLanding && isGem;

              return (
                <View
                  key={c}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: isWall
                        ? '#3a3a4c'
                        : isGem
                          ? '#2a1a3e'
                          : isGoal && won
                            ? '#1a4a2e'
                            : isGoal
                              ? '#1a2a3e'
                              : isLanding
                                ? '#0a1a2a'
                                : isTrail
                                  ? '#1a2030'
                                  : '#16161e',
                      borderColor: isWall
                        ? '#5a5a6c'
                        : isGem
                          ? '#9a4aff'
                          : isGoal
                            ? '#4a9a6a'
                            : isLanding
                              ? '#005a8a'
                              : '#22222e',
                    },
                  ]}
                >
                  {isGoal && (
                    <Text style={{ fontSize: cellSize * 0.5 }}>{'\u2b50'}</Text>
                  )}
                  {isGem && !landingHitsGem && (
                    <Text style={{ fontSize: cellSize * 0.45 }}>{'\ud83d\udc8e'}</Text>
                  )}
                  {landingHitsGem && (
                    <Text style={{ fontSize: cellSize * 0.45, opacity: 1 }}>{'\ud83d\udc8e'}</Text>
                  )}
                  {isLanding && !isGoal && !isGem && (
                    <View
                      style={[
                        styles.landingGhost,
                        {
                          width: cellSize * 0.5,
                          height: cellSize * 0.5,
                          borderRadius: cellSize * 0.25,
                        },
                      ]}
                    />
                  )}
                  {isCollectedGem && !isLanding && (
                    <View
                      style={[
                        styles.collectedGemDot,
                        {
                          width: cellSize * 0.2,
                          height: cellSize * 0.2,
                          borderRadius: cellSize * 0.1,
                        },
                      ]}
                    />
                  )}
                  {isTrail && !isGoal && !isGem && !isCollectedGem && !isLanding && (
                    <View
                      style={[
                        styles.trailDot,
                        {
                          width: cellSize * 0.15,
                          height: cellSize * 0.15,
                          borderRadius: cellSize * 0.075,
                        },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {/* Animated puck */}
        <Animated.View
          style={[
            styles.puck,
            {
              width: cellSize - 4,
              height: cellSize - 4,
              borderRadius: (cellSize - 4) / 2,
              left: puzzle.start.c * step + 2,
              top: puzzle.start.r * step + 2,
              transform: [
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { translateX: Animated.add(animX, shakeX) } as any,
                { translateY: animY } as any,
              ],
            },
          ]}
        />
      </View>

      {/* Direction controls */}
      {!won && (
        <View style={styles.controls}>
          <View style={styles.controlRow}>
            <View style={styles.controlSpacer} />
            <Pressable
              style={styles.arrowBtn}
              onPress={() => handleMove('up')}
            >
              <Text style={styles.arrowText}>{'\u2191'}</Text>
            </Pressable>
            <View style={styles.controlSpacer} />
          </View>
          <View style={styles.controlRow}>
            <Pressable
              style={styles.arrowBtn}
              onPress={() => handleMove('left')}
            >
              <Text style={styles.arrowText}>{'\u2190'}</Text>
            </Pressable>
            <Pressable style={styles.centerBtn} onPress={handleUndo}>
              <Text style={styles.undoIcon}>{'\u21a9'}</Text>
            </Pressable>
            <Pressable
              style={styles.arrowBtn}
              onPress={() => handleMove('right')}
            >
              <Text style={styles.arrowText}>{'\u2192'}</Text>
            </Pressable>
          </View>
          <View style={styles.controlRow}>
            <View style={styles.controlSpacer} />
            <Pressable
              style={styles.arrowBtn}
              onPress={() => handleMove('down')}
            >
              <Text style={styles.arrowText}>{'\u2193'}</Text>
            </Pressable>
            <View style={styles.controlSpacer} />
          </View>
        </View>
      )}

      <CelebrationBurst show={won} />

      {won && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>
            {moves <= puzzle.par ? '\u2b50' : '\ud83e\uddca'}
          </Text>
          <Text style={styles.winText}>
            {moves < puzzle.par
              ? `Under par! ${moves} moves`
              : moves === puzzle.par
                ? `Par! ${moves} moves`
                : `Solved in ${moves} moves (par: ${puzzle.par})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Slide the puck across the ice {'\u2014'} it glides until it hits a
          wall, the edge, or a {'\ud83d\udc8e'} gem.{'\n\n'}
          Collect all gems, then reach the {'\u2b50'}. Gems act as stopping
          points {'\u2014'} plan the order carefully! Undo costs a move.
          Par: {puzzle.par} slides.
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
    paddingVertical: 8,
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
    marginBottom: 6,
    textAlign: 'center',
    maxWidth: 300,
  },
  moveCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  moveLabel: { color: '#818384', fontSize: 14 },
  moveCount: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  moveCountGood: { color: '#2ecc71' },
  moveCountOver: { color: '#e67e22' },
  movePar: { color: '#818384', fontSize: 14 },
  gemCounter: { color: '#9a4aff', fontSize: 14, fontWeight: '600' },
  gemCounterDone: { color: '#2ecc71' },
  undoCount: { color: '#e67e22', fontSize: 12, fontWeight: '600' },
  restartBtn: { color: '#818384', fontSize: 18, marginLeft: 4 },
  grid: {
    position: 'relative',
    gap: GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
  },
  cell: {
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailDot: {
    backgroundColor: 'rgba(0, 180, 255, 0.3)',
  },
  landingGhost: {
    backgroundColor: 'rgba(0, 180, 255, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 180, 255, 0.35)',
  },
  collectedGemDot: {
    backgroundColor: 'rgba(154, 74, 255, 0.25)',
  },
  puck: {
    position: 'absolute',
    backgroundColor: '#00b4ff',
    borderWidth: 2,
    borderColor: '#66d4ff',
    shadowColor: '#00b4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  controls: {
    marginTop: 12,
    gap: 2,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  controlSpacer: {
    width: 50,
    height: 50,
  },
  arrowBtn: {
    width: 50,
    height: 50,
    backgroundColor: '#2a2a3c',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#3a3a4c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '700',
  },
  centerBtn: {
    width: 50,
    height: 50,
    backgroundColor: '#1a1a2c',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#3a3a4c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  undoIcon: {
    fontSize: 20,
    color: '#818384',
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
