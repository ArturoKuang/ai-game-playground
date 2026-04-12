import React from 'react';
import {
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

/* ── Public types ── */

export type GameTemplateAction = {
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'primary';
};

export type GameTemplateDifficultyOption = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export type GameTemplateLink = {
  id: string | number;
  title: string;
  url: string;
};

export type GameTemplateConceptBridge = {
  title?: string;
  summary: string;
  takeaway?: string;
};

type GameScreenTemplateProps = {
  title: string;
  emoji?: string;
  subtitle?: string;
  objective?: string;
  statsLabel?: string;
  actions?: GameTemplateAction[];
  difficultyOptions?: GameTemplateDifficultyOption[];
  board: React.ReactNode;
  controls?: React.ReactNode;
  helperText?: string;
  conceptBridge?: GameTemplateConceptBridge;
  leetcodeLinks?: GameTemplateLink[];
  footer?: React.ReactNode;
};

/* ── Component ── */

export default function GameScreenTemplate({
  title,
  emoji,
  subtitle,
  objective,
  statsLabel,
  actions = [],
  difficultyOptions = [],
  board,
  controls,
  helperText,
  conceptBridge,
  leetcodeLinks = [],
  footer,
}: GameScreenTemplateProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card: title, objective, actions ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroText}>
              <Text style={styles.title}>
                {emoji ? `${emoji} ${title}` : title}
              </Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {statsLabel ? (
              <View style={styles.statsPill}>
                <Text style={styles.statsLabel}>{statsLabel}</Text>
              </View>
            ) : null}
          </View>

          {objective ? (
            <View style={styles.objectiveCard}>
              <Text style={styles.eyebrow}>Objective</Text>
              <Text style={styles.objectiveText}>{objective}</Text>
            </View>
          ) : null}

          {actions.length > 0 ? (
            <View style={styles.actionsRow}>
              {actions.map((action) => (
                <Pressable
                  key={action.label}
                  onPress={action.onPress}
                  style={[
                    styles.actionBtn,
                    action.tone === 'primary' && styles.actionBtnPrimary,
                  ]}
                >
                  <Text
                    style={[
                      styles.actionLabel,
                      action.tone === 'primary' && styles.actionLabelPrimary,
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {/* ── Difficulty selector ── */}
        {difficultyOptions.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Difficulty</Text>
            <View style={styles.difficultyRow}>
              {difficultyOptions.map((opt) => (
                <Pressable
                  key={opt.label}
                  disabled={opt.disabled}
                  onPress={opt.onPress}
                  style={[
                    styles.diffChip,
                    opt.selected && styles.diffChipSelected,
                    opt.disabled && styles.diffChipDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.diffLabel,
                      opt.selected && styles.diffLabelSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Board ── */}
        <View style={styles.sectionCard}>
          <View style={styles.boardFrame}>{board}</View>
          {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
        </View>

        {/* ── Controls ── */}
        {controls ? (
          <View style={styles.sectionCard}>
            {controls}
          </View>
        ) : null}

        {/* ── Concept bridge + LeetCode links ── */}
        {conceptBridge || leetcodeLinks.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Concept Bridge</Text>

            {conceptBridge ? (
              <View style={styles.bridgeBlock}>
                <Text style={styles.bridgeTitle}>
                  {conceptBridge.title ?? 'What this teaches'}
                </Text>
                <Text style={styles.bridgeSummary}>{conceptBridge.summary}</Text>
                {conceptBridge.takeaway ? (
                  <Text style={styles.bridgeTakeaway}>{conceptBridge.takeaway}</Text>
                ) : null}
              </View>
            ) : null}

            {leetcodeLinks.length > 0 ? (
              <View style={styles.linksBlock}>
                <Text style={styles.linksTitle}>Related LeetCode Problems</Text>
                {leetcodeLinks.map((link) => (
                  <Pressable
                    key={String(link.id)}
                    onPress={() => void Linking.openURL(link.url)}
                    style={styles.linkRow}
                  >
                    <Text style={styles.linkId}>#{link.id}</Text>
                    <Text style={styles.linkTitle}>{link.title}</Text>
                    <Text style={styles.linkArrow}>{'\u203a'}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Footer ── */}
        {footer ? <View style={styles.sectionCard}>{footer}</View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 14,
  },

  /* Hero */
  heroCard: {
    backgroundColor: '#141416',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e1e22',
    padding: 18,
    gap: 14,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  subtitle: {
    color: '#9aa0a6',
    fontSize: 14,
    lineHeight: 20,
  },
  statsPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1e1e22',
    borderWidth: 1,
    borderColor: '#2a2a2e',
  },
  statsLabel: {
    color: '#d7dadc',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Objective */
  objectiveCard: {
    backgroundColor: '#0e1820',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1a3040',
    gap: 6,
  },
  eyebrow: {
    color: '#7bdff2',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  objectiveText: {
    color: '#ecf7fb',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },

  /* Actions */
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2a2a2e',
    backgroundColor: '#1e1e22',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionBtnPrimary: {
    backgroundColor: '#d9f99d',
    borderColor: '#d9f99d',
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionLabelPrimary: {
    color: '#162108',
  },

  /* Section cards */
  sectionCard: {
    backgroundColor: '#141416',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e1e22',
    padding: 18,
    gap: 14,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },

  /* Difficulty */
  difficultyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  diffChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1e1e22',
  },
  diffChipSelected: {
    backgroundColor: '#4ade80',
    borderColor: '#4ade80',
  },
  diffChipDisabled: {
    opacity: 0.4,
  },
  diffLabel: {
    color: '#d7dadc',
    fontSize: 13,
    fontWeight: '700',
  },
  diffLabelSelected: {
    color: '#052e16',
  },

  /* Board */
  boardFrame: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e22',
    backgroundColor: '#0a0a0b',
    padding: 14,
    minHeight: 220,
    justifyContent: 'center',
  },
  helperText: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 19,
  },

  /* Concept bridge */
  bridgeBlock: {
    gap: 8,
  },
  bridgeTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  bridgeSummary: {
    color: '#d7dadc',
    fontSize: 14,
    lineHeight: 20,
  },
  bridgeTakeaway: {
    color: '#4ade80',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },

  /* LeetCode links */
  linksBlock: {
    gap: 8,
  },
  linksTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e1e22',
    backgroundColor: '#0a0a0b',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkId: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '800',
    minWidth: 40,
  },
  linkTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  linkArrow: {
    color: '#4b5563',
    fontSize: 22,
    lineHeight: 22,
  },
});
