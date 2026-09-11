import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';

import {
  Card,
  ScreenLoader,
  SectionTitle,
  EmptyState,
  colors,
} from '../../components/ui';

import { useStudentData } from '../../lib/useStudentData';
import { subjectById } from '../../lib/useTeacherData';
import { WEEKDAY_LABELS } from '../../lib/timetable';
const screenWidth = Dimensions.get('window').width;

export default function StudentTimetableScreen() {
  const d = useStudentData();

  // Live current time
  const [now, setNow] = useState(new Date());

  // Currently selected date
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateScrollRef = useRef<ScrollView>(null);

  // Update current time every second
useEffect(() => {
  const timer = setInterval(() => {
    setNow(new Date());
  }, 1000);

  return () => clearInterval(timer);
}, []);

  // Date selector:
  // 2 days before today → today → 4 days after today
  const dates = useMemo(() => {
    const result: Date[] = [];

    for (let i = -9; i <= 9; i++) {
      const date = new Date();

      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + i);

      result.push(date);
    }

    return result;
  }, []);

  // Get classes for selected date
  const selectedClasses = useMemo(() => {
    const day = selectedDate.getDay();

    return d.classes
      .filter((c) => c.day_of_week === day)
      .sort((a, b) =>
        (a.start_time ?? '').localeCompare(b.start_time ?? '')
      );
  }, [d.classes, selectedDate]);

  // Keep current time available for upcoming LIVE logic
  const currentTime = now;

  if (d.loading) {
    return <ScreenLoader label="Loading timetable…" />;
  }

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 40,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* =========================
          DATE HEADER
      ========================== */}

      <View style={styles.dateHeader}>
        <View>
          <Text style={styles.monthTitle}>
            {selectedDate.toLocaleDateString('en-US', {
              month: 'long',
            })}
          </Text>

          <Text style={styles.scheduleSubtitle}>
            Your class schedule
          </Text>
        </View>
      </View>

      {/* =========================
          DATE SELECTOR
      ========================== */}

<ScrollView
  ref={dateScrollRef}
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.dateStrip}
onContentSizeChange={() => {
  setTimeout(() => {
    const itemWidth = 70;
    const gap = 8;

    const todayPosition = 9 * (itemWidth + gap);

    const centerOffset =
      (screenWidth - itemWidth) / 2;

    dateScrollRef.current?.scrollTo({
      x: Math.max(
        0,
        todayPosition - centerOffset
      ),
      animated: false,
    });
  }, 100);
}}
>
        {dates.map((date) => {
          const selected =
            date.toDateString() === selectedDate.toDateString();

          const isToday =
            date.toDateString() === new Date().toDateString();

          return (
            <Pressable
              key={date.toISOString()}
              onPress={() => setSelectedDate(date)}
              style={[
                styles.dateItem,
                selected && styles.dateItemSelected,
              ]}
            >
              <Text
                style={[
                  styles.dateDay,
                  selected && styles.dateTextSelected,
                ]}
              >
                {isToday
                  ? 'Today'
                  : date.toLocaleDateString('en-US', {
                      weekday: 'short',
                    })}
              </Text>

              <Text
                style={[
                  styles.dateNumber,
                  selected && styles.dateTextSelected,
                ]}
              >
                {date.getDate()}
              </Text>

              <Text
                style={[
                  styles.dateMonth,
                  selected && styles.dateTextSelected,
                ]}
              >
                {date.toLocaleDateString('en-US', {
                  month: 'short',
                })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* =========================
          SELECTED DAY CLASSES
      ========================== */}

      <Card style={{ marginTop: 12 }}>
        <SectionTitle>
          {selectedClasses.length}{' '}
          {selectedClasses.length === 1 ? 'class' : 'classes'}
        </SectionTitle>

        {selectedClasses.length === 0 ? (
          <EmptyState text="No classes scheduled for this day." />
        ) : (
          <View style={styles.classList}>
            {selectedClasses.map((c) => {
              const subj = subjectById(
                d.subjects,
                c.subject_id
              );

              return (
                <View key={c.id} style={styles.classRow}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.classStart}>
                      {c.start_time ?? '--:--'}
                    </Text>

                    <Text style={styles.classEnd}>
                      {c.end_time ?? '--:--'}
                    </Text>
                  </View>

                  <View style={styles.timelineLine}>
                    <View style={styles.timelineDot} />
                  </View>

                  <View style={styles.classContent}>
                    <Text style={styles.classTitle}>
                      {subj?.name ?? 'Class'}
                    </Text>

                    <Text style={styles.classSub}>
                      {c.start_time ?? '--:--'} –{' '}
                      {c.end_time ?? '--:--'}
                    </Text>

                    <Text style={styles.classRoom}>
                      Room {c.room ?? 'TBD'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* =========================
          FULL WEEKLY SCHEDULE
      ========================== */}

      <Card style={{ marginTop: 16 }}>
        <SectionTitle>Full Weekly Schedule</SectionTitle>

        {d.classes.length === 0 ? (
          <EmptyState
            text="No timetable entries yet — your institution hasn't scheduled classes."
          />
        ) : (
          WEEKDAY_LABELS.map((label, dow) => {
            const dayClasses = d.classes
              .filter((c) => c.day_of_week === dow)
              .sort((a, b) =>
                (a.start_time ?? '').localeCompare(
                  b.start_time ?? ''
                )
              );

            if (dayClasses.length === 0) {
              return null;
            }

            return (
              <View
                key={label}
                style={styles.weekDaySection}
              >
                <Text style={styles.dayLabel}>
                  {label}
                </Text>

                {dayClasses.map((c) => {
                  const subj = subjectById(
                    d.subjects,
                    c.subject_id
                  );

                  return (
                    <View
                      key={c.id}
                      style={styles.weekRow}
                    >
                      <Text style={styles.weekTime}>
                        {c.start_time}
                      </Text>

                      <Text style={styles.weekSubj}>
                        {subj?.code ?? 'Subject'} ·{' '}
                        {c.room ?? 'TBD'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Main screen
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Date header
  dateHeader: {
    marginBottom: 4,
  },

  monthTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },

  scheduleSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: 2,
  },

  // Date selector
  dateStrip: {
    gap: 8,
    paddingVertical: 10,
    paddingRight: 16,
  },

  dateItem: {
    width: 70,
    minHeight: 78,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  dateItemSelected: {
    backgroundColor: colors.primary,
  },

  dateDay: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
  },

  dateNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },

  dateMonth: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 1,
  },

  dateTextSelected: {
    color: '#FFFFFF',
  },

  // Selected-day classes
  classList: {
    gap: 12,
  },

  classRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 76,
  },

  timeColumn: {
    width: 58,
    alignItems: 'flex-end',
    paddingTop: 2,
  },

  classStart: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },

  classEnd: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 4,
  },

  timelineLine: {
    width: 22,
    alignItems: 'center',
    position: 'relative',
  },

  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 5,
  },

  classContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginLeft: 4,
  },

  classTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },

  classSub: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 4,
  },

  classRoom: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 4,
  },

  // Weekly schedule
  weekDaySection: {
    marginTop: 12,
  },

  dayLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },

  weekRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },

  weekTime: {
    fontSize: 12,
    color: colors.subtext,
    width: 60,
  },

  weekSubj: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
});