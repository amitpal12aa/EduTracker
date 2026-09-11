import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import {
  Card,
  ScreenLoader,
  colors,
} from '../../components/ui';

import { useStudentData } from '../../lib/useStudentData';
import { supabase } from '../../lib/supabase';
import {
  requestBlePermissions,
  isBluetoothOn,
  scanForEduTrackSignal,
} from '../../lib/ble';
import { decodeBlePayload } from '../../lib/attendanceCode';
import { decodeQrPayload } from '../../lib/qrPayload';

type AttendanceTab = 'logs' | 'subjects' | 'concern';
type MarkMethod = 'bluetooth' | 'qr';
type AttendanceFilter = 'all' | 'present' | 'absent' | 'late';

type MarkOutcome = {
  result: string;
  message: string;
} | null;

const RING_SIZE = 150;
const RING_STROKE = 13;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatStatus(status?: string | null) {
  const value = String(status ?? '').toLowerCase();

  if (value === 'present') return 'Present';
  if (value === 'absent') return 'Absent';
  if (value === 'late') return 'Late';

  return status || 'Unknown';
}

function statusColor(status?: string | null) {
  const value = String(status ?? '').toLowerCase();

  if (value === 'present') return '#16A34A';
  if (value === 'absent') return '#DC2626';
  if (value === 'late') return '#F59E0B';

  return colors.subtext;
}

function statusBackground(status?: string | null) {
  const value = String(status ?? '').toLowerCase();

  if (value === 'present') return '#DCFCE7';
  if (value === 'absent') return '#FEE2E2';
  if (value === 'late') return '#FEF3C7';

  return '#F1F5F9';
}

function formatDate(dateValue?: string | null) {
  if (!dateValue) return 'Unknown date';

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function shortDate(dateValue?: string | null) {
  if (!dateValue) return '';

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
}

function calculateAttendance(
  attendance: Array<{ status?: string | null }>
) {
  const total = attendance.length;

  if (!total) {
    return {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      percentage: null as number | null,
    };
  }

  const present = attendance.filter(
    (a) => String(a.status ?? '').toLowerCase() === 'present'
  ).length;

  const absent = attendance.filter(
    (a) => String(a.status ?? '').toLowerCase() === 'absent'
  ).length;

  const late = attendance.filter(
    (a) => String(a.status ?? '').toLowerCase() === 'late'
  ).length;

  return {
    total,
    present,
    absent,
    late,
    percentage: Math.round((present / total) * 100),
  };
}

function getAttendanceMessage(
  percentage: number | null,
  required = 75
) {
  if (percentage === null) {
    return {
      title: 'No attendance data yet',
      message: 'Your attendance will appear here once classes are recorded.',
      color: '#64748B',
      background: '#F1F5F9',
      icon: 'information-outline' as const,
    };
  }

  if (percentage >= required + 10) {
    return {
      title: 'Excellent attendance!',
      message: 'Great work. Keep maintaining this consistency.',
      color: '#15803D',
      background: '#DCFCE7',
      icon: 'checkmark-circle-outline' as const,
    };
  }

  if (percentage >= required) {
    return {
      title: 'You are above the limit',
      message: `You are currently above the required ${required}% attendance.`,
      color: '#15803D',
      background: '#DCFCE7',
      icon: 'checkmark-circle-outline' as const,
    };
  }

  if (percentage >= required - 5) {
    return {
      title: 'Attendance needs attention',
      message: `Your attendance is close to the required ${required}% limit.`,
      color: '#B45309',
      background: '#FEF3C7',
      icon: 'alert-circle-outline' as const,
    };
  }

  return {
    title: 'Attendance is low',
    message: `Your attendance is below the required ${required}% limit.`,
    color: '#B91C1C',
    background: '#FEE2E2',
    icon: 'alert-circle-outline' as const,
  };
}

function AnimatedAttendanceRing({
  percentage,
}: {
  percentage: number | null;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    progress.setValue(0);

    Animated.timing(progress, {
      toValue: percentage ?? 0,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1.04,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(pulse, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [percentage, progress, pulse]);

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  const strokeOffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [
      RING_CIRCUMFERENCE,
      0,
    ],
    extrapolate: 'clamp',
  });

  const animatedPercent = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 100],
  });

  return (
    <Animated.View
      style={[
        styles.ringWrapper,
        {
          transform: [{ scale: pulse }],
        },
      ]}
    >
      <Svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      >
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="#E2E8F0"
          strokeWidth={RING_STROKE}
          fill="none"
        />

        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="#16A34A"
          strokeWidth={RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
          strokeDashoffset={strokeOffset}
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>

      <View style={styles.ringCenter}>
        <Animated.Text style={styles.ringPercent}>
          {animatedPercent.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          })}
        </Animated.Text>

        <Text style={styles.ringLabel}>
          Overall
        </Text>
      </View>
    </Animated.View>
  );
}

