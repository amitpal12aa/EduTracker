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

import {
  useTeacherData,
  subjectById,
} from '../../lib/useTeacherData';

import {
  classStatus,
  WEEKDAY_LABELS,
} from '../../lib/timetable';

const screenWidth = Dimensions.get('window').width;

export default function TeacherTimetableScreen() {
  const d = useTeacherData();

  // =========================================
  // LIVE CURRENT TIME
  // =========================================

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // =========================================
  // SELECTED DATE
  // =========================================

  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateScrollRef = useRef<ScrollView>(null);

  // =========================================
  // DATE SELECTOR
  // 9 DAYS BEFORE + TODAY + 9 DAYS AFTER
  // =========================================

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

  // =========================================
  // TEACHER CLASSES ONLY
  // =========================================

  const myClasses = useMemo(() => {
    if (!d.teacher?.id) {
      return [];
    }

    return d.classes.filter(
      (c) => c.teacher_id === d.teacher?.id
    );
  }, [d.classes, d.teacher?.id]);

  // =========================================
  // SELECTED DAY CLASSES
  // =========================================

  const selectedClasses = useMemo(() => {
    const day = selectedDate.getDay();

    return myClasses
      .filter((c) => c.day_of_week === day)
      .sort((a, b) =>
        (a.start_time ?? '').localeCompare(
          b.start_time ?? ''
        )
      );
  }, [myClasses, selectedDate]);

  // =========================================
  // TODAY CHECK
  // =========================================

  const isSelectedToday =
    selectedDate.toDateString() === now.toDateString();

  // =========================================
  // CENTER TODAY IN DATE SELECTOR
  // =========================================

  useEffect(() => {
    if (!dateScrollRef.current) {
      return;
    }

    const itemWidth = 70;
    const gap = 8;

    const todayPosition =
      9 * (itemWidth + gap);

    const centerOffset =
      (screenWidth - itemWidth) / 2;

    setTimeout(() => {
      dateScrollRef.current?.scrollTo({
        x: Math.max(
          0,
          todayPosition - centerOffset
        ),
        animated: false,
      });
    }, 150);
  }, []);

  // =========================================
  // LOADING
  // =========================================

  if (d.loading) {
    return (
      <ScreenLoader label="Loading timetable…" />
    );
  }

  // =========================================
  // RENDER
  // =========================================

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 40,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* =====================================
          DATE HEADER
      ====================================== */}

      <View style={styles.dateHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.monthTitle}>
            {selectedDate.toLocaleDateString(
              'en-US',
              {
                month: 'long',
              }
            )}
          </Text>

          <Text style={styles.scheduleSubtitle}>
            Your teaching schedule
          </Text>
        </View>

        {isSelectedToday && (
          <View style={styles.todayBadge}>
            <View style={styles.todayDot} />

            <Text style={styles.todayBadgeText}>
              TODAY
            </Text>
          </View>
        )}
      </View>

      {/* =====================================
          DATE SELECTOR
      ====================================== */}

      <ScrollView
        ref={dateScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={
          styles.dateStrip
        }
        onContentSizeChange={() => {
          const itemWidth = 70;
          const gap = 8;

          const todayPosition =
            9 * (itemWidth + gap);

          const centerOffset =
            (screenWidth - itemWidth) / 2;

          setTimeout(() => {
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
            date.toDateString() ===
            selectedDate.toDateString();

          const isToday =
            date.toDateString() ===
            now.toDateString();

          return (
            <Pressable
              key={date.toISOString()}
              onPress={() =>
                setSelectedDate(date)
              }
              style={[
                styles.dateItem,
                selected &&
                  styles.dateItemSelected,
              ]}
            >
              <Text
                style={[
                  styles.dateDay,
                  selected &&
                    styles.dateTextSelected,
                ]}
              >
                {isToday
                  ? 'Today'
                  : date.toLocaleDateString(
                      'en-US',
                      {
                        weekday: 'short',
                      }
                    )}
              </Text>

              <Text
                style={[
                  styles.dateNumber,
                  selected &&
                    styles.dateTextSelected,
                ]}
              >
                {date.getDate()}
              </Text>

              <Text
                style={[
                  styles.dateMonth,
                  selected &&
                    styles.dateTextSelected,
                ]}
              >
                {date.toLocaleDateString(
                  'en-US',
                  {
                    month: 'short',
                  }
                )}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* =====================================
          SELECTED DAY CLASSES
      ====================================== */}

      <Card style={{ marginTop: 12 }}>
        <View style={styles.sectionHeader}>
          <SectionTitle>
            {selectedClasses.length}{' '}
            {selectedClasses.length === 1
              ? 'class'
              : 'classes'}
          </SectionTitle>

          {isSelectedToday &&
            selectedClasses.some(
              (c) =>
                classStatus(c, now) === 'live'
            ) && (
              <View style={styles.liveHeaderBadge}>
                <View
                  style={styles.liveHeaderDot}
                />

                <Text
                  style={styles.liveHeaderText}
                >
                  LIVE
                </Text>
              </View>
            )}
        </View>

        {selectedClasses.length === 0 ? (
          <EmptyState
            text={
              isSelectedToday
                ? 'No classes scheduled for you today.'
                : 'No classes scheduled for this day.'
            }
          />
        ) : (
          <View style={styles.classList}>
            {selectedClasses.map((c) => {
              const status = classStatus(
                c,
                now
              );

              const subj = subjectById(
                d.subjects,
                c.subject_id
              );

              const isLive =
                status === 'live';

              const isCompleted =
                status === 'completed';

              const isUpcoming =
                status === 'upcoming';

              return (
                <View
                  key={c.id}
                  style={[
                    styles.classRow,
                    isLive &&
                      styles.classRowLive,
                  ]}
                >
                  {/* TIME */}

                  <View style={styles.timeColumn}>
                    <Text
                      style={[
                        styles.classStart,
                        isLive &&
                          styles.liveText,
                      ]}
                    >
                      {c.start_time ??
                        '--:--'}
                    </Text>

                    <Text style={styles.classEnd}>
                      {c.end_time ?? '--:--'}
                    </Text>
                  </View>

                  {/* TIMELINE */}

                  <View
                    style={styles.timelineLine}
                  >
                    <View
                      style={[
                        styles.timelineDot,
                        isLive &&
                          styles.timelineDotLive,
                        isCompleted &&
                          styles.timelineDotCompleted,
                      ]}
                    />
                  </View>

                  {/* CLASS CONTENT */}

                  <View
                    style={[
                      styles.classContent,
                      isLive &&
                        styles.classContentLive,
                    ]}
                  >
                    <View
                      style={
                        styles.classTopRow
                      }
                    >
                      <View
                        style={
                          styles.classTitleWrap
                        }
                      >
                        <Text
                          style={[
                            styles.classTitle,
                            isLive &&
                              styles.liveText,
                          ]}
                          numberOfLines={1}
                        >
                          {subj?.name ??
                            'Class'}
                        </Text>
                      </View>

                      {/* STATUS */}

                      <View
                        style={[
                          styles.statusBadge,
                          isLive &&
                            styles.statusBadgeLive,
                          isCompleted &&
                            styles.statusBadgeCompleted,
                        ]}
                      >
                        {isLive && (
                          <View
                            style={
                              styles.statusDot
                            }
                          />
                        )}

                        <Text
                          style={[
                            styles.statusText,
                            isLive &&
                              styles.statusTextLive,
                            isCompleted &&
                              styles.statusTextCompleted,
                          ]}
                        >
                          {isLive
                            ? 'LIVE NOW'
                            : isCompleted
                            ? 'COMPLETED'
                            : isUpcoming
                            ? 'UPCOMING'
                            : 'UPCOMING'}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={styles.classSub}
                    >
                      {c.start_time ??
                        '--:--'}{' '}
                      –{' '}
                      {c.end_time ??
                        '--:--'}
                    </Text>

                    <Text
                      style={styles.classRoom}
                    >
                      Room {c.room ?? 'TBD'}
                    </Text>

                    {/* =================================
                        LIVE ATTENDANCE INDICATOR
                    ================================== */}

                    {isLive && (
                      <View
                        style={
                          styles.attendanceLiveBox
                        }
                      >
                        <View
                          style={
                            styles.attendanceLiveLeft
                          }
                        >
                          <View
                            style={
                              styles.attendanceIconCircle
                            }
                          >
                            <Text
                              style={
                                styles.attendanceIcon
                              }
                            >
                              ●
                            </Text>
                          </View>

                          <View>
                            <Text
                              style={
                                styles.attendanceLiveTitle
                              }
                            >
                              LIVE CLASS
                            </Text>

                            <Text
                              style={
                                styles.attendanceLiveSub
                              }
                            >
                              Attendance is live
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.livePulse
                          }
                        >
                          <View
                            style={
                              styles.livePulseDot
                            }
                          />
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* =====================================
          FULL WEEKLY SCHEDULE
      ====================================== */}

      <Card style={{ marginTop: 16 }}>
        <SectionTitle>
          Full Weekly Schedule
        </SectionTitle>

        {myClasses.length === 0 ? (
          <EmptyState
            text="No timetable entries assigned to you yet."
          />
        ) : (
          WEEKDAY_LABELS.map(
            (label, dow) => {
              const dayClasses = myClasses
                .filter(
                  (c) =>
                    c.day_of_week === dow
                )
                .sort((a, b) =>
                  (
                    a.start_time ?? ''
                  ).localeCompare(
                    b.start_time ?? ''
                  )
                );

              if (
                dayClasses.length === 0
              ) {
                return null;
              }

              return (
                <View
                  key={label}
                  style={
                    styles.weekDaySection
                  }
                >
                  <Text
                    style={styles.dayLabel}
                  >
                    {label}
                  </Text>

                  {dayClasses.map((c) => {
                    const subj =
                      subjectById(
                        d.subjects,
                        c.subject_id
                      );

                    const isToday =
                      dow ===
                        now.getDay() &&
                      selectedDate.toDateString() ===
                        now.toDateString();

                    const status =
                      isToday
                        ? classStatus(
                            c,
                            now
                          )
                        : 'upcoming';

                    return (
                      <View
                        key={c.id}
                        style={[
                          styles.weekRow,
                          status === 'live' &&
                            styles.weekRowLive,
                        ]}
                      >
                        <View
                          style={
                            styles.weekTimeColumn
                          }
                        >
                          <Text
                            style={[
                              styles.weekTime,
                              status ===
                                'live' &&
                                styles.liveText,
                            ]}
                          >
                            {c.start_time ??
                              '--:--'}
                          </Text>

                          <Text
                            style={
                              styles.weekEndTime
                            }
                          >
                            {c.end_time ??
                              '--:--'}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.weekDivider
                          }
                        />

                        <View
                          style={
                            styles.weekClassInfo
                          }
                        >
                          <Text
                            style={[
                              styles.weekSubj,
                              status ===
                                'live' &&
                                styles.liveText,
                            ]}
                            numberOfLines={1}
                          >
                            {subj?.code ??
                              'Subject'}
                          </Text>

                          <Text
                            style={
                              styles.weekRoom
                            }
                          >
                            Room{' '}
                            {c.room ?? 'TBD'}
                          </Text>
                        </View>

                        {status ===
                          'live' && (
                          <View
                            style={
                              styles.weekLiveBadge
                            }
                          >
                            <View
                              style={
                                styles.weekLiveDot
                              }
                            />

                            <Text
                              style={
                                styles.weekLiveText
                              }
                            >
                              LIVE
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            }
          )
        )}
      </Card>

      {/* =====================================
          FOOTER
      ====================================== */}

      <View style={styles.footer}>
        <View style={styles.footerLine} />

        <View style={styles.footerTrustRow}>
          <View style={styles.footerTrustItem}>
            <Text
              style={styles.footerTrustIcon}
            >
              ✓
            </Text>

            <Text
              style={styles.footerTrustText}
            >
              Secure
            </Text>
          </View>

          <View
            style={styles.footerDivider}
          />

          <View style={styles.footerTrustItem}>
            <Text
              style={styles.footerTrustIcon}
            >
              ✓
            </Text>

            <Text
              style={styles.footerTrustText}
            >
              Connected
            </Text>
          </View>

          <View
            style={styles.footerDivider}
          />

          <View style={styles.footerTrustItem}>
            <Text
              style={styles.footerTrustIcon}
            >
              ⚡
            </Text>

            <Text
              style={styles.footerTrustText}
            >
              Live
            </Text>
          </View>
        </View>

        <Text style={styles.footerCredit}>
          EduTracker • Designed & Crafted with ❤️
          by Amit
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // =========================================
  // MAIN
  // =========================================

  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // =========================================
  // DATE HEADER
  // =========================================

  dateHeader: {
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerLeft: {
    flex: 1,
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

  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#EEF6FF',
    borderWidth: 1,
    borderColor: '#D8E9FF',
  },

  todayDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 5,
  },

  todayBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },

  // =========================================
  // DATE SELECTOR
  // =========================================

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

  // =========================================
  // SECTION HEADER
  // =========================================

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  liveHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#FFF1F1',
  },

  liveHeaderDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 5,
  },

  liveHeaderText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.5,
  },

  // =========================================
  // CLASS LIST
  // =========================================

  classList: {
    gap: 12,
  },

  classRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 90,
  },

  classRowLive: {
    minHeight: 132,
  },

  // =========================================
  // TIME
  // =========================================

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

  liveText: {
    color: colors.primary,
  },

  // =========================================
  // TIMELINE
  // =========================================

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

  timelineDotLive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    marginTop: 4,
  },

  timelineDotCompleted: {
    backgroundColor: '#94A3B8',
  },

  // =========================================
  // CLASS CONTENT
  // =========================================

  classContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginLeft: 4,
  },

  classContentLive: {
    backgroundColor: '#FFF8F8',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  classTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  classTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },

  classTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },

  classSub: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 5,
  },

  classRoom: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 4,
  },

  // =========================================
  // STATUS
  // =========================================

  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#EEF2F7',
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusBadgeLive: {
    backgroundColor: '#FEE2E2',
  },

  statusBadgeCompleted: {
    backgroundColor: '#F1F5F9',
  },

  statusText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.subtext,
    letterSpacing: 0.3,
  },

  statusTextLive: {
    color: '#EF4444',
  },

  statusTextCompleted: {
    color: '#64748B',
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 4,
  },

  // =========================================
  // LIVE ATTENDANCE BOX
  // =========================================

  attendanceLiveBox: {
    marginTop: 10,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  attendanceLiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  attendanceIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  attendanceIcon: {
    fontSize: 9,
    color: '#EF4444',
  },

  attendanceLiveTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.4,
  },

  attendanceLiveSub: {
    fontSize: 9,
    color: '#991B1B',
    marginTop: 1,
    fontWeight: '600',
  },

  livePulse: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },

  // =========================================
  // WEEKLY SCHEDULE
  // =========================================

  weekDaySection: {
    marginTop: 12,
  },

  dayLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 7,
  },

  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: 7,
    borderRadius: 10,
  },

  weekRowLive: {
    backgroundColor: '#FFF8F8',
    paddingHorizontal: 7,
  },

  weekTimeColumn: {
    width: 60,
  },

  weekTime: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '700',
  },

  weekEndTime: {
    fontSize: 9,
    color: '#A0A7B4',
    marginTop: 2,
  },

  weekDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
    marginRight: 10,
  },

  weekClassInfo: {
    flex: 1,
  },

  weekSubj: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },

  weekRoom: {
    fontSize: 10,
    color: colors.subtext,
    marginTop: 2,
  },

  weekLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
  },

  weekLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 4,
  },

  weekLiveText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#EF4444',
  },

  // =========================================
  // FOOTER
  // =========================================

  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },

  footerLine: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },

  footerTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerTrustItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  footerTrustIcon: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
    marginRight: 4,
  },

  footerTrustText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.subtext,
  },

  footerDivider: {
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