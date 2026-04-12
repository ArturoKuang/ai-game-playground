/**
 * Shared color constants for Algorithm Arcade.
 * Derived from leetcode/specs/game-feel.md
 */

/* ── Dark theme palette (shared across all games) ── */

export const THEME = {
  bg: '#0a0a0b',
  surface: '#141416',
  border: '#1e1e22',
  borderLight: '#2a2a2e',
  textPrimary: '#ffffff',
  textSecondary: '#9aa0a6',
  textMuted: '#6b7280',
} as const;

/* ── Per-game accent colors ── */

export const ACCENT = {
  'Binary Search': '#7bdff2',      // arctic blue
  'Two Pointers': '#c084fc',       // lavender
  Stack: '#f59e0b',                // amber
  'Sliding Window': '#34d399',     // mint
  'Hash Map': '#60a5fa',           // sky blue
  'Heap / Priority Queue': '#fb923c', // tangerine
  BFS: '#38bdf8',                  // ocean
  'DFS / Backtracking': '#a78bfa', // violet
  Trie: '#e879f9',                 // fuschia
  'Monotonic Stack': '#fbbf24',    // gold
  '1D Dynamic Programming': '#4ade80', // emerald
  Greedy: '#f472b6',               // pink
  'Topological Sort': '#22d3ee',   // cyan
  'Union-Find': '#fb7185',         // coral
  'Binary Search on Answer': '#7dd3fc', // ice blue
  '2D Dynamic Programming': '#86efac', // lime
  Dijkstra: '#fcd34d',             // sunflower
  'Interval Scheduling': '#d946ef', // magenta
  'Divide & Conquer': '#818cf8',   // indigo
  'Bit Manipulation': '#f87171',   // red
} as const;

export type AlgorithmTopic = keyof typeof ACCENT;

/** Get accent color for an algorithm topic, with fallback */
export function accentFor(topic: string): string {
  return (ACCENT as Record<string, string>)[topic] ?? '#4ade80';
}

/* ── Budget color interpolation (green → yellow → red) ── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')
  );
}

const BUDGET_GREEN = hexToRgb('#4ade80');
const BUDGET_YELLOW = hexToRgb('#facc15');
const BUDGET_RED = hexToRgb('#ef4444');

/**
 * Returns a hex color interpolated along green → yellow → red.
 * @param ratio — remaining budget as 0..1 (1 = full, 0 = empty)
 */
export function budgetColor(ratio: number): string {
  const r = Math.max(0, Math.min(1, ratio));
  if (r > 0.5) {
    // green → yellow (ratio 1→0.5 maps to t 0→1)
    const t = (1 - r) * 2;
    return rgbToHex(
      lerp(BUDGET_GREEN[0], BUDGET_YELLOW[0], t),
      lerp(BUDGET_GREEN[1], BUDGET_YELLOW[1], t),
      lerp(BUDGET_GREEN[2], BUDGET_YELLOW[2], t),
    );
  }
  // yellow → red (ratio 0.5→0 maps to t 0→1)
  const t = 1 - r * 2;
  return rgbToHex(
    lerp(BUDGET_YELLOW[0], BUDGET_RED[0], t),
    lerp(BUDGET_YELLOW[1], BUDGET_RED[1], t),
    lerp(BUDGET_YELLOW[2], BUDGET_RED[2], t),
  );
}
