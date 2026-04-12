import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  buildTargetOrder,
  createInitialState,
  generatePuzzle,
  type LacehookDifficulty,
  type LacehookMoveType,
  type LacehookState,
} from '../solvers/Lacehook.solver';

const DIFFICULTIES: LacehookDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: LacehookDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function lanternLabel(state: LacehookState, index: number) {
  if (state.output.includes(index)) return 'braided';

  if (state.phase === 'split') {
    const isSlow = state.splitSlow === index;
    const isFast = state.splitFast === index;
    if (isSlow && isFast) return 'guide + sprinter';
    if (isSlow) return 'guide';
    if (isFast) return 'sprinter';
    return 'waiting';
  }

  if (state.splitPoint !== null && index <= state.splitPoint) {
    if (state.phase === 'weave' && state.weaveLead === index) return 'lead';
    return 'front strand';
  }

  if (state.phase === 'reverse') {
    if (state.tailAnchor === index) return 'anchor';
    if (state.tailCurrent === index) return 'live tail';
    if (state.tailScout === index) return 'spare pin';
    if (state.tailAnchor !== null && index < state.tailAnchor) return 'reversed';
    return 'back strand';
  }

  if (state.phase === 'weave' && state.weaveBack === index && state.weaveBack > (state.splitPoint ?? -1)) {
    return 'far hook';
  }

  return 'back strand';
}

function stageRule(state: LacehookState) {
  if (state.phase === 'split') {
    return 'Pace the guide one and the sprinter two until the sprinter cannot complete another two-hop run, then seal the split.';
  }

  if (state.phase === 'reverse') {
    return 'Clip the next tail lantern before every flip, then march the anchor and live handle together.';
  }

  return 'Hook one reversed back lantern after the current lead, then march to reveal the next front-back pair.';
}

