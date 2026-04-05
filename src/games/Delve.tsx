import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Animated,
  Platform,
} from 'react-native';
import ShareButton from '../components/ShareButton';
import StatsModal from '../components/StatsModal';
import CelebrationBurst from '../components/CelebrationBurst';
import { getDailySeed, getPuzzleDay, getDayDifficulty } from '../utils/seed';
import { loadStats, recordGame, type Stats } from '../utils/stats';
import {
  generatePuzzle,
  applyMove,
  isGoal,
  legalMoves,
  type DelveState,
  type Move,
  type Room,
} from '../solvers/Delve.solver';

/* ---- Colors ---- */
const BG = '#121213';
const SURFACE = '#1a1a1c';
const FOG = '#2a2a2e';
const ROOM_BG = '#2c2c3e';
const ROOM_CURRENT = '#4a3f6b';
const ROOM_VISITED = '#28283a';
const ROOM_EXIT = 'rgba(46,204,113,0.3)';
const KEY_COLOR = '#f1c40f';
const LOCK_COLOR = '#e74c3c';
const EXIT_COLOR = '#2ecc71';
const PATH_COLOR = '#6c5ce7';
const MUTED = '#818384';
const TEXT = '#ffffff';
const DANGER_COLOR = '#e74c3c';

const KEY_COLORS = ['#f1c40f', '#e67e22', '#e74c3c', '#9b59b6', '#3498db', '#1abc9c'];

