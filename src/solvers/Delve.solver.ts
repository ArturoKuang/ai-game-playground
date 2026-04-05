/**
 * Delve Solver — DFS / Backtracking
 *
 * Dungeon exploration with hidden rooms, keys, and locked doors.
 * Player explores a partially-hidden dungeon to find the exit.
 * Limited steps. Must backtrack from dead ends and prune paths
 * that need keys you don't have. DFS with pruning is optimal.
 *
 * Algorithm mapping:
 *   - Enter room (push onto DFS stack)
 *   - Backtrack to previous room (pop from DFS stack)
 *   - Skip locked door without key (pruning)
 */

/* ─── Types ─── */

export type Room = {
  id: number;
  exits: { roomId: number; keyRequired: number | null }[];
  hasKey: number | null;     // key found in this room (null if none)
  isExit: boolean;           // is this the dungeon exit?
  revealed: boolean;         // has player visited?
};

export type DelveState = {
  rooms: Room[];
  currentRoom: number;       // player's current room ID
  visitedRooms: Set<number>; // rooms the player has entered
  keys: Set<number>;         // keys the player has collected
  path: number[];            // path from start (stack for backtracking)
  steps: number;             // steps taken
  budget: number;            // max steps
  difficulty: number;
  won: boolean;
};

export type Move = number;   // room ID to move to (or -1 for backtrack)

export type Solution = {
  moves: Move[];
  steps: number;
  pushCount: number;        // moves to new rooms
  popCount: number;         // backtrack moves
  pruneCount: number;       // skipped locked doors
  algorithmAligned: number; // push + pop moves matching DFS
  totalMoves: number;
};

/* ─── PRNG ─── */

function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─── Difficulty Config ─── */

type DiffConfig = {
  roomCount: number;
  junctionCount: number;
  lockedDoors: number;
  budgetMultiplier: number;
};

function getDiffConfig(difficulty: number): DiffConfig {
  switch (difficulty) {
    case 1: return { roomCount: 5,  junctionCount: 2, lockedDoors: 0, budgetMultiplier: 4.0 };
    case 2: return { roomCount: 8,  junctionCount: 3, lockedDoors: 1, budgetMultiplier: 3.0 };
    case 3: return { roomCount: 12, junctionCount: 4, lockedDoors: 2, budgetMultiplier: 2.0 };
    case 4: return { roomCount: 16, junctionCount: 5, lockedDoors: 3, budgetMultiplier: 1.5 };
    case 5: return { roomCount: 20, junctionCount: 6, lockedDoors: 4, budgetMultiplier: 1.2 };
    default: return { roomCount: 5,  junctionCount: 2, lockedDoors: 0, budgetMultiplier: 4.0 };
  }
}

/* ─── Puzzle Generation ─── */

/**
 * Generates a tree-like dungeon graph:
 * 1. Build a random tree with the desired number of rooms
 * 2. Designate some internal nodes as "junctions" (2+ children)
 * 3. Place exit at a leaf reachable from start
 * 4. Place keys and locked doors s.t. the puzzle is solvable
 */