export default function Lacehook() {
  const [difficulty, setDifficulty] = useState<LacehookDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<LacehookState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: LacehookDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: LacehookMoveType) => {
    setState((current) => applyMove(current, { type: move }));
  };

  const targetOrder = useMemo(() => buildTargetOrder(puzzle).join(' -> '), [puzzle]);
  const outputValues = useMemo(
    () => state.output.map((index) => puzzle.nodes[index]),
    [puzzle.nodes, state.output],
  );

  const controlsByPhase: Record<LacehookState['phase'], Array<{ label: string; move: LacehookMoveType }>> = {
    split: [
      { label: 'Pace Split', move: 'paceSplit' },
      { label: 'Seal Split', move: 'sealSplit' },
    ],
    reverse: [
      { label: 'Clip Tail', move: 'clipTail' },
      { label: 'Flip Tail', move: 'flipTail' },
      { label: 'March Tail', move: 'marchTail' },
    ],
    weave: [
      { label: 'Hook Back', move: 'hookBack' },
      { label: 'March Pair', move: 'marchPair' },
    ],
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>{puzzle.label}</Text>
        <Text style={styles.titleText}>{puzzle.title}</Text>
        <Text style={styles.titleHint}>
          Rehang the lantern garland into first-last-second-second-last order. The safe route is midpoint chase, tail reversal, then a strict front-and-far lace.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Phase</Text>
          <Text style={styles.summaryValue}>
            {state.phase === 'split' ? 'Midpoint' : state.phase === 'reverse' ? 'Reverse Tail' : 'Lace'}
          </Text>
          <Text style={styles.summaryMeta}>{state.verdict ? 'resolved' : 'live'}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Guide / Sprinter</Text>
          <Text style={styles.summaryValue}>
            {puzzle.nodes[state.splitSlow]} / {puzzle.nodes[state.splitFast]}
          </Text>
          <Text style={styles.summaryMeta}>
            lanterns {state.splitSlow + 1} / {state.splitFast + 1}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Actions</Text>
          <Text style={styles.summaryValue}>
            {state.actionsUsed}/{puzzle.budget}
          </Text>
          <Text style={styles.summaryMeta}>rigging beats</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Tail Handles</Text>
          <Text style={styles.summaryValue}>
            {state.tailAnchor === null ? 'Knot' : puzzle.nodes[state.tailAnchor]}
            {' / '}
            {state.tailCurrent === null ? 'Done' : puzzle.nodes[state.tailCurrent]}
          </Text>
          <Text style={styles.summaryMeta}>
            anchor / live
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Spare Pin</Text>
          <Text style={styles.summaryValue}>
            {state.tailScout === null ? (state.tailAheadSecured ? 'Open tail' : 'Empty') : puzzle.nodes[state.tailScout]}
          </Text>
          <Text style={styles.summaryMeta}>
            {state.tailScout === null
              ? state.tailAheadSecured
                ? 'tail secured'
                : 'nothing stored'
              : `lantern ${state.tailScout + 1}`}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Lace Handles</Text>
          <Text style={styles.summaryValue}>
            {state.weaveLead === null ? 'Idle' : puzzle.nodes[state.weaveLead]}
            {' / '}
            {state.weaveBack === null || (state.splitPoint !== null && state.weaveBack <= state.splitPoint)
              ? 'None'
              : puzzle.nodes[state.weaveBack]}
          </Text>
          <Text style={styles.summaryMeta}>
            lead / far hook
          </Text>
        </View>
      </View>

      <View style={styles.chainCard}>
        <Text style={styles.cardTitle}>Garland</Text>
        <View style={styles.chainRow}>
          {puzzle.nodes.map((node, index) => (
            <View key={`${node}-${index}`} style={styles.lanternWrap}>
              <View style={styles.lanternCard}>
                <Text style={styles.lanternIndex}>Lantern {index + 1}</Text>
                <Text style={styles.lanternValue}>{node}</Text>
                <Text style={styles.lanternBadge}>{lanternLabel(state, index)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.cardTitle}>Braid Output</Text>
        {outputValues.length > 0 ? (
          <View style={styles.outputRow}>
            {outputValues.map((value, index) => (
              <View key={`${value}-${index}`} style={styles.outputChip}>
                <Text style={styles.outputText}>{value}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No braid yet. The finished order should become {targetOrder}.
          </Text>
        )}
      </View>

      <View style={styles.logCard}>
        <Text style={styles.cardTitle}>Crew Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.outputRow}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.logChip}>
                <Text style={styles.outputText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No moves yet. {stageRule(state)}</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Stage Rule</Text>
        <Text style={styles.infoLine}>{stageRule(state)}</Text>
        <Text style={styles.infoLine}>Target order: {targetOrder}</Text>
      </View>

      <View style={styles.actionRow}>
        {controlsByPhase[state.phase].map((control) => (
          <Pressable
            key={control.label}
            onPress={() => runMove(control.move)}
            disabled={Boolean(state.verdict)}
            style={[
              styles.controlButton,
              control.move === controlsByPhase[state.phase][controlsByPhase[state.phase].length - 1].move &&
                styles.primaryButton,
              state.verdict && styles.controlButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.controlButtonLabel,
                control.move === controlsByPhase[state.phase][controlsByPhase[state.phase].length - 1].move &&
                  styles.primaryButtonLabel,
              ]}
            >
              {control.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Garland</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Garland</Text>
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
      title="Lacehook"
      emoji="LH"
      subtitle="Reorder a linked garland by splitting, reversing, then lacing the far strand back in"
      objective="Transform the garland into first-last-second-second-last order. Find the true midpoint with the guide and sprinter, reverse the back strand safely, then splice one far lantern after each front lead."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
        {
          label: 'New Garland',
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
          'This is the standard `Reorder List` routine: use slow and fast pointers to find the split, reverse the second half with a saved-next handle, then weave one reversed back node after each front node.',
        takeaway:
          'The midpoint chase prevents a bad cut, the spare pin preserves the unreversed tail, and the final lace mirrors the in-place front/back splice loop.',
      }}
      leetcodeLinks={[
        {
          id: 143,
          title: 'Reorder List',
          url: 'https://leetcode.com/problems/reorder-list/',
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
    backgroundColor: '#11161d',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2b3440',
    padding: 16,
    gap: 8,
  },
  titleLabel: {
    color: '#9bb6d1',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  titleHint: {
    color: '#c2c9d1',
    fontSize: 13,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#171d25',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2b3440',
    padding: 14,
    gap: 4,
  },
  cardTitle: {
    color: '#9bb6d1',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#a9b3bd',
    fontSize: 12,
  },
  chainCard: {
    backgroundColor: '#171d25',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2b3440',
    padding: 16,
    gap: 12,
  },
  chainRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  lanternWrap: {
    width: '47%',
  },
  lanternCard: {
    backgroundColor: '#0f141b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#303a45',
    padding: 12,
    gap: 4,
  },
  lanternIndex: {
    color: '#7f8a96',
    fontSize: 12,
    fontWeight: '600',
  },
  lanternValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  lanternBadge: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '700',
  },
  logCard: {
    backgroundColor: '#171d25',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2b3440',
    padding: 16,
    gap: 10,
  },
  outputRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  outputChip: {
    minWidth: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#24415a',
    borderWidth: 1,
    borderColor: '#3c6a92',
  },
  logChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#222a33',
    borderWidth: 1,
    borderColor: '#3a4552',
  },
  outputText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: '#b4bec9',
    fontSize: 13,
    lineHeight: 20,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#10161d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2b3440',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#c2c9d1',
    fontSize: 13,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#384452',
    backgroundColor: '#1d2630',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  primaryButton: {
    backgroundColor: '#2d5578',
    borderColor: '#4b7faa',
  },
  controlButtonLabel: {
    color: '#e8edf2',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonLabel: {
    color: '#ffffff',
  },
  resetButton: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#384452',
    backgroundColor: '#171d25',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  resetButtonLabel: {
    color: '#d5dde6',
    fontSize: 14,
    fontWeight: '700',
  },
  messageText: {
    color: '#d5dde6',
    fontSize: 13,
    lineHeight: 20,
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
