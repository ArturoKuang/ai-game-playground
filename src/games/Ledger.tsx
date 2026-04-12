import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';

type DifficultyId = 'easy' | 'medium' | 'hard';
type ToolMode = 'ledger' | 'pair';
type Side = 'left' | 'right';

type Puzzle = {
  id: DifficultyId;
  label: string;
  title: string;
  left: string;
  right: string;
  expectedSame: boolean;
  helper: string;
};

type TileState = {
  id: string;
  char: string;
  side: Side;
  processed: boolean;
};

const PUZZLES: Puzzle[] = [
  {
    id: 'easy',
    label: 'Easy',
    title: 'Warm-up Crates',
    left: 'NOTE',
    right: 'TONE',
    expectedSame: true,
    helper: 'Short crates. Pairing works, but the ledger teaches the steadier habit.',
  },
  {
    id: 'medium',
    label: 'Medium',
    title: 'Repeated Stock',
    left: 'BALLOON',
    right: 'LONBALO',
    expectedSame: true,
    helper: 'Repeated letters make ad-hoc pairing noisy. The ledger stays exact.',
  },
  {
    id: 'hard',
    label: 'Hard',
    title: 'Near Miss',
    left: 'RETAINER',
    right: 'RETRAINED',
    expectedSame: false,
    helper: 'Everything looks close. The decisive move is spotting one net imbalance.',
  },
];

const LEDGER_ORDER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function buildTiles(word: string, side: Side): TileState[] {
  return word.split('').map((char, index) => ({
    id: `${side}-${index}`,
    char,
    side,
    processed: false,
  }));
}

function buildInitialState(puzzle: Puzzle) {
  return {
    leftTiles: buildTiles(puzzle.left, 'left'),
    rightTiles: buildTiles(puzzle.right, 'right'),
    counts: {} as Record<string, number>,
    actionsUsed: 0,
    manualPairs: 0,
    selectedTileId: null as string | null,
    message: 'Choose a tool and clear both crates before calling the result.',
    verdict: null as null | { correct: boolean; label: string },
  };
}

function applyLedgerCount(
  counts: Record<string, number>,
  char: string,
  delta: number,
) {
  const next = { ...counts, [char]: (counts[char] ?? 0) + delta };
  if (next[char] === 0) {
    delete next[char];
  }
  return next;
}