export function generatePuzzle(seed: number, difficulty: number): DelveState {
  const rng = makeRng(seed);
  const config = getDiffConfig(difficulty);
  const { roomCount, junctionCount, lockedDoors, budgetMultiplier } = config;

  for (let attempt = 0; attempt < 300; attempt++) {
    const rng2 = makeRng(seed * 1000 + attempt * 7);

    // Build tree using random parent assignment
    const parent: number[] = new Array(roomCount).fill(-1);
    const children: number[][] = Array.from({ length: roomCount }, () => []);

    // Room 0 is start (root)
    // Assign each subsequent room a random parent from existing rooms
    for (let i = 1; i < roomCount; i++) {
      const p = Math.floor(rng2() * i);
      parent[i] = p;
      children[p].push(i);
    }

    // Ensure we have enough junctions (nodes with 2+ children)
    // Redistribute children to create junctions
    let junctions = children.filter(c => c.length >= 2).length;
    if (junctions < junctionCount) {
      // Try to consolidate — move some children to create junctions
      for (let redistribute = 0; redistribute < roomCount * 3 && junctions < junctionCount; redistribute++) {
        // Find a node with exactly 1 child and move one of its subtree nodes under it
        const singleChildNodes = [];
        for (let n = 0; n < roomCount; n++) {
          if (children[n].length === 1) singleChildNodes.push(n);
        }
        if (singleChildNodes.length === 0) break;

        const target = singleChildNodes[Math.floor(rng2() * singleChildNodes.length)];
        // Find a leaf that's not a child of target
        const leaves: number[] = [];
        for (let n = 1; n < roomCount; n++) {
          if (children[n].length === 0 && parent[n] !== target && n !== target) {
            leaves.push(n);
          }
        }
        if (leaves.length === 0) continue;

        const leaf = leaves[Math.floor(rng2() * leaves.length)];
        const oldParent = parent[leaf];
        children[oldParent] = children[oldParent].filter(c => c !== leaf);
        parent[leaf] = target;
        children[target].push(leaf);

        junctions = children.filter(c => c.length >= 2).length;
      }
    }

    // Find leaves (potential exit locations)
    const leaves = [];
    for (let n = 0; n < roomCount; n++) {
      if (children[n].length === 0 && n !== 0) leaves.push(n);
    }
    if (leaves.length === 0) continue;

    // Pick the deepest leaf as exit
    const depths: number[] = new Array(roomCount).fill(0);
    const bfsQueue = [0];
    const bfsVisited = new Set([0]);
    while (bfsQueue.length > 0) {
      const node = bfsQueue.shift()!;
      for (const child of children[node]) {
        if (!bfsVisited.has(child)) {
          depths[child] = depths[node] + 1;
          bfsVisited.add(child);
          bfsQueue.push(child);
        }
      }
    }
    leaves.sort((a, b) => depths[b] - depths[a]);
    const exitRoom = leaves[0];

    // Build rooms with bidirectional connections (tree edges)
    const rooms: Room[] = Array.from({ length: roomCount }, (_, id) => ({
      id,
      exits: [],
      hasKey: null,
      isExit: id === exitRoom,
      revealed: id === 0, // start room revealed
    }));

    // Add tree edges as bidirectional exits
    for (let i = 1; i < roomCount; i++) {
      const p = parent[i];
      rooms[p].exits.push({ roomId: i, keyRequired: null });
      rooms[i].exits.push({ roomId: p, keyRequired: null });
    }

    // Find the path from start to exit (needed for key placement)
    const pathToExit = findPath(rooms, 0, exitRoom);
    if (!pathToExit) continue;

    // Place locked doors and keys
    if (lockedDoors > 0) {
      // Find edges NOT on the path to exit for locking
      // Also find dead-end branches for key placement
      const pathSet = new Set(pathToExit);
      const pathEdges = new Set<string>();
      for (let i = 0; i < pathToExit.length - 1; i++) {
        const a = pathToExit[i], b = pathToExit[i + 1];
        pathEdges.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
      }

      // Collect all edges
      type Edge = { from: number; to: number };
      const allEdges: Edge[] = [];
      for (const room of rooms) {
        for (const exit of room.exits) {
          if (room.id < exit.roomId) {
            allEdges.push({ from: room.id, to: exit.roomId });
          }
        }
      }

      // Edges on path to exit are candidates for locking
      // Key goes in a branch BEFORE the locked door on the path
      const pathEdgeList: Edge[] = [];
      for (let i = 0; i < pathToExit.length - 1; i++) {
        const a = pathToExit[i], b = pathToExit[i + 1];
        pathEdgeList.push({ from: Math.min(a, b), to: Math.max(a, b) });
      }

      // Shuffle path edges for random locking
      for (let i = pathEdgeList.length - 1; i > 0; i--) {
        const j = Math.floor(rng2() * (i + 1));
        [pathEdgeList[i], pathEdgeList[j]] = [pathEdgeList[j], pathEdgeList[i]];
      }

      // Place up to lockedDoors locks
      let keyId = 1;
      let placed = 0;
      for (const edge of pathEdgeList) {
        if (placed >= lockedDoors) break;

        // Find the position of this edge on the path
        const fromIdx = pathToExit.indexOf(edge.from);
        const toIdx = pathToExit.indexOf(edge.to);
        if (fromIdx < 0 || toIdx < 0) continue;
        const edgeIdx = Math.min(fromIdx, toIdx);
        if (edgeIdx < 1) continue; // don't lock first edge

        // Find a room in a dead-end branch before this edge for key placement
        const beforePathNodes = pathToExit.slice(0, edgeIdx + 1);
        const keyRoomCandidates: number[] = [];

        for (const node of beforePathNodes) {
          // Check children not on path
          for (const child of children[node]) {
            if (!pathSet.has(child)) {
              // Collect all nodes in this subtree
              const subtree: number[] = [];
              const stack = [child];
              while (stack.length > 0) {
                const n = stack.pop()!;
                subtree.push(n);
                for (const c of children[n]) stack.push(c);
              }
              keyRoomCandidates.push(...subtree);
            }
          }
        }

        // If no branch rooms, place key on the path before the edge
        let keyRoom: number;
        if (keyRoomCandidates.length > 0) {
          keyRoom = keyRoomCandidates[Math.floor(rng2() * keyRoomCandidates.length)];
        } else {
          // Place key in a room on the path before this edge
          if (edgeIdx > 0) {
            keyRoom = pathToExit[Math.floor(rng2() * edgeIdx)];
          } else {
            keyRoom = 0;
          }
        }

        // Don't place key if room already has a key
        if (rooms[keyRoom].hasKey !== null) continue;

        // Lock the edge
        const kId = keyId++;
        rooms[keyRoom].hasKey = kId;

        // Find the exit entries for this edge and set keyRequired
        const fromRoom = pathToExit[edgeIdx];
        const toRoom = pathToExit[edgeIdx + 1];
        for (const exit of rooms[fromRoom].exits) {
          if (exit.roomId === toRoom) exit.keyRequired = kId;
        }
        for (const exit of rooms[toRoom].exits) {
          if (exit.roomId === fromRoom) exit.keyRequired = kId;
        }

        placed++;
      }

      if (placed < lockedDoors) {
        // Try placing locks on non-path edges (red herrings)
        const nonPathEdges = allEdges.filter(e => !pathEdges.has(`${e.from}-${e.to}`));
        for (let i = nonPathEdges.length - 1; i > 0; i--) {
          const j = Math.floor(rng2() * (i + 1));
          [nonPathEdges[i], nonPathEdges[j]] = [nonPathEdges[j], nonPathEdges[i]];
        }
        for (const edge of nonPathEdges) {
          if (placed >= lockedDoors) break;
          const kId = keyId++;
          // Place key somewhere accessible
          const accessibleRooms: number[] = [];
          for (let r = 0; r < roomCount; r++) {
            if (rooms[r].hasKey === null && r !== exitRoom) accessibleRooms.push(r);
          }
          if (accessibleRooms.length === 0) break;
          const keyRoom = accessibleRooms[Math.floor(rng2() * accessibleRooms.length)];
          rooms[keyRoom].hasKey = kId;

          for (const exit of rooms[edge.from].exits) {
            if (exit.roomId === edge.to) exit.keyRequired = kId;
          }
          for (const exit of rooms[edge.to].exits) {
            if (exit.roomId === edge.from) exit.keyRequired = kId;
          }
          placed++;
        }
      }
    }

    // Verify solvability with BFS considering keys
    const optimalSteps = findOptimalSteps(rooms);
    if (optimalSteps === null) continue;

    const budget = Math.max(
      optimalSteps + 2,
      Math.ceil(optimalSteps * budgetMultiplier),
    );

    return {
      rooms,
      currentRoom: 0,
      visitedRooms: new Set([0]),
      keys: rooms[0].hasKey !== null ? new Set([rooms[0].hasKey]) : new Set<number>(),
      path: [0],
      steps: 0,
      budget,
      difficulty,
      won: rooms[0].isExit,
    };
  }

  // Fallback: simple 5-room dungeon
  return makeFallbackPuzzle(difficulty);
}

