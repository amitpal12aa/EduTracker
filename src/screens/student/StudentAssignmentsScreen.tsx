import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Card, ScreenLoader, SectionTitle, EmptyState, colors } from '../../components/ui';
import { useStudentData } from '../../lib/useStudentData';
import { subjectById } from '../../lib/useTeacherData';
import { Assignment } from '../../lib/supabase';
import AssignmentSubmitModal from './AssignmentSubmitModal';

export default function StudentAssignmentsScreen() {
  const d = useStudentData();
  const [active, setActive] = useState<Assignment | null>(null);
  if (d.loading) return <ScreenLoader label="Loading assignments…" />;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>Assignments</Text>

      <Card style={{ marginTop: 16 }}>
        <SectionTitle>All Assignments</SectionTitle>
        {d.assignments.length === 0 ? (
          <EmptyState text="No assignments posted yet." />
        ) : (
          d.assignments.map((a) => {
            const subj = subjectById(d.subjects, a.subject_id);
            const mySubmission = d.submissions.find((s) => s.assignment_id === a.id);
            return (
              <Pressable key={a.id} style={styles.row} onPress={() => setActive(a)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{a.title}</Text>
                  <Text style={styles.rowSub}>{subj?.code ?? 'Subject'} · {a.max_marks ?? '—'} marks</Text>
                  {a.description ? <Text style={styles.rowDesc} numberOfLines={2}>{a.description}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {a.due_date ? <Text style={styles.dueDate}>Due {new Date(a.due_date).toLocaleDateString()}</Text> : null}
                  <Text style={[styles.statusTag, mySubmission ? (mySubmission.marks != null ? { color: colors.success } : { color: '#f59e0b' }) : { color: colors.danger }]}>
                    {mySubmission ? (mySubmission.marks != null ? `Graded ${mySubmission.marks}/${a.max_marks ?? '—'}` : 'Submitted') : 'Not submitted'}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <SectionTitle>Resources</SectionTitle>
        {d.resources.length === 0 ? (
          <EmptyState text="No resources uploaded yet." />
        ) : (
          d.resources.map((r) => {
            const subj = subjectById(d.subjects, r.subject_id);
            return (
              <View key={r.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.title}</Text>
                  <Text style={styles.rowSub}>{subj?.code ?? 'Subject'} · {r.type}</Text>
                </View>
              </View>
            );
          })
        )}
      </Card>

      {active && <AssignmentSubmitModal assignment={active} onClose={() => setActive(null)} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  rowDesc: { fontSize: 12, color: colors.subtext, marginTop: 4 },
  dueDate: { fontSize: 11, color: colors.subtext },
  statusTag: { fontSize: 11, fontWeight: '700', marginTop: 4 },
});
