import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { colors } from '../../components/ui';
import { useAuth } from '../../lib/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'StudentSignUp'>;

export default function StudentSignUpScreen({ navigation }: Props) {
  const { studentSignUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!firstName || !lastName || !rollNo || !email || !password) {
      setError('Fill in every field.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await studentSignUp({ firstName, lastName, email, password, rollNo });
    setSubmitting(false);
    if (result.error) { setError(result.error); return; }
    if (result.needsEmailConfirmation) {
      Alert.alert('Check your email', 'Confirm your email address, then log in.');
      navigation.navigate('Login', { role: 'student' });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.back}>{'‹ Back'}</Text>
      </Pressable>
      <Text style={styles.title}>Create Student Account</Text>

      <View style={{ marginTop: 20, gap: 14 }}>
        <Field label="First name" value={firstName} onChangeText={setFirstName} />
        <Field label="Last name" value={lastName} onChangeText={setLastName} />
        <Field label="Roll number" value={rollNo} onChangeText={setRollNo} autoCapitalize="characters" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.submitBtn} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Account</Text>}
      </Pressable>
    </ScrollView>
  );
}

function Field(props: { label: string } & React.ComponentProps<typeof TextInput>) {
  const { label, ...rest } = props;
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#94a3b8" {...rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 60, paddingBottom: 60 },
  back: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 16 },
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
});