function makeFallbackPuzzle(difficulty: number): DelveState {
  const rooms: Room[] = [
    { id: 0, exits: [{ roomId: 1, keyRequired: null }, { roomId: 2, keyRequired: null }], hasKey: null, isExit: false, revealed: true },
    { id: 1, exits: [{ roomId: 0, keyRequired: null }, { roomId: 3, keyRequired: null }], hasKey: null, isExit: false, revealed: false },
    { id: 2, exits: [{ roomId: 0, keyRequired: null }], hasKey: null, isExit: false, revealed: false },
    { id: 3, exits: [{ roomId: 1, keyRequired: null }, { roomId: 4, keyRequired: null }], hasKey: null, isExit: false, revealed: false },
    { id: 4, exits: [{ roomId: 3, keyRequired: null }], hasKey: null, isExit: true, revealed: false },
  ];

  return {
    rooms,
    currentRoom: 0,
    visitedRooms: new Set([0]),
    keys: new Set<number>(),
    path: [0],
    steps: 0,
    budget: 12,
    difficulty,
    won: false,
  };
}

/** Find simple path between two rooms ignoring keys */
function findPath(rooms: Room[], start: number, end: number): number[] | null {
  const visited = new Set<number>();
  const parentMap = new Map<number, number>();
  const queue = [start];
  visited.add(start);

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === end) {
      const path = [end];
      let cur = end;
      while (cur !== start) {
        cur = parentMap.get(cur)!;
        path.unshift(cur);
      }
      return path;
    }
    for (const exit of rooms[node].exits) {
      if (!visited.has(exit.roomId)) {
        visited.add(exit.roomId);
        parentMap.set(exit.roomId, node);
        queue.push(exit.roomId);
      }
    }
  }
  return null;
}

