import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  ScreenLoader,
  EmptyState,
  colors,
} from '../../components/ui';

import { useAdminData } from '../../lib/useAdminData';
import { useAuth } from '../../lib/AuthContext';
import { supabase, Admin } from '../../lib/supabase';

type Tab = 'students' | 'teachers';

export default function AdminPeopleScreen() {
  const d = useAdminData();
  const { profile } = useAuth();

  const institutionId =
    (profile as Admin | null)?.institution_id ?? null;

  const [tab, setTab] = useState<Tab>('students');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const pageAnim = useRef(new Animated.Value(0)).current;
  const refreshScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(pageAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return d.students;

    return d.students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.roll_no.toLowerCase().includes(q) ||
        (s.branch ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q)
    );
  }, [d.students, query]);

  const filteredTeachers = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return d.teachers;

    return d.teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.department ?? '').toLowerCase().includes(q) ||
        (t.email ?? '').toLowerCase().includes(q)
    );
  }, [d.teachers, query]);

  const currentCount =
    tab === 'students'
      ? filteredStudents.length
      : filteredTeachers.length;

  const handleRefresh = () => {
    Animated.sequence([
      Animated.timing(refreshScale, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(refreshScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    d.reload();
  };

  if (d.loading) {
    return <ScreenLoader label="Loading institution data…" />;
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ================= HEADER ================= */}

        <Animated.View
          style={[
            styles.header,
            {
              opacity: pageAnim,
              transform: [
                {
                  translateY: pageAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-15, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>ADMIN CONTROL</Text>

              <Text style={styles.title}>People</Text>

              <Text style={styles.subtitle}>
                Manage students and teaching staff
              </Text>
            </View>

            <Animated.View
              style={{ transform: [{ scale: refreshScale }] }}
            >
              <Pressable
                onPress={handleRefresh}
                style={({ pressed }) => [
                  styles.refreshButton,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={21}
                  color={colors.text}
                />
              </Pressable>
            </Animated.View>
          </View>

          {/* Overview mini stats */}

          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <View style={styles.overviewIcon}>
                <MaterialCommunityIcons
                  name="school-outline"
                  size={18}
                  color={colors.text}
                />
              </View>

              <View>
                <Text style={styles.overviewValue}>
                  {d.students.length}
                </Text>

                <Text style={styles.overviewLabel}>
                  Students
                </Text>
              </View>
            </View>

            <View style={styles.overviewDivider} />

            <View style={styles.overviewItem}>
              <View style={styles.overviewIcon}>
                <MaterialCommunityIcons
                  name="account-tie-outline"
                  size={18}
                  color={colors.text}
                />
              </View>

              <View>
                <Text style={styles.overviewValue}>
                  {d.teachers.length}
                </Text>

                <Text style={styles.overviewLabel}>
                  Teachers
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ================= TABS ================= */}

        <Animated.View
          style={[
            styles.tabContainer,
            {
              opacity: pageAnim,
              transform: [
                {
                  translateY: pageAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [15, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable
            onPress={() => {
              setTab('students');
              setQuery('');
            }}
            style={[
              styles.tab,
              tab === 'students' && styles.tabActive,
            ]}
          >
            <MaterialCommunityIcons
              name="school-outline"
              size={19}
              color={
                tab === 'students'
                  ? '#fff'
                  : colors.subtext
              }
            />

            <Text
              style={[
                styles.tabText,
                tab === 'students' &&
                  styles.tabTextActive,
              ]}
            >
              Students
            </Text>

            <View
              style={[
                styles.tabCount,
                tab === 'students' &&
                  styles.tabCountActive,
              ]}
            >
              <Text
                style={[
                  styles.tabCountText,
                  tab === 'students' &&
                    styles.tabCountTextActive,
                ]}
              >
                {d.students.length}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              setTab('teachers');
              setQuery('');
            }}
            style={[
              styles.tab,
              tab === 'teachers' && styles.tabActive,
            ]}
          >
            <MaterialCommunityIcons
              name="account-tie-outline"
              size={19}
              color={
                tab === 'teachers'
                  ? '#fff'
                  : colors.subtext
              }
            />

            <Text
              style={[
                styles.tabText,
                tab === 'teachers' &&
                  styles.tabTextActive,
              ]}
            >
              Teachers
            </Text>

            <View
              style={[
                styles.tabCount,
                tab === 'teachers' &&
                  styles.tabCountActive,
              ]}
            >
              <Text
                style={[
                  styles.tabCountText,
                  tab === 'teachers' &&
                    styles.tabCountTextActive,
                ]}
              >
                {d.teachers.length}
              </Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* ================= SEARCH ================= */}

        <View style={styles.searchContainer}>
          <MaterialCommunityIcons
            name="magnify"
            size={21}
            color={colors.subtext}
          />

          <TextInput
            style={styles.searchInput}
            placeholder={
              tab === 'students'
                ? 'Search name, roll number, branch...'
                : 'Search name, department, email...'
            }
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />

          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              style={styles.clearButton}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={19}
                color={colors.subtext}
              />
            </Pressable>
          )}
        </View>

        {/* Search result info */}

        <View style={styles.resultHeader}>
          <View>
            <Text style={styles.resultTitle}>
              {tab === 'students'
                ? 'Student Directory'
                : 'Teaching Staff'}
            </Text>

            <Text style={styles.resultSubtitle}>
              {query
                ? `${currentCount} matching ${
                    currentCount === 1
                      ? 'person'
                      : 'people'
                  }`
                : `${currentCount} ${
                    currentCount === 1
                      ? 'person'
                      : 'people'
                  }`}
            </Text>
          </View>

          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              style={styles.clearSearch}
            >
              <Text style={styles.clearSearchText}>
                Clear
              </Text>
            </Pressable>
          )}
        </View>

        {/* ================= PEOPLE LIST ================= */}

        <Animated.View
          style={[
            styles.listCard,
            {
              opacity: pageAnim,
              transform: [
                {
                  translateY: pageAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {tab === 'students' ? (
            filteredStudents.length === 0 ? (
              <EmptyState text="No matching students." />
            ) : (
              filteredStudents.map((student, index) => (
                <PersonRow
                  key={student.id}
                  type="students"
                  name={student.name}
                  primary={
                    student.roll_no
                  }
                  secondary={
                    student.branch ?? 'Branch not set'
                  }
                  email={student.email}
                  index={index}
                />
              ))
            )
          ) : filteredTeachers.length === 0 ? (
            <EmptyState text="No matching teachers." />
          ) : (
            filteredTeachers.map((teacher, index) => (
              <PersonRow
                key={teacher.id}
                type="teachers"
                name={teacher.name}
                primary={
                  teacher.department ??
                  'Department not set'
                }
                secondary={
                  teacher.email ?? 'Email not set'
                }
                email={teacher.email}
                index={index}
              />
            ))
          )}
        </Animated.View>

        {/* ================= ADD BUTTON ================= */}

        <Pressable
          onPress={() => setAddOpen(true)}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
        >
          <View style={styles.addIcon}>
            <MaterialCommunityIcons
              name="plus"
              size={23}
              color="#fff"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.addTitle}>
              Add {tab === 'students'
                ? 'Student'
                : 'Teacher'}
            </Text>

            <Text style={styles.addSubtitle}>
              Create a new institution record
            </Text>
          </View>

          <MaterialCommunityIcons
            name="arrow-right"
            size={21}
            color="#fff"
          />
        </Pressable>

        <View style={styles.footer}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={15}
            color={colors.subtext}
          />

          <Text style={styles.footerText}>
            Institution data is managed securely
          </Text>
        </View>
      </ScrollView>

      {/* ================= ADD MODAL ================= */}

      {addOpen && (
        <AddPersonModal
          kind={tab}
          institutionId={institutionId}
          onClose={() => setAddOpen(false)}
          onDone={() => {
            setAddOpen(false);
            d.reload();
          }}
        />
      )}
    </View>
  );
}

/* ========================================================= */
/*                       PERSON ROW                          */
/* ========================================================= */

function PersonRow({
  type,
  name,
  primary,
  secondary,
  email,
  index,
}: {
  type: Tab;
  name: string;
  primary: string;
  secondary: string;
  email?: string | null;
  index: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.985,
      useNativeDriver: true,
      speed: 30,
      bounciness: 5,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 6,
    }).start();
  };

  const letter =
    name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
      }}
    >
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={({ pressed }) => [
          styles.personRow,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {letter}
          </Text>

          <View style={styles.activeDot} />
        </View>

        <View style={styles.personInfo}>
          <Text
            style={styles.personName}
            numberOfLines={1}
          >
            {name}
          </Text>

          <View style={styles.personMeta}>
            <MaterialCommunityIcons
              name={
                type === 'students'
                  ? 'identifier'
                  : 'briefcase-outline'
              }
              size={13}
              color={colors.subtext}
            />

            <Text style={styles.personMetaText}>
              {primary}
            </Text>
          </View>

          <Text
            style={styles.personSecondary}
            numberOfLines={1}
          >
            {secondary}
          </Text>

          {email &&
            type === 'students' && (
              <Text
                style={styles.personEmail}
                numberOfLines={1}
              >
                {email}
              </Text>
            )}
        </View>

        <View style={styles.rowArrow}>
          <MaterialCommunityIcons
            name="chevron-right"
            size={21}
            color={colors.subtext}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* ========================================================= */
/*                    ADD PERSON MODAL                       */
/* ========================================================= */

function AddPersonModal({
  kind,
  institutionId,
  onClose,
  onDone,
}: {
  kind: Tab;
  institutionId: number | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [secondary, setSecondary] =
    useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const submit = async () => {
    const cleanName = name.trim();
    const cleanSecondary =
      secondary.trim();
    const cleanEmail =
      email.trim().toLowerCase();

    if (
      !cleanName ||
      (kind === 'students' &&
        !cleanSecondary)
    ) {
      setError(
        kind === 'students'
          ? 'Name and roll number are required.'
          : 'Name is required.'
      );
      return;
    }

    if (!institutionId) {
      setError(
        'Could not determine your institution. Please log out and sign in again.'
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertErr } =
      kind === 'students'
        ? await supabase
            .from('students')
            .insert({
              name: cleanName,
              roll_no: cleanSecondary,
              email: cleanEmail || null,
              institution_id: institutionId,
            })
        : await supabase
            .from('teachers')
            .insert({
              name: cleanName,
              department:
                cleanSecondary || null,
              email: cleanEmail || null,
              institution_id: institutionId,
            });

    setSubmitting(false);

    if (insertErr) {
      setError(insertErr.message);
      return;
    }

    onDone();
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Modal header */}

          <View style={styles.modalHeader}>
            <View style={styles.modalIcon}>
              <MaterialCommunityIcons
                name={
                  kind === 'students'
                    ? 'school-outline'
                    : 'account-tie-outline'
                }
                size={24}
                color={colors.text}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>
                Add {kind === 'students'
                  ? 'Student'
                  : 'Teacher'}
              </Text>

              <Text style={styles.modalSubtitle}>
                Add a new institution record
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.modalClose}
            >
              <MaterialCommunityIcons
                name="close"
                size={21}
                color={colors.subtext}
              />
            </Pressable>
          </View>

          {/* Name */}

          <Text style={styles.inputLabel}>
            Full name
          </Text>

          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons
              name="account-outline"
              size={19}
              color={colors.subtext}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Enter full name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Roll / Department */}

          <Text style={styles.inputLabel}>
            {kind === 'students'
              ? 'Roll number'
              : 'Department'}
          </Text>

          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons
              name={
                kind === 'students'
                  ? 'identifier'
                  : 'domain'
              }
              size={19}
              color={colors.subtext}
            />

            <TextInput
              style={styles.modalInput}
              placeholder={
                kind === 'students'
                  ? 'Enter roll number'
                  : 'Enter department'
              }
              placeholderTextColor="#94a3b8"
              value={secondary}
              onChangeText={setSecondary}
            />
          </View>

          {/* Email */}

          <Text style={styles.inputLabel}>
            Email
            <Text style={styles.optional}>
              {' '}
              • optional
            </Text>
          </Text>

          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons
              name="email-outline"
              size={19}
              color={colors.subtext}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Enter email address"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Error */}

          {error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={18}
                color={colors.danger}
              />

              <Text style={styles.error}>
                {error}
              </Text>
            </View>
          )}

          {/* Submit */}

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed &&
                styles.submitButtonPressed,
              submitting &&
                styles.submitButtonDisabled,
            ]}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="account-plus-outline"
                  size={20}
                  color="#fff"
                />

                <Text style={styles.submitText}>
                  Add{' '}
                  {kind === 'students'
                    ? 'Student'
                    : 'Teacher'}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={onClose}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* ========================================================= */
/*                         STYLES                             */
/* ========================================================= */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  content: {
    padding: 16,
    paddingBottom: 45,
  },

  /* HEADER */

  header: {
    borderRadius: 25,
    padding: 19,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 15,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: colors.subtext,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },

  subtitle: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 4,
  },

  refreshButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  overviewRow: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  overviewItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  overviewIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 9,
  },

  overviewValue: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
  },

  overviewLabel: {
    fontSize: 9,
    color: colors.subtext,
    marginTop: 1,
  },

  overviewDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: 10,
  },

  /* TABS */

  tabContainer: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 13,
  },

  tab: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  tabText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.subtext,
    marginLeft: 6,
  },

  tabTextActive: {
    color: '#fff',
  },

  tabCount: {
    minWidth: 23,
    height: 23,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    backgroundColor: colors.bg,
  },

  tabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  tabCountText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.subtext,
  },

  tabCountTextActive: {
    color: '#fff',
  },

  /* SEARCH */

  searchContainer: {
    minHeight: 52,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    marginLeft: 9,
    paddingVertical: 13,
  },

  clearButton: {
    padding: 3,
  },

  /* RESULT HEADER */

  resultHeader: {
    marginTop: 21,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  resultTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },

  resultSubtitle: {
    fontSize: 10,
    color: colors.subtext,
    marginTop: 3,
  },

  clearSearch: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  clearSearchText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
  },

  /* LIST */

  listCard: {
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },

  personRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  avatar: {
    width: 47,
    height: 47,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },

  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },

  activeDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 5,
    right: -1,
    bottom: -1,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: colors.card,
  },

  personInfo: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },

  personName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },

  personMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  personMetaText: {
    fontSize: 10,
    color: colors.subtext,
    marginLeft: 4,
  },

  personSecondary: {
    fontSize: 9,
    color: colors.subtext,
    marginTop: 3,
  },

  personEmail: {
    fontSize: 9,
    color: colors.subtext,
    marginTop: 2,
  },

  rowArrow: {
    width: 26,
    alignItems: 'flex-end',
  },

  pressed: {
    opacity: 0.62,
  },

  /* ADD */

  addButton: {
    minHeight: 68,
    marginTop: 15,
    borderRadius: 20,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },

  addButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },

  addIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginRight: 12,
  },

  addTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
  },

  addSubtitle: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
  },

  /* FOOTER */

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 23,
  },

  footerText: {
    fontSize: 9,
    color: colors.subtext,
    marginLeft: 5,
  },

  /* MODAL */

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.68)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 21,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: colors.border,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 21,
  },

  modalIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 11,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.text,
  },

  modalSubtitle: {
    fontSize: 10,
    color: colors.subtext,
    marginTop: 3,
  },

  modalClose: {
    width: 37,
    height: 37,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },

  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 7,
  },

  optional: {
    fontWeight: '500',
    color: colors.subtext,
  },

  inputWrapper: {
    minHeight: 49,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginBottom: 13,
  },

  modalInput: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    marginLeft: 9,
    paddingVertical: 12,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    marginBottom: 12,
  },

  error: {
    flex: 1,
    color: colors.danger,
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 7,
  },

  submitButton: {
    minHeight: 51,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  submitButtonPressed: {
    opacity: 0.8,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 7,
  },

  cancelButton: {
    minHeight: 43,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
  },

  cancelText: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '700',
  },
});