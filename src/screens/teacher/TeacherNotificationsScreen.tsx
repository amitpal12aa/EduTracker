import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Card, ScreenLoader, EmptyState, colors } from '../../components/ui';
import { useTeacherData } from '../../lib/useTeacherData';
import { supabase } from '../../lib/supabase';

export default function TeacherNotificationsScreen() {
  const d = useTeacherData();
  if (d.loading) return <ScreenLoader label="Loading notifications…" />;

  const unreadCount = d.notifications.filter((n) => n.unread).length;

  const markAll = async () => {
    await supabase.from('notifications').update({ unread: false }).eq('user_role', 'teacher').eq('unread', true);
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
        {d.notifications.length === 0 ? (
          <EmptyState text="No notifications yet." />
        ) : (
          d.notifications.map((n) => (
            <View key={n.id} style={[styles.row, n.unread && { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.rowTitle}>{n.title}</Text>
              {n.body ? <Text style={styles.rowBody}>{n.body}</Text> : null}
              <Text style={styles.rowTime}>{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</Text>
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
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  rowBody: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  rowTime: { fontSize: 10, color: colors.subtext, marginTop: 4 },
});
