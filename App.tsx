import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, SectionList } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import games from './src/games';
import { GameMeta } from './src/types';

type RootStackParamList = {
  Home: undefined;
  Game: { gameId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ['http://localhost:8081'],
  config: {
    screens: {
      Home: '',
      Game: 'game/:gameId',
    },
  },
};

/* ── Curriculum tier labels & colors ── */

const TIER_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Tier 1 — Foundations', color: '#4ade80', bg: 'rgba(74,222,128,0.08)' },
  2: { label: 'Tier 2 — Data Structures', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
  3: { label: 'Tier 3 — Patterns', color: '#c084fc', bg: 'rgba(192,132,252,0.08)' },
  4: { label: 'Tier 4 — Advanced', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
};

const CURRICULUM_TOPICS = [
  { tier: 1, topics: ['Binary Search', 'Two Pointers', 'Stack', 'Sliding Window', 'Hash Map'] },
  { tier: 2, topics: ['Heap / Priority Queue', 'BFS', 'DFS / Backtracking', 'Trie', 'Monotonic Stack'] },
  { tier: 3, topics: ['1D Dynamic Programming', 'Greedy', 'Topological Sort', 'Union-Find', 'Binary Search on Answer'] },
  { tier: 4, topics: ['2D Dynamic Programming', 'Dijkstra', 'Interval Scheduling', 'Divide & Conquer', 'Bit Manipulation'] },
];

/* ── Home Screen ── */

type Section = {
  tier: number;
  title: string;
  color: string;
  bg: string;
  data: { topic: string; game: GameMeta | null }[];
};

function HomeScreen({ navigation }: any) {
  const sections: Section[] = useMemo(() => {
    const gamesByAlgo = new Map<string, GameMeta>();
    for (const g of games) {
      if (g.algorithm) gamesByAlgo.set(g.algorithm, g);
    }

    return CURRICULUM_TOPICS.map(({ tier, topics }) => {
      const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG[1];
      return {
        tier,
        title: cfg.label,
        color: cfg.color,
        bg: cfg.bg,
        data: topics.map((topic) => ({
          topic,
          game: gamesByAlgo.get(topic) ?? null,
        })),
      };
    });
  }, []);

  const totalTopics = CURRICULUM_TOPICS.reduce((s, t) => s + t.topics.length, 0);
  const completedTopics = games.filter((g) => g.algorithm).length;

  return (
    <View style={styles.home}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Algorithm Arcade</Text>
        <Text style={styles.tagline}>Learn algorithms by playing puzzles</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Curriculum Progress</Text>
          <Text style={styles.progressCount}>
            {completedTopics} / {totalTopics}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0}%` },
            ]}
          />
        </View>
      </View>

      {games.length === 0 ? (
        /* Empty state when no games exist yet */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>{'{ }'}</Text>
            <Text style={styles.emptyTitle}>No games yet</Text>
            <Text style={styles.emptyText}>
              Run the design loop to start creating algorithm-teaching puzzle games.
            </Text>
            <View style={styles.emptyCodeBlock}>
              <Text style={styles.emptyCode}>
                /loop "Execute one cycle of leetcode/program.md"
              </Text>
            </View>
          </View>

          {/* Show curriculum roadmap even when empty */}
          <Text style={styles.roadmapTitle}>Curriculum Roadmap</Text>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.topic}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <View style={[styles.sectionHeader, { backgroundColor: section.bg }]}>
                <View style={[styles.tierDot, { backgroundColor: section.color }]} />
                <Text style={[styles.sectionTitle, { color: section.color }]}>
                  {section.title}
                </Text>
              </View>
            )}
            renderItem={({ item, section }) => (
              <View style={styles.topicRow}>
                <View style={[styles.statusDot, { backgroundColor: '#3a3a3c' }]} />
                <Text style={styles.topicName}>{item.topic}</Text>
                <Text style={styles.topicStatus}>todo</Text>
              </View>
            )}
          />
        </View>
      ) : (
        /* Game list organized by tier */
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.topic}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: section.bg }]}>
              <View style={[styles.tierDot, { backgroundColor: section.color }]} />
              <Text style={[styles.sectionTitle, { color: section.color }]}>
                {section.title}
              </Text>
              <Text style={styles.sectionCount}>
                {section.data.filter((d) => d.game).length}/{section.data.length}
              </Text>
            </View>
          )}
          renderItem={({ item, section }) => {
            if (item.game) {
              return (
                <Pressable
                  style={styles.gameCard}
                  onPress={() => navigation.navigate('Game', { gameId: item.game!.id })}
                >
                  <View style={styles.gameCardLeft}>
                    <Text style={styles.gameEmoji}>{item.game.emoji}</Text>
                    <View style={styles.gameInfo}>
                      <Text style={styles.gameName}>{item.game.name}</Text>
                      <Text style={styles.gameAlgo}>{item.topic}</Text>
                      <Text style={styles.gameDesc} numberOfLines={1}>
                        {item.game.description}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.gameCardRight}>
                    {item.game.leetcodeProblems && item.game.leetcodeProblems.length > 0 && (
                      <View style={styles.lcBadge}>
                        <Text style={styles.lcBadgeText}>
                          {item.game.leetcodeProblems.length} LC
                        </Text>
                      </View>
                    )}
                    <Text style={styles.cardArrow}>{'\u203a'}</Text>
                  </View>
                </Pressable>
              );
            }

            return (
              <View style={styles.lockedRow}>
                <View style={[styles.statusDot, { backgroundColor: '#3a3a3c' }]} />
                <Text style={styles.lockedTopic}>{item.topic}</Text>
                <Text style={styles.lockedLabel}>todo</Text>
              </View>
            );
          }}
        />
      )}
      <StatusBar style="light" />
    </View>
  );
}

function GameScreen({ route }: any) {
  const game = games.find((g) => g.id === route.params.gameId);
  if (!game) return null;
  const GameComponent = game.component;
  return <GameComponent />;
}

export default function App() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0a0a0b' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#0a0a0b' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={({ route }: any) => ({
            title: games.find((g) => g.id === route.params.gameId)?.name ?? 'Game',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  home: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },

  /* ── Header ── */
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
    color: '#9aa0a6',
    marginTop: 4,
  },

  /* ── Progress bar ── */
  progressContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#141416',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e1e22',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    color: '#9aa0a6',
    fontSize: 13,
    fontWeight: '600',
  },
  progressCount: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1e1e22',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },

  /* ── Empty state ── */
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyCard: {
    backgroundColor: '#141416',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e22',
    marginBottom: 28,
  },
  emptyIcon: {
    fontSize: 36,
    color: '#4ade80',
    fontWeight: '800',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9aa0a6',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyCodeBlock: {
    backgroundColor: '#0a0a0b',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1e1e22',
  },
  emptyCode: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#4ade80',
  },
  roadmapTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 14,
  },

  /* ── Section headers ── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 12,
    marginBottom: 4,
    marginHorizontal: 20,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    letterSpacing: 0.3,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },

  /* ── Topic rows (locked / todo) ── */
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e22',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  topicName: {
    flex: 1,
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  topicStatus: {
    color: '#3a3a3c',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e22',
  },
  lockedTopic: {
    flex: 1,
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '600',
  },
  lockedLabel: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── Game cards ── */
  listContent: {
    paddingBottom: 40,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141416',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 20,
    marginVertical: 3,
    borderWidth: 1,
    borderColor: '#1e1e22',
  },
  gameCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gameEmoji: {
    fontSize: 28,
    marginRight: 12,
    width: 40,
    textAlign: 'center',
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  gameAlgo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4ade80',
    marginTop: 1,
  },
  gameDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  gameCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lcBadge: {
    backgroundColor: 'rgba(96,165,250,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lcBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60a5fa',
  },
  cardArrow: {
    fontSize: 24,
    color: '#4b5563',
  },
});
