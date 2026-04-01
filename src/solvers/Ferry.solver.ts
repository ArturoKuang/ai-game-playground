/**
 * Ferry Solver — Token permutation on a constrained graph
 *
 * Swap colored tokens along edges of a graph to get every token
 * to its matching colored node. Each swap exchanges the two tokens
 * on an edge's endpoints.
 *
 * Graph topology is key: bottleneck nodes (degree-2) force routing
 * conflicts that create counterintuitive moves.
 */

/* ─── Types ─── */

export type FerryNode = {
  id: number;
  x: number;  // layout x (0-1 normalized)
  y: number;  // layout y (0-1 normalized)
};

export type FerryEdge = [number, number]; // indices into nodes array

export type FerryGraph = {
  nodes: FerryNode[];
  edges: FerryEdge[];
  adjacency: number[][]; // adjacency[i] = list of neighbor node indices
};

export type FerryState = {
  tokens: number[]; // tokens[i] = color of token at node i; goal: tokens[i] === i
  graph: FerryGraph;
};

export type Move = [number, number]; // edge to swap: [nodeA, nodeB]

export type Solution = {
  moves: Move[];
  steps: number;
};

/* ─── Graph Generation ─── */

function makeRng(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a graph with specified node count and guaranteed bottleneck nodes.
 *
 * Strategy: Build 3+ small clusters (2-4 nodes each), linked in a chain
 * through single bottleneck nodes. Each bottleneck has degree exactly 2,
 * connecting two adjacent clusters. Within clusters, nodes form a cycle
 * or complete graph. This forces multiple tokens to route through the
 * same bottleneck, creating scheduling conflicts.
 *
 * Key insight: the clusters must be SMALL and the bottlenecks must be the
 * ONLY path between regions. Tokens from cluster A that need to reach
 * cluster C must pass through the bottleneck between A-B and then B-C.
 */
function generateGraph(
  rng: () => number,
  nodeCount: number,
  bottleneckCount: number,
): FerryGraph {
  const nodes: FerryNode[] = [];
  const edgeSet = new Set<string>();
  const edges: FerryEdge[] = [];

  function addEdge(a: number, b: number) {
    if (a === b) return;
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push([Math.min(a, b), Math.max(a, b)]);
  }

  // Determine number of clusters and bottlenecks
  // At least 2 clusters, bottlenecks between them
  const bnCount = Math.max(1, Math.min(bottleneckCount, 3));
  const numClusters = bnCount + 1;
  const clusterNodeCount = nodeCount - bnCount;

  // Distribute nodes across clusters (at least 1 per cluster, prefer 2+)
  const clusterSizes: number[] = Array(numClusters).fill(0);
  let remaining = clusterNodeCount;
  // First pass: give each cluster at least 1 node
  for (let i = 0; i < numClusters && remaining > 0; i++) {
    clusterSizes[i] = 1;
    remaining--;
  }
  // Second pass: distribute remaining evenly
  for (let i = 0; remaining > 0; i = (i + 1) % numClusters) {
    clusterSizes[i]++;
    remaining--;
  }

  // Layout and build clusters
  type ClusterInfo = { start: number; size: number; centerX: number; centerY: number };
  const clusters: ClusterInfo[] = [];
  let nodeIdx = 0;

  // Arrange clusters in a line from left to right
  for (let c = 0; c < numClusters; c++) {
    const sz = clusterSizes[c];
    const cx = (c + 0.5) / numClusters;
    const cy = 0.5;
    const startIdx = nodeIdx;

    // Place cluster nodes in a small circle
    for (let i = 0; i < sz; i++) {
      const angle = (i / sz) * Math.PI * 2;
      const radius = 0.08 + sz * 0.02;
      nodes.push({
        id: nodeIdx,
        x: cx + radius * Math.cos(angle) + (rng() - 0.5) * 0.03,
        y: cy + radius * Math.sin(angle) + (rng() - 0.5) * 0.03,
      });
      nodeIdx++;
    }

    clusters.push({ start: startIdx, size: sz, centerX: cx, centerY: cy });

    // Intra-cluster edges: cycle + some extras for small clusters
    for (let i = 0; i < sz; i++) {
      addEdge(startIdx + i, startIdx + ((i + 1) % sz)); // cycle
    }
    // Add a few cross-edges within cluster for richness (complete if <=3 nodes)
    if (sz <= 3) {
      for (let i = 0; i < sz; i++) {
        for (let j = i + 1; j < sz; j++) {
          addEdge(startIdx + i, startIdx + j);
        }
      }
    } else {
      // Add ~50% extra random edges
      for (let i = 0; i < sz; i++) {
        for (let j = i + 2; j < sz; j++) {
          if (rng() < 0.4) addEdge(startIdx + i, startIdx + j);
        }
      }
    }
  }

  // Place bottleneck nodes between adjacent clusters
  const bottleneckIndices: number[] = [];
  for (let b = 0; b < bnCount; b++) {
    const c1 = clusters[b];
    const c2 = clusters[b + 1];
    const bx = (c1.centerX + c2.centerX) / 2;
    const by = 0.5 + (rng() - 0.5) * 0.15;
    nodes.push({ id: nodeIdx, x: bx, y: by });
    bottleneckIndices.push(nodeIdx);

    // Connect bottleneck to exactly one node in each adjacent cluster
    const c1Target = c1.start + Math.floor(rng() * c1.size);
    const c2Target = c2.start + Math.floor(rng() * c2.size);
    addEdge(nodeIdx, c1Target);
    addEdge(nodeIdx, c2Target);
    nodeIdx++;
  }

  // Build adjacency
  const adjacency: number[][] = Array.from({ length: nodeCount }, () => []);
  for (const [a, b] of edges) {
    adjacency[a].push(b);
    adjacency[b].push(a);
  }

  // Verify connectivity
  const visited = new Set<number>();
  const queue = [0];
  visited.add(0);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nb of adjacency[cur]) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }
  for (let i = 0; i < nodeCount; i++) {
    if (!visited.has(i)) {
      const target = [...visited][Math.floor(rng() * visited.size)];
      addEdge(i, target);
      adjacency[i].push(target);
      adjacency[target].push(i);
      visited.add(i);
      const q2 = [i];
      while (q2.length > 0) {
        const c = q2.shift()!;
        for (const nb of adjacency[c]) {
          if (!visited.has(nb)) {
            visited.add(nb);
            q2.push(nb);
          }
        }
      }
    }
  }

  return { nodes, edges, adjacency };
}

