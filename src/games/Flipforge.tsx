import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  canChooseLane,
  canScoutIndex,
  canSealIndex,
  chosenValues,
  createInitialState,
  currentMultiplier,
  generatePuzzle,
  globalBestSoFar,
  laneLabel,
  laneValueForSelection,
  remainingIndices,
  scoutCostForIndex,
  sealedIndexCount,
  selectedCandidates,
  type FlipforgeDifficulty,
  type FlipforgeLaneId,
  type FlipforgeState,
} from '../solvers/Flipforge.solver';

const DIFFICULTIES: FlipforgeDifficulty[] = [1, 2, 3, 4, 5];
const LANES: FlipforgeLaneId[] = ['solo', 'crown', 'shade'];

function buildPuzzle(difficulty: FlipforgeDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function formatValue(value: number | null) {
  return value === null ? '?' : String(value);
}

export default function Flipforge() {
  const [difficulty, setDifficulty] = useState<FlipforgeDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<FlipforgeState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: FlipforgeDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const activeIndex = state.selectedIndex;
  const multiplier = currentMultiplier(state);
  const candidates = selectedCandidates(state);
  const prepared = chosenValues(state);
  const bestSoFar = globalBestSoFar(state);
  const scoutCost =
    activeIndex < puzzle.multipliers.length ? scoutCostForIndex(puzzle, activeIndex) : null;

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Strip</Text>
          <Text style={styles.summaryValue}>{puzzle.multipliers.length}</Text>
          <Text style={styles.summaryMeta}>signed multipliers</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Best Crown</Text>
          <Text style={styles.summaryValue}>{bestSoFar ?? '?'}</Text>
          <Text style={styles.summaryMeta}>strongest sealed span</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Sealed</Text>
          <Text style={styles.summaryValue}>{sealedIndexCount(state)}</Text>
          <Text style={styles.summaryMeta}>{remainingIndices(state)} left</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Multiplier Strip</Text>
        <View style={styles.stripRow}>
          {puzzle.multipliers.map((value, index) => {
            const sealed = state.sealedPairs[index];
            const isCurrent = index === activeIndex && !state.verdict;
            const isDone = sealed !== null;
            return (
              <View
                key={`multiplier-${index}`}
                style={[
                  styles.multiplierCard,
                  isCurrent && styles.multiplierCardCurrent,
                  isDone && styles.multiplierCardDone,
                ]}
              >
                <Text style={styles.indexLabel}>{`Index ${index + 1}`}</Text>
                <Text style={styles.multiplierValue}>{value}</Text>
                <Text style={styles.multiplierMeta}>
                  {isDone
                    ? `C ${sealed.crown} / S ${sealed.shade}`
                    : isCurrent
                      ? 'choose now'
                      : 'pending'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Forge Notes</Text>
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
            The forge only trusts contiguous spans ending at the current index. A negative multiplier can reverse which live lane is valuable next.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Forge Rules</Text>
        <Text style={styles.infoLine}>`Start Here` begins a new span at the current multiplier.</Text>
        <Text style={styles.infoLine}>`Carry Crown` multiplies the prior live best ending-here product by the current multiplier.</Text>
        <Text style={styles.infoLine}>`Flip Shade` multiplies the prior live worst ending-here product by the current multiplier.</Text>
      </View>

      <View style={styles.selectedCard}>
        <Text style={styles.cardTitle}>
          {activeIndex < puzzle.multipliers.length
            ? `Current Index ${activeIndex + 1}`
            : 'Strip Sealed'}
        </Text>
        <Text style={styles.selectedValue}>{multiplier ?? puzzle.optimalBest}</Text>
        <Text style={styles.selectedMeta}>
          {multiplier === null
            ? `Every index is sealed. Best product ${puzzle.optimalBest}.`
            : `Multiplier ${multiplier}. Prepare one crown lane and one shade lane, or scout this index for ${scoutCost} actions.`}
        </Text>
      </View>

      <View style={styles.choiceCard}>
        <Text style={styles.choiceTitle}>Choose Crown</Text>
        <View style={styles.choiceRow}>
          {LANES.map((lane) => {
            const value = laneValueForSelection(state, lane);
            const available = canChooseLane(state, lane);
            const selected = state.chosenCrown === lane;
            return (
              <Pressable
                key={`crown-${lane}`}
                onPress={() => setState((current) => applyMove(current, { type: 'choose_crown', lane }))}
                disabled={!available}
                style={[
                  styles.choiceButton,
                  selected && styles.choiceButtonSelected,
                  !available && styles.choiceButtonDisabled,
                ]}
              >
                <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>
                  {`${laneLabel(lane)} (${formatValue(value)})`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.choiceCard}>
        <Text style={styles.choiceTitle}>Choose Shade</Text>
        <View style={styles.choiceRow}>
          {LANES.map((lane) => {
            const value = laneValueForSelection(state, lane);
            const available = canChooseLane(state, lane);
            const selected = state.chosenShade === lane;
            return (
              <Pressable
                key={`shade-${lane}`}
                onPress={() => setState((current) => applyMove(current, { type: 'choose_shade', lane }))}
                disabled={!available}
                style={[
                  styles.choiceButton,
                  selected && styles.choiceButtonSelected,
                  !available && styles.choiceButtonDisabled,
                ]}
              >
                <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>
                  {`${laneLabel(lane)} (${formatValue(value)})`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.preparedCard}>
        <Text style={styles.cardTitle}>Prepared Pair</Text>
        <Text style={styles.preparedText}>{`Crown ${formatValue(prepared.crown)} · Shade ${formatValue(prepared.shade)}`}</Text>
        <Text style={styles.selectedMeta}>
          {candidates
            ? `Available now: solo ${candidates.solo}, crown ${formatValue(candidates.crown)}, shade ${formatValue(candidates.shade)}.`
            : 'No live candidates remain.'}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'seal' }))}
          disabled={!canSealIndex(state)}
          style={[
            styles.controlButton,
            canSealIndex(state) && styles.primaryButton,
            !canSealIndex(state) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={[styles.controlLabel, canSealIndex(state) && styles.primaryLabel]}>
            Seal Index
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'scout' }))}
          disabled={!canScoutIndex(state)}
          style={[styles.controlButton, !canScoutIndex(state) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlLabel}>{`Scout Index (${scoutCost ?? 0})`}</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetLabel}>Reset Strip</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetLabel}>New Strip</Text>
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
      title="Flipforge"
      emoji="FF"
      subtitle="1D dynamic programming for Maximum Product Subarray"
      objective="Seal one crown and one shade at every multiplier. At each index, compare starting fresh against extending the prior crown or prior shade; the strongest crown seen anywhere wins."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Strip', onPress: rerollPuzzle, tone: 'primary' },
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
          'Flipforge turns Maximum Product Subarray into a dual-extreme ledger. Each index keeps the best and worst product ending there because the next negative multiplier can swap which lane becomes valuable.',
        takeaway:
          'Sealing the crown maps to `maxEndingHere = max(value, value * prevMax, value * prevMin)`. Sealing the shade maps to `minEndingHere = min(value, value * prevMax, value * prevMin)`. The final answer is the largest crown seen across the strip.',
      }}
      leetcodeLinks={[
        {
          id: 152,
          title: 'Maximum Product Subarray',
          url: 'https://leetcode.com/problems/maximum-product-subarray/',
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
    backgroundColor: '#16181d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2e3440',
    padding: 12,
    gap: 4,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
  },
  summaryMeta: {
    fontSize: 12,
    color: '#8e9bb3',
  },
  sectionCard: {
    backgroundColor: '#16181d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2e3440',
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  stripRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  multiplierCard: {
    width: '31%',
    minWidth: 92,
    backgroundColor: '#1d222b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#323948',
    padding: 12,
    gap: 4,
  },
  multiplierCardCurrent: {
    borderColor: '#f59e0b',
    backgroundColor: '#2b2216',
  },
  multiplierCardDone: {
    borderColor: '#1f7a62',
    backgroundColor: '#132b28',
  },
  indexLabel: {
    fontSize: 12,
    color: '#9fb0c7',
  },
  multiplierValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
  },
  multiplierMeta: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  logWrap: {
    gap: 8,
  },
  logChip: {
    backgroundColor: '#202632',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  logText: {
    fontSize: 13,
    color: '#d7e0ee',
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 19,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    backgroundColor: '#16181d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2e3440',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    fontSize: 13,
    color: '#d7e0ee',
    lineHeight: 19,
  },
  selectedCard: {
    backgroundColor: '#1a2230',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374154',
    padding: 14,
    gap: 4,
  },
  selectedValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
  },
  selectedMeta: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  choiceCard: {
    gap: 8,
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  choiceRow: {
    gap: 8,
  },
  choiceButton: {
    backgroundColor: '#16181d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2e3440',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  choiceButtonSelected: {
    borderColor: '#f59e0b',
    backgroundColor: '#2b2216',
  },
  choiceButtonDisabled: {
    opacity: 0.45,
  },
  choiceLabel: {
    fontSize: 13,
    color: '#d7e0ee',
    fontWeight: '600',
  },
  choiceLabelSelected: {
    color: '#fff7ed',
  },
  preparedCard: {
    backgroundColor: '#16181d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2e3440',
    padding: 14,
    gap: 4,
  },
  preparedText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#1c2432',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#384254',
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.42,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  controlLabel: {
    color: '#e5edf8',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryLabel: {
    color: '#1f1300',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#16181d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2e3440',
    paddingVertical: 11,
    alignItems: 'center',
  },
  resetLabel: {
    color: '#d7e0ee',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    fontSize: 13,
    color: '#d7e0ee',
    lineHeight: 19,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  winText: {
    color: '#86efac',
  },
  lossText: {
    color: '#fca5a5',
  },
});
