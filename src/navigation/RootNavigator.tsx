import React, { useEffect, useRef } from 'react';
import AdminManagementScreen from '../screens/admin/AdminManagementScreen';
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth, type Role } from '../lib/AuthContext';
import { ScreenLoader, colors } from '../components/ui';

import LoginScreen from '../screens/auth/LoginScreen';
import StudentSignUpScreen from '../screens/auth/StudentSignUpScreen';

import StudentDashboard from '../screens/student/StudentDashboard';
import StudentAttendanceScreen from '../screens/student/StudentAttendanceScreen';
import StudentTimetableScreen from '../screens/student/StudentTimetableScreen';
import StudentAssignmentsScreen from '../screens/student/StudentAssignmentsScreen';
import StudentMarksScreen from '../screens/student/StudentMarksScreen';
import StudentNotificationsScreen from '../screens/student/StudentNotificationsScreen';

import TeacherDashboard from '../screens/teacher/TeacherDashboard';
import TeacherAttendanceSessionScreen from '../screens/teacher/TeacherAttendanceSessionScreen';
import TeacherTimetableScreen from '../screens/teacher/TeacherTimetableScreen';
import TeacherClassesScreen from '../screens/teacher/TeacherClassesScreen';
import TeacherGradingScreen from '../screens/teacher/TeacherGradingScreen';
import TeacherNotificationsScreen from '../screens/teacher/TeacherNotificationsScreen';

import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminPeopleScreen from '../screens/admin/AdminPeopleScreen';
import ProfileScreen from '../screens/ProfileScreen';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: { role: Role };
  RoleSelect: undefined;
  StudentSignUp: undefined;
};

export type StudentTabParamList = {
  Dashboard: undefined;
  Attendance: undefined;
  Timetable: undefined;
  Assignments: undefined;
  Marks: undefined;
  Alerts: undefined;
  Profile: undefined;
};