/* ─── Core Functions ─── */

export function isGoal(state: FerryState): boolean {
  return state.tokens.every((v, i) => v === i);
}

export function heuristic(state: FerryState): number {
  // Count tokens not in their goal position
  let wrong = 0;
  for (let i = 0; i < state.tokens.length; i++) {
    if (state.tokens[i] !== i) wrong++;
  }
  return wrong;
}

/**
 * Enhanced heuristic: sum of shortest-path distances from each token to its goal.
 * More informative for A* search.
 */
function distanceHeuristic(state: FerryState): number {
  const n = state.graph.nodes.length;
  // Compute all-pairs shortest paths (BFS for each node)
  const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  for (let src = 0; src < n; src++) {
    dist[src][src] = 0;
    const q = [src];
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      for (const nb of state.graph.adjacency[cur]) {
        if (dist[src][nb] === Infinity) {
          dist[src][nb] = dist[src][cur] + 1;
          q.push(nb);
        }
      }
    }
  }
  // Sum distances: token at position i needs to reach position tokens[i]'s goal = tokens[i]
  // Wait: tokens[i] is the color at position i, goal is tokens[i] === i
  // So token with color c is at some position p, needs to get to position c
  // But we track by position: tokens[i] = color at node i. Goal: tokens[i] = i.
  // The token currently at position i has color tokens[i] and needs to reach position tokens[i].
  let total = 0;
  for (let i = 0; i < n; i++) {
    const color = state.tokens[i];
    if (color !== i) {
      total += dist[i][color]; // distance from current position to goal position
    }
  }
  // Divide by 2 because each swap moves 2 tokens
  return Math.ceil(total / 2);
}

export function legalMoves(state: FerryState): Move[] {
  return state.graph.edges.map(e => [e[0], e[1]] as Move);
}