export default function Ledger() {
  const [difficultyId, setDifficultyId] = useState<DifficultyId>('easy');
  const [toolMode, setToolMode] = useState<ToolMode>('ledger');
  const puzzle = useMemo(
    () => PUZZLES.find((entry) => entry.id === difficultyId) ?? PUZZLES[0],
    [difficultyId],
  );
  const [state, setState] = useState(() => buildInitialState(puzzle));

  const resetPuzzle = (nextPuzzle = puzzle) => {
    setState(buildInitialState(nextPuzzle));
    setToolMode('ledger');
  };

  const switchDifficulty = (nextId: DifficultyId) => {
    const nextPuzzle = PUZZLES.find((entry) => entry.id === nextId) ?? PUZZLES[0];
    setDifficultyId(nextId);
    setToolMode('ledger');
    setState(buildInitialState(nextPuzzle));
  };

  const handleLedgerTap = (side: Side, tileId: string) => {
    setState((current) => {
      const source = side === 'left' ? current.leftTiles : current.rightTiles;
      const tile = source.find((entry) => entry.id === tileId);
      if (!tile || tile.processed) return current;

      const nextSource = source.map((entry) =>
        entry.id === tileId ? { ...entry, processed: true } : entry,
      );
      const delta = side === 'left' ? 1 : -1;
      const nextCounts = applyLedgerCount(current.counts, tile.char, delta);

      return {
        ...current,
        leftTiles: side === 'left' ? nextSource : current.leftTiles,
        rightTiles: side === 'right' ? nextSource : current.rightTiles,
        counts: nextCounts,
        actionsUsed: current.actionsUsed + 1,
        selectedTileId: null,
        message:
          delta > 0
            ? `${tile.char} added to the ledger.`
            : `${tile.char} removed from the ledger balance.`,
        verdict: null,
      };
    });
  };

  const handlePairTap = (side: Side, tileId: string) => {
    setState((current) => {
      const source = side === 'left' ? current.leftTiles : current.rightTiles;
      const tile = source.find((entry) => entry.id === tileId);
      if (!tile || tile.processed) return current;

      if (!current.selectedTileId) {
        return {
          ...current,
          selectedTileId: tileId,
          message: `Selected ${tile.char}. Now tap a matching tile on the other side.`,
          verdict: null,
        };
      }

      const selectedLeft =
        current.leftTiles.find((entry) => entry.id === current.selectedTileId) ??
        current.rightTiles.find((entry) => entry.id === current.selectedTileId);

      if (!selectedLeft || selectedLeft.processed) {
        return {
          ...current,
          selectedTileId: null,
          message: 'Selection expired. Pick the first tile again.',
        };
      }

      if (selectedLeft.side === side) {
        return {
          ...current,
          selectedTileId: tileId,
          message: 'Pairs must cross the center line.',
          verdict: null,
        };
      }

      if (selectedLeft.char !== tile.char) {
        return {
          ...current,
          selectedTileId: null,
          actionsUsed: current.actionsUsed + 1,
          message: `${selectedLeft.char} does not pair with ${tile.char}.`,
          verdict: null,
        };
      }

      const nextLeftTiles = current.leftTiles.map((entry) =>
        entry.id === selectedLeft.id || entry.id === tile.id
          ? { ...entry, processed: true }
          : entry,
      );
      const nextRightTiles = current.rightTiles.map((entry) =>
        entry.id === selectedLeft.id || entry.id === tile.id
          ? { ...entry, processed: true }
          : entry,
      );

      return {
        ...current,
        leftTiles: nextLeftTiles,
        rightTiles: nextRightTiles,
        actionsUsed: current.actionsUsed + 2,
        manualPairs: current.manualPairs + 1,
        selectedTileId: null,
        message: `${tile.char} paired manually. Good for one match, but slow for whole crates.`,
        verdict: null,
      };
    });
  };

  const handleTilePress = (side: Side, tileId: string) => {
    if (toolMode === 'ledger') {
      handleLedgerTap(side, tileId);
      return;
    }
    handlePairTap(side, tileId);
  };

  const callVerdict = (label: string, guessSame: boolean) => {
    setState((current) => {
      const unprocessedTiles =
        current.leftTiles.some((tile) => !tile.processed) ||
        current.rightTiles.some((tile) => !tile.processed);

      if (unprocessedTiles) {
        return {
          ...current,
          message: 'Process every tile first. Hidden leftovers make the call unreliable.',
        };
      }

      const ledgerIsBalanced = Object.keys(current.counts).length === 0;
      const actualSame = ledgerIsBalanced && puzzle.left.length === puzzle.right.length;
      const correct = guessSame === actualSame && actualSame === puzzle.expectedSame;

      return {
        ...current,
        verdict: { correct, label },
        message: correct
          ? actualSame
            ? 'Correct. Every count returned to zero.'
            : 'Correct. One or more counts stayed off zero.'
          : actualSame
            ? 'Not quite. The ledger balanced out, so the crates match.'
            : 'Not quite. The ledger still shows a leftover difference.',
      };
    });
  };

  const tilesRemaining =
    state.leftTiles.filter((tile) => !tile.processed).length +
    state.rightTiles.filter((tile) => !tile.processed).length;

  const statsLabel = `${state.actionsUsed} actions`;

  const difficultyOptions = PUZZLES.map((entry) => ({
    label: entry.label,
    selected: entry.id === difficultyId,
    onPress: () => switchDifficulty(entry.id),
  }));

  const toolOptions = [
    {
      label: 'Ledger Tool',
      selected: toolMode === 'ledger',
      onPress: () => setToolMode('ledger'),
    },
    {
      label: 'Pair Tool',
      selected: toolMode === 'pair',
      onPress: () => setToolMode('pair'),
    },
  ];

  const ledgerEntries = LEDGER_ORDER.filter((char) => state.counts[char] !== undefined);

  const board = (
    <View style={styles.board}>
      <View style={styles.statusStrip}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Remaining</Text>
          <Text style={styles.statusValue}>{tilesRemaining}</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Manual Pairs</Text>
          <Text style={styles.statusValue}>{state.manualPairs}</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Ledger Bins</Text>
          <Text style={styles.statusValue}>{ledgerEntries.length}</Text>
        </View>
      </View>

      <View style={styles.cratesRow}>
        <TileColumn
          title={`Left Crate: ${puzzle.left}`}
          side="left"
          tiles={state.leftTiles}
          selectedTileId={state.selectedTileId}
          onPress={handleTilePress}
        />
        <TileColumn
          title={`Right Crate: ${puzzle.right}`}
          side="right"
          tiles={state.rightTiles}
          selectedTileId={state.selectedTileId}
          onPress={handleTilePress}
        />
      </View>

      <View style={styles.ledgerCard}>
        <Text style={styles.ledgerTitle}>Balance Ledger</Text>
        {ledgerEntries.length === 0 ? (
          <Text style={styles.ledgerEmpty}>All tracked counts are back at zero.</Text>
        ) : (
          <View style={styles.ledgerGrid}>
            {ledgerEntries.map((char) => (
              <View key={char} style={styles.ledgerChip}>
                <Text style={styles.ledgerChipChar}>{char}</Text>
                <Text style={styles.ledgerChipValue}>
                  {state.counts[char] > 0 ? `+${state.counts[char]}` : state.counts[char]}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controls}>
      <Text style={styles.controlsLabel}>Tool</Text>
      <View style={styles.toolRow}>
        {toolOptions.map((option) => (
          <Pressable
            key={option.label}
            onPress={option.onPress}
            style={[
              styles.toolChip,
              option.selected && styles.toolChipSelected,
            ]}
          >
            <Text
              style={[
                styles.toolChipLabel,
                option.selected && styles.toolChipLabelSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.controlsHint}>
        {toolMode === 'ledger'
          ? 'Ledger Tool: left tiles add to a count, right tiles subtract from it.'
          : 'Pair Tool: pick one tile, then a matching tile on the other side to cancel them manually.'}
      </Text>

      <View style={styles.verdictRow}>
        <Pressable
          style={[styles.verdictButton, styles.sameButton]}
          onPress={() => callVerdict('Same Mix', true)}
        >
          <Text style={styles.verdictLabel}>Same Mix</Text>
        </Pressable>
        <Pressable
          style={[styles.verdictButton, styles.diffButton]}
          onPress={() => callVerdict('Different Mix', false)}
        >
          <Text style={styles.verdictLabel}>Different Mix</Text>
        </Pressable>
      </View>

      <Text style={styles.feedbackText}>{state.message}</Text>

      {state.verdict ? (
        <View
          style={[
            styles.verdictBanner,
            state.verdict.correct ? styles.verdictBannerGood : styles.verdictBannerBad,
          ]}
        >
          <Text style={styles.verdictBannerLabel}>
            {state.verdict.correct ? 'Call confirmed' : 'Call rejected'}: {state.verdict.label}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <GameScreenTemplate
      title="Ledger"
      emoji="= "
      subtitle={puzzle.title}
      objective="Clear both crates, keep a balanced ledger, then decide whether the two crates contain the same mix."
      statsLabel={statsLabel}
      actions={[
        { label: 'Reset Puzzle', onPress: () => resetPuzzle(), tone: 'neutral' },
      ]}
      difficultyOptions={difficultyOptions}
      board={board}
      controls={controls}
      helperText={puzzle.helper}
      conceptBridge={{
        title: 'What this teaches after play',
        summary:
          'The steady strategy is to track net counts per letter instead of chasing pairs one by one.',
        takeaway:
          'When every count returns to zero, the two strings are anagrams. A leftover count means they are not.',
      }}
      leetcodeLinks={[
        {
          id: 242,
          title: 'Valid Anagram',
          url: 'https://leetcode.com/problems/valid-anagram/',
        },
      ]}
      footer={
        <Text style={styles.footerText}>
          The ledger tool is the reliable route because it preserves every repeated letter, even when the crates look nearly identical.
        </Text>
      }
    />
  );
}

type TileColumnProps = {
  title: string;
  side: Side;
  tiles: TileState[];
  selectedTileId: string | null;
  onPress: (side: Side, tileId: string) => void;
};

function TileColumn({
  title,
  side,
  tiles,
  selectedTileId,
  onPress,
}: TileColumnProps) {
  return (
    <View style={styles.column}>
      <Text style={styles.columnTitle}>{title}</Text>
      <View style={styles.tileWrap}>
        {tiles.map((tile) => {
          const selected = tile.id === selectedTileId;
          return (
            <Pressable
              key={tile.id}
              onPress={() => onPress(side, tile.id)}
              style={[
                styles.tile,
                side === 'left' ? styles.leftTile : styles.rightTile,
                tile.processed && styles.tileProcessed,
                selected && styles.tileSelected,
              ]}
            >
              <Text style={[styles.tileLabel, tile.processed && styles.tileLabelProcessed]}>
                {tile.char}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    gap: 16,
  },
  statusStrip: {
    flexDirection: 'row',
    gap: 10,
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#171f1a',
    borderWidth: 1,
    borderColor: '#274530',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
  },
  statusLabel: {
    color: '#9dc7a7',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  statusValue: {
    color: '#f5fff7',
    fontSize: 20,
    fontWeight: '800',
  },
  cratesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
    backgroundColor: '#11161f',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#293343',
    padding: 12,
    gap: 12,
  },
  columnTitle: {
    color: '#f0f4fa',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  tileWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  tile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  leftTile: {
    backgroundColor: '#163247',
    borderColor: '#3f83b8',
  },
  rightTile: {
    backgroundColor: '#432617',
    borderColor: '#c37a3f',
  },
  tileProcessed: {
    backgroundColor: '#202328',
    borderColor: '#3a3f47',
    opacity: 0.45,
  },
  tileSelected: {
    borderColor: '#f6e3a1',
    borderWidth: 2,
  },
  tileLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  tileLabelProcessed: {
    color: '#7d8794',
  },
  ledgerCard: {
    backgroundColor: '#1b1721',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#423251',
    padding: 14,
    gap: 12,
  },
  ledgerTitle: {
    color: '#f6efff',
    fontSize: 16,
    fontWeight: '800',
  },
  ledgerEmpty: {
    color: '#cdbbde',
    fontSize: 14,
    lineHeight: 20,
  },
  ledgerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ledgerChip: {
    minWidth: 64,
    borderRadius: 14,
    backgroundColor: '#2b2234',
    borderWidth: 1,
    borderColor: '#56436c',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  ledgerChipChar: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  ledgerChipValue: {
    color: '#f4c86a',
    fontSize: 14,
    fontWeight: '700',
  },
  controls: {
    gap: 14,
  },
  controlsLabel: {
    color: '#dfe6f0',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  toolRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toolChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#384251',
    backgroundColor: '#15181e',
    paddingVertical: 12,
    alignItems: 'center',
  },
  toolChipSelected: {
    backgroundColor: '#20364b',
    borderColor: '#63a1d9',
  },
  toolChipLabel: {
    color: '#b8c0cb',
    fontSize: 14,
    fontWeight: '700',
  },
  toolChipLabelSelected: {
    color: '#ffffff',
  },
  controlsHint: {
    color: '#c5ccd6',
    fontSize: 14,
    lineHeight: 20,
  },
  verdictRow: {
    flexDirection: 'row',
    gap: 10,
  },
  verdictButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sameButton: {
    backgroundColor: '#22543d',
  },
  diffButton: {
    backgroundColor: '#7a2f2f',
  },
  verdictLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  feedbackText: {
    color: '#e7ecf3',
    fontSize: 14,
    lineHeight: 21,
  },
  verdictBanner: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  verdictBannerGood: {
    backgroundColor: '#152d20',
    borderColor: '#35724e',
  },
  verdictBannerBad: {
    backgroundColor: '#351818',
    borderColor: '#9a4848',
  },
  verdictBannerLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  footerText: {
    color: '#d7dadc',
    fontSize: 14,
    lineHeight: 21,
  },
});
