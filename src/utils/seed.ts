/** Epoch for puzzle numbering: March 1, 2026 */
const EPOCH = new Date(2026, 2, 1);

/**
 * Deterministic daily seed based on date.
 * Everyone gets the same puzzle on the same day.
 */
export function getDailySeed(): number {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Returns the puzzle day number (Day #1 = March 1, 2026) */
export function getPuzzleDay(): number {
  const now = new Date();
  const diffMs = now.getTime() - EPOCH.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Day-of-week difficulty: 1 (Monday/easy) to 5 (Friday/hard).
 * Weekend days are medium (3).
 */
export function getDayDifficulty(): number {
  const day = new Date().getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  if (day === 0 || day === 6) return 3; // weekend = medium
  return day; // Mon=1, Tue=2, Wed=3, Thu=4, Fri=5
}

/**
 * Simple seeded PRNG (mulberry32).
 * Returns a function that produces deterministic floats in [0, 1).
 */
export function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
