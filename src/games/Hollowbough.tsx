import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentSlot,
  evaluateHollowbough,
  generatePuzzle,
  remainingInk,
  remainingMarks,
  ribbonTokens,
  slotRows,
  stackTopFirst,
  type HollowboughDifficulty,
  type HollowboughState,
} from '../solvers/Hollowbough.solver';

const DIFFICULTIES: HollowboughDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: HollowboughDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function slotPathLabel(path: string) {
  return path === 'root' ? 'root' : path.replace('root.', '');
}

function tokenLabel(value: number | null | undefined) {
  if (value === null) return '○';
  if (value === undefined) return '?';
  return `B${value}`;
}

export default function Hollowbough() {
  const evaluation = useMemo(() => evaluateHollowbough(), []);
  const [difficulty, setDifficulty] = useState<HollowboughDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<HollowboughState>(() =>
    createInitialState(buildPuzzle(1, 0)),
  );

  const rows = useMemo(() => slotRows(puzzle), [puzzle]);

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

  const switchDifficulty = (nextDifficulty: HollowboughDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (
    type:
      | 'stamp_branch'
      | 'stamp_hollow'
      | 'bank_right_left'
      | 'bank_left_right'
      | 'swap_top',
  ) => {
    setState((current) => applyMove(current, { type }));
  };

  const liveSlot = currentSlot(state);
  const stack = stackTopFirst(state);
  const pendingChildren = state.pendingChoice
    ? new Set([state.pendingChoice.leftSlotId, state.pendingChoice.rightSlotId])
    : new Set<number>();

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Live Slot</Text>
          <Text style={styles.summaryValue}>
            {liveSlot ? slotPathLabel(liveSlot.path) : 'done'}
          </Text>
          <Text style={styles.summaryMeta}>
            {liveSlot
              ? liveSlot.nodeId === null
                ? 'hollow hook'
                : 'branch'
              : 'ribbon closed'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Ink Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>{`${remainingInk(state)} left`}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Ribbon</Text>
          <Text style={styles.summaryValue}>{`${state.ribbon.length}/${puzzle.slots.length}`}</Text>
          <Text style={styles.summaryMeta}>{`${remainingMarks(state)} marks left`}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Courier Ribbon</Text>
        <View style={styles.ribbonWrap}>
          {ribbonTokens(state).length > 0 ? (
            ribbonTokens(state).map((token, index) => (
              <View
                key={`token-${index}`}
                style={[
                  styles.ribbonChip,
                  token === null ? styles.ribbonChipHollow : styles.ribbonChipBranch,
                ]}
              >
                <Text style={styles.ribbonChipStep}>{`#${index + 1}`}</Text>
                <Text style={styles.ribbonChipValue}>{tokenLabel(token)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No marks yet. The ribbon grows one live slot at a time.</Text>
          )}
        </View>
      </View>

      <View style={styles.dualPanel}>
        <View style={[styles.sectionCard, styles.panelCard]}>
          <Text style={styles.cardTitle}>Source Grove</Text>
          <View style={styles.treeStack}>
            {rows.map((row, depth) => (
              <View key={`source-depth-${depth}`} style={styles.treeRow}>
                {row.map((slotId) => {
                  const slot = puzzle.slots[slotId];
                  const node =
                    slot.nodeId === null ? null : puzzle.nodes[slot.nodeId];
                  const isLive = liveSlot?.id === slotId;
                  const isPending = pendingChildren.has(slotId);
                  return (
                    <View
                      key={`source-slot-${slotId}`}
                      style={[
                        styles.slotCard,
                        slot.nodeId === null ? styles.slotCardHollow : styles.slotCardBranch,
                        isLive && styles.slotCardLive,
                        isPending && styles.slotCardPending,
                      ]}
                    >
                      <Text style={styles.slotToken}>
                        {slot.nodeId === null ? '○' : `B${node?.value ?? '?'}`}
                      </Text>
                      <Text style={styles.slotMeta}>{slotPathLabel(slot.path)}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.sectionCard, styles.panelCard]}>
          <Text style={styles.cardTitle}>Rebuilt Grove</Text>
          <View style={styles.treeStack}>
            {rows.map((row, depth) => (
              <View key={`build-depth-${depth}`} style={styles.treeRow}>
                {row.map((slotId) => {
                  const slot = puzzle.slots[slotId];
                  const built = state.builtStates[slotId];
                  const node =
                    slot.nodeId === null ? null : puzzle.nodes[slot.nodeId];
                  const isLive = liveSlot?.id === slotId;
                  return (
                    <View
                      key={`build-slot-${slotId}`}
                      style={[
                        styles.slotCard,
                        built === 'branch' && styles.slotCardBuiltBranch,
                        built === 'hollow' && styles.slotCardBuiltHollow,
                        built === 'unknown' && styles.slotCardUnknown,
                        isLive && styles.slotCardLive,
                      ]}
                    >
                      <Text style={styles.slotToken}>
                        {built === 'branch'
                          ? `B${node?.value ?? '?'}`
                          : built === 'hollow'
                            ? '○'
                            : '?'}
                      </Text>
                      <Text style={styles.slotMeta}>
                        {built === 'unknown' ? 'sealed later' : slotPathLabel(slot.path)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Work Stack</Text>
        {state.pendingChoice ? (
          <View style={styles.choiceRow}>
            <View style={styles.choiceCard}>
              <Text style={styles.choiceTitle}>Left child task</Text>
              <Text style={styles.choiceBody}>
                {slotPathLabel(puzzle.slots[state.pendingChoice.leftSlotId].path)}
              </Text>
              <Text style={styles.choiceMeta}>
                {puzzle.slots[state.pendingChoice.leftSlotId].nodeId === null
                  ? 'hollow next if live'
                  : 'branch task'}
              </Text>
            </View>
            <View style={styles.choiceCard}>
              <Text style={styles.choiceTitle}>Right child task</Text>
              <Text style={styles.choiceBody}>
                {slotPathLabel(puzzle.slots[state.pendingChoice.rightSlotId].path)}
              </Text>
              <Text style={styles.choiceMeta}>
                {puzzle.slots[state.pendingChoice.rightSlotId].nodeId === null
                  ? 'hollow next if live'
                  : 'branch task'}
              </Text>
            </View>
          </View>
        ) : stack.length > 0 ? (
          <View style={styles.stackList}>
            {stack.map((slot, index) => (
              <View
                key={`stack-slot-${slot.id}`}
                style={[styles.stackCard, index === 0 && styles.stackCardTop]}
              >
                <Text style={styles.stackDepth}>{index === 0 ? 'top' : `depth ${index}`}</Text>
                <Text style={styles.stackBody}>{slotPathLabel(slot.path)}</Text>
                <Text style={styles.stackMeta}>
                  {slot.nodeId === null ? 'hollow hook' : `B${puzzle.nodes[slot.nodeId].value}`}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No live slots remain. Finish the last marks to clear the grove.</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Route Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.historyWrap}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.historyChip}>
                <Text style={styles.historyText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No moves yet. The same ribbon must be enough to regrow the exact grove later.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Courier Rules</Text>
        <Text style={styles.infoLine}>Stamp Branch writes the live branch value onto the ribbon and opens two child tasks.</Text>
        <Text style={styles.infoLine}>Stamp Hollow seals an empty hook. Hollow hooks still consume one exact ribbon mark.</Text>
        <Text style={styles.infoLine}>Bank Right Then Left keeps the left child task on top for the next mark.</Text>
        <Text style={styles.infoLine}>Swap Top Pair rescues a bad split order, but it still spends ink.</Text>
      </View>

      <View style={styles.actionGrid}>
        <Pressable
          onPress={() => runMove('stamp_branch')}
          disabled={Boolean(state.verdict) || !liveSlot}
          style={[
            styles.controlButton,
            styles.primaryButton,
            (Boolean(state.verdict) || !liveSlot) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Stamp Branch</Text>
        </Pressable>

        <Pressable
          onPress={() => runMove('stamp_hollow')}
          disabled={Boolean(state.verdict) || !liveSlot}
          style={[
            styles.controlButton,
            styles.secondaryButton,
            (Boolean(state.verdict) || !liveSlot) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.secondaryButtonLabel}>Stamp Hollow</Text>
        </Pressable>

        <Pressable
          onPress={() => runMove('bank_right_left')}
          disabled={Boolean(state.verdict) || !state.pendingChoice}
          style={[
            styles.controlButton,
            styles.secondaryButton,
            (Boolean(state.verdict) || !state.pendingChoice) &&
              styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.secondaryButtonLabel}>Bank Right Then Left</Text>
        </Pressable>

        <Pressable
          onPress={() => runMove('bank_left_right')}
          disabled={Boolean(state.verdict) || !state.pendingChoice}
          style={[
            styles.controlButton,
            styles.secondaryButton,
            (Boolean(state.verdict) || !state.pendingChoice) &&
              styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.secondaryButtonLabel}>Bank Left Then Right</Text>
        </Pressable>

        <Pressable
          onPress={() => runMove('swap_top')}
          disabled={
            Boolean(state.verdict) ||
            Boolean(state.pendingChoice) ||
            state.stack.length < 2
          }
          style={[
            styles.controlButton,
            styles.secondaryButton,
            (Boolean(state.verdict) ||
              Boolean(state.pendingChoice) ||
              state.stack.length < 2) &&
              styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.secondaryButtonLabel}>Swap Top Pair</Text>
        </Pressable>
      </View>

      <View style={styles.messageCard}>
        <Text style={styles.messageText}>{state.verdict?.label ?? state.message}</Text>
      </View>
    </View>
  );

  return (
    <GameScreenTemplate
      title="Hollowbough"
      emoji="HO"
      subtitle="Write one self-closing grove ribbon that can regrow every branch and every hollow hook."
      objective="Clear the grove by stamping the live slot now, banking child tasks in the order that preserves preorder, and never losing an empty hook on the ribbon."
      statsLabel={`${puzzle.label}  |  break ${evaluation.learningMetrics.difficultyBreakpoint}`}
      actions={[
        { label: 'Reset Grove', onPress: () => resetPuzzle(), tone: 'neutral' },
        { label: 'New Grove', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((value) => ({
        label: `D${value}`,
        selected: value === difficulty,
        onPress: () => switchDifficulty(value),
      }))}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        title: 'What this teaches',
        summary:
          'Hollowbough teaches the preorder codec pattern where every visited slot writes exactly one token. Real branches write their value and open two child slots; hollow hooks write a null marker and close immediately.',
        takeaway:
          'The moment where you stamp a hollow hook instead of skipping it maps to writing a null sentinel during serialization. The moment where you bank the right child task under the left one maps to consuming the same preorder stream during deserialization so the left subtree rebuilds before the right one.',
      }}
      leetcodeLinks={[
        {
          id: 297,
          title: 'Serialize and Deserialize Binary Tree',
          url: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/',
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
    backgroundColor: '#17181c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d323d',
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: '#9fb0c9',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: '#f4f7fb',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#8b95a7',
    fontSize: 12,
  },
  sectionCard: {
    backgroundColor: '#17181c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d323d',
    padding: 12,
    gap: 10,
  },
  ribbonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ribbonChip: {
    minWidth: 56,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
    borderWidth: 1,
  },
  ribbonChipBranch: {
    backgroundColor: '#182437',
    borderColor: '#33507d',
  },
  ribbonChipHollow: {
    backgroundColor: '#241f17',
    borderColor: '#75613a',
  },
  ribbonChipStep: {
    color: '#97a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  ribbonChipValue: {
    color: '#f4f7fb',
    fontSize: 16,
    fontWeight: '800',
  },
  dualPanel: {
    gap: 12,
  },
  panelCard: {
    gap: 12,
  },
  treeStack: {
    gap: 8,
  },
  treeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotCard: {
    minWidth: 78,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: 'center',
    gap: 4,
  },
  slotCardBranch: {
    backgroundColor: '#162435',
    borderColor: '#325076',
  },
  slotCardHollow: {
    backgroundColor: '#262018',
    borderColor: '#6f5a35',
  },
  slotCardUnknown: {
    backgroundColor: '#11161f',
    borderColor: '#313745',
  },
  slotCardBuiltBranch: {
    backgroundColor: '#1e3d2b',
    borderColor: '#417958',
  },
  slotCardBuiltHollow: {
    backgroundColor: '#3b2817',
    borderColor: '#865835',
  },
  slotCardLive: {
    borderColor: '#f5d66c',
    shadowColor: '#f5d66c',
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  slotCardPending: {
    borderColor: '#7cc8ff',
  },
  slotToken: {
    color: '#f4f7fb',
    fontSize: 18,
    fontWeight: '800',
  },
  slotMeta: {
    color: '#8b95a7',
    fontSize: 11,
    fontWeight: '600',
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  choiceCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#38445a',
    backgroundColor: '#11161f',
    padding: 12,
    gap: 6,
  },
  choiceTitle: {
    color: '#9fb0c9',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  choiceBody: {
    color: '#f4f7fb',
    fontSize: 17,
    fontWeight: '800',
  },
  choiceMeta: {
    color: '#8b95a7',
    fontSize: 12,
  },
  stackList: {
    gap: 8,
  },
  stackCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#30384a',
    backgroundColor: '#121825',
    padding: 10,
    gap: 3,
  },
  stackCardTop: {
    borderColor: '#7cc8ff',
    backgroundColor: '#152134',
  },
  stackDepth: {
    color: '#9fb0c9',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stackBody: {
    color: '#f4f7fb',
    fontSize: 16,
    fontWeight: '800',
  },
  stackMeta: {
    color: '#8b95a7',
    fontSize: 12,
  },
  historyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    borderRadius: 12,
    backgroundColor: '#11161f',
    borderWidth: 1,
    borderColor: '#2d323d',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  historyText: {
    color: '#c7d2e5',
    fontSize: 12,
  },
  emptyText: {
    color: '#8b95a7',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: '#11161f',
    borderWidth: 1,
    borderColor: '#2d323d',
    padding: 12,
    gap: 6,
  },
  infoLine: {
    color: '#c7d2e5',
    fontSize: 13,
    lineHeight: 18,
  },
  actionGrid: {
    gap: 10,
  },
  controlButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: '#3f6ff5',
    borderColor: '#5d84f7',
  },
  secondaryButton: {
    backgroundColor: '#161d28',
    borderColor: '#344055',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButtonLabel: {
    color: '#d8e1f1',
    fontSize: 14,
    fontWeight: '700',
  },
  messageCard: {
    borderRadius: 14,
    backgroundColor: '#11161f',
    borderWidth: 1,
    borderColor: '#2d323d',
    padding: 12,
  },
  messageText: {
    color: '#f4f7fb',
    fontSize: 13,
    lineHeight: 18,
  },
});
