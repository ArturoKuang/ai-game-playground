import AsyncStorage from '@react-native-async-storage/async-storage';

export type CompletionRecord = {
  bestMoves: number;
  parMoves: number;
  dateKey: string;
};

export type PlayerStats = {
  completedDays: number;
  perfectDays: number;
  currentStreak: number;
  bestStreak: number;
  bestSolveMoves: number | null;
  lastCompletionDate: string | null;
  completions: Record<string, CompletionRecord>;
};

const STORAGE_KEY = 'pocket-puzzle-lab-stats-v1';

export const defaultPlayerStats: PlayerStats = {
  completedDays: 0,
  perfectDays: 0,
  currentStreak: 0,
  bestStreak: 0,
  bestSolveMoves: null,
  lastCompletionDate: null,
  completions: {},
};

export async function loadPlayerStats() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return defaultPlayerStats;
  }

  try {
    return { ...defaultPlayerStats, ...JSON.parse(raw) } as PlayerStats;
  } catch {
    return defaultPlayerStats;
  }
}

export async function savePlayerStats(stats: PlayerStats) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function recordSolve(
  stats: PlayerStats,
  puzzleKey: string,
  dateKey: string,
  moves: number,
  parMoves: number,
) {
  const existing = stats.completions[puzzleKey];

  if (existing && existing.bestMoves <= moves) {
    return stats;
  }

  const nextCompletions = { ...stats.completions };
  nextCompletions[puzzleKey] = {
    bestMoves: existing ? Math.min(existing.bestMoves, moves) : moves,
    parMoves,
    dateKey,
  };

  let completedDays = stats.completedDays;
  let perfectDays = stats.perfectDays;
  let currentStreak = stats.currentStreak;
  let bestStreak = stats.bestStreak;
  let lastCompletionDate = stats.lastCompletionDate;

  if (!existing) {
    completedDays += 1;

    if (stats.lastCompletionDate === previousDateKey(dateKey)) {
      currentStreak += 1;
    } else if (stats.lastCompletionDate === dateKey) {
      currentStreak = stats.currentStreak;
    } else {
      currentStreak = 1;
    }

    bestStreak = Math.max(stats.bestStreak, currentStreak);
    lastCompletionDate = dateKey;

    if (moves <= parMoves) {
      perfectDays += 1;
    }
  } else if (existing.bestMoves > parMoves && moves <= parMoves) {
    perfectDays += 1;
  }

  return {
    completedDays,
    perfectDays,
    currentStreak,
    bestStreak,
    bestSolveMoves:
      stats.bestSolveMoves === null ? moves : Math.min(stats.bestSolveMoves, moves),
    lastCompletionDate,
    completions: nextCompletions,
  };
}

function previousDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map((value) => Number.parseInt(value, 10));
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);

  const prevYear = date.getFullYear();
  const prevMonth = `${date.getMonth() + 1}`.padStart(2, '0');
  const prevDay = `${date.getDate()}`.padStart(2, '0');
  return `${prevYear}-${prevMonth}-${prevDay}`;
}
