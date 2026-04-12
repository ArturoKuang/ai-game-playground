import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';

type DifficultyId = 'easy' | 'medium' | 'hard';
type ToolMode = 'stamp' | 'scan';

type Puzzle = {
  id: DifficultyId;
  label: string;
  title: string;
  words: string[];
  budget: number;
  helper: string;
};

type WordState = {
  id: string;
  text: string;
  filed: boolean;
  familyId: string | null;
};

type FamilyState = {
  id: string;
  anchorWord: string;
  signature: string;
  sealed: boolean;
  words: string[];
};

type VerdictState = {
  correct: boolean;
  label: string;
};

type SealState = {
  words: WordState[];
  families: FamilyState[];
  actionsUsed: number;
  stampsUsed: number;
  scansUsed: number;
  checkedFamilyIds: string[];
  message: string;
  verdict: VerdictState | null;
};

const PUZZLES: Puzzle[] = [
  {
    id: 'easy',
    label: 'Easy',
    title: 'Starter Rack',
    words: ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'],
    budget: 9,
    helper: 'Small batches let eyeballing survive, but the stamp already feels steadier.',
  },
  {
    id: 'medium',
    label: 'Medium',
    title: 'Crowded Labels',
    words: ['listen', 'silent', 'enlist', 'stone', 'tones', 'notes', 'adder', 'dread'],
    budget: 11,
    helper: 'Several families look close. One reusable seal beats checking every shelf by eye.',
  },
  {
    id: 'hard',
    label: 'Hard',
    title: 'Near-Miss Warehouse',
    words: ['alerts', 'salter', 'slater', 'rescue', 'secure', 'recuse', 'adder', 'dread', 'below', 'elbow'],
    budget: 12,
    helper: 'Tight budget. Stamping each label into a stable mix seal is the only reliable route.',
  },
];

function normalizeWord(word: string) {
  return word.toLowerCase().split('').sort().join('');
}

function buildWords(words: string[]): WordState[] {
  return words.map((text, index) => ({
    id: `word-${index}`,
    text,
    filed: false,
    familyId: null,
  }));
}

function buildInitialState(puzzle: Puzzle): SealState {
  return {
    words: buildWords(puzzle.words),
    families: [],
    actionsUsed: 0,
    stampsUsed: 0,
    scansUsed: 0,
    checkedFamilyIds: [],
    message:
      'Choose Stamp Press to mint a reusable seal, or Scan Family to compare against shelves one by one.',
    verdict: null,
  };
}

function getCurrentWord(words: WordState[]) {
  return words.find((word) => !word.filed) ?? null;
}

function formatSignature(signature: string) {
  return signature.toUpperCase();
}

function fileWord(words: WordState[], wordId: string, familyId: string) {
  return words.map((word) =>
    word.id === wordId ? { ...word, filed: true, familyId } : word,
  );
}

function evaluateGrouping(families: FamilyState[]) {
  if (families.length === 0) return false;

  const seenSignatures = new Set<string>();
  for (const family of families) {
    if (seenSignatures.has(family.signature)) {
      return false;
    }
    seenSignatures.add(family.signature);

    if (family.words.some((word) => normalizeWord(word) !== family.signature)) {
      return false;
    }
  }

  return true;
}