export default function StudentAttendanceScreen() {
  const d = useStudentData();

  const [tab, setTab] = useState<AttendanceTab>('logs');
  const [markMethod, setMarkMethod] = useState<MarkMethod>('bluetooth');
  const [cameraActive, setCameraActive] = useState(false);
  const [filter, setFilter] =
    useState<AttendanceFilter>('all');

  const [subjectFilter, setSubjectFilter] =
    useState<string>('all');

  const [bleState, setBleState] = useState<
    'idle' |
    'scanning' |
    'no-permission' |
    'bluetooth-off' |
    'not-found'
  >('idle');

  const [outcome, setOutcome] =
    useState<MarkOutcome>(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [concernModal, setConcernModal] =
    useState(false);

  const [selectedConcern, setSelectedConcern] =
    useState('Attendance marked incorrectly');

  const [concernMessage, setConcernMessage] =
    useState('');

  const [selectedAttendanceId, setSelectedAttendanceId] =
    useState<string | null>(null);

  const stopScanRef =
    useRef<(() => void) | null>(null);

  const scannedOnceRef =
    useRef(false);

  const cameraTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const introAnimation =
    useRef(new Animated.Value(0)).current;

  const statsAnimation =
    useRef(new Animated.Value(0)).current;

  const [cameraPermission, requestCameraPermission] =
    useCameraPermissions();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(introAnimation, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(statsAnimation, {
        toValue: 1,
        duration: 850,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [introAnimation, statsAnimation]);

  useEffect(() => {
    return () => {
      stopScanRef.current?.();
      if (cameraTimerRef.current) {
        clearTimeout(cameraTimerRef.current);
      }
    };
  }, []);

  const stats = useMemo(
    () => calculateAttendance(d.attendance),
    [d.attendance]
  );

  const requiredAttendance = 75;

  const attendanceMessage = useMemo(
    () =>
      getAttendanceMessage(
        stats.percentage,
        requiredAttendance
      ),
    [stats.percentage]
  );

  const subjectsWithAttendance = useMemo(() => {
    return d.subjects.map((subject) => {
      const rows = d.attendance.filter(
        (a) => a.subject_id === subject.id
      );

      const subjectStats = calculateAttendance(rows);

      return {
        subject,
        rows,
        ...subjectStats,
      };
    });
  }, [d.subjects, d.attendance]);

  const filteredAttendance = useMemo(() => {
    let rows = [...d.attendance];

    if (filter !== 'all') {
      rows = rows.filter(
        (a) =>
          String(a.status ?? '').toLowerCase() === filter
      );
    }

    if (subjectFilter !== 'all') {
      rows = rows.filter(
        (a) => String(a.subject_id) === subjectFilter
      );
    }

    return rows.sort((a, b) => {
      const aDate = new Date(
        `${a.class_date}T00:00:00`
      ).getTime();

      const bDate = new Date(
        `${b.class_date}T00:00:00`
      ).getTime();

      return bDate - aDate;
    });
  }, [
    d.attendance,
    filter,
    subjectFilter,
  ]);

  const groupedLogs = useMemo(() => {
    const groups: Record<
      string,
      typeof filteredAttendance
    > = {};

    filteredAttendance.forEach((row) => {
      const key = row.class_date;

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(row);
    });

    return Object.entries(groups).sort(
      ([a], [b]) => {
        const aTime = new Date(
          `${a}T00:00:00`
        ).getTime();

        const bTime = new Date(
          `${b}T00:00:00`
        ).getTime();

        return bTime - aTime;
      }
    );
  }, [filteredAttendance]);

  const streak = useMemo(() => {
    if (!d.attendance.length) return 0;

    const rows = [...d.attendance]
      .filter(
        (a) =>
          String(a.status ?? '').toLowerCase() ===
          'present'
      )
      .sort((a, b) =>
        String(b.class_date).localeCompare(
          String(a.class_date)
        )
      );

    if (!rows.length) return 0;

    const uniqueDates = Array.from(
      new Set(rows.map((r) => r.class_date))
    );

    let count = 0;
    let cursor = new Date();

    cursor.setHours(0, 0, 0, 0);

    for (const dateValue of uniqueDates) {
      const rowDate = new Date(
        `${dateValue}T00:00:00`
      );

      const difference =
        Math.round(
          (cursor.getTime() -
            rowDate.getTime()) /
            86400000
        );

      if (difference === 0 || difference === 1) {
        count += 1;
        cursor = rowDate;
      } else if (difference > 1) {
        break;
      }
    }

    return count;
  }, [d.attendance]);

  const trend = useMemo(() => {
    const sorted = [...d.attendance]
      .sort((a, b) =>
        String(a.class_date).localeCompare(
          String(b.class_date)
        )
      );

    if (!sorted.length) {
      return [];
    }

    const chunks: Array<
      Array<(typeof sorted)[number]>
    > = [];

    const chunkSize = Math.max(
      1,
      Math.ceil(sorted.length / 4)
    );

    for (
      let i = 0;
      i < sorted.length;
      i += chunkSize
    ) {
      chunks.push(
        sorted.slice(i, i + chunkSize)
      );
    }

    return chunks.slice(0, 4).map(
      (chunk, index) => {
        const present = chunk.filter(
          (a) =>
            String(a.status ?? '').toLowerCase() ===
            'present'
        ).length;

        const pct = chunk.length
          ? Math.round(
              (present / chunk.length) * 100
            )
          : 0;

        return {
          label: `Week ${index + 1}`,
          value: pct,
        };
      }
    );
  }, [d.attendance]);

  const submitCode = async (
    sessionId: string,
    code: string,
    method: 'ble' | 'qr'
  ) => {
    setSubmitting(true);
    setOutcome(null);

    const { data, error } =
      await supabase.rpc(
        'mark_attendance_via_session',
        {
          p_session_id: sessionId,
          p_code: code,
          p_method: method,
        }
      );

    setSubmitting(false);

    if (error) {
      setOutcome({
        result: 'error',
        message: error.message,
      });
      return;
    }

    const row =
      (
        data as {
          result: string;
          message: string;
        }[]
      )?.[0];

    setOutcome(
      row ?? {
        result: 'error',
        message:
          'No response from server',
      }
    );

    if (row?.result === 'verified') {
      d.reload();
    }
  };

  const startBleScan = async () => {
    setOutcome(null);
    scannedOnceRef.current = false;

    const perm =
      await requestBlePermissions('scanner');

    if (!perm.granted) {
      setBleState('no-permission');
      return;
    }

    const on = await isBluetoothOn();

    if (!on) {
      setBleState('bluetooth-off');
      return;
    }

    setBleState('scanning');

    stopScanRef.current =
      scanForEduTrackSignal(
        async (payload) => {
          if (scannedOnceRef.current) {
            return;
          }

          const decoded =
            decodeBlePayload(payload);

          if (!decoded) {
            return;
          }

          scannedOnceRef.current = true;

          stopScanRef.current?.();

          setBleState('idle');

          const {
            data: sessionId,
            error,
          } =
            await supabase.rpc(
              'resolve_session_by_prefix',
              {
                p_prefix:
                  decoded.sessionPrefix,
              }
            );

          if (error || !sessionId) {
            setOutcome({
              result: 'error',
              message:
                "Could not resolve the teacher's session — try again or use QR.",
            });
            return;
          }

          await submitCode(
            sessionId as string,
            decoded.code,
            'ble'
          );
        },
        () => {
          stopScanRef.current?.();
          setBleState('not-found');
        }
      );

    setTimeout(() => {
      if (!scannedOnceRef.current) {
        stopScanRef.current?.();

        setBleState((state) =>
          state === 'scanning'
            ? 'not-found'
            : state
        );
      }
    }, 20000);
  };

  const onQrScanned = async (
    data: string
  ) => {
    if (scannedOnceRef.current) {
      return;
    }

    const decoded =
      decodeQrPayload(data);

    if (!decoded) {
      return;
    }

    scannedOnceRef.current = true;
    closeCamera();

    await submitCode(
      decoded.sessionId,
      decoded.code,
      'qr'
    );
  };

  const closeCamera = () => {
    setCameraActive(false);
    if (cameraTimerRef.current) {
      clearTimeout(cameraTimerRef.current);
      cameraTimerRef.current = null;
    }
  };

  const openCamera = () => {
    setOutcome(null);
    scannedOnceRef.current = false;
    setCameraActive(true);

    if (cameraTimerRef.current) {
      clearTimeout(cameraTimerRef.current);
    }

    cameraTimerRef.current = setTimeout(() => {
      setCameraActive(false);
      cameraTimerRef.current = null;
      setOutcome({
        result: 'info',
        message: 'Camera closed automatically after 30 seconds. Tap Open Camera to scan again.',
      });
    }, 30000);
  };

  const switchMarkMethod = (method: MarkMethod) => {
    stopScanRef.current?.();
    stopScanRef.current = null;
    setBleState('idle');
    setOutcome(null);
    scannedOnceRef.current = false;
    closeCamera();
    setMarkMethod(method);
  };

  const openBluetoothSettings = async () => {
    try {
      await Linking.openURL('intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end');
    } catch {
      setOutcome({
        result: 'info',
        message: 'Please open Android Settings and turn Bluetooth on manually.',
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await d.reload();
    } finally {
      setRefreshing(false);
    }
  };

  const openConcern = (
    attendanceId: string
  ) => {
    setSelectedAttendanceId(
      attendanceId
    );

    setSelectedConcern(
      'Attendance marked incorrectly'
    );

    setConcernMessage('');

    setConcernModal(true);
  };

  const submitConcern = () => {
    /*
      UI is ready.

      Backend concern submission is intentionally
      not guessed here because the project schema/RPC
      for attendance concerns has not been confirmed.

      Once the actual concern table/RPC is confirmed,
      this function will submit:
        - attendance id
        - concern reason
        - student message
        - current student id
    */

    setConcernModal(false);

    setOutcome({
      result: 'info',
      message:
        'Concern form captured. Backend concern submission will be connected to the verified Supabase schema next.',
    });
  };

  if (d.loading) {
    return (
      <ScreenLoader
        label="Loading attendance…"
      />
    );
  }

  return (
    <>
      <ScrollView
        style={styles.wrap}
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* =========================
            HEADER
        ========================== */}

        <Animated.View
          style={[
            styles.header,
            {
              opacity: introAnimation,
              transform: [
                {
                  translateY:
                    introAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                },
              ],
            },
          ]}
        >
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons
              name="calendar-check-outline"
              size={25}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              Attendance
            </Text>

            <Text style={styles.headerSubtitle}>
              Track your presence and stay consistent
            </Text>
          </View>

          <Pressable
            style={styles.helpButton}
            onPress={() =>
              setOutcome({
                result: 'info',
                message:
                  'Attendance is recorded only after your institution verifies the class session.',
              })
            }
          >
            <Ionicons
              name="help-circle-outline"
              size={23}
              color={colors.primary}
            />
          </Pressable>
        </Animated.View>

        {/* =========================
            MAIN OVERVIEW CARD
        ========================== */}

        <Animated.View
          style={[
            styles.overviewCard,
            {
              opacity: statsAnimation,
              transform: [
                {
                  translateY:
                    statsAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [22, 0],
                    }),
                },
              ],
            },
          ]}
        >
          <View style={styles.overviewTop}>
            <View>
              <Text style={styles.overviewEyebrow}>
                OVERALL ATTENDANCE
              </Text>

              <Text style={styles.overviewHeading}>
                Your attendance
              </Text>

              <Text style={styles.overviewDescription}>
                Keep your attendance above the required
                limit.
              </Text>
            </View>

            <View style={styles.liveDot}>
              <View style={styles.liveDotInner} />
              <Text style={styles.liveDotText}>
                LIVE DATA
              </Text>
            </View>
          </View>

          <View style={styles.overviewMain}>
            <AnimatedAttendanceRing
              percentage={stats.percentage}
            />

            <View style={styles.attendanceSummary}>
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>Present</Text>
    <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
      {stats.present}
    </Text>
  </View>

  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>Absent</Text>
    <Text style={[styles.summaryValue, { color: '#DC2626' }]}>
      {stats.absent}
    </Text>
  </View>

  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>Late</Text>
    <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
      {stats.late}
    </Text>
  </View>

  <View style={[styles.summaryRow, styles.summaryRowLast]}>
    <Text style={styles.summaryLabel}>Total Classes</Text>
    <Text style={styles.summaryValue}>
      {stats.total}
    </Text>
  </View>
</View>
</View>

          <View
            style={[
              styles.attendanceMessage,
              {
                backgroundColor:
                  attendanceMessage.background,
              },
            ]}
          >
            <Ionicons
              name={attendanceMessage.icon}
              size={20}
              color={attendanceMessage.color}
            />

            <View style={styles.messageTextWrap}>
              <Text
                style={[
                  styles.messageTitle,
                  {
                    color:
                      attendanceMessage.color,
                  },
                ]}
              >
                {attendanceMessage.title}
              </Text>

              <Text
                style={[
                  styles.messageBody,
                  {
                    color:
                      attendanceMessage.color,
                  },
                ]}
              >
                {attendanceMessage.message}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* =========================
            REQUIRED + STREAK
        ========================== */}

        <View style={styles.infoRow}>
          <InfoCard
            icon="shield-check-outline"
            title="Required"
            value={`${requiredAttendance}%`}
            subtitle="Minimum"
            iconColor="#7C3AED"
          />

          <InfoCard
            icon="fire"
            title="Streak"
            value={`${streak}`}
            subtitle={
              streak === 1
                ? 'Day'
                : 'Days'
            }
            iconColor="#F97316"
          />
        </View>

        {/* =========================
            TABS
        ========================== */}

        <View style={styles.mainTabs}>
          <MainTab
            active={tab === 'logs'}
            icon="format-list-bulleted"
            label="Logs"
            onPress={() => {
              setTab('logs');
              setOutcome(null);
            }}
          />

          <MainTab
            active={tab === 'subjects'}
            icon="book-open-outline"
            label="Subjects"
            onPress={() => {
              setTab('subjects');
              setOutcome(null);
            }}
          />

          <MainTab
            active={tab === 'concern'}
            icon="message-alert-outline"
            label="Concern"
            onPress={() => {
              setTab('concern');
              setOutcome(null);
            }}
          />
        </View>

        {/* =========================
            LOGS TAB
        ========================== */}

        {tab === 'logs' && (
          <>
            {/* FILTERS */}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.filterRow
              }
            >
              <FilterChip
                label="All"
                active={filter === 'all'}
                onPress={() =>
                  setFilter('all')
                }
              />

              <FilterChip
                label="Present"
                active={
                  filter === 'present'
                }
                color="#16A34A"
                onPress={() =>
                  setFilter('present')
                }
              />

              <FilterChip
                label="Absent"
                active={
                  filter === 'absent'
                }
                color="#DC2626"
                onPress={() =>
                  setFilter('absent')
                }
              />

              <FilterChip
                label="Late"
                active={
                  filter === 'late'
                }
                color="#F59E0B"
                onPress={() =>
                  setFilter('late')
                }
              />
            </ScrollView>

            {/* SUBJECT FILTER */}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.subjectFilterRow
              }
            >
              <Pressable
                style={[
                  styles.subjectFilter,
                  subjectFilter === 'all' &&
                    styles.subjectFilterActive,
                ]}
                onPress={() =>
                  setSubjectFilter('all')
                }
              >
                <MaterialCommunityIcons
                  name="book-open-outline"
                  size={16}
                  color={
                    subjectFilter === 'all'
                      ? '#FFFFFF'
                      : colors.subtext
                  }
                />

                <Text
                  style={[
                    styles.subjectFilterText,
                    subjectFilter === 'all' &&
                      styles.subjectFilterTextActive,
                  ]}
                >
                  All Subjects
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={15}
                  color={
                    subjectFilter === 'all'
                      ? '#FFFFFF'
                      : colors.subtext
                  }
                />
              </Pressable>

              {d.subjects.map((subject) => {
                const active =
                 subjectFilter ===
                 String(subject.id)

                return (
                  <Pressable
                    key={subject.id}
                    style={[
                      styles.subjectFilter,
                      active &&
                        styles.subjectFilterActive,
                    ]}
                    onPress={() =>
                      setSubjectFilter(
                        String(subject.id)
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.subjectFilterText,
                        active &&
                          styles.subjectFilterTextActive,
                      ]}
                    >
                      {subject.code ??
                        subject.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* LOG COUNT */}

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Attendance Logs
                </Text>

                <Text style={styles.sectionSubtitle}>
                  {filteredAttendance.length}{' '}
                  records found
                </Text>
              </View>

              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>
                  {stats.percentage ?? '—'}%
                </Text>
              </View>
            </View>

            {/* LOGS */}

            {groupedLogs.length === 0 ? (
              <Card style={styles.emptyCard}>
                <MaterialCommunityIcons
                  name="calendar-remove-outline"
                  size={42}
                  color="#94A3B8"
                />

                <Text style={styles.emptyTitle}>
                  No attendance records
                </Text>

                <Text style={styles.emptyText}>
                  Attendance matching these filters
                  will appear here.
                </Text>
              </Card>
            ) : (
              groupedLogs.map(
                ([date, rows]) => (
                  <View
                    key={date}
                    style={styles.dateGroup}
                  >
                    <View
                      style={
                        styles.dateHeading
                      }
                    >
                      <View
                        style={
                          styles.dateLine
                        }
                      />

                      <Text
                        style={
                          styles.dateHeadingText
                        }
                      >
                        {formatDate(date)}
                      </Text>
                    </View>

                    {rows.map((a) => {
                      const subject =
                        d.subjects.find(
                          (s) =>
                            s.id ===
                            a.subject_id
                        );

                      return (
                        <AttendanceLogCard
                          key={a.id}
                          attendance={a}
                          subject={
                            subject
                          }
                          onConcern={() =>
                            openConcern(
                              String(a.id)
                            )
                          }
                        />
                      );
                    })}
                  </View>
                )
              )
            )}

            {/* TREND */}

            {trend.length > 0 && (
              <View style={styles.analyticsCard}>
                <View
                  style={
                    styles.analyticsHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.analyticsTitle
                      }
                    >
                      Attendance Trend
                    </Text>

                    <Text
                      style={
                        styles.analyticsSubtitle
                      }
                    >
                      Your performance over time
                    </Text>
                  </View>

                  <View
                    style={
                      styles.analyticsIcon
                    }
                  >
                    <MaterialCommunityIcons
                      name="chart-line"
                      size={20}
                      color={
                        colors.primary
                      }
                    />
                  </View>
                </View>

                <View
                  style={
                    styles.trendChart
                  }
                >
                  {trend.map((point) => (
                    <View
                      key={point.label}
                      style={
                        styles.trendItem
                      }
                    >
                      <View
                        style={
                          styles.trendBarBackground
                        }
                      >
                        <View
                          style={[
                            styles.trendBar,
                            {
                              height: `${Math.max(
                                8,
                                point.value
                              )}%`,
                            },
                          ]}
                        />
                      </View>

                      <Text
                        style={
                          styles.trendValue
                        }
                      >
                        {point.value}%
                      </Text>

                      <Text
                        style={
                          styles.trendLabel
                        }
                      >
                        {point.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* =========================
            SUBJECTS TAB
        ========================== */}

        {tab === 'subjects' && (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Subject Breakdown
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Attendance performance by subject
                </Text>
              </View>

              <View
                style={
                  styles.subjectCountBadge
                }
              >
                <Text
                  style={
                    styles.subjectCountText
                  }
                >
                  {subjectsWithAttendance.length}
                </Text>
              </View>
            </View>

            {subjectsWithAttendance.length ===
            0 ? (
              <Card style={styles.emptyCard}>
                <MaterialCommunityIcons
                  name="book-open-page-variant-outline"
                  size={42}
                  color="#94A3B8"
                />

                <Text style={styles.emptyTitle}>
                  No subjects found
                </Text>
              </Card>
            ) : (
              subjectsWithAttendance.map(
                ({
                  subject,
                  total,
                  present,
                  absent,
                  late,
                  percentage,
                }) => {
                  const value =
                    percentage ?? 0;

                  const barColor =
                    value >= 75
                      ? '#16A34A'
                      : value >= 70
                        ? '#F59E0B'
                        : '#DC2626';

                  return (
                    <View
                      key={subject.id}
                      style={
                        styles.subjectCard
                      }
                    >
                      <View
                        style={
                          styles.subjectTop
                        }
                      >
                        <View
                          style={[
                            styles.subjectIcon,
                            {
                              backgroundColor:
                                `${barColor}18`,
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="book-open-variant"
                            size={21}
                            color={
                              barColor
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.subjectNameWrap
                          }
                        >
                          <Text
                            style={
                              styles.subjectName
                            }
                            numberOfLines={1}
                          >
                            {subject.name}
                          </Text>

                          <Text
                            style={
                              styles.subjectCode
                            }
                          >
                            {subject.code ??
                              'Subject'}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.subjectPercent,
                            {
                              color:
                                barColor,
                            },
                          ]}
                        >
                          {percentage ===
                          null
                            ? '—'
                            : `${percentage}%`}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.progressTrack
                        }
                      >
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(
                                100,
                                value
                              )}%`,
                              backgroundColor:
                                barColor,
                            },
                          ]}
                        />
                      </View>

                      <View
                        style={
                          styles.subjectStats
                        }
                      >
                        <SubjectStat
                          label="Present"
                          value={present}
                          color="#16A34A"
                        />

                        <SubjectStat
                          label="Absent"
                          value={absent}
                          color="#DC2626"
                        />

                        <SubjectStat
                          label="Late"
                          value={late}
                          color="#F59E0B"
                        />

                        <SubjectStat
                          label="Total"
                          value={total}
                          color={
                            colors.primary
                          }
                        />
                      </View>

                      {percentage !==
                        null &&
                        percentage <
                          requiredAttendance && (
                          <View
                            style={
                              styles.subjectWarning
                            }
                          >
                            <Ionicons
                              name="warning-outline"
                              size={17}
                              color="#B45309"
                            />

                            <Text
                              style={
                                styles.subjectWarningText
                              }
                            >
                              Below required{' '}
                              {
                                requiredAttendance
                              }%
                              attendance
                            </Text>
                          </View>
                        )}
                    </View>
                  );
                }
              )
            )}
          </>
        )}

        {/* =========================
            CONCERN TAB
        ========================== */}

        {tab === 'concern' && (
          <>
            <View
              style={
                styles.concernHero
              }
            >
              <View
                style={
                  styles.concernHeroIcon
                }
              >
                <MaterialCommunityIcons
                  name="message-alert-outline"
                  size={28}
                  color="#7C3AED"
                />
              </View>

              <Text
                style={
                  styles.concernHeroTitle
                }
              >
                Attendance Concern
              </Text>

              <Text
                style={
                  styles.concernHeroText
                }
              >
                If your attendance was marked incorrectly,
                select the class below and raise a concern.
              </Text>
            </View>

            {d.attendance.length === 0 ? (
              <Card
                style={styles.emptyCard}
              >
                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  No attendance to review
                </Text>
              </Card>
            ) : (
              <View
                style={
                  styles.concernList
                }
              >
                {[...d.attendance]
                  .sort((a, b) =>
                    String(
                      b.class_date
                    ).localeCompare(
                      String(
                        a.class_date
                      )
                    )
                  )
                  .slice(0, 20)
                  .map((a) => {
                    const subject =
                      d.subjects.find(
                        (s) =>
                          s.id ===
                          a.subject_id
                      );

                    return (
                      <Pressable
                        key={a.id}
                        style={
                          styles.concernCard
                        }
                        onPress={() =>
                          openConcern(
                            String(a.id)
                          )
                        }
                      >
                        <View
                          style={[
                            styles.concernStatusStrip,
                            {
                              backgroundColor:
                                statusColor(
                                  a.status
                                ),
                            },
                          ]}
                        />

                        <View
                          style={
                            styles.concernCardContent
                          }
                        >
                          <View
                            style={
                              styles.concernCardTop
                            }
                          >
                            <View>
                              <Text
                                style={
                                  styles.concernSubject
                                }
                              >
                                {subject?.name ??
                                  'Subject'}
                              </Text>

                              <Text
                                style={
                                  styles.concernDate
                                }
                              >
                                {shortDate(
                                  a.class_date
                                )}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.statusBadge,
                                {
                                  backgroundColor:
                                    statusBackground(
                                      a.status
                                    ),
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  {
                                    color:
                                      statusColor(
                                        a.status
                                      ),
                                  },
                                ]}
                              >
                                {formatStatus(
                                  a.status
                                )}
                              </Text>
                            </View>
                          </View>

                          <View
                            style={
                              styles.raiseConcernButton
                            }
                          >
                            <MaterialCommunityIcons
                              name="message-alert-outline"
                              size={17}
                              color="#7C3AED"
                            />

                            <Text
                              style={
                                styles.raiseConcernText
                              }
                            >
                              Raise concern
                            </Text>

                            <Ionicons
                              name="chevron-forward"
                              size={17}
                              color="#7C3AED"
                            />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
              </View>
            )}
          </>
        )}

        {/* =========================
            MARK ATTENDANCE TOOLS
        ========================== */}

        <View style={styles.toolsSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Mark Attendance
              </Text>

              <Text style={styles.sectionSubtitle}>
                Use your teacher's active attendance session
              </Text>
            </View>
          </View>

          <View style={styles.markTabs}>
            <Pressable
              style={[
                styles.markTab,
                markMethod === 'bluetooth' &&
                  styles.markTabActive,
              ]}
              onPress={() => switchMarkMethod('bluetooth')}
            >
              <MaterialCommunityIcons
                name="bluetooth"
                size={19}
                color={
                  markMethod === 'bluetooth'
                    ? colors.primary
                    : colors.subtext
                }
              />

              <Text
                style={[
                  styles.markTabText,
                  markMethod === 'bluetooth' &&
                    styles.markTabTextActive,
                ]}
              >
                Bluetooth
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.markTab,
                markMethod === 'qr' &&
                  styles.markTabActive,
              ]}
              onPress={() => switchMarkMethod('qr')}
            >
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={19}
                color={
                  markMethod === 'qr'
                    ? colors.primary
                    : colors.subtext
                }
              />

              <Text
                style={[
                  styles.markTabText,
                  markMethod === 'qr' &&
                    styles.markTabTextActive,
                ]}
              >
                QR Code
              </Text>
            </Pressable>
          </View>

          {markMethod === 'bluetooth' && (
            <Card style={styles.markCard}>
              <View style={styles.markCardHeader}>
                <View style={styles.markCardIcon}>
                  <MaterialCommunityIcons
                    name="bluetooth"
                    size={23}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.markCardText}>
                  <Text style={styles.markCardTitle}>
                    Bluetooth Attendance
                  </Text>

                  <Text style={styles.markCardDescription}>
                    Get near your teacher's device and scan the active class signal.
                  </Text>
                </View>
              </View>

              {bleState === 'idle' && (
                <Pressable
                  style={styles.primaryButton}
                  onPress={startBleScan}
                  disabled={submitting}
                >
                  <MaterialCommunityIcons
                    name="radar"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text style={styles.primaryButtonText}>
                    Scan for Class Signal
                  </Text>
                </Pressable>
              )}

              {bleState === 'scanning' && (
                <>
                  <View style={styles.scanningBox}>
                    <View style={styles.scanningPulse} />

                    <Text style={styles.scanningTitle}>
                      Scanning…
                    </Text>

                    <Text style={styles.scanningText}>
                      Looking for your teacher's active attendance signal.
                    </Text>
                  </View>

                  <Pressable
                    style={styles.stopScanButton}
                    onPress={() => {
                      stopScanRef.current?.();
                      stopScanRef.current = null;
                      setBleState('idle');
                    }}
                  >
                    <MaterialCommunityIcons
                      name="stop-circle-outline"
                      size={18}
                      color="#DC2626"
                    />
                    <Text style={styles.stopScanButtonText}>
                      Stop Scanning
                    </Text>
                  </Pressable>
                </>
              )}

              {bleState === 'no-permission' && (
                <StatusLine
                  icon="shield-alert-outline"
                  text="Bluetooth permission was denied. Enable it in Android settings or use QR instead."
                  color={colors.danger}
                />
              )}

              {bleState === 'bluetooth-off' && (
                <>
                  <StatusLine
                    icon="bluetooth-off"
                    text="Bluetooth is turned off. Turn it on and try again."
                    color={colors.danger}
                  />

                  <Pressable
                    style={styles.bluetoothSettingsButton}
                    onPress={openBluetoothSettings}
                  >
                    <MaterialCommunityIcons
                      name="bluetooth-settings"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.bluetoothSettingsText}>
                      Turn On Bluetooth
                    </Text>
                  </Pressable>
                </>
              )}

              {bleState === 'not-found' && (
                <StatusLine
                  icon="bluetooth-off"
                  text="No active class signal found nearby. Move closer or ask your teacher to confirm the session."
                  color={colors.danger}
                />
              )}

              {outcome && (
                <OutcomeBanner outcome={outcome} />
              )}
            </Card>
          )}

          {markMethod === 'qr' && (
            <Card style={styles.markCard}>
              <View style={styles.markCardHeader}>
                <View
                  style={[
                    styles.markCardIcon,
                    { backgroundColor: '#EEF2FF' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={23}
                    color="#4F46E5"
                  />
                </View>

                <View style={styles.markCardText}>
                  <Text style={styles.markCardTitle}>
                    Scan Teacher QR
                  </Text>

                  <Text style={styles.markCardDescription}>
                    Scan the QR displayed by your teacher to verify attendance.
                  </Text>
                </View>
              </View>

              {!cameraPermission?.granted ? (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={requestCameraPermission}
                >
                  <MaterialCommunityIcons
                    name="camera-outline"
                    size={19}
                    color={colors.primary}
                  />

                  <Text style={styles.secondaryButtonText}>
                    Enable Camera
                  </Text>
                </Pressable>
              ) : !cameraActive ? (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={openCamera}
                >
                  <MaterialCommunityIcons
                    name="camera-outline"
                    size={19}
                    color={colors.primary}
                  />

                  <Text style={styles.secondaryButtonText}>
                    Open Camera
                  </Text>
                </Pressable>
              ) : (
                <>
                  <View style={styles.cameraBox}>
                    <CameraView
                      style={StyleSheet.absoluteFill}
                      barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                      }}
                      onBarcodeScanned={({ data }) =>
                        onQrScanned(data)
                      }
                    />

                    <View
                      pointerEvents="none"
                      style={styles.qrOverlay}
                    >
                      <View style={styles.qrCornerTopLeft} />
                      <View style={styles.qrCornerTopRight} />
                      <View style={styles.qrCornerBottomLeft} />
                      <View style={styles.qrCornerBottomRight} />
                    </View>

                    <Text style={styles.qrHint}>
                      Align the teacher's QR inside the frame
                    </Text>
                  </View>

                  <Pressable
                    style={styles.closeCameraButton}
                    onPress={closeCamera}
                  >
                    <MaterialCommunityIcons
                      name="camera-off-outline"
                      size={18}
                      color="#DC2626"
                    />
                    <Text style={styles.closeCameraButtonText}>
                      Close Camera
                    </Text>
                  </Pressable>
                </>
              )}

              {outcome && (
                <OutcomeBanner outcome={outcome} />
              )}
            </Card>
          )}
        </View>

        {/* =========================
            FOOTER INFO
        ========================== */}

        <View style={styles.footerInfo}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={18}
            color="#16A34A"
          />

          <Text style={styles.footerInfoText}>
            Attendance is verified securely by EduTrack.
          </Text>
        </View>
      </ScrollView>

      {/* =========================
          CONCERN MODAL
      ========================== */}

      <Modal
        visible={concernModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setConcernModal(false)
        }
      >
        <View
          style={
            styles.modalBackdrop
          }
        >
          <View
            style={
              styles.concernModal
            }
          >
            <View
              style={
                styles.modalHandle
              }
            />

            <View
              style={
                styles.modalHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Raise a Concern
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Tell us what went wrong
                </Text>
              </View>

              <Pressable
                style={
                  styles.closeButton
                }
                onPress={() =>
                  setConcernModal(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={21}
                  color="#64748B"
                />
              </Pressable>
            </View>

            <Text
              style={
                styles.modalLabel
              }
            >
              Reason
            </Text>

            {[
              'Attendance marked incorrectly',
              'I was present but marked absent',
              'Wrong subject/class',
              'Wrong attendance date',
              'Other issue',
            ].map((reason) => {
              const active =
                selectedConcern ===
                reason;

              return (
                <Pressable
                  key={reason}
                  style={[
                    styles.reasonOption,
                    active &&
                      styles.reasonOptionActive,
                  ]}
                  onPress={() =>
                    setSelectedConcern(
                      reason
                    )
                  }
                >
                  <View
                    style={[
                      styles.radioOuter,
                      active &&
                        styles.radioOuterActive,
                    ]}
                  >
                    {active && (
                      <View
                        style={
                          styles.radioInner
                        }
                      />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.reasonText,
                      active &&
                        styles.reasonTextActive,
                    ]}
                  >
                    {reason}
                  </Text>
                </Pressable>
              );
            })}

            <Text
              style={
                styles.modalLabel
              }
            >
              Additional details
            </Text>

            <TextInput
              value={concernMessage}
              onChangeText={
                setConcernMessage
              }
              placeholder="Explain the issue briefly…"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={
                styles.concernInput
              }
            />

            <View
              style={
                styles.modalActions
              }
            >
              <Pressable
                style={
                  styles.cancelButton
                }
                onPress={() =>
                  setConcernModal(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={
                  styles.submitConcernButton
                }
                onPress={
                  submitConcern
                }
              >
                <MaterialCommunityIcons
                  name="send-outline"
                  size={18}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.submitConcernText
                  }
                >
                  Submit Concern
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/* =====================================================
   SMALL COMPONENTS
===================================================== */

function MiniStat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  return (
    <View style={styles.miniStat}>
      <View
        style={[
          styles.miniStatIcon,
          {
            backgroundColor:
              `${color}15`,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={color}
        />
      </View>

      <View>
        <Text style={styles.miniStatValue}>
          {value}
        </Text>

        <Text style={styles.miniStatLabel}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function InfoCard({
  icon,
  title,
  value,
  subtitle,
  iconColor,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  value: string;
  subtitle: string;
  iconColor: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View
        style={[
          styles.infoIcon,
          {
            backgroundColor:
              `${iconColor}15`,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={iconColor}
        />
      </View>

      <View style={styles.infoText}>
        <Text style={styles.infoTitle}>
          {title}
        </Text>

        <View
          style={
            styles.infoValueRow
          }
        >
          <Text style={styles.infoValue}>
            {value}
          </Text>

          <Text style={styles.infoSubtitle}>
            {subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MainTab({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.mainTab,
        active &&
          styles.mainTabActive,
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={
          active
            ? '#FFFFFF'
            : colors.subtext
        }
      />

      <Text
        style={[
          styles.mainTabText,
          active &&
            styles.mainTabTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FilterChip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        active && {
          backgroundColor:
            color ?? colors.primary,
          borderColor:
            color ?? colors.primary,
        },
      ]}
    >
      {label !== 'All' && (
        <View
          style={[
            styles.filterDot,
            {
              backgroundColor:
                active
                  ? '#FFFFFF'
                  : color ?? colors.subtext,
            },
          ]}
        />
      )}

      <Text
        style={[
          styles.filterChipText,
          active &&
            styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SubjectStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View
      style={
        styles.subjectStat
      }
    >
      <View
        style={[
          styles.subjectStatDot,
          {
            backgroundColor:
              color,
          },
        ]}
      />

      <Text
        style={
          styles.subjectStatLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.subjectStatValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

function AttendanceLogCard({
  attendance,
  subject,
  onConcern,
}: {
  attendance: any;
  subject: any;
  onConcern: () => void;
}) {
  const color =
    statusColor(attendance.status);

  const background =
    statusBackground(
      attendance.status
    );

  return (
    <View
      style={
        styles.logCard
      }
    >
      <View
        style={[
          styles.logAccent,
          {
            backgroundColor:
              color,
          },
        ]}
      />

      <View
        style={
          styles.logContent
        }
      >
        <View
          style={
            styles.logTopRow
          }
        >
          <View
            style={
              styles.classPill
            }
          >
            <MaterialCommunityIcons
              name="school-outline"
              size={15}
              color="#64748B"
            />

            <Text
              style={
                styles.classPillText
              }
            >
              Classes
            </Text>
          </View>

          <Text
            style={
              styles.logTime
            }
          >
            {shortDate(
              attendance.class_date
            )}
          </Text>
        </View>

        <View
          style={
            styles.logMainRow
          }
        >
          <View
            style={
              styles.logTitleWrap
            }
          >
            <Text
              style={
                styles.logTitle
              }
              numberOfLines={2}
            >
              {subject?.name ??
                'Subject'}
            </Text>

            <Text
              style={
                styles.logMeta
              }
            >
              {subject?.code ??
                'CORE'}
              {'  •  '}
              {attendance.method ??
                'manual'}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  background,
              },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                {
                  color,
                },
              ]}
            >
              {formatStatus(
                attendance.status
              )}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.logBottom
          }
        >
          <View
            style={
              styles.logMethod
            }
          >
            <MaterialCommunityIcons
              name={
                attendance.method ===
                'qr'
                  ? 'qrcode'
                  : attendance.method ===
                      'ble'
                    ? 'bluetooth'
                    : 'check-circle-outline'
              }
              size={15}
              color="#64748B"
            />

            <Text
              style={
                styles.logMethodText
              }
            >
              {attendance.method ??
                'manual'}
            </Text>
          </View>

          {String(
            attendance.status ??
              ''
          ).toLowerCase() ===
            'absent' && (
            <Pressable
              style={
                styles.concernAction
              }
              onPress={onConcern}
            >
              <MaterialCommunityIcons
                name="message-alert-outline"
                size={16}
                color="#7C3AED"
              />

              <Text
                style={
                  styles.concernActionText
                }
              >
                Raise concern
              </Text>

              <Ionicons
                name="chevron-forward"
                size={15}
                color="#7C3AED"
              />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function StatusLine({
  text,
  color,
  icon,
}: {
  text: string;
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  return (
    <View
      style={[
        styles.statusLine,
        {
          backgroundColor:
            `${color}10`,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={21}
        color={color}
      />

      <Text
        style={[
          styles.statusLineText,
          {
            color,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function OutcomeBanner({
  outcome,
}: {
  outcome: {
    result: string;
    message: string;
  };
}) {
  const good =
    outcome.result === 'verified';

  const info =
    outcome.result === 'info';

  const color = good
    ? '#15803D'
    : info
      ? '#2563EB'
      : '#B91C1C';

  const background = good
    ? '#DCFCE7'
    : info
      ? '#DBEAFE'
      : '#FEE2E2';

  return (
    <View
      style={[
        styles.outcomeBanner,
        {
          backgroundColor:
            background,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={
          good
            ? 'check-circle-outline'
            : info
              ? 'information-outline'
              : 'alert-circle-outline'
        }
        size={20}
        color={color}
      />

      <Text
        style={[
          styles.outcomeText,
          {
            color,
          },
        ]}
      >
        {outcome.message}
      </Text>
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },

  container: {
    padding: 16,
    paddingBottom: 55,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: colors.text,
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: colors.subtext,
  },

  helpButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },

  overviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  overviewEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.primary,
  },

  overviewHeading: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },

  overviewDescription: {
    marginTop: 4,
    fontSize: 11,
    color: colors.subtext,
  },

  liveDot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  liveDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 5,
  },

  liveDotText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#15803D',
  },

  overviewMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },

  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ringPercent: {
    fontSize: 27,
    fontWeight: '900',
    color: colors.text,
  },

  ringLabel: {
    marginTop: -1,
    fontSize: 10,
    color: colors.subtext,
    fontWeight: '600',
  },

  statsGrid: {
    
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  attendanceSummary: {
  backgroundColor: colors.card,
  borderRadius: 16,
  paddingHorizontal: 16,
  borderWidth: 1,
  borderColor: colors.border,
  marginLeft: 26,
},

summaryRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
},

summaryRowLast: {
  borderBottomWidth: 0,
},

summaryLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: colors.text,
},

summaryValue: {
  fontSize: 16,
  fontWeight: '800',
  color: colors.text,
},

  miniStat: {
    width: '47%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  miniStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },

  miniStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },

  miniStatLabel: {
    fontSize: 9,
    color: colors.subtext,
    marginTop: 1,
  },

  attendanceMessage: {
    marginTop: 17,
    borderRadius: 14,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  messageTextWrap: {
    flex: 1,
    marginLeft: 9,
  },

  messageTitle: {
    fontSize: 12,
    fontWeight: '800',
  },

  messageBody: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
  },

  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  infoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },

  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  infoText: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
  },

  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 1,
  },

  infoValue: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
  },

  infoSubtitle: {
    fontSize: 9,
    color: colors.subtext,
  },

  mainTabs: {
    marginTop: 18,
    backgroundColor: '#E9EEF6',
    borderRadius: 15,
    padding: 4,
    flexDirection: 'row',
  },

  mainTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },

  mainTabActive: {
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },

  mainTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.subtext,
  },

  mainTabTextActive: {
    color: '#FFFFFF',
  },

  filterRow: {
    paddingVertical: 13,
    gap: 8,
    paddingRight: 16,
  },

  filterChip: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.subtext,
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  subjectFilterRow: {
    gap: 8,
    paddingBottom: 5,
    paddingRight: 16,
  },

  subjectFilter: {
    minHeight: 35,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  subjectFilterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  subjectFilterText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.subtext,
  },

  subjectFilterTextActive: {
    color: '#FFFFFF',
  },

  sectionHeader: {
    marginTop: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: colors.subtext,
  },

  totalBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
  },

  totalBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary,
  },

  dateGroup: {
    marginBottom: 8,
  },

  dateHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 9,
  },

  dateLine: {
    width: 5,
    height: 20,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 8,
  },

  dateHeadingText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },

  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    marginBottom: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },

  logAccent: {
    width: 5,
  },

  logContent: {
    flex: 1,
    padding: 13,
  },

  logTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  classPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 13,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  classPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },

  logTime: {
    fontSize: 10,
    color: colors.subtext,
    fontWeight: '700',
  },

  logMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  logTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },

  logTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    color: colors.text,
  },

  logMeta: {
    fontSize: 10,
    color: colors.subtext,
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  logBottom: {
    marginTop: 11,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  logMethodText: {
    fontSize: 10,
    color: colors.subtext,
    textTransform: 'capitalize',
  },

  concernAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  concernActionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
  },

  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },

  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  analyticsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  analyticsSubtitle: {
    marginTop: 3,
    fontSize: 10,
    color: colors.subtext,
  },

  analyticsIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  trendChart: {
    height: 155,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },

  trendItem: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },

  trendBarBackground: {
    height: 105,
    width: 28,
    backgroundColor: '#EEF2F7',
    borderRadius: 14,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },

  trendBar: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: colors.primary,
  },

  trendValue: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    marginTop: 7,
  },

  trendLabel: {
    fontSize: 9,
    color: colors.subtext,
    marginTop: 3,
  },

  subjectCountBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  subjectCountText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary,
  },

  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },

  subjectTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  subjectIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  subjectNameWrap: {
    flex: 1,
    marginLeft: 10,
  },

  subjectName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },

  subjectCode: {
    marginTop: 3,
    fontSize: 10,
    color: colors.subtext,
  },

  subjectPercent: {
    fontSize: 20,
    fontWeight: '900',
  },

  progressTrack: {
    height: 8,
    borderRadius: 5,
    backgroundColor: '#E8EDF5',
    marginTop: 14,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 5,
  },

  subjectStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
  },

  subjectStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  subjectStatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },

  subjectStatLabel: {
    fontSize: 9,
    color: colors.subtext,
  },

  subjectStatValue: {
    marginLeft: 3,
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
  },

  subjectWarning: {
    marginTop: 12,
    borderRadius: 11,
    padding: 9,
    backgroundColor: '#FFFBEB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  subjectWarningText: {
    fontSize: 10,
    color: '#B45309',
    fontWeight: '700',
  },

  concernHero: {
    marginTop: 15,
    backgroundColor: '#F5F3FF',
    borderRadius: 20,
    padding: 17,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  concernHeroIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  concernHeroTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },

  concernHeroText: {
    textAlign: 'center',
    marginTop: 5,
    fontSize: 11,
    lineHeight: 16,
    color: colors.subtext,
  },

  concernList: {
    marginTop: 14,
  },

  concernCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 9,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    flexDirection: 'row',
  },

  concernStatusStrip: {
    width: 4,
  },

  concernCardContent: {
    flex: 1,
    padding: 13,
  },

  concernCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  concernSubject: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },

  concernDate: {
    marginTop: 3,
    fontSize: 10,
    color: colors.subtext,
  },

  raiseConcernButton: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  raiseConcernText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
  },

  toolsSection: {
    marginTop: 24,
  },

  markTabs: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 10,
  },

  markTab: {
    flex: 1,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  markTabActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },

  markTabText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },

  markTabTextActive: {
    color: colors.primary,
  },

  markCard: {
    borderRadius: 19,
    padding: 15,
  },

  markCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  markCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  markCardText: {
    flex: 1,
    marginLeft: 10,
  },

  markCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },

  markCardDescription: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
    color: colors.subtext,
  },

  primaryButton: {
    marginTop: 14,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  stopScanButton: {
    marginTop: 9,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  stopScanButtonText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },

  bluetoothSettingsButton: {
    marginTop: 10,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  bluetoothSettingsText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  secondaryButton: {
    marginTop: 14,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  secondaryButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  closeCameraButton: {
    marginTop: 9,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  closeCameraButtonText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },

  scanningBox: {
    marginTop: 14,
    padding: 15,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
  },

  scanningPulse: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.primary,
    marginBottom: 8,
  },

  scanningTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
  },

  scanningText: {
    marginTop: 3,
    fontSize: 10,
    textAlign: 'center',
    color: colors.subtext,
  },

  statusLine: {
    marginTop: 13,
    borderRadius: 13,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusLineText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
  },

  cameraBox: {
    marginTop: 14,
    height: 270,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },

  qrOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  qrCornerTopLeft: {
    position: 'absolute',
    top: '25%',
    left: '17%',
    width: 35,
    height: 35,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#FFFFFF',
  },

  qrCornerTopRight: {
    position: 'absolute',
    top: '25%',
    right: '17%',
    width: 35,
    height: 35,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FFFFFF',
  },

  qrCornerBottomLeft: {
    position: 'absolute',
    bottom: '25%',
    left: '17%',
    width: 35,
    height: 35,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#FFFFFF',
  },

  qrCornerBottomRight: {
    position: 'absolute',
    bottom: '25%',
    right: '17%',
    width: 35,
    height: 35,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FFFFFF',
  },

  qrHint: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  outcomeBanner: {
    marginTop: 12,
    padding: 11,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  outcomeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
  },

  emptyCard: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 30,
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },

  emptyText: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 11,
    color: colors.subtext,
  },

  footerInfo: {
    marginTop: 20,
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerInfoText: {
    marginLeft: 7,
    fontSize: 10,
    color: '#15803D',
    fontWeight: '700',
  },

  /* MODAL */

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.48)',
    justifyContent: 'flex-end',
  },

  concernModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    paddingBottom: 28,
  },

  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    marginBottom: 17,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },

  modalSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: colors.subtext,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalLabel: {
    marginTop: 17,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },

  reasonOption: {
    minHeight: 43,
    borderRadius: 12,
    paddingHorizontal: 11,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  reasonOptionActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#C4B5FD',
  },

  radioOuter: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  radioOuterActive: {
    borderColor: '#7C3AED',
  },

  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#7C3AED',
  },

  reasonText: {
    flex: 1,
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '600',
  },

  reasonTextActive: {
    color: '#6D28D9',
    fontWeight: '800',
  },

  concernInput: {
    minHeight: 90,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 11,
    color: colors.text,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 16,
  },

  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.subtext,
  },

  submitConcernButton: {
    flex: 1.5,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  submitConcernText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});