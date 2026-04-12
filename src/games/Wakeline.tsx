import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  generatePuzzle,
  visibleTailLabel,
  type WakelineDifficulty,
  type WakelineState,
} from '../solvers/Wakeline.solver';

const DIFFICULTIES: WakelineDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: WakelineDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function positionLabel(state: WakelineState, index: number | null) {
  if (index === null) return 'Open';
  return state.puzzle.nodes[index].toString();
}

function positionMeta(index: number | null) {
  if (index === null) return 'out of channel';
  return `buoy ${index + 1}`;
}

export default function Wakeline() {
  const [difficulty, setDifficulty] = useState<WakelineDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<WakelineState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: WakelineDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'pulse' | 'tag') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const tagSet = useMemo(() => new Set(state.tags), [state.tags]);
  const slowValue = useMemo(() => positionLabel(state, state.slow), [state]);
  const fastValue = useMemo(() => positionLabel(state, state.fast), [state]);
  const slowMeta = useMemo(() => positionMeta(state.slow), [state.slow]);
  const fastMeta = useMemo(() => positionMeta(state.fast), [state.fast]);
  const tailHook = useMemo(() => visibleTailLabel(state), [state]);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>{puzzle.label}</Text>
        <Text style={styles.titleText}>{puzzle.title}</Text>
        <Text style={styles.titleHint}>
          Two patrol boats share one one-way buoy chain. Let the drifter move one buoy and the cutter move two, then watch whether the cutter escapes or slams into the slower wake.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Drifter</Text>
          <Text style={styles.summaryValue}>{slowValue}</Text>
          <Text style={styles.summaryMeta}>{slowMeta}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Cutter</Text>
          <Text style={styles.summaryValue}>{fastValue}</Text>
          <Text style={styles.summaryMeta}>{fastMeta}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Tail Hook</Text>
          <Text style={styles.summaryValue}>{tailHook}</Text>
          <Text style={styles.summaryMeta}>
            {tailHook === 'hidden' ? 'unknown until reached' : 'revealed by patrol'}
          </Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Fuel</Text>
          <Text style={styles.summaryValue}>
            {state.actionsUsed}/{puzzle.budget}
          </Text>
          <Text style={styles.summaryMeta}>actions spent</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Flares</Text>
          <Text style={styles.summaryValue}>{state.tags.length}</Text>
          <Text style={styles.summaryMeta}>breadcrumbs dropped</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Status</Text>
          <Text style={styles.summaryValue}>{state.verdict ? 'Resolved' : 'Live'}</Text>
          <Text style={styles.summaryMeta}>
            {state.verdict ? 'patrol complete' : 'no verdict yet'}
          </Text>
        </View>
      </View>

      <View style={styles.routeCard}>
        <Text style={styles.cardTitle}>Buoy Chain</Text>
        <View style={styles.routeRow}>
          {puzzle.nodes.map((node, index) => {
            const isSlow = state.slow === index;
            const isFast = state.fast === index;
            const isTagged = tagSet.has(index);
            const isBoth = isSlow && isFast;

            return (
              <View key={`${node}-${index}`} style={styles.buoyWrap}>
                <View
                  style={[
                    styles.buoyCard,
                    isTagged && styles.buoyTagged,
                    isSlow && styles.buoySlow,
                    isFast && styles.buoyFast,
                    isBoth && styles.buoyBoth,
                  ]}
                >
                  <Text style={styles.buoyIndex}>Buoy {index + 1}</Text>
                  <Text style={styles.buoyValue}>{node}</Text>
                  <Text style={styles.buoyBadge}>
                    {isBoth ? 'both' : isSlow ? 'drifter' : isFast ? 'cutter' : isTagged ? 'flare' : 'open'}
                  </Text>
                </View>
                <Text style={styles.arrowText}>
                  {index === puzzle.nodes.length - 1 ? `~> ${tailHook}` : '->'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.cardTitle}>Wake Log</Text>
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
            No moves yet. A clean solve is usually just pulse, pulse, pulse until the channel proves itself.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Patrol Rules</Text>
        <Text style={styles.infoLine}>Wake Pulse: move the drifter one buoy and the cutter two.</Text>
        <Text style={styles.infoLine}>Drop Flare: mark the drifter&apos;s current buoy, which mirrors storing visited nodes but burns fuel.</Text>
        <Text style={styles.infoLine}>If the cutter reaches open water, the chain ends. If it ever catches the drifter, the chain loops.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('tag')}
          disabled={Boolean(state.verdict)}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Drop Flare</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('pulse')}
          disabled={Boolean(state.verdict)}
          style={[
            styles.controlButton,
            styles.primaryButton,
            state.verdict && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Wake Pulse</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Patrol</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Channel</Text>
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
      title="Wakeline"
      emoji="WL"
      subtitle="Linked-list cycle detection via fast and slow patrol boats"
      objective="Certify whether the buoy chain loops without spending fuel on unnecessary breadcrumbs. The drifter moves one buoy per pulse, the cutter moves two."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
        {
          label: 'New Channel',
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
          'This is Floyd’s fast/slow pointer invariant for linked lists. Move one pointer one step and the other two: if the fast pointer reaches `null`, there is no cycle; if it ever meets the slow pointer, a cycle exists.',
        takeaway:
          'The flares are the tempting hash-set alternative. The winning transfer is realizing the two-speed chase answers the same boolean question with O(1) extra space.',
      }}
      leetcodeLinks={[
        {
          id: 141,
          title: 'Linked List Cycle',
          url: 'https://leetcode.com/problems/linked-list-cycle/',
        },
        {
          id: 142,
          title: 'Linked List Cycle II',
          url: 'https://leetcode.com/problems/linked-list-cycle-ii/',
        },
      ]}
      footer={
        <Text style={styles.footerText}>
          The tail hook stays hidden until a patrol boat actually reaches the tail. That keeps the board from collapsing into a trivial visual inspection.
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  boardStack: {
    gap: 14,
  },
  titleCard: {
    backgroundColor: '#101a1f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#21404d',
    padding: 14,
    gap: 6,
  },
  titleLabel: {
    color: '#7fd8ff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  titleHint: {
    color: '#b7d7e5',
    fontSize: 14,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#171f24',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2b3942',
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: '#8fa9b6',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#9db3be',
    fontSize: 12,
    lineHeight: 16,
  },
  routeCard: {
    backgroundColor: '#13181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2b3338',
    padding: 14,
    gap: 10,
  },
  routeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  buoyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buoyCard: {
    width: 94,
    backgroundColor: '#1a2328',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334149',
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  buoyTagged: {
    borderColor: '#ffce73',
    backgroundColor: '#2c2414',
  },
  buoySlow: {
    borderColor: '#65d6ad',
    backgroundColor: '#163127',
  },
  buoyFast: {
    borderColor: '#68b8ff',
    backgroundColor: '#13293d',
  },
  buoyBoth: {
    borderColor: '#ff7f96',
    backgroundColor: '#351926',
  },
  buoyIndex: {
    color: '#9fb0b9',
    fontSize: 11,
    fontWeight: '700',
  },
  buoyValue: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  buoyBadge: {
    color: '#d5dde2',
    fontSize: 11,
    fontWeight: '700',
  },
  arrowText: {
    color: '#7ea0b1',
    fontSize: 16,
    fontWeight: '800',
  },
  logCard: {
    backgroundColor: '#14191d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2b3338',
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
    borderWidth: 1,
    borderColor: '#3b474f',
    backgroundColor: '#1d252a',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logText: {
    color: '#d9e2e7',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#afc0c9',
    fontSize: 13,
    lineHeight: 19,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#151c20',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a353b',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#d3dde2',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#1c262d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#324049',
    paddingVertical: 14,
    alignItems: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#e8eff3',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#1376a6',
    borderColor: '#38aee0',
  },
  primaryButtonLabel: {
    color: '#f6fbff',
    fontSize: 14,
    fontWeight: '900',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#161c20',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2d373d',
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonLabel: {
    color: '#d8e2e7',
    fontSize: 13,
    fontWeight: '800',
  },
  messageText: {
    color: '#d6e0e5',
    fontSize: 13,
    lineHeight: 19,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  winText: {
    color: '#7ef1b6',
  },
  lossText: {
    color: '#ff909c',
  },
  footerText: {
    color: '#b9c8cf',
    fontSize: 13,
    lineHeight: 19,
  },
});
