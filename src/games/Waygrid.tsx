import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  canMergeCell,
  canSurveyCell,
  createInitialState,
  destinationValue,
  generatePuzzle,
  remainingUnsealed,
  sealedPlazaCount,
  selectedValue,
  type WaygridDifficulty,
  type WaygridState,
} from '../solvers/Waygrid.solver';

const DIFFICULTIES: WaygridDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: WaygridDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Waygrid() {
  const [difficulty, setDifficulty] = useState<WaygridDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<WaygridState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: WaygridDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const selected = state.selectedCell;
  const selectedCount = selectedValue(state);
  const canMerge = canMergeCell(state, selected.row, selected.col);
  const canSurvey = canSurveyCell(state, selected.row, selected.col);
  const surveyCost = puzzle.surveyCosts[selected.row][selected.col];
  const north = selected.row > 0 ? state.sealedCounts[selected.row - 1][selected.col] : null;
  const west = selected.col > 0 ? state.sealedCounts[selected.row][selected.col - 1] : null;

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Grid</Text>
          <Text style={styles.summaryValue}>{`${puzzle.rows} x ${puzzle.cols}`}</Text>
          <Text style={styles.summaryMeta}>origin to southeast gate</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Gate Ways</Text>
          <Text style={styles.summaryValue}>{destinationValue(state) ?? '?'}</Text>
          <Text style={styles.summaryMeta}>final route count</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Sealed</Text>
          <Text style={styles.summaryValue}>{sealedPlazaCount(state)}</Text>
          <Text style={styles.summaryMeta}>{remainingUnsealed(state)} interior plazas open</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Plaza Ledger</Text>
        <View style={styles.gridWrap}>
          {Array.from({ length: puzzle.rows }, (_, row) => (
            <View key={`row-${row}`} style={styles.gridRow}>
              {Array.from({ length: puzzle.cols }, (_, col) => {
                const isSelected = selected.row === row && selected.col === col;
                const value = state.sealedCounts[row][col];
                const isBorder = row === 0 || col === 0;
                const ready = canMergeCell(state, row, col);
                const tileSurveyCost = puzzle.surveyCosts[row][col];
                return (
                  <Pressable
                    key={`cell-${row}-${col}`}
                    onPress={() => setState((current) => applyMove(current, { type: 'select', row, col }))}
                    style={[
                      styles.cell,
                      isBorder && styles.cellBorder,
                      value !== null && styles.cellSealed,
                      ready && styles.cellReady,
                      isSelected && styles.cellSelected,
                    ]}
                  >
                    <Text style={styles.cellLabel}>{`${row + 1},${col + 1}`}</Text>
                    <Text style={styles.cellValue}>{value ?? '?'}</Text>
                    <Text style={styles.cellMeta}>
                      {isBorder ? 'edge' : value !== null ? 'sealed' : ready ? 'ready' : `survey ${tileSurveyCost}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Audit Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.logWrap}>
            {state.history.slice(0, 8).map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.logChip}>
                <Text style={styles.logText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            Start near the northwest corner. Border plazas are already certified at one route each, and the interior must be sealed from those feeder counts.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Ledger Rules</Text>
        <Text style={styles.infoLine}>Top-row and west-column plazas begin sealed at 1 route each.</Text>
        <Text style={styles.infoLine}>Merge North + West seals one interior plaza in 1 action when both feeder plazas are already sealed.</Text>
        <Text style={styles.infoLine}>Survey Plaza reveals a correct route count directly, but it burns the full recount tax shown on that plaza.</Text>
      </View>

      <View style={styles.selectedCard}>
        <Text style={styles.cardTitle}>{`Selected Plaza ${selected.row + 1}-${selected.col + 1}`}</Text>
        <Text style={styles.selectedValue}>{selectedCount ?? '?'}</Text>
        <Text style={styles.selectedMeta}>
          {selected.row === 0 && selected.col === 0
            ? 'Origin plaza. Exactly one route starts the ledger.'
            : selected.row === 0 || selected.col === 0
              ? 'Border plaza. Exactly one route reaches every plaza on the top row or west column.'
              : selectedCount !== null
                ? 'Already sealed.'
                : canMerge
                  ? `Ready now: north ${north} plus west ${west}.`
                  : `Not ready yet. Survey for ${surveyCost} actions, or seal north ${selected.row}-${selected.col + 1} and west ${selected.row + 1}-${selected.col} first.`}
        </Text>
      </View>

      <View style={styles.feederRow}>
        <View style={styles.feederCard}>
          <Text style={styles.feederLabel}>North Feed</Text>
          <Text style={styles.feederValue}>{north ?? '—'}</Text>
        </View>
        <View style={styles.feederCard}>
          <Text style={styles.feederLabel}>West Feed</Text>
          <Text style={styles.feederValue}>{west ?? '—'}</Text>
        </View>
        <View style={styles.feederCard}>
          <Text style={styles.feederLabel}>Survey Tax</Text>
          <Text style={styles.feederValue}>{selected.row === 0 || selected.col === 0 ? '—' : surveyCost}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'merge', row: selected.row, col: selected.col }))}
          disabled={!canMerge || Boolean(state.verdict)}
          style={[styles.controlButton, !canMerge || state.verdict ? styles.controlButtonDisabled : styles.primaryButton]}
        >
          <Text style={[styles.controlLabel, canMerge && !state.verdict ? styles.primaryLabel : null]}>Merge North + West</Text>
        </Pressable>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'survey', row: selected.row, col: selected.col }))}
          disabled={!canSurvey || Boolean(state.verdict)}
          style={[styles.controlButton, (!canSurvey || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlLabel}>
            {selected.row > 0 && selected.col > 0 ? `Survey Plaza (${surveyCost})` : 'Survey Plaza'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetLabel}>Reset Grid</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetLabel}>New Grid</Text>
        </Pressable>
      </View>

      <Text style={styles.messageText}>{state.message}</Text>
      {state.verdict ? (
        <Text style={[styles.verdictText, state.verdict.correct ? styles.winText : styles.lossText]}>
          {state.verdict.label}
        </Text>
      ) : null}
    </View>
  );

  return (
    <GameScreenTemplate
      title="Waygrid"
      emoji="WG"
      subtitle="2D dynamic programming for Unique Paths"
      objective="Seal the full street ledger from the northwest origin to the southeast gate. Border plazas are free base cases; every interior plaza should inherit north plus west before the audit clock expires."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Grid', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((entry) => ({
        label: String(entry),
        selected: entry === difficulty,
        onPress: () => switchDifficulty(entry),
      }))}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        title: 'What This Teaches',
        summary:
          'Waygrid turns Unique Paths into a full route ledger: the top row and west column are base cases, and every interior plaza becomes the sum of the already sealed north and west feeders.',
        takeaway:
          'Sealing plaza `(r, c)` from north plus west maps to `dp[r][c] = dp[r - 1][c] + dp[r][c - 1]`, with border cells fixed at `1`.',
      }}
      leetcodeLinks={[
        {
          id: 62,
          title: 'Unique Paths',
          url: 'https://leetcode.com/problems/unique-paths/',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#16181d',
    borderWidth: 1,
    borderColor: '#2d3640',
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    color: '#d9e4ef',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryValue: {
    color: '#f7fbff',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#8da0b3',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: '#121a22',
    borderWidth: 1,
    borderColor: '#2b3744',
    padding: 14,
    gap: 12,
  },
  gridWrap: {
    gap: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    flex: 1,
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: '#1b2330',
    borderWidth: 1,
    borderColor: '#324150',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cellBorder: {
    backgroundColor: '#162532',
    borderColor: '#44789b',
  },
  cellSealed: {
    backgroundColor: '#173127',
    borderColor: '#3f8f6d',
  },
  cellReady: {
    backgroundColor: '#332912',
    borderColor: '#c28b1e',
  },
  cellSelected: {
    borderColor: '#f1f5f9',
    borderWidth: 2,
  },
  cellLabel: {
    color: '#b8c7d6',
    fontSize: 11,
    fontWeight: '700',
  },
  cellValue: {
    color: '#f8fbff',
    fontSize: 21,
    fontWeight: '800',
  },
  cellMeta: {
    color: '#9eb1c5',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logWrap: {
    gap: 8,
  },
  logChip: {
    borderRadius: 12,
    backgroundColor: '#1a2230',
    borderWidth: 1,
    borderColor: '#314052',
    padding: 10,
  },
  logText: {
    color: '#d9e5f2',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    color: '#9cb0c3',
    fontSize: 13,
    lineHeight: 19,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#151d27',
    borderWidth: 1,
    borderColor: '#2a3744',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#dce8f3',
    fontSize: 13,
    lineHeight: 18,
  },
  selectedCard: {
    borderRadius: 16,
    backgroundColor: '#101820',
    borderWidth: 1,
    borderColor: '#27445c',
    padding: 14,
    gap: 8,
  },
  selectedValue: {
    color: '#f7fbff',
    fontSize: 28,
    fontWeight: '800',
  },
  selectedMeta: {
    color: '#d7e5f0',
    fontSize: 13,
    lineHeight: 19,
  },
  feederRow: {
    flexDirection: 'row',
    gap: 10,
  },
  feederCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#1a2230',
    borderWidth: 1,
    borderColor: '#314052',
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  feederLabel: {
    color: '#93a7bb',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  feederValue: {
    color: '#f7fbff',
    fontSize: 22,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 13,
    paddingHorizontal: 12,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  primaryButton: {
    backgroundColor: '#c48a17',
    borderColor: '#d8a53d',
  },
  controlLabel: {
    color: '#f4f7fb',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryLabel: {
    color: '#1b1404',
  },
  resetButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#314052',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17202a',
  },
  resetLabel: {
    color: '#dce8f3',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#d9e5f2',
    fontSize: 13,
    lineHeight: 18,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  winText: {
    color: '#7dd3a5',
  },
  lossText: {
    color: '#f59e9e',
  },
});