/**
 * Find optimal step count using BFS over (room, keyset) state space.
 * This accounts for key collection and locked doors.
 */
function findOptimalSteps(rooms: Room[]): number | null {
  const startKeys = rooms[0].hasKey !== null ? (1 << rooms[0].hasKey) : 0;

  // BFS state: (roomId, keyBitmask)
  type BfsState = { room: number; keys: number; steps: number; path: number[] };
  const visited = new Map<string, number>();
  const queue: BfsState[] = [{ room: 0, keys: startKeys, steps: 0, path: [0] }];
  visited.set(`0:${startKeys}`, 0);

  while (queue.length > 0) {
    const { room, keys, steps, path } = queue.shift()!;

    if (rooms[room].isExit) {
      return steps;
    }

    for (const exit of rooms[room].exits) {
      // Check key requirement
      if (exit.keyRequired !== null && !(keys & (1 << exit.keyRequired))) {
        continue; // locked, don't have key
      }

      let nextKeys = keys;
      const nextRoom = rooms[exit.roomId];
      if (nextRoom.hasKey !== null) {
        nextKeys |= (1 << nextRoom.hasKey);
      }

      const stateKey = `${exit.roomId}:${nextKeys}`;
      const prev = visited.get(stateKey);
      if (prev !== undefined && prev <= steps + 1) continue;

      visited.set(stateKey, steps + 1);
      queue.push({
        room: exit.roomId,
        keys: nextKeys,
        steps: steps + 1,
        path: [...path, exit.roomId],
      });
    }
  }

  return null; // unsolvable
}

/* ─── Game Logic ─── */

export function legalMoves(state: DelveState): Move[] {
  if (state.won || state.steps >= state.budget) return [];

  const moves: Move[] = [];
  const room = state.rooms[state.currentRoom];

  for (const exit of room.exits) {
    // Check key requirement
    if (exit.keyRequired !== null && !state.keys.has(exit.keyRequired)) {
      continue; // locked, don't have key
    }
    moves.push(exit.roomId);
  }

  return moves;
}

export function applyMove(state: DelveState, move: Move): DelveState {
  const room = state.rooms[state.currentRoom];

  // Verify move is valid
  const exit = room.exits.find(e => e.roomId === move);
  if (!exit) return state;
  if (exit.keyRequired !== null && !state.keys.has(exit.keyRequired)) return state;

  const newVisited = new Set(state.visitedRooms);
  const newKeys = new Set(state.keys);
  const isBacktrack = state.path.length >= 2 && state.path[state.path.length - 2] === move;

  // Update path (stack)
  let newPath: number[];
  if (isBacktrack) {
    newPath = state.path.slice(0, -1); // pop
  } else {
    newPath = [...state.path, move]; // push
  }

  // Reveal and visit new room
  newVisited.add(move);
  const targetRoom = state.rooms[move];

  // Collect key if present
  if (targetRoom.hasKey !== null) {
    newKeys.add(targetRoom.hasKey);
  }

  // Clone rooms with updated revealed status
  const newRooms = state.rooms.map(r =>
    r.id === move ? { ...r, revealed: true } : r,
  );

  return {
    rooms: newRooms,
    currentRoom: move,
    visitedRooms: newVisited,
    keys: newKeys,
    path: newPath,
    steps: state.steps + 1,
    budget: state.budget,
    difficulty: state.difficulty,
    won: targetRoom.isExit,
  };
}

