import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';

type DifficultyId = 'easy' | 'medium' | 'hard';
type SpeciesId = 'robin' | 'tern' | 'heron' | 'ibis' | 'gull' | 'wren';

type Puzzle = {
  id: DifficultyId;
  label: string;
  title: string;
  queue: SpeciesId[];
  k: number;
  budget: number;
  helper: string;
};

type VerdictState = {
  correct: boolean;
  label: string;
};

type RoostState = {
  queueIndex: number;
  roosts: Record<string, number>;
  overflow: SpeciesId[];
  selectedLeaders: SpeciesId[];
  actionsUsed: number;
  perchedMoves: number;
  holdMoves: number;
  sweepMoves: number;
  message: string;
  verdict: VerdictState | null;
};

const SPECIES_META: Record<SpeciesId, { label: string; tint: string; glow: string }> = {
  robin: { label: 'Robin', tint: '#d86c52', glow: '#fff0eb' },
  tern: { label: 'Tern', tint: '#4d8ccf', glow: '#ecf5ff' },
  heron: { label: 'Heron', tint: '#648a66', glow: '#effaf0' },
  ibis: { label: 'Ibis', tint: '#b85e89', glow: '#fff1f8' },
  gull: { label: 'Gull', tint: '#8d7a57', glow: '#fff7ea' },
  wren: { label: 'Wren', tint: '#6b63ad', glow: '#f1eeff' },
};

const PUZZLES: Puzzle[] = [
  {
    id: 'easy',
    label: 'Easy',
    title: 'Morning Feed',
    queue: [
      'robin',
      'tern',
      'robin',
      'heron',
      'tern',
      'robin',
      'gull',
      'tern',
      'robin',
      'heron',
    ],
    k: 2,
    budget: 13,
    helper: 'You can toss a few birds into the net early, but repeated net sweeps get expensive fast.',
  },
  {
    id: 'medium',
    label: 'Medium',
    title: 'Noisy Midday Flock',
    queue: [
      'robin',
      'tern',
      'heron',
      'robin',
      'ibis',
      'tern',
      'robin',
      'gull',
      'heron',
      'tern',
      'robin',
      'ibis',
      'heron',
      'robin',
      'tern',
    ],
    k: 2,
    budget: 17,
    helper: 'Near ties make eyeballing unsafe. Building live counts is steadier than fixing a crowded net later.',
  },
  {
    id: 'hard',
    label: 'Hard',
    title: 'Storm Return',
    queue: [
      'robin',
      'tern',
      'heron',
      'ibis',
      'robin',
      'gull',
      'tern',
      'robin',
      'heron',
      'tern',
      'wren',
      'robin',
      'ibis',
      'heron',
      'robin',
      'gull',
      'tern',
      'ibis',
      'heron',
      'robin',
      'tern',
    ],
    k: 3,
    budget: 23,
    helper: 'The top three are close. Perch birds as they arrive or the rescue sweeps will blow the budget.',
  },
];

function buildInitialState(): RoostState {
  return {
    queueIndex: 0,
    roosts: {},
    overflow: [],
    selectedLeaders: [],
    actionsUsed: 0,
    perchedMoves: 0,
    holdMoves: 0,
    sweepMoves: 0,
    message:
      'Perch each bird into its species roost for a reusable running count, or toss it into the loose net and pay to sweep later.',
    verdict: null,
  };
}

function getCurrentBird(puzzle: Puzzle, queueIndex: number) {
  return puzzle.queue[queueIndex] ?? null;
}

function formatSpecies(species: SpeciesId) {
  return SPECIES_META[species].label;
}

function incrementCount(
  counts: Record<string, number>,
  species: SpeciesId,
  amount = 1,
) {
  return {
    ...counts,
    [species]: (counts[species] ?? 0) + amount,
  };
}

function countSpecies(list: SpeciesId[], species: SpeciesId) {
  return list.filter((entry) => entry === species).length;
}

function uniqueSpecies(list: SpeciesId[]) {
  return [...new Set(list)];
}

