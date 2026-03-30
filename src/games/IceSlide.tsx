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

/* ─── Slide: glide until hitting a wall or the edge ─── */
function slide(walls: Set<string>, from: Pos, dir: Dir): Pos {
  const { dr, dc } = DIR_DELTA[dir];
  let { r, c } = from;
  while (true) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID || walls.has(`${nr},${nc}`))
      break;
    r = nr;
    c = nc;
  }
  return { r, c };
}

/* ─── BFS shortest path ─── */
function bfs(walls: Set<string>, start: Pos, goal: Pos): Dir[] | null {
  const key = (p: Pos) => p.r * GRID + p.c;
  const visited = new Set<number>();
  visited.add(key(start));
  const queue: { pos: Pos; path: Dir[] }[] = [{ pos: start, path: [] }];

  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;
    for (const dir of ['up', 'down', 'left', 'right'] as Dir[]) {
      const next = slide(walls, pos, dir);
      if (next.r === pos.r && next.c === pos.c) continue;
      if (next.r === goal.r && next.c === goal.c) return [...path, dir];
      const k = key(next);
      if (!visited.has(k)) {
        visited.add(k);
        queue.push({ pos: next, path: [...path, dir] });
      }
    }
  }
  return null;
}

/* ─── Puzzle generation ─── */
function generatePuzzle(seed: number) {
  const rng = seededRandom(seed);
  const d = getDayDifficulty(); // 1 (Mon) to 5 (Fri)
  const minMoves = 2 + d;      // Mon=3, Fri=7
  const maxMoves = 4 + d * 2;  // Mon=6, Fri=14
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

    const solution = bfs(walls, start, goal);
    if (!solution || solution.length < minMoves || solution.length > maxMoves) continue;
    if (new Set(solution).size < 3) continue;

    return { walls, start, goal, par: solution.length };
  }

  // Fallback
  const walls = new Set(['1,3', '2,5', '3,1', '4,4', '5,2', '6,0']);
  return {
    walls,
    start: { r: 0, c: 0 } as Pos,
    goal: { r: 6, c: 6 } as Pos,
    par: 6,
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
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [animating, setAnimating] = useState(false);

  const animX = useRef(new Animated.Value(0)).current;
  const animY = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  const won = pos.r === puzzle.goal.r && pos.c === puzzle.goal.c;

  const trailSet = useMemo(
    () => new Set(posHistory.map((p) => `${p.r},${p.c}`)),
    [posHistory]
  );

  const handleMove = useCallback(
    (dir: Dir) => {
      if (won || animating) return;

      const next = slide(puzzle.walls, pos, dir);
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

        if (next.r === puzzle.goal.r && next.c === puzzle.goal.c) {
          recordGame('iceslide', newMoves, puzzle.par).then((s) => {
            setStats(s);
            setShowStats(true);
          });
        }
      });
    },
    [pos, won, animating, puzzle, step, animX, animY, shakeX, moves]
  );

  const handleUndo = useCallback(() => {
    if (moveHistory.length === 0 || won || animating) return;

    const prevPos = posHistory[posHistory.length - 2];
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
      setMoves((m) => m - 1);
      setMoveHistory((h) => h.slice(0, -1));
      setPosHistory((h) => h.slice(0, -1));
    });
  }, [moveHistory, posHistory, won, animating, puzzle, step, animX, animY]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('iceslide');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const under = moves <= puzzle.par;
    const arrows = moveHistory.map((d) => DIR_EMOJI[d]).join('');
    // Build mini path grid
    const wallSet = puzzle.walls;
    const pathSet = new Set(posHistory.map((p) => `${p.r},${p.c}`));
    const rows: string[] = [];
    for (let r = 0; r < GRID; r++) {
      let row = '';
      for (let c = 0; c < GRID; c++) {
        const key = `${r},${c}`;
        if (r === puzzle.goal.r && c === puzzle.goal.c) row += '\u2b50';
        else if (r === puzzle.start.r && c === puzzle.start.c) row += '\ud83d\udfe2';
        else if (wallSet.has(key)) row += '\u2b1b';
        else if (pathSet.has(key)) row += '\ud83d\udfe6';
        else row += '\u2b1c';
      }
      rows.push(row);
    }
    return `IceSlide Day #${puzzleDay} \ud83e\uddca\n${moves}/${puzzle.par} moves\n${arrows}\n${rows.join('\n')}\n${
      under ? '\u2b50 Under par!' : `Solved in ${moves} slides`
    }`;
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
        Slide the puck to the star. It glides until it hits a wall.
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
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridPixels, height: gridPixels }]}>
        {Array.from({ length: GRID }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: GRID }).map((_, c) => {
              const isWall = puzzle.walls.has(`${r},${c}`);
              const isGoal = r === puzzle.goal.r && c === puzzle.goal.c;
              const isTrail =
                trailSet.has(`${r},${c}`) && !(r === pos.r && c === pos.c);

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
                        : isGoal && won
                          ? '#1a4a2e'
                          : isGoal
                            ? '#1a2a3e'
                            : isTrail
                              ? '#1a2030'
                              : '#16161e',
                      borderColor: isWall
                        ? '#5a5a6c'
                        : isGoal
                          ? '#4a9a6a'
                          : '#22222e',
                    },
                  ]}
                >
                  {isGoal && (
                    <Text style={{ fontSize: cellSize * 0.5 }}>{'\u2b50'}</Text>
                  )}
                  {isTrail && !isGoal && (
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
            {moves <= puzzle.par
              ? `Under par! ${moves} moves`
              : `Solved in ${moves} moves (par: ${puzzle.par})`}
          </Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Use the arrows to slide the puck across the ice. It glides until it
          hits a wall or the edge of the board.{'\n\n'}
          Reach the {'\u2b50'} in as few moves as possible. Par: {puzzle.par}{' '}
          moves.
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
  moveCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  moveLabel: { color: '#818384', fontSize: 14 },
  moveCount: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  moveCountGood: { color: '#2ecc71' },
  moveCountOver: { color: '#e67e22' },
  movePar: { color: '#818384', fontSize: 14 },
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
    marginTop: 20,
    gap: 4,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  controlSpacer: {
    width: 56,
    height: 56,
  },
  arrowBtn: {
    width: 56,
    height: 56,
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
    width: 56,
    height: 56,
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
