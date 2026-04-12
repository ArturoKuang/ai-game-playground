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
              <Text style={styles.sectionEyebrow}>Objective</Text>
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
                    styles.actionButton,
                    action.tone === 'primary' && styles.actionButtonPrimary,
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

        {difficultyOptions.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Difficulty</Text>
            <View style={styles.difficultyRow}>
              {difficultyOptions.map((option) => (
                <Pressable
                  key={option.label}
                  disabled={option.disabled}
                  onPress={option.onPress}
                  style={[
                    styles.difficultyChip,
                    option.selected && styles.difficultyChipSelected,
                    option.disabled && styles.difficultyChipDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.difficultyLabel,
                      option.selected && styles.difficultyLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Board</Text>
          <View style={styles.boardFrame}>{board}</View>
          {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
        </View>

        {controls ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Controls</Text>
            {controls}
          </View>
        ) : null}

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
                <Text style={styles.linksTitle}>Related LeetCode problems</Text>
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

        {footer ? <View style={styles.sectionCard}>{footer}</View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121213',
  },
  screen: {
    flex: 1,
    backgroundColor: '#121213',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2f3136',
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
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  subtitle: {
    color: '#b0b3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  statsPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#22242a',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  statsLabel: {
    color: '#d7dadc',
    fontSize: 12,
    fontWeight: '700',
  },
  objectiveCard: {
    backgroundColor: '#101820',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#22404d',
    gap: 6,
  },
  sectionEyebrow: {
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
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    backgroundColor: '#23252b',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionButtonPrimary: {
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
  sectionCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2f3136',
    padding: 18,
    gap: 14,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  difficultyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  difficultyChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#23252b',
  },
  difficultyChipSelected: {
    backgroundColor: '#7bdff2',
    borderColor: '#7bdff2',
  },
  difficultyChipDisabled: {
    opacity: 0.45,
  },
  difficultyLabel: {
    color: '#d7dadc',
    fontSize: 13,
    fontWeight: '700',
  },
  difficultyLabelSelected: {
    color: '#0e1a20',
  },
  boardFrame: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    backgroundColor: '#111214',
    padding: 14,
    minHeight: 220,
    justifyContent: 'center',
  },
  helperText: {
    color: '#9aa0a6',
    fontSize: 13,
    lineHeight: 19,
  },
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
    color: '#7bdff2',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  linksBlock: {
    gap: 10,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2f3136',
    backgroundColor: '#151618',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkId: {
    color: '#7bdff2',
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
    color: '#818384',
    fontSize: 24,
    lineHeight: 24,
  },
});