export type TeacherTabParamList = {
  Dashboard: undefined;
  Attendance: undefined;
  Timetable: undefined;
  Classes: undefined;
  Grading: undefined;
  Alerts: undefined;
  Profile: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  People: undefined;
  Management: undefined;
  Profile: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const StudentTabs = createBottomTabNavigator<StudentTabParamList>();
const TeacherTabs = createBottomTabNavigator<TeacherTabParamList>();
const AdminTabs = createBottomTabNavigator<AdminTabParamList>();

const roleMeta: Record<
  Role,
  {
    title: string;
    description: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    color: string;
    soft: string;
    badge: string;
    features: string[];
  }
> = {
  student: {
    title: 'Student',
    description: 'Access your classes, attendance, marks, timetable and more.',
    icon: 'school-outline',
    color: '#4F46E5',
    soft: '#EEF2FF',
    badge: 'Student Access',
    features: ['View timetable', 'Check attendance', 'See marks & results', 'Exam & notices'],
  },
  teacher: {
    title: 'Teacher',
    description: 'Manage your classes, take attendance, create assignments and more.',
    icon: 'school-outline',
    color: '#0F9D78',
    soft: '#EAFBF5',
    badge: 'Teacher Access',
    features: ['Manage classes', 'Take attendance', 'Create assignments', 'View reports'],
  },
  admin: {
    title: 'Admin',
    description: 'Full access to institution users, reports, settings and management.',
    icon: 'shield-account-outline',
    color: '#7C3AED',
    soft: '#F1ECFF',
    badge: 'Admin Only',
    features: ['Manage users', 'Institute settings', 'Overall reports', 'System control'],
  },
};

function WelcomeScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Welcome'>) {
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entrance, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatA, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(floatA, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatB, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(floatB, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, [entrance, floatA, floatB, glow]);

  const openContact = async () => {
    try {
      const supported = await Linking.canOpenURL('mailto:');
      if (supported) {
        await Linking.openURL('mailto:admin@edutrack.ai?subject=EduTrack%20Admin%20Support');
        return;
      }
    } catch {}
    Alert.alert('Contact Admin', 'Please contact your institution administrator for access.');
  };

  const chooseRole = (role: Role) => navigation.navigate('Login', { role });

  return (
    <View style={styles.welcomeScreen}>
      <Animated.View
        style={[
          styles.welcomeAnimated,
          {
            opacity: entrance,
            transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
      >
        <View style={styles.heroFull}>
          <Animated.View
            style={[
              styles.decorCircleOne,
              { transform: [{ translateY: floatA.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) }] },
            ]}
          />
          <Animated.View
            style={[
              styles.decorCircleTwo,
              { transform: [{ translateY: floatB.interpolate({ inputRange: [0, 1], outputRange: [0, 15] }) }] },
            ]}
          />
          <Animated.View
            style={[
              styles.decorGlow,
              { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.34] }) },
            ]}
          />

          <View style={styles.brandPillFull}>
            <View style={styles.brandIconFull}>
              <MaterialCommunityIcons name="school-outline" size={21} color="#FFFFFF" />
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brandNameFull}>EduTrack AI</Text>
              <Text style={styles.brandMini}>SMART EDUCATION PLATFORM</Text>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>SMART</Text>
            </View>
          </View>

          <Text style={styles.heroTitleFull}>
            Track · <Text style={styles.heroAccent}>Learn · Grow</Text>
          </Text>
          <Text style={styles.heroSubtitleFull}>
            One smart platform for students, teachers and institutions.
          </Text>

          <View style={styles.featureRowFull}>
            <HeroFeature icon="calendar-check-outline" label="Attendance" />
            <HeroFeature icon="calendar-month-outline" label="Classes" />
            <HeroFeature icon="file-document-outline" label="Results" />
            <HeroFeature icon="bell-outline" label="Updates" />
          </View>
        </View>

        <View style={styles.mainFull}>
          <View style={styles.chooseHeaderFull}>
            <View style={styles.chooseLine} />
            <View style={styles.chooseCenter}>
              <Text style={styles.chooseTitleFull}>Choose your login</Text>
              <Text style={styles.chooseSubtitleFull}>Select your role to continue</Text>
            </View>
            <View style={styles.chooseLine} />
          </View>

          <View style={styles.roleRowFull}>
            <CompactRoleCard role="student" onPress={() => chooseRole('student')} />
            <CompactRoleCard role="teacher" onPress={() => chooseRole('teacher')} />
            <CompactRoleCard role="admin" onPress={() => chooseRole('admin')} />
          </View>

          <View style={styles.bottomAreaFull}>
            <View style={styles.accessNoteFull}>
              <View style={styles.accessIconFull}>
                <MaterialCommunityIcons name="shield-check-outline" size={17} color="#4F46E5" />
              </View>
              <View style={styles.accessCopyFull}>
                <Text style={styles.accessTitleFull}>Secure institution access</Text>
                <Text style={styles.accessTextFull}>Teacher & Admin accounts are granted by your institution.</Text>
              </View>
              <Pressable style={styles.contactButtonFull} onPress={openContact}>
                <Text style={styles.contactTextFull}>Contact</Text>
                <MaterialCommunityIcons name="arrow-right" size={14} color="#4F46E5" />
              </Pressable>
            </View>

            <View style={styles.trustRowFull}>
              <TrustItem icon="lock-outline" text="Secure" />
              <TrustItem icon="cloud-check-outline" text="Connected" />
              <TrustItem icon="flash-outline" text="Fast" />
              <TrustItem icon="school-outline" text="Education" />
            </View>

            <View style={styles.footerBrandRow}>
              <View style={styles.footerDot} />
              <Text style={styles.footerFull}>Made for a smarter education ·Built with ❤️ by Amit x infynix </Text>
              <View style={styles.footerDot} />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function CompactRoleCard({ role, onPress }: { role: Role; onPress: () => void }) {
  const meta = roleMeta[role];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.compactRoleCardFull, { borderTopColor: meta.color }, pressed && styles.roleCardPressed]}
    >
      <View style={[styles.compactRoleIconFull, { backgroundColor: meta.soft }]}>
        <MaterialCommunityIcons name={meta.icon} size={28} color={meta.color} />
      </View>
      <Text style={styles.compactRoleTitleFull}>{meta.title}</Text>
      <Text style={styles.compactRoleDescriptionFull} numberOfLines={1}>
        {role === 'student' ? 'Learn & track' : role === 'teacher' ? 'Teach & manage' : 'Control & manage'}
      </Text>
      <View style={[styles.compactContinueFull, { backgroundColor: meta.color }]}>
        <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

function TrustItem({ icon, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }) {
  return (
    <View style={styles.trustItemFull}>
      <MaterialCommunityIcons name={icon} size={13} color="#98A2B3" />
      <Text style={styles.trustTextFull}>{text}</Text>
    </View>
  );
}