export function isGoal(state: DelveState): boolean {
  return state.won;
}

export function heuristic(state: DelveState): number {
  // Estimate: distance to exit considering keys
  const exitRoom = state.rooms.find(r => r.isExit);
  if (!exitRoom) return Infinity;
  if (state.won) return 0;

  // BFS from current room, counting only reachable rooms
  const visited = new Set<number>();
  const queue: { room: number; dist: number }[] = [{ room: state.currentRoom, dist: 0 }];
  visited.add(state.currentRoom);

  while (queue.length > 0) {
    const { room, dist } = queue.shift()!;
    if (room === exitRoom.id) return dist;

    for (const exit of state.rooms[room].exits) {
      if (visited.has(exit.roomId)) continue;
      if (exit.keyRequired !== null && !state.keys.has(exit.keyRequired)) continue;
      visited.add(exit.roomId);
      queue.push({ room: exit.roomId, dist: dist + 1 });
    }
  }

  // Exit not reachable with current keys — high penalty
  const budgetLeft = state.budget - state.steps;
  return budgetLeft + 5;
}

/* ─── Solvers ─── */

export function solve(
  puzzle: DelveState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  switch (skillLevel) {
    case 1: return solveRandom(puzzle);
    case 2: return solveGreedy(puzzle);
    case 3: return solveGreedyBacktrack(puzzle);
    case 4: return solveDFS(puzzle);
    case 5: return solveDFSPrune(puzzle);
  }
}

function cloneState(s: DelveState): DelveState {
  return {
    ...s,
    rooms: s.rooms.map(r => ({ ...r, exits: [...r.exits] })),
    visitedRooms: new Set(s.visitedRooms),
    keys: new Set(s.keys),
    path: [...s.path],
  };
}

function makeSolution(
  moves: Move[],
  pushCount: number,
  popCount: number,
  pruneCount: number,
): Solution {
  return {
    moves,
    steps: moves.length,
    pushCount,
    popCount,
    pruneCount,
    algorithmAligned: pushCount + popCount,
    totalMoves: moves.length,
  };
}

/**
 * Level 1: Random — pick a random legal move each step.
 * Wanders aimlessly, often runs out of budget.
 */
function solveRandom(puzzle: DelveState): Solution | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = makeRng(42 + attempt * 97);
    let state = cloneState(puzzle);
    const moveList: Move[] = [];
    let pushes = 0, pops = 0;

    for (let step = 0; step < state.budget; step++) {
      if (isGoal(state)) break;

      const legal = legalMoves(state);
      if (legal.length === 0) break;

      const move = legal[Math.floor(rng() * legal.length)];
      const isBack = state.path.length >= 2 && state.path[state.path.length - 2] === move;

      moveList.push(move);
      if (isBack) pops++;
      else pushes++;

      state = applyMove(state, move);
    }

    if (isGoal(state)) {
      return makeSolution(moveList, pushes, pops, 0);
    }
  }
  return null;
}

/**
 * Level 2: Greedy — always explore forward (unvisited rooms first).
 * Only backtracks when stuck (no unvisited exits). Never voluntarily backtracks.
 * Wastes steps by committing to long dead-end branches before turning back.
 */
function solveGreedy(puzzle: DelveState): Solution | null {
  let state = cloneState(puzzle);
  const moveList: Move[] = [];
  let pushes = 0, pops = 0;

  for (let step = 0; step < state.budget * 3; step++) {
    if (isGoal(state)) break;
    if (state.steps >= state.budget) break;

    const legal = legalMoves(state);
    if (legal.length === 0) break;

    // Prefer unvisited rooms (greedy forward)
    const unvisited = legal.filter(m => !state.visitedRooms.has(m));

    let move: Move;
    if (unvisited.length > 0) {
      move = unvisited[0];
      pushes++;
    } else {
      // Stuck — backtrack one step only when absolutely no forward moves
      if (state.path.length >= 2) {
        move = state.path[state.path.length - 2];
        pops++;
      } else {
        move = legal[0];
        pushes++;
      }
    }

    moveList.push(move);
    state = applyMove(state, move);
  }

  if (isGoal(state)) {
    return makeSolution(moveList, pushes, pops, 0);
  }
  return null;
}

