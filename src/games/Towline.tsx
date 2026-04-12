import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  canTowBoth,
  createInitialState,
  generatePuzzle,
  ordinal,
  positionLabel,
  positionMeta,
  type TowlineDifficulty,
  type TowlineState,
} from '../solvers/Towline.solver';

const DIFFICULTIES: TowlineDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: TowlineDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function neededGap(state: TowlineState) {
  return state.puzzle.removeFromEnd + 1;
}

function currentGap(state: TowlineState) {
  return state.scout - state.deckhand;
}

function filteredTowline(state: TowlineState) {
  return state.puzzle.barges.filter((_, index) => index !== state.removedIndex);
}

function nextCutLabel(state: TowlineState) {
  const nextIndex = state.deckhand + 1;
  if (nextIndex < 0 || nextIndex >= state.puzzle.barges.length) return 'None';
  return `${state.puzzle.barges[nextIndex]}`;
}

export default function Towline() {
  const [difficulty, setDifficulty] = useState<TowlineDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<TowlineState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: TowlineDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'scoutAhead' | 'deckhandAhead' | 'towBoth' | 'cutNext') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const scoutValue = useMemo(
    () => positionLabel(puzzle, state.scout),
    [puzzle, state.scout],
  );
  const deckhandValue = useMemo(
    () => positionLabel(puzzle, state.deckhand),
    [puzzle, state.deckhand],
  );
  const cutReady = state.scout === puzzle.barges.length && state.deckhand < puzzle.barges.length - 1;
  const resultTowline = useMemo(() => filteredTowline(state), [state]);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>{puzzle.label}</Text>
        <Text style={styles.titleText}>{puzzle.title}</Text>
        <Text style={styles.titleHint}>
          Remove the {ordinal(puzzle.removeFromEnd)} barge from the stern without counting backward from the tail every time.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Scout</Text>
          <Text style={styles.summaryValue}>{scoutValue}</Text>
          <Text style={styles.summaryMeta}>{positionMeta(puzzle, state.scout)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Deckhand</Text>
          <Text style={styles.summaryValue}>{deckhandValue}</Text>
          <Text style={styles.summaryMeta}>{positionMeta(puzzle, state.deckhand)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Tow Gap</Text>
          <Text style={styles.summaryValue}>{currentGap(state)}</Text>
          <Text style={styles.summaryMeta}>Need exactly {neededGap(state)}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Target</Text>
          <Text style={styles.summaryValue}>{ordinal(puzzle.removeFromEnd)}</Text>
          <Text style={styles.summaryMeta}>from the stern</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Cut Ready</Text>
          <Text style={styles.summaryValue}>{cutReady ? 'Yes' : 'Wait'}</Text>
          <Text style={styles.summaryMeta}>
            {cutReady ? `Cut next after ${deckhandValue}` : 'Scout must clear first'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Next Rope</Text>
          <Text style={styles.summaryValue}>{nextCutLabel(state)}</Text>
          <Text style={styles.summaryMeta}>would come loose</Text>
        </View>
      </View>

      <View style={styles.chainCard}>
        <Text style={styles.cardTitle}>Towline</Text>
        <View style={styles.chainRow}>
          <View style={[styles.nodeCard, styles.dockCard, state.deckhand < 0 && styles.deckhandNode, state.scout < 0 && styles.scoutNode]}>
            <Text style={styles.nodeIndex}>Dock</Text>
            <Text style={styles.nodeValue}>o</Text>
            <Text style={styles.nodeBadge}>
              {state.scout < 0 && state.deckhand < 0 ? 'both' : state.scout < 0 ? 'scout' : state.deckhand < 0 ? 'deckhand' : 'start'}
            </Text>
          </View>

          {puzzle.barges.map((barge, index) => {
            const scoutHere = state.scout === index;
            const deckhandHere = state.deckhand === index;
            const removed = state.removedIndex === index;
            return (
              <View
                key={`${barge}-${index}`}
                style={[
                  styles.nodeCard,
                  scoutHere && styles.scoutNode,
                  deckhandHere && styles.deckhandNode,
                  scoutHere && deckhandHere && styles.bothNode,
                  removed && styles.removedNode,
                ]}
              >
                <Text style={styles.nodeIndex}>Barge {index + 1}</Text>
                <Text style={styles.nodeValue}>{barge}</Text>
                <Text style={styles.nodeBadge}>
                  {removed
                    ? 'cut'
                    : scoutHere && deckhandHere
                      ? 'both'
                      : scoutHere
                        ? 'scout'
                        : deckhandHere
                          ? 'deckhand'
                          : 'live'}
                </Text>
              </View>
            );
          })}

          <View style={[styles.nodeCard, styles.clearCard, state.scout >= puzzle.barges.length && styles.scoutNode]}>
            <Text style={styles.nodeIndex}>Clear</Text>
            <Text style={styles.nodeValue}>~</Text>
            <Text style={styles.nodeBadge}>{state.scout >= puzzle.barges.length ? 'scout' : 'stern'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.chainCard}>
        <Text style={styles.cardTitle}>After The Cut</Text>
        {state.removedIndex === null ? (
          <Text style={styles.emptyText}>
            No rope has been cut yet. The finished towline should keep every barge except the {ordinal(puzzle.removeFromEnd)} one from the stern.
          </Text>
        ) : (
          <View style={styles.resultRow}>
            {resultTowline.map((barge, index) => (
              <View key={`${barge}-${index}`} style={styles.resultChip}>
                <Text style={styles.resultValue}>{barge}</Text>
              </View>
            ))}
          </View>
        )}
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
            No moves yet. The clean route is to prime the scout from the dock, lock the tow gap, then march both until the scout clears.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Harbor Rules</Text>
        <Text style={styles.infoLine}>Scout Ahead: move the scout one rope forward.</Text>
        <Text style={styles.infoLine}>Deckhand Ahead: move the cutter one rope forward on its own.</Text>
        <Text style={styles.infoLine}>Tow Both: move both hands one rope together, but only once the gap is exactly locked.</Text>
        <Text style={styles.infoLine}>Cut Next: cut the rope immediately after the cutter, but only after the scout clears the stern.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('scoutAhead')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Scout Ahead</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('deckhandAhead')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Deckhand Ahead</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('towBoth')}
          disabled={Boolean(state.verdict)}
          style={[
            styles.controlButton,
            styles.primaryButton,
            !canTowBoth(state) && styles.warningButton,
            state.verdict && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Tow Both</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('cutNext')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, styles.cutButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.cutButtonLabel}>Cut Next</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Towline</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Towline</Text>
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
      title="Towline"
      emoji="TL"
      subtitle="Hold a fixed gap from the dock, then cut exactly one rope"
      objective={`Remove the ${ordinal(puzzle.removeFromEnd)} barge from the stern. Start from the dock, push the scout ${neededGap(state)} links ahead, tow both hands together until the scout clears, then cut the next rope before the harbor gate closes.`}
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
        {
          label: 'New Towline',
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
          'Towline turns the one-pass `Remove Nth Node From End of List` solution into a physical fixed-gap tow. The dock acts like the dummy node, the scout stays n+1 links ahead, and the final cut always happens after the cutter instead of on the target barge itself.',
        takeaway:
          'If the scout clears open water and the tow gap never changed, the cutter is parked exactly at the predecessor rope you need.',
      }}
      leetcodeLinks={[
        {
          id: 19,
          title: 'Remove Nth Node From End of List',
          url: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 14,
  },
  titleCard: {
    backgroundColor: '#131a1b',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#295057',
    padding: 16,
    gap: 8,
  },
  titleLabel: {
    color: '#8ce3ef',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titleText: {
    color: '#f5fbfc',
    fontSize: 24,
    fontWeight: '800',
  },
  titleHint: {
    color: '#c9e7eb',
    fontSize: 14,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    minWidth: 96,
    backgroundColor: '#151617',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d3438',
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: '#8fa2a8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#b9c3c6',
    fontSize: 12,
    lineHeight: 17,
  },
  chainCard: {
    backgroundColor: '#131416',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#263238',
    padding: 14,
    gap: 12,
  },
  chainRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  nodeCard: {
    width: 78,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#394147',
    backgroundColor: '#1a1d20',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 4,
    alignItems: 'center',
  },
  dockCard: {
    backgroundColor: '#182428',
    borderColor: '#355760',
  },
  clearCard: {
    backgroundColor: '#241f17',
    borderColor: '#65503b',
  },
  scoutNode: {
    borderColor: '#7be0ef',
    backgroundColor: '#123138',
  },
  deckhandNode: {
    borderColor: '#f0b55f',
    backgroundColor: '#392a12',
  },
  bothNode: {
    borderColor: '#efe28c',
    backgroundColor: '#403717',
  },
  removedNode: {
    opacity: 0.45,
    borderStyle: 'dashed',
  },
  nodeIndex: {
    color: '#90a4aa',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  nodeValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  nodeBadge: {
    color: '#dce4e7',
    fontSize: 11,
    fontWeight: '700',
  },
  resultRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultChip: {
    minWidth: 42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#203339',
    borderWidth: 1,
    borderColor: '#466871',
  },
  resultValue: {
    color: '#f8fcfd',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  logCard: {
    backgroundColor: '#151617',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2c2f34',
    padding: 14,
    gap: 10,
  },
  logRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1f262b',
    borderWidth: 1,
    borderColor: '#364149',
  },
  logText: {
    color: '#edf3f5',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#c0c8cb',
    fontSize: 13,
    lineHeight: 19,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#121618',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#273037',
    padding: 14,
    gap: 6,
  },
  infoLine: {
    color: '#d2dadc',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a4248',
    backgroundColor: '#1a1d1f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  controlButtonDisabled: {
    opacity: 0.55,
  },
  controlButtonLabel: {
    color: '#f6f7f8',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#1a3b44',
    borderColor: '#5bbfd0',
  },
  primaryButtonLabel: {
    color: '#effcff',
    fontSize: 13,
    fontWeight: '800',
  },
  warningButton: {
    backgroundColor: '#273137',
    borderColor: '#51646d',
  },
  cutButton: {
    backgroundColor: '#43241f',
    borderColor: '#df8c7e',
  },
  cutButtonLabel: {
    color: '#fff3f0',
    fontSize: 13,
    fontWeight: '800',
  },
  resetButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#26292d',
    borderWidth: 1,
    borderColor: '#3b3f45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonLabel: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#d1dade',
    fontSize: 13,
    lineHeight: 18,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  winText: {
    color: '#96f0b8',
  },
  lossText: {
    color: '#ff9a91',
  },
});
