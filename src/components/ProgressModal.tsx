import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ACHIEVEMENTS, type Stats } from '../logic/achievements';
import { addDays, bestStreak, currentStreak, dayKey } from '../logic/streak';

type Props = { visible: boolean; stats: Stats; onClose: () => void };

const WEEKS = 5;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function ProgressModal({ visible, stats, onClose }: Props) {
  const now = new Date();
  const today = dayKey(now);
  const streak = currentStreak(stats.days, today);
  const best = bestStreak(stats.days);

  // Monday-first grid of the last few weeks, ending with this week.
  const mondayOffset = (now.getDay() + 6) % 7;
  const start = addDays(today, -(7 * (WEEKS - 1) + mondayOffset));
  const cells = Array.from({ length: 7 * WEEKS }, (_, i) => addDays(start, i));
  const contributed = new Set(stats.days);

  const hint =
    streak.status === 'done-today'
      ? "Today's photo is in."
      : streak.status === 'at-risk'
        ? 'Add a photo today to keep your streak going.'
        : stats.days.length
          ? 'Add a photo today to start a new streak.'
          : 'Add your first photo to start a streak.';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={12}>
            <Text style={styles.close}>Done</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Current streak" value={`🔥 ${streak.count}`} />
          <Stat label="Best streak" value={String(best)} />
          <Stat label="Photos added" value={String(stats.totalAdded)} />
        </View>
        <Text style={styles.hint}>{hint}</Text>

        <View style={styles.calendar} accessibilityLabel={`Contribution calendar, last ${WEEKS} weeks`}>
          {WEEKDAYS.map((d, i) => (
            <Text key={i} style={styles.weekday}>
              {d}
            </Text>
          ))}
          {cells.map((day) => (
            <View key={day} style={styles.cellWrap}>
              <View
                style={[
                  styles.cell,
                  contributed.has(day) && styles.cellOn,
                  day === today && styles.cellToday,
                  day > today && styles.cellFuture,
                ]}
                accessibilityLabel={`${day}${contributed.has(day) ? ', photo added' : ''}`}
              />
            </View>
          ))}
        </View>

        <Text style={styles.section}>Achievements</Text>
        {ACHIEVEMENTS.map((a) => {
          const at = stats.unlocked[a.id];
          return (
            <View key={a.id} style={[styles.achievement, !at && styles.locked]}>
              <Text style={styles.badge}>{at ? '🏅' : '🔒'}</Text>
              <View style={styles.achievementText}>
                <Text style={styles.achievementTitle}>{a.title}</Text>
                <Text style={styles.achievementDesc}>
                  {a.description}
                  {at ? ` · ${new Date(at).toLocaleDateString()}` : ''}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const ink = '#3B3355';
const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: '#FFF8F2' },
  content: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: ink },
  close: { fontSize: 16, fontWeight: '600', color: ink },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: '#F3E6DC', borderRadius: 14, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: ink },
  statLabel: { fontSize: 12, color: '#7a6a80', marginTop: 2, textAlign: 'center' },
  hint: { color: '#7a6a80', marginTop: 12, marginBottom: 16, textAlign: 'center' },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, color: '#7a6a80', marginBottom: 4 },
  cellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  cell: { flex: 1, borderRadius: 6, backgroundColor: '#F3E6DC' },
  cellOn: { backgroundColor: '#F28B9B' },
  cellToday: { borderWidth: 2, borderColor: ink },
  cellFuture: { opacity: 0.35 },
  section: { fontSize: 18, fontWeight: '700', color: ink, marginBottom: 8 },
  achievement: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  locked: { opacity: 0.45 },
  badge: { fontSize: 24 },
  achievementText: { flex: 1 },
  achievementTitle: { fontWeight: '600', color: ink },
  achievementDesc: { fontSize: 12, color: '#7a6a80' },
});
