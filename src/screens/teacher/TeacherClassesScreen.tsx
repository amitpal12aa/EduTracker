import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Card, ScreenLoader, SectionTitle, EmptyState, colors } from '../../components/ui';
import { useTeacherData } from '../../lib/useTeacherData';
import { supabase } from '../../lib/supabase';

export default function TeacherClassesScreen() {
  const d = useTeacherData();
  if (d.loading) return <ScreenLoader label="Loading your classes…" />;

  const pendingLeaves = d.leaves.filter((l) => l.status === 'pending');

  const decide = async (id: number, status: 'approved' | 'rejected') => {
    await supabase.from('leave_requests').update({ status }).eq('id', id);
    d.reload();
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>Your Classes</Text>

      <Card style={{ marginTop: 16 }}>
        <SectionTitle>Students ({d.students.length})</SectionTitle>
        {d.students.length === 0 ? (
          <EmptyState text="No students found." />
        ) : (
          d.students.slice(0, 30).map((s) => (
            <View key={s.id} style={styles.row}>
              <Text style={styles.rowTitle}>{s.name}</Text>
              <Text style={styles.rowSub}>{s.roll_no}</Text>
            </View>
          ))
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <SectionTitle>Leave Requests</SectionTitle>
        {pendingLeaves.length === 0 ? (
          <EmptyState text="No pending leave requests." />
        ) : (
          pendingLeaves.map((l) => (
            <View key={l.id} style={styles.leaveRow}>
              <Text style={styles.rowTitle}>{l.reason ?? 'Leave request'}</Text>
              <Text style={styles.rowSub}>{l.start_date} → {l.end_date}</Text>
              <View style={styles.leaveBtns}>
                <Pressable style={[styles.leaveBtn, { backgroundColor: colors.success }]} onPress={() => decide(l.id, 'approved')}>
                  <Text style={styles.leaveBtnText}>Approve</Text>
                </Pressable>
                <Pressable style={[styles.leaveBtn, { backgroundColor: colors.danger }]} onPress={() => decide(l.id, 'rejected')}>
                  <Text style={styles.leaveBtnText}>Reject</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 12, color: colors.subtext },
  leaveRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  leaveBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  leaveBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  leaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
