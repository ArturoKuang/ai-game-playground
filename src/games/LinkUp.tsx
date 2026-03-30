import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
const GRID = 6;
const NUMS = 4; // 1-4
const GAP = 3;

type Pos = { r: number; c: number };

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];

function nextNum(n: number): number {
  return (n % NUMS) + 1;
}

function getNeighbors(p: Pos): Pos[] {
  return [
    { r: p.r - 1, c: p.c },
    { r: p.r + 1, c: p.c },
    { r: p.r, c: p.c - 1 },
    { r: p.r, c: p.c + 1 },
  ].filter((n) => n.r >= 0 && n.r < GRID && n.c >= 0 && n.c < GRID);
}

/* ─── Find longest chain via DFS ─── */
function findLongestChain(grid: number[][]): number {
  let best = 0;
  const visited = Array.from({ length: GRID }, () => Array(GRID).fill(false));
  let iterations = 0;
  const MAX_ITER = 200000;

  function dfs(pos: Pos, depth: number) {
    if (depth > best) best = depth;
    if (iterations > MAX_ITER || depth >= 24) return;

    const need = nextNum(grid[pos.r][pos.c]);
    for (const n of getNeighbors(pos)) {
      if (!visited[n.r][n.c] && grid[n.r][n.c] === need) {
        iterations++;
        visited[n.r][n.c] = true;
        dfs(n, depth + 1);
        visited[n.r][n.c] = false;
      }
    }
  }

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (iterations > MAX_ITER) break;
      visited[r][c] = true;
      dfs({ r, c }, 1);
      visited[r][c] = false;
    }
  }

  return best;
}

/* ─── Puzzle generation ─── */
function generatePuzzle(seed: number) {
  const rng = seededRandom(seed);
  const d = getDayDifficulty();
  const minChainLen = 5 + d * 2; // Mon=7, Fri=15

  for (let attempt = 0; attempt < 200; attempt++) {
    const grid = Array.from({ length: GRID }, () => Array(GRID).fill(0));

    // Plant a self-avoiding walk with correct number sequence
    const startR = Math.floor(rng() * GRID);
    const startC = Math.floor(rng() * GRID);
    const chain: Pos[] = [{ r: startR, c: startC }];
    const used = new Set<string>([`${startR},${startC}`]);

    let num = Math.floor(rng() * NUMS) + 1;
    grid[startR][startC] = num;

    const targetLen = minChainLen + 3;
    for (let i = 1; i < targetLen; i++) {
      const last = chain[chain.length - 1];
      const need = nextNum(num);
      const valid = getNeighbors(last).filter(
        (n) => !used.has(`${n.r},${n.c}`)
      );
      if (valid.length === 0) break;

      const next = valid[Math.floor(rng() * valid.length)];
      grid[next.r][next.c] = need;
      chain.push(next);
      used.add(`${next.r},${next.c}`);
      num = need;
    }

    if (chain.length < minChainLen) continue;

    // Fill remaining cells randomly
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (grid[r][c] === 0) {
          grid[r][c] = Math.floor(rng() * NUMS) + 1;
        }
      }
    }

    // Find the actual longest chain for par calibration
    const longest = findLongestChain(grid);
    if (longest < minChainLen) continue;

    const par = Math.max(minChainLen, Math.floor(longest * 0.65));

    return { grid, par, optimalLen: longest };
  }

  // Fallback
  const grid = Array.from({ length: GRID }, (_, r) =>
    Array.from({ length: GRID }, (_, c) => ((r + c) % NUMS) + 1)
  );
  return { grid, par: 7, optimalLen: 10 };
}

