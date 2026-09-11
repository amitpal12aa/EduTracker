import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, Card } from '../components/ui';
import { useAuth } from '../lib/AuthContext';

export default function ProfileScreen() {
  const { profile, role, user, signOut } = useAuth();
  const p = profile as { name?: string; email?: string; phone?: string; department?: string; branch?: string; roll_no?: string } | null;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>Profile</Text>

      <Card style={{ marginTop: 16 }}>
        <Row label="Name" value={p?.name ?? '—'} />
        <Row label="Role" value={role ? role[0].toUpperCase() + role.slice(1) : '—'} />
        <Row label="Email" value={p?.email ?? user?.email ?? '—'} />
        {p?.roll_no ? <Row label="Roll No" value={p.roll_no} /> : null}
        {p?.branch ? <Row label="Branch" value={p.branch} /> : null}
        {p?.department ? <Row label="Department" value={p.department} /> : null}
        {p?.phone ? <Row label="Phone" value={p.phone} /> : null}
      </Card>

      <Pressable style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      <Text style={styles.footnote}>
        This account is shared with the EduTrack AI website — changes made on either sync automatically.
      </Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { color: colors.subtext, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  signOutBtn: { marginTop: 24, backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  signOutText: { color: '#fff', fontWeight: '700' },
  footnote: { marginTop: 20, fontSize: 12, color: colors.subtext, textAlign: 'center' },
});
