import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

console.log('[SUPABASE URL]', url);

export const supabaseConfigError =
  !url || !anon
    ? 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Add them to your .env file and restart Metro.'
    : null;

if (supabaseConfigError) {
  console.error('[Supabase] ' + supabaseConfigError);
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anon || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 5,
      },
    },
  }
);

/* =========================================================
   CORE TYPES
   PostgreSQL bigint IDs are represented as number in JS/TS.
   auth.users.id remains UUID => string.
   ========================================================= */

export type Institution = {
  id: number;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  active?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export type Profile = {
  id: number;
  user_id: string;
  full_name: string;
  email: string;
  avatar?: string | null;
  role: string;
  institution_id?: number | null;
  phone?: string | null;
  active?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export type Admin = {
  id: number;
  user_id?: string | null;
  institution_id?: number | null;
  name: string;
  email: string;
  role: string;
  department?: string | null;
  phone?: string | null;
  active?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export type Teacher = {
  id: number;
  user_id?: string | null;
  institution_id?: number | null;
  name: string;
  email?: string | null;
  department?: string | null;
  phone?: string | null;
  avatar?: string | null;
  active?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export type Student = {
  id: number;
  user_id?: string | null;
  institution_id?: number | null;
  name: string;
  roll_no: string;
  email?: string | null;
  branch?: string | null;
  semester?: number | null;
  cgpa?: number | null;
  phone?: string | null;
  avatar?: string | null;
  active?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export type Subject = {
  id: number;
  institution_id: number;
  code: string;
  name: string;
  color?: string | null;
};

export type ClassSlot = {
  id: number;
  institution_id?: number | null;
  subject_id: number;
  teacher_id?: number | null;
  day_of_week?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  class_name?: string | null;
  active?: boolean | null;
  created_at?: string;
};

export type Enrollment = {
  id: number;
  institution_id?: number | null;
  student_id: number;
  subject_id: number;
  class_id?: number | null;
  active?: boolean | null;
  enrolled_at?: string;
};

/* =========================================================
   ATTENDANCE
   ========================================================= */

export type AttendanceRow = {
  id: number;
  student_id: number;
  subject_id: number;
  class_id?: number | null;
  session_id?: number | null;
  class_date: string;
  status: string;
  method?: string | null;
  marked_by?: number | null;
  created_at?: string;
};

export type AttendanceSession = {
  id: number;
  institution_id: number;
  class_id?: number | null;
  subject_id: number;
  teacher_id: number;
  status: 'active' | 'closed' | 'expired';
  duration_seconds?: number | null;
  started_at: string;
  ended_at?: string | null;
  created_at?: string;
};

export type AttendanceSessionSecret = {
  session_id: number;
  secret: string;
  created_at?: string;
};

export type AttendanceVerification = {
  id: number;
  session_id: number;
  student_id: number;
  method: 'ble' | 'qr' | 'manual' | string;
  result:
    | 'verified'
    | 'duplicate'
    | 'expired'
    | 'invalid_code'
    | 'not_enrolled'
    | 'error'
    | string;
  code_used?: string | null;
  verified_at: string;
};

/* =========================================================
   ACADEMIC
   ========================================================= */

export type Assignment = {
  id: number;
  institution_id?: number | null;
  subject_id: number;
  teacher_id?: number | null;
  title: string;
  description?: string | null;
  due_date?: string | null;
  max_marks?: number | null;
  status?: string | null;
  attachment_url?: string | null;
  created_at?: string;
};

export type Submission = {
  id: number;
  assignment_id: number;
  student_id: number;
  submitted_at?: string;
  content?: string | null;
  file_url?: string | null;
  marks?: number | null;
  feedback?: string | null;
};

export type Mark = {
  id: number;
  student_id: number;
  subject_id: number;
  assessment_name: string;
  score: number;
  max_score: number;
};

export type ExamRow = {
  id: number;
  title: string;
  subject_id?: number | null;
  exam_type: string;
  date?: string | null;
  duration: number;
  venue?: string | null;
  total_marks: number;
  status: string;
  created_at?: string;
};

export type Quiz = {
  id: number;
  subject_id: number;
  teacher_id?: number | null;
  title: string;
  questions: number;
  duration: number;
  scheduled_at?: string | null;
};

export type SyllabusTopic = {
  id: number;
  subject_id: number;
  unit: string;
  topic: string;
  completed: boolean;
};

export type Resource = {
  id: number;
  subject_id: number;
  teacher_id?: number | null;
  title: string;
  type: string;
  url?: string | null;
  size?: string | null;
  created_at?: string;
};

/* =========================================================
   COMMUNICATION
   ========================================================= */

export type Notification = {
  id: number;
  user_role: string;
  user_ref?: number | null;
  title: string;
  body?: string | null;
  type?: string | null;
  unread?: boolean | null;
  created_at?: string;
};

export type Announcement = {
  id: number;
  subject_id?: number | null;
  teacher_id?: number | null;
  title: string;
  body?: string | null;
  created_at?: string;
};

export type AdminAnnouncement = {
  id: number;
  title: string;
  body?: string | null;
  audience: string;
  posted_by?: number | null;
  created_at?: string;
};

/* =========================================================
   OTHER
   ========================================================= */

export type LeaveRequest = {
  id: number;
  student_id: number;
  subject_id?: number | null;
  reason?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  created_at?: string;
};

export type EventRow = {
  id: number;
  title: string;
  description?: string | null;
  type: string;
  start_date?: string | null;
  end_date?: string | null;
  venue?: string | null;
  organizer?: string | null;
  status: string;
  created_at?: string;
};

export type TeacherAssignment = {
  id: number;
  teacher_id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority: string;
  status: string;
  created_at?: string;
};

export type HireRequest = {
  id: number;
  candidate_name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  department?: string | null;
  experience_years: number;
  status: string;
  notes?: string | null;
  applied_at?: string | null;
  created_at?: string;
};