export default function Delve() {
  const seed = useMemo(() => getDailySeed(), []);
  const puzzleDay = useMemo(() => getPuzzleDay(), []);
  const difficulty = useMemo(() => getDayDifficulty(), []);
  const initialState = useMemo(
    () => generatePuzzle(seed, difficulty),
    [seed, difficulty],
  );

  const [state, setState] = useState<DelveState>(() => cloneState(initialState));
  const [history, setHistory] = useState<DelveState[]>(() => [cloneState(initialState)]);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [gameRecorded, setGameRecorded] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficulty);

  const currentPuzzle = useMemo(
    () => selectedDifficulty === difficulty ? initialState : generatePuzzle(seed, selectedDifficulty),
    [seed, selectedDifficulty, difficulty, initialState],
  );

  const solved = isGoal(state);
  const legal = useMemo(() => legalMoves(state), [state]);
  const budgetExhausted = !solved && state.steps >= state.budget;
  const { width: screenWidth } = useWindowDimensions();

  /* ---- Animations ---- */
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  /* ---- Move handler ---- */
  const doMove = useCallback(
    (move: Move) => {
      if (solved || budgetExhausted) return;
      if (!legal.includes(move)) {
        shake();
        return;
      }

      const next = applyMove(state, move);
      setState(next);
      setHistory(h => [...h, cloneState(next)]);

      if (isGoal(next) && !gameRecorded) {
        setGameRecorded(true);
        recordGame('delve', next.steps, next.budget).then(s => {
          setStats(s);
          setShowStats(true);
        });
      }
    },
    [state, solved, budgetExhausted, legal, gameRecorded, shake],
  );

  /* ---- Can backtrack? ---- */
  const canBacktrack = useMemo(() => {
    if (solved || budgetExhausted) return false;
    if (state.path.length < 2) return false;
    const prevRoom = state.path[state.path.length - 2];
    return legal.includes(prevRoom);
  }, [state, solved, budgetExhausted, legal]);

  const handleBacktrack = useCallback(() => {
    if (!canBacktrack) return;
    const prevRoom = state.path[state.path.length - 2];
    doMove(prevRoom);
  }, [canBacktrack, state, doMove]);

  /* ---- Undo / Reset ---- */
  const handleUndo = useCallback(() => {
    if (history.length <= 1 || solved) return;
    const prev = history[history.length - 2];
    setState(cloneState(prev));
    setHistory(h => h.slice(0, -1));
  }, [history, solved]);

  const handleReset = useCallback(() => {
    const init = cloneState(currentPuzzle);
    setState(init);
    setHistory([cloneState(init)]);
    setGameRecorded(false);
  }, [currentPuzzle]);

  const handleDifficultyChange = useCallback((d: number) => {
    setSelectedDifficulty(d);
    const p = d === difficulty ? initialState : generatePuzzle(seed, d);
    const init = cloneState(p);
    setState(init);
    setHistory([cloneState(init)]);
    setGameRecorded(false);
  }, [seed, difficulty, initialState]);

  const handleShowStats = useCallback(async () => {
    const s = await loadStats('delve');
    setStats(s);
    setShowStats(true);
  }, []);

  /* ---- Share text ---- */
  function buildShareText() {
    const efficiency = state.steps <= state.budget * 0.5 ? 'Explorer Master!'
      : state.steps <= state.budget * 0.8 ? 'Efficient!' : 'Escaped!';
    return [
      `Delve Day #${puzzleDay}`,
      `Escaped in ${state.steps}/${state.budget} steps`,
      `Keys: ${state.keys.size} | Rooms: ${state.visitedRooms.size}/${state.rooms.length}`,
      efficiency,
    ].join('\n');
  }

  /* ---- Compute dungeon map layout ---- */
  const mapSize = Math.min(screenWidth - 48, 400);

  // Build layout positions for rooms using tree layout
  const positions = useMemo(() => {
    return computeTreeLayout(state.rooms, mapSize);
  }, [state.rooms, mapSize]);

  // Current room info
  const currentRoom = state.rooms[state.currentRoom];

  // Adjacent rooms (exits from current room)
  const adjacentExits = useMemo(() => {
    return currentRoom.exits.map(exit => ({
      ...exit,
      room: state.rooms[exit.roomId],
      isLocked: exit.keyRequired !== null && !state.keys.has(exit.keyRequired),
      isVisited: state.visitedRooms.has(exit.roomId),
      isBacktrack: state.path.length >= 2 && state.path[state.path.length - 2] === exit.roomId,
    }));
  }, [currentRoom, state]);

  // Count locked doors visible from current room
  const lockedVisible = adjacentExits.filter(e => e.isLocked).length;

  return (
    <View style={styles.outerContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Delve</Text>
          <Text style={styles.dayBadge}>Day #{puzzleDay}</Text>
          <Pressable onPress={handleShowStats}>
            <Text style={styles.statsIcon}>{'\uD83D\uDCCA'}</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Explore the dungeon, find the exit
        </Text>

        {/* Difficulty selector */}
        <View style={styles.diffRow}>
          {[1, 2, 3, 4, 5].map(d => (
            <Pressable
              key={d}
              onPress={() => handleDifficultyChange(d)}
              style={[
                styles.diffBtn,
                d === selectedDifficulty && styles.diffBtnActive,
              ]}
            >
              <Text style={[
                styles.diffText,
                d === selectedDifficulty && styles.diffTextActive,
              ]}>
                {d}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Info bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Steps</Text>
            <Text style={[
              styles.infoVal,
              state.steps > state.budget * 0.8 && !solved && styles.infoDanger,
              solved && state.steps <= state.budget * 0.5 && styles.infoGood,
            ]}>
              {state.steps}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Budget</Text>
            <Text style={styles.infoPar}>{state.budget}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Keys</Text>
            <View style={styles.keyRow}>
              {state.keys.size > 0
                ? Array.from(state.keys).map(k => (
                    <View key={k} style={[styles.keyIcon, { backgroundColor: KEY_COLORS[(k - 1) % KEY_COLORS.length] }]}>
                      <Text style={styles.keyText}>{'\uD83D\uDD11'}</Text>
                    </View>
                  ))
                : <Text style={styles.infoPar}>0</Text>
              }
            </View>
          </View>
        </View>

        {/* Dungeon map */}
        <Animated.View
          style={[
            styles.mapContainer,
            { width: mapSize, height: mapSize, transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {/* Draw connections */}
          {state.rooms.map(room => {
            if (!room.revealed) return null;
            return room.exits.map((exit, ei) => {
              if (exit.roomId <= room.id) return null; // draw each edge once
              const targetRoom = state.rooms[exit.roomId];
              if (!targetRoom.revealed && !state.visitedRooms.has(room.id)) return null;

              const from = positions[room.id];
              const to = positions[exit.roomId];
              if (!from || !to) return null;

              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * 180 / Math.PI;

              const isOnPath = state.path.includes(room.id) && state.path.includes(exit.roomId) &&
                Math.abs(state.path.indexOf(room.id) - state.path.indexOf(exit.roomId)) === 1;
              const isLocked = exit.keyRequired !== null && !state.keys.has(exit.keyRequired);

              return (
                <View
                  key={`edge-${room.id}-${exit.roomId}-${ei}`}
                  style={[
                    styles.edge,
                    {
                      left: from.x,
                      top: from.y,
                      width: len,
                      transform: [{ rotate: `${angle}deg` }],
                      backgroundColor: isLocked ? LOCK_COLOR
                        : isOnPath ? PATH_COLOR
                        : '#444',
                      opacity: isLocked ? 0.6 : isOnPath ? 0.9 : 0.4,
                    },
                  ]}
                >
                  {isLocked && exit.keyRequired !== null && (
                    <View style={[
                      styles.lockBadge,
                      { backgroundColor: KEY_COLORS[(exit.keyRequired - 1) % KEY_COLORS.length] },
                    ]}>
                      <Text style={styles.lockText}>{'\uD83D\uDD12'}</Text>
                    </View>
                  )}
                </View>
              );
            });
          })}

          {/* Draw rooms */}
          {state.rooms.map(room => {
            const pos = positions[room.id];
            if (!pos) return null;

            const isRevealed = room.revealed || state.visitedRooms.has(room.id);
            const isCurrent = room.id === state.currentRoom;
            const isVisited = state.visitedRooms.has(room.id);
            const isExitRoom = room.isExit && isRevealed;
            const isOnPath = state.path.includes(room.id);

            // Show fog for unrevealed rooms only if adjacent to visited
            const isAdjacent = state.rooms.some(r =>
              r.revealed && r.exits.some(e => e.roomId === room.id),
            );
            if (!isRevealed && !isAdjacent) return null;

            let bg = FOG;
            let borderColor = '#333';
            let borderWidth = 1;

            if (isCurrent) {
              bg = ROOM_CURRENT;
              borderColor = PATH_COLOR;
              borderWidth = 3;
            } else if (isExitRoom) {
              bg = ROOM_EXIT;
              borderColor = EXIT_COLOR;
              borderWidth = 2;
            } else if (isRevealed && isOnPath) {
              bg = ROOM_BG;
              borderColor = PATH_COLOR;
              borderWidth = 2;
            } else if (isRevealed) {
              bg = ROOM_VISITED;
              borderColor = '#555';
              borderWidth = 1;
            }

            const nodeSize = isCurrent ? 44 : 36;

            return (
              <View
                key={`room-${room.id}`}
                style={[
                  styles.roomNode,
                  {
                    left: pos.x - nodeSize / 2,
                    top: pos.y - nodeSize / 2,
                    width: nodeSize,
                    height: nodeSize,
                    borderRadius: nodeSize / 2,
                    backgroundColor: bg,
                    borderColor,
                    borderWidth,
                  },
                ]}
              >
                {isRevealed ? (
                  <>
                    {isExitRoom && (
                      <Text style={styles.roomEmoji}>{'\uD83D\uDEAA'}</Text>
                    )}
                    {room.hasKey !== null && !state.keys.has(room.hasKey) && (
                      <Text style={styles.roomEmoji}>{'\uD83D\uDD11'}</Text>
                    )}
                    {isCurrent && !isExitRoom && room.hasKey === null && (
                      <Text style={styles.roomEmoji}>{'\uD83E\uDDD4'}</Text>
                    )}
                    {!isCurrent && !isExitRoom && (room.hasKey === null || state.keys.has(room.hasKey)) && (
                      <Text style={[styles.roomId, { fontSize: 10, color: MUTED }]}>{room.id}</Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.fogText}>?</Text>
                )}
              </View>
            );
          })}
        </Animated.View>

        {/* Exit buttons for current room */}
        {!solved && !budgetExhausted && (
          <View style={styles.exitSection}>
            <Text style={styles.exitLabel}>
              Room {state.currentRoom} — Choose a path
            </Text>
            <View style={styles.exitGrid}>
              {adjacentExits.map((exit, i) => {
                const isLegal = legal.includes(exit.roomId);
                const keyColor = exit.keyRequired
                  ? KEY_COLORS[(exit.keyRequired - 1) % KEY_COLORS.length]
                  : undefined;

                return (
                  <Pressable
                    key={i}
                    style={({ pressed }) => [
                      styles.exitBtn,
                      exit.isLocked && styles.exitBtnLocked,
                      exit.isBacktrack && styles.exitBtnBacktrack,
                      !exit.isVisited && !exit.isLocked && styles.exitBtnNew,
                      exit.isVisited && !exit.isBacktrack && !exit.isLocked && styles.exitBtnVisited,
                      pressed && isLegal && styles.exitBtnPressed,
                    ]}
                    onPress={() => {
                      if (exit.isLocked) {
                        shake();
                      } else {
                        doMove(exit.roomId);
                      }
                    }}
                    disabled={exit.isLocked}
                    {...(Platform.OS === 'web' ? { role: 'button' as any, tabIndex: 0 } : {})}
                  >
                    <Text style={[
                      styles.exitBtnText,
                      exit.isLocked && styles.exitBtnTextLocked,
                    ]}>
                      {exit.isLocked
                        ? `\uD83D\uDD12 Room ${exit.roomId}`
                        : exit.isBacktrack
                          ? `\u2190 Back to ${exit.roomId}`
                          : exit.isVisited
                            ? `Room ${exit.roomId}`
                            : `\u2192 Room ${exit.roomId}`}
                    </Text>
                    {exit.isLocked && keyColor && (
                      <View style={[styles.exitKeyReq, { backgroundColor: keyColor }]}>
                        <Text style={styles.exitKeyText}>{'\uD83D\uDD11'}</Text>
                      </View>
                    )}
                    {!exit.isVisited && !exit.isLocked && (
                      <Text style={styles.exitNewBadge}>NEW</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {canBacktrack && (
              <Pressable style={styles.backtrackBtn} onPress={handleBacktrack}>
                <Text style={styles.backtrackText}>
                  {'\u2190'} Backtrack
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Locked door hint */}
        {lockedVisible > 0 && !solved && (
          <View style={styles.hintBanner}>
            <Text style={styles.hintText}>
              {lockedVisible} locked {lockedVisible === 1 ? 'door' : 'doors'} here. Find the right key!
            </Text>
          </View>
        )}

        {/* Budget exhausted */}
        {budgetExhausted && (
          <View style={styles.stuckBanner}>
            <Text style={styles.stuckText}>
              Out of steps! Undo or reset.
            </Text>
          </View>
        )}

        <CelebrationBurst show={solved} />

        {solved && (
          <View style={styles.endMsg}>
            <Text style={styles.endEmoji}>
              {state.steps <= state.budget * 0.5
                ? '\uD83C\uDF1F'
                : state.steps <= state.budget * 0.8
                  ? '\u2B50'
                  : '\uD83D\uDEAA'}
            </Text>
            <Text style={styles.endText}>
              {state.steps <= state.budget * 0.5
                ? `Explorer Master! ${state.steps} steps`
                : state.steps <= state.budget * 0.8
                  ? `Well done! ${state.steps} steps`
                  : `Escaped in ${state.steps} steps`}
            </Text>
            <ShareButton text={buildShareText()} />
          </View>
        )}

        <View style={styles.howTo}>
          <Text style={styles.howToTitle}>How to play</Text>
          <Text style={styles.howToText}>
            Find the exit room within the step budget.
            {'\n\n'}
            Rooms reveal as you enter them. Tap a door to move to the next room.
            Some doors are locked -- find the matching key first!
            {'\n\n'}
            Backtrack from dead ends quickly to save steps.
            Don't waste steps exploring branches that need keys you don't have.
            {'\n\n'}
            The key insight: go deep, fail fast, backtrack, try next.
          </Text>
        </View>

        {!solved && state.steps > 0 && <View style={{ height: 72 }} />}

        {showStats && stats && (
          <StatsModal stats={stats} onClose={() => setShowStats(false)} />
        )}
      </ScrollView>

      {/* Fixed bottom bar */}
      {!solved && state.steps > 0 && (
        <View style={styles.fixedBottomBar}>
          {history.length > 1 && (
            <Pressable style={styles.undoBtn} onPress={handleUndo}>
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
          )}
          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/* ---- Helpers ---- */

function cloneState(s: DelveState): DelveState {
  return {
    ...s,
    rooms: s.rooms.map(r => ({ ...r, exits: [...r.exits] })),
    visitedRooms: new Set(s.visitedRooms),
    keys: new Set(s.keys),
    path: [...s.path],
  };
}

/** Compute tree layout positions for rooms using BFS levels */
function computeTreeLayout(rooms: Room[], size: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = new Array(rooms.length).fill({ x: 0, y: 0 });
  if (rooms.length === 0) return positions;

  // BFS to get tree levels
  const levels: number[][] = [];
  const visited = new Set<number>();
  const queue: { id: number; level: number }[] = [{ id: 0, level: 0 }];
  visited.add(0);

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    while (levels.length <= level) levels.push([]);
    levels[level].push(id);

    for (const exit of rooms[id].exits) {
      if (!visited.has(exit.roomId)) {
        visited.add(exit.roomId);
        queue.push({ id: exit.roomId, level: level + 1 });
      }
    }
  }

  // Add rooms not reachable from 0
  for (let i = 0; i < rooms.length; i++) {
    if (!visited.has(i)) {
      const lastLevel = levels.length - 1;
      levels[lastLevel].push(i);
    }
  }

  const padding = 30;
  const usable = size - 2 * padding;
  const levelHeight = levels.length > 1 ? usable / (levels.length - 1) : 0;

  for (let lvl = 0; lvl < levels.length; lvl++) {
    const nodesAtLevel = levels[lvl];
    const levelWidth = nodesAtLevel.length > 1 ? usable / (nodesAtLevel.length - 1) : 0;

    for (let i = 0; i < nodesAtLevel.length; i++) {
      const id = nodesAtLevel[i];
      positions[id] = {
        x: padding + (nodesAtLevel.length > 1 ? i * levelWidth : usable / 2),
        y: padding + lvl * levelHeight,
      };
    }
  }

  return positions;
}

/* ---- Styles ---- */

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: BG },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: BG,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: 2,
  },
  dayBadge: { color: '#6aaa64', fontSize: 13, fontWeight: '600' },
  statsIcon: { fontSize: 24 },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
    marginBottom: 10,
    textAlign: 'center',
    maxWidth: 300,
  },
  diffRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  diffBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffBtnActive: {
    backgroundColor: 'rgba(108,92,231,0.15)',
    borderColor: PATH_COLOR,
  },
  diffText: { color: MUTED, fontSize: 14, fontWeight: '700' },
  diffTextActive: { color: PATH_COLOR },
  infoBar: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  infoItem: { alignItems: 'center' },
  infoLabel: { color: MUTED, fontSize: 11, marginBottom: 2 },
  infoVal: { color: TEXT, fontSize: 22, fontWeight: '800' },
  infoGood: { color: EXIT_COLOR },
  infoDanger: { color: DANGER_COLOR },
  infoPar: { color: MUTED, fontSize: 22, fontWeight: '800' },
  keyRow: { flexDirection: 'row', gap: 4 },
  keyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 14 },
  mapContainer: {
    backgroundColor: '#0a0a0c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 12,
  },
  edge: {
    position: 'absolute',
    height: 3,
    transformOrigin: 'left center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadge: {
    position: 'absolute',
    left: '40%',
    top: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: { fontSize: 8 },
  roomNode: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  roomEmoji: { fontSize: 18 },
  roomId: { fontSize: 10, color: MUTED },
  fogText: { fontSize: 14, color: '#555', fontWeight: '700' },
  exitSection: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    marginBottom: 12,
  },
  exitLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  exitGrid: {
    width: '100%',
    gap: 8,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: SURFACE,
    gap: 8,
  },
  exitBtnNew: {
    backgroundColor: 'rgba(108,92,231,0.15)',
    borderColor: PATH_COLOR,
  },
  exitBtnVisited: {
    backgroundColor: SURFACE,
    borderColor: '#555',
  },
  exitBtnLocked: {
    backgroundColor: 'rgba(231,76,60,0.1)',
    borderColor: LOCK_COLOR,
    opacity: 0.6,
  },
  exitBtnBacktrack: {
    backgroundColor: 'rgba(108,92,231,0.08)',
    borderColor: '#555',
  },
  exitBtnPressed: { opacity: 0.7 },
  exitBtnText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '600',
  },
  exitBtnTextLocked: { color: LOCK_COLOR },
  exitKeyReq: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitKeyText: { fontSize: 10 },
  exitNewBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: PATH_COLOR,
    letterSpacing: 1,
  },
  backtrackBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(108,92,231,0.12)',
    borderWidth: 1,
    borderColor: PATH_COLOR,
  },
  backtrackText: { color: PATH_COLOR, fontWeight: '700', fontSize: 14 },
  hintBanner: {
    marginTop: 4,
    backgroundColor: 'rgba(231,76,60,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.3)',
  },
  hintText: { color: LOCK_COLOR, fontSize: 12, fontWeight: '600' },
  stuckBanner: {
    marginTop: 10,
    backgroundColor: '#4a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  stuckText: { color: DANGER_COLOR, fontSize: 13, fontWeight: '600' },
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  undoBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  undoText: { color: TEXT, fontWeight: '600', fontSize: 14 },
  resetBtn: {
    backgroundColor: '#4a1a1a',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetText: { color: DANGER_COLOR, fontWeight: '600', fontSize: 14 },
  endMsg: { alignItems: 'center', marginTop: 20 },
  endEmoji: { fontSize: 48 },
  endText: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  howTo: { marginTop: 28, paddingHorizontal: 12, maxWidth: 360 },
  howToTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  howToText: { color: MUTED, fontSize: 13, lineHeight: 20 },
});
