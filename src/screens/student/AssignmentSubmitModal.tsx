import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { colors } from '../../components/ui';
import { useStudentData } from '../../lib/useStudentData';
import { supabase, Assignment } from '../../lib/supabase';

export default function AssignmentSubmitModal({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const { studentId, reload } = useStudentData();
  const [content, setContent] = useState('');
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!studentId) return;
    if (!content && !link) { setError('Write something or paste a link before submitting.'); return; }
    setSubmitting(true);
    setError(null);
    // RLS policy submissions_student_insert_own already restricts this to
    // the caller's own student_id — see supabase/migrations 20260810000000.
    const { error: insertErr } = await supabase
      .from('submissions')
      .upsert(
        { assignment_id: assignment.id, student_id: studentId, content: content || null, file_url: link || null },
        { onConflict: 'assignment_id,student_id' }
      );
    setSubmitting(false);
    if (insertErr) { setError(insertErr.message); return; }
    setDone(true);
    reload();
  };

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView style={styles.sheet} contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.title}>{assignment.title}</Text>
          {assignment.description ? <Text style={styles.desc}>{assignment.description}</Text> : null}

          {done ? (
            <Text style={styles.success}>Submitted — visible to your teacher now.</Text>
          ) : (
            <>
              <Text style={styles.label}>Answer / notes</Text>
              <TextInput style={styles.textArea} multiline value={content} onChangeText={setContent} placeholder="Type your answer…" placeholderTextColor="#94a3b8" />

              <Text style={styles.label}>Link (optional — Drive, GitHub, etc.)</Text>
              <TextInput style={styles.input} value={link} onChangeText={setLink} placeholder="https://…" placeholderTextColor="#94a3b8" autoCapitalize="none" />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable style={styles.submitBtn} onPress={submit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit</Text>}
              </Pressable>
            </>
          )}

          <Pressable onPress={onClose} style={{ marginTop: 12 }}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  desc: { fontSize: 13, color: colors.subtext, marginTop: 6 },
  label: { fontSize: 12, fontWeight: '700', color: colors.subtext, marginTop: 16, marginBottom: 6 },
  textArea: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 100, textAlignVertical: 'top', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text },
  error: { color: colors.danger, marginTop: 10, fontSize: 12 },
  success: { color: colors.success, fontWeight: '700', marginTop: 16 },
  submitBtn: { marginTop: 18, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
  closeText: { color: colors.subtext, textAlign: 'center', fontSize: 13 },
});
