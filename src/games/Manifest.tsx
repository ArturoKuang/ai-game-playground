import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentCoversRequirements,
  currentManifestTable,
  currentMissingSummary,
  currentWindowLength,
  currentWindowSymbols,
  formatManifest,
  formatRange,
  fullRepackCost,
  generatePuzzle,
  incomingSymbol,
  leftEdgeImpact,
  type ManifestDifficulty,
  type ManifestState,
  upcomingCount,
} from '../solvers/Manifest.solver';

const DIFFICULTIES: ManifestDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: ManifestDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Manifest() {
  const [difficulty, setDifficulty] = useState<ManifestDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<ManifestState>(() => createInitialState(buildPuzzle(1, 0)));

  const liveWindow = useMemo(() => currentWindowSymbols(state), [state]);
  const incoming = useMemo(() => incomingSymbol(state), [state]);
  const manifestTable = useMemo(() => currentManifestTable(state), [state]);
  const covered = useMemo(() => currentCoversRequirements(state), [state]);
  const repackCost = useMemo(() => fullRepackCost(state), [state]);
  const bandLength = useMemo(() => currentWindowLength(state), [state]);
  const remaining = useMemo(() => upcomingCount(state), [state]);
  const impact = useMemo(() => leftEdgeImpact(state), [state]);
  const bestSpanLabel = state.bestSpan === null ? 'none' : String(state.bestSpan);

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

  const switchDifficulty = (nextDifficulty: ManifestDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'loadNext' | 'dropLeft' | 'fullRepack') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>
          {puzzle.label} · manifest {formatManifest(puzzle.manifest)}
        </Text>
        <Text style={styles.titleText}>{puzzle.title}</Text>
        <Text style={styles.titleHint}>
          Load until the manifest is covered. The moment it is covered, bank that span and shave the left edge until the cover breaks.
        </Text>
      </View>

      <View style={styles.streamCard}>
        <Text style={styles.cardTitle}>Cargo Belt</Text>
        <View style={styles.streamRow}>
          {puzzle.symbols.map((symbol, index) => {
            const isPast = index < state.left;
            const inWindow = index >= state.left && index < state.right;
            const isIncoming = index === state.right && !state.verdict;
            const isBest =
              state.bestRange ? index >= state.bestRange[0] && index < state.bestRange[1] : false;

            return (
              <View
                key={`${symbol}-${index}`}
                style={[
                  styles.symbolCard,
                  isPast && styles.symbolCardPast,
                  inWindow && styles.symbolCardWindow,
                  isIncoming && styles.symbolCardIncoming,
                  isBest && styles.symbolCardBest,
                ]}
              >
                <Text style={styles.symbolIndex}>{index + 1}</Text>
                <Text style={styles.symbolValue}>{symbol}</Text>
                <Text style={styles.symbolMeta}>
                  {isIncoming ? 'next' : inWindow ? 'live' : isPast ? 'past' : isBest ? 'best' : ' '}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Live Satchel</Text>
          <Text style={styles.summaryValue}>{liveWindow.join('') || 'empty'}</Text>
          <Text style={styles.summaryMeta}>Length {bandLength}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Incoming</Text>
          <Text style={styles.summaryValue}>{incoming ?? 'done'}</Text>
          <Text style={styles.summaryMeta}>
            {incoming === null ? 'Belt exhausted.' : covered ? 'Already covered: shave left.' : `Still missing ${currentMissingSummary(state)}.`}
          </Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Coverage</Text>
          <Text style={styles.summaryValue}>{covered ? 'covered' : 'missing'}</Text>
          <Text style={styles.summaryMeta}>
            {covered ? `Left edge is ${impact}.` : `Need ${currentMissingSummary(state)}.`}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Best Cover</Text>
          <Text style={styles.summaryValue}>{bestSpanLabel}</Text>
          <Text style={styles.summaryMeta}>Slots {formatRange(state.bestRange)}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Crates Left</Text>
          <Text style={styles.summaryValue}>{remaining}</Text>
          <Text style={styles.summaryMeta}>Full repack costs {repackCost} actions.</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Manifest Need</Text>
          <Text style={styles.summaryValue}>{puzzle.manifest.length}</Text>
          <Text style={styles.summaryMeta}>Total required stamped crates across the manifest.</Text>
        </View>
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.cardTitle}>Manifest Ledger</Text>
        <View style={styles.ledgerRow}>
          {manifestTable.map((entry) => (
            <View
              key={entry.symbol}
              style={[styles.ledgerChip, entry.missing === 0 ? styles.ledgerChipCovered : styles.ledgerChipMissing]}
            >
              <Text style={styles.logValue}>{entry.symbol}</Text>
              <Text style={styles.logMeta}>
                need {entry.need} · have {entry.have}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.cardTitle}>Best Covers</Text>
        {state.milestones.length > 0 ? (
          <View style={styles.logRow}>
            {state.milestones.map((milestone) => (
              <View key={`${milestone.span}-${milestone.range[0]}-${milestone.range[1]}`} style={styles.logChip}>
                <Text style={styles.logValue}>{milestone.note}</Text>
                <Text style={styles.logMeta}>
                  {milestone.span} wide · slots {formatRange(milestone.range)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Your shortest valid satchel will appear here as soon as a full manifest is covered.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Dock Desk</Text>
        <Text style={styles.infoLine}>Load Next: add the next unread crate to the live satchel.</Text>
        <Text style={styles.infoLine}>Drop Left: remove the oldest crate from the satchel front.</Text>
        <Text style={styles.infoLine}>Full Repack: dump the current satchel and restart on the incoming crate. Fast to think, expensive to do.</Text>
      </View>

      <View style={[styles.warningCard, covered ? styles.warningCardCool : styles.warningCardHot]}>
        <Text style={styles.warningTitle}>{covered ? 'Manifest Covered' : 'Manifest Missing'}</Text>
        <Text style={styles.warningText}>
          {covered
            ? impact === 'spare'
              ? 'The left edge is spare cargo. Trim it and keep the manifest alive.'
              : 'The left edge is critical cargo. Bank the current cover, then trim it anyway so the next shorter search can begin from the preserved suffix.'
            : `Keep loading until the satchel covers ${currentMissingSummary(state)}.`}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('dropLeft')}
          disabled={Boolean(state.verdict) || bandLength === 0}
          style={[styles.controlButton, (state.verdict || bandLength === 0) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Drop Left</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('loadNext')}
          disabled={Boolean(state.verdict) || incoming === null}
          style={[styles.controlButton, styles.primaryButton, (state.verdict || incoming === null) && styles.controlButtonDisabled]}
        >
          <Text style={styles.primaryButtonLabel}>Load Next</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('fullRepack')}
          disabled={Boolean(state.verdict) || incoming === null}
          style={[styles.controlButton, (state.verdict || incoming === null) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Full Repack</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Route</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Route</Text>
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
      title="Manifest"
      emoji="MF"
      subtitle="Sliding window for Minimum Window Substring"
      objective="Sweep the cargo belt once, keep the smallest contiguous satchel that covers every required manifest stamp, and avoid wasting actions on full repacks."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
        {
          label: 'New Route',
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
          'This is the minimum-window sliding window: keep expanding until all required counts are present, then keep trimming the left edge while the cover still holds to discover the shortest valid span.',
        takeaway:
          'Load Next maps to advancing `right` while counts are still missing. Drop Left after a valid cover maps to the `while (window covers need)` loop that records a candidate answer, decrements `s[left]`, and advances `left` until coverage breaks.',
      }}
      leetcodeLinks={[
        {
          id: 76,
          title: 'Minimum Window Substring',
          url: 'https://leetcode.com/problems/minimum-window-substring/',
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
    backgroundColor: '#171717',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f3136',
    padding: 16,
    gap: 8,
  },
  titleLabel: {
    color: '#f4c95d',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  titleHint: {
    color: '#b8bec8',
    fontSize: 14,
    lineHeight: 20,
  },
  streamCard: {
    backgroundColor: '#171717',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f3136',
    padding: 14,
    gap: 12,
  },
  streamRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  symbolCard: {
    width: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#31343a',
    backgroundColor: '#0f1114',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  symbolCardPast: {
    opacity: 0.45,
  },
  symbolCardWindow: {
    borderColor: '#4fd1c5',
    backgroundColor: '#122629',
  },
  symbolCardIncoming: {
    borderColor: '#f4c95d',
    backgroundColor: '#2a2412',
  },
  symbolCardBest: {
    borderColor: '#ff8c42',
  },
  symbolIndex: {
    color: '#8e97a4',
    fontSize: 11,
    fontWeight: '700',
  },
  symbolValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  symbolMeta: {
    color: '#c7ced8',
    fontSize: 11,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#171717',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f3136',
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    color: '#d6d9df',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#aeb6c2',
    fontSize: 13,
    lineHeight: 18,
  },
  historyCard: {
    backgroundColor: '#171717',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f3136',
    padding: 14,
    gap: 12,
  },
  ledgerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ledgerChip: {
    minWidth: 92,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  ledgerChipCovered: {
    borderColor: '#4fd1c5',
    backgroundColor: '#122629',
  },
  ledgerChipMissing: {
    borderColor: '#ff8c42',
    backgroundColor: '#2a1e18',
  },
  logRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  logChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#31343a',
    backgroundColor: '#0f1114',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  logValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  logMeta: {
    color: '#adb5c1',
    fontSize: 12,
  },
  emptyText: {
    color: '#adb5c1',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#171717',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f3136',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#d6d9df',
    fontSize: 14,
    lineHeight: 20,
  },
  warningCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  warningCardCool: {
    borderColor: '#4fd1c5',
    backgroundColor: '#122629',
  },
  warningCardHot: {
    borderColor: '#ff8c42',
    backgroundColor: '#2a1e18',
  },
  warningTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  warningText: {
    color: '#d7dde6',
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3a3d44',
    backgroundColor: '#171717',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    borderColor: '#f4c95d',
    backgroundColor: '#3a2d0d',
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlButtonLabel: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButtonLabel: {
    color: '#fff6d8',
    fontSize: 14,
    fontWeight: '800',
  },
  resetButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3a3d44',
    backgroundColor: '#111316',
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetButtonLabel: {
    color: '#d9dee6',
    fontSize: 14,
    fontWeight: '700',
  },
  messageText: {
    color: '#d6d9df',
    fontSize: 14,
    lineHeight: 20,
  },
  verdictText: {
    fontSize: 15,
    fontWeight: '800',
  },
  winText: {
    color: '#4fd1c5',
  },
  lossText: {
    color: '#ff8c42',
  },
});
