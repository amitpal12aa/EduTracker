import React, { useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, EmptyState, ScreenLoader, colors } from '../../components/ui';
import { useStudentData } from '../../lib/useStudentData';
import { subjectById } from '../../lib/useTeacherData';
import { classStatus, todaysClasses } from '../../lib/timetable';

const firstName = (name?: string | null) =>
  name ? name.trim().split(/\s+/)[0] : 'there';

function formatTime(value?: string | null) {
  if (!value) return '—';

  const [h, m] = value.split(':').map(Number);

  if (Number.isNaN(h) || Number.isNaN(m)) return value;

  const date = new Date();
  date.setHours(h, m, 0, 0);

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(value?: string | null) {
  if (!value) return 'No due date';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'No due date';

  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
  });
}

function relativeDate(value?: string | null) {
  if (!value) return '';

  const date = new Date(value).getTime();

  if (Number.isNaN(date)) return '';

  const diff = Math.max(0, Date.now() - date);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
  });
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();

  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day);

  return copy;
}

export default function StudentDashboard() {
  const navigation = useNavigation<any>();

  const {
    loading,
    student,
    subjects,
    assignments,
    attendance,
    notifications,
    classes,
    announcements,
    resources,
    marks,
    submissions,
  } = useStudentData();

  const now = useMemo(() => new Date(), []);

  const studentName =
    'name' in (student ?? {}) ? student?.name : undefined;

  const unreadCount = notifications.filter((n) => n.unread).length;

  const attendanceStats = useMemo(() => {
    if (!attendance.length) return null;

    const present = attendance.filter(
      (a) => a.status.toLowerCase() === 'present'
    ).length;

    const percentage = Math.round(
      (present / attendance.length) * 100
    );

    const weekStart = startOfWeek(new Date());

    const weekRows = attendance.filter((a) => {
      const d = new Date(a.class_date);

      d.setHours(0, 0, 0, 0);

      return d >= weekStart;
    });

    const weekPresent = weekRows.filter(
      (a) => a.status.toLowerCase() === 'present'
    ).length;

    return {
      percentage,
      weekRows: weekRows.length,
      weekPresent,
    };
  }, [attendance]);

  const todayClasses = useMemo(
    () => todaysClasses(classes, now),
    [classes, now]
  );

  const nextClassIndex = todayClasses.findIndex(
    (slot) => classStatus(slot, now) !== 'completed'
  );

  const pendingAssignments = useMemo(() => {
    const submittedIds = new Set(
      submissions.map((s) => s.assignment_id)
    );

    const current = assignments.filter(
      (a) =>
        a.status !== 'closed' &&
        !submittedIds.has(a.id)
    );

    return [...current]
      .sort((a, b) => {
        const ad = a.due_date
          ? new Date(a.due_date).getTime()
          : Number.MAX_SAFE_INTEGER;

        const bd = b.due_date
          ? new Date(b.due_date).getTime()
          : Number.MAX_SAFE_INTEGER;

        return ad - bd;
      })
      .slice(0, 3);
  }, [assignments, submissions]);

  const performance = useMemo(() => {
    if (!marks.length) return null;

    const totalMax = marks.reduce(
      (sum, m) => sum + Number(m.max_score || 0),
      0
    );

    const totalScore = marks.reduce(
      (sum, m) => sum + Number(m.score || 0),
      0
    );

    const average =
      totalMax > 0
        ? Math.round((totalScore / totalMax) * 100)
        : null;

    const bySubject = new Map<
      number,
      { score: number; max: number }
    >();

    marks.forEach((m) => {
      const current =
        bySubject.get(m.subject_id) ?? {
          score: 0,
          max: 0,
        };

      current.score += Number(m.score || 0);
      current.max += Number(m.max_score || 0);

      bySubject.set(m.subject_id, current);
    });

    let bestSubject: string | null = null;
    let bestPct = -1;

    bySubject.forEach((value, subjectId) => {
      if (value.max <= 0) return;

      const pct = (value.score / value.max) * 100;

      if (pct > bestPct) {
        bestPct = pct;

        bestSubject =
          subjectById(subjects, Number(subjectId))?.name ?? null;
      }
    });

    return {
      average,
      assessments: marks.length,
      bestSubject,
    };
  }, [marks, subjects]);

  if (loading) {
    return <ScreenLoader label="Loading your dashboard…" />;
  }

  return (
    <ScrollView
      style={styles.wrap}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >

      {/* =========================
          WELCOME / APP HEADER
          ========================= */}

      <View style={styles.welcomeHero}>

        <View style={styles.brandRow}>

          <View style={styles.brandIcon}>
            <MaterialCommunityIcons
              name="school-outline"
              size={23}
              color="#111827"
            />
          </View>

          <View style={styles.brandTextWrap}>
            <Text style={styles.appBrandText}>
              EduTracker
            </Text>
          </View>

          <View style={styles.headerActions}>

            <Pressable
              style={styles.iconButton}
              onPress={() =>
                navigation.navigate('Alerts')
              }
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={21}
                color="#14213D"
              />

              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9
                      ? '9+'
                      : unreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              style={styles.avatarButton}
              onPress={() =>
                navigation.navigate('Profile')
              }
            >
              {student &&
              'avatar' in student &&
              typeof student.avatar === 'string' &&
              student.avatar ? (
                <Image
                  source={{ uri: student.avatar }}
                  style={styles.avatar}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {firstName(studentName)
                    .slice(0, 1)
                    .toUpperCase()}
                </Text>
              )}
            </Pressable>

          </View>
        </View>

        <View style={styles.welcomeText}>

          <Text style={styles.eyebrow}>
            GOOD MORNING
          </Text>

          <Text style={styles.greeting}>
            Hello, {firstName(studentName)} 👋
          </Text>

          <Text style={styles.subgreeting}>
            Here’s your academic overview for today.
          </Text>

        </View>
      </View>


      {/* =========================
          ATTENDANCE
          ========================= */}

      <Card style={styles.attendanceCard}>

        <View style={styles.cardTopRow}>

          <View>

            <Text style={styles.cardEyebrow}>
              OVERALL ATTENDANCE
            </Text>

            <Text style={styles.attendanceNumber}>
              {attendanceStats
                ? `${attendanceStats.percentage}%`
                : '—'}
            </Text>

            <Text style={styles.mutedWhite}>
              Across recorded classes
            </Text>

          </View>

          <View style={styles.attendanceRing}>

            <View style={styles.attendanceRingInner}>

              <Text style={styles.ringValue}>
                {attendanceStats
                  ? `${attendanceStats.percentage}`
                  : '—'}
              </Text>

              <Text style={styles.ringLabel}>
                %
              </Text>

            </View>

          </View>

        </View>

        <View style={styles.attendanceBottom}>

          <View>

            <Text style={styles.metricLabelWhite}>
              This Week
            </Text>

            <Text style={styles.metricValueWhite}>
              {attendanceStats
                ? `${attendanceStats.weekPresent} / ${attendanceStats.weekRows}`
                : '—'}{' '}
              classes
            </Text>

          </View>

          <View style={styles.statusPill}>

            <Text style={styles.statusText}>
              {attendanceStats
                ? attendanceStats.percentage >= 75
                  ? '✓ Good'
                  : '⚠ Needs attention'
                : 'No data'}
            </Text>

          </View>

        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${attendanceStats?.percentage ?? 0}%`,
              },
            ]}
          />
        </View>

      </Card>


      {/* =========================
          TODAY'S SCHEDULE
          ========================= */}

      <SectionHeader
        title="Today’s Schedule"
        action="View All"
        onPress={() =>
          navigation.navigate('Timetable')
        }
      />

      <Card style={styles.scheduleCard}>

        {todayClasses.length === 0 ? (
          <EmptyState text="No classes scheduled today." />
        ) : (
          todayClasses
            .slice(0, 3)
            .map((slot, index) => {

              const status = classStatus(
                slot,
                now
              );

              const subject = subjectById(
                subjects,
                slot.subject_id
              );

              const isPriority =
                index === nextClassIndex;

              return (
                <View
                  key={slot.id}
                  style={[
                    styles.classRow,
                    isPriority &&
                      styles.classRowPriority,
                  ]}
                >

                  <View
                    style={[
                      styles.timelineDot,
                      status === 'live'
                        ? styles.liveDot
                        : status === 'completed'
                        ? styles.doneDot
                        : styles.nextDot,
                    ]}
                  />

                  <View style={styles.timeColumn}>

                    <Text style={styles.timeText}>
                      {formatTime(slot.start_time)}
                    </Text>

                    <Text style={styles.endTime}>
                      {formatTime(slot.end_time)}
                    </Text>

                  </View>

                  <View style={styles.classInfo}>

                    <Text style={styles.className}>
                      {subject?.name ?? 'Class'}
                    </Text>

                    <Text style={styles.classMeta}>
                      {subject?.code ?? 'Subject'}
                      {slot.room
                        ? ` • Room ${slot.room}`
                        : ''}
                    </Text>

                  </View>

                  <Text
                    style={[
                      styles.classStatus,
                      status === 'live' &&
                        styles.liveText,
                    ]}
                  >
                    {status === 'live'
                      ? 'Ongoing'
                      : status === 'completed'
                      ? 'Done'
                      : 'Upcoming'}
                  </Text>

                </View>
              );
            })
        )}

        {todayClasses.length > 3 ? (
          <Text style={styles.moreText}>
            +{todayClasses.length - 3} more classes
          </Text>
        ) : null}

      </Card>


      {/* =========================
          QUICK ACTIONS
          ========================= */}

      <SectionHeader
        title="Quick Actions"
        action="More"
        onPress={() =>
          navigation.navigate('Profile')
        }
      />

      <View style={styles.actionsCard}>

        <QuickAction
          icon="calendar-check-outline"
          label="Attendance"
          onPress={() =>
            navigation.navigate('Attendance')
          }
        />

        <QuickAction
          icon="clipboard-text-outline"
          label="Assignments"
          onPress={() =>
            navigation.navigate('Assignments')
          }
        />

        <QuickAction
          icon="calendar-month-outline"
          label="Schedule"
          onPress={() =>
            navigation.navigate('Timetable')
          }
        />

        <QuickAction
          icon="chart-line"
          label="Results"
          onPress={() =>
            navigation.navigate('Marks')
          }
        />

        <QuickAction
          icon="bell-outline"
          label="Alerts"
          onPress={() =>
            navigation.navigate('Alerts')
          }
          badge={unreadCount}
        />

        <QuickAction
          icon="account-outline"
          label="Profile"
          onPress={() =>
            navigation.navigate('Profile')
          }
        />

      </View>


      {/* =========================
          ASSIGNMENTS
          ========================= */}

      <SectionHeader
        title="Assignments"
        action="View All"
        onPress={() =>
          navigation.navigate('Assignments')
        }
      />

      <Card style={styles.listCard}>

        {pendingAssignments.length === 0 ? (

          <View style={styles.successEmpty}>

            <View style={styles.successIcon}>
              <Text style={styles.successCheck}>
                ✓
              </Text>
            </View>

            <View>
              <Text style={styles.successTitle}>
                You’re all caught up!
              </Text>

              <Text style={styles.muted}>
                No pending assignments.
              </Text>
            </View>

          </View>

        ) : (

          pendingAssignments.map(
            (item, index) => {

              const subject = subjectById(
                subjects,
                item.subject_id
              );

              const due = item.due_date
                ? new Date(item.due_date)
                : null;

              const overdue =
                !!due &&
                due.getTime() < Date.now();

              const today =
                !!due &&
                due.toDateString() ===
                  new Date().toDateString();

              return (
                <View
                  key={item.id}
                  style={[
                    styles.assignmentRow,
                    index > 0 &&
                      styles.divider,
                  ]}
                >

                  <View
                    style={[
                      styles.priorityDot,
                      overdue
                        ? styles.dangerBg
                        : today
                        ? styles.warningBg
                        : styles.primaryBg,
                    ]}
                  />

                  <View
                    style={styles.assignmentInfo}
                  >

                    <Text
                      style={styles.rowTitle}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>

                    <Text style={styles.rowSub}>
                      {subject?.name ?? 'Subject'}
                    </Text>

                  </View>

                  <Text
                    style={[
                      styles.dueText,
                      overdue &&
                        styles.dangerText,
                    ]}
                  >
                    {overdue
                      ? 'Overdue'
                      : `Due ${formatDate(
                          item.due_date
                        )}`}
                  </Text>

                </View>
              );
            }
          )
        )}

      </Card>


      {/* =========================
          SUBJECTS
          ========================= */}

      <SectionHeader title="My Subjects" />

      {subjects.length === 0 ? (

        <Card style={styles.listCard}>
          <EmptyState text="No subjects assigned yet." />
        </Card>

      ) : (

        <View style={styles.subjectGrid}>

          {subjects
            .slice(0, 4)
            .map((subject) => {

              const rows =
                attendance.filter(
                  (a) =>
                    a.subject_id ===
                    subject.id
                );

              const present =
                rows.filter(
                  (a) =>
                    a.status.toLowerCase() ===
                    'present'
                ).length;

              const pct = rows.length
                ? Math.round(
                    (present / rows.length) * 100
                  )
                : null;

              return (
                <View
                  key={subject.id}
                  style={styles.subjectCard}
                >

                  <View
                    style={styles.subjectHeader}
                  >

                    <View
                      style={[
                        styles.subjectIcon,
                        {
                          backgroundColor:
                            subject.color
                              ? `${subject.color}18`
                              : '#EEF0FF',
                        },
                      ]}
                    >

                      <Text
                        style={[
                          styles.subjectIconText,
                          {
                            color:
                              subject.color ||
                              colors.primary,
                          },
                        ]}
                      >
                        {subject.code.slice(0, 2)}
                      </Text>

                    </View>

                    <Text
                      style={styles.subjectCode}
                    >
                      {subject.code}
                    </Text>

                  </View>

                  <Text
                    style={styles.subjectName}
                    numberOfLines={2}
                  >
                    {subject.name}
                  </Text>

                  <View
                    style={styles.subjectFooter}
                  >

                    <Text
                      style={styles.subjectMetric}
                    >
                      Attendance
                    </Text>

                    <Text
                      style={styles.subjectPct}
                    >
                      {pct !== null
                        ? `${pct}%`
                        : '—'}
                    </Text>

                  </View>

                  <View
                    style={styles.smallTrack}
                  >
                    <View
                      style={[
                        styles.smallFill,
                        {
                          width: `${pct ?? 0}%`,
                          backgroundColor:
                            subject.color ||
                            colors.primary,
                        },
                      ]}
                    />
                  </View>

                </View>
              );
            })}

        </View>
      )}


      {/* =========================
          PERFORMANCE
          ========================= */}

      <SectionHeader
        title="Academic Performance"
        action={
          marks.length
            ? 'View Results'
            : undefined
        }
        onPress={
          marks.length
            ? () => navigation.navigate('Marks')
            : undefined
        }
      />

      <Card style={styles.performanceCard}>

        {!performance ? (

          <EmptyState text="No marks available yet." />

        ) : (

          <>
            <View
              style={styles.performanceTop}
            >

              <View>

                <Text style={styles.metricLabel}>
                  Overall Average
                </Text>

                <Text
                  style={styles.performanceNumber}
                >
                  {performance.average ?? '—'}
                  {performance.average !== null
                    ? '%'
                    : ''}
                </Text>

              </View>

              <View
                style={styles.assessmentBox}
              >

                <Text
                  style={styles.metricLabel}
                >
                  Assessments
                </Text>

                <Text
                  style={styles.metricValue}
                >
                  {performance.assessments}
                </Text>

              </View>

            </View>

            {performance.bestSubject ? (
              <View style={styles.bestSubject}>

                <Text
                  style={styles.metricLabel}
                >
                  Best Performing Subject
                </Text>

                <Text
                  style={styles.bestSubjectText}
                >
                  🏆 {performance.bestSubject}
                </Text>

              </View>
            ) : null}

          </>
        )}

      </Card>


      {/* =========================
          ANNOUNCEMENTS
          ========================= */}

      <SectionHeader
        title="Recent Announcements"
        action={
          announcements.length
            ? 'View All'
            : undefined
        }
        onPress={
          announcements.length
            ? () => navigation.navigate('Alerts')
            : undefined
        }
      />

      <Card style={styles.listCard}>

        {announcements.length === 0 ? (

          <EmptyState text="No new announcements." />

        ) : (

          announcements
            .slice(0, 3)
            .map((item, index) => (

              <View
                key={item.id}
                style={[
                  styles.noticeRow,
                  index > 0 &&
                    styles.divider,
                ]}
              >

                <View
                  style={styles.noticeIcon}
                >

                  <MaterialCommunityIcons
                    name="bell-outline"
                    size={17}
                    color={colors.primary}
                  />

                </View>

                <View
                  style={styles.noticeInfo}
                >

                  <Text
                    style={styles.rowTitle}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>

                  <Text
                    style={styles.rowSub}
                    numberOfLines={1}
                  >
                    {item.body ||
                      'New announcement'}
                  </Text>

                </View>

                <Text
                  style={styles.timeAgo}
                >
                  {relativeDate(
                    item.created_at
                  )}
                </Text>

              </View>
            ))
        )}

      </Card>


      {/* =========================
          STUDY MATERIALS
          ========================= */}

      <SectionHeader
        title="Recent Study Materials"
      />

      <Card style={styles.listCard}>

        {resources.length === 0 ? (

          <EmptyState text="No study materials available yet." />

        ) : (

          resources
            .slice(0, 3)
            .map((item, index) => {

              const subject =
                subjectById(
                  subjects,
                  item.subject_id
                );

              return (
                <View
                  key={item.id}
                  style={[
                    styles.noticeRow,
                    index > 0 &&
                      styles.divider,
                  ]}
                >

                  <View
                    style={styles.materialIcon}
                  >

                    <MaterialCommunityIcons
                      name="file-document-outline"
                      size={17}
                      color={colors.primary}
                    />

                  </View>

                  <View
                    style={styles.noticeInfo}
                  >

                    <Text
                      style={styles.rowTitle}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={styles.rowSub}
                      numberOfLines={1}
                    >
                      {subject?.name ??
                        item.type}
                    </Text>

                  </View>

                  <Text
                    style={styles.timeAgo}
                  >
                    {relativeDate(
                      item.created_at
                    )}
                  </Text>

                </View>
              );
            })
        )}

      </Card>
   

  <View style={styles.footer}>

    {/* Trust indicators */}
    <View style={styles.footerLine} />

    <View style={styles.trustRow}>
      <View style={styles.trustItem}>
        <MaterialCommunityIcons
          name="shield-check-outline"
          size={15}
          color={colors.primary}
        />
        <Text style={styles.trustText}>
          Secure
        </Text>
      </View>

      <View style={styles.trustDivider} />

      <View style={styles.trustItem}>
        <MaterialCommunityIcons
          name="cloud-check-outline"
          size={15}
          color={colors.primary}
        />
        <Text style={styles.trustText}>
          Connected
        </Text>
      </View>

      <View style={styles.trustDivider} />

      <View style={styles.trustItem}>
        <MaterialCommunityIcons
          name="flash-outline"
          size={15}
          color={colors.primary}
        />
        <Text style={styles.trustText}>
          Fast
        </Text>
      </View>
    </View>

    {/* Brand credit */}
    <Text style={styles.footerCredit}>
      EduTracker • Designed & Crafted with ❤️ by Amit x infynix
    </Text>

  </View>
    </ScrollView>
  );
}


/* =====================================================
   SECTION HEADER
   ===================================================== */

function SectionHeader({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>

      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      {action && onPress ? (
        <Pressable
          onPress={onPress}
          hitSlop={8}
        >
          <Text style={styles.viewAll}>
            {action}
          </Text>
        </Pressable>
      ) : null}

    </View>
  );
}


/* =====================================================
   QUICK ACTION
   ===================================================== */

function QuickAction({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.quickAction,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >

      <View style={styles.quickIcon}>

        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={colors.primary}
        />

        {badge ? (
          <View style={styles.quickBadge}>
            <Text style={styles.quickBadgeText}>
              {badge > 9 ? '9+' : badge}
            </Text>
          </View>
        ) : null}

      </View>

      <Text
        style={styles.quickLabel}
        numberOfLines={1}
      >
        {label}
      </Text>

    </Pressable>
  );
}


/* =====================================================
   STYLES
   ===================================================== */

const styles = StyleSheet.create({

  /*
   * MAIN SCREEN
   * White background exactly like the reference.
   */

  wrap: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  content: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },


  /* =========================
     WELCOME HERO
     ========================= */

  welcomeHero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 41,
    paddingBottom: 24,
    marginBottom: 18,
    overflow: 'hidden',

    borderWidth: 1,
    borderColor: '#E7EAF2',

    shadowColor: '#172554',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#F7D477',
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandTextWrap: {
    flex: 1,
    marginLeft: 10,
  },

  appBrandText: {
    fontSize: 25,
    fontWeight: '900',
    color: '#14213D',
    letterSpacing: -0.5,
  },

  welcomeText: {
    marginTop: 34,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.7,
    color: '#6B7280',
    marginBottom: 5,
  },

  greeting: {
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '900',
    color: '#14213D',
  },

  subgreeting: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
    marginTop: 7,
  },


  /* =========================
     HEADER BUTTONS
     ========================= */

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: '#E4E7EF',

    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#172554',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 2,
  },

  badge: {
    position: 'absolute',
    right: -3,
    top: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,

    backgroundColor: colors.danger,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 4,
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 14,

    backgroundColor: '#EEF0FF',

    alignItems: 'center',
    justifyContent: 'center',

    overflow: 'hidden',

    borderWidth: 1,
    borderColor: '#E0E4F2',
  },

  avatar: {
    width: 42,
    height: 42,
  },

  avatarText: {
    color: '#14213D',
    fontWeight: '800',
    fontSize: 16,
  },


  /* =========================
     ATTENDANCE
     ========================= */

  attendanceCard: {
    backgroundColor: colors.primary,

    borderColor: '#AEB5FF',

    padding: 18,
    borderRadius: 20,

    shadowColor: '#4F46E5',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardEyebrow: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  attendanceNumber: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    marginTop: 3,
  },

  mutedWhite: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
  },

  muted: {
    color: '#7A8497',
    fontSize: 12,
  },

  metricLabelWhite: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    fontWeight: '700',
  },

  metricValueWhite: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },

  attendanceRing: {
    width: 82,
    height: 82,
    borderRadius: 41,

    borderWidth: 7,
    borderColor: 'rgba(255,255,255,0.35)',

    alignItems: 'center',
    justifyContent: 'center',
  },

  attendanceRingInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  ringValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 21,
  },

  ringLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '700',
  },

  attendanceBottom: {
    marginTop: 18,
    paddingTop: 14,

    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  metricLabel: {
    color: '#748096',
    fontSize: 11,
    fontWeight: '700',
  },

  metricValue: {
    color: '#14213D',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,

    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  progressTrack: {
    height: 6,
    borderRadius: 6,

    backgroundColor: 'rgba(255,255,255,0.18)',

    overflow: 'hidden',
    marginTop: 14,
  },

  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },


  /* =========================
     SECTION HEADERS
     ========================= */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginTop: 22,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#14213D',
  },

  viewAll: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },


  /* =========================
     SCHEDULE
     ========================= */

  scheduleCard: {
    paddingVertical: 8,

    backgroundColor: '#FFFFFF',

    borderColor: '#E4E8F0',

    shadowColor: '#14213D',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.05,
    shadowRadius: 9,
    elevation: 2,
  },

  classRow: {
    minHeight: 68,

    flexDirection: 'row',
    alignItems: 'center',

    paddingVertical: 9,
    paddingHorizontal: 4,

    borderRadius: 12,
  },

  classRowPriority: {
    backgroundColor: '#F3F4FF',
    paddingHorizontal: 8,
  },

  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 10,
  },

  liveDot: {
    backgroundColor: colors.success,
  },

  doneDot: {
    backgroundColor: '#CBD2DE',
  },

  nextDot: {
    backgroundColor: '#7C83F5',
  },

  timeColumn: {
    width: 65,
  },

  timeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#14213D',
  },

  endTime: {
    fontSize: 10,
    color: '#8993A5',
    marginTop: 2,
  },

  classInfo: {
    flex: 1,
    paddingRight: 6,
  },

  className: {
    fontSize: 14,
    fontWeight: '800',
    color: '#14213D',
  },

  classMeta: {
    fontSize: 11,
    color: '#7B8699',
    marginTop: 3,
  },

  classStatus: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A94A6',
  },

  liveText: {
    color: '#16A34A',
  },

  moreText: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    paddingBottom: 8,
  },


  /* =========================
     QUICK ACTIONS
     ========================= */

  actionsCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',

    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: '#E3E7EF',

    borderRadius: 18,

    paddingVertical: 10,
    paddingHorizontal: 5,

    shadowColor: '#14213D',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.05,
    shadowRadius: 9,
    elevation: 2,
  },

  quickAction: {
    flex: 1,
    minWidth: 0,

    alignItems: 'center',
    justifyContent: 'center',

    paddingVertical: 7,
    paddingHorizontal: 1,

    borderRadius: 12,
  },

  pressed: {
    opacity: 0.65,
    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,

    backgroundColor: '#EEF0FF',

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 5,
  },

  quickBadge: {
    position: 'absolute',
    right: -5,
    top: -5,

    minWidth: 16,
    height: 16,
    borderRadius: 8,

    backgroundColor: colors.danger,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 3,
  },

  quickBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },

  quickLabel: {
    color: '#14213D',
    fontSize: 9.5,
    fontWeight: '800',
    textAlign: 'center',
  },


  /* =========================
     LIST CARDS
     ========================= */

  listCard: {
    paddingVertical: 8,

    backgroundColor: '#FFFFFF',

    borderColor: '#E4E8F0',

    shadowColor: '#14213D',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.045,
    shadowRadius: 8,
    elevation: 2,
  },

  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',

    minHeight: 60,
    paddingVertical: 9,
  },

  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,

    marginHorizontal: 7,
  },

  dangerBg: {
    backgroundColor: colors.danger,
  },

  warningBg: {
    backgroundColor: '#F59E0B',
  },

  primaryBg: {
    backgroundColor: colors.primary,
  },

  assignmentInfo: {
    flex: 1,
    paddingRight: 8,
  },

  rowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#14213D',
  },

  rowSub: {
    fontSize: 11,
    color: '#7B8699',
    marginTop: 3,
  },

  dueText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7B8699',
  },

  dangerText: {
    color: '#DC2626',
  },

  divider: {
    borderTopWidth: 1,
    borderTopColor: '#EEF0F4',
  },

  successEmpty: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingVertical: 12,
    paddingHorizontal: 6,
  },

  successIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,

    backgroundColor: '#EAF8EF',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },

  successCheck: {
    color: '#16A34A',
    fontWeight: '900',
  },

  successTitle: {
    color: '#14213D',
    fontSize: 13,
    fontWeight: '800',
  },


  /* =========================
     SUBJECTS
     ========================= */

  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  subjectCard: {
    width: '48.2%',

    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: '#E4E8F0',

    borderRadius: 17,

    padding: 13,

    shadowColor: '#14213D',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 2,
  },

  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  subjectIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,

    alignItems: 'center',
    justifyContent: 'center',
  },

  subjectIconText: {
    fontSize: 10,
    fontWeight: '900',
  },

  subjectCode: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8993A5',
  },

  subjectName: {
    fontSize: 13,
    fontWeight: '800',

    color: '#14213D',

    minHeight: 36,
    marginTop: 10,
  },

  subjectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    marginTop: 10,
  },

  subjectMetric: {
    fontSize: 10,
    color: '#8993A5',
  },

  subjectPct: {
    fontSize: 12,
    color: '#14213D',
    fontWeight: '900',
  },

  smallTrack: {
    height: 5,
    borderRadius: 5,

    backgroundColor: '#EEF0F5',

    overflow: 'hidden',
    marginTop: 6,
  },

  smallFill: {
    height: '100%',
    borderRadius: 5,
  },


  /* =========================
     PERFORMANCE
     ========================= */

  performanceCard: {
    padding: 16,

    backgroundColor: '#FFFFFF',

    borderColor: '#E4E8F0',

    shadowColor: '#14213D',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.045,
    shadowRadius: 8,
    elevation: 2,
  },

  performanceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  performanceNumber: {
    fontSize: 30,
    fontWeight: '900',
    color: '#14213D',
    marginTop: 3,
  },

  assessmentBox: {
    minWidth: 105,

    backgroundColor: '#F1F2FF',

    borderRadius: 14,

    padding: 12,
  },

  bestSubject: {
    borderTopWidth: 1,
    borderTopColor: '#EEF0F4',

    marginTop: 14,
    paddingTop: 12,
  },

  bestSubjectText: {
    color: '#14213D',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },


  /* =========================
     ANNOUNCEMENTS / MATERIALS
     ========================= */

  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',

    minHeight: 58,
    paddingVertical: 9,
  },

  noticeIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,

    backgroundColor: '#EEF0FF',

    alignItems: 'center',
    justifyContent: 'center',

    marginHorizontal: 7,
  },

  materialIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,

    backgroundColor: '#F2F4F8',

    alignItems: 'center',
    justifyContent: 'center',

    marginHorizontal: 7,
  },

  noticeInfo: {
    flex: 1,
    paddingRight: 8,
  },

  timeAgo: {
    fontSize: 9,
    color: '#929BAC',
    fontWeight: '700',
  },
    footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },

  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9AA1AF',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

footerLine: {
  width: '100%',
  height: 1,
  backgroundColor: colors.border,
  marginBottom: 16,
},

trustRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},

trustItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
},

trustText: {
  fontSize: 11,
  fontWeight: '600',
  color: colors.subtext,
},

trustDivider: {
  width: 1,
  height: 14,
  backgroundColor: colors.border,
  marginHorizontal: 14,
},

footerCredit: {
  marginTop: 16,
  fontSize: 10,
  fontWeight: '600',
  color: '#9AA1AF',
  textAlign: 'center',
  letterSpacing: 0.2,
},
});