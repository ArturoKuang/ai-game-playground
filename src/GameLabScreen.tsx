import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  createInitialBoard,
  formatCount,
  gameLab,
  getAudienceCopy,
  getConceptSummary,
  getDateKey,
  getPrincipleSignals,
  getTodayPuzzle,
  playableGame,
  selectedGame,
  shiftColumnDown,
  shiftRowRight,
  tileCatalog,
  tracePath,
  type GameSpec,
  type TileId,
} from './gameLab';
import { defaultPlayerStats, loadPlayerStats, recordSolve, savePlayerStats } from './playerStats';

const today = new Date();
const activePlayableGame = playableGame;
const todayPuzzle = getTodayPuzzle(activePlayableGame, today);
const todayKey = getDateKey(today);
const todayPuzzleKey = `${activePlayableGame.id}:${todayKey}:${todayPuzzle.id}`;
const boardSize = activePlayableGame.prototype?.gridSize ?? 4;

export function GameLabScreen() {
  const [board, setBoard] = useState<TileId[][]>(() => createInitialBoard(todayPuzzle));
  const [history, setHistory] = useState<TileId[][][]>([]);
  const [moves, setMoves] = useState(0);
  const [stats, setStats] = useState(defaultPlayerStats);
  const [statsReady, setStatsReady] = useState(false);

  const trace = tracePath(board, todayPuzzle);
  const scout = trace.stopPoint;
  const todayRecord = stats.completions[todayPuzzleKey];
  const clearedToday = Boolean(todayRecord);
  const isPerfect = trace.solved && moves <= todayPuzzle.parMoves;

  useEffect(() => {
    let active = true;

    loadPlayerStats().then((loaded) => {
      if (!active) {
        return;
      }

      setStats(loaded);
      setStatsReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!statsReady || !trace.solved) {
      return;
    }

    const next = recordSolve(stats, todayPuzzleKey, todayKey, moves, todayPuzzle.parMoves);

    if (next === stats) {
      return;
    }

    setStats(next);
    savePlayerStats(next).catch(() => undefined);
  }, [moves, stats, statsReady, trace.solved]);

  function moveRow(rowIndex: number) {
    if (trace.solved) {
      return;
    }

    setHistory((current) => [...current, cloneBoard(board)]);
    setBoard(shiftRowRight(board, rowIndex));
    setMoves((current) => current + 1);
  }

  function moveColumn(columnIndex: number) {
    if (trace.solved) {
      return;
    }

    setHistory((current) => [...current, cloneBoard(board)]);
    setBoard(shiftColumnDown(board, columnIndex));
    setMoves((current) => current + 1);
  }

  function resetPuzzle() {
    setBoard(createInitialBoard(todayPuzzle));
    setHistory([]);
    setMoves(0);
  }

  function undoMove() {
    const previous = history[history.length - 1];

    if (!previous) {
      return;
    }

    setHistory((current) => current.slice(0, current.length - 1));
    setBoard(cloneBoard(previous));
    setMoves((current) => Math.max(0, current - 1));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.background}>
        <View style={[styles.glow, styles.glowOne]} />
        <View style={[styles.glow, styles.glowTwo]} />
        <View style={[styles.glow, styles.glowThree]} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{gameLab.labName}</Text>
        <Text style={styles.heroTitle}>{selectedGame.title}</Text>
        <Text style={styles.heroCopy}>{gameLab.goal}</Text>

        <View style={styles.signalRow}>
          {getPrincipleSignals(selectedGame).map((signal) => (
            <View key={signal} style={styles.signalPill}>
              <Text style={styles.signalText}>{signal}</Text>
            </View>
          ))}
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Current Pick</Text>
          <Text style={styles.cardTitle}>{selectedGame.tagline}</Text>
          <Text style={styles.cardCopy}>{selectedGame.description}</Text>
          <Text style={styles.hookLine}>Hook: {selectedGame.signatureHook}</Text>
          <Text style={styles.metaLine}>{selectedGame.mechanic}</Text>
          <Text style={styles.metaSoft}>{getAudienceCopy(selectedGame)}</Text>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Why It Fits</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <Text style={styles.stepCopy}>Anyone can understand “make a route from left to right.”</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <Text style={styles.stepCopy}>Daily streaks and perfect clears support the next-day habit loop.</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <Text style={styles.stepCopy}>
              The first clear is simple, but low-move solutions create the mastery ceiling.
            </Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Player Stats</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Current streak" value={formatCount(stats.currentStreak)} />
            <StatCard label="Best streak" value={formatCount(stats.bestStreak)} />
            <StatCard label="Days solved" value={formatCount(stats.completedDays)} />
            <StatCard label="Perfect days" value={formatCount(stats.perfectDays)} />
          </View>
          <Text style={styles.statsCopy}>
            {clearedToday
              ? `Solved today in ${todayRecord?.bestMoves} moves. ${
                  (todayRecord?.bestMoves ?? Infinity) <= todayPuzzle.parMoves ? 'Perfect clear recorded.' : 'Come back tomorrow to extend the streak.'
                }`
              : 'Solve today’s board to start or extend your streak.'}
          </Text>
        </Card>

        <ScrollView
          contentContainerStyle={styles.cardScroller}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {gameLab.games.map((game) => (
            <ConceptCard key={game.id} game={game} isSelected={game.id === selectedGame.id} />
          ))}
        </ScrollView>

        <Card>
          <Text style={styles.sectionTitle}>How To Play</Text>
          {selectedGame.howToPlay.map((step) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepDot} />
              <Text style={styles.stepCopy}>{step}</Text>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Today&apos;s Puzzle</Text>
          <Text style={styles.cardTitle}>{todayPuzzle.title}</Text>
          <Text style={styles.cardCopy}>
            {activePlayableGame.id === selectedGame.id
              ? `Connect row ${todayPuzzle.startRow + 1} on the left to row ${todayPuzzle.goalRow + 1} on the right. Par is ${todayPuzzle.parMoves} moves.`
              : `The selected concept is not wired into the shell yet, so this playable board uses ${activePlayableGame.title} as the live reference prototype. Connect row ${todayPuzzle.startRow + 1} on the left to row ${todayPuzzle.goalRow + 1} on the right in ${todayPuzzle.parMoves} moves or better.`}
          </Text>

          <View style={styles.statusPanel}>
            <Text style={styles.statusTitle}>
              {trace.solved ? (isPerfect ? 'Perfect clear' : 'Board cleared') : `${moves} moves`}
            </Text>
            <View style={styles.statusMetrics}>
              <StatusMetric label="Moves" value={String(moves)} />
              <StatusMetric label="Par" value={String(todayPuzzle.parMoves)} />
              <StatusMetric
                label="Best today"
                value={todayRecord ? String(todayRecord.bestMoves) : '—'}
              />
            </View>
            <Text style={styles.statusCopy}>
              {trace.solved
                ? isPerfect
                  ? 'This is the mastery outcome. The streak has been recorded locally on this device.'
                  : `You found a path. Now reset and chase the ${todayPuzzle.parMoves}-move par.`
                : trace.exitRow !== null
                  ? `The trail currently spills out on row ${trace.exitRow + 1}. Shift lanes until it exits on row ${todayPuzzle.goalRow + 1}.`
                  : 'The trail dies before the lantern. Shift a row or column to keep the route alive.'}
            </Text>
          </View>

          <View style={styles.boardShell}>
            <View style={styles.columnControls}>
              <View style={styles.controlSpacer} />
              {Array.from({ length: boardSize }, (_, columnIndex) => (
                <ShiftButton
                  key={`column-${columnIndex}`}
                  label="↓"
                  onPress={() => moveColumn(columnIndex)}
                />
              ))}
            </View>

            {board.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.boardRow}>
                <ShiftButton label="→" onPress={() => moveRow(rowIndex)} />
                {row.map((tileId, columnIndex) => {
                  const tile = tileCatalog[tileId];
                  const highlighted = trace.highlighted.has(`${rowIndex}:${columnIndex}`);
                  const isStart = rowIndex === todayPuzzle.startRow && columnIndex === 0;
                  const isGoal = rowIndex === todayPuzzle.goalRow && columnIndex === row.length - 1;
                  const isScout = scout?.row === rowIndex && scout?.column === columnIndex && !trace.solved;

                  return (
                    <View
                      key={`tile-${rowIndex}-${columnIndex}`}
                      style={[
                        styles.tile,
                        highlighted && styles.tileHighlighted,
                        trace.solved && highlighted && styles.tileSolved,
                        isStart && styles.entryTile,
                        isGoal && styles.goalTile,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tileGlyph,
                          tileId === 'dot' && styles.tileGlyphSoft,
                          trace.solved && highlighted && styles.tileGlyphSolved,
                        ]}
                      >
                        {tile.glyph}
                      </Text>
                      {isScout ? <View style={styles.scoutBadge} /> : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.actionRow}>
            <ActionButton label="Undo" onPress={undoMove} disabled={history.length === 0} />
            <ActionButton label="Reset" onPress={resetPuzzle} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function ConceptCard({ game, isSelected }: { game: GameSpec; isSelected: boolean }) {
  return (
    <View style={[styles.conceptCard, isSelected && styles.conceptCardSelected]}>
      <Text style={styles.conceptBadge}>{isSelected ? 'Prototype live' : 'Candidate'}</Text>
      <Text style={styles.conceptTitle}>{game.title}</Text>
      <Text style={styles.conceptCopy}>{game.tagline}</Text>
      <Text style={styles.conceptMeta}>{game.mechanic}</Text>
      <Text style={styles.conceptMeta}>{getConceptSummary(game).join(' • ')}</Text>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ShiftButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.shiftButton, pressed && styles.shiftPressed]}>
      <Text style={styles.shiftText}>{label}</Text>
    </Pressable>
  );
}

function StatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statusMetric}>
      <Text style={styles.statusMetricLabel}>{label}</Text>
      <Text style={styles.statusMetricValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        disabled && styles.actionDisabled,
        pressed && !disabled && styles.actionPressed,
      ]}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function cloneBoard(board: TileId[][]) {
  return board.map((row) => [...row]);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7E9D8',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.42,
  },
  glowOne: {
    width: 260,
    height: 260,
    top: -20,
    right: -20,
    backgroundColor: '#F4B678',
  },
  glowTwo: {
    width: 220,
    height: 220,
    left: -50,
    top: 240,
    backgroundColor: '#B4D7C5',
  },
  glowThree: {
    width: 180,
    height: 180,
    right: 40,
    bottom: 110,
    backgroundColor: '#C9B6E5',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 16,
  },
  eyebrow: {
    color: '#7A5842',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#1F2B3C',
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 42,
  },
  heroCopy: {
    color: '#4F5768',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 720,
  },
  signalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  signalPill: {
    backgroundColor: '#FFF7EE',
    borderColor: '#DDCDB8',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  signalText: {
    color: '#5F4C3A',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: 'rgba(255, 249, 240, 0.94)',
    borderColor: '#DBCAB5',
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    gap: 12,
    shadowColor: '#8B6E52',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  sectionTitle: {
    color: '#7A5941',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#1F2B3C',
    fontSize: 24,
    fontWeight: '800',
  },
  cardCopy: {
    color: '#495163',
    fontSize: 15,
    lineHeight: 23,
  },
  metaLine: {
    color: '#1D6F63',
    fontSize: 14,
    fontWeight: '700',
  },
  hookLine: {
    color: '#684C36',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  metaSoft: {
    color: '#7A5941',
    fontSize: 13,
    fontWeight: '600',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#1D6F63',
    marginTop: 8,
  },
  stepCopy: {
    flex: 1,
    color: '#495163',
    fontSize: 15,
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flexGrow: 1,
    minWidth: 132,
    backgroundColor: '#F7F0E6',
    borderColor: '#DBCAB5',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  statValue: {
    color: '#1F2B3C',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#6A707B',
    fontSize: 12,
    fontWeight: '700',
  },
  statsCopy: {
    color: '#516073',
    fontSize: 14,
    lineHeight: 20,
  },
  cardScroller: {
    gap: 12,
    paddingRight: 8,
  },
  conceptCard: {
    width: 240,
    backgroundColor: '#1F2B3C',
    borderRadius: 24,
    padding: 16,
    gap: 10,
  },
  conceptCardSelected: {
    backgroundColor: '#1D6F63',
  },
  conceptBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    color: '#FFF8EF',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  conceptTitle: {
    color: '#FFF8EF',
    fontSize: 20,
    fontWeight: '800',
  },
  conceptCopy: {
    color: '#F2E7DB',
    fontSize: 14,
    lineHeight: 20,
  },
  conceptMeta: {
    color: '#D8CBB7',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  statusPanel: {
    backgroundColor: '#F7F0E6',
    borderColor: '#DBCAB5',
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 4,
  },
  statusTitle: {
    color: '#1F2B3C',
    fontSize: 16,
    fontWeight: '800',
  },
  statusCopy: {
    color: '#566074',
    fontSize: 14,
    lineHeight: 20,
  },
  statusMetrics: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusMetric: {
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FBF5ED',
    borderColor: '#D8C9B6',
    borderWidth: 1,
    gap: 2,
  },
  statusMetricLabel: {
    color: '#6A707B',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusMetricValue: {
    color: '#1F2B3C',
    fontSize: 16,
    fontWeight: '800',
  },
  boardShell: {
    gap: 8,
    alignSelf: 'center',
  },
  columnControls: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  controlSpacer: {
    width: 40,
  },
  boardRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  shiftButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#E5D7C6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftPressed: {
    opacity: 0.74,
  },
  shiftText: {
    color: '#46392C',
    fontSize: 20,
    fontWeight: '800',
  },
  tile: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#FBF5ED',
    borderColor: '#D8C9B6',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tileHighlighted: {
    backgroundColor: '#F3E0B9',
    borderColor: '#C78835',
  },
  tileSolved: {
    backgroundColor: '#1D6F63',
    borderColor: '#124840',
  },
  entryTile: {
    borderLeftWidth: 4,
    borderLeftColor: '#EA6A4E',
  },
  goalTile: {
    borderRightWidth: 4,
    borderRightColor: '#5A68D8',
  },
  tileGlyph: {
    color: '#1F2B3C',
    fontSize: 28,
    fontWeight: '800',
  },
  tileGlyphSoft: {
    color: '#A79B8E',
  },
  tileGlyphSolved: {
    color: '#FFF8EF',
  },
  scoutBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 11,
    height: 11,
    borderRadius: 999,
    backgroundColor: '#EA6A4E',
    borderWidth: 2,
    borderColor: '#FFF8EF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    minWidth: 110,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: '#1F2B3C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  actionPressed: {
    opacity: 0.78,
  },
  actionDisabled: {
    backgroundColor: '#918779',
  },
  actionText: {
    color: '#FFF8EF',
    fontSize: 14,
    fontWeight: '800',
  },
});
