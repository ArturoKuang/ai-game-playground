import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  createInitialState,
  currentWindowLength,
  currentWindowSymbols,
  duplicateOffset,
  formatRange,
  fullRetuneCost,
  generatePuzzle,
  incomingSymbol,
  type EchoRunDifficulty,
  type EchoRunState,
  upcomingCount,
} from '../solvers/EchoRun.solver';

const DIFFICULTIES: EchoRunDifficulty[] = [1, 2, 3, 4, 5];

function buildPuzzle(difficulty: EchoRunDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function EchoRun() {
  const [difficulty, setDifficulty] = useState<EchoRunDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<EchoRunState>(() => createInitialState(buildPuzzle(1, 0)));

  const liveWindow = useMemo(() => currentWindowSymbols(state), [state]);
  const incoming = useMemo(() => incomingSymbol(state), [state]);
  const echoOffset = useMemo(() => duplicateOffset(state), [state]);
  const retuneCost = useMemo(() => fullRetuneCost(state), [state]);
  const bandLength = useMemo(() => currentWindowLength(state), [state]);
  const remaining = useMemo(() => upcomingCount(state), [state]);

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

  const switchDifficulty = (nextDifficulty: EchoRunDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const runMove = (move: 'tuneNext' | 'dropLeft' | 'fullRetune') => {
    setState((current) => applyMove(current, { type: move }));
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>{puzzle.label}</Text>
        <Text style={styles.titleText}>{puzzle.title}</Text>
        <Text style={styles.titleHint}>Never restart the whole band unless you have to. Trim only enough to evict the echo.</Text>
      </View>

      <View style={styles.streamCard}>
        <Text style={styles.cardTitle}>Signal Stream</Text>
        <View style={styles.streamRow}>
          {puzzle.symbols.map((symbol, index) => {
            const isPast = index < state.left;
            const inWindow = index >= state.left && index < state.right;
            const isIncoming = index === state.right && !state.verdict;
            const isBest = state.bestRange ? index >= state.bestRange[0] && index < state.bestRange[1] : false;

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
                  {isIncoming ? 'next' : inWindow ? 'band' : isPast ? 'past' : isBest ? 'best' : ' '}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Live Band</Text>
          <Text style={styles.summaryValue}>{liveWindow.join('') || 'empty'}</Text>
          <Text style={styles.summaryMeta}>Length {bandLength}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Incoming</Text>
          <Text style={styles.summaryValue}>{incoming ?? 'done'}</Text>
          <Text style={styles.summaryMeta}>
            {incoming === null
              ? 'Signal exhausted.'
              : echoOffset >= 0
                ? `Echoing slot ${state.left + echoOffset + 1}`
                : 'Safe to tune.'}
          </Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Best Clean Band</Text>
          <Text style={styles.summaryValue}>{state.bestSpan}</Text>
          <Text style={styles.summaryMeta}>Slots {formatRange(state.bestRange)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Signal Left</Text>
          <Text style={styles.summaryValue}>{remaining}</Text>
          <Text style={styles.summaryMeta}>Full retune costs {retuneCost} actions.</Text>
        </View>
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.cardTitle}>Band Milestones</Text>
        {state.milestones.length > 0 ? (
          <View style={styles.logRow}>
            {state.milestones.map((milestone) => (
              <View key={`${milestone.span}-${milestone.range[0]}-${milestone.range[1]}`} style={styles.logChip}>
                <Text style={styles.logValue}>{milestone.note}</Text>
                <Text style={styles.logMeta}>
                  {milestone.span} wide, slots {formatRange(milestone.range)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Your best clean band will appear here as soon as the sweep extends it.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Signal Desk</Text>
        <Text style={styles.infoLine}>Tune Next: admit the incoming glyph when it does not echo inside the live band.</Text>
        <Text style={styles.infoLine}>Drop Left: eject the oldest glyph from the band.</Text>
        <Text style={styles.infoLine}>Full Retune: wipe the whole band and restart on the incoming glyph. It is fast to think, but expensive to do.</Text>
      </View>

      {incoming !== null ? (
        <View style={[styles.warningCard, echoOffset >= 0 ? styles.warningCardHot : styles.warningCardCool]}>
          <Text style={styles.warningTitle}>{echoOffset >= 0 ? 'Echo Detected' : 'Channel Clear'}</Text>
          <Text style={styles.warningText}>
            {echoOffset >= 0
              ? `${incoming} already sits inside the live band. Trim from the left until that old copy leaves.`
              : `${incoming} does not echo inside the live band, so tuning forward is safe.`}
          </Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('dropLeft')}
          disabled={Boolean(state.verdict) || bandLength === 0}
          style={[
            styles.controlButton,
            (state.verdict || bandLength === 0) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.controlButtonLabel}>Drop Left</Text>
        </Pressable>
        <Pressable
          onPress={() => runMove('tuneNext')}
          disabled={Boolean(state.verdict) || incoming === null || echoOffset >= 0}
          style={[
            styles.controlButton,
            styles.primaryButton,
            (state.verdict || incoming === null || echoOffset >= 0) && styles.controlButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Tune Next</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => runMove('fullRetune')}
          disabled={Boolean(state.verdict) || incoming === null}
          style={[styles.controlButton, (state.verdict || incoming === null) && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Full Retune</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Signal</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Signal</Text>
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
      title="Echo Run"
      emoji="ER"
      subtitle="Sliding window for Longest Substring Without Repeating Characters"
      objective="Sweep the signal from left to right, keep one clean band with no repeated glyphs, and preserve the longest such band before the retune budget runs out."
      statsLabel={`${state.actionsUsed}/${puzzle.budget} actions`}
      actions={[
        {
          label: 'Reset',
          onPress: () => resetPuzzle(),
        },
        {
          label: 'New Signal',
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
          'This is the classic longest-unique-substring sliding window: the right edge only moves forward, and the left edge advances just enough to kick out a repeated character.',
        takeaway:
          'Tuning next maps to expanding `right`. Dropping left on an echo maps to the `while (seen has s[right]) { remove s[left]; left += 1; }` loop before updating the best span.',
      }}
      leetcodeLinks={[
        {
          id: 3,
          title: 'Longest Substring Without Repeating Characters',
          url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
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
    backgroundColor: '#10202f',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#264c68',
    gap: 6,
  },
  titleLabel: {
    color: '#8dc5ff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titleText: {
    color: '#f5fbff',
    fontSize: 22,
    fontWeight: '800',
  },
  titleHint: {
    color: '#c3d9ea',
    fontSize: 13,
    lineHeight: 18,
  },
  streamCard: {
    backgroundColor: '#121d2a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#263241',
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    color: '#dbe9f5',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  streamRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  symbolCard: {
    width: 66,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2f3945',
    backgroundColor: '#182331',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  symbolCardPast: {
    opacity: 0.45,
  },
  symbolCardWindow: {
    borderColor: '#7bc47f',
    backgroundColor: '#183220',
  },
  symbolCardIncoming: {
    borderColor: '#f0c76c',
    backgroundColor: '#3a2f14',
  },
  symbolCardBest: {
    shadowColor: '#7bc47f',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  symbolIndex: {
    color: '#91a3b6',
    fontSize: 11,
    fontWeight: '700',
  },
  symbolValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  symbolMeta: {
    color: '#c6d2dd',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#121d2a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#263241',
    padding: 14,
    gap: 6,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#c6d2dd',
    fontSize: 12,
    lineHeight: 17,
  },
  historyCard: {
    backgroundColor: '#121d2a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#263241',
    padding: 16,
    gap: 12,
  },
  logRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  logChip: {
    borderRadius: 14,
    backgroundColor: '#1d2b1f',
    borderWidth: 1,
    borderColor: '#2e6235',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
  },
  logValue: {
    color: '#f5fff6',
    fontSize: 15,
    fontWeight: '800',
  },
  logMeta: {
    color: '#c7e9ca',
    fontSize: 11,
  },
  emptyText: {
    color: '#aab9c7',
    fontSize: 13,
    lineHeight: 18,
  },
  controlsStack: {
    gap: 14,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2b3743',
    backgroundColor: '#141d27',
    padding: 14,
    gap: 8,
  },
  infoLine: {
    color: '#d3dde7',
    fontSize: 13,
    lineHeight: 18,
  },
  warningCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  warningCardHot: {
    backgroundColor: '#331e1e',
    borderColor: '#7c4444',
  },
  warningCardCool: {
    backgroundColor: '#182b26',
    borderColor: '#2e6b56',
  },
  warningTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  warningText: {
    color: '#d6e2ea',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#37506a',
    backgroundColor: '#183046',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#8dc5ff',
    borderColor: '#8dc5ff',
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlButtonLabel: {
    color: '#f0f6fb',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButtonLabel: {
    color: '#12202c',
    fontSize: 13,
    fontWeight: '900',
  },
  resetButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2b3743',
    backgroundColor: '#141d27',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonLabel: {
    color: '#d7e1ea',
    fontSize: 13,
    fontWeight: '700',
  },
  messageText: {
    color: '#d7e2ec',
    fontSize: 13,
    lineHeight: 18,
  },
  verdictText: {
    fontSize: 16,
    fontWeight: '900',
  },
  winText: {
    color: '#7fe390',
  },
  lossText: {
    color: '#ff8c8c',
  },
});
