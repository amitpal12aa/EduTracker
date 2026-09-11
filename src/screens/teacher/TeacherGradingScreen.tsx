import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { Card, ScreenLoader, SectionTitle, EmptyState, colors } from '../../components/ui';
import { useTeacherData } from '../../lib/useTeacherData';
import { supabase } from '../../lib/supabase';

export default function TeacherGradingScreen() {
  const d = useTeacherData();
  const [openAssignmentId, setOpenAssignmentId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { marks: string; feedback: string }>>({});

  if (d.loading) return <ScreenLoader label="Loading submissions…" />;

  const save = async (submissionId: number) => {
    const draft = drafts[submissionId];
    if (!draft) return;
    const marksNum = draft.marks ? Number(draft.marks) : null;
    await supabase.from('submissions').update({ marks: marksNum, feedback: draft.feedback || null }).eq('id', submissionId);
    d.reload();
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>Grading</Text>

      {d.assignments.length === 0 ? (
        <Card style={{ marginTop: 16 }}><EmptyState text="No assignments posted yet." /></Card>
      ) : (
        d.assignments.map((a) => {
          const subs = d.submissions.filter((s) => s.assignment_id === a.id);
          const isOpen = openAssignmentId === a.id;
          return (
            <Card key={a.id} style={{ marginTop: 12 }}>
              <Pressable onPress={() => setOpenAssignmentId(isOpen ? null : a.id)}>
                <SectionTitle>{a.title} · {subs.length} submission{subs.length === 1 ? '' : 's'}</SectionTitle>
              </Pressable>
              {isOpen && (
                subs.length === 0 ? (
                  <EmptyState text="No submissions yet." />
                ) : (
                  subs.map((s) => {
                    const student = d.students.find((st) => st.id === s.student_id);
                    const draft = drafts[s.id] ?? { marks: s.marks?.toString() ?? '', feedback: s.feedback ?? '' };
                    return (
                      <View key={s.id} style={styles.subRow}>
                        <Text style={styles.subName}>{student?.name ?? 'Student'} ({student?.roll_no})</Text>
                        {s.content ? <Text style={styles.subContent}>{s.content}</Text> : null}
                        {s.file_url ? <Text style={styles.subLink}>{s.file_url}</Text> : null}
                        <View style={styles.gradeRow}>
                          <TextInput
                            style={styles.marksInput}
                            keyboardType="numeric"
                            placeholder={`/ ${a.max_marks ?? 100}`}
                            placeholderTextColor="#94a3b8"
                            value={draft.marks}
                            onChangeText={(v) => setDrafts((p) => ({ ...p, [s.id]: { ...draft, marks: v } }))}
                          />
                          <TextInput
                            style={styles.feedbackInput}
                            placeholder="Feedback (optional)"
                            placeholderTextColor="#94a3b8"
                            value={draft.feedback}
                            onChangeText={(v) => setDrafts((p) => ({ ...p, [s.id]: { ...draft, feedback: v } }))}
                          />
                          <Pressable style={styles.saveBtn} onPress={() => save(s.id)}>
                            <Text style={styles.saveBtnText}>Save</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })
                )
              )}
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
  subRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 10 },
  subName: { fontSize: 13, fontWeight: '700', color: colors.text },
  subContent: { fontSize: 12, color: colors.text, marginTop: 4 },
  subLink: { fontSize: 12, color: colors.primary, marginTop: 4 },
  gradeRow: { flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'center' },
  marksInput: { width: 60, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, fontSize: 12, color: colors.text },
  feedbackInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, fontSize: 12, color: colors.text },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
