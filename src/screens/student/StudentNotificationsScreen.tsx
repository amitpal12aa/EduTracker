import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Card, ScreenLoader, EmptyState, colors } from '../../components/ui';
import { useStudentData } from '../../lib/useStudentData';
import { supabase } from '../../lib/supabase';

const typeColor: Record<string, string> = {
  ai: colors.primary,
  attendance: '#f59e0b',
  exam: colors.danger,
  assignment: '#3b82f6',
  announcement: colors.subtext,
};

export default function StudentNotificationsScreen() {
  const d = useStudentData();
  const [filter, setFilter] = useState<string>('all');

  if (d.loading) return <ScreenLoader label="Loading notifications…" />;

  const list = filter === 'all' ? d.notifications : d.notifications.filter((n) => n.type === filter);
  const unreadCount = d.notifications.filter((n) => n.unread).length;

  const markAll = async () => {
    await supabase.from('notifications').update({ unread: false }).eq('user_role', 'student').eq('unread', true);
    d.reload();
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{unreadCount} unread</Text>
        <Pressable onPress={markAll}>
          <Text style={styles.markAll}>Mark all read</Text>
        </Pressable>
      </View>

      <Card style={{ marginTop: 12 }}>
        {list.length === 0 ? (
          <EmptyState text="No notifications yet. When your teachers post announcements or mark attendance, they'll appear here in real time." />
        ) : (
          list.map((n) => (
            <View key={n.id} style={[styles.row, n.unread && { backgroundColor: colors.primaryLight }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{n.title}</Text>
                {n.body ? <Text style={styles.rowBody}>{n.body}</Text> : null}
                <Text style={styles.rowTime}>{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</Text>
              </View>
              <Text style={[styles.typeTag, { color: typeColor[n.type ?? 'announcement'] ?? colors.subtext }]}>{n.type ?? 'general'}</Text>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  markAll: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  rowBody: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  rowTime: { fontSize: 10, color: colors.subtext, marginTop: 4 },
  typeTag: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
});
