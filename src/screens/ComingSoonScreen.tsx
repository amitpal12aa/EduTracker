import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../components/ui';

export default function ComingSoonScreen({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>
        {note ?? 'This module is built in the next phase — it will read/write the same tables the website already uses, nothing here is mocked.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  note: { fontSize: 13, color: colors.subtext, textAlign: 'center' },
});
