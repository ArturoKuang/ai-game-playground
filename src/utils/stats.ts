import AsyncStorage from '@react-native-async-storage/async-storage';

export type Stats = {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  bestScore: number | null;
  lastPlayedDate: string | null;
  scoreDistribution: Record<string, number>; // bucket label -> count
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function storageKey(gameId: string): string {
  return `@puzzlelab_stats_${gameId}`;
}

const DEFAULT_STATS: Stats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  bestScore: null,
  lastPlayedDate: null,
  scoreDistribution: {},
};

export async function loadStats(gameId: string): Promise<Stats> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(gameId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { ...DEFAULT_STATS };
}

export async function recordGame(
  gameId: string,
  score: number,
  par: number
): Promise<Stats> {
  const stats = await loadStats(gameId);
  const today = todayKey();

  // Prevent double-counting the same day
  if (stats.lastPlayedDate === today) return stats;

  stats.gamesPlayed++;
  const won = score <= par;
  if (won) stats.gamesWon++;

  // Streak logic: check if last played was yesterday
  if (stats.lastPlayedDate) {
    const last = new Date(stats.lastPlayedDate);
    const now = new Date(today);
    const diffDays = Math.floor(
      (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
      stats.currentStreak++;
    } else if (diffDays > 1) {
      stats.currentStreak = 1;
    }
  } else {
    stats.currentStreak = 1;
  }

  stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
  stats.lastPlayedDate = today;

  if (stats.bestScore === null || score < stats.bestScore) {
    stats.bestScore = score;
  }

  // Score distribution buckets
  const bucket = score <= par ? 'Under par' : 'Over par';
  stats.scoreDistribution[bucket] = (stats.scoreDistribution[bucket] || 0) + 1;

  await AsyncStorage.setItem(storageKey(gameId), JSON.stringify(stats));
  return stats;
}