/**
 * Level 3: Greedy with voluntary backtracking.
 * Goes forward when possible, but backtracks immediately when hitting
 * a dead end (no unvisited exits) or a locked door without the key.
 * Key improvement: continues backtracking until finding a junction with
 * unexplored branches, rather than stopping after one backtrack step.
 */
function solveGreedyBacktrack(puzzle: DelveState): Solution | null {
  let state = cloneState(puzzle);
  const moveList: Move[] = [];
  let pushes = 0, pops = 0;

  for (let step = 0; step < state.budget * 3; step++) {
    if (isGoal(state)) break;
    if (state.steps >= state.budget) break;

    const legal = legalMoves(state);
    if (legal.length === 0) break;

    // Check for unvisited, unlocked exits
    const unvisitedUnlocked = legal.filter(m => !state.visitedRooms.has(m));

    if (unvisitedUnlocked.length > 0) {
      // Go forward
      const move = unvisitedUnlocked[0];
      moveList.push(move);
      pushes++;
      state = applyMove(state, move);
    } else {
      // No unvisited exits — backtrack
      if (state.path.length >= 2) {
        const move = state.path[state.path.length - 2];
        moveList.push(move);
        pops++;
        state = applyMove(state, move);
      } else {
        // Try any legal move
        const move = legal[0];
        moveList.push(move);
        pushes++;
        state = applyMove(state, move);
      }
    }
  }

  if (isGoal(state)) {
    return makeSolution(moveList, pushes, pops, 0);
  }
  return null;
}

/**
 * Level 4: DFS — systematic exploration with immediate backtracking.
 * Uses explicit DFS: explore each branch fully before trying the next.
 * Backtracks as soon as a branch is exhausted.
 * Key-aware: when a new key is found, immediately backtracks to use it
 * on previously locked doors rather than continuing to explore the current branch.
 */
function solveDFS(puzzle: DelveState): Solution | null {
  const moveList: Move[] = [];
  let pushes = 0, pops = 0;

  let state = cloneState(puzzle);
  // Track which exits we've tried from each room, keyed by (roomId, keyBits)
  const triedExits = new Map<string, Set<number>>();
  // Track which rooms are dead ends (all branches explored)
  const deadEnds = new Set<number>();

  function triedKey(room: number, keys: Set<number>): string {
    return `${room}:${keySetToBits(keys)}`;
  }

  // Track keys before each move to detect key acquisition
  let prevKeyCount = state.keys.size;

  for (let step = 0; step < state.budget * 3; step++) {
    if (isGoal(state)) break;
    if (state.steps >= state.budget) break;

    // If we just acquired a new key, immediately backtrack to find
    // the door it unlocks rather than continuing to explore current branch
    if (state.keys.size > prevKeyCount) {
      // Check if there's an unexplored, now-unlockable door somewhere we've visited
      let hasNewOpportunity = false;
      for (const roomId of state.visitedRooms) {
        const room = state.rooms[roomId];
        for (const exit of room.exits) {
          if (exit.keyRequired !== null && state.keys.has(exit.keyRequired) && !state.visitedRooms.has(exit.roomId)) {
            hasNewOpportunity = true;
            break;
          }
        }
        if (hasNewOpportunity) break;
      }

      if (hasNewOpportunity) {
        // Backtrack toward the locked door
        if (state.path.length >= 2) {
          const move = state.path[state.path.length - 2];
          moveList.push(move);
          pops++;
          prevKeyCount = state.keys.size;
          state = applyMove(state, move);
          continue;
        }
      }
    }

    prevKeyCount = state.keys.size;

    const legal = legalMoves(state);
    if (legal.length === 0) break;

    const tk = triedKey(state.currentRoom, state.keys);
    if (!triedExits.has(tk)) {
      triedExits.set(tk, new Set());
    }
    const tried = triedExits.get(tk)!;

    // Find untried exits, preferring unvisited rooms, avoiding dead ends
    const untried = legal.filter(m => !tried.has(m));
    const unvisitedUntried = untried.filter(m => !state.visitedRooms.has(m));
    const nonDeadEnd = unvisitedUntried.filter(m => !deadEnds.has(m));

    let move: Move;
    if (nonDeadEnd.length > 0) {
      move = nonDeadEnd[0];
      tried.add(move);
      pushes++;
    } else if (unvisitedUntried.length > 0) {
      move = unvisitedUntried[0];
      tried.add(move);
      pushes++;
    } else if (untried.length > 0) {
      move = untried[0];
      tried.add(move);
      pushes++;
    } else {
      // All exits tried with current keys — backtrack
      if (state.path.length >= 2) {
        move = state.path[state.path.length - 2];
        pops++;
        // Mark current room as dead end if all exits exhausted
        deadEnds.add(state.currentRoom);
      } else {
        break;
      }
    }

    moveList.push(move);
    state = applyMove(state, move);
  }

  if (isGoal(state)) {
    return makeSolution(moveList, pushes, pops, 0);
  }
  return null;
}

