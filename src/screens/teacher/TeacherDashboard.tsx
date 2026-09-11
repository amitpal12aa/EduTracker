import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { TeacherTabParamList } from '../../navigation/RootNavigator';

import {
  EmptyState,
  ScreenLoader,
  colors,
} from '../../components/ui';

import {
  useTeacherData,
  subjectById,
} from '../../lib/useTeacherData';

/* =========================================================
   ANIMATED SECTION
========================================================= */

function AnimatedSection({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(25)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.spring(translateY, {
        toValue: 0,
        delay,
        friction: 8,
        tension: 55,
        useNativeDriver: true,
      }),

      Animated.spring(scale, {
        toValue: 1,
        delay,
        friction: 8,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, scale, translateY]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [
            { perspective: 1000 },
            { translateY },
            { scale },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* =========================================================
   FLOATING BACKGROUND
========================================================= */

function FloatingShape({
  size,
  top,
  left,
  right,
  duration,
  delay,
}: {
  size: number;
  top: number;
  left?: number;
  right?: number;
  duration: number;
  delay: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),

        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -18,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),

          Animated.timing(translateX, {
            toValue: 10,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),

        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),

          Animated.timing(translateX, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: duration * 2,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [delay, duration, rotate, translateX, translateY]);

  const rotateValue = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.floatingShape,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          left,
          right,
          transform: [
            { translateY },
            { translateX },
            { rotate: rotateValue },
          ],
        },
      ]}
    />
  );
}

function FloatingBackground() {
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <FloatingShape
        size={115}
        top={135}
        right={-50}
        duration={3000}
        delay={100}
      />

      <FloatingShape
        size={82}
        top={510}
        left={-42}
        duration={3500}
        delay={350}
      />

      <FloatingShape
        size={60}
        top={830}
        right={-15}
        duration={2800}
        delay={600}
      />

      <View style={styles.softGlowOne} />
      <View style={styles.softGlowTwo} />
    </View>
  );
}

/* =========================================================
   COUNT UP NUMBER
========================================================= */

function CountUpNumber({
  value,
  delay = 0,
}: {
  value: number;
  delay?: number;
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const listener = animatedValue.addListener(
      ({ value: currentValue }) => {
        setDisplayValue(Math.round(currentValue));
      },
    );

    Animated.timing(animatedValue, {
      toValue: value,
      duration: 1000,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [animatedValue, delay, value]);

  return (
    <Text style={styles.statValue}>
      {displayValue}
    </Text>
  );
}

/* =========================================================
   PREMIUM STAT CARD
========================================================= */

function PremiumStatCard({
  icon,
  label,
  value,
  delay,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: number;
  delay: number;
  onPress?: () => void;
}) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        delay,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),

      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, scale]);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.96,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 7,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
    >
      <Animated.View
        style={[
          styles.statCard,
          {
            opacity,
            transform: [
              { perspective: 900 },
              { scale },
              { scale: pressScale },
            ],
          },
        ]}
      >
        <View style={styles.statIconBox}>
          <MaterialCommunityIcons
            name={icon}
            size={24}
            color={colors.primary}
          />
        </View>

        <CountUpNumber
          value={value}
          delay={delay + 100}
        />

        <Text style={styles.statLabel}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/* =========================================================
   3D PRESSABLE
========================================================= */

