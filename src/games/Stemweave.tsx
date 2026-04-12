import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  bankableWord,
  buildPuzzle,
  createInitialState,
  currentChoices,
  currentStem,
  evaluateStemweave,
  exhaustedStarts,
  groupedStemViews,
  legalMoves,
  letterAt,
  liveWordsFromStem,
  parseCellId,
  type StemweaveDifficulty,
  type StemweavePuzzle,
  type StemweaveState,
} from '../solvers/Stemweave.solver';

const DIFFICULTIES: StemweaveDifficulty[] = [1, 2, 3, 4, 5];
const EVALUATION = evaluateStemweave();

function cellSizeFor(size: number) {
  if (size <= 3) return 76;
  if (size <= 4) return 60;
  return 50;
}

function trailLabel(path: string[], puzzle: StemweavePuzzle) {
  if (path.length === 0) return 'no live stem';
  return path.map((id) => letterAt(puzzle, id)).join(' -> ');
}

export default function Stemweave() {
  const [difficulty, setDifficulty] = useState<StemweaveDifficulty>(1);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1));
  const [state, setState] = useState<StemweaveState>(() => createInitialState(buildPuzzle(1)));

  const metrics = useMemo(
    () => EVALUATION.difficulties.find((entry) => entry.difficulty === difficulty),
    [difficulty],
  );
  const legal = new Set(legalMoves(state));
  const choices = currentChoices(state);
  const liveChoiceSet = new Set(choices);
  const spentRootSet = new Set(exhaustedStarts(state));
  const stem = currentStem(state);
  const bankWord = bankableWord(state);
  const liveWords = liveWordsFromStem(state);
  const stemGroups = useMemo(() => groupedStemViews(puzzle), [puzzle]);
  const foundSet = new Set(state.foundWords);

  const resetPuzzle = (nextPuzzle = puzzle) => {
    setPuzzle(nextPuzzle);
    setState(createInitialState(nextPuzzle));
  };

  const switchDifficulty = (nextDifficulty: StemweaveDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty);
    setDifficulty(nextDifficulty);
    resetPuzzle(nextPuzzle);
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Current Stem</Text>
          <Text style={styles.summaryValue}>{stem || 'ROOT'}</Text>
          <Text style={styles.summaryMeta}>{trailLabel(state.path, puzzle)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Seals Banked</Text>
          <Text style={styles.summaryValue}>{`${state.foundWords.length}/${puzzle.words.length}`}</Text>
          <Text style={styles.summaryMeta}>{state.foundWords.join(', ') || 'none yet'}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Lantern Budget</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>actions used</Text>
        </View>
      </View>

      <View style={styles.gridShell}>
        {puzzle.board.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.gridRow}>
            {row.split('').map((letter, colIndex) => {
              const id = `${rowIndex}:${colIndex}`;
              const stepIndex = state.path.indexOf(id);
              const isChoice = liveChoiceSet.has(id);
              const isSpentRoot = state.path.length === 0 && spentRootSet.has(id);
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
                    isSpentRoot && styles.cellSpentRoot,
                  ]}
                >
                  <Text style={styles.cellLetter}>{letter}</Text>
                  <Text style={styles.cellMeta}>
                    {stepIndex >= 0 ? `#${stepIndex + 1}` : isChoice ? 'live' : isSpentRoot ? 'spent' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Word Ledger</Text>
        <View style={styles.wordWrap}>
          {puzzle.words.map((word) => (
            <View key={word} style={[styles.wordChip, foundSet.has(word) && styles.wordChipFound]}>
              <Text style={[styles.wordText, foundSet.has(word) && styles.wordTextFound]}>{word}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Shared Stem Map</Text>
        <View style={styles.columnsRow}>
          {stemGroups.map((group) => (
            <View key={`depth-${group.depth}`} style={styles.column}>
              <Text style={styles.columnTitle}>{group.depth === 0 ? 'Root' : `Depth ${group.depth}`}</Text>
              {group.stems.map((entry) => {
                const label = entry.prefix || 'ROOT';
                const isCurrent = entry.prefix === stem;
                const isAncestor = entry.prefix !== '' && stem.startsWith(entry.prefix) && entry.prefix !== stem;
                const isFoundStem = entry.isWord && foundSet.has(entry.prefix);
                return (
                  <View
                    key={label}
                    style={[
                      styles.stemCard,
                      isCurrent && styles.stemCurrent,
                      isAncestor && styles.stemAncestor,
                      isFoundStem && styles.stemFound,
                    ]}
                  >
                    <Text style={styles.stemTitle}>{label}</Text>
                    <Text style={styles.stemMeta}>
                      {entry.isWord ? 'seal' : 'prefix'}
                      {entry.childLetters.length > 0 ? ` | next ${entry.childLetters.join(', ')}` : ' | dead tip'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Search Ledger</Text>
        <Text style={styles.helperLine}>{state.message}</Text>
        <Text style={styles.ledgerLine}>{`Live stem: ${stem || 'ROOT'}`}</Text>
        <Text style={styles.ledgerLine}>{`Bankable seal: ${bankWord ?? 'none'}`}</Text>
        <Text style={styles.ledgerLine}>
          {`Live continuations: ${choices.length > 0 ? choices.map((id) => letterAt(puzzle, id)).join(', ') : 'none'}`}
        </Text>
        <Text style={styles.ledgerLine}>
          {`Live listed words: ${liveWords.length > 0 ? liveWords.join(', ') : 'none'}`}
        </Text>
        <Text style={styles.ledgerLine}>
          {`Spent root starts: ${
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
        <Text style={styles.cardTitle}>Trail Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.routeWrap}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.routeChip}>
                <Text style={styles.routeText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No weave yet. Start on a root letter that opens some listed word.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.infoLine}>Tap a lit tile to extend the live stem through a listed trie prefix.</Text>
        <Text style={styles.infoLine}>Bank Word seals the current word but keeps the trail alive if longer words still share that stem.</Text>
        <Text style={styles.infoLine}>Backtrack prunes only the newest tile, marks that branch spent for this stem, and reopens the last useful fork.</Text>
        <Text style={styles.infoLine}>Claim Complete only after every listed word is banked.</Text>
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
          disabled={!legal.has('bank')}
          onPress={() => setState((current) => applyMove(current, { type: 'bank' }))}
          style={[styles.controlButton, styles.primaryButton, !legal.has('bank') && styles.controlButtonDisabled]}
        >
          <Text style={styles.primaryButtonLabel}>Bank Word</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={!legal.has('claimComplete')}
          onPress={() => setState((current) => applyMove(current, { type: 'claimComplete' }))}
          style={[styles.controlButton, !legal.has('claimComplete') && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Claim Complete</Text>
        </Pressable>
        <Pressable onPress={() => resetPuzzle()} style={styles.controlButton}>
          <Text style={styles.controlButtonLabel}>Reset Search</Text>
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
      title="Stemweave"
      emoji="SW"
      subtitle="Find every listed word on one board by keeping only trie-live stems alive, banking words without collapsing the trail, and pruning branches the moment the shared prefix dies."
      objective="Harvest every listed word before the lantern budget breaks."
      statsLabel={`${puzzle.label} • ${metrics ? `${Math.round(metrics.skillDepth * 100)}% depth` : 'trie search'}`}
      actions={[{ label: 'Reset', onPress: () => resetPuzzle(), tone: 'primary' }]}
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
          'Stemweave teaches Word Search II by combining board DFS with a shared trie: start from any root letter that opens some listed word, extend only through adjacent letters that keep the current trail on a live trie prefix, bank each sealed word when it surfaces, and keep the trail alive while longer words still share that stem.',
        takeaway:
          'The moment where a dead trail forces a local prune maps to cutting recursion as soon as the trie has no child for the next board letter, while banking a shorter word without dropping the trail maps to recording a trie node as a hit and still searching deeper for longer words that share the same prefix.',
      }}
      leetcodeLinks={[
        {
          id: 212,
          title: 'Word Search II',
          url: 'https://leetcode.com/problems/word-search-ii/',
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
    backgroundColor: '#151c19',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#29463a',
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: '#8dd0b0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#f4fff9',
    fontSize: 18,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#b8d2c4',
    fontSize: 12,
    lineHeight: 16,
  },
  gridShell: {
    alignSelf: 'center',
    gap: 8,
    backgroundColor: '#10201b',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#29463a',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#305145',
    backgroundColor: '#1a2b24',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cellChoice: {
    backgroundColor: '#284f3f',
    borderColor: '#7cdbb0',
  },
  cellOnTrail: {
    backgroundColor: '#8dd0b0',
    borderColor: '#dff7eb',
  },
  cellSpentRoot: {
    opacity: 0.4,
  },
  cellLetter: {
    color: '#f6fff9',
    fontSize: 24,
    fontWeight: '800',
  },
  cellMeta: {
    color: '#d7efe3',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionCard: {
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#29463a',
    backgroundColor: '#12241d',
    padding: 12,
  },
  wordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3e6656',
    backgroundColor: '#182f27',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  wordChipFound: {
    backgroundColor: '#8dd0b0',
    borderColor: '#dff7eb',
  },
  wordText: {
    color: '#e9fff3',
    fontSize: 12,
    fontWeight: '700',
  },
  wordTextFound: {
    color: '#103225',
  },
  columnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  column: {
    flex: 1,
    gap: 8,
  },
  columnTitle: {
    color: '#cbe7d7',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stemCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#35584a',
    backgroundColor: '#182f27',
    padding: 10,
    gap: 4,
  },
  stemCurrent: {
    backgroundColor: '#3a6d58',
    borderColor: '#b7f2d1',
  },
  stemAncestor: {
    borderColor: '#6cb996',
  },
  stemFound: {
    backgroundColor: '#294a3d',
  },
  stemTitle: {
    color: '#f3fff8',
    fontSize: 13,
    fontWeight: '800',
  },
  stemMeta: {
    color: '#cbe7d7',
    fontSize: 11,
    lineHeight: 15,
  },
  helperLine: {
    color: '#f0fff7',
    fontSize: 14,
    lineHeight: 20,
  },
  ledgerLine: {
    color: '#bfdaca',
    fontSize: 12,
    lineHeight: 17,
  },
  routeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeChip: {
    borderRadius: 999,
    backgroundColor: '#1e342c',
    borderWidth: 1,
    borderColor: '#35584a',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  routeText: {
    color: '#e7fff2',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#bfdaca',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#35584a',
    backgroundColor: '#172c25',
    padding: 12,
    gap: 8,
  },
  infoLine: {
    color: '#e9fff3',
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
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4d7e69',
    backgroundColor: '#20372f',
    paddingHorizontal: 12,
  },
  controlButtonDisabled: {
    opacity: 0.35,
  },
  primaryButton: {
    backgroundColor: '#8dd0b0',
    borderColor: '#dff7eb',
  },
  controlButtonLabel: {
    color: '#edfff6',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  primaryButtonLabel: {
    color: '#103225',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  winText: {
    color: '#9df0c2',
  },
  lossText: {
    color: '#ff9d9d',
  },
});
