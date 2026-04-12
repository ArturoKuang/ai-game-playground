import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentSum,
  formatTriplet,
  generatePuzzle,
  type TruceDifficulty,
  type TruceState,
  type TruceTriplet,
} from '../solvers/Truce.solver';

const DIFFICULTIES: TruceDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: TruceDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function labelForIndex(state: TruceState, index: number) {
  if (state.anchorIndex === index) return 'anchor';
  if (state.leftIndex === index) return 'left';
  if (state.rightIndex === index) return 'right';
  return '';
}

function isAudited(state: TruceState, triplet: TruceTriplet) {
  return state.auditedTriplets.some((entry) => formatTriplet(entry) === formatTriplet(triplet));
}

export default function Truce() {
  const [difficulty, setDifficulty] = useState<TruceDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<TruceState>(() => createInitialState(buildPuzzle(1, 0)));

  const trio = useMemo(() => {
    if (state.anchorIndex >= puzzle.envoys.length - 2 || state.leftIndex >= state.rightIndex) {
      return null;
    }
    return [
      puzzle.envoys[state.anchorIndex],
      puzzle.envoys[state.leftIndex],
      puzzle.envoys[state.rightIndex],
    ] as TruceTriplet;
  }, [puzzle.envoys, state.anchorIndex, state.leftIndex, state.rightIndex]);

  const sum = useMemo(() => currentSum(state), [state]);

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

  const switchDifficulty = (nextDifficulty: TruceDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (
    move:
      | 'raiseLeft'
      | 'lowerRight'
      | 'claim'
      | 'nextAnchor'
      | 'audit'
      | 'finish',
  ) => {
    setState((current) => applyMove(current, { type: move }));
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>{puzzle.label}</Text>
        <Text style={styles.titleText}>{puzzle.title}</Text>
        <Text style={styles.titleHint}>Target balance: 0</Text>
      </View>

      <View style={styles.rowCard}>
        <Text style={styles.cardTitle}>Sorted Envoys</Text>
        <View style={styles.envoyRow}>
          {puzzle.envoys.map((value, index) => {
            const role = labelForIndex(state, index);
            const active = role.length > 0 && !state.verdict;

            return (
              <View
                key={`${value}-${index}`}
                style={[
                  styles.envoyChip,
                  role === 'anchor' && styles.anchorChip,
                  role === 'left' && styles.leftChip,
                  role === 'right' && styles.rightChip,
                  active && styles.activeChip,
                ]}
              >
                <Text style={styles.envoyValue}>{value}</Text>
                <Text style={styles.envoyMeta}>{role || `i${index}`}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Live Trio</Text>
          <Text style={styles.summaryValue}>{trio ? formatTriplet(trio) : 'none'}</Text>
          <Text style={styles.summaryMeta}>
            {trio ? 'Anchor stays fixed while the inner pair moves.' : 'Anchor sweep exhausted.'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Current Sum</Text>
          <Text style={styles.summaryValue}>{sum ?? 'done'}</Text>
          <Text style={styles.summaryMeta}>
            {sum === null
              ? 'Advance or finish.'
              : sum < 0
                ? 'Need a larger total.'
                : sum > 0
                  ? 'Need a smaller total.'
                  : 'Exact balance found.'}
          </Text>
        </View>
      </View>

      <View style={styles.rowCard}>
        <Text style={styles.cardTitle}>Logged Accords</Text>
        <View style={styles.tripletRow}>
          {state.foundTriplets.length > 0 ? (
            state.foundTriplets.map((triplet) => (
              <View
                key={formatTriplet(triplet)}
                style={[
                  styles.tripletChip,
                  isAudited(state, triplet) && styles.auditedTripletChip,
                ]}
              >
                <Text style={styles.tripletText}>{formatTriplet(triplet)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No accords logged yet.</Text>
          )}
        </View>
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Sweep Rules</Text>
        <Text style={styles.infoLine}>Raise Left: move the inner left envoy one step right.</Text>
        <Text style={styles.infoLine}>Lower Right: move the inner right envoy one step left.</Text>
        <Text style={styles.infoLine}>
          Claim Accord only when the live trio sums to 0, then keep the same anchor alive.
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Fallback</Text>
        <Text style={styles.infoLine}>
          Full Audit: {puzzle.auditCost} actions to brute-force every remaining trio.
        </Text>
        <Text style={styles.infoLine}>Useful on warmups, fatal on later rosters.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('raiseLeft')}
          disabled={Boolean(state.verdict) || sum === null}
          style={[styles.controlButton, (state.verdict || sum === null) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Raise Left</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('claim')}
          disabled={Boolean(state.verdict) || sum === null}
          style={[styles.controlButton, styles.primaryButton, (state.verdict || sum === null) && styles.controlButtonDisabled]}
        >
          <Text style={styles.primaryButtonLabel}>Claim Accord</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('lowerRight')}
          disabled={Boolean(state.verdict) || sum === null}
          style={[styles.controlButton, (state.verdict || sum === null) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Lower Right</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('nextAnchor')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Advance Anchor</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('audit')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Full Audit</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => runMove('finish')} style={[styles.controlButton, styles.finishButton]}>
          <Text style={styles.primaryButtonLabel}>Finish Catalog</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Same Roster</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Roster</Text>
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
      title="Truce"
      emoji="0+"
      subtitle="Two-pointer 3Sum with a fixed anchor"
      objective="Catalog every unique trio that balances to zero. Fix one envoy as the anchor, then squeeze the two inner envoys based on whether the current total is too low or too high."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
        {
          label: 'New Roster',
          onPress: rerollPuzzle,
          tone: 'primary',
        },
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
          'This is the exact 3Sum loop on a sorted array: lock one anchor, move the left pointer when the sum is too small, move the right pointer when the sum is too large, and after a hit keep the same anchor alive until the inner sweep is finished.',
        takeaway:
          'The moment where a found accord does not end the anchor maps to the `while (left < right)` sweep inside each fixed `i` in the standard `3Sum` solution.',
      }}
      leetcodeLinks={[
        {
          id: 15,
          title: '3Sum',
          url: 'https://leetcode.com/problems/3sum/',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 12,
  },
  titleCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#564733',
    backgroundColor: '#221b12',
    padding: 16,
    gap: 6,
  },
  titleLabel: {
    color: '#f3cf98',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titleText: {
    color: '#fff3dd',
    fontSize: 20,
    fontWeight: '900',
  },
  titleHint: {
    color: '#d7c2a0',
    fontSize: 13,
  },
  rowCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#33434f',
    backgroundColor: '#141c22',
    padding: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#32414c',
    backgroundColor: '#182028',
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    color: '#eef5f9',
    fontSize: 14,
    fontWeight: '800',
  },
  envoyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  envoyChip: {
    minWidth: 62,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#43515a',
    backgroundColor: '#223038',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  anchorChip: {
    backgroundColor: '#5b3d17',
    borderColor: '#d9a55d',
  },
  leftChip: {
    backgroundColor: '#1b4153',
    borderColor: '#63afd0',
  },
  rightChip: {
    backgroundColor: '#4d2330',
    borderColor: '#d98098',
  },
  activeChip: {
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  envoyValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  envoyMeta: {
    color: '#d8e4ec',
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  summaryMeta: {
    color: '#b8c4cd',
    fontSize: 12,
    lineHeight: 17,
  },
  tripletRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tripletChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#588971',
    backgroundColor: '#193425',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  auditedTripletChip: {
    borderColor: '#93723a',
    backgroundColor: '#392a14',
  },
  tripletText: {
    color: '#eef8f1',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: '#93a3af',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#31424d',
    backgroundColor: '#131a20',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#c9d4dc',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#425462',
    backgroundColor: '#1c252c',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  primaryButton: {
    backgroundColor: '#26513c',
    borderColor: '#58ac7f',
  },
  finishButton: {
    backgroundColor: '#5c4218',
    borderColor: '#e2af63',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#f2f6f9',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryButtonLabel: {
    color: '#fffdf7',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  resetButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#39444d',
    backgroundColor: '#171d22',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  resetButtonLabel: {
    color: '#dce7ef',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  messageText: {
    color: '#d0dae2',
    fontSize: 13,
    lineHeight: 18,
  },
  verdictText: {
    fontSize: 15,
    fontWeight: '800',
  },
  winText: {
    color: '#80e7a7',
  },
  lossText: {
    color: '#ff9da6',
  },
});