export function applyMove(state: FerryState, move: Move): FerryState {
  const [a, b] = move;
  const tokens = [...state.tokens];
  [tokens[a], tokens[b]] = [tokens[b], tokens[a]];
  return { tokens, graph: state.graph };
}

function stateKey(state: FerryState): string {
  return state.tokens.join(',');
}

/* ─── Puzzle Generation ─── */

/**
 * Generate a puzzle by:
 * 1. Create a graph with bottleneck topology
 * 2. Start from solved state and apply random swaps to scramble
 * 3. Verify the scrambled state requires enough moves
 */
export function generatePuzzle(seed: number, difficulty: number): FerryState {
  const rng = makeRng(seed);

  // Scale with difficulty
  // Mon (1): 6 tokens, 1 bottleneck
  // Fri (5): 10 tokens, 3 bottlenecks
  const nodeCount = Math.min(5 + difficulty, 10);
  const bottleneckCount = Math.min(1 + Math.floor((difficulty - 1) / 2), 3);

  const graph = generateGraph(rng, nodeCount, bottleneckCount);
  const edgeCount = graph.edges.length;

  // Target optimal solution length by difficulty
  const minOptimal = Math.max(3, 2 + difficulty); // Mon→3, Fri→7

  // Try multiple scrambles; use wrong-count as proxy for depth (fast)
  let bestTokens: number[] | null = null;
  let bestWrong = 0;

  for (let attempt = 0; attempt < 8; attempt++) {
    const tokens = Array.from({ length: nodeCount }, (_, i) => i);
    const rounds = 10 + difficulty * 6 + attempt * 4;
    for (let i = 0; i < rounds; i++) {
      const edgeIdx = Math.floor(rng() * edgeCount);
      const [a, b] = graph.edges[edgeIdx];
      [tokens[a], tokens[b]] = [tokens[b], tokens[a]];
    }
    if (tokens.every((v, i) => v === i)) {
      const [a, b] = graph.edges[0];
      [tokens[a], tokens[b]] = [tokens[b], tokens[a]];
    }
    const wrong = tokens.reduce((c, v, i) => c + (v !== i ? 1 : 0), 0);
    if (wrong >= minOptimal + 2) {
      return { tokens, graph };
    }
    if (wrong > bestWrong) {
      bestWrong = wrong;
      bestTokens = tokens;
    }
  }

  return { tokens: bestTokens || Array.from({ length: nodeCount }, (_, i) => i), graph };
}

/* ─── Solver ─── */

export function solve(
  puzzle: FerryState,
  skillLevel: 1 | 2 | 3 | 4 | 5,
): Solution | null {
  if (isGoal(puzzle)) return { moves: [], steps: 0 };

  switch (skillLevel) {
    case 1:
      return solveRandom(puzzle);
    case 2:
      return solveGreedy(puzzle);
    case 3:
      return solveGreedyLookahead(puzzle);
    case 4: {
      const bfsBudget = puzzle.graph.nodes.length <= 8 ? 300000 : 50000;
      return solveBFS(puzzle, bfsBudget);
    }
    case 5: {
      const n5 = puzzle.graph.nodes.length;
      const budget5 = n5 <= 7 ? 500000 : n5 <= 8 ? 200000 : n5 <= 9 ? 80000 : 30000;
      return solveAStar(puzzle, budget5);
    }
  }
}

/** Level 1: Random valid moves, cap at 50 moves */
function solveRandom(puzzle: FerryState): Solution | null {
  let state = puzzle;
  const moves: Move[] = [];
  for (let i = 0; i < 50; i++) {
    const legal = legalMoves(state);
    const move = legal[Math.floor(Math.random() * legal.length)];
    state = applyMove(state, move);
    moves.push(move);
    if (isGoal(state)) return { moves, steps: moves.length };
  }
  return null;
}

