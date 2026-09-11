import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Card, ScreenLoader, SectionTitle, EmptyState, colors } from '../../components/ui';
import { useStudentData } from '../../lib/useStudentData';
import { subjectById } from '../../lib/useTeacherData';

export default function StudentMarksScreen() {
  const d = useStudentData();
  if (d.loading) return <ScreenLoader label="Loading marks…" />;

  const bySubject = new Map<number, typeof d.marks>();
  d.marks.forEach((m) => {
    const list = bySubject.get(m.subject_id) ?? [];
    list.push(m);
    bySubject.set(m.subject_id, list);
  });

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>Marks & Results</Text>

      {d.marks.length === 0 ? (
        <Card style={{ marginTop: 16 }}>
          <EmptyState text="No marks have been entered yet." />
        </Card>
      ) : (
        Array.from(bySubject.entries()).map(([subjectId, rows]) => {
          const subj = subjectById(d.subjects, Number(subjectId));
          return (
            <Card key={subjectId} style={{ marginTop: 16 }}>
              <SectionTitle>{subj?.name ?? 'Subject'}</SectionTitle>
              {rows.map((m) => {
                const pct = m.max_score > 0 ? Math.round((m.score / m.max_score) * 100) : 0;
                return (
                  <View key={m.id} style={styles.row}>
                    <Text style={styles.rowLabel}>{m.assessment_name}</Text>
                    <Text style={styles.rowValue}>{m.score}/{m.max_score} ({pct}%)</Text>
                  </View>
                );
              })}
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 13, color: colors.text, fontWeight: '600' },
  rowValue: { fontSize: 13, color: colors.subtext },
});
