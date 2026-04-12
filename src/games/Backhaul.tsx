import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  generatePuzzle,
  pointerDirection,
  pointerTargetLabel,
  type BackhaulDifficulty,
  type BackhaulState,
} from '../solvers/Backhaul.solver';

const DIFFICULTIES: BackhaulDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: BackhaulDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Backhaul() {
  const [difficulty, setDifficulty] = useState<BackhaulDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<BackhaulState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: BackhaulDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'tagAhead' | 'flipBack' | 'march') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const anchorValue = useMemo(
    () => (state.anchor === null ? 'Dock' : puzzle.nodes[state.anchor]),
    [puzzle.nodes, state.anchor],
  );
  const liveValue = useMemo(
    () => (state.current === null ? 'Done' : puzzle.nodes[state.current]),
    [puzzle.nodes, state.current],
  );
  const scoutValue = useMemo(
    () => (state.scout === null ? (state.aheadSecured ? 'Tail' : 'Open') : puzzle.nodes[state.scout]),
    [puzzle.nodes, state.aheadSecured, state.scout],
  );

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>{puzzle.label}</Text>
        <Text style={styles.titleText}>{puzzle.title}</Text>
        <Text style={styles.titleHint}>
          One spare clip, one live hitch, one growing back-chain. Reverse the convoy without letting the remaining cars drift away.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Anchor</Text>
          <Text style={styles.summaryValue}>{anchorValue}</Text>
          <Text style={styles.summaryMeta}>
            {state.anchor === null ? 'Reversed chain starts at dock' : `Car ${state.anchor + 1}`}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Live Car</Text>
          <Text style={styles.summaryValue}>{liveValue}</Text>
          <Text style={styles.summaryMeta}>
            {state.current === null ? 'Convoy turned' : `Car ${state.current + 1}`}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Scout Clip</Text>
          <Text style={styles.summaryValue}>{scoutValue}</Text>
          <Text style={styles.summaryMeta}>
            {state.scout === null
              ? state.aheadSecured
                ? 'Tail already secured'
                : 'No saved forward car'
              : `Holding car ${state.scout + 1}`}
          </Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Cars Left</Text>
          <Text style={styles.summaryValue}>
            {state.current === null ? 0 : puzzle.nodes.length - state.current}
          </Text>
          <Text style={styles.summaryMeta}>Still unreversed</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Live Hitch</Text>
          <Text style={styles.summaryValue}>{state.currentFlipped ? 'Back' : 'Forward'}</Text>
          <Text style={styles.summaryMeta}>
            {state.currentFlipped ? 'Safe to march' : 'Clip ahead first'}
          </Text>
        </View>
      </View>

      <View style={styles.chainCard}>
        <Text style={styles.cardTitle}>Convoy Map</Text>
        <View style={styles.chainRow}>
          {puzzle.nodes.map((node, index) => {
            const isAnchor = state.anchor === index;
            const isCurrent = state.current === index;
            const isScout = state.scout === index;
            const isDone = state.current !== null && index < state.current;
            const isFinal = state.current === null;

            return (
              <View key={`${node}-${index}`} style={styles.carWrap}>
                <View
                  style={[
                    styles.carCard,
                    isDone && styles.carDone,
                    isAnchor && styles.carAnchor,
                    isCurrent && styles.carCurrent,
                    isScout && styles.carScout,
                    isFinal && styles.carFinal,
                  ]}
                >
                  <Text style={styles.carIndex}>Car {index + 1}</Text>
                  <Text style={styles.carValue}>{node}</Text>
                  <Text style={styles.carBadge}>
                    {isAnchor ? 'anchor' : isCurrent ? 'live' : isScout ? 'clip' : isDone ? 'turned' : 'queued'}
                  </Text>
                </View>
                <View style={styles.pointerWrap}>
                  <Text style={styles.pointerArrow}>{pointerDirection(state, index)}</Text>
                  <Text style={styles.pointerLabel}>{pointerTargetLabel(state, index)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.cardTitle}>Crew Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.logRow}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.logChip}>
                <Text style={styles.logText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No moves yet. The safe rhythm is to clip ahead, swing back, then march.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Yard Rules</Text>
        <Text style={styles.infoLine}>Clip Ahead: save the live car&apos;s forward neighbor in the spare clip.</Text>
        <Text style={styles.infoLine}>Swing Back: turn the live hitch toward the anchor or dock.</Text>
        <Text style={styles.infoLine}>March Anchor: make the swung car the new anchor and move onto the saved car.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('tagAhead')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Clip Ahead</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('flipBack')}
          disabled={Boolean(state.verdict)}
          style={[
            styles.controlButton,
            styles.primaryButton,
            state.verdict && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Swing Back</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('march')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>March Anchor</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Convoy</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Convoy</Text>
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
      title="Backhaul"
      emoji="BH"
      subtitle="Reverse a linked convoy one hitch at a time"
      objective="Turn the entire convoy around using one spare clip. Save the forward car, swing the live hitch backward, then march the anchor forward before the yard timer runs out."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
        {
          label: 'New Convoy',
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
          'This is the iterative linked-list reversal loop: save `next`, point `current.next` backward to `prev`, then advance `prev` and `current` onto the saved node.',
        takeaway:
          'Clip Ahead maps to `next = current.next`. Swing Back maps to `current.next = prev`. March Anchor maps to `prev = current; current = next` until `current` becomes null.',
      }}
      leetcodeLinks={[
        {
          id: 206,
          title: 'Reverse Linked List',
          url: 'https://leetcode.com/problems/reverse-linked-list/',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 16,
  },
  titleCard: {
    backgroundColor: '#1d1914',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4e3925',
    padding: 16,
    gap: 8,
  },
  titleLabel: {
    color: '#e0a86b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  titleText: {
    color: '#fff4e8',
    fontSize: 22,
    fontWeight: '800',
  },
  titleHint: {
    color: '#d9c0a7',
    fontSize: 14,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#151617',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30343a',
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    color: '#f2f4f7',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#b8bec7',
    fontSize: 12,
    lineHeight: 18,
  },
  chainCard: {
    backgroundColor: '#111315',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f353c',
    padding: 16,
    gap: 14,
  },
  chainRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  carWrap: {
    width: 94,
    gap: 6,
  },
  carCard: {
    backgroundColor: '#1c2024',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#353c44',
    padding: 10,
    gap: 4,
  },
  carDone: {
    backgroundColor: '#17211b',
    borderColor: '#355841',
  },
  carAnchor: {
    backgroundColor: '#1e2838',
    borderColor: '#5c84cc',
  },
  carCurrent: {
    backgroundColor: '#372316',
    borderColor: '#ca7a34',
  },
  carScout: {
    backgroundColor: '#1d2f2d',
    borderColor: '#58a79c',
  },
  carFinal: {
    backgroundColor: '#1b261f',
  },
  carIndex: {
    color: '#aeb6c1',
    fontSize: 11,
    fontWeight: '700',
  },
  carValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  carBadge: {
    color: '#e3e8ef',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pointerWrap: {
    backgroundColor: '#111315',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d3339',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  pointerArrow: {
    color: '#f1c082',
    fontSize: 16,
    fontWeight: '900',
  },
  pointerLabel: {
    color: '#c4cbd5',
    fontSize: 11,
    fontWeight: '700',
  },
  logCard: {
    backgroundColor: '#151617',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2d3137',
    padding: 16,
    gap: 12,
  },
  logRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#23262b',
    borderWidth: 1,
    borderColor: '#383d45',
  },
  logText: {
    color: '#ecf0f5',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#c0c7d0',
    fontSize: 14,
    lineHeight: 20,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    backgroundColor: '#17191c',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#30343b',
    padding: 16,
    gap: 10,
  },
  infoLine: {
    color: '#d4dae2',
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    minWidth: 130,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#44505d',
    backgroundColor: '#20252b',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#f4f7fa',
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#9f5f25',
    borderColor: '#d28d47',
  },
  primaryButtonLabel: {
    color: '#fff8ef',
    fontSize: 15,
    fontWeight: '900',
  },
  resetButton: {
    flex: 1,
    minWidth: 130,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#31363d',
    backgroundColor: '#171a1f',
    paddingVertical: 13,
    alignItems: 'center',
  },
  resetButtonLabel: {
    color: '#e5ebf3',
    fontSize: 14,
    fontWeight: '800',
  },
  messageText: {
    color: '#d7dee7',
    fontSize: 14,
    lineHeight: 20,
  },
  verdictText: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 22,
  },
  winText: {
    color: '#79d39d',
  },
  lossText: {
    color: '#ff9090',
  },
});
