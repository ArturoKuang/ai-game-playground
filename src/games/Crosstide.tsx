import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  candidateCells,
  createInitialState,
  dualWetCount,
  evaluateCrosstide,
  generatePuzzle,
  isDualWet,
  isWetBy,
  type CrosstideDifficulty,
  type CrosstideOcean,
  type CrosstideState,
} from '../solvers/Crosstide.solver';

const DIFFICULTIES: CrosstideDifficulty[] = [1, 2, 3, 4, 5];
const EVALUATION = evaluateCrosstide();

function buildPuzzle(difficulty: CrosstideDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function cellSizeFor(size: number) {
  if (size <= 4) return 66;
  if (size <= 5) return 56;
  return 48;
}

export default function Crosstide() {
  const [difficulty, setDifficulty] = useState<CrosstideDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [selectedOcean, setSelectedOcean] = useState<CrosstideOcean>('pacific');
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<CrosstideState>(() => createInitialState(buildPuzzle(1, 0)));

  const metrics = useMemo(
    () => EVALUATION.difficulties.find((entry) => entry.difficulty === difficulty),
    [difficulty],
  );
  const legal = new Set(candidateCells(state, selectedOcean));
  const pacificFrontier = candidateCells(state, 'pacific').length;
  const atlanticFrontier = candidateCells(state, 'atlantic').length;
  const cellSize = cellSizeFor(puzzle.heights.length);

  const resetPuzzle = (nextPuzzle = puzzle) => {
    setPuzzle(nextPuzzle);
    setState(createInitialState(nextPuzzle));
    setSelectedOcean('pacific');
  };

  const rerollPuzzle = () => {
    const nextSeed = seed + 1;
    const nextPuzzle = buildPuzzle(difficulty, nextSeed);
    setSeed(nextSeed);
    resetPuzzle(nextPuzzle);
  };

  const switchDifficulty = (nextDifficulty: CrosstideDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Selected Tide</Text>
          <Text style={styles.summaryValue}>{selectedOcean === 'pacific' ? 'Pacific' : 'Atlantic'}</Text>
          <Text style={styles.summaryMeta}>
            {selectedOcean === 'pacific'
              ? `${pacificFrontier} frontier tiles`
              : `${atlanticFrontier} frontier tiles`}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Pacific / Atlantic</Text>
          <Text style={styles.summaryValue}>{`${state.pacificWet.length}/${state.atlanticWet.length}`}</Text>
          <Text style={styles.summaryMeta}>wet tiles charted</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Shared Basins</Text>
          <Text style={styles.summaryValue}>{`${dualWetCount(state)}/${puzzle.dualTargets.length}`}</Text>
          <Text style={styles.summaryMeta}>{`${state.actionsUsed}/${puzzle.budget} actions`}</Text>
        </View>
      </View>

      <View style={styles.gridShell}>
        {puzzle.heights.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.gridRow}>
            {row.map((height, colIndex) => {
              const id = `${rowIndex}:${colIndex}`;
              const pacific = isWetBy(state, 'pacific', id);
              const atlantic = isWetBy(state, 'atlantic', id);
              const dual = isDualWet(state, id);
              const actionable = legal.has(id) && !state.verdict;
              return (
                <Pressable
                  key={id}
                  disabled={!actionable}
                  onPress={() =>
                    setState((current) => applyMove(current, { type: 'wet', ocean: selectedOcean, cellId: id }))
                  }
                  style={[
                    styles.cell,
                    { width: cellSize, height: cellSize },
                    pacific && styles.cellPacific,
                    atlantic && styles.cellAtlantic,
                    dual && styles.cellDual,
                    actionable && styles.cellActionable,
                  ]}
                >
                  <Text style={styles.heightText}>{height}</Text>
                  <Text style={styles.markerText}>{dual ? 'B' : pacific ? 'P' : atlantic ? 'A' : '·'}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.cellPacific]} />
          <Text style={styles.legendText}>Pacific</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.cellAtlantic]} />
          <Text style={styles.legendText}>Atlantic</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.cellDual]} />
          <Text style={styles.legendText}>both seas</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.cellActionable]} />
          <Text style={styles.legendText}>selected frontier</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Harbor Notes</Text>
        <Text style={styles.helperLine}>{state.message}</Text>
        <Text style={styles.ledgerLine}>
          {`Pacific still missing ${puzzle.pacificTargets.length - state.pacificWet.length} tiles.`}
        </Text>
        <Text style={styles.ledgerLine}>
          {`Atlantic still missing ${puzzle.atlanticTargets.length - state.atlanticWet.length} tiles.`}
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Move Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.logWrap}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.logChip}>
                <Text style={styles.logText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Border seeds are already live. Choose a tide and extend its frontier.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.infoLine}>Top and left borders belong to Pacific. Bottom and right borders belong to Atlantic.</Text>
        <Text style={styles.infoLine}>A tide may move only from one of its wet tiles into an adjacent tile of equal or greater height.</Text>
        <Text style={styles.infoLine}>Finish both reverse tide maps, then seal the chart. The answer set is every basin touched by both.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setSelectedOcean('pacific')}
          style={[
            styles.oceanButton,
            selectedOcean === 'pacific' && styles.oceanButtonSelected,
            state.verdict && styles.controlButtonDisabled,
          ]}
          disabled={Boolean(state.verdict)}
        >
          <Text style={styles.oceanButtonLabel}>{`Pacific (${pacificFrontier})`}</Text>
        </Pressable>
        <Pressable
          onPress={() => setSelectedOcean('atlantic')}
          style={[
            styles.oceanButton,
            selectedOcean === 'atlantic' && styles.oceanButtonSelectedAtlantic,
            state.verdict && styles.controlButtonDisabled,
          ]}
          disabled={Boolean(state.verdict)}
        >
          <Text style={styles.oceanButtonLabel}>{`Atlantic (${atlanticFrontier})`}</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'claim' }))}
          style={[styles.controlButton, styles.primaryButton, state.verdict && styles.controlButtonDisabled]}
          disabled={Boolean(state.verdict)}
        >
          <Text style={styles.primaryButtonLabel}>Seal Chart</Text>
        </Pressable>
        <Pressable onPress={() => resetPuzzle()} style={styles.controlButton}>
          <Text style={styles.controlButtonLabel}>Reset Map</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={rerollPuzzle} style={styles.controlButton}>
          <Text style={styles.controlButtonLabel}>New Map</Text>
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
      title="Crosstide"
      emoji="CT"
      subtitle="Run one reverse tide from the Pacific border and one from the Atlantic border, climbing only into equal-or-higher neighbors until the shared basins emerge."
      objective="Complete both tide maps, then seal the overlap."
      statsLabel={`${puzzle.label} • ${metrics ? `${Math.round(metrics.skillDepth * 100)}% depth` : 'dual flood'}`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Map', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((entry) => ({
        label: `D${entry}`,
        selected: entry === difficulty,
        onPress: () => switchDifficulty(entry),
      }))}
      board={board}
      controls={controls}
      helperText={`${puzzle.title}: ${puzzle.helper}`}
      conceptBridge={{
        summary:
          'Crosstide teaches Pacific Atlantic Water Flow by reversing the search. Instead of asking whether each interior cell can drain to both seas, you flood inward from both ocean borders and keep only the cells both reverse tides can still reach.',
        takeaway:
          'The Pacific and Atlantic tide maps correspond to two DFS or BFS runs seeded from the border cells. A legal climb into an equal-or-higher neighbor maps to the reverse condition `heights[next] >= heights[current]`, and the final shared basins are the intersection of the two visited sets.',
      }}
      leetcodeLinks={[
        {
          id: 417,
          title: 'Pacific Atlantic Water Flow',
          url: 'https://leetcode.com/problems/pacific-atlantic-water-flow/',
        },
      ]}
    />
  );
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
    backgroundColor: '#161c24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#283241',
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: '#8aa1ba',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: '#f4f7fb',
    fontSize: 20,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#aab7c6',
    fontSize: 12,
    lineHeight: 17,
  },
  gridShell: {
    alignSelf: 'center',
    gap: 6,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cell: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#35465c',
    backgroundColor: '#121821',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cellPacific: {
    backgroundColor: '#163a52',
    borderColor: '#2f7ca7',
  },
  cellAtlantic: {
    backgroundColor: '#4f2d1c',
    borderColor: '#d08a45',
  },
  cellDual: {
    backgroundColor: '#235145',
    borderColor: '#5bc3a7',
  },
  cellActionable: {
    shadowColor: '#f6d06a',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    borderColor: '#f6d06a',
  },
  heightText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  markerText: {
    color: '#d7e2ef',
    fontSize: 11,
    fontWeight: '700',
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
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1,
  },
  legendText: {
    color: '#dbe6f2',
    fontSize: 12,
  },
  sectionCard: {
    backgroundColor: '#131922',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#243042',
    padding: 14,
    gap: 8,
  },
  helperLine: {
    color: '#e6edf5',
    fontSize: 14,
    lineHeight: 20,
  },
  ledgerLine: {
    color: '#aab7c6',
    fontSize: 13,
    lineHeight: 18,
  },
  logWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logChip: {
    backgroundColor: '#1b2634',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2d3c51',
  },
  logText: {
    color: '#e8eef5',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#aab7c6',
    fontSize: 13,
    lineHeight: 19,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#0f141b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#233043',
    padding: 12,
    gap: 8,
  },
  infoLine: {
    color: '#dbe6f2',
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  oceanButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#36516a',
    backgroundColor: '#12212d',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  oceanButtonSelected: {
    backgroundColor: '#17384d',
    borderColor: '#56a4d3',
  },
  oceanButtonSelectedAtlantic: {
    backgroundColor: '#5a351f',
    borderColor: '#f2b56d',
  },
  oceanButtonLabel: {
    color: '#eef4fa',
    fontSize: 14,
    fontWeight: '700',
  },
  controlButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#314154',
    backgroundColor: '#18212d',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#235145',
    borderColor: '#5bc3a7',
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  controlButtonLabel: {
    color: '#eef4fa',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonLabel: {
    color: '#effcf8',
    fontSize: 14,
    fontWeight: '800',
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  winText: {
    color: '#6fd9b6',
  },
  lossText: {
    color: '#f1b27c',
  },
});
