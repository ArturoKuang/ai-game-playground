import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  canScoutStep,
  canWeaveStep,
  createInitialState,
  generatePuzzle,
  remainingUnsealed,
  scoutCostForStep,
  sealedStepCount,
  selectedValue,
  type SteploomDifficulty,
  type SteploomState,
} from '../solvers/Steploom.solver';

const DIFFICULTIES: SteploomDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: SteploomDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function stairRows(state: SteploomState) {
  return Array.from({ length: state.puzzle.summit + 1 }, (_, index) => state.puzzle.summit - index);
}

export default function Steploom() {
  const [difficulty, setDifficulty] = useState<SteploomDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<SteploomState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: SteploomDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const selected = state.selectedStep;
  const selectedCount = selectedValue(state);
  const canWeave = canWeaveStep(state, selected);
  const canScout = canScoutStep(state, selected);
  const scoutCost = selected > 1 ? scoutCostForStep(puzzle, selected) : 0;

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Summit</Text>
          <Text style={styles.summaryValue}>{puzzle.summit}</Text>
          <Text style={styles.summaryMeta}>highest stair to certify</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Summit Ways</Text>
          <Text style={styles.summaryValue}>{state.sealedCounts[puzzle.summit] ?? '?'}</Text>
          <Text style={styles.summaryMeta}>final route count</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Sealed</Text>
          <Text style={styles.summaryValue}>{sealedStepCount(state)}</Text>
          <Text style={styles.summaryMeta}>{remainingUnsealed(state)} unresolved above base</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Stair Ribbon</Text>
        <View style={styles.stairStack}>
          {stairRows(state).map((step) => {
            const isBase = step <= 1;
            const isSelected = step === selected;
            const isSealed = state.sealedCounts[step] !== null;
            const readyToWeave = canWeaveStep(state, step);

            return (
              <Pressable
                key={`stair-${step}`}
                onPress={() => setState((current) => applyMove(current, { type: 'select', step }))}
                style={[
                  styles.stairCard,
                  { marginLeft: (puzzle.summit - step) * 18 },
                  isSelected && styles.stairCardSelected,
                  isSealed && styles.stairCardSealed,
                  readyToWeave && styles.stairCardReady,
                ]}
              >
                <View style={styles.stairHeader}>
                  <Text style={styles.stairLabel}>{`Stair ${step}`}</Text>
                  <Text style={styles.stairTag}>
                    {isBase ? 'base' : isSealed ? 'sealed' : readyToWeave ? 'ready' : 'open'}
                  </Text>
                </View>
                <Text style={styles.stairValue}>{state.sealedCounts[step] ?? '?'}</Text>
                <Text style={styles.stairMeta}>
                  {isBase
                    ? '1 route from the base case'
                    : isSealed
                      ? 'count certified'
                      : `scout tax ${scoutCostForStep(puzzle, step)}`}
                </Text>
              </Pressable>
            );
          })}
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
            Start by selecting an unresolved stair. The summit becomes cheap only after the lower ribbon is already sealed.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Loom Rules</Text>
        <Text style={styles.infoLine}>Base stairs 0 and 1 are pre-sealed at 1 route each.</Text>
        <Text style={styles.infoLine}>Weave From Two certifies the selected stair from the two sealed stairs beneath it for 1 action.</Text>
        <Text style={styles.infoLine}>Scout Routes certifies the selected stair directly, but it burns the full recount cost shown on that stair.</Text>
      </View>

      <View style={styles.selectedCard}>
        <Text style={styles.cardTitle}>{`Selected Stair ${selected}`}</Text>
        <Text style={styles.selectedValue}>{selectedCount ?? '?'}</Text>
        <Text style={styles.selectedMeta}>
          {selected <= 1
            ? 'Base case. Exactly one route reaches this stair.'
            : state.sealedCounts[selected] !== null
              ? 'Already sealed.'
              : canWeave
                ? `Ready to weave from stairs ${selected - 1} and ${selected - 2}.`
                : `Not ready yet. Scout for ${scoutCost} actions, or seal stairs ${selected - 1} and ${selected - 2} first.`}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'weave' }))}
          disabled={!canWeave || Boolean(state.verdict)}
          style={[styles.controlButton, !canWeave || state.verdict ? styles.controlButtonDisabled : styles.primaryButton]}
        >
          <Text style={[styles.controlLabel, canWeave && !state.verdict ? styles.primaryLabel : null]}>Weave From Two</Text>
        </Pressable>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'scout' }))}
          disabled={!canScout || Boolean(state.verdict)}
          style={[styles.controlButton, (!canScout || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlLabel}>{selected > 1 ? `Scout Routes (${scoutCost})` : 'Scout Routes'}</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetLabel}>Reset Stair</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetLabel}>New Stair</Text>
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
      title="Steploom"
      emoji="SL"
      subtitle="1D dynamic programming for Climbing Stairs"
      objective="Seal the summit route count before the audit clock expires. Recounting from scratch works on short rises, but the scalable play is to certify each stair once from the two sealed stairs beneath it."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Stair', onPress: rerollPuzzle, tone: 'primary' },
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
          'Steploom turns Climbing Stairs into a route ledger: each stair count is certified exactly once from the two counts beneath it, instead of recursively recounting every route to the top.',
        takeaway:
          'Weaving stair `i` from stairs `i - 1` and `i - 2` maps to `dp[i] = dp[i - 1] + dp[i - 2]`, with base seals `dp[0] = 1` and `dp[1] = 1`.',
      }}
      leetcodeLinks={[
        {
          id: 70,
          title: 'Climbing Stairs',
          url: 'https://leetcode.com/problems/climbing-stairs/',
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
    fontSize: 26,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#9aa7b5',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    gap: 12,
  },
  stairStack: {
    gap: 10,
  },
  stairCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#17191f',
    borderWidth: 1,
    borderColor: '#2b3138',
    gap: 6,
  },
  stairCardSelected: {
    borderColor: '#71c7ff',
    backgroundColor: '#112433',
  },
  stairCardSealed: {
    backgroundColor: '#14211d',
    borderColor: '#2f6a55',
  },
  stairCardReady: {
    borderColor: '#c7a53a',
  },
  stairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stairLabel: {
    color: '#f4f8fb',
    fontSize: 15,
    fontWeight: '700',
  },
  stairTag: {
    color: '#a9b5c2',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stairValue: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
  },
  stairMeta: {
    color: '#9aa7b5',
    fontSize: 12,
  },
  logWrap: {
    gap: 8,
  },
  logChip: {
    borderRadius: 12,
    backgroundColor: '#151a21',
    borderWidth: 1,
    borderColor: '#29313c',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  logText: {
    color: '#dbe4ec',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    color: '#9aa7b5',
    fontSize: 13,
    lineHeight: 20,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#151b22',
    borderWidth: 1,
    borderColor: '#29313c',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#d6e0ea',
    fontSize: 13,
    lineHeight: 19,
  },
  selectedCard: {
    borderRadius: 16,
    backgroundColor: '#171d26',
    borderWidth: 1,
    borderColor: '#2f3945',
    padding: 14,
    gap: 6,
  },
  selectedValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  selectedMeta: {
    color: '#9aa7b5',
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2f3945',
    backgroundColor: '#171c23',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  primaryButton: {
    backgroundColor: '#19466d',
    borderColor: '#4aa8f5',
  },
  controlLabel: {
    color: '#e4ebf2',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryLabel: {
    color: '#f7fbff',
  },
  resetButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12171d',
    borderWidth: 1,
    borderColor: '#2e3741',
  },
  resetLabel: {
    color: '#d7e0e8',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#d7e0e8',
    fontSize: 13,
    lineHeight: 20,
  },
  verdictText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  winText: {
    color: '#8ff0b1',
  },
  lossText: {
    color: '#ff9f95',
  },
});
