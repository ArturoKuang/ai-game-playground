import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  countChartedLand,
  createInitialState,
  currentCellId,
  evaluateIslemark,
  generatePuzzle,
  legalMoves,
  parseCellId,
  terrainAt,
  type IslemarkDifficulty,
  type IslemarkState,
} from '../solvers/Islemark.solver';

const DIFFICULTIES: IslemarkDifficulty[] = [1, 2, 3, 4, 5];
const EVALUATION = evaluateIslemark();

function buildPuzzle(difficulty: IslemarkDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function cellSizeFor(size: number) {
  if (size <= 4) return 62;
  if (size <= 5) return 54;
  return 46;
}

function currentCellLabel(state: IslemarkState) {
  const id = currentCellId(state);
  if (!id) return 'sweep complete';
  const { row, col } = parseCellId(id);
  const terrain = terrainAt(state.puzzle, id);
  return `R${row + 1} C${col + 1} • ${terrain}`;
}

export default function Islemark() {
  const [difficulty, setDifficulty] = useState<IslemarkDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<IslemarkState>(() => createInitialState(buildPuzzle(1, 0)));

  const metrics = useMemo(
    () => EVALUATION.difficulties.find((entry) => entry.difficulty === difficulty),
    [difficulty],
  );
  const legal = new Set(legalMoves(state));
  const currentId = currentCellId(state);
  const charted = new Set(state.charted);
  const roots = new Set(state.launchRoots);

  const resetPuzzle = (nextPuzzle = puzzle) => {
    setPuzzle(nextPuzzle);
    setState(createInitialState(nextPuzzle));
  };

  const rerollPuzzle = () => {
    const nextSeed = seed + 1;
    const nextPuzzle = buildPuzzle(difficulty, nextSeed);
    setSeed(nextSeed);
    resetPuzzle(nextPuzzle);
  };

  const switchDifficulty = (nextDifficulty: IslemarkDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Sweep Cursor</Text>
          <Text style={styles.summaryValue}>{currentCellLabel(state)}</Text>
          <Text style={styles.summaryMeta}>
            {currentId ? `${state.cursorIndex + 1}/${puzzle.board.length * puzzle.board[0]!.length} cells` : 'ready to claim'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Launches</Text>
          <Text style={styles.summaryValue}>{`${state.launchesUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>{`${state.wastedLaunches} wasted`}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Charted Coast</Text>
          <Text style={styles.summaryValue}>{`${countChartedLand(state)}/${puzzle.landCount}`}</Text>
          <Text style={styles.summaryMeta}>land cells mapped</Text>
        </View>
      </View>

      <View style={styles.gridShell}>
        {puzzle.board.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.gridRow}>
            {row.split('').map((cell, colIndex) => {
              const id = `${rowIndex}:${colIndex}`;
              const onCursor = id === currentId;
              const isLand = cell === '#';
              const isCharted = charted.has(id);
              const isRoot = roots.has(id);
              return (
                <View
                  key={id}
                  style={[
                    styles.cell,
                    { width: cellSizeFor(puzzle.board.length), height: cellSizeFor(puzzle.board.length) },
                    isLand ? styles.landCell : styles.waterCell,
                    isCharted && styles.chartedCell,
                    onCursor && styles.cursorCell,
                  ]}
                >
                  <Text style={[styles.cellGlyph, !isLand && styles.waterGlyph]}>
                    {isRoot ? 'B' : isCharted ? 'C' : isLand ? 'L' : '~'}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.landCell]} />
          <Text style={styles.legendText}>unclaimed land</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.chartedCell]} />
          <Text style={styles.legendText}>charted coast</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.waterCell]} />
          <Text style={styles.legendText}>water</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Coast Ledger</Text>
        <Text style={styles.helperLine}>{state.message}</Text>
        <Text style={styles.ledgerLine}>{`Target islands: ${puzzle.islandCount}`}</Text>
        <Text style={styles.ledgerLine}>
          {`Launch roots: ${state.launchRoots.length === 0 ? 'none yet' : state.launchRoots.map((id) => formatRoot(id)).join(' | ')}`}
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Sweep Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.routeWrap}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.routeChip}>
                <Text style={styles.routeText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No moves yet. Sweep the current cell or spend a launch there.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.infoLine}>Pass moves the sweep cursor to the next cell in row-major order.</Text>
        <Text style={styles.infoLine}>Launch spends one island count at the current cell. On fresh land it charts the whole connected island immediately.</Text>
        <Text style={styles.infoLine}>Water and already-charted coast can still waste a launch.</Text>
        <Text style={styles.infoLine}>Claim only after the sweep reaches the end of the grid.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={!legal.has('pass')}
          onPress={() => setState((current) => applyMove(current, { type: 'pass' }))}
          style={[styles.controlButton, !legal.has('pass') && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Pass Cell</Text>
        </Pressable>
        <Pressable
          disabled={!legal.has('launch')}
          onPress={() => setState((current) => applyMove(current, { type: 'launch' }))}
          style={[styles.controlButton, styles.primaryButton, !legal.has('launch') && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Launch Boat</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={!legal.has('claim')}
          onPress={() => setState((current) => applyMove(current, { type: 'claim' }))}
          style={[styles.controlButton, !legal.has('claim') && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Claim Count</Text>
        </Pressable>
        <Pressable onPress={() => resetPuzzle()} style={styles.controlButton}>
          <Text style={styles.controlButtonLabel}>Reset Sweep</Text>
        </Pressable>
      </View>

      {state.verdict ? (
        <Text style={[styles.verdictText, state.verdict.correct ? styles.winText : styles.lossText]}>
          {state.verdict.label}
        </Text>
      ) : null}
    </View>
  );

  return (
    <GameScreenTemplate
      title="Islemark"
      emoji="IM"
      subtitle="Sweep the grid, spend one launch on each fresh island root, and let the tide chart the whole connected coast before you count again."
      objective="Finish the sweep with exactly one launch per island."
      statsLabel={`${puzzle.label} • ${metrics ? `${Math.round(metrics.skillDepth * 100)}% depth` : 'coast scan'}`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Chart', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((entry) => ({
        label: `D${entry}`,
        selected: entry === difficulty,
        onPress: () => switchDifficulty(entry),
      }))}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        summary:
          'Islemark teaches connected-component counting for Number of Islands: when the sweep discovers fresh land, count one island and immediately flood-fill every orthogonally connected land cell so none of that coast can be counted again later.',
        takeaway:
          'The launch at a fresh shoreline maps to `islands += 1`, and the automatic charting wave maps to the BFS or DFS that marks every connected land cell as visited before the outer scan continues.',
      }}
      leetcodeLinks={[
        {
          id: 200,
          title: 'Number of Islands',
          url: 'https://leetcode.com/problems/number-of-islands/',
        },
      ]}
    />
  );
}

function formatRoot(id: string) {
  const { row, col } = parseCellId(id);
  return `${row + 1},${col + 1}`;
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#171b22',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: '#8ea0b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryValue: {
    color: '#f5f7fb',
    fontSize: 17,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#9aa9bc',
    fontSize: 12,
  },
  gridShell: {
    alignSelf: 'center',
    backgroundColor: '#0f1724',
    borderRadius: 18,
    padding: 10,
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0f1724',
  },
  landCell: {
    backgroundColor: '#d0a85c',
  },
  waterCell: {
    backgroundColor: '#294362',
  },
  chartedCell: {
    backgroundColor: '#60a977',
  },
  cursorCell: {
    borderColor: '#f5f7fb',
    borderWidth: 2,
  },
  cellGlyph: {
    color: '#102030',
    fontWeight: '800',
    fontSize: 15,
  },
  waterGlyph: {
    color: '#d2e2f5',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendText: {
    color: '#c6d0dc',
    fontSize: 12,
  },
  sectionCard: {
    backgroundColor: '#171b22',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  helperLine: {
    color: '#dfe7f2',
    fontSize: 14,
    lineHeight: 20,
  },
  ledgerLine: {
    color: '#9fb0c7',
    fontSize: 12,
    lineHeight: 18,
  },
  routeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeChip: {
    backgroundColor: '#0f1724',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  routeText: {
    color: '#d8e4f1',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#9fb0c7',
    fontSize: 13,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#171b22',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  infoLine: {
    color: '#d8e4f1',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#243042',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  primaryButton: {
    backgroundColor: '#4d8861',
  },
  controlButtonLabel: {
    color: '#f5f7fb',
    fontWeight: '700',
    fontSize: 14,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  winText: {
    color: '#8fe0a8',
  },
  lossText: {
    color: '#ff9f9f',
  },
});
