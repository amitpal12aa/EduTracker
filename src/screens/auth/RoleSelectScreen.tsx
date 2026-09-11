import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { colors } from '../../components/ui';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelect'>;

const roles: { key: 'student' | 'teacher' | 'admin'; label: string; blurb: string }[] = [
  { key: 'student', label: 'Student', blurb: 'Attendance, assignments, marks, timetable' },
  { key: 'teacher', label: 'Teacher', blurb: 'Classes, attendance sessions, grading' },
  { key: 'admin', label: 'Admin', blurb: 'Institution-wide management' },
];

export default function RoleSelectScreen({ navigation }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>EduTrack AI</Text>
      <Text style={styles.subtitle}>Same account, same data as the website. Sign in to continue.</Text>
      <View style={{ gap: 12, marginTop: 32 }}>
        {roles.map((r) => (
          <Pressable
            key={r.key}
            style={({ pressed }) => [styles.roleCard, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.navigate('Login', { role: r.key })}
          >
            <Text style={styles.roleLabel}>{r.label}</Text>
            <Text style={styles.roleBlurb}>{r.blurb}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={{ marginTop: 24 }} onPress={() => navigation.navigate('StudentSignUp')}>
        <Text style={styles.linkText}>New student? Create an account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 80 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.subtext, marginTop: 8 },
  roleCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  roleLabel: { fontSize: 17, fontWeight: '700', color: colors.text },
  roleBlurb: { fontSize: 13, color: colors.subtext, marginTop: 4 },
  linkText: { color: colors.primary, textAlign: 'center', fontWeight: '600' },
});