function DepthPressable({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.985,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }),

      Animated.timing(translateY, {
        toValue: 2,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),

      Animated.spring(translateY, {
        toValue: 0,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [
              { perspective: 1000 },
              { scale },
              { translateY },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/* =========================================================
   MAIN TEACHER DASHBOARD
========================================================= */

export default function TeacherDashboard() {
  const navigation =
    useNavigation<BottomTabNavigationProp<TeacherTabParamList>>();

  const {
    loading,
    teacher,
    subjects,
    students,
    assignments,
    leaves,
    notifications,
  } = useTeacherData();

  const pendingLeaves = useMemo(
    () =>
      leaves.filter(
        (l) => l.status === 'pending',
      ),
    [leaves],
  );

  const recentAssignments = assignments.slice(0, 5);

  const unreadCount = notifications.filter(
    (n) => n.unread,
  ).length;

  if (loading) {
    return (
      <ScreenLoader label="Loading your classes…" />
    );
  }

  return (
    <View style={styles.screen}>
      <FloatingBackground />

      <ScrollView
        style={styles.wrap}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* =================================================
            APP HEADER
        ================================================= */}

        <AnimatedSection delay={0}>
          <View style={styles.appHeader}>
            <View style={styles.brandArea}>
              <View style={styles.brandIcon}>
                <MaterialCommunityIcons
                  name="school-outline"
                  size={27}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.brandText}>
                EduTracker
              </Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                style={styles.bellButton}
                onPress={() =>
                  navigation.navigate('Alerts')
                }
                android_ripple={{
                  color: '#E8EAFF',
                }}
              >
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={24}
                  color="#18233D"
                />

                {unreadCount > 0 && (
                  <View
                    style={styles.headerNotificationDot}
                  />
                )}
              </Pressable>

              <Pressable
                style={styles.avatarButton}
                onPress={() =>
                  navigation.navigate('Profile')
                }
                android_ripple={{
                  color: '#E8EAFF',
                }}
              >
                <Text style={styles.avatarLetter}>
                  {teacher?.name
                    ?.charAt(0)
                    ?.toUpperCase() ?? 'T'}
                </Text>
              </Pressable>
            </View>
          </View>
        </AnimatedSection>

        {/* =================================================
            TEACHER HERO
        ================================================= */}

        <AnimatedSection delay={100}>
          <DepthPressable
            style={styles.heroCard}
            onPress={() =>
              navigation.navigate('Classes')
            }
          >
            <View style={styles.heroCircleLarge} />
            <View style={styles.heroCircleSmall} />

            <View style={styles.heroTop}>
              <View style={styles.heroTextArea}>
                <View style={styles.portalBadge}>
                  <MaterialCommunityIcons
                    name="school-outline"
                    size={15}
                    color={colors.primary}
                  />

                  <Text style={styles.portalBadgeText}>
                    TEACHER PORTAL
                  </Text>
                </View>

                <Text style={styles.heroWelcome}>
                  Welcome back,
                </Text>

                <Text style={styles.heroName}>
                  {teacher?.name?.split(' ')[0] ??
                    'Teacher'}
                  <Text style={styles.heroWave}>
                    {' '}👋
                  </Text>
                </Text>

                <Text style={styles.heroSubtext}>
                  {teacher?.department ??
                    'Faculty'}{' '}
                  • Ready to manage your classroom
                </Text>
              </View>

              <View style={styles.teacherHeroIcon}>
                <MaterialCommunityIcons
                  name="account-tie-outline"
                  size={35}
                  color={colors.primary}
                />

                <View style={styles.heroOnlineDot} />
              </View>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroBottom}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroOverviewLabel}>
                  TODAY'S OVERVIEW
                </Text>

                <Text style={styles.heroOverviewText}>
                  Keep your classes on track
                </Text>
              </View>

              <View style={styles.heroArrow}>
                <MaterialCommunityIcons
                  name="arrow-top-right"
                  size={23}
                  color={colors.primary}
                />
              </View>
            </View>
          </DepthPressable>
        </AnimatedSection>

        {/* =================================================
            PERFORMANCE HEADER
        ================================================= */}

        <AnimatedSection delay={190}>
          <View style={styles.performanceHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                PERFORMANCE
              </Text>

              <Text style={styles.sectionTitle}>
                Your classroom
              </Text>
            </View>

            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />

              <Text style={styles.liveText}>
                LIVE
              </Text>
            </View>
          </View>
        </AnimatedSection>

        {/* =================================================
            STATS
        ================================================= */}

        <View style={styles.statsRow}>
          <PremiumStatCard
            icon="account-group-outline"
            label="Students"
            value={students.length}
            delay={260}
            onPress={() =>
              navigation.navigate('Classes')
            }
          />

          <PremiumStatCard
            icon="book-open-page-variant-outline"
            label="Subjects"
            value={subjects.length}
            delay={340}
            onPress={() =>
              navigation.navigate('Timetable')
            }
          />

          <PremiumStatCard
            icon="calendar-clock-outline"
            label="Pending Leaves"
            value={pendingLeaves.length}
            delay={420}
            onPress={() =>
              navigation.navigate('Alerts')
            }
          />
        </View>

        {/* =================================================
            CLASSROOM INSIGHT
        ================================================= */}

        <AnimatedSection delay={500}>
          <DepthPressable
            style={styles.insightCard}
            onPress={() =>
              navigation.navigate('Alerts')
            }
          >
            <View style={styles.insightIcon}>
              <MaterialCommunityIcons
                name="lightbulb-on-outline"
                size={25}
                color={colors.primary}
              />
            </View>

            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>
                Classroom insight
              </Text>

              <Text style={styles.insightText}>
                {pendingLeaves.length > 0
                  ? `${pendingLeaves.length} leave request${
                      pendingLeaves.length === 1
                        ? ''
                        : 's'
                    } need your review.`
                  : 'Everything is clear. No leave requests are waiting.'}
              </Text>
            </View>

            <MaterialCommunityIcons
              name="chevron-right"
              size={25}
              color="#72809F"
            />
          </DepthPressable>
        </AnimatedSection>

        {/* =================================================
            RECENT ASSIGNMENTS
        ================================================= */}

        <AnimatedSection delay={590}>
          <DepthPressable
            style={styles.mainCard}
            onPress={() =>
              navigation.navigate('Grading')
            }
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardEyebrow}>
                  CONTENT
                </Text>

                <Text style={styles.cardTitle}>
                  Recent Assignments
                </Text>
              </View>

              <View style={styles.cardIconBox}>
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={25}
                  color={colors.primary}
                />
              </View>
            </View>

            {recentAssignments.length === 0 ? (
              <View style={styles.emptyAssignment}>
                <EmptyState
                  text="No assignments posted yet."
                />
              </View>
            ) : (
              <FlatList
                data={recentAssignments}
                keyExtractor={(item) => String(item.id)}
                scrollEnabled={false}
                ItemSeparatorComponent={() => (
                  <View style={styles.separator} />
                )}
                renderItem={({ item }) => {
                  const subj = subjectById(
                    subjects,
                    item.subject_id,
                  );

                  return (
                    <Pressable
                      style={styles.assignmentRow}
                      onPress={() =>
                        navigation.navigate('Grading')
                      }
                      android_ripple={{
                        color: '#F0F1FF',
                      }}
                    >
                      <View style={styles.assignmentIcon}>
                        <MaterialCommunityIcons
                          name="file-document-outline"
                          size={18}
                          color={colors.primary}
                        />
                      </View>

                      <View style={styles.assignmentMain}>
                        <Text
                          style={styles.assignmentTitle}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>

                        <Text
                          style={
                            styles.assignmentSubject
                          }
                        >
                          {subj?.name ?? 'Subject'}
                        </Text>
                      </View>

                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={21}
                        color="#7B88A5"
                      />
                    </Pressable>
                  );
                }}
              />
            )}
          </DepthPressable>
        </AnimatedSection>

        {/* =================================================
            LEAVE REQUESTS
        ================================================= */}

        <AnimatedSection delay={680}>
          <DepthPressable
            style={styles.mainCard}
            onPress={() =>
              navigation.navigate('Alerts')
            }
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardEyebrow}>
                  ATTENTION
                </Text>

                <Text style={styles.cardTitle}>
                  Leave Requests
                </Text>
              </View>

              <View style={styles.cardIconBox}>
                <MaterialCommunityIcons
                  name="calendar-clock-outline"
                  size={25}
                  color={
                    pendingLeaves.length > 0
                      ? '#D88B18'
                      : colors.primary
                  }
                />
              </View>
            </View>

            {pendingLeaves.length === 0 ? (
              <View style={styles.clearState}>
                <View style={styles.clearIcon}>
                  <MaterialCommunityIcons
                    name="check"
                    size={21}
                    color="#059669"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.clearTitle}>
                    All caught up
                  </Text>

                  <Text style={styles.clearText}>
                    Nothing is pending for your review.
                  </Text>
                </View>
              </View>
            ) : (
              <FlatList
                data={pendingLeaves.slice(0, 5)}
                keyExtractor={(item) => String(item.id)}
                scrollEnabled={false}
                ItemSeparatorComponent={() => (
                  <View style={styles.separator} />
                )}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.leaveRow}
                    onPress={() =>
                      navigation.navigate('Alerts')
                    }
                    android_ripple={{
                      color: '#FFF5DD',
                    }}
                  >
                    <View style={styles.leaveIcon}>
                      <MaterialCommunityIcons
                        name="account-clock-outline"
                        size={19}
                        color="#D88B18"
                      />
                    </View>

                    <View style={styles.assignmentMain}>
                      <Text
                        style={styles.assignmentTitle}
                        numberOfLines={2}
                      >
                        {item.reason ??
                          'Leave request'}
                      </Text>

                      <Text style={styles.pendingText}>
                        Awaiting review
                      </Text>
                    </View>

                    <View style={styles.pendingDot} />
                  </Pressable>
                )}
              />
            )}
          </DepthPressable>
        </AnimatedSection>

        {/* =================================================
            NOTIFICATIONS
        ================================================= */}

        <AnimatedSection delay={760}>
          <DepthPressable
            style={styles.notificationCard}
            onPress={() =>
              navigation.navigate('Alerts')
            }
          >
            <View style={styles.notificationIcon}>
              <MaterialCommunityIcons
                name="bell-ring-outline"
                size={24}
                color={colors.primary}
              />

              {unreadCount > 0 && (
                <View
                  style={styles.notificationBadge}
                />
              )}
            </View>

            <View style={styles.notificationMain}>
              <Text style={styles.notificationTitle}>
                Notifications
              </Text>

              <Text style={styles.notificationText}>
                {unreadCount === 0
                  ? 'You are all caught up'
                  : `${unreadCount} unread notification${
                      unreadCount === 1
                        ? ''
                        : 's'
                    }`}
              </Text>
            </View>

            <View style={styles.notificationArrow}>
              <MaterialCommunityIcons
                name="arrow-right"
                size={19}
                color={colors.primary}
              />
            </View>
          </DepthPressable>
        </AnimatedSection>

        {/* =================================================
            FOOTER
        ================================================= */}

        <AnimatedSection delay={840}>
          <View style={styles.footer}>
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

            <Text style={styles.footerText}>
              EduTracker • Designed & Crafted with ❤️ by Amit x infynix
            </Text>
          </View>
        </AnimatedSection>
      </ScrollView>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },

  wrap: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 35,
  },

  floatingShape: {
    position: 'absolute',
    backgroundColor: 'rgba(99, 102, 241, 0.035)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.045)',
  },

  softGlowOne: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    left: -155,
    top: 310,
    backgroundColor: 'rgba(99, 102, 241, 0.025)',
  },

  softGlowTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -110,
    top: 730,
    backgroundColor: 'rgba(129, 140, 248, 0.025)',
  },

  appHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  brandArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  brandIcon: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },

  brandText: {
    fontSize: 27,
    fontWeight: '800',
    color: '#111C39',
    letterSpacing: -0.8,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  bellButton: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8F2',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#1A2340',
    shadowOpacity: 0.06,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  headerNotificationDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
    right: 11,
    top: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  avatarButton: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: '#EEF0FF',
    borderWidth: 1,
    borderColor: '#DDE1FA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatarLetter: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.primary,
  },

  heroCard: {
    minHeight: 305,
    borderRadius: 30,
    backgroundColor: '#F8F9FF',
    borderWidth: 1,
    borderColor: '#DDE2F5',
    padding: 21,
    overflow: 'hidden',
    elevation: 7,
    shadowColor: '#354064',
    shadowOpacity: 0.10,
    shadowRadius: 17,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },

  heroCircleLarge: {
    position: 'absolute',
    width: 265,
    height: 265,
    borderRadius: 132,
    right: -105,
    top: -135,
    backgroundColor: '#E8EAFE',
  },

  heroCircleSmall: {
    position: 'absolute',
    width: 125,
    height: 125,
    borderRadius: 63,
    right: -42,
    top: -38,
    backgroundColor: '#EEF0FF',
  },

  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  heroTextArea: {
    flex: 1,
    paddingRight: 8,
  },

  portalBadge: {
    alignSelf: 'flex-start',
    minHeight: 35,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: '#EEF0FF',
    borderWidth: 1,
    borderColor: '#DFE2FA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 19,
  },

  portalBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  heroWelcome: {
    color: '#17213D',
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: -0.4,
  },

  heroName: {
    color: '#111B38',
    fontSize: 43,
    lineHeight: 49,
    fontWeight: '900',
    letterSpacing: -1.8,
    marginTop: 1,
  },

  heroWave: {
    fontSize: 31,
  },

  heroSubtext: {
    color: '#7280A1',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    fontWeight: '500',
    maxWidth: 295,
  },

  teacherHeroIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: '#D9DDF8',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#5360A2',
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },

  heroOnlineDot: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 6,
    right: 5,
    top: 5,
    backgroundColor: '#21C997',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  heroDivider: {
    height: 1,
    backgroundColor: '#DDE2F0',
    marginTop: 27,
    marginBottom: 18,
  },

  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroOverviewLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 5,
  },

  heroOverviewText: {
    color: '#17213D',
    fontSize: 16,
    fontWeight: '800',
  },

  heroArrow: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#E9EBFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCE0FB',
  },

  performanceHeader: {
    marginTop: 25,
    marginBottom: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  sectionEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 4,
  },

  sectionTitle: {
    color: '#101A37',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.8,
  },

  liveBadge: {
    minWidth: 78,
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: '#F0FFF9',
    borderWidth: 1,
    borderColor: '#C9F5E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#19B989',
  },

  liveText: {
    color: '#159B77',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  statCard: {
    flex: 1,
    minHeight: 140,
    borderRadius: 24,
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E7F0',
    elevation: 5,
    shadowColor: '#29334F',
    shadowOpacity: 0.075,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },

  statIconBox: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  statValue: {
    color: '#101A37',
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  statLabel: {
    color: '#74809D',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    marginTop: 3,
  },

  insightCard: {
    minHeight: 92,
    marginTop: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E6EF',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#27314C',
    shadowOpacity: 0.06,
    shadowRadius: 11,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },

  insightIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  insightContent: {
    flex: 1,
  },

  insightTitle: {
    color: '#111B38',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },

  insightText: {
    color: '#77839E',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },

  mainCard: {
    marginTop: 16,
    padding: 17,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E6EF',
    elevation: 5,
    shadowColor: '#28334F',
    shadowOpacity: 0.065,
    shadowRadius: 13,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  cardEyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  cardTitle: {
    color: '#111B38',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  cardIconBox: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E1E4FA',
  },

  emptyAssignment: {
    minHeight: 105,
    alignItems: 'center',
    justifyContent: 'center',
  },

  assignmentRow: {
    minHeight: 61,
    flexDirection: 'row',
    alignItems: 'center',
  },

  assignmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#F1F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  assignmentMain: {
    flex: 1,
    minWidth: 0,
  },

  assignmentTitle: {
    color: '#18213C',
    fontSize: 13,
    fontWeight: '800',
  },

  assignmentSubject: {
    color: '#7A86A2',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },

  separator: {
    height: 1,
    backgroundColor: '#EEF0F5',
    marginVertical: 3,
  },

  clearState: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },

  clearIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  clearTitle: {
    color: '#18213C',
    fontSize: 13,
    fontWeight: '800',
  },

  clearText: {
    color: '#7A86A2',
    fontSize: 11,
    marginTop: 3,
  },

  leaveRow: {
    minHeight: 61,
    flexDirection: 'row',
    alignItems: 'center',
  },

  leaveIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FFF8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  pendingText: {
    color: '#D48A19',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },

  pendingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F2B84B',
    marginLeft: 10,
  },

  notificationCard: {
    minHeight: 82,
    marginTop: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 23,
    backgroundColor: '#EEF0FF',
    borderWidth: 1,
    borderColor: '#DDE1FA',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#4C55A1',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },

  notificationIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E1E4F8',
  },

  notificationBadge: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF6B7A',
    right: 4,
    top: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  notificationMain: {
    flex: 1,
    marginLeft: 12,
  },

  notificationTitle: {
    color: '#151F3A',
    fontSize: 14,
    fontWeight: '900',
  },

  notificationText: {
    color: '#7884A1',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },

  notificationArrow: {
    width: 37,
    height: 37,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E3F6',
  },

  footer: {
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 8,
  },

  footerLine: {
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#DDE1ED',
    marginBottom: 17,
  },

  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  trustText: {
    color: '#8993AA',
    fontSize: 10,
    fontWeight: '700',
  },

  trustDivider: {
    width: 1,
    height: 13,
    backgroundColor: '#DCE0E9',
    marginHorizontal: 13,
  },

  footerText: {
    color: '#A2A9B9',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 11,
  },
});