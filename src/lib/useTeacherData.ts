import { useEffect, useState } from 'react';
import {
  supabase,
  Subject,
  Teacher,
  Student,
  Assignment,
  Announcement,
  SyllabusTopic,
  Resource,
  Notification,
  AttendanceRow,
  Mark,
  LeaveRequest,
  Quiz,
  ClassSlot,
  Submission,
} from './supabase';
import { useAuth } from './AuthContext';

export function useTeacherData() {
  const { profile } = useAuth();
  const teacher = (profile as Teacher) ?? null;

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [syllabus, setSyllabus] = useState<SyllabusTopic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [classes, setClasses] = useState<ClassSlot[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const loadAll = async () => {
    if (!teacher) {
      setLoading(false);
      return;
    }

    try {
      const [
        s,
        st,
        a,
        an,
        sy,
        r,
        n,
        at,
        m,
        l,
        q,
        cl,
        sub,
      ] = await Promise.all([
        supabase
          .from('subjects')
          .select('*')
          .order('code'),

        supabase
          .from('students')
          .select('*')
          .order('roll_no'),

        supabase
          .from('assignments')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('syllabus_topics')
          .select('*'),

        supabase
          .from('resources')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('notifications')
          .select('*')
          .eq('user_role', 'teacher')
          .order('created_at', { ascending: false }),

        supabase
          .from('attendance')
          .select('*'),

        supabase
          .from('marks')
          .select('*'),

        supabase
          .from('leave_requests')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('quizzes')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('classes')
          .select('*'),

        supabase
          .from('submissions')
          .select('*'),
      ]);

      setSubjects((s.data as Subject[]) ?? []);
      setStudents((st.data as Student[]) ?? []);
      setAssignments((a.data as Assignment[]) ?? []);
      setAnnouncements((an.data as Announcement[]) ?? []);
      setSyllabus((sy.data as SyllabusTopic[]) ?? []);
      setResources((r.data as Resource[]) ?? []);
      setNotifications((n.data as Notification[]) ?? []);
      setAttendance((at.data as AttendanceRow[]) ?? []);
      setMarks((m.data as Mark[]) ?? []);
      setLeaves((l.data as LeaveRequest[]) ?? []);
      setQuizzes((q.data as Quiz[]) ?? []);
      setClasses((cl.data as ClassSlot[]) ?? []);
      setSubmissions((sub.data as Submission[]) ?? []);
    } catch (error) {
      console.error('[TeacherData] loadAll error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!teacher?.id) {
      setLoading(false);
      return;
    }

    let mounted = true;

    // Initial data load
    loadAll();

    /*
     * IMPORTANT:
     * Every useTeacherData() instance gets its own channel.
     * This prevents multiple mounted teacher screens from
     * fighting over the same Supabase Realtime channel.
     */
    const channelName = `teacher-realtime-android-${teacher.id}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)

      // Assignments
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments',
        },
        () => {
          if (mounted) {
            loadAll();
          }
        }
      )

      // Announcements
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
        },
        () => {
          if (mounted) {
            loadAll();
          }
        }
      )

      // Notifications
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          if (mounted) {
            loadAll();
          }
        }
      )

      // Attendance
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
        },
        () => {
          if (mounted) {
            loadAll();
          }
        }
      )

      // Syllabus
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'syllabus_topics',
        },
        () => {
          if (mounted) {
            loadAll();
          }
        }
      )

      // Resources
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resources',
        },
        () => {
          if (mounted) {
            loadAll();
          }
        }
      )

      // Marks
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marks',
        },
        () => {
          if (mounted) {
            loadAll();
          }
        }
      )

      // Leave Requests
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
        },
        () => {
          if (mounted) {
            loadAll();
          }
        }
      )

      // Submissions
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
        },
        () => {
          if (mounted) {
            loadAll();
          }
        }
      )

      // Classes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes',
        },
        () => {
          if (mounted) {
            loadAll();
          }
        }
      );

    // VERY IMPORTANT:
    // subscribe() is called ONLY AFTER every .on() callback
    // has already been registered.
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[TeacherData] Realtime connected');
      }

      if (status === 'CHANNEL_ERROR') {
        console.warn('[TeacherData] Realtime channel error');
      }

      if (status === 'TIMED_OUT') {
        console.warn('[TeacherData] Realtime subscription timed out');
      }
    });

    return () => {
      mounted = false;

      // Remove exactly this hook's channel.
      supabase.removeChannel(channel);
    };
  }, [teacher?.id]);

  return {
    loading,
    teacher,
    subjects,
    students,
    assignments,
    announcements,
    syllabus,
    resources,
    notifications,
    attendance,
    marks,
    leaves,
    quizzes,
    classes,
    submissions,
    reload: loadAll,
  };
}

export const subjectById = (
  subjects: Subject[],
  id: number | null | undefined
) => subjects.find((s) => s.id === id);