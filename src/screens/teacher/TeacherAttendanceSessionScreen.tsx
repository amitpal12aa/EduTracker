import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, FlatList } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Card, ScreenLoader, SectionTitle, StatPill, EmptyState, colors } from '../../components/ui';
import { useTeacherData } from '../../lib/useTeacherData';
import { useTeacherAttendanceSession } from '../../lib/useTeacherAttendanceSession';
import { encodeQrPayload } from '../../lib/qrPayload';

const resultColor: Record<string, string> = {
  verified: colors.success,
  duplicate: '#f59e0b',
  expired: colors.subtext,
  invalid_code: colors.danger,
  not_enrolled: colors.danger,
  error: colors.danger,
};

export default function TeacherAttendanceSessionScreen() {
  const d = useTeacherData();
  const { session, code, remainingSeconds, bleStatus, verifications, error, start, stop } = useTeacherAttendanceSession();
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { verified: 0, duplicate: 0, invalid_code: 0, expired: 0, not_enrolled: 0, error: 0 };
    verifications.forEach((v) => { c[v.result] = (c[v.result] ?? 0) + 1; });
    return c;
  }, [verifications]);

  if (d.loading) return <ScreenLoader label="Loading your subjects…" />;

  if (!session) {
    return (
      <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.title}>Start Attendance</Text>
        <Text style={styles.subtitle}>Broadcasts a real BLE signal and a scannable QR — both bound to a server-verified session.</Text>

        <Card style={{ marginTop: 16 }}>
          <SectionTitle>Subject</SectionTitle>
          {d.subjects.length === 0 ? (
            <EmptyState text="No subjects found for your account." />
          ) : (
            <View style={{ gap: 8 }}>
              {d.subjects.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setSubjectId(s.id)}
                  style={[styles.subjectRow, subjectId === s.id && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                >
                  <Text style={styles.subjectRowText}>{s.code} — {s.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.startBtn, !subjectId && { opacity: 0.5 }]}
          disabled={!subjectId}
          onPress={() => subjectId !== null && start(String(subjectId), null, 900)}
        >
          <Text style={styles.startBtnText}>Start 15-minute Session</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.liveHeader}>
        <View style={styles.liveDot} />
        <Text style={styles.liveHeaderText}>Session live — closes in {minutes}:{seconds.toString().padStart(2, '0')}</Text>
      </View>

      <View style={styles.statsRow}>
        <StatPill label="Verified" value={counts.verified} />
        <StatPill label="Blocked" value={counts.duplicate + counts.invalid_code + counts.not_enrolled} />
        <StatPill label="Total" value={d.students.length} />
      </View>

      <Card style={{ marginTop: 16, alignItems: 'center' }}>
        <SectionTitle>Scan-to-mark QR</SectionTitle>
        {code ? <QRCode value={encodeQrPayload(session.sessionId, code)} size={180} /> : <Text style={styles.subtitle}>Generating…</Text>}
        <Text style={styles.codeHint}>Code refreshes every 15s · single institution-verified use per student</Text>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <SectionTitle>Bluetooth Broadcast</SectionTitle>
        <Text style={[styles.bleStatus, bleStatus === 'advertising' && { color: colors.success }, bleStatus === 'unavailable' && { color: colors.danger }]}>
          {bleStatus === 'advertising' ? '● Broadcasting real BLE signal' : bleStatus === 'unavailable' ? '● Bluetooth unavailable on this device — use QR instead' : '● Not started'}
        </Text>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <SectionTitle>Live Feed</SectionTitle>
        {verifications.length === 0 ? (
          <EmptyState text="Waiting for students to scan or connect…" />
        ) : (
          <FlatList
            data={verifications}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => {
              const student = d.students.find((s) => s.id === item.student_id);
              return (
                <View style={styles.feedRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{student?.name ?? 'Unknown student'}</Text>
                    <Text style={styles.rowSub}>{item.method.toUpperCase()} · {new Date(item.verified_at).toLocaleTimeString()}</Text>
                  </View>
                  <Text style={[styles.resultBadge, { color: resultColor[item.result] }]}>{item.result.replace('_', ' ')}</Text>
                </View>
              );
            }}
          />
        )}
      </Card>

      <Pressable style={styles.stopBtn} onPress={stop}>
        <Text style={styles.stopBtnText}>Stop Session</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.subtext, marginTop: 4 },
  subjectRow: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.card },
  subjectRowText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  error: { color: colors.danger, marginTop: 12, fontSize: 13 },
  startBtn: { marginTop: 20, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '700' },
  liveHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  liveHeaderText: { fontWeight: '700', color: colors.text },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  codeHint: { fontSize: 11, color: colors.subtext, marginTop: 10, textAlign: 'center' },
  bleStatus: { fontSize: 13, fontWeight: '600', color: colors.subtext },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  feedRow: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  resultBadge: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  stopBtn: { marginTop: 20, backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  stopBtnText: { color: '#fff', fontWeight: '700' },
});
