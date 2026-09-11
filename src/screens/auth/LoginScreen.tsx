import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../../components/ui';
import { useAuth } from '../../lib/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const titles = { student: 'Student Login', teacher: 'Faculty Login', admin: 'Admin Login' };

export default function LoginScreen({ route, navigation }: Props) {
  const { role } = route.params;
  const { studentSignIn, teacherSignIn, adminSignIn, forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email || !password) { setError('Enter your email and password.'); return; }
    setError(null);
    setSubmitting(true);
    const signIn = role === 'student' ? studentSignIn : role === 'teacher' ? teacherSignIn : adminSignIn;
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) { setError(result.error); return; }
    if (result.needsEmailConfirmation) {
      Alert.alert('Check your email', 'Confirm your email address, then log in again.');
    }
    // On success the RootNavigator swaps to the role's app stack automatically
    // because `role`/`profile` in AuthContext change.
  };

  const onForgotPassword = async () => {
    if (!email) { setError('Enter your email above first.'); return; }
    const result = await forgotPassword(email);
    if (result.error) setError(result.error);
    else Alert.alert('Reset link sent', 'Check your email for a password reset link.');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.wrap}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{'‹ Back'}</Text>
        </Pressable>
        <Text style={styles.title}>{titles[role]}</Text>

        <View style={{ marginTop: 24, gap: 14 }}>
          <View>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@institution.edu"
              placeholderTextColor="#94a3b8"
            />
          </View>
          <View>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.submitBtn} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Sign In</Text>}
        </Pressable>

        <Pressable onPress={onForgotPassword} style={{ marginTop: 16 }}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 60 },
  back: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 16 },
  label: { fontSize: 13, color: colors.subtext, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  error: { color: colors.danger, marginTop: 14, fontSize: 13 },
  submitBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkText: { color: colors.primary, textAlign: 'center', fontWeight: '600' },
});