function HeroFeature({
  icon,
  label,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.heroFeature}>
      <View style={styles.heroFeatureIcon}>
        <MaterialCommunityIcons name={icon} size={14} color="#DCE5FF" />
      </View>
      <Text style={styles.heroFeatureText}>{label}</Text>
    </View>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="StudentSignUp" component={StudentSignUpScreen} />
    </AuthStack.Navigator>
  );
}

const baseTabOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.subtext,
  tabBarHideOnKeyboard: true,
  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  tabBarStyle: {
    height: 66,
    paddingTop: 7,
    paddingBottom: 7,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  tabBarItemStyle: {
    borderRadius: 14,
    marginHorizontal: 2,
  },
};

function iconForRoute(routeName: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const icons: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    Dashboard: 'home-outline',
    Attendance: 'calendar-check-outline',
    Timetable: 'calendar-month-outline',
    Assignments: 'clipboard-text-outline',
    Marks: 'chart-line',
    Alerts: 'bell-outline',
    Profile: 'account-outline',
    Classes: 'google-classroom',
    Grading: 'clipboard-check-outline',
    People: 'account-group-outline',
    Management: 'view-dashboard-outline',
  };
  return icons[routeName] ?? 'circle-outline';
}

function withIcons({ route }: { route: { name: string } }): BottomTabNavigationOptions {
  return {
    ...baseTabOptions,
    tabBarIcon: ({ color, size, focused }) => (
      <View style={focused ? styles.tabIconFocused : styles.tabIcon}>
        <MaterialCommunityIcons name={iconForRoute(route.name)} size={size} color={color} />
      </View>
    ),
  };
}

function StudentApp() {
  return (
    <StudentTabs.Navigator screenOptions={withIcons}>
      <StudentTabs.Screen name="Dashboard" component={StudentDashboard} options={{ title: 'Home' }} />
      <StudentTabs.Screen name="Attendance" component={StudentAttendanceScreen} />
      <StudentTabs.Screen name="Timetable" component={StudentTimetableScreen} options={{ title: 'Schedule' }} />
      <StudentTabs.Screen name="Assignments" component={StudentAssignmentsScreen} />
      <StudentTabs.Screen name="Marks" component={StudentMarksScreen} options={{ title: 'Results' }} />
      <StudentTabs.Screen name="Alerts" component={StudentNotificationsScreen} options={{ title: 'Alerts' }} />
      <StudentTabs.Screen name="Profile" component={ProfileScreen} />
    </StudentTabs.Navigator>
  );
}

function TeacherApp() {
  return (
    <TeacherTabs.Navigator screenOptions={withIcons}>
      <TeacherTabs.Screen name="Dashboard" component={TeacherDashboard} options={{ title: 'Home' }} />
      <TeacherTabs.Screen name="Attendance" component={TeacherAttendanceSessionScreen} />
      <TeacherTabs.Screen name="Timetable" component={TeacherTimetableScreen} options={{ title: 'Schedule' }} />
      <TeacherTabs.Screen name="Classes" component={TeacherClassesScreen} />
      <TeacherTabs.Screen name="Grading" component={TeacherGradingScreen} />
      <TeacherTabs.Screen name="Alerts" component={TeacherNotificationsScreen} options={{ title: 'Alerts' }} />
      <TeacherTabs.Screen name="Profile" component={ProfileScreen} />
    </TeacherTabs.Navigator>
  );
}

function AdminApp() {
  return (
    <AdminTabs.Navigator screenOptions={withIcons}>
      <AdminTabs.Screen
        name="Dashboard"
        component={AdminDashboard}
        options={{ title: 'Home' }}
      />

      <AdminTabs.Screen
        name="People"
        component={AdminPeopleScreen}
      />

      <AdminTabs.Screen
        name="Management"
        component={AdminManagementScreen}
      />

      <AdminTabs.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </AdminTabs.Navigator>
  );
}