/** Level 2: Greedy — pick the move that reduces heuristic the most */
function solveGreedy(puzzle: FerryState): Solution | null {
  // Precompute shortest paths for better heuristic
  const n = puzzle.graph.nodes.length;
  const sd: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  for (let src = 0; src < n; src++) {
    sd[src][src] = 0;
    const q = [src];
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      for (const nb of puzzle.graph.adjacency[cur]) {
        if (sd[src][nb] === Infinity) {
          sd[src][nb] = sd[src][cur] + 1;
          q.push(nb);
        }
      }
    }
  }
  function greedyH(tokens: number[]): number {
    let total = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] !== i) total += sd[i][tokens[i]];
    }
    return total;
  }

  let state = puzzle;
  const moves: Move[] = [];
  const visited = new Set<string>([stateKey(state)]);

  for (let i = 0; i < 200; i++) {
    const legal = legalMoves(state);
    let bestMove: Move | null = null;
    let bestH = Infinity;
    for (const m of legal) {
      const next = applyMove(state, m);
      const key = stateKey(next);
      if (visited.has(key)) continue;
      const h = greedyH(next.tokens);
      if (h < bestH) {
        bestH = h;
        bestMove = m;
      }
    }
    if (!bestMove) {
      // Stuck: allow revisiting states, pick random
      const m = legal[Math.floor(Math.random() * legal.length)];
      state = applyMove(state, m);
      moves.push(m);
    } else {
      state = applyMove(state, bestMove);
      moves.push(bestMove);
      visited.add(stateKey(state));
    }
    if (isGoal(state)) return { moves, steps: moves.length };
  }
  return null;
}

/** Level 3: Greedy with 1-step lookahead using distance heuristic */
function solveGreedyLookahead(puzzle: FerryState): Solution | null {
  // Precompute shortest paths
  const n = puzzle.graph.nodes.length;
  const sd: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  for (let src = 0; src < n; src++) {
    sd[src][src] = 0;
    const q = [src];
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      for (const nb of puzzle.graph.adjacency[cur]) {
        if (sd[src][nb] === Infinity) {
          sd[src][nb] = sd[src][cur] + 1;
          q.push(nb);
        }
      }
    }
  }
  function laH(tokens: number[]): number {
    let total = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] !== i) total += sd[i][tokens[i]];
    }
    return total;
  }

  let state = puzzle;
  const moves: Move[] = [];
  const visited = new Set<string>([stateKey(state)]);

  for (let i = 0; i < 200; i++) {
    const legal = legalMoves(state);
    let bestMove: Move | null = null;
    let bestScore = Infinity;

    for (const m of legal) {
      const next = applyMove(state, m);
      const key = stateKey(next);
      if (visited.has(key)) continue;

      if (isGoal(next)) {
        moves.push(m);
        return { moves, steps: moves.length };
      }

      // Look ahead one more step
      const legal2 = legalMoves(next);
      let bestH2 = laH(next.tokens);
      for (const m2 of legal2) {
        const next2 = applyMove(next, m2);
        const h2 = laH(next2.tokens);
        if (h2 < bestH2) bestH2 = h2;
      }
      if (bestH2 < bestScore) {
        bestScore = bestH2;
        bestMove = m;
      }
    }
    if (!bestMove) {
      // Stuck: random move
      const m = legal[Math.floor(Math.random() * legal.length)];
      state = applyMove(state, m);
      moves.push(m);
    } else {
      state = applyMove(state, bestMove);
      moves.push(bestMove);
      visited.add(stateKey(state));
    }
    if (isGoal(state)) return { moves, steps: moves.length };
  }
  return null;
}

/** Level 4: BFS with node limit */
function solveBFS(puzzle: FerryState, maxNodes: number): Solution | null {
  if (isGoal(puzzle)) return { moves: [], steps: 0 };
  const visited = new Set<string>([stateKey(puzzle)]);
  let frontier: { state: FerryState; moves: Move[] }[] = [
    { state: puzzle, moves: [] },
  ];

  while (frontier.length > 0 && visited.size < maxNodes) {
    const next: { state: FerryState; moves: Move[] }[] = [];
    for (const { state: cur, moves } of frontier) {
      for (const m of legalMoves(cur)) {
        const ns = applyMove(cur, m);
        const key = stateKey(ns);
        if (visited.has(key)) continue;
        visited.add(key);
        const nm = [...moves, m];
        if (isGoal(ns)) return { moves: nm, steps: nm.length };
        next.push({ state: ns, moves: nm });
        if (visited.size >= maxNodes) break;
      }
      if (visited.size >= maxNodes) break;
    }
    frontier = next;
  }
  return null;
}

