import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  canScoutSlot,
  canSealDead,
  canUseLink,
  createInitialState,
  evaluateSpellsplice,
  linksForSlot,
  linkStatus,
  prefixPreview,
  remainingUnsealed,
  scoutCostForSlot,
  sealedSlotCount,
  selectedReachability,
  slotIsSealed,
  type SpellspliceDifficulty,
  type SpellspliceLink,
  type SpellspliceState,
  generatePuzzle,
} from '../solvers/Spellsplice.solver';

const DIFFICULTIES: SpellspliceDifficulty[] = [1, 2, 3, 4, 5];
const EVALUATION = evaluateSpellsplice();

function buildPuzzle(difficulty: SpellspliceDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

function slotStatusLabel(state: SpellspliceState, slot: number) {
  const sealed = state.sealedReachable[slot];
  if (sealed === true) return 'live';
  if (sealed === false) return 'dead';
  return 'open';
}

function chosenLinkLabel(link: SpellspliceLink | null) {
  if (!link) return 'none';
  return `${link.word} @ ${link.start}`;
}

export default function Spellsplice() {
  const [difficulty, setDifficulty] = useState<SpellspliceDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<SpellspliceState>(() => createInitialState(buildPuzzle(1, 0)));

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

  const switchDifficulty = (nextDifficulty: SpellspliceDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const selectedSlot = state.selectedSlot;
  const selectedPreview = prefixPreview(puzzle, selectedSlot);
  const selectedLinks = linksForSlot(puzzle, selectedSlot);
  const selectedSeal = selectedReachability(state);
  const scoutCost = scoutCostForSlot(puzzle, selectedSlot);
  const difficultyMetrics = EVALUATION.difficulties.find((entry) => entry.difficulty === difficulty);

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Ribbon</Text>
          <Text style={styles.summaryValue}>{puzzle.ribbon.length}</Text>
          <Text style={styles.summaryMeta}>glyphs</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Finish</Text>
          <Text style={styles.summaryValue}>
            {state.sealedReachable[puzzle.ribbon.length] === null
              ? '?'
              : state.sealedReachable[puzzle.ribbon.length]
                ? 'live'
                : 'dead'}
          </Text>
          <Text style={styles.summaryMeta}>final endpoint</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Sealed</Text>
          <Text style={styles.summaryValue}>{sealedSlotCount(state)}</Text>
          <Text style={styles.summaryMeta}>{remainingUnsealed(state)} left</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Ribbon Line</Text>
        <View style={styles.ribbonRow}>
          {puzzle.ribbon.split('').map((glyph, index) => {
            const slot = index + 1;
            const isCurrent = slot === selectedSlot && !state.verdict;
            return (
              <Pressable
                key={`glyph-${slot}`}
                onPress={() => setState((current) => applyMove(current, { type: 'select', slot }))}
                style={[
                  styles.glyphCard,
                  isCurrent && styles.glyphCardCurrent,
                  slotIsSealed(state, slot) && styles.glyphCardDone,
                ]}
              >
                <Text style={styles.glyphIndex}>{slot}</Text>
                <Text style={styles.glyphValue}>{glyph}</Text>
                <Text style={styles.glyphMeta}>{slotStatusLabel(state, slot)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Prefix Ledger</Text>
        <View style={styles.prefixGrid}>
          {Array.from({ length: puzzle.ribbon.length }, (_, index) => {
            const slot = index + 1;
            const chosen = state.chosenLinks[slot];
            const isSelected = slot === selectedSlot;
            const sealed = state.sealedReachable[slot];
            return (
              <Pressable
                key={`slot-${slot}`}
                onPress={() => setState((current) => applyMove(current, { type: 'select', slot }))}
                style={[
                  styles.prefixCard,
                  isSelected && styles.prefixCardSelected,
                  sealed === true && styles.prefixCardLive,
                  sealed === false && styles.prefixCardDead,
                ]}
              >
                <Text style={styles.prefixLabel}>{`End ${slot}`}</Text>
                <Text style={styles.prefixText}>{prefixPreview(puzzle, slot)}</Text>
                <Text style={styles.prefixValue}>{sealed === null ? 'open' : sealed ? 'live' : 'dead'}</Text>
                <Text style={styles.prefixMeta}>{`bridge ${chosenLinkLabel(chosen)}`}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Splice Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.logWrap}>
            {state.history.slice(0, 8).map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.logChip}>
                <Text style={styles.logText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            Start at endpoint 1 and move right. Later-looking seams can be dead, so every live endpoint needs a real launch from behind.
          </Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Splice Rules</Text>
        <Text style={styles.infoLine}>Choose one listed word that ends at the selected endpoint.</Text>
        <Text style={styles.infoLine}>That word seals the endpoint live only if its starting cut is already sealed live.</Text>
        <Text style={styles.infoLine}>If every listed word starts from a dead cut, seal the endpoint dead.</Text>
        <Text style={styles.infoLine}>Scout Endpoint certifies the endpoint directly, but it burns a brute-force cut-check tax.</Text>
      </View>

      <View style={styles.selectedCard}>
        <Text style={styles.cardTitle}>{`Selected Endpoint ${selectedSlot}`}</Text>
        <Text style={styles.selectedValue}>{selectedSeal === null ? selectedPreview : selectedSeal ? 'live' : 'dead'}</Text>
        <Text style={styles.selectedMeta}>
          {selectedSeal === null
            ? `Prefix "${selectedPreview}" has ${selectedLinks.length} listed splice${selectedLinks.length === 1 ? '' : 's'} ending here.`
            : `Prefix "${selectedPreview}" is already sealed ${selectedSeal ? 'live' : 'dead'}.`}
        </Text>
      </View>

      <View style={styles.dictionaryCard}>
        <Text style={styles.cardTitle}>Lexicon</Text>
        <View style={styles.dictionaryWrap}>
          {puzzle.dictionary.map((word) => (
            <View key={word} style={styles.dictionaryChip}>
              <Text style={styles.dictionaryText}>{word}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.choiceCard}>
        <Text style={styles.choiceTitle}>Listed Splices Into This Endpoint</Text>
        {selectedLinks.length > 0 ? (
          <View style={styles.choiceStack}>
            {selectedLinks.map((link) => {
              const status = linkStatus(state, link);
              const enabled = canUseLink(state, selectedSlot, link);
              return (
                <Pressable
                  key={`${selectedSlot}-${link.start}-${link.word}`}
                  onPress={() =>
                    setState((current) =>
                      applyMove(current, {
                        type: 'link',
                        slot: selectedSlot,
                        start: link.start,
                        word: link.word,
                      }),
                    )
                  }
                  disabled={!enabled}
                  style={[
                    styles.choiceButton,
                    enabled && styles.choiceButtonSelected,
                    !enabled && styles.choiceButtonDisabled,
                  ]}
                >
                  <Text style={[styles.choiceLabel, enabled && styles.choiceLabelSelected]}>
                    {`${link.word} from cut ${link.start}`}
                  </Text>
                  <Text style={styles.choiceMeta}>
                    {status === 'live'
                      ? 'live launch'
                      : status === 'dead'
                        ? 'dead launch'
                        : 'launch unresolved'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>No listed word ends exactly here.</Text>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'dead' }))}
          disabled={!canSealDead(state, selectedSlot) || Boolean(state.verdict)}
          style={[
            styles.controlButton,
            (!canSealDead(state, selectedSlot) || state.verdict) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.controlLabel}>Seal Dead</Text>
        </Pressable>
        <Pressable
          onPress={() => setState((current) => applyMove(current, { type: 'scout' }))}
          disabled={!canScoutSlot(state, selectedSlot) || Boolean(state.verdict)}
          style={[
            styles.controlButton,
            canScoutSlot(state, selectedSlot) && !state.verdict && styles.primaryButton,
            (!canScoutSlot(state, selectedSlot) || state.verdict) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={[styles.controlLabel, canScoutSlot(state, selectedSlot) && !state.verdict ? styles.primaryLabel : null]}>
            {`Scout Endpoint (${scoutCost})`}
          </Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetLabel}>Reset Ribbon</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetLabel}>New Ribbon</Text>
        </Pressable>
      </View>

      <Text style={styles.messageText}>{state.message}</Text>
      {state.verdict ? (
        <View style={[styles.verdictCard, state.verdict.correct ? styles.verdictCardWin : styles.verdictCardLoss]}>
          <Text style={styles.verdictTitle}>{state.verdict.correct ? 'Ledger Kept' : 'Ledger Broke'}</Text>
          <Text style={styles.verdictText}>{state.verdict.label}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <GameScreenTemplate
      title="Spellsplice"
      emoji="SS"
      subtitle="Seal each endpoint from one earlier live cut plus a listed word. Local-looking seams lie once the dead prefixes pile up."
      objective="Certify the whole prefix ledger before the scout budget runs out."
      statsLabel={
        difficultyMetrics
          ? `${puzzle.label} • skill ${Math.round(difficultyMetrics.skillDepth * 100)}%`
          : puzzle.label
      }
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Ribbon', onPress: rerollPuzzle, tone: 'primary' },
      ]}
      difficultyOptions={DIFFICULTIES.map((option) => ({
        label: `D${option}`,
        selected: option === difficulty,
        onPress: () => switchDifficulty(option),
      }))}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        title: 'What This Teaches',
        summary:
          'A prefix stays live only if some earlier live cut plus one listed word reaches it exactly. That is the Word Break recurrence: `dp[i] = any(dp[j] && s[j:i] in dict)`.',
        takeaway:
          'Choosing a splice button maps to checking one split `j`, and sealing dead maps to exhausting every listed split into the endpoint without finding a live predecessor.',
      }}
      leetcodeLinks={[
        {
          id: 139,
          title: 'Word Break',
          url: 'https://leetcode.com/problems/word-break/',
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
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#151d18',
    borderWidth: 1,
    borderColor: '#314438',
    gap: 4,
  },
  sectionCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#14181a',
    borderWidth: 1,
    borderColor: '#273238',
    gap: 10,
  },
  cardTitle: {
    color: '#dfe8dd',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#9eb0a2',
    fontSize: 12,
  },
  ribbonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  glyphCard: {
    width: 58,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#112028',
    borderWidth: 1,
    borderColor: '#284453',
    alignItems: 'center',
    gap: 4,
  },
  glyphCardCurrent: {
    borderColor: '#86d3ff',
    backgroundColor: '#163140',
  },
  glyphCardDone: {
    backgroundColor: '#1d2f24',
    borderColor: '#476a53',
  },
  glyphIndex: {
    color: '#9db1be',
    fontSize: 11,
    fontWeight: '700',
  },
  glyphValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  glyphMeta: {
    color: '#b7c4cc',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  prefixGrid: {
    gap: 8,
  },
  prefixCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#101416',
    borderWidth: 1,
    borderColor: '#283238',
    gap: 4,
  },
  prefixCardSelected: {
    borderColor: '#8cd2ab',
    backgroundColor: '#16211a',
  },
  prefixCardLive: {
    borderColor: '#4f8b66',
  },
  prefixCardDead: {
    borderColor: '#6e4b4b',
    backgroundColor: '#211616',
  },
  prefixLabel: {
    color: '#b8c4bb',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  prefixText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  prefixValue: {
    color: '#d6e7d7',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  prefixMeta: {
    color: '#91a59a',
    fontSize: 12,
  },
  logWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#1f2629',
    borderWidth: 1,
    borderColor: '#39464d',
  },
  logText: {
    color: '#dbe2e5',
    fontSize: 12,
    lineHeight: 16,
  },
  emptyText: {
    color: '#a9b9bf',
    fontSize: 13,
    lineHeight: 19,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#121d18',
    borderWidth: 1,
    borderColor: '#31463c',
    gap: 8,
  },
  infoLine: {
    color: '#d9e8de',
    fontSize: 13,
    lineHeight: 18,
  },
  selectedCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#131c24',
    borderWidth: 1,
    borderColor: '#2f4758',
    gap: 6,
  },
  selectedValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  selectedMeta: {
    color: '#adc0cc',
    fontSize: 13,
    lineHeight: 18,
  },
  dictionaryCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#1a161e',
    borderWidth: 1,
    borderColor: '#43334f',
    gap: 10,
  },
  dictionaryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dictionaryChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#261f2e',
    borderWidth: 1,
    borderColor: '#544364',
  },
  dictionaryText: {
    color: '#f0e7ff',
    fontSize: 12,
    fontWeight: '700',
  },
  choiceCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#181a12',
    borderWidth: 1,
    borderColor: '#44492d',
    gap: 10,
  },
  choiceTitle: {
    color: '#f1f1d5',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  choiceStack: {
    gap: 8,
  },
  choiceButton: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#222514',
    borderWidth: 1,
    borderColor: '#545c33',
    gap: 4,
  },
  choiceButtonSelected: {
    backgroundColor: '#253a1f',
    borderColor: '#7db46d',
  },
  choiceButtonDisabled: {
    opacity: 0.55,
  },
  choiceLabel: {
    color: '#f2efdf',
    fontSize: 14,
    fontWeight: '700',
  },
  choiceLabelSelected: {
    color: '#edffe6',
  },
  choiceMeta: {
    color: '#b8c1a0',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202427',
    borderWidth: 1,
    borderColor: '#414c52',
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  primaryButton: {
    backgroundColor: '#1f3b32',
    borderColor: '#5d9e86',
  },
  controlLabel: {
    color: '#edf1f3',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryLabel: {
    color: '#e9fff5',
  },
  resetButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171b1d',
    borderWidth: 1,
    borderColor: '#313b40',
  },
  resetLabel: {
    color: '#d7e0e5',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#d7e1e3',
    fontSize: 13,
    lineHeight: 19,
  },
  verdictCard: {
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  verdictCardWin: {
    backgroundColor: '#17301f',
    borderWidth: 1,
    borderColor: '#4f8a62',
  },
  verdictCardLoss: {
    backgroundColor: '#311d1d',
    borderWidth: 1,
    borderColor: '#915656',
  },
  verdictTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  verdictText: {
    color: '#e7eff1',
    fontSize: 13,
    lineHeight: 18,
  },
});
