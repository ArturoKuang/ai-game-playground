import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  branchMode,
  createInitialState,
  currentCandidate,
  evaluateStillpath,
  formatRecipe,
  foundRecipeCount,
  generatePuzzle,
  legalMoves,
  missingRecipes,
  remainingGap,
  totalRecipes,
  type StillpathDifficulty,
  type StillpathMoveType,
  type StillpathState,
} from '../solvers/Stillpath.solver';

const DIFFICULTIES: StillpathDifficulty[] = [1, 2, 3, 4, 5];
const EVALUATION = evaluateStillpath();

function buildPuzzle(difficulty: StillpathDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function statusTitle(state: StillpathState) {
  const mode = branchMode(state);
  if (mode === 'live') return 'Live Branch';
  if (mode === 'exactReady') return 'Bottle Ready';
  if (mode === 'exactSealed') return 'Bottle Sealed';
  if (mode === 'overshot') return 'Overshot';
  return 'Shelf Exhausted';
}

function recipeList(recipes: number[][]) {
  return recipes.length === 0 ? 'none yet' : recipes.map((recipe) => formatRecipe(recipe)).join(' | ');
}

export default function Stillpath() {
  const [difficulty, setDifficulty] = useState<StillpathDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<StillpathState>(() => createInitialState(buildPuzzle(1, 0)));
  const metrics = useMemo(
    () => EVALUATION.difficulties.find((entry) => entry.difficulty === difficulty),
    [difficulty],
  );

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

  const switchDifficulty = (nextDifficulty: StillpathDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: StillpathMoveType) => {
    setState((current) => applyMove(current, { type: move }));
  };

  const legal = new Set(legalMoves(state));
  const candidate = currentCandidate(state);
  const remaining = remainingGap(state);
  const missed = missingRecipes(state);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Target Proof</Text>
          <Text style={styles.summaryValue}>{puzzle.target}</Text>
          <Text style={styles.summaryMeta}>exact total required</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Live Total</Text>
          <Text style={styles.summaryValue}>{state.total}</Text>
          <Text style={styles.summaryMeta}>{remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Audit Clock</Text>
          <Text style={styles.summaryValue}>{`${state.actionsUsed}/${puzzle.budget}`}</Text>
          <Text style={styles.summaryMeta}>moves used</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Current Herb</Text>
          <Text style={styles.summaryValue}>{candidate ?? '—'}</Text>
          <Text style={styles.summaryMeta}>
            {candidate === null ? 'branch spent' : `shelf ${state.cursor + 1} of ${puzzle.candidates.length}`}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Bottled</Text>
          <Text style={styles.summaryValue}>{`${foundRecipeCount(state)}/${totalRecipes(state)}`}</Text>
          <Text style={styles.summaryMeta}>exact recipes logged</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Branch Mode</Text>
          <Text style={styles.summaryValue}>{statusTitle(state)}</Text>
          <Text style={styles.summaryMeta}>current search state</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Shelf</Text>
        <View style={styles.chipRow}>
          {puzzle.candidates.map((value, index) => {
            const selectedCount = state.stack.filter((entry) => entry === value).length;
            return (
              <View
                key={`candidate-${value}-${index}`}
                style={[
                  styles.candidateChip,
                  index === state.cursor && styles.candidateChipActive,
                  index < state.cursor && styles.candidateChipPassed,
                ]}
              >
                <Text style={styles.candidateValue}>{value}</Text>
                <Text style={styles.candidateMeta}>
                  {index === state.cursor ? 'live' : index < state.cursor ? 'passed' : 'ahead'}
                  {selectedCount > 0 ? ` • x${selectedCount}` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Current Recipe Trail</Text>
        {state.stack.length > 0 ? (
          <View style={styles.recipeWrap}>
            {state.stack.map((value, index) => (
              <View key={`stack-${value}-${index}`} style={styles.recipeChip}>
                <Text style={styles.recipeValue}>{value}</Text>
                <Text style={styles.recipeMeta}>{`step ${index + 1}`}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No herbs brewed yet. Start at the live shelf slot.</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Cellar Ledger</Text>
        <Text style={styles.helperLine}>{state.message}</Text>
        <View style={styles.ledgerBlock}>
          <Text style={styles.ledgerLabel}>Bottled Recipes</Text>
          <Text style={styles.ledgerText}>{recipeList(state.found)}</Text>
        </View>
        <View style={styles.ledgerBlock}>
          <Text style={styles.ledgerLabel}>Missing Recipes</Text>
          <Text style={styles.ledgerText}>{recipeList(missed)}</Text>
        </View>
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
          <Text style={styles.emptyText}>
            No moves yet. Reuse the live herb while it still fits, then climb to heavier herbs only when this branch is done.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Cellar Rules</Text>
        <Text style={styles.infoLine}>Brew Here adds the live herb and keeps that herb reusable on the current branch.</Text>
        <Text style={styles.infoLine}>Skip Heavier climbs to the next stronger herb at this same depth.</Text>
        <Text style={styles.infoLine}>Bottle Recipe is only legal on an exact total.</Text>
        <Text style={styles.infoLine}>Backtrack removes the latest herb and reopens the next heavier choice from that parent layer.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('brew')}
          disabled={!legal.has('brew')}
          style={[styles.controlButton, !legal.has('brew') && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Brew Here</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('skip')}
          disabled={!legal.has('skip')}
          style={[styles.controlButton, !legal.has('skip') && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Skip Heavier</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('seal')}
          disabled={!legal.has('seal')}
          style={[styles.controlButton, styles.primaryButton, !legal.has('seal') && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Bottle Recipe</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('backtrack')}
          disabled={!legal.has('backtrack')}
          style={[styles.controlButton, !legal.has('backtrack') && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Backtrack</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <GameScreenTemplate
      title="Stillpath"
      emoji="SP"
      subtitle="Catalog every exact blend by keeping one recipe stack alive, reusing the live herb, and retreating only one layer at a time."
      objective={`Bottle every exact recipe that totals ${puzzle.target} before the cellar audit clock runs out.`}
      statsLabel={`${puzzle.label} • ${metrics ? `${Math.round(metrics.skillDepth * 100)}% depth` : 'search'}`}
      actions={[
        { label: 'Reset Cellar', onPress: () => resetPuzzle(), tone: 'neutral' },
        { label: 'New Shelf', onPress: rerollPuzzle, tone: 'primary' },
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
          'Stillpath teaches sorted DFS/backtracking for exact-sum combinations: keep a nondecreasing recipe stack, reuse the current herb by staying on the same shelf slot, advance only forward to heavier herbs, and retreat one layer when the branch is spent.',
        takeaway:
          'The moment where a bottled recipe forces one-layer retreat maps to popping the last candidate from `path` after recording a valid combination, while staying on the same shelf slot after `Brew Here` maps to recursive reuse with the same start index.',
      }}
      leetcodeLinks={[
        {
          id: 39,
          title: 'Combination Sum',
          url: 'https://leetcode.com/problems/combination-sum/',
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
    backgroundColor: '#171d1b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2e3b34',
    padding: 12,
    gap: 4,
  },
  sectionCard: {
    backgroundColor: '#151818',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2b3333',
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    color: '#f2f4f3',
    fontSize: 16,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#f6f0d0',
    fontSize: 20,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#96a79f',
    fontSize: 12,
    lineHeight: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  candidateChip: {
    minWidth: 82,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#38433c',
    backgroundColor: '#202623',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  candidateChipActive: {
    backgroundColor: '#31533f',
    borderColor: '#9fcb9d',
  },
  candidateChipPassed: {
    backgroundColor: '#242828',
    borderColor: '#4d5353',
    opacity: 0.7,
  },
  candidateValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  candidateMeta: {
    color: '#c7d0ca',
    fontSize: 11,
  },
  recipeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recipeChip: {
    borderRadius: 999,
    backgroundColor: '#332a1f',
    borderWidth: 1,
    borderColor: '#7a6244',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 2,
  },
  recipeValue: {
    color: '#ffe6ae',
    fontSize: 16,
    fontWeight: '800',
  },
  recipeMeta: {
    color: '#d7c29e',
    fontSize: 11,
  },
  helperLine: {
    color: '#d8dfdb',
    fontSize: 14,
    lineHeight: 20,
  },
  ledgerBlock: {
    gap: 4,
  },
  ledgerLabel: {
    color: '#9ab0aa',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ledgerText: {
    color: '#f1f3f2',
    fontSize: 14,
    lineHeight: 20,
  },
  routeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeChip: {
    borderRadius: 999,
    backgroundColor: '#202427',
    borderWidth: 1,
    borderColor: '#40484d',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  routeText: {
    color: '#e6ebef',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#9db0a7',
    fontSize: 13,
    lineHeight: 19,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#171f21',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2e3a3e',
    padding: 14,
    gap: 6,
  },
  infoLine: {
    color: '#d5dddd',
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
    backgroundColor: '#293235',
    borderWidth: 1,
    borderColor: '#425054',
    paddingHorizontal: 12,
  },
  primaryButton: {
    backgroundColor: '#7d4d1f',
    borderColor: '#d28c4d',
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
});