export default function Seal() {
  const [difficultyId, setDifficultyId] = useState<DifficultyId>('easy');
  const [toolMode, setToolMode] = useState<ToolMode>('stamp');
  const puzzle = useMemo(
    () => PUZZLES.find((entry) => entry.id === difficultyId) ?? PUZZLES[0],
    [difficultyId],
  );
  const [state, setState] = useState<SealState>(() => buildInitialState(puzzle));

  const resetPuzzle = (nextPuzzle = puzzle) => {
    setState(buildInitialState(nextPuzzle));
    setToolMode('stamp');
  };

  const switchDifficulty = (nextId: DifficultyId) => {
    const nextPuzzle = PUZZLES.find((entry) => entry.id === nextId) ?? PUZZLES[0];
    setDifficultyId(nextId);
    setToolMode('stamp');
    setState(buildInitialState(nextPuzzle));
  };

  const stampCurrentWord = () => {
    setState((current) => {
      const currentWord = getCurrentWord(current.words);
      if (!currentWord) {
        return {
          ...current,
          message: 'Every label is already filed. Ship the order.',
        };
      }

      const signature = normalizeWord(currentWord.text);
      const matchingFamily = current.families.find(
        (family) => family.signature === signature,
      );

      if (matchingFamily) {
        return {
          ...current,
          words: fileWord(current.words, currentWord.id, matchingFamily.id),
          families: current.families.map((family) =>
            family.id === matchingFamily.id
              ? {
                  ...family,
                  sealed: true,
                  words: [...family.words, currentWord.text],
                }
              : family,
          ),
          actionsUsed: current.actionsUsed + 1,
          stampsUsed: current.stampsUsed + 1,
          checkedFamilyIds: [],
          message: `${currentWord.text} matches the ${formatSignature(signature)} seal and drops straight into that family.`,
          verdict: null,
        };
      }

      const newFamilyId = `family-${current.families.length + 1}`;
      return {
        ...current,
        words: fileWord(current.words, currentWord.id, newFamilyId),
        families: [
          ...current.families,
          {
            id: newFamilyId,
            anchorWord: currentWord.text,
            signature,
            sealed: true,
            words: [currentWord.text],
          },
        ],
        actionsUsed: current.actionsUsed + 1,
        stampsUsed: current.stampsUsed + 1,
        checkedFamilyIds: [],
        message: `${currentWord.text} opens a new shelf with seal ${formatSignature(signature)}.`,
        verdict: null,
      };
    });
  };

  const startFamilyManually = () => {
    setState((current) => {
      const currentWord = getCurrentWord(current.words);
      if (!currentWord) {
        return {
          ...current,
          message: 'Every label is already filed. Ship the order.',
        };
      }

      const signature = normalizeWord(currentWord.text);
      const existingFamily = current.families.find(
        (family) => family.signature === signature,
      );

      if (existingFamily) {
        return {
          ...current,
          words: fileWord(current.words, currentWord.id, existingFamily.id),
          families: current.families.map((family) =>
            family.id === existingFamily.id
              ? { ...family, words: [...family.words, currentWord.text] }
              : family,
          ),
          actionsUsed: current.actionsUsed + 1,
          checkedFamilyIds: [],
          message: `${currentWord.text} really belonged with ${existingFamily.anchorWord}. Manual searching found it late and cost an extra action.`,
          verdict: null,
        };
      }

      const newFamilyId = `family-${current.families.length + 1}`;
      return {
        ...current,
        words: fileWord(current.words, currentWord.id, newFamilyId),
        families: [
          ...current.families,
          {
            id: newFamilyId,
            anchorWord: currentWord.text,
            signature,
            sealed: false,
            words: [currentWord.text],
          },
        ],
        actionsUsed: current.actionsUsed + 1,
        checkedFamilyIds: [],
        message: `${currentWord.text} starts a manual shelf. It works now, but it does not expose a reusable seal.`,
        verdict: null,
      };
    });
  };

  const scanFamily = (familyId: string) => {
    setState((current) => {
      if (toolMode !== 'scan') {
        return {
          ...current,
          message: 'Switch to Scan Family before checking shelves one by one.',
        };
      }

      const currentWord = getCurrentWord(current.words);
      if (!currentWord) {
        return {
          ...current,
          message: 'Every label is already filed. Ship the order.',
        };
      }

      if (current.checkedFamilyIds.includes(familyId)) {
        return {
          ...current,
          message: 'You already checked that shelf for this word.',
        };
      }

      const family = current.families.find((entry) => entry.id === familyId);
      if (!family) return current;

      const isMatch = family.signature === normalizeWord(currentWord.text);
      if (isMatch) {
        return {
          ...current,
          words: fileWord(current.words, currentWord.id, family.id),
          families: current.families.map((entry) =>
            entry.id === family.id
              ? { ...entry, words: [...entry.words, currentWord.text] }
              : entry,
          ),
          actionsUsed: current.actionsUsed + 1,
          scansUsed: current.scansUsed + 1,
          checkedFamilyIds: [],
          message: `${currentWord.text} fits with ${family.anchorWord}. Manual comparison worked this time.`,
          verdict: null,
        };
      }

      return {
        ...current,
        actionsUsed: current.actionsUsed + 1,
        scansUsed: current.scansUsed + 1,
        checkedFamilyIds: [...current.checkedFamilyIds, familyId],
        message: `${currentWord.text} is not the same mix as ${family.anchorWord}. That check cost an action.`,
        verdict: null,
      };
    });
  };

  const shipOrder = () => {
    setState((current) => {
      const currentWord = getCurrentWord(current.words);
      if (currentWord) {
        return {
          ...current,
          message: 'File every label before shipping the order.',
        };
      }

      const overBudget = current.actionsUsed > puzzle.budget;
      const groupingIsClean = evaluateGrouping(current.families);
      const correct = !overBudget && groupingIsClean;

      return {
        ...current,
        verdict: {
          correct,
          label: correct ? 'Shipment Approved' : 'Shipment Rejected',
        },
        message: correct
          ? 'Correct. Every word is grouped under one reusable seal within budget.'
          : overBudget
            ? 'Grouping may be right, but the budget blew up. Scanning shelf by shelf was too expensive.'
            : 'Something is still grouped inconsistently. Matching words need one shared seal.',
      };
    });
  };

  const difficultyOptions = PUZZLES.map((entry) => ({
    label: entry.label,
    selected: entry.id === difficultyId,
    onPress: () => switchDifficulty(entry.id),
  }));

  const currentWord = getCurrentWord(state.words);
  const remainingCount = state.words.filter((word) => !word.filed).length;
  const budgetLeft = puzzle.budget - state.actionsUsed;
  const revealedSeals = state.families.filter((family) => family.sealed).length;
  const statsLabel = `${state.actionsUsed}/${puzzle.budget} actions`;

  const board = (
    <View style={styles.board}>
      <View style={styles.statusStrip}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Remaining</Text>
          <Text style={styles.statusValue}>{remainingCount}</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Budget Left</Text>
          <Text
            style={[
              styles.statusValue,
              budgetLeft < 0 && styles.statusValueDanger,
            ]}
          >
            {budgetLeft}
          </Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Revealed Seals</Text>
          <Text style={styles.statusValue}>{revealedSeals}</Text>
        </View>
      </View>

      <View style={styles.currentCard}>
        <Text style={styles.currentEyebrow}>Current Label</Text>
        <Text style={styles.currentWord}>
          {currentWord ? currentWord.text : 'All words filed'}
        </Text>
        <Text style={styles.currentHint}>
          {currentWord
            ? 'Either mint one stable seal for this word or compare it against shelves one by one.'
            : 'Nothing left in the queue. Ship the order when you are ready.'}
        </Text>
      </View>

      <View style={styles.queueCard}>
        <Text style={styles.queueTitle}>Batch Queue</Text>
        <View style={styles.queueWrap}>
          {state.words.map((word) => (
            <View
              key={word.id}
              style={[
                styles.queueChip,
                word.filed && styles.queueChipFiled,
                currentWord?.id === word.id && styles.queueChipActive,
              ]}
            >
              <Text
                style={[
                  styles.queueChipLabel,
                  word.filed && styles.queueChipLabelFiled,
                ]}
              >
                {word.text}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.familySection}>
        <Text style={styles.familySectionTitle}>Family Shelves</Text>
        {state.families.length === 0 ? (
          <Text style={styles.emptyText}>
            No shelves yet. The first few choices define how much future work you save.
          </Text>
        ) : (
          <View style={styles.familyGrid}>
            {state.families.map((family) => (
              <Pressable
                key={family.id}
                onPress={() => scanFamily(family.id)}
                style={[
                  styles.familyCard,
                  toolMode === 'scan' && styles.familyCardScanMode,
                  state.checkedFamilyIds.includes(family.id) &&
                    styles.familyCardChecked,
                ]}
              >
                <View style={styles.familyHeader}>
                  <Text style={styles.familyTitle}>Shelf {family.id.replace('family-', '')}</Text>
                  <Text style={styles.familyBadge}>
                    {family.sealed
                      ? `Seal ${formatSignature(family.signature)}`
                      : 'Manual shelf'}
                  </Text>
                </View>

                <Text style={styles.familyAnchor}>Anchor: {family.anchorWord}</Text>
                <View style={styles.familyWords}>
                  {family.words.map((word) => (
                    <View key={`${family.id}-${word}`} style={styles.familyWordChip}>
                      <Text style={styles.familyWordLabel}>{word}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
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
        <Pressable
          onPress={() => setToolMode('stamp')}
          style={[styles.toolChip, toolMode === 'stamp' && styles.toolChipSelected]}
        >
          <Text
            style={[
              styles.toolChipLabel,
              toolMode === 'stamp' && styles.toolChipLabelSelected,
            ]}
          >
            Stamp Press
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setToolMode('scan')}
          style={[styles.toolChip, toolMode === 'scan' && styles.toolChipSelected]}
        >
          <Text
            style={[
              styles.toolChipLabel,
              toolMode === 'scan' && styles.toolChipLabelSelected,
            ]}
          >
            Scan Family
          </Text>
        </Pressable>
      </View>

      <Text style={styles.controlsHint}>
        {toolMode === 'stamp'
          ? 'Stamp Press sorts the current label into one stable mix seal, then reuses that seal forever.'
          : 'Scan Family checks one shelf at a time. Tap a shelf to compare, or start a brand-new shelf.'}
      </Text>

      <View style={styles.actionColumn}>
        <Pressable
          style={[styles.controlButton, styles.primaryButton]}
          onPress={toolMode === 'stamp' ? stampCurrentWord : startFamilyManually}
        >
          <Text style={styles.controlButtonLabel}>
            {toolMode === 'stamp' ? 'Stamp & File' : 'Start New Family'}
          </Text>
        </Pressable>

        <Pressable style={styles.controlButton} onPress={shipOrder}>
          <Text style={styles.controlButtonLabel}>Ship Order</Text>
        </Pressable>
      </View>

      <Text style={styles.feedbackText}>{state.message}</Text>

      {state.verdict ? (
        <View
          style={[
            styles.verdictBanner,
            state.verdict.correct ? styles.verdictGood : styles.verdictBad,
          ]}
        >
          <Text style={styles.verdictLabel}>{state.verdict.label}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <GameScreenTemplate
      title="Seal"
      emoji="#"
      subtitle={puzzle.title}
      objective="Group every word into the right family before the action budget runs out."
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
          'The winning move is to turn each word into one reusable seal, then use that seal as the family key instead of rechecking letters shelf by shelf.',
        takeaway:
          'In code, that becomes hash-map grouping: compute one normalized key per string, then append the string into the bucket for that key.',
      }}
      leetcodeLinks={[
        {
          id: 49,
          title: 'Group Anagrams',
          url: 'https://leetcode.com/problems/group-anagrams/',
        },
      ]}
      footer={
        <Text style={styles.footerText}>
          The stamp does not just solve the current word. It creates a stable key that makes every later match cheap.
        </Text>
      }
    />
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
    backgroundColor: '#171a22',
    borderWidth: 1,
    borderColor: '#33405a',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
  },
  statusLabel: {
    color: '#9fb6df',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  statusValue: {
    color: '#f5f8ff',
    fontSize: 20,
    fontWeight: '800',
  },
  statusValueDanger: {
    color: '#ff8f8f',
  },
  currentCard: {
    backgroundColor: '#101f1c',
    borderWidth: 1,
    borderColor: '#1f5c53',
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  currentEyebrow: {
    color: '#8ad7ca',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  currentWord: {
    color: '#f3fffb',
    fontSize: 28,
    fontWeight: '900',
  },
  currentHint: {
    color: '#b9ddd6',
    fontSize: 13,
    lineHeight: 20,
  },
  queueCard: {
    backgroundColor: '#11161f',
    borderWidth: 1,
    borderColor: '#2b3547',
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  queueTitle: {
    color: '#f0f4fa',
    fontSize: 14,
    fontWeight: '700',
  },
  queueWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  queueChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#31415b',
    backgroundColor: '#18202d',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  queueChipActive: {
    borderColor: '#6fd8c7',
    backgroundColor: '#163630',
  },
  queueChipFiled: {
    borderColor: '#3b4a43',
    backgroundColor: '#17211b',
  },
  queueChipLabel: {
    color: '#eef3ff',
    fontSize: 13,
    fontWeight: '700',
  },
  queueChipLabelFiled: {
    color: '#88b394',
  },
  familySection: {
    gap: 10,
  },
  familySectionTitle: {
    color: '#f4f6fb',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    color: '#b0b6c2',
    fontSize: 13,
    lineHeight: 20,
  },
  familyGrid: {
    gap: 12,
  },
  familyCard: {
    backgroundColor: '#17151e',
    borderWidth: 1,
    borderColor: '#3a3150',
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  familyCardScanMode: {
    borderColor: '#8b78c6',
  },
  familyCardChecked: {
    opacity: 0.7,
  },
  familyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  familyTitle: {
    color: '#faf7ff',
    fontSize: 15,
    fontWeight: '800',
  },
  familyBadge: {
    color: '#c8bcf4',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  familyAnchor: {
    color: '#d8d0ee',
    fontSize: 13,
  },
  familyWords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  familyWordChip: {
    borderRadius: 999,
    backgroundColor: '#262034',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  familyWordLabel: {
    color: '#f5f0ff',
    fontSize: 12,
    fontWeight: '700',
  },
  controls: {
    gap: 12,
  },
  controlsLabel: {
    color: '#f2f4f8',
    fontSize: 14,
    fontWeight: '800',
  },
  toolRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toolChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#394050',
    backgroundColor: '#171a22',
    paddingVertical: 12,
    alignItems: 'center',
  },
  toolChipSelected: {
    borderColor: '#70d7c7',
    backgroundColor: '#13332e',
  },
  toolChipLabel: {
    color: '#ccd1da',
    fontSize: 13,
    fontWeight: '700',
  },
  toolChipLabelSelected: {
    color: '#effffb',
  },
  controlsHint: {
    color: '#b1b8c6',
    fontSize: 13,
    lineHeight: 20,
  },
  actionColumn: {
    gap: 10,
  },
  controlButton: {
    borderRadius: 14,
    backgroundColor: '#232832',
    borderWidth: 1,
    borderColor: '#394050',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#19423d',
    borderColor: '#2c6b62',
  },
  controlButtonLabel: {
    color: '#f5f7fb',
    fontSize: 14,
    fontWeight: '800',
  },
  feedbackText: {
    color: '#e6e9f0',
    fontSize: 13,
    lineHeight: 20,
  },
  verdictBanner: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  verdictGood: {
    backgroundColor: '#142a1d',
    borderColor: '#2d7a47',
  },
  verdictBad: {
    backgroundColor: '#2a1517',
    borderColor: '#7f353b',
  },
  verdictLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  footerText: {
    color: '#d2d7e0',
    fontSize: 13,
    lineHeight: 20,
  },
});
