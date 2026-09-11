import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  Animated,
  Pressable,
} from 'react-native';
import { useEffect, useMemo, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  Card,
  ScreenLoader,
  SectionTitle,
  EmptyState,
  colors,
} from '../../components/ui';

import { useAdminData } from '../../lib/useAdminData';
import { useAuth } from '../../lib/AuthContext';

export default function AdminDashboard() {
  const { profile } = useAuth();

  const admin = profile as { name?: string } | null;

  const {
    loading,
    teachers,
    students,
    events,
    hires,
    exams,
  } = useAdminData();

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((e) => e.status !== 'completed')
        .slice(0, 5),
    [events]
  );

  const pendingHires = hires.filter(
    (h) => h.status === 'pending'
  );

  const upcomingExams = exams.filter(
    (e) => e.status !== 'completed'
  );

  // ---------------- ANIMATIONS ----------------

  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const eventsAnim = useRef(new Animated.Value(0)).current;
  const hiringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(eventsAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(hiringAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (loading) {
    return <ScreenLoader label="Loading institution data…" />;
  }

  const firstName =
    admin?.name?.split(' ')[0] ?? 'Admin';

  return (
    <ScrollView
      style={styles.wrap}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* ================= HEADER ================= */}

      <Animated.View
        style={[
          styles.hero,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />

        <View style={styles.heroTop}>
          <View style={styles.adminAvatar}>
            <MaterialCommunityIcons
              name="shield-account"
              size={28}
              color="#fff"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroSmall}>
              ADMINISTRATOR
            </Text>

            <Text style={styles.heroTitle}>
              Welcome, {firstName}
            </Text>

            <Text style={styles.heroSubtitle}>
              Manage your institution from one place
            </Text>
          </View>

          <View style={styles.onlineDot}>
            <View style={styles.onlineCircle} />
          </View>
        </View>

        <View style={styles.heroBottom}>
          <View>
            <Text style={styles.heroBottomLabel}>
              INSTITUTION OVERVIEW
            </Text>

            <Text style={styles.heroBottomText}>
              Everything looks under control.
            </Text>
          </View>

          <MaterialCommunityIcons
            name="view-dashboard-outline"
            size={34}
            color="rgba(255,255,255,0.75)"
          />
        </View>
      </Animated.View>

      {/* ================= QUICK STATS ================= */}

      <Animated.View
        style={[
          styles.statsSection,
          {
            opacity: statsAnim,
            transform: [
              {
                translateY: statsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              OVERVIEW
            </Text>

            <Text style={styles.sectionHeading}>
              Institution at a glance
            </Text>
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="school-outline"
            label="Students"
            value={students.length}
            description="Active students"
          />

          <StatCard
            icon="account-tie-outline"
            label="Teachers"
            value={teachers.length}
            description="Teaching staff"
          />

          <StatCard
            icon="book-clock-outline"
            label="Exams"
            value={upcomingExams.length}
            description="Upcoming exams"
          />
        </View>
      </Animated.View>

      {/* ================= EVENTS ================= */}

      <Animated.View
        style={[
          styles.sectionCard,
          {
            opacity: eventsAnim,
            transform: [
              {
                translateY: eventsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [25, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <MaterialCommunityIcons
              name="calendar-star"
              size={22}
              color={colors.text}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              Upcoming Events
            </Text>

            <Text style={styles.cardSubtitle}>
              Scheduled institution activities
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {upcomingEvents.length}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {upcomingEvents.length === 0 ? (
          <View style={styles.emptyBox}>
            <EmptyState text="No upcoming events." />
          </View>
        ) : (
          <FlatList
            data={upcomingEvents}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.eventRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.eventDate}>
                  <MaterialCommunityIcons
                    name="calendar-outline"
                    size={19}
                    color={colors.text}
                  />
                </View>

                <View style={styles.eventInfo}>
                  <Text
                    style={styles.eventTitle}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>

                  <View style={styles.eventMeta}>
                    <MaterialCommunityIcons
                      name="map-marker-outline"
                      size={14}
                      color={colors.subtext}
                    />

                    <Text
                      style={styles.eventVenue}
                      numberOfLines={1}
                    >
                      {item.venue ?? 'Venue TBD'}
                    </Text>
                  </View>
                </View>

                <View style={styles.arrowBox}>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.subtext}
                  />
                </View>
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View style={styles.rowSeparator} />
            )}
          />
        )}
      </Animated.View>

      {/* ================= HIRING ================= */}

      <Animated.View
        style={[
          styles.sectionCard,
          {
            opacity: hiringAnim,
            transform: [
              {
                translateY: hiringAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [25, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <MaterialCommunityIcons
              name="school-outline"
              size={22}
              color={colors.text}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              Hiring Pipeline
            </Text>

            <Text style={styles.cardSubtitle}>
              Pending candidate applications
            </Text>
          </View>

          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>
              {pendingHires.length} Pending
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {pendingHires.length === 0 ? (
          <View style={styles.emptyBox}>
            <EmptyState text="No pending applications." />
          </View>
        ) : (
          <FlatList
            data={pendingHires.slice(0, 5)}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.hireRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.candidateAvatar}>
                  <Text style={styles.candidateLetter}>
                    {item.candidate_name
                      ?.charAt(0)
                      ?.toUpperCase() ?? '?'}
                  </Text>
                </View>

                <View style={styles.eventInfo}>
                  <Text
                    style={styles.eventTitle}
                    numberOfLines={1}
                  >
                    {item.candidate_name}
                  </Text>

                  <View style={styles.eventMeta}>
                    <MaterialCommunityIcons
                      name="briefcase-outline"
                      size={14}
                      color={colors.subtext}
                    />

                    <Text style={styles.eventVenue}>
                      {item.role ?? 'Role TBD'}
                    </Text>
                  </View>
                </View>

                <View style={styles.reviewBadge}>
                  <Text style={styles.reviewText}>
                    Review
                  </Text>
                </View>
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View style={styles.rowSeparator} />
            )}
          />
        )}
      </Animated.View>

      {/* ================= FOOTER ================= */}

      <View style={styles.footer}>
        <MaterialCommunityIcons
          name="shield-check-outline"
          size={16}
          color={colors.subtext}
        />

        <Text style={styles.footerText}>
          EduTracker Admin Control Center
        </Text>
      </View>
    </ScrollView>
  );
}

/* ========================================================= */
/*                       STAT CARD                           */
/* ========================================================= */

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: number;
  description: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
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

  return (
    <Animated.View
      style={[
        styles.statCard,
        { transform: [{ scale }] },
      ]}
    >
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={styles.statPress}
      >
        <View style={styles.statTop}>
          <View style={styles.statIcon}>
            <MaterialCommunityIcons
              name={icon}
              size={21}
              color={colors.text}
            />
          </View>

          <MaterialCommunityIcons
            name="arrow-top-right"
            size={17}
            color={colors.subtext}
          />
        </View>

        <Text style={styles.statValue}>
          {value}
        </Text>

        <Text style={styles.statLabel}>
          {label}
        </Text>

        <Text style={styles.statDescription}>
          {description}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/* ========================================================= */
/*                         STYLES                             */
/* ========================================================= */

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  content: {
    padding: 16,
    paddingBottom: 42,
  },

  /* HERO */

  hero: {
    minHeight: 190,
    borderRadius: 26,
    padding: 20,
    overflow: 'hidden',
    backgroundColor: '#111827',
    marginBottom: 24,
    elevation: 8,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 7,
    },
  },

  heroGlowOne: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 100,
    right: -70,
    top: -80,
    backgroundColor: 'rgba(99,102,241,0.22)',
  },

  heroGlowTwo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 100,
    left: -80,
    bottom: -70,
    backgroundColor: 'rgba(14,165,233,0.14)',
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  adminAvatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  heroSmall: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.55)',
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 3,
  },

  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.62)',
    marginTop: 4,
  },

  onlineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  onlineCircle: {
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: '#4ade80',
  },

  heroBottom: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroBottomLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.45)',
  },

  heroBottomText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },

  /* SECTION */

  statsSection: {
    marginBottom: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  sectionEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: colors.subtext,
  },

  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 3,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(34,197,94,0.10)',
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    marginRight: 5,
  },

  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16a34a',
  },

  /* STATS */

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },

  statCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  statPress: {
    padding: 14,
    minHeight: 145,
  },

  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  statValue: {
    fontSize: 27,
    fontWeight: '900',
    color: colors.text,
    marginTop: 13,
  },

  statLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginTop: 1,
  },

  statDescription: {
    fontSize: 9,
    color: colors.subtext,
    marginTop: 4,
  },

  /* CARDS */

  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 14,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardIconBox: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 11,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  cardSubtitle: {
    fontSize: 10,
    color: colors.subtext,
    marginTop: 3,
  },

  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },

  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },

  pendingBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.10)',
  },

  pendingText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#d97706',
  },

  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },

  /* EVENTS */

  eventRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
  },

  eventDate: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 11,
  },

  eventInfo: {
    flex: 1,
  },

  eventTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },

  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  eventVenue: {
    fontSize: 10,
    color: colors.subtext,
    marginLeft: 4,
  },

  arrowBox: {
    marginLeft: 8,
  },

  /* HIRING */

  hireRow: {
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
  },

  candidateAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 11,
  },

  candidateLetter: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },

  reviewBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  reviewText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.text,
  },

  rowSeparator: {
    height: 1,
    backgroundColor: colors.border,
  },

  emptyBox: {
    paddingVertical: 8,
  },

  pressed: {
    opacity: 0.65,
  },

  /* FOOTER */

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },

  footerText: {
    fontSize: 10,
    color: colors.subtext,
    marginLeft: 6,
  },
});