/**
 * Level 5: DFS with pruning — optimal solver.
 * Uses BFS over (room, keyset) state space for shortest path.
 * Prunes locked doors when key is unavailable.
 */
function solveDFSPrune(puzzle: DelveState): Solution | null {
  const result = findOptimalSolution(puzzle);
  if (!result) return null;

  let pushes = 0, pops = 0, prunes = 0;
  let state = cloneState(puzzle);

  for (let i = 0; i < result.length; i++) {
    const move = result[i];
    const isBack = state.path.length >= 2 && state.path[state.path.length - 2] === move;
    if (isBack) pops++;
    else pushes++;
    state = applyMove(state, move);
  }

  // Count pruning opportunities (locked doors encountered but not used)
  const visitedRooms = new Set<number>();
  let simState = cloneState(puzzle);
  visitedRooms.add(simState.currentRoom);
  for (const move of result) {
    visitedRooms.add(move);
    simState = applyMove(simState, move);
  }
  for (const room of puzzle.rooms) {
    if (!visitedRooms.has(room.id)) continue;
    for (const exit of room.exits) {
      if (exit.keyRequired !== null && !visitedRooms.has(exit.roomId)) {
        prunes++;
      }
    }
  }

  return makeSolution(result, pushes, pops, prunes);
}

/**
 * BFS over (room, keyset) to find optimal move sequence.
 */
function findOptimalSolution(puzzle: DelveState): Move[] | null {
  const startKeys = new Set(puzzle.keys);
  const startKeyBits = keySetToBits(startKeys);

  type BfsState = {
    room: number;
    keys: number;
    steps: number;
    moves: Move[];
    path: number[];
  };

  const visited = new Map<string, number>();
  const queue: BfsState[] = [{
    room: puzzle.currentRoom,
    keys: startKeyBits,
    steps: 0,
    moves: [],
    path: [...puzzle.path],
  }];
  visited.set(`${puzzle.currentRoom}:${startKeyBits}`, 0);

  while (queue.length > 0) {
    const { room, keys, steps, moves, path } = queue.shift()!;

    if (puzzle.rooms[room].isExit) {
      return moves;
    }

    if (steps >= puzzle.budget) continue;

    for (const exit of puzzle.rooms[room].exits) {
      if (exit.keyRequired !== null && !(keys & (1 << exit.keyRequired))) {
        continue;
      }

      let nextKeys = keys;
      const nextRoom = puzzle.rooms[exit.roomId];
      if (nextRoom.hasKey !== null) {
        nextKeys |= (1 << nextRoom.hasKey);
      }

      const stateKey = `${exit.roomId}:${nextKeys}`;
      const prev = visited.get(stateKey);
      if (prev !== undefined && prev <= steps + 1) continue;
      visited.set(stateKey, steps + 1);

      // Compute new path (for backtrack detection)
      const isBack = path.length >= 2 && path[path.length - 2] === exit.roomId;
      const newPath = isBack ? path.slice(0, -1) : [...path, exit.roomId];

      queue.push({
        room: exit.roomId,
        keys: nextKeys,
        steps: steps + 1,
        moves: [...moves, exit.roomId],
        path: newPath,
      });
    }
  }

  return null;
}

function keySetToBits(keys: Set<number>): number {
  let bits = 0;
  for (const k of keys) {
    bits |= (1 << k);
  }
  return bits;
}