/* ─── Component ─── */
export default function LinkUp() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const puzzle = useMemo(() => generatePuzzle(seed), [seed]);

  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = Math.min(screenWidth - 48, 380);
  const cellSize = Math.floor((maxWidth - (GRID - 1) * GAP) / GRID);
  const gridPixels = GRID * cellSize + (GRID - 1) * GAP;

  const [chain, setChain] = useState<Pos[]>([]);
  const [done, setDone] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const cellScales = useRef(
    Array.from({ length: GRID * GRID }, () => new Animated.Value(1))
  ).current;

  const chainSet = useMemo(
    () => new Set(chain.map((p) => `${p.r},${p.c}`)),
    [chain]
  );

  const won = done && chain.length >= puzzle.par;
  const score = chain.length * chain.length;

  const validNext = useMemo(() => {
    if (done || chain.length === 0) return new Set<string>();
    const last = chain[chain.length - 1];
    const need = nextNum(puzzle.grid[last.r][last.c]);
    const valid = new Set<string>();
    for (const n of getNeighbors(last)) {
      if (!chainSet.has(`${n.r},${n.c}`) && puzzle.grid[n.r][n.c] === need) {
        valid.add(`${n.r},${n.c}`);
      }
    }
    return valid;
  }, [chain, chainSet, done, puzzle]);

  const handleTap = useCallback(
    (r: number, c: number) => {
      if (done) return;

      const key = `${r},${c}`;
      const idx = r * GRID + c;

      // Undo: tap last cell to remove it
      if (chain.length > 0) {
        const last = chain[chain.length - 1];
        if (last.r === r && last.c === c) {
          Animated.sequence([
            Animated.timing(cellScales[idx], {
              toValue: 0.85,
              duration: 60,
              useNativeDriver: true,
            }),
            Animated.spring(cellScales[idx], {
              toValue: 1,
              friction: 3,
              tension: 200,
              useNativeDriver: true,
            }),
          ]).start();
          setChain((prev) => prev.slice(0, -1));
          return;
        }
      }

      // Start chain: any cell
      if (chain.length === 0) {
        Animated.sequence([
          Animated.timing(cellScales[idx], {
            toValue: 1.15,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.spring(cellScales[idx], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();
        setChain([{ r, c }]);
        return;
      }

      // Extend chain
      if (validNext.has(key)) {
        Animated.sequence([
          Animated.timing(cellScales[idx], {
            toValue: 1.15,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.spring(cellScales[idx], {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();
        setChain((prev) => [...prev, { r, c }]);
        return;
      }

      // Invalid tap
      Animated.sequence([
        Animated.timing(cellScales[idx], {
          toValue: 0.9,
          duration: 40,
          useNativeDriver: true,
        }),
        Animated.timing(cellScales[idx], {
          toValue: 1.05,
          duration: 40,
          useNativeDriver: true,
        }),
        Animated.spring(cellScales[idx], {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [chain, done, validNext, cellScales]
  );

  const handleDone = useCallback(() => {
    if (chain.length === 0 || done) return;
    setDone(true);
    recordGame('linkup', chain.length, puzzle.par, true).then((s) => {
      setStats(s);
      setShowStats(true);
    });
  }, [chain, done, puzzle]);

  // Auto-finish when no valid moves
  useEffect(() => {
    if (chain.length > 0 && validNext.size === 0 && !done) {
      handleDone();
    }
  }, [chain, validNext, done, handleDone]);

  const handleRestart = useCallback(() => {
    if (done) return;
    setChain([]);
  }, [done]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('linkup');
    setStats(s);
    setShowStats(true);
  }, []);

  function buildShareText(): string {
    const pathSet = new Set(chain.map((p) => `${p.r},${p.c}`));
    const numEmoji = ['', '\ud83d\udd34', '\ud83d\udd35', '\ud83d\udfe2', '\ud83d\udfe0'];
    const rows: string[] = [];
    for (let r = 0; r < GRID; r++) {
      let row = '';
      for (let c = 0; c < GRID; c++) {
        if (pathSet.has(`${r},${c}`)) {
          row += numEmoji[puzzle.grid[r][c]];
        } else {
          row += '\u2b1c';
        }
      }
      rows.push(row);
    }
    const beatPar = chain.length >= puzzle.par;
    return `LinkUp Day #${puzzleDay} \ud83d\udd17\nChain: ${chain.length} (par ${puzzle.par})\nScore: ${score}\n${rows.join('\n')}\n${
      beatPar ? '\u2b50 Beat par!' : `Chain of ${chain.length}`
    }`;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LinkUp</Text>
        <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
        <Pressable onPress={handleShowStats}>
          <Text style={styles.statsIcon}>{'\ud83d\udcca'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        Build the longest chain: tap adjacent cells in sequence 1{'\u2192'}2{'\u2192'}3{'\u2192'}4{'\u2192'}1...
      </Text>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>Chain</Text>
        <Text
          style={[
            styles.scoreValue,
            done && won && styles.scoreGood,
            done && !won && styles.scoreOver,
          ]}
        >
          {chain.length}
        </Text>
        <Text style={styles.scorePar}>Par: {puzzle.par}</Text>
        {chain.length > 0 && !done && (
          <Pressable onPress={handleRestart}>
            <Text style={styles.restartBtn}>{'\u21bb'}</Text>
          </Pressable>
        )}
      </View>

      {/* Next number hint */}
      {chain.length > 0 && !done && (
        <Text style={styles.nextHint}>
          Next: {nextNum(puzzle.grid[chain[chain.length - 1].r][chain[chain.length - 1].c])}
        </Text>
      )}

      {/* Grid */}
      <View style={[styles.grid, { width: gridPixels, height: gridPixels }]}>
        {Array.from({ length: GRID }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: GRID }).map((_, c) => {
              const key = `${r},${c}`;
              const num = puzzle.grid[r][c];
              const inChain = chainSet.has(key);
              const isValid = validNext.has(key);
              const isLast =
                chain.length > 0 &&
                chain[chain.length - 1].r === r &&
                chain[chain.length - 1].c === c;
              const idx = r * GRID + c;

              return (
                <Animated.View
                  key={c}
                  style={{ transform: [{ scale: cellScales[idx] }] }}
                >
                  <Pressable
                    onPress={() => handleTap(r, c)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: inChain
                          ? COLORS[num - 1]
                          : '#1e1e2e',
                        borderColor: isLast
                          ? '#ffffff'
                          : inChain
                            ? COLORS[num - 1]
                            : '#2a2a3c',
                        borderWidth: isLast ? 2.5 : 1.5,
                        opacity: done && !inChain ? 0.35 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellNum,
                        {
                          color: inChain ? '#ffffff' : COLORS[num - 1],
                          fontSize: cellSize * 0.42,
                        },
                      ]}
                    >
                      {num}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Finish button */}
      {chain.length > 0 && !done && validNext.size > 0 && (
        <Pressable style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Finish Chain</Text>
        </Pressable>
      )}

      <CelebrationBurst show={won} />

      {done && (
        <View style={styles.winMessage}>
          <Text style={styles.winEmoji}>{won ? '\u2b50' : '\ud83d\udd17'}</Text>
          <Text style={styles.winText}>
            {won
              ? `Beat par! Chain of ${chain.length}`
              : `Chain of ${chain.length} (par: ${puzzle.par})`}
          </Text>
          <Text style={styles.winScore}>Score: {score} {'\u00b7'} Best possible: {puzzle.optimalLen}</Text>
          <ShareButton text={buildShareText()} />
        </View>
      )}

      <View style={styles.howTo}>
        <Text style={styles.howToTitle}>How to play</Text>
        <Text style={styles.howToText}>
          Tap any cell to start. Then tap adjacent cells following the number
          sequence: 1{'\u2192'}2{'\u2192'}3{'\u2192'}4{'\u2192'}1{'\u2192'}2...
          {'\n\n'}
          Highlighted cells show valid next moves. Tap the last cell to undo.
          Build the longest chain to beat par!
          {'\n\n'}
          Score = chain length{'\u00b2'}. Par: {puzzle.par} cells.
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
    paddingVertical: 12,
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
    marginBottom: 8,
    textAlign: 'center',
    maxWidth: 320,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  scoreLabel: { color: '#818384', fontSize: 14 },
  scoreValue: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  scoreGood: { color: '#2ecc71' },
  scoreOver: { color: '#e67e22' },
  scorePar: { color: '#818384', fontSize: 14 },
  restartBtn: { color: '#818384', fontSize: 18, marginLeft: 4 },
  nextHint: {
    color: '#818384',
    fontSize: 13,
    marginBottom: 8,
  },
  grid: {
    gap: GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
  },
  cell: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellNum: {
    fontWeight: '900',
  },
  doneBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#2a3a5c',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#4a7aff',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  winMessage: {
    alignItems: 'center',
    marginTop: 16,
  },
  winEmoji: { fontSize: 48 },
  winText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  winScore: {
    color: '#818384',
    fontSize: 14,
    marginTop: 4,
  },
  howTo: {
    marginTop: 24,
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
