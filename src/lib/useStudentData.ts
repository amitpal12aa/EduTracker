import { useEffect, useRef, useState } from 'react';
import { supabase, Subject, Assignment, Announcement, Notification, Resource, SyllabusTopic, Mark, AttendanceRow, ClassSlot, Submission } from './supabase';
import { useAuth } from './AuthContext';

export function useStudentData() {
  const { profile } = useAuth();
  const studentId = profile?.id;

  const channelId = useRef(
    `student-realtime-android-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [syllabus, setSyllabus] = useState<SyllabusTopic[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  // Added for Android only — the `classes` table already exists in your
  // schema but the website's useStudentData never queries it (its
  // Timetable page renders random/hardcoded slots instead). This adds a
  // real query against an existing table; it doesn't touch the website's
  // copy of this hook or any table definition.
  const [classes, setClasses] = useState<ClassSlot[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const load = async () => {
    const sid = studentId;
    const [s, a, an, n, r, sy, m, at, cl, sub] = await Promise.all([
      supabase.from('subjects').select('*').order('code'),
      supabase.from('assignments').select('*').order('created_at', { ascending: false }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      sid
        ? supabase.from('notifications').select('*').or(`user_ref.eq.${sid},user_ref.is.null`).eq('user_role', 'student').order('created_at', { ascending: false })
        : supabase.from('notifications').select('*').eq('user_role', 'student').order('created_at', { ascending: false }),
      supabase.from('resources').select('*').order('created_at', { ascending: false }),
      supabase.from('syllabus_topics').select('*'),
      sid ? supabase.from('marks').select('*').eq('student_id', sid) : Promise.resolve({ data: [] as Mark[] }),
      sid ? supabase.from('attendance').select('*').eq('student_id', sid) : Promise.resolve({ data: [] as AttendanceRow[] }),
      supabase.from('classes').select('*'),
      sid ? supabase.from('submissions').select('*').eq('student_id', sid) : Promise.resolve({ data: [] as Submission[] }),
    ]);
    setSubjects((s.data as Subject[]) ?? []);
    setAssignments((a.data as Assignment[]) ?? []);
    setAnnouncements((an.data as Announcement[]) ?? []);
    setNotifications((n.data as Notification[]) ?? []);
    setResources((r.data as Resource[]) ?? []);
    setSyllabus((sy.data as SyllabusTopic[]) ?? []);
    setMarks((m.data as Mark[]) ?? []);
    setAttendance((at.data as AttendanceRow[]) ?? []);
    setClasses((cl.data as ClassSlot[]) ?? []);
    setSubmissions((sub.data as Submission[]) ?? []);
    setLoading(false);
  };

useEffect(() => {
  if (!studentId) {
    setLoading(false);
    return;
  }

  load();

  const channel = supabase
    .channel(channelId.current)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'assignments' },
      () => load()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'announcements' },
      () => load()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      () => load()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'resources' },
      () => load()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'syllabus_topics' },
      () => load()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'marks' },
      () => load()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'attendance' },
      () => load()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'classes' },
      () => load()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'submissions' },
      () => load()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [studentId]);

  return { loading, studentId, student: profile, subjects, assignments, announcements, notifications, resources, syllabus, marks, attendance, classes, submissions, reload: load };
}