export default function RootNavigator() {
  const { loading, role } = useAuth();

  if (loading) {
    return <ScreenLoader label="Loading EduTrack AI…" />;
  }

  return (
    <NavigationContainer>
      {role === 'student' ? <StudentApp /> : null}
      {role === 'teacher' ? <TeacherApp /> : null}
      {role === 'admin' ? <AdminApp /> : null}
      {!role ? <AuthNavigator /> : null}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  welcomeScreen: { flex: 1, backgroundColor: '#F7F8FC' },
  welcomeAnimated: { flex: 1 },
  heroFull: {
    flex: 0.47,
    minHeight: 255,
    backgroundColor: '#101F43',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  decorCircleOne: {
    position: 'absolute', width: 205, height: 205, borderRadius: 103,
    right: -78, top: -92, backgroundColor: 'rgba(79,70,229,0.22)',
  },
  decorCircleTwo: {
    position: 'absolute', width: 165, height: 165, borderRadius: 83,
    left: -78, bottom: -92, backgroundColor: 'rgba(16,185,129,0.14)',
  },
  decorGlow: {
    position: 'absolute', width: 125, height: 125, borderRadius: 63,
    backgroundColor: 'rgba(167,243,208,0.12)', top: 75, right: 28,
  },
  brandPillFull: { flexDirection: 'row', alignItems: 'center', marginBottom: 11, zIndex: 2 },
  brandIconFull: {
    width: 40, height: 40, borderRadius: 13, backgroundColor: '#4F46E5',
    alignItems: 'center', justifyContent: 'center', marginRight: 9,
  },
  brandCopy: { minWidth: 125 },
  brandNameFull: { color: '#FFFFFF', fontSize: 16.5, fontWeight: '900', letterSpacing: 0.2 },
  brandMini: { color: '#7F8EAA', fontSize: 6.5, fontWeight: '800', letterSpacing: 1, marginTop: 1 },
  livePill: {
    marginLeft: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
    paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399', marginRight: 5 },
  liveText: { color: '#A7F3D0', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  heroTitleFull: { color: '#FFFFFF', fontSize: 29, fontWeight: '900', letterSpacing: -0.9, textAlign: 'center', zIndex: 2 },
  heroAccent: { color: '#A7F3D0' },
  heroSubtitleFull: { color: '#B7C2D9', fontSize: 10.5, lineHeight: 15, textAlign: 'center', marginTop: 5, maxWidth: 315, zIndex: 2 },
  featureRowFull: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, zIndex: 2 },
  heroFeature: { flex: 1, alignItems: 'center' },
  heroFeatureIcon: { width: 33, height: 33, borderRadius: 10, backgroundColor: '#1C2D55', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroFeatureText: { color: '#AEB9CF', fontSize: 8, lineHeight: 10, fontWeight: '700', textAlign: 'center' },
  mainFull: { flex: 0.53, paddingHorizontal: 13, paddingTop: 12, paddingBottom: 7, justifyContent: 'space-between' },
  chooseHeaderFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  chooseLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  chooseCenter: { paddingHorizontal: 11, alignItems: 'center' },
  chooseTitleFull: { color: '#25304A', fontSize: 19, fontWeight: '900' },
  chooseSubtitleFull: { color: '#98A2B3', fontSize: 8.5, marginTop: 2 },
  roleRowFull: { flexDirection: 'row', gap: 8 },
  compactRoleCardFull: {
    flex: 1, minHeight: 148, borderRadius: 17, borderWidth: 1, borderColor: '#E5E7EB', borderTopWidth: 4,
    backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 10, alignItems: 'center',
    shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  compactRoleIconFull: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  compactRoleTitleFull: { color: '#344054', fontSize: 14, fontWeight: '900', marginTop: 8 },
  compactRoleDescriptionFull: { color: '#98A2B3', fontSize: 8, textAlign: 'center', marginTop: 3, maxWidth: 90 },
  compactContinueFull: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 11 },
  roleCardPressed: { opacity: 0.86, transform: [{ scale: 0.97 }] },
  bottomAreaFull: { marginTop: 10 },
  accessNoteFull: {
    minHeight: 55, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7EAF0',
    paddingHorizontal: 9, paddingVertical: 8, flexDirection: 'row', alignItems: 'center',
  },
  accessIconFull: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  accessCopyFull: { flex: 1, marginHorizontal: 8 },
  accessTitleFull: { color: '#475467', fontSize: 9, fontWeight: '900' },
  accessTextFull: { color: '#98A2B3', fontSize: 7.2, marginTop: 2 },
  contactButtonFull: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 7, borderRadius: 9, backgroundColor: '#EEF2FF' },
  contactTextFull: { color: '#4F46E5', fontSize: 8, fontWeight: '900', marginRight: 3 },
  trustRowFull: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 9 },
  trustItemFull: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustTextFull: { color: '#98A2B3', fontSize: 7.5, fontWeight: '700' },
  footerBrandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  footerDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#C7CDD8', marginHorizontal: 7 },
  footerFull: { textAlign: 'center', color: '#B0B7C5', fontSize: 7.5 },
  tabIcon: { width: 34, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  tabIconFocused: { width: 38, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primaryLight },
  pressed: { opacity: 0.7 },
});

