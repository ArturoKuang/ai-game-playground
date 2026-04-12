import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentChoices,
  currentWord,
  evaluateRunepath,
  exhaustedStarts,
  generatePuzzle,
  legalMoves,
  letterAt,
  nextLetter,
  parseCellId,
  type RunepathDifficulty,
  type RunepathPuzzle,
  type RunepathState,
} from '../solvers/Runepath.solver';

const DIFFICULTIES: RunepathDifficulty[] = [1, 2, 3, 4, 5];
const EVALUATION = evaluateRunepath();

function buildPuzzle(difficulty: RunepathDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function cellSizeFor(size: number) {
  if (size <= 3) return 78;
  if (size <= 4) return 62;
  return 52;
}

function trailLabel(path: string[], puzzle: RunepathPuzzle) {
  if (path.length === 0) return 'no live trail';
  return path.map((id) => letterAt(puzzle, id)).join(' -> ');
}

export default function Runepath() {
  const [difficulty, setDifficulty] = useState<RunepathDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<RunepathState>(() => createInitialState(buildPuzzle(1, 0)));

  const metrics = useMemo(
    () => EVALUATION.difficulties.find((entry) => entry.difficulty === difficulty),
    [difficulty],
  );
  const choices = currentChoices(state);
  const legal = new Set(legalMoves(state));
  const targetNext = nextLetter(state);
  const exhausted = new Set(exhaustedStarts(state));

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

  const switchDifficulty = (nextDifficulty: RunepathDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Target Script</Text>
          <Text style={styles.summaryValue}>{puzzle.word}</Text>
          <Text style={styles.summaryMeta}>{`${state.path.length}/${puzzle.word.length} letters traced`}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Next Rune</Text>
          <Text style={styles.summaryValue}>{targetNext ?? 'Seal'}</Text>
          <Text style={styles.summaryMeta}>
            {targetNext ? `${choices.length} legal choices` : 'full script on trail'}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Lantern Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>moves used</Text>
        </View>
      </View>

      <View style={styles.gridShell}>
        {puzzle.board.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.gridRow}>
            {row.split('').map((letter, colIndex) => {
              const id = `${rowIndex}:${colIndex}`;
              const stepIndex = state.path.indexOf(id);
              const isChoice = choices.includes(id);
              const isExhaustedStart = state.path.length === 0 && exhausted.has(id);
              return (
                <Pressable
                  key={id}
                  disabled={!isChoice}
                  onPress={() => setState((current) => applyMove(current, { type: 'step', cellId: id }))}
                  style={[
                    styles.cell,
                    { width: cellSizeFor(puzzle.board.length), height: cellSizeFor(puzzle.board.length) },
                    stepIndex >= 0 && styles.cellOnTrail,
                    isChoice && styles.cellChoice,
                    isExhaustedStart && styles.cellExhausted,
                  ]}
                >
                  <Text style={styles.cellLetter}>{letter}</Text>
                  <Text style={styles.cellMeta}>
                    {stepIndex >= 0 ? `#${stepIndex + 1}` : isChoice ? 'next' : isExhaustedStart ? 'spent' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Live Trail</Text>
        <Text style={styles.helperLine}>{trailLabel(state.path, puzzle)}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Search Ledger</Text>
        <Text style={styles.helperLine}>{state.message}</Text>
        <Text style={styles.ledgerLine}>{`Current script: ${currentWord(state) || 'empty'}`}</Text>
        <Text style={styles.ledgerLine}>
          {`Spent openings: ${
            exhaustedStarts(state).length === 0
              ? 'none'
              : exhaustedStarts(state)
                  .map((id) => {
                    const { row, col } = parseCellId(id);
                    return `${letterAt(puzzle, id)}@${row + 1},${col + 1}`;
                  })
                  .join(' | ')
          }`}
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Route Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.routeWrap}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.routeChip}>
                <Text style={styles.routeText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No steps yet. Start on a matching opening rune.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.infoLine}>Tap a highlighted tile to trace the next matching rune.</Text>
        <Text style={styles.infoLine}>Backtrack peels only the latest rune and keeps the earlier prefix alive.</Text>
        <Text style={styles.infoLine}>Seal Trail only works when every rune in the target script is already on the live path.</Text>
        <Text style={styles.infoLine}>Call Missing only after every opening and branch has been exhausted.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={!legal.has('backtrack')}
          onPress={() => setState((current) => applyMove(current, { type: 'backtrack' }))}
          style={[styles.controlButton, !legal.has('backtrack') && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Backtrack</Text>
        </Pressable>
        <Pressable
          disabled={!legal.has('claimFound')}
          onPress={() => setState((current) => applyMove(current, { type: 'claimFound' }))}
          style={[styles.controlButton, styles.primaryButton, !legal.has('claimFound') && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Seal Trail</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={!legal.has('claimMissing')}
          onPress={() => setState((current) => applyMove(current, { type: 'claimMissing' }))}
          style={[styles.controlButton, !legal.has('claimMissing') && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Call Missing</Text>
        </Pressable>
        <Pressable onPress={() => resetPuzzle()} style={styles.controlButton}>
          <Text style={styles.controlButtonLabel}>Reset Trail</Text>
        </Pressable>
      </View>

      {state.verdict ? (
        <Text style={[styles.verdictText, state.verdict.correct ? styles.winText : styles.lossText]}>
          {state.verdict.label}
        </Text>
      ) : null}
    </View>
  );

  return (
    <GameScreenTemplate
      title="Runepath"
      emoji="RP"
      subtitle="Trace one word through adjacent tiles, never reuse a tile on the live trail, and backtrack one step when the branch dies."
      objective={`Prove whether "${puzzle.word}" exists on the slate before the lantern budget runs out.`}
      statsLabel={`${puzzle.label} • ${metrics ? `${Math.round(metrics.skillDepth * 100)}% depth` : 'search'}`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Slate', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((entry) => ({
        label: `D${entry}`,
        selected: entry === difficulty,
        onPress: () => switchDifficulty(entry),
      }))}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        summary:
          'Runepath teaches grid DFS/backtracking for Word Search: start from each viable opening cell, extend only into adjacent matching letters, mark the current trail as used, and peel one step back when a branch cannot finish the word.',
        takeaway:
          'The moment where a dead branch removes only the latest rune maps to clearing `visited[row][col]` on the way back up recursion, while exhausted openings at the root map to trying each board cell as a possible start for the word.',
      }}
      leetcodeLinks={[
        {
          id: 79,
          title: 'Word Search',
          url: 'https://leetcode.com/problems/word-search/',
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
    backgroundColor: '#18181f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#303146',
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: '#f2f3f7',
    fontSize: 15,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#f7e8b2',
    fontSize: 20,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#a8afc1',
    fontSize: 12,
    lineHeight: 16,
  },
  gridShell: {
    alignSelf: 'center',
    gap: 6,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#383b52',
    backgroundColor: '#171923',
    gap: 2,
  },
  cellChoice: {
    backgroundColor: '#234760',
    borderColor: '#70b6df',
  },
  cellOnTrail: {
    backgroundColor: '#5a3b1f',
    borderColor: '#e1a767',
  },
  cellExhausted: {
    opacity: 0.38,
  },
  cellLetter: {
    color: '#f6f8fb',
    fontSize: 24,
    fontWeight: '800',
  },
  cellMeta: {
    color: '#ced6df',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#151821',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#292d3d',
    padding: 14,
    gap: 8,
  },
  helperLine: {
    color: '#d9dfeb',
    fontSize: 14,
    lineHeight: 20,
  },
  ledgerLine: {
    color: '#b4c0d3',
    fontSize: 13,
    lineHeight: 19,
  },
  routeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeChip: {
    borderRadius: 999,
    backgroundColor: '#1f2430',
    borderWidth: 1,
    borderColor: '#394152',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  routeText: {
    color: '#ecf1f7',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#a4b0c2',
    fontSize: 13,
    lineHeight: 19,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#181d27',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#293242',
    padding: 14,
    gap: 6,
  },
  infoLine: {
    color: '#d7ddea',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#262c39',
    borderWidth: 1,
    borderColor: '#3c4658',
    paddingHorizontal: 12,
  },
  primaryButton: {
    backgroundColor: '#6d4723',
    borderColor: '#d39a63',
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  verdictText: {
    fontSize: 15,
    fontWeight: '800',
  },
  winText: {
    color: '#9df0c8',
  },
  lossText: {
    color: '#ffbab9',
  },
});
