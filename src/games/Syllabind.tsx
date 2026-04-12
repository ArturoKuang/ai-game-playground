import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GameScreenTemplate from '../components/GameScreenTemplate';
import {
  applyMove,
  completedCount,
  courseById,
  createInitialState,
  evaluateSyllabind,
  generatePuzzle,
  lockedCount,
  readyCourses,
  unmetPrereqLabels,
  type SyllabindDifficulty,
  type SyllabindState,
} from '../solvers/Syllabind.solver';

const DIFFICULTIES: SyllabindDifficulty[] = [1, 2, 3, 4, 5];
const EVALUATION = evaluateSyllabind();

function buildPuzzle(difficulty: SyllabindDifficulty, seed: number) {
  return generatePuzzle(seed, difficulty);
}

export default function Syllabind() {
  const [difficulty, setDifficulty] = useState<SyllabindDifficulty>(1);
  const [seed, setSeed] = useState(0);
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(1, 0));
  const [state, setState] = useState<SyllabindState>(() => createInitialState(buildPuzzle(1, 0)));

  const metrics = useMemo(
    () => EVALUATION.difficulties.find((entry) => entry.difficulty === difficulty),
    [difficulty],
  );
  const completed = new Set(state.completed);
  const ready = new Set(state.ready);
  const readyList = readyCourses(state);

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

  const switchDifficulty = (nextDifficulty: SyllabindDifficulty) => {
    const nextPuzzle = buildPuzzle(nextDifficulty, 0);
    setDifficulty(nextDifficulty);
    setSeed(0);
    resetPuzzle(nextPuzzle);
  };

  const board = (
    <View style={styles.boardStack}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Ready Rail</Text>
          <Text style={styles.summaryValue}>{`${state.ready.length}`}</Text>
          <Text style={styles.summaryMeta}>zero-seal courses</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Cleared</Text>
          <Text style={styles.summaryValue}>{`${completedCount(state)}/${puzzle.courses.length}`}</Text>
          <Text style={styles.summaryMeta}>courses finished</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Still Locked</Text>
          <Text style={styles.summaryValue}>{`${lockedCount(state)}`}</Text>
          <Text style={styles.summaryMeta}>unmet seals remain</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Ready Courses</Text>
        {readyList.length > 0 ? (
          <View style={styles.chipWrap}>
            {readyList.map((course) => (
              <View key={course.id} style={[styles.courseChip, styles.readyChip]}>
                <Text style={styles.courseChipText}>{course.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No course is ready right now.</Text>
        )}
        <Text style={styles.helperLine}>{state.message}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Catalog</Text>
        <View style={styles.catalogGrid}>
          {puzzle.courses.map((course) => {
            const isCompleted = completed.has(course.id);
            const isReady = ready.has(course.id);
            const unmet = unmetPrereqLabels(state, course.id);
            return (
              <View
                key={course.id}
                style={[
                  styles.courseCard,
                  isCompleted && styles.courseCardCompleted,
                  isReady && styles.courseCardReady,
                ]}
              >
                <View style={styles.courseHeader}>
                  <Text style={styles.courseLabel}>{course.label}</Text>
                  <Text style={styles.courseStatus}>
                    {isCompleted ? 'cleared' : isReady ? 'ready' : `${state.remainingPrereqs[course.id]} seals`}
                  </Text>
                </View>
                <Text style={styles.courseMeta}>
                  {course.prereqIds.length === 0
                    ? 'Prereqs: none'
                    : `Prereqs: ${course.prereqIds.join(', ')}`}
                </Text>
                <Text style={styles.courseMeta}>
                  {course.dependentIds.length === 0
                    ? 'Unlocks: none'
                    : `Unlocks: ${course.dependentIds.join(', ')}`}
                </Text>
                {!isCompleted && unmet.length > 0 ? (
                  <View style={styles.chipWrap}>
                    {unmet.map((prereqId) => (
                      <View key={`${course.id}-${prereqId}`} style={[styles.courseChip, styles.lockedChip]}>
                        <Text style={styles.courseChipText}>{prereqId}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Audit Log</Text>
        {state.history.length > 0 ? (
          <View style={styles.logWrap}>
            {state.history.map((entry, index) => (
              <View key={`${entry}-${index}`} style={styles.logChip}>
                <Text style={styles.logText}>{entry}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No audit actions yet.</Text>
        )}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controlsStack}>
      <View style={styles.infoCard}>
        <Text style={styles.infoLine}>Teach is legal only on the ready rail, where every unmet seal count is already zero.</Text>
        <Text style={styles.infoLine}>Teaching a course peels one seal from each dependent course that listed it as a prerequisite.</Text>
        <Text style={styles.infoLine}>If the ready rail empties before every card is cleared, call the deadlock.</Text>
        <Text style={styles.infoLine}>Seal Schedule only after the whole catalog is cleared.</Text>
      </View>

      <View style={styles.actionWrap}>
        {readyList.length > 0 ? (
          readyList.map((course) => (
            <Pressable
              key={course.id}
              disabled={Boolean(state.verdict)}
              onPress={() => setState((current) => applyMove(current, { type: 'teach', courseId: course.id }))}
              style={[styles.controlButton, styles.primaryButton, state.verdict && styles.controlButtonDisabled]}
            >
              <Text style={styles.primaryButtonLabel}>{`Teach ${course.label}`}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyText}>No teachable course remains on the ready rail.</Text>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={Boolean(state.verdict)}
          onPress={() => setState((current) => applyMove(current, { type: 'declare_deadlock' }))}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Call Deadlock</Text>
        </Pressable>
        <Pressable
          disabled={Boolean(state.verdict)}
          onPress={() => setState((current) => applyMove(current, { type: 'claim' }))}
          style={[styles.controlButton, state.verdict && styles.controlButtonDisabled]}
        >
          <Text style={styles.controlButtonLabel}>Seal Schedule</Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => resetPuzzle()} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>Reset Catalog</Text>
        </Pressable>
        <Pressable onPress={rerollPuzzle} style={styles.resetButton}>
          <Text style={styles.resetButtonLabel}>New Catalog</Text>
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
      title="Syllabind"
      emoji="SY"
      subtitle="Peel prerequisite seals from a course catalog until every course clears or the ready rail proves a cycle."
      objective="Teach only zero-seal courses. If the ready rail empties before the catalog does, call the deadlock."
      statsLabel={`${puzzle.label} • ${metrics ? `${Math.round(metrics.skillDepth * 100)}% depth` : 'catalog peel'}`}
      actions={[
        { label: 'Reset', onPress: () => resetPuzzle() },
        { label: 'New Catalog', onPress: rerollPuzzle, tone: 'primary' },
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
          'Syllabind teaches Kahn-style topological peeling for Course Schedule: keep a queue of courses whose remaining prerequisite count is zero, clear one, decrement the counts of its dependents, and if that ready queue becomes empty before all courses are cleared, the remaining graph contains a cycle.',
        takeaway:
          'The ready rail maps to the zero-indegree queue. Teaching a course maps to popping one zero-indegree node and decrementing indegrees on its outgoing edges. Calling deadlock maps to the `visitedCount < numCourses` check after the queue runs dry.',
      }}
      leetcodeLinks={[
        {
          id: 207,
          title: 'Course Schedule',
          url: 'https://leetcode.com/problems/course-schedule/',
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3d3947',
    backgroundColor: '#1b1823',
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    color: '#d7d2e5',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#aa9fc4',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#302b3a',
    backgroundColor: '#18151f',
    padding: 14,
    gap: 10,
  },
  helperLine: {
    color: '#c9c2db',
    fontSize: 13,
    lineHeight: 19,
  },
  catalogGrid: {
    gap: 10,
  },
  courseCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a3446',
    backgroundColor: '#201c2a',
    padding: 12,
    gap: 8,
  },
  courseCardReady: {
    borderColor: '#61c993',
    backgroundColor: '#15281d',
  },
  courseCardCompleted: {
    borderColor: '#67a7f3',
    backgroundColor: '#142133',
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  courseLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  courseStatus: {
    color: '#d7d2e5',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  courseMeta: {
    color: '#bdb4d1',
    fontSize: 13,
    lineHeight: 18,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  courseChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  readyChip: {
    borderColor: '#61c993',
    backgroundColor: '#173224',
  },
  lockedChip: {
    borderColor: '#8f6284',
    backgroundColor: '#312033',
  },
  courseChipText: {
    color: '#f3eefc',
    fontSize: 12,
    fontWeight: '700',
  },
  logWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logChip: {
    borderRadius: 999,
    backgroundColor: '#262132',
    borderWidth: 1,
    borderColor: '#3d3749',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logText: {
    color: '#ded8ef',
    fontSize: 12,
    lineHeight: 16,
  },
  emptyText: {
    color: '#b7adc8',
    fontSize: 13,
    lineHeight: 19,
  },
  controlsStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 14,
    backgroundColor: '#221d2d',
    borderWidth: 1,
    borderColor: '#3d3750',
    padding: 12,
    gap: 6,
  },
  infoLine: {
    color: '#d9d2ea',
    fontSize: 13,
    lineHeight: 19,
  },
  actionWrap: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#554d64',
    backgroundColor: '#261f32',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  primaryButton: {
    borderColor: '#61c993',
    backgroundColor: '#1a3526',
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  controlButtonLabel: {
    color: '#f1ebff',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonLabel: {
    color: '#f4fff7',
    fontSize: 14,
    fontWeight: '800',
  },
  resetButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4c4560',
    backgroundColor: '#1f1a28',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  resetButtonLabel: {
    color: '#e3dcf5',
    fontSize: 14,
    fontWeight: '700',
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  winText: {
    color: '#74d8a1',
  },
  lossText: {
    color: '#ff8ea8',
  },
});
