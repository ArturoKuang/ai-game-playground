import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Stats } from '../utils/stats';

type StatsModalProps = {
  stats: Stats;
  onClose: () => void;
};

export default function StatsModal({ stats, onClose }: StatsModalProps) {
  const winPct =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Statistics</Text>

          <View style={styles.statRow}>
            <StatBox value={stats.gamesPlayed} label="Played" />
            <StatBox value={winPct} label="Win %" />
            <StatBox value={stats.currentStreak} label="Current{'\n'}Streak" />
            <StatBox value={stats.maxStreak} label="Max{'\n'}Streak" />
          </View>

          {stats.bestScore !== null && (
            <View style={styles.bestRow}>
              <Text style={styles.bestLabel}>Best Score</Text>
              <Text style={styles.bestValue}>{stats.bestScore} moves</Text>
            </View>
          )}

          {/* Distribution */}
          {Object.keys(stats.scoreDistribution).length > 0 && (
            <View style={styles.distSection}>
              <Text style={styles.distTitle}>Results</Text>
              {Object.entries(stats.scoreDistribution).map(([label, count]) => (
                <View key={label} style={styles.distRow}>
                  <Text style={styles.distLabel}>{label}</Text>
                  <View
                    style={[
                      styles.distBar,
                      {
                        flex: count / Math.max(...Object.values(stats.scoreDistribution)),
                        backgroundColor:
                          label === 'Under par' ? '#6aaa64' : '#e67e22',
                      },
                    ]}
                  >
                    <Text style={styles.distCount}>{count}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    color: '#818384',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  bestRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  bestLabel: {
    color: '#818384',
    fontSize: 14,
  },
  bestValue: {
    color: '#6aaa64',
    fontSize: 18,
    fontWeight: '700',
  },
  distSection: {
    marginBottom: 16,
  },
  distTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  distLabel: {
    color: '#818384',
    fontSize: 12,
    width: 70,
  },
  distBar: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 28,
  },
  distCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  closeBtn: {
    backgroundColor: '#3a3a3c',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  closeBtnText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
});