/* ─── Binary Heap for A* ─── */
class MinHeap<T> {
  private data: T[] = [];
  constructor(private key: (item: T) => number) {}
  get size() { return this.data.length; }
  push(item: T) {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }
  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return top;
  }
  private bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.key(this.data[i]) < this.key(this.data[parent])) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }
  private sinkDown(i: number) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.key(this.data[l]) < this.key(this.data[smallest])) smallest = l;
      if (r < n && this.key(this.data[r]) < this.key(this.data[smallest])) smallest = r;
      if (smallest !== i) {
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      } else break;
    }
  }
}

/** Level 5: A* search with distance heuristic, binary heap, and parent pointers */
function solveAStar(puzzle: FerryState, maxNodes: number): Solution | null {
  if (isGoal(puzzle)) return { moves: [], steps: 0 };

  // Precompute shortest paths for heuristic
  const n = puzzle.graph.nodes.length;
  const shortDist: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  for (let src = 0; src < n; src++) {
    shortDist[src][src] = 0;
    const q = [src];
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      for (const nb of puzzle.graph.adjacency[cur]) {
        if (shortDist[src][nb] === Infinity) {
          shortDist[src][nb] = shortDist[src][cur] + 1;
          q.push(nb);
        }
      }
    }
  }

  function h(tokens: number[]): number {
    let total = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] !== i) {
        total += shortDist[i][tokens[i]];
      }
    }
    return Math.ceil(total / 2);
  }

  // Use parent-pointer tree instead of storing full move arrays
  type AStarNode = { key: string; tokens: number[]; parentIdx: number; move: Move | null; g: number; f: number };
  const closed: AStarNode[] = [];
  const visited = new Map<string, number>(); // key -> g cost

  const startKey = puzzle.tokens.join(',');
  const startNode: AStarNode = {
    key: startKey,
    tokens: puzzle.tokens,
    parentIdx: -1,
    move: null,
    g: 0,
    f: h(puzzle.tokens),
  };
  visited.set(startKey, 0);

  const open = new MinHeap<{ idx: number; f: number }>(item => item.f);
  closed.push(startNode);
  open.push({ idx: 0, f: startNode.f });

  const graph = puzzle.graph;
  const edgeList = graph.edges;

  while (open.size > 0 && visited.size < maxNodes) {
    const { idx } = open.pop()!;
    const current = closed[idx];

    for (const [a, b] of edgeList) {
      // Apply swap
      const newTokens = current.tokens.slice();
      const tmp = newTokens[a];
      newTokens[a] = newTokens[b];
      newTokens[b] = tmp;

      // Check goal
      let isG = true;
      for (let i = 0; i < n; i++) {
        if (newTokens[i] !== i) { isG = false; break; }
      }

      const g = current.g + 1;
      const move: Move = [a, b];

      if (isG) {
        // Reconstruct path
        const moves: Move[] = [move];
        let ci = idx;
        while (closed[ci].move !== null) {
          moves.push(closed[ci].move!);
          ci = closed[ci].parentIdx;
        }
        moves.reverse();
        return { moves, steps: moves.length };
      }

      const key = newTokens.join(',');
      const existing = visited.get(key);
      if (existing !== undefined && existing <= g) continue;
      visited.set(key, g);

      const f = g + h(newTokens);
      const newIdx = closed.length;
      closed.push({ key, tokens: newTokens, parentIdx: idx, move, g, f });
      open.push({ idx: newIdx, f });
    }
  }
  return null;
}

/* ─── Metrics Helpers ─── */

/** Shannon entropy of uniform distribution over n choices */
export function shannonEntropy(n: number): number {
  if (n <= 1) return 0;
  return Math.log2(n);
}