function getActualTopK(queue: SpeciesId[], k: number) {
  const counts = queue.reduce<Record<string, number>>((acc, species) => {
    acc[species] = (acc[species] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })
    .slice(0, k)
    .map(([species]) => species as SpeciesId);
}

export default function Roost() {
  const [difficultyId, setDifficultyId] = useState<DifficultyId>('easy');
  const puzzle = useMemo(
    () => PUZZLES.find((entry) => entry.id === difficultyId) ?? PUZZLES[0],
    [difficultyId],
  );
  const [state, setState] = useState<RoostState>(() => buildInitialState());

  const resetPuzzle = () => {
    setState(buildInitialState());
  };

  const switchDifficulty = (nextId: DifficultyId) => {
    setDifficultyId(nextId);
    setState(buildInitialState());
  };

  const perchCurrentBird = () => {
    setState((current) => {
      const currentBird = getCurrentBird(puzzle, current.queueIndex);
      if (!currentBird) {
        return {
          ...current,
          message: 'Every bird is already accounted for. Crown the busiest roosts.',
        };
      }

      return {
        ...current,
        queueIndex: current.queueIndex + 1,
        roosts: incrementCount(current.roosts, currentBird),
        actionsUsed: current.actionsUsed + 1,
        perchedMoves: current.perchedMoves + 1,
        message: `${formatSpecies(currentBird)} perched immediately. Its roost now holds ${(current.roosts[currentBird] ?? 0) + 1}.`,
        verdict: null,
      };
    });
  };

  const holdCurrentBird = () => {
    setState((current) => {
      const currentBird = getCurrentBird(puzzle, current.queueIndex);
      if (!currentBird) {
        return {
          ...current,
          message: 'Every bird has already passed through the gate. Sweep the net or crown the leaders.',
        };
      }

      return {
        ...current,
        queueIndex: current.queueIndex + 1,
        overflow: [...current.overflow, currentBird],
        actionsUsed: current.actionsUsed + 1,
        holdMoves: current.holdMoves + 1,
        message: `${formatSpecies(currentBird)} dropped into the loose net. It is still uncounted until you sweep it out.`,
        verdict: null,
      };
    });
  };

  const sweepOverflow = (species: SpeciesId) => {
    setState((current) => {
      if (current.overflow.length === 0) {
        return {
          ...current,
          message: 'The loose net is empty. No rescue sweep needed.',
        };
      }

      const rescuedCount = countSpecies(current.overflow, species);
      if (rescuedCount === 0) {
        return {
          ...current,
          message: `${formatSpecies(species)} is not in the loose net right now.`,
        };
      }

      const scanCost = current.overflow.length;
      return {
        ...current,
        overflow: current.overflow.filter((entry) => entry !== species),
        roosts: incrementCount(current.roosts, species, rescuedCount),
        actionsUsed: current.actionsUsed + scanCost,
        sweepMoves: current.sweepMoves + 1,
        message: `Swept ${rescuedCount} ${formatSpecies(species)} birds out of a ${scanCost}-bird net. The full rescan cost ${scanCost} actions.`,
        verdict: null,
      };
    });
  };

  const toggleLeader = (species: SpeciesId) => {
    setState((current) => {
      const isSelected = current.selectedLeaders.includes(species);
      if (isSelected) {
        return {
          ...current,
          selectedLeaders: current.selectedLeaders.filter((entry) => entry !== species),
          message: `${formatSpecies(species)} removed from the provisional winner board.`,
          verdict: null,
        };
      }

      if (current.selectedLeaders.length >= puzzle.k) {
        return {
          ...current,
          message: `You can only mark ${puzzle.k} leader${puzzle.k === 1 ? '' : 's'}. Unselect one roost first.`,
        };
      }

      return {
        ...current,
        selectedLeaders: [...current.selectedLeaders, species],
        message: `${formatSpecies(species)} marked as one of the top ${puzzle.k}.`,
        verdict: null,
      };
    });
  };

  const crownLeaders = () => {
    setState((current) => {
      if (current.queueIndex < puzzle.queue.length) {
        return {
          ...current,
          message: 'Birds are still arriving. Finish the queue before crowning the leaders.',
        };
      }

      if (current.selectedLeaders.length !== puzzle.k) {
        return {
          ...current,
          message: `Mark exactly ${puzzle.k} roosts before locking the podium.`,
        };
      }

      const expected = getActualTopK(puzzle.queue, puzzle.k);
      const selected = [...current.selectedLeaders].sort();
      const correctSelection =
        selected.length === expected.length &&
        selected.every((species, index) => species === [...expected].sort()[index]);
      const withinBudget = current.actionsUsed <= puzzle.budget;
      const correct = correctSelection && withinBudget;

      return {
        ...current,
        verdict: {
          correct,
          label: correct ? 'Leaders Confirmed' : 'Podium Rejected',
        },
        message: correct
          ? 'Correct. One-pass counting kept the roost ranking accurate and inside budget.'
          : !withinBudget
            ? 'Your picks may be close, but the rescue work cost too much. Recounting the net was the trap.'
            : `Not quite. The true busiest roosts were ${expected
                .map(formatSpecies)
                .join(', ')}.`,
      };
    });
  };

  const difficultyOptions = PUZZLES.map((entry) => ({
    label: entry.label,
    selected: entry.id === difficultyId,
    onPress: () => switchDifficulty(entry.id),
  }));

  const currentBird = getCurrentBird(puzzle, state.queueIndex);
  const remainingCount = puzzle.queue.length - state.queueIndex;
  const budgetLeft = puzzle.budget - state.actionsUsed;
  const overflowSpecies = uniqueSpecies(state.overflow);
  const selectedLeaderSet = new Set(state.selectedLeaders);
  const sortedRoosts = (Object.keys(state.roosts) as SpeciesId[]).sort((left, right) => {
    const countGap = (state.roosts[right] ?? 0) - (state.roosts[left] ?? 0);
    if (countGap !== 0) return countGap;
    return formatSpecies(left).localeCompare(formatSpecies(right));
  });
  const statsLabel = `${state.actionsUsed}/${puzzle.budget} actions`;

  const board = (
    <View style={styles.board}>
      <View style={styles.statusStrip}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Arrivals Left</Text>
          <Text style={styles.statusValue}>{remainingCount}</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Loose Net</Text>
          <Text style={styles.statusValue}>{state.overflow.length}</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Budget Left</Text>
          <Text
            style={[
              styles.statusValue,
              budgetLeft < 0 && styles.statusValueDanger,
            ]}
          >
            {budgetLeft}
          </Text>
        </View>
      </View>

      <View style={styles.currentCard}>
        <Text style={styles.currentEyebrow}>Current Arrival</Text>
        <Text style={styles.currentBird}>
          {currentBird ? formatSpecies(currentBird) : 'Queue cleared'}
        </Text>
        <Text style={styles.currentHint}>
          {currentBird
            ? 'Perch it now for a live count, or throw it into the loose net and pay to sweep later.'
            : 'No birds left in the queue. Sweep any leftovers, choose the top roosts, and crown the podium.'}
        </Text>
      </View>

      <View style={styles.queueCard}>
        <Text style={styles.sectionEyebrow}>Arrival Queue</Text>
        <View style={styles.queueWrap}>
          {puzzle.queue.map((species, index) => {
            const meta = SPECIES_META[species];
            const resolved = index < state.queueIndex;
            const active = index === state.queueIndex;
            return (
              <View
                key={`${species}-${index}`}
                style={[
                  styles.queueChip,
                  { borderColor: meta.tint, backgroundColor: resolved ? '#14221b' : '#14161f' },
                  active && styles.queueChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.queueChipLabel,
                    { color: resolved ? '#87d3a6' : meta.glow },
                  ]}
                >
                  {formatSpecies(species)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.roostSection}>
        <Text style={styles.sectionEyebrow}>Roost Towers</Text>
        {sortedRoosts.length === 0 ? (
          <Text style={styles.emptyText}>
            No roosts yet. The first strong move is usually to start counting immediately.
          </Text>
        ) : (
          <View style={styles.roostGrid}>
            {sortedRoosts.map((species) => {
              const meta = SPECIES_META[species];
              const count = state.roosts[species] ?? 0;
              const isSelected = selectedLeaderSet.has(species);
              return (
                <Pressable
                  key={species}
                  onPress={() => toggleLeader(species)}
                  style={[
                    styles.roostCard,
                    { borderColor: meta.tint },
                    isSelected && styles.roostCardSelected,
                  ]}
                >
                  <View style={styles.roostHeader}>
                    <Text style={[styles.roostTitle, { color: meta.glow }]}>
                      {formatSpecies(species)}
                    </Text>
                    <Text style={styles.roostCount}>{count}</Text>
                  </View>
                  <View style={styles.perchRow}>
                    {Array.from({ length: count }).map((_, perchIndex) => (
                      <View
                        key={`${species}-perch-${perchIndex}`}
                        style={[styles.perchBlock, { backgroundColor: meta.tint }]}
                      />
                    ))}
                  </View>
                  <Text style={styles.roostHint}>
                    {isSelected
                      ? `Marked for the top ${puzzle.k}`
                      : `Tap to mark as a leader`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.netCard}>
        <Text style={styles.sectionEyebrow}>Loose Net</Text>
        {state.overflow.length === 0 ? (
          <Text style={styles.emptyText}>
            The net is empty. That means your counts are already live.
          </Text>
        ) : (
          <View style={styles.netWrap}>
            {state.overflow.map((species, index) => {
              const meta = SPECIES_META[species];
              return (
                <View
                  key={`${species}-overflow-${index}`}
                  style={[
                    styles.netChip,
                    { borderColor: meta.tint, backgroundColor: '#1b171c' },
                  ]}
                >
                  <Text style={[styles.netChipLabel, { color: meta.glow }]}>
                    {formatSpecies(species)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controls}>
      <Text style={styles.controlsLabel}>Gate Actions</Text>
      <View style={styles.actionColumn}>
        <Pressable
          style={[styles.controlButton, styles.primaryButton]}
          onPress={perchCurrentBird}
        >
          <Text style={styles.controlButtonLabel}>Perch Current Bird</Text>
        </Pressable>

        <Pressable style={styles.controlButton} onPress={holdCurrentBird}>
          <Text style={styles.controlButtonLabel}>Toss Into Loose Net</Text>
        </Pressable>
      </View>

      <Text style={styles.controlsHint}>
        Perching now is one clean count update. A sweep rescans every bird still stuck in the net.
      </Text>

      <Text style={styles.controlsLabel}>Rescue Sweeps</Text>
      {overflowSpecies.length === 0 ? (
        <Text style={styles.controlsHint}>
          No sweep buttons yet because the net is empty.
        </Text>
      ) : (
        <View style={styles.sweepRow}>
          {overflowSpecies.map((species) => (
            <Pressable
              key={species}
              onPress={() => sweepOverflow(species)}
              style={styles.sweepChip}
            >
              <Text style={styles.sweepChipLabel}>
                Sweep {formatSpecies(species)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.controlsLabel}>Lock Answer</Text>
      <Text style={styles.controlsHint}>
        Mark exactly {puzzle.k} roosts, then crown the podium.
      </Text>
      <Pressable style={[styles.controlButton, styles.successButton]} onPress={crownLeaders}>
        <Text style={styles.controlButtonLabel}>Crown Top {puzzle.k}</Text>
      </Pressable>

      <Text style={styles.feedbackText}>{state.message}</Text>

      {state.verdict ? (
        <View
          style={[
            styles.verdictBanner,
            state.verdict.correct ? styles.verdictGood : styles.verdictBad,
          ]}
        >
          <Text style={styles.verdictLabel}>{state.verdict.label}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <GameScreenTemplate
      title="Roost"
      emoji="^"
      subtitle={puzzle.title}
      objective={`Keep live counts for the whole flock, then mark the top ${puzzle.k} busiest roosts before the budget runs out.`}
      statsLabel={statsLabel}
      actions={[{ label: 'Reset Puzzle', onPress: resetPuzzle, tone: 'neutral' }]}
      difficultyOptions={difficultyOptions}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        title: 'What this teaches after play',
        summary:
          'The winning move is to count each species once as it arrives, then read the tallest roosts instead of repeatedly rescanning the loose birds.',
        takeaway:
          'In code, that becomes a frequency map plus a highest-first readout: increment `count[bird]` once per arrival, then return the K species with the largest counts.',
      }}
      leetcodeLinks={[
        {
          id: 347,
          title: 'Top K Frequent Elements',
          url: 'https://leetcode.com/problems/top-k-frequent-elements/',
        },
      ]}
      footer={
        <Text style={styles.footerText}>
          The loose net is the trap. It keeps work looking postponable, but every rescue sweep is a full re-count.
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  board: {
    gap: 16,
  },
  statusStrip: {
    flexDirection: 'row',
    gap: 10,
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#171b24',
    borderWidth: 1,
    borderColor: '#2f394e',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 4,
  },
  statusLabel: {
    color: '#92a4c7',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  statusValue: {
    color: '#f6f8ff',
    fontSize: 22,
    fontWeight: '900',
  },
  statusValueDanger: {
    color: '#ff8a8a',
  },
  currentCard: {
    backgroundColor: '#111d1a',
    borderWidth: 1,
    borderColor: '#285248',
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  currentEyebrow: {
    color: '#80d7c3',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  currentBird: {
    color: '#f4fff9',
    fontSize: 30,
    fontWeight: '900',
  },
  currentHint: {
    color: '#b7dfd6',
    fontSize: 13,
    lineHeight: 20,
  },
  queueCard: {
    backgroundColor: '#10141d',
    borderWidth: 1,
    borderColor: '#263044',
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  sectionEyebrow: {
    color: '#a3b3d1',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  queueWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  queueChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  queueChipActive: {
    borderWidth: 2,
    transform: [{ scale: 1.04 }],
  },
  queueChipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  roostSection: {
    gap: 12,
  },
  roostGrid: {
    gap: 12,
  },
  roostCard: {
    backgroundColor: '#17141c',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  roostCardSelected: {
    shadowColor: '#ffffff',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  roostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roostTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  roostCount: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  perchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  perchBlock: {
    width: 18,
    height: 18,
    borderRadius: 6,
  },
  roostHint: {
    color: '#c4bfd8',
    fontSize: 12,
    lineHeight: 18,
  },
  netCard: {
    backgroundColor: '#17131a',
    borderWidth: 1,
    borderColor: '#3f3250',
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  emptyText: {
    color: '#b7bdd0',
    fontSize: 13,
    lineHeight: 20,
  },
  netWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  netChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  netChipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  controls: {
    gap: 14,
  },
  controlsLabel: {
    color: '#f5f7ff',
    fontSize: 15,
    fontWeight: '800',
  },
  controlsHint: {
    color: '#afb7cb',
    fontSize: 13,
    lineHeight: 20,
  },
  actionColumn: {
    gap: 10,
  },
  controlButton: {
    backgroundColor: '#1f2432',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#36415c',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#224b42',
    borderColor: '#2f7f6d',
  },
  successButton: {
    backgroundColor: '#4f3a18',
    borderColor: '#b98f3b',
  },
  controlButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  sweepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sweepChip: {
    backgroundColor: '#22212c',
    borderWidth: 1,
    borderColor: '#4b4a62',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  sweepChipLabel: {
    color: '#eff0ff',
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackText: {
    color: '#d6dbeb',
    fontSize: 13,
    lineHeight: 20,
  },
  verdictBanner: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  verdictGood: {
    backgroundColor: '#173924',
    borderWidth: 1,
    borderColor: '#3da466',
  },
  verdictBad: {
    backgroundColor: '#3d171d',
    borderWidth: 1,
    borderColor: '#c55b6f',
  },
  verdictLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  footerText: {
    color: '#c2cae0',
    fontSize: 13,
    lineHeight: 20,
  },
});
