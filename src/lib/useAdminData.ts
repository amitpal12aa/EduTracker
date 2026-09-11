import { useEffect, useRef, useState } from 'react';
import {
  supabase,
  Subject,
  Teacher,
  Student,
  Admin,
  EventRow,
  TeacherAssignment,
  ExamRow,
  HireRequest,
  AdminAnnouncement,
  ClassSlot,
  Enrollment,
} from './supabase';

export function useAdminData() {
  const [loading, setLoading] = useState(true);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [classes, setClasses] = useState<ClassSlot[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [work, setWork] = useState<TeacherAssignment[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [hires, setHires] = useState<HireRequest[]>([]);
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);

  const channelName = useRef(
    `admin-realtime-${Math.random().toString(36).slice(2, 10)}`
  ).current;

  const load = async () => {
    try {
      setLoading(true);

      const [
        subjectsResult,
        teachersResult,
        studentsResult,
        adminsResult,
        classesResult,
        enrollmentsResult,
        eventsResult,
        teacherAssignmentsResult,
        examsResult,
        hiresResult,
        announcementsResult,
      ] = await Promise.all([
        supabase
          .from('subjects')
          .select('*')
          .order('code', { ascending: true }),

        supabase
          .from('teachers')
          .select('*')
          .order('name', { ascending: true }),

        supabase
          .from('students')
          .select('*')
          .order('roll_no', { ascending: true }),

        supabase
          .from('admins')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('classes')
          .select('*')
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true }),

        supabase
          .from('enrollments')
          .select('*')
          .order('enrolled_at', { ascending: false }),

        supabase
          .from('events')
          .select('*')
          .order('start_date', { ascending: true }),

        supabase
          .from('teacher_assignments')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('exams')
          .select('*')
          .order('date', { ascending: true }),

        supabase
          .from('hire_requests')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('admin_announcements')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (subjectsResult.error) {
        console.error('[AdminData] subjects:', subjectsResult.error);
      }

      if (teachersResult.error) {
        console.error('[AdminData] teachers:', teachersResult.error);
      }

      if (studentsResult.error) {
        console.error('[AdminData] students:', studentsResult.error);
      }

      if (adminsResult.error) {
        console.error('[AdminData] admins:', adminsResult.error);
      }

      if (classesResult.error) {
        console.error('[AdminData] classes:', classesResult.error);
      }

      if (enrollmentsResult.error) {
        console.error('[AdminData] enrollments:', enrollmentsResult.error);
      }

      if (eventsResult.error) {
        console.error('[AdminData] events:', eventsResult.error);
      }

      if (teacherAssignmentsResult.error) {
        console.error(
          '[AdminData] teacher_assignments:',
          teacherAssignmentsResult.error
        );
      }

      if (examsResult.error) {
        console.error('[AdminData] exams:', examsResult.error);
      }

      if (hiresResult.error) {
        console.error('[AdminData] hire_requests:', hiresResult.error);
      }

      if (announcementsResult.error) {
        console.error(
          '[AdminData] admin_announcements:',
          announcementsResult.error
        );
      }

      setSubjects((subjectsResult.data as Subject[]) ?? []);
      setTeachers((teachersResult.data as Teacher[]) ?? []);
      setStudents((studentsResult.data as Student[]) ?? []);
      setAdmins((adminsResult.data as Admin[]) ?? []);
      setClasses((classesResult.data as ClassSlot[]) ?? []);
      setEnrollments((enrollmentsResult.data as Enrollment[]) ?? []);
      setEvents((eventsResult.data as EventRow[]) ?? []);
      setWork(
        (teacherAssignmentsResult.data as TeacherAssignment[]) ?? []
      );
      setExams((examsResult.data as ExamRow[]) ?? []);
      setHires((hiresResult.data as HireRequest[]) ?? []);
      setAnnouncements(
        (announcementsResult.data as AdminAnnouncement[]) ?? []
      );
    } catch (error) {
      console.error('[AdminData] load failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subjects',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teachers',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admins',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrollments',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_assignments',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exams',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hire_requests',
        },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_announcements',
        },
        load
      )
      .subscribe((status) => {
        console.log('[AdminRealtime]', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName]);

  return {
    loading,

    subjects,
    teachers,
    students,
    admins,

    classes,
    enrollments,

    events,
    work,
    exams,
    hires,
    announcements,

    reload: load,
  };
}

export const subjectById = (
  subjects: Subject[],
  id: number | null | undefined
) => {
  return subjects.find((subject) => subject.id === id);
};

export const teacherById = (
  teachers: Teacher[],
  id: number | null | undefined
) => {
  return teachers.find((teacher) => teacher.id === id);
};

export const studentById = (
  students: Student[],
  id: number | null | undefined
) => {
  return students.find((student) => student.id === id);
};

export const classById = (
  classes: ClassSlot[],
  id: number | null | undefined
) => {
  return classes.find((item) => item.id === id);
};