/** Compute puzzle entropy: sum of log2(legalMoves) at each step of solution */
export function puzzleEntropy(puzzle: FerryState, solution: Solution): number {
  let state = puzzle;
  let entropy = 0;
  for (const move of solution.moves) {
    const legal = legalMoves(state);
    entropy += shannonEntropy(legal.length);
    state = applyMove(state, move);
  }
  return entropy;
}

/**
 * Count counterintuitive moves: where distance heuristic increases after a move.
 * Uses sum-of-shortest-paths heuristic for more sensitivity than simple wrong count.
 */
export function countCounterintuitive(puzzle: FerryState, solution: Solution): number {
  // Precompute shortest paths
  const n = puzzle.graph.nodes.length;
  const sd: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  for (let src = 0; src < n; src++) {
    sd[src][src] = 0;
    const q = [src];
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      for (const nb of puzzle.graph.adjacency[cur]) {
        if (sd[src][nb] === Infinity) {
          sd[src][nb] = sd[src][cur] + 1;
          q.push(nb);
        }
      }
    }
  }
  function distH(tokens: number[]): number {
    let total = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] !== i) total += sd[i][tokens[i]];
    }
    return total;
  }

  let state = puzzle;
  let count = 0;
  for (const move of solution.moves) {
    const hBefore = distH(state.tokens);
    state = applyMove(state, move);
    const hAfter = distH(state.tokens);
    if (hAfter > hBefore) count++;
  }
  return count;
}

/**
 * Drama: measures how much progress is "undone" during the solve.
 * Uses distance heuristic for sensitivity. Returns the fraction of the
 * solution spent at or beyond maximum progress before a setback occurs.
 */
export function computeDrama(puzzle: FerryState, solution: Solution): number {
  if (solution.steps === 0) return 0;

  // Precompute shortest paths
  const n = puzzle.graph.nodes.length;
  const sd: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  for (let src = 0; src < n; src++) {
    sd[src][src] = 0;
    const q = [src];
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      for (const nb of puzzle.graph.adjacency[cur]) {
        if (sd[src][nb] === Infinity) {
          sd[src][nb] = sd[src][cur] + 1;
          q.push(nb);
        }
      }
    }
  }
  function distH(tokens: number[]): number {
    let total = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] !== i) total += sd[i][tokens[i]];
    }
    return total;
  }

  let state = puzzle;
  const startH = distH(state.tokens);
  if (startH === 0) return 0;

  let minH = startH; // best (lowest) heuristic seen so far
  let minHStep = 0;
  let maxSetback = 0; // largest increase after hitting a minimum

  for (let i = 0; i < solution.moves.length; i++) {
    state = applyMove(state, solution.moves[i]);
    const h = distH(state.tokens);
    if (h <= minH) {
      minH = h;
      minHStep = i + 1;
    } else {
      const setback = h - minH;
      if (setback > maxSetback) maxSetback = setback;
    }
  }

  // Drama = fraction of total distance that required a setback
  // Higher is more dramatic (closer to 1 means the player had to go way back)
  const dramaRatio = maxSetback / startH;
  // Also factor in when the max progress happened relative to total steps
  const progressTiming = minHStep / solution.steps;

  // Combine: drama is high when there's a significant setback AND it happens mid-solve
  return Math.min(1, (dramaRatio + progressTiming) / 2 + 0.1);
}

/** Info gain ratio: entropy of best move outcome vs random move outcome */
export function infoGainRatio(puzzle: FerryState, solution: Solution): number {
  if (solution.steps === 0) return 1;
  let state = puzzle;
  let totalRatio = 0;
  let count = 0;

  for (const move of solution.moves) {
    const legal = legalMoves(state);
    if (legal.length <= 1) {
      state = applyMove(state, move);
      continue;
    }

    // Heuristic of optimal move
    const bestH = heuristic(applyMove(state, move));
    // Average heuristic of random move
    let sumH = 0;
    for (const m of legal) {
      sumH += heuristic(applyMove(state, m));
    }
    const avgH = sumH / legal.length;

    if (bestH > 0) {
      totalRatio += avgH / bestH;
    } else {
      totalRatio += legal.length; // Goal-reaching move is maximally informative
    }
    count++;
    state = applyMove(state, move);
  }

  return count > 0 ? totalRatio / count : 1;
}
