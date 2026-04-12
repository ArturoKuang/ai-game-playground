import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  anchorOptions,
  applyMove,
  canInheritTower,
  canScoutTower,
  canSoloTower,
  createInitialState,
  evaluateCrestchain,
  generatePuzzle,
  remainingUnsealed,
  scoutCostForTower,
  sealedTowerCount,
  selectedValue,
  type CrestchainDifficulty,
  type CrestchainState,
} from '../solvers/Crestchain.solver';

const DIFFICULTIES: CrestchainDifficulty[] = [1, 2, 3, 4, 5];
const EVALUATION = evaluateCrestchain();

function buildPuzzle(difficulty: CrestchainDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function markerState(state: CrestchainState, tower: number) {
  const sealed = state.sealedLengths[tower];
  if (sealed !== null) return 'sealed';
  return anchorOptions(state.puzzle, tower).length === 0 ? 'solo' : 'open';
}

export default function Crestchain() {
  const [difficulty, setDifficulty] = useState<CrestchainDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<CrestchainState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: CrestchainDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const selectedTower = state.selectedTower;
  const selectedHeight = puzzle.heights[selectedTower];
  const selectedLength = selectedValue(state);
  const options = anchorOptions(puzzle, selectedTower);
  const canSolo = canSoloTower(state, selectedTower);
  const canScout = canScoutTower(state, selectedTower);
  const scoutCost = scoutCostForTower(puzzle, selectedTower);
  const difficultyMetrics = EVALUATION.difficulties.find((entry) => entry.difficulty === difficulty);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Markers</Text>
          <Text style={styles.summaryValue}>{puzzle.heights.length}</Text>
          <Text style={styles.summaryMeta}>ridge posts</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Crown</Text>
          <Text style={styles.summaryValue}>
            {state.sealedLengths.every((value) => value === null)
              ? '?'
              : state.sealedLengths.reduce<number>(
                  (best, value) => (value !== null && value > best ? value : best),
                  0,
                )}
          </Text>
          <Text style={styles.summaryMeta}>best sealed rise</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Sealed</Text>
          <Text style={styles.summaryValue}>{sealedTowerCount(state)}</Text>
          <Text style={styles.summaryMeta}>{remainingUnsealed(state)} open</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Ridge Row</Text>
        <View style={styles.markerRow}>
          {puzzle.heights.map((height, tower) => {
            const isSelected = tower === selectedTower;
            const sealed = state.sealedLengths[tower] !== null;
            return (
              <Pressable
                key={`tower-${tower}`}
                onPress={() => setState((current) => applyMove(current, { type: 'select', tower }))}
                style={[
                  styles.markerCard,
                  isSelected && styles.markerCardSelected,
                  sealed && styles.markerCardSealed,
                ]}
              >
                <Text style={styles.markerLabel}>{`Tower ${tower + 1}`}</Text>
                <Text style={styles.markerHeight}>{height}</Text>
                <Text style={styles.markerMeta}>{`rise ${state.sealedLengths[tower] ?? '?'}`}</Text>
                <Text style={styles.markerState}>{markerState(state, tower)}</Text>
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
            Pick a marker and certify the best rise ending there. The scalable pattern is to compare every earlier lower badge, not just the nearest lower stone.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Ridge Rules</Text>
        <Text style={styles.infoLine}>Start Solo seals the selected marker at rise length 1.</Text>
        <Text style={styles.infoLine}>Any earlier lower sealed marker may feed the selected marker at one higher than its sealed badge.</Text>
        <Text style={styles.infoLine}>Scout Marker reveals the true badge directly, but it burns the full direct-search tax shown on that marker.</Text>
      </View>

      <View style={styles.selectedCard}>
        <Text style={styles.cardTitle}>{`Selected Tower ${selectedTower + 1}`}</Text>
        <Text style={styles.selectedValue}>{selectedLength ?? selectedHeight}</Text>
        <Text style={styles.selectedMeta}>
          {selectedLength !== null
            ? `Already sealed at rise ${selectedLength}.`
            : options.length === 0
              ? `Height ${selectedHeight} has no earlier lower anchors, so the correct rise starts at 1 unless you scout it.`
              : `Height ${selectedHeight} can inherit from ${options.length} earlier lower marker${options.length === 1 ? '' : 's'}.`}
        </Text>
      </View>

      <View style={styles.choiceCard}>
        <Text style={styles.choiceTitle}>Earlier Lower Anchors</Text>
        {options.length > 0 ? (
          <View style={styles.choiceStack}>
            {options.map((anchor) => {
              const ready = canInheritTower(state, selectedTower, anchor);
              const sealed = state.sealedLengths[anchor];
              const result = sealed === null ? '?' : sealed + 1;
              return (
                <Pressable
                  key={`${selectedTower}-${anchor}`}
                  onPress={() =>
                    setState((current) =>
                      applyMove(current, {
                        type: 'inherit',
                        tower: selectedTower,
                        anchor,
                      }),
                    )
                  }
                  disabled={!ready || Boolean(state.verdict)}
                  style={[
                    styles.choiceButton,
                    ready && !state.verdict && styles.choiceButtonReady,
                    (!ready || state.verdict) && styles.choiceButtonDisabled,
                  ]}
                >
                  <Text style={styles.choiceLabel}>{`Tower ${anchor + 1} · height ${puzzle.heights[anchor]}`}</Text>
                  <Text style={styles.choiceMeta}>
                    {sealed === null ? 'seal this anchor first' : `rise ${sealed} -> ${result}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyChoice}>No earlier lower anchors fit this marker.</Text>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'solo', tower: selectedTower }))}
          disabled={!canSolo || Boolean(state.verdict)}
          style={[
            styles.controlButton,
            canSolo && !state.verdict && styles.primaryButton,
            (!canSolo || state.verdict) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={[styles.controlLabel, canSolo && !state.verdict ? styles.primaryLabel : null]}>
            Start Solo (1)
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'scout', tower: selectedTower }))}
          disabled={!canScout || Boolean(state.verdict)}
          style={[styles.controlButton, (!canScout || state.verdict) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlLabel}>{`Scout Marker (${scoutCost})`}</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetLabel}>Reset Ridge</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetLabel}>New Ridge</Text>
        </Pressable>
      </View>

      <Text style={styles.messageText}>{state.message}</Text>
      {state.verdict ? (
        <Text style={[styles.verdictText, state.verdict.correct ? styles.winText : styles.lossText]}>
          {state.verdict.label}
        </Text>
      ) : null}

      {difficultyMetrics ? (
        <View style={styles.metricsCard}>
          <Text style={styles.cardTitle}>Solver Snapshot</Text>
          <Text style={styles.metricsLine}>{`Skill depth ${Math.round(difficultyMetrics.skillDepth * 100)}%`}</Text>
          <Text style={styles.metricsLine}>{`Nearest-lower solvability ${Math.round(difficultyMetrics.altSolvability * 100)}%`}</Text>
          <Text style={styles.metricsLine}>{`Counterintuitive anchors ${difficultyMetrics.counterintuitive.toFixed(1)}`}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <GameScreenTemplate
      title="Crestchain"
      emoji="CC"
      subtitle="1D dynamic programming for Longest Increasing Subsequence"
      objective="Certify the best rising badge ending at every marker before the ridge clock runs out. Each marker is either a solo start at 1 or one longer than the strongest earlier lower badge."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Ridge', onPress: rerollPuzzle, tone: 'primary' },
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
          'Crestchain turns Longest Increasing Subsequence into an endpoint ledger: every marker keeps the best rise ending exactly there, not one global trail. The right move is to compare every earlier lower badge and keep the strongest predecessor plus one.',
        takeaway:
          'The moment where a marker inherits from the strongest earlier lower badge maps to `dp[i] = 1 + max(dp[j])` over every `j < i` with `nums[j] < nums[i]`.',
      }}
      leetcodeLinks={[
        {
          id: 300,
          title: 'Longest Increasing Subsequence',
          url: 'https://leetcode.com/problems/longest-increasing-subsequence/',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#171923',
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: '#8f99b3',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#f5f7ff',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#b8c0d9',
    fontSize: 12,
  },
  sectionCard: {
    backgroundColor: '#131722',
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  markerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  markerCard: {
    width: '30%',
    minWidth: 96,
    backgroundColor: '#1d2333',
    borderRadius: 16,
    padding: 10,
    gap: 3,
    borderWidth: 1,
    borderColor: '#2b3550',
  },
  markerCardSelected: {
    borderColor: '#f2c46f',
    backgroundColor: '#292135',
  },
  markerCardSealed: {
    backgroundColor: '#1a2f2a',
    borderColor: '#2c7b58',
  },
  markerLabel: {
    color: '#dbe1f5',
    fontSize: 13,
    fontWeight: '700',
  },
  markerHeight: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  markerMeta: {
    color: '#9eabd1',
    fontSize: 12,
  },
  markerState: {
    color: '#8f99b3',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logChip: {
    backgroundColor: '#21283a',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logText: {
    color: '#d9def0',
    fontSize: 12,
  },
  emptyText: {
    color: '#b4bdd6',
    fontSize: 14,
    lineHeight: 20,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#171d2b',
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  infoLine: {
    color: '#d2d9ef',
    fontSize: 13,
    lineHeight: 18,
  },
  selectedCard: {
    backgroundColor: '#171d2b',
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  selectedValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  selectedMeta: {
    color: '#c7d0ea',
    fontSize: 13,
    lineHeight: 18,
  },
  choiceCard: {
    backgroundColor: '#171d2b',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  choiceTitle: {
    color: '#e8ecfa',
    fontSize: 14,
    fontWeight: '700',
  },
  choiceStack: {
    gap: 8,
  },
  choiceButton: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2c3550',
    backgroundColor: '#21283a',
    gap: 4,
  },
  choiceButtonReady: {
    borderColor: '#4f7cff',
    backgroundColor: '#1c2c56',
  },
  choiceButtonDisabled: {
    opacity: 0.55,
  },
  choiceLabel: {
    color: '#edf1ff',
    fontSize: 13,
    fontWeight: '700',
  },
  choiceMeta: {
    color: '#bcc6e5',
    fontSize: 12,
  },
  emptyChoice: {
    color: '#b4bdd6',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#222a3d',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  primaryButton: {
    backgroundColor: '#f2c46f',
  },
  controlLabel: {
    color: '#eef2ff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryLabel: {
    color: '#352300',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#151a28',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a3350',
  },
  resetLabel: {
    color: '#d9e1ff',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#d4dbf0',
    fontSize: 13,
    lineHeight: 19,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
  },
  winText: {
    color: '#7ce6a0',
  },
  lossText: {
    color: '#ff9c88',
  },
  metricsCard: {
    backgroundColor: '#171d2b',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  metricsLine: {
    color: '#c9d2ec',
    fontSize: 12,
  },
});
