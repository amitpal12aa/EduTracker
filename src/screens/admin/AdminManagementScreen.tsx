import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '../../components/ui';
import {
  supabase,
  Subject,
  ClassSlot,
  Enrollment,
  ExamRow,
  EventRow,
} from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { useAdminData } from '../../lib/useAdminData';

type Selector =
  | 'subject'
  | 'teacher'
  | 'day'
  | 'student'
  | 'enrollmentSubject'
  | 'enrollmentClass'
  | 'examSubject'
  | 'examType'
  | 'examStatus'
  | 'eventType'
  | 'eventStatus'
  | null;

type ModuleType =
  | 'subjects'
  | 'classes'
  | 'enrollments'
  | 'exams'
  | 'events'
  | null;

  type SelectorType =
  | 'eventType'
  | null;

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const [eventType, setEventType] = useState('Academic');

const normalizeTime = (value: string) => {
  const v = value.trim();
  return /^\d{2}:\d{2}$/.test(v) ? `${v}:00` : v;
};

const displayTime = (value?: string | null) =>
  value ? value.slice(0, 5) : '--:--';

const isValidTime = (value: string) =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());

const timeToMinutes = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
};

const dayName = (value?: number | null) =>
  DAYS.find((day) => day.value === value)?.label ?? 'Unknown';

export default function AdminManagementScreen() {
  const { profile } = useAuth();

  const {
    subjects,
    teachers,
    students,
    classes,
    enrollments,
    exams,
    events,
    loading,
    reload,
  } = useAdminData();

  const institutionId = profile?.institution_id ?? null;

  // =========================================================
  // INSTITUTION FILTERS
  // =========================================================

  const institutionSubjects = useMemo(
    () =>
      subjects.filter(
        (item) => item.institution_id === institutionId
      ),
    [subjects, institutionId]
  );

  const institutionTeachers = useMemo(
    () =>
      teachers.filter(
        (item) => item.institution_id === institutionId
      ),
    [teachers, institutionId]
  );

  const institutionStudents = useMemo(
    () =>
      students.filter(
        (item) => item.institution_id === institutionId
      ),
    [students, institutionId]
  );

  const institutionClasses = useMemo(
    () =>
      classes.filter(
        (item) => item.institution_id === institutionId
      ),
    [classes, institutionId]
  );

  const institutionEnrollments = useMemo(
    () =>
      enrollments.filter(
        (item) => item.institution_id === institutionId
      ),
    [enrollments, institutionId]
  );

  /*
   * exams table does not currently expose institution_id.
   * Therefore exams are scoped through their subject.
   */
  const institutionExams = useMemo(
    () =>
      exams.filter((exam) =>
        institutionSubjects.some(
          (subject) =>
            String(subject.id) === String(exam.subject_id)
        )
      ),
    [exams, institutionSubjects]
  );

  const institutionEvents = useMemo(
  () =>
    events.filter((event) => {
      // Events table currently has no institution_id.
      // Keep events visible through the admin institution scope
      // supplied by useAdminData / RLS.
      return true;
    }),
  [events]
);

  const activeEnrollmentCount =
    institutionEnrollments.filter(
      (item) => item.active !== false
    ).length;

  // =========================================================
  // MODULE
  // =========================================================

  const [activeModule, setActiveModule] =
    useState<ModuleType>(null);

    const [selector, setSelector] = useState<
  | 'subject'
  | 'teacher'
  | 'day'
  | 'student'
  | 'enrollmentSubject'
  | 'enrollmentClass'
  | 'examSubject'
  | 'examType'
  | 'examStatus'
  | 'eventType'
  | 'eventStatus'
  | null
>(null);

  // =========================================================
  // SUBJECT STATE
  // =========================================================

  const [subjectModal, setSubjectModal] = useState(false);

  const [editingSubject, setEditingSubject] =
    useState<Subject | null>(null);

  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');

  // =========================================================
  // CLASS STATE
  // =========================================================

  const [classModal, setClassModal] = useState(false);

  const [editingClass, setEditingClass] =
    useState<ClassSlot | null>(null);

  const [selectedSubjectId, setSelectedSubjectId] =
    useState<number | null>(null);

  const [selectedTeacherId, setSelectedTeacherId] =
    useState<number | null>(null);

  const [selectedDay, setSelectedDay] =
    useState<number | null>(null);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');
  const [className, setClassName] = useState('');

  // =========================================================
  // ENROLLMENT STATE
  // =========================================================

  const [enrollmentModal, setEnrollmentModal] =
    useState(false);

  const [selectedStudentId, setSelectedStudentId] =
    useState<number | null>(null);

  const [
    selectedEnrollmentSubjectId,
    setSelectedEnrollmentSubjectId,
  ] = useState<number | null>(null);

  const [
    selectedEnrollmentClassId,
    setSelectedEnrollmentClassId,
  ] = useState<number | null>(null);

  // =========================================================
  // EXAM STATE
  // =========================================================

  const [examModal, setExamModal] = useState(false);

  const [editingExam, setEditingExam] =
    useState<ExamRow | null>(null);

  const [examTitle, setExamTitle] = useState('');

  const [
    selectedExamSubjectId,
    setSelectedExamSubjectId,
  ] = useState<number | null>(null);

  const [examType, setExamType] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examDuration, setExamDuration] = useState('');
  const [examVenue, setExamVenue] = useState('');
  const [examTotalMarks, setExamTotalMarks] =
    useState('');
  const [examStatus, setExamStatus] =
    useState('scheduled');

    const [eventModal, setEventModal] = useState(false);
const [editingEvent, setEditingEvent] =
  useState<EventRow | null>(null);

const [eventTitle, setEventTitle] = useState('');
const [eventDescription, setEventDescription] = useState('');

const [eventStartDate, setEventStartDate] = useState('');
const [eventEndDate, setEventEndDate] = useState('');
const [eventVenue, setEventVenue] = useState('');
const [eventOrganizer, setEventOrganizer] = useState('');
const [eventStatus, setEventStatus] =
  useState('scheduled');

  // =========================================================
  // SELECTOR
  // =========================================================

  // =========================================================
  // SUBJECT FUNCTIONS
  // =========================================================

  const openAddSubject = () => {
    setEditingSubject(null);
    setSubjectCode('');
    setSubjectName('');
    setSubjectModal(true);
  };

  const openEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectCode(subject.code);
    setSubjectName(subject.name);
    setSubjectModal(true);
  };

  const saveSubject = async () => {
    if (!institutionId) {
      Alert.alert('Error', 'Institution not found.');
      return;
    }

    const code = subjectCode.trim().toUpperCase();
    const name = subjectName.trim();

    if (!code || !name) {
      Alert.alert(
        'Missing details',
        'Enter subject code and subject name.'
      );
      return;
    }

    try {
      if (editingSubject) {
        const { error } = await supabase
          .from('subjects')
          .update({
            code,
            name,
          })
          .eq('id', editingSubject.id)
          .eq('institution_id', institutionId);

        if (error) throw error;

        Alert.alert(
          'Success',
          'Subject updated successfully.'
        );
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert({
            institution_id: institutionId,
            code,
            name,
          });

        if (error) throw error;

        Alert.alert(
          'Success',
          'Subject added successfully.'
        );
      }

      setSubjectModal(false);
      await reload();
    } catch (error: any) {
      console.error('[Admin] subject save:', error);

      Alert.alert(
        'Error',
        error?.message || 'Unable to save subject.'
      );
    }
  };

  const deleteSubject = (subject: Subject) => {
    Alert.alert(
      'Delete Subject',
      `Delete "${subject.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!institutionId) return;

            try {
              const { error } = await supabase
                .from('subjects')
                .delete()
                .eq('id', subject.id)
                .eq('institution_id', institutionId);

              if (error) throw error;

              await reload();

              Alert.alert(
                'Deleted',
                'Subject deleted successfully.'
              );
            } catch (error: any) {
              console.error(
                '[Admin] subject delete:',
                error
              );

              Alert.alert(
                'Cannot delete',
                error?.message ||
                  'This subject may already be connected with other records.'
              );
            }
          },
        },
      ]
    );
  };

  // =========================================================
  // CLASS FUNCTIONS
  // =========================================================

  const openAddClass = () => {
    setEditingClass(null);

    setSelectedSubjectId(
      institutionSubjects.length
        ? institutionSubjects[0].id
        : null
    );

    setSelectedTeacherId(
      institutionTeachers.length
        ? institutionTeachers[0].id
        : null
    );

    setSelectedDay(1);
    setStartTime('');
    setEndTime('');
    setRoom('');
    setClassName('');

    setClassModal(true);
  };

  const openEditClass = (item: ClassSlot) => {
    setEditingClass(item);

    setSelectedSubjectId(item.subject_id ?? null);
    setSelectedTeacherId(item.teacher_id ?? null);
    setSelectedDay(item.day_of_week ?? null);

    setStartTime(displayTime(item.start_time));
    setEndTime(displayTime(item.end_time));
    setRoom(item.room ?? '');
    setClassName(item.class_name ?? '');

    setClassModal(true);
  };

  const saveClass = async () => {
    if (!institutionId) {
      Alert.alert('Error', 'Institution not found.');
      return;
    }

    if (!selectedSubjectId) {
      Alert.alert('Missing details', 'Select a subject.');
      return;
    }

    if (!selectedTeacherId) {
      Alert.alert('Missing details', 'Select a teacher.');
      return;
    }

    if (selectedDay === null) {
      Alert.alert('Missing details', 'Select a day.');
      return;
    }

    const cleanStart = startTime.trim();
    const cleanEnd = endTime.trim();

    if (
      !isValidTime(cleanStart) ||
      !isValidTime(cleanEnd)
    ) {
      Alert.alert(
        'Invalid time',
        'Use 24-hour format like 09:00 or 14:30.'
      );
      return;
    }

    if (
      timeToMinutes(cleanEnd) <=
      timeToMinutes(cleanStart)
    ) {
      Alert.alert(
        'Invalid time',
        'End time must be after start time.'
      );
      return;
    }

    try {
      const payload = {
        institution_id: institutionId,
        subject_id: selectedSubjectId,
        teacher_id: selectedTeacherId,
        day_of_week: selectedDay,
        start_time: normalizeTime(cleanStart),
        end_time: normalizeTime(cleanEnd),
        room: room.trim() || null,
        class_name: className.trim() || null,
        active: true,
      };

      if (editingClass) {
        const { error } = await supabase
          .from('classes')
          .update(payload)
          .eq('id', editingClass.id)
          .eq('institution_id', institutionId);

        if (error) throw error;

        Alert.alert(
          'Success',
          'Class timetable updated successfully.'
        );
      } else {
        const { error } = await supabase
          .from('classes')
          .insert(payload);

        if (error) throw error;

        Alert.alert(
          'Success',
          'Class timetable created successfully.'
        );
      }

      setClassModal(false);
      await reload();
    } catch (error: any) {
      console.error('[Admin] class save:', error);

      Alert.alert(
        'Error',
        error?.message ||
          'Unable to save class timetable.'
      );
    }
  };

  const deleteClass = (item: ClassSlot) => {
    const subject = institutionSubjects.find(
      (s) => s.id === item.subject_id
    );

    Alert.alert(
      'Delete Class',
      `Delete ${
        subject?.name ?? 'this class'
      } timetable?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!institutionId) return;

            try {
              const { error } = await supabase
                .from('classes')
                .delete()
                .eq('id', item.id)
                .eq('institution_id', institutionId);

              if (error) throw error;

              await reload();

              Alert.alert(
                'Deleted',
                'Class timetable deleted successfully.'
              );
            } catch (error: any) {
              console.error(
                '[Admin] class delete:',
                error
              );

              Alert.alert(
                'Cannot delete',
                error?.message ||
                  'This class may already be connected with attendance or enrollments.'
              );
            }
          },
        },
      ]
    );
  };

  // =========================================================
  // ENROLLMENT FUNCTIONS
  // =========================================================

  const openAddEnrollment = () => {
    setSelectedStudentId(
      institutionStudents.length
        ? institutionStudents[0].id
        : null
    );

    setSelectedEnrollmentSubjectId(
      institutionSubjects.length
        ? institutionSubjects[0].id
        : null
    );

    setSelectedEnrollmentClassId(null);

    setEnrollmentModal(true);
  };

  const saveEnrollment = async () => {
    if (!institutionId) {
      Alert.alert('Error', 'Institution not found.');
      return;
    }

    if (!selectedStudentId) {
      Alert.alert('Missing details', 'Select a student.');
      return;
    }

    if (!selectedEnrollmentSubjectId) {
      Alert.alert('Missing details', 'Select a subject.');
      return;
    }

    if (!selectedEnrollmentClassId) {
      Alert.alert('Missing details', 'Select a class.');
      return;
    }

    try {
      const {
        data: existing,
        error: checkError,
      } = await supabase
        .from('enrollments')
        .select('id, active')
        .eq('institution_id', institutionId)
        .eq('student_id', selectedStudentId)
        .eq(
          'subject_id',
          selectedEnrollmentSubjectId
        )
        .eq(
          'class_id',
          selectedEnrollmentClassId
        )
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        if (existing.active === false) {
          const { error } = await supabase
            .from('enrollments')
            .update({
              active: true,
            })
            .eq('id', existing.id)
            .eq(
              'institution_id',
              institutionId
            );

          if (error) throw error;

          Alert.alert(
            'Success',
            'Enrollment reactivated successfully.'
          );
        } else {
          Alert.alert(
            'Already enrolled',
            'This student is already enrolled in this class.'
          );

          return;
        }
      } else {
        const { error } = await supabase
          .from('enrollments')
          .insert({
            institution_id: institutionId,
            student_id: selectedStudentId,
            subject_id: selectedEnrollmentSubjectId,
            class_id: selectedEnrollmentClassId,
            active: true,
          });

        if (error) throw error;

        Alert.alert(
          'Success',
          'Student enrolled successfully.'
        );
      }

      setEnrollmentModal(false);
      await reload();
    } catch (error: any) {
      console.error(
        '[Admin] enrollment save:',
        error
      );

      Alert.alert(
        'Error',
        error?.message ||
          'Unable to enroll student.'
      );
    }
  };

  const removeEnrollment = (item: Enrollment) => {
    const student = institutionStudents.find(
      (s) => s.id === item.student_id
    );

    const subject = institutionSubjects.find(
      (s) => s.id === item.subject_id
    );

    Alert.alert(
      'Remove Enrollment',
      `Remove ${
        student?.name ?? 'student'
      } from ${
        subject?.name ?? 'this subject'
      }?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!institutionId) return;

            try {
              const { error } = await supabase
                .from('enrollments')
                .update({
                  active: false,
                })
                .eq('id', item.id)
                .eq(
                  'institution_id',
                  institutionId
                );

              if (error) throw error;

              await reload();

              Alert.alert(
                'Removed',
                'Enrollment removed successfully.'
              );
            } catch (error: any) {
              console.error(
                '[Admin] enrollment remove:',
                error
              );

              Alert.alert(
                'Error',
                error?.message ||
                  'Unable to remove enrollment.'
              );
            }
          },
        },
      ]
    );
  };

  // =========================================================
  // EXAM FUNCTIONS
  // =========================================================

  const openAddExam = () => {
    setEditingExam(null);

    setExamTitle('');

    setSelectedExamSubjectId(
      institutionSubjects.length
        ? institutionSubjects[0].id
        : null
    );

    setExamType('Mid Term');
    setExamDate('');
    setExamDuration('60');
    setExamVenue('');
    setExamTotalMarks('100');
    setExamStatus('scheduled');

    setExamModal(true);
  };

  const openEditExam = (exam: ExamRow) => {
    setEditingExam(exam);

    setExamTitle(exam.title);

    setSelectedExamSubjectId(
      exam.subject_id
        ? Number(exam.subject_id)
        : null
    );

    setExamType(exam.exam_type || '');
    setExamDate(exam.date || '');

    setExamDuration(
      exam.duration !== undefined &&
      exam.duration !== null
        ? String(exam.duration)
        : ''
    );

    setExamVenue(exam.venue || '');

    setExamTotalMarks(
      exam.total_marks !== undefined &&
      exam.total_marks !== null
        ? String(exam.total_marks)
        : ''
    );

    setExamStatus(
      exam.status || 'scheduled'
    );

    setExamModal(true);
  };

  const saveExam = async () => {
    if (!institutionId) {
      Alert.alert('Error', 'Institution not found.');
      return;
    }

    const title = examTitle.trim();
    const type = examType.trim();
    const date = examDate.trim();
    const venue = examVenue.trim();

    if (!title) {
      Alert.alert(
        'Missing details',
        'Enter exam title.'
      );
      return;
    }

    if (!selectedExamSubjectId) {
      Alert.alert(
        'Missing details',
        'Select a subject.'
      );
      return;
    }

    if (!type) {
      Alert.alert(
        'Missing details',
        'Enter exam type.'
      );
      return;
    }

    const duration = Number(
      examDuration.trim()
    );

    const totalMarks = Number(
      examTotalMarks.trim()
    );

    if (
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      Alert.alert(
        'Invalid duration',
        'Enter a valid duration in minutes.'
      );
      return;
    }

    if (
      !Number.isFinite(totalMarks) ||
      totalMarks <= 0
    ) {
      Alert.alert(
        'Invalid marks',
        'Enter valid total marks.'
      );
      return;
    }

    if (
      date &&
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      Alert.alert(
        'Invalid date',
        'Use YYYY-MM-DD format. Example: 2026-10-15'
      );
      return;
    }

    const subjectBelongsToInstitution =
      institutionSubjects.some(
        (subject) =>
          String(subject.id) ===
          String(selectedExamSubjectId)
      );

    if (!subjectBelongsToInstitution) {
      Alert.alert(
        'Invalid subject',
        'Selected subject does not belong to this institution.'
      );
      return;
    }

    try {
      const payload = {
        title,
        subject_id: selectedExamSubjectId,
        exam_type: type,
        date: date || null,
        duration,
        venue: venue || null,
        total_marks: totalMarks,
        status: examStatus || 'scheduled',
      };

      if (editingExam) {
        const { error } = await supabase
          .from('exams')
          .update(payload)
          .eq('id', editingExam.id);

        if (error) throw error;

        Alert.alert(
          'Success',
          'Exam updated successfully.'
        );
      } else {
        const { error } = await supabase
          .from('exams')
          .insert(payload);

        if (error) throw error;

        Alert.alert(
          'Success',
          'Exam created successfully.'
        );
      }

      setExamModal(false);
      await reload();
    } catch (error: any) {
      console.error(
        '[Admin] exam save:',
        error
      );

      Alert.alert(
        'Error',
        error?.message ||
          'Unable to save exam.'
      );
    }
  };

  const deleteExam = (exam: ExamRow) => {
    Alert.alert(
      'Delete Exam',
      `Delete "${exam.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } =
                await supabase
                  .from('exams')
                  .delete()
                  .eq('id', exam.id);

              if (error) throw error;

              await reload();

              Alert.alert(
                'Deleted',
                'Exam deleted successfully.'
              );
            } catch (error: any) {
              console.error(
                '[Admin] exam delete:',
                error
              );

              Alert.alert(
                'Cannot delete',
                error?.message ||
                  'Unable to delete this exam.'
              );
            }
          },
        },
      ]
    );
  };

  const openAddEvent = () => {
  setEditingEvent(null);

  setEventTitle('');
  setEventDescription('');
  setEventType('Academic');
  setEventStartDate('');
  setEventEndDate('');
  setEventVenue('');
  setEventOrganizer('');
  setEventStatus('scheduled');

  setEventModal(true);
};

const openEditEvent = (event: EventRow) => {
  setEditingEvent(event);

  setEventTitle(event.title || '');
  setEventDescription(event.description || '');
  setEventType(event.type || 'Academic');
  setEventStartDate(event.start_date || '');
  setEventEndDate(event.end_date || '');
  setEventVenue(event.venue || '');
  setEventOrganizer(event.organizer || '');
  setEventStatus(event.status || 'scheduled');

  setEventModal(true);
};

const saveEvent = async () => {
  const title = eventTitle.trim();
  const description = eventDescription.trim();
  const type = eventType.trim();
  const startDate = eventStartDate.trim();
  const endDate = eventEndDate.trim();
  const venue = eventVenue.trim();
  const organizer = eventOrganizer.trim();

  if (!title) {
    Alert.alert(
      'Missing details',
      'Enter event title.'
    );
    return;
  }

  if (!type) {
    Alert.alert(
      'Missing details',
      'Select event type.'
    );
    return;
  }

  if (
    startDate &&
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate)
  ) {
    Alert.alert(
      'Invalid date',
      'Start date must be YYYY-MM-DD.'
    );
    return;
  }

  if (
    endDate &&
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
  ) {
    Alert.alert(
      'Invalid date',
      'End date must be YYYY-MM-DD.'
    );
    return;
  }

  if (
    startDate &&
    endDate &&
    endDate < startDate
  ) {
    Alert.alert(
      'Invalid dates',
      'End date cannot be before start date.'
    );
    return;
  }

  try {
    const payload = {
      title,
      description: description || null,
      type,
      start_date: startDate || null,
      end_date: endDate || null,
      venue: venue || null,
      organizer: organizer || null,
      status: eventStatus || 'scheduled',
    };

    if (editingEvent) {
      const { error } = await supabase
        .from('events')
        .update(payload)
        .eq('id', editingEvent.id);

      if (error) throw error;

      Alert.alert(
        'Success',
        'Event updated successfully.'
      );
    } else {
      const { error } = await supabase
        .from('events')
        .insert(payload);

      if (error) throw error;

      Alert.alert(
        'Success',
        'Event created successfully.'
      );
    }

    setEventModal(false);
    await reload();
  } catch (error: any) {
    console.error('[Admin] event save:', error);

    Alert.alert(
      'Error',
      error?.message || 'Unable to save event.'
    );
  }
};

const deleteEvent = (event: EventRow) => {
  Alert.alert(
    'Delete Event',
    `Delete "${event.title}"?`,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('events')
              .delete()
              .eq('id', event.id);

            if (error) throw error;

            await reload();

            Alert.alert(
              'Deleted',
              'Event deleted successfully.'
            );
          } catch (error: any) {
            console.error(
              '[Admin] event delete:',
              error
            );

            Alert.alert(
              'Cannot delete',
              error?.message ||
                'Unable to delete this event.'
            );
          }
        },
      },
    ]
  );
};

  // =========================================================
  // SELECTOR TITLE
  // =========================================================

  const selectorTitle =
  selector === 'subject'
    ? 'Select Subject'
    : selector === 'teacher'
    ? 'Select Teacher'
    : selector === 'day'
    ? 'Select Day'
    : selector === 'student'
    ? 'Select Student'
    : selector === 'enrollmentSubject'
    ? 'Select Subject'
    : selector === 'enrollmentClass'
    ? 'Select Class'
    : selector === 'examSubject'
    ? 'Select Exam Subject'
    : selector === 'examType'
    ? 'Select Exam Type'
    : selector === 'examStatus'
    ? 'Select Exam Status'
    : selector === 'eventType'
    ? 'Select Event Type'
    : selector === 'eventStatus'
    ? 'Select Event Status'
    : '';
      

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <View style={styles.topHeader}>
          <View style={styles.headerText}>
            <View style={styles.eyebrowRow}>
              <View style={styles.liveDot} />

              <Text style={styles.eyebrow}>
                ADMIN CONTROL CENTER
              </Text>
            </View>

            <Text style={styles.title}>
              Management
            </Text>

            <Text style={styles.subtitle}>
              Configure your institution's academic system.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <MaterialCommunityIcons
              name="tune-variant"
              size={27}
              color={colors.text}
            />
          </View>
        </View>

        {/* OVERVIEW */}

        <View style={styles.overviewCard}>
          <View style={styles.overviewTop}>
            <View>
              <Text style={styles.overviewLabel}>
                ACADEMIC OVERVIEW
              </Text>

              <Text style={styles.overviewTitle}>
                Institution setup
              </Text>
            </View>

            <View style={styles.secureBadge}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={15}
                color={colors.text}
              />

              <Text style={styles.secureText}>
                ACTIVE
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <Metric
              icon="book-open-variant"
              value={institutionSubjects.length}
              label="Subjects"
            />

            <Metric
              icon="calendar-clock-outline"
              value={institutionClasses.length}
              label="Classes"
            />

            <Metric
              icon="account-group-outline"
              value={activeEnrollmentCount}
              label="Enrollments"
            />
          </View>
        </View>

        {/* SECTION */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Academic Management
            </Text>

            <Text style={styles.sectionSubtitle}>
              Select a module to manage
            </Text>
          </View>

          <View style={styles.moduleCount}>
            <Text style={styles.moduleCountText}>
              8
            </Text>

            <Text style={styles.moduleCountLabel}>
              modules
            </Text>
          </View>
        </View>

        {/* MODULE GRID */}

        <View style={styles.grid}>
          <ManagementCard
            icon="book-open-page-variant-outline"
            title="Subjects"
            description="Create and organize academic subjects."
            count={institutionSubjects.length}
            countLabel="Subjects"
            active
            onPress={() =>
              setActiveModule('subjects')
            }
          />

          <ManagementCard
            icon="calendar-clock-outline"
            title="Classes & Timetable"
            description="Build schedules with teachers, rooms and timings."
            count={institutionClasses.length}
            countLabel="Classes"
            active
            onPress={() =>
              setActiveModule('classes')
            }
          />

          <ManagementCard
            icon="account-group-outline"
            title="Enrollments"
            description="Assign students to subjects and classes."
            count={activeEnrollmentCount}
            countLabel="Active"
            active
            onPress={() =>
              setActiveModule('enrollments')
            }
          />

          {/* EXAMS - NOW ACTIVE */}

          <ManagementCard
            icon="clipboard-text-outline"
            title="Exams"
            description="Create and manage examinations."
            count={institutionExams.length}
            countLabel="Exams"
            active
            onPress={() =>
              setActiveModule('exams')
            }
          />

          <ComingCard
            icon="calendar-outline"
            title="Events"
            description="Manage institution events."
            onPress={() =>
              Alert.alert(
                'Coming next',
                'Event management will be added here.'
              )
            }
          />

          <ComingCard
            icon="bullhorn-outline"
            title="Announcements"
            description="Publish notices to users."
            onPress={() =>
              Alert.alert(
                'Coming next',
                'Announcements will be added here.'
              )
            }
          />

          <ComingCard
            icon="account-tie-outline"
            title="Hiring"
            description="Manage teacher hiring requests."
            onPress={() =>
              Alert.alert(
                'Coming next',
                'Hiring management will be added here.'
              )
            }
          />

          <ComingCard
            icon="clipboard-check-outline"
            title="Teacher Tasks"
            description="Manage teacher assignments."
            onPress={() =>
              Alert.alert(
                'Coming next',
                'Teacher task management will be added here.'
              )
            }
          />
        </View>

        {/* SYSTEM STATUS */}

        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <MaterialCommunityIcons
              name="database-check-outline"
              size={21}
              color={colors.text}
            />
          </View>

          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>
              Management system ready
            </Text>

            <Text style={styles.statusDescription}>
              Your academic data is connected to the institution.
            </Text>
          </View>

          <View style={styles.statusIndicator}>
            <View style={styles.statusDot} />
          </View>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.text} />

            <Text style={styles.loadingText}>
              Syncing management data...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* =====================================================
          SUBJECT LIST
      ===================================================== */}

      <Modal
        visible={activeModule === 'subjects'}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setActiveModule(null)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.largeModal}>
            <ModalHeader
              icon="book-open-variant"
              title="Subjects"
              subtitle={`${institutionSubjects.length} subjects in your institution`}
              onClose={() =>
                setActiveModule(null)
              }
            />

            <Pressable
              style={styles.primaryButton}
              onPress={openAddSubject}
            >
              <MaterialCommunityIcons
                name="plus"
                size={21}
                color="#fff"
              />

              <Text style={styles.primaryButtonText}>
                Add Subject
              </Text>
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            >
              {institutionSubjects.length === 0 ? (
                <EmptyState
                  icon="book-open-outline"
                  title="No subjects yet"
                  text="Add your first subject using the button above."
                />
              ) : (
                institutionSubjects.map(
                  (subject) => (
                    <View
                      key={subject.id}
                      style={styles.subjectRow}
                    >
                      <View style={styles.subjectIcon}>
                        <MaterialCommunityIcons
                          name="book-open-page-variant-outline"
                          size={22}
                          color={colors.text}
                        />
                      </View>

                      <View style={styles.subjectInfo}>
                        <View style={styles.codeBadge}>
                          <Text style={styles.subjectCode}>
                            {subject.code}
                          </Text>
                        </View>

                        <Text style={styles.subjectName}>
                          {subject.name}
                        </Text>
                      </View>

                      <View style={styles.rowActions}>
                        <ActionButton
                          icon="pencil-outline"
                          onPress={() =>
                            openEditSubject(
                              subject
                            )
                          }
                        />

                        <ActionButton
                          icon="delete-outline"
                          danger
                          onPress={() =>
                            deleteSubject(
                              subject
                            )
                          }
                        />
                      </View>
                    </View>
                  )
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          CLASS LIST
      ===================================================== */}

      <Modal
        visible={activeModule === 'classes'}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setActiveModule(null)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.largeModal}>
            <ModalHeader
              icon="calendar-clock-outline"
              title="Classes & Timetable"
              subtitle={`${institutionClasses.length} scheduled classes`}
              onClose={() =>
                setActiveModule(null)
              }
            />

            <Pressable
              style={styles.primaryButton}
              onPress={openAddClass}
            >
              <MaterialCommunityIcons
                name="plus"
                size={21}
                color="#fff"
              />

              <Text style={styles.primaryButtonText}>
                Add Class
              </Text>
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            >
              {institutionClasses.length === 0 ? (
                <EmptyState
                  icon="calendar-clock-outline"
                  title="No classes yet"
                  text="Create your first class timetable."
                />
              ) : (
                institutionClasses.map(
                  (item) => {
                    const subject =
                      institutionSubjects.find(
                        (s) =>
                          s.id ===
                          item.subject_id
                      );

                    const teacher =
                      institutionTeachers.find(
                        (t) =>
                          t.id ===
                          item.teacher_id
                      );

                    return (
                      <View
                        key={item.id}
                        style={styles.classCard}
                      >
                        <View style={styles.classTop}>
                          <View style={styles.classIcon}>
                            <MaterialCommunityIcons
                              name="calendar-clock-outline"
                              size={22}
                              color={colors.text}
                            />
                          </View>

                          <View style={styles.classMain}>
                            <View style={styles.classCodeRow}>
                              <Text style={styles.classSubject}>
                                {subject?.code ??
                                  'SUBJECT'}
                              </Text>

                              <View style={styles.scheduleBadge}>
                                <Text
                                  style={
                                    styles.scheduleBadgeText
                                  }
                                >
                                  {dayName(
                                    item.day_of_week
                                  )}
                                </Text>
                              </View>
                            </View>

                            <Text
                              style={
                                styles.classSubjectName
                              }
                            >
                              {subject?.name ??
                                'Unknown subject'}
                            </Text>

                            {item.class_name ? (
                              <Text
                                style={
                                  styles.classNameText
                                }
                              >
                                {item.class_name}
                              </Text>
                            ) : null}
                          </View>

                          <View style={styles.rowActions}>
                            <ActionButton
                              icon="pencil-outline"
                              onPress={() =>
                                openEditClass(
                                  item
                                )
                              }
                            />

                            <ActionButton
                              icon="delete-outline"
                              danger
                              onPress={() =>
                                deleteClass(
                                  item
                                )
                              }
                            />
                          </View>
                        </View>

                        <View style={styles.detailGrid}>
                          <DetailChip
                            icon="account-outline"
                            text={
                              teacher?.name ??
                              'Unknown teacher'
                            }
                          />

                          <DetailChip
                            icon="clock-outline"
                            text={`${displayTime(
                              item.start_time
                            )} - ${displayTime(
                              item.end_time
                            )}`}
                          />

                          {item.room ? (
                            <DetailChip
                              icon="map-marker-outline"
                              text={item.room}
                            />
                          ) : null}
                        </View>
                      </View>
                    );
                  }
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          ENROLLMENTS
      ===================================================== */}

      <Modal
        visible={activeModule === 'enrollments'}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setActiveModule(null)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.largeModal}>
            <ModalHeader
              icon="account-group-outline"
              title="Enrollments"
              subtitle={`${activeEnrollmentCount} active student enrollments`}
              onClose={() =>
                setActiveModule(null)
              }
            />

            <Pressable
              style={styles.primaryButton}
              onPress={openAddEnrollment}
            >
              <MaterialCommunityIcons
                name="account-plus-outline"
                size={21}
                color="#fff"
              />

              <Text style={styles.primaryButtonText}>
                Enroll Student
              </Text>
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            >
              {activeEnrollmentCount === 0 ? (
                <EmptyState
                  icon="account-group-outline"
                  title="No enrollments yet"
                  text="Enroll students into your classes."
                />
              ) : (
                institutionEnrollments
                  .filter(
                    (item) =>
                      item.active !== false
                  )
                  .map((item) => {
                    const student =
                      institutionStudents.find(
                        (s) =>
                          s.id ===
                          item.student_id
                      );

                    const subject =
                      institutionSubjects.find(
                        (s) =>
                          s.id ===
                          item.subject_id
                      );

                    const classItem =
                      institutionClasses.find(
                        (c) =>
                          c.id ===
                          item.class_id
                      );

                    const teacher =
                      institutionTeachers.find(
                        (t) =>
                          t.id ===
                          classItem?.teacher_id
                      );

                    return (
                      <View
                        key={item.id}
                        style={
                          styles.enrollmentCard
                        }
                      >
                        <View
                          style={
                            styles.enrollmentTop
                          }
                        >
                          <View
                            style={
                              styles.studentAvatar
                            }
                          >
                            <Text
                              style={
                                styles.studentAvatarText
                              }
                            >
                              {(
                                student?.name ||
                                'S'
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </Text>
                          </View>

                          <View
                            style={
                              styles.enrollmentMain
                            }
                          >
                            <View
                              style={
                                styles.studentHeaderRow
                              }
                            >
                              <Text
                                style={
                                  styles.studentRoll
                                }
                              >
                                {student?.roll_no ??
                                  'STUDENT'}
                              </Text>

                              <View
                                style={
                                  styles.activeBadge
                                }
                              >
                                <View
                                  style={
                                    styles.activeBadgeDot
                                  }
                                />

                                <Text
                                  style={
                                    styles.activeBadgeText
                                  }
                                >
                                  ACTIVE
                                </Text>
                              </View>
                            </View>

                            <Text
                              style={
                                styles.studentName
                              }
                            >
                              {student?.name ??
                                'Unknown student'}
                            </Text>

                            <Text
                              style={
                                styles.enrollmentSubject
                              }
                            >
                              {subject?.code ??
                                'SUBJECT'}{' '}
                              •{' '}
                              {subject?.name ??
                                'Unknown subject'}
                            </Text>
                          </View>

                          <ActionButton
                            icon="delete-outline"
                            danger
                            onPress={() =>
                              removeEnrollment(
                                item
                              )
                            }
                          />
                        </View>

                        {classItem ? (
                          <View
                            style={
                              styles.detailGrid
                            }
                          >
                            <DetailChip
                              icon="calendar-outline"
                              text={dayName(
                                classItem.day_of_week
                              )}
                            />

                            <DetailChip
                              icon="clock-outline"
                              text={`${displayTime(
                                classItem.start_time
                              )} - ${displayTime(
                                classItem.end_time
                              )}`}
                            />

                            {classItem.room ? (
                              <DetailChip
                                icon="map-marker-outline"
                                text={
                                  classItem.room
                                }
                              />
                            ) : null}

                            {teacher ? (
                              <DetailChip
                                icon="account-outline"
                                text={
                                  teacher.name
                                }
                              />
                            ) : null}
                          </View>
                        ) : (
                          <DetailChip
                            icon="alert-outline"
                            text="Class not found"
                          />
                        )}
                      </View>
                    );
                  })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          EXAMS LIST
      ===================================================== */}

      <Modal
        visible={activeModule === 'exams'}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setActiveModule(null)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.largeModal}>
            <ModalHeader
              icon="clipboard-text-outline"
              title="Exams"
              subtitle={`${institutionExams.length} examinations`}
              onClose={() =>
                setActiveModule(null)
              }
            />

            <Pressable
              style={styles.primaryButton}
              onPress={openAddExam}
            >
              <MaterialCommunityIcons
                name="plus"
                size={21}
                color="#fff"
              />

              <Text style={styles.primaryButtonText}>
                Add Exam
              </Text>
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            >
              {institutionExams.length === 0 ? (
                <EmptyState
                  icon="clipboard-text-outline"
                  title="No exams yet"
                  text="Create your first examination using the button above."
                />
              ) : (
                institutionExams.map(
                  (exam) => {
                    const subject =
                      institutionSubjects.find(
                        (item) =>
                          String(item.id) ===
                          String(
                            exam.subject_id
                          )
                      );

                    return (
                      <View
                        key={exam.id}
                        style={styles.examCard}
                      >
                        <View
                          style={styles.examTop}
                        >
                          <View
                            style={styles.examIcon}
                          >
                            <MaterialCommunityIcons
                              name="clipboard-text-outline"
                              size={22}
                              color={
                                colors.text
                              }
                            />
                          </View>

                          <View
                            style={styles.examMain}
                          >
                            <View
                              style={
                                styles.examTitleRow
                              }
                            >
                              <Text
                                style={
                                  styles.examTitle
                                }
                                numberOfLines={
                                  2
                                }
                              >
                                {exam.title}
                              </Text>

                              <View
                                style={
                                  styles.examStatusBadge
                                }
                              >
                                <View
                                  style={
                                    styles.examStatusDot
                                  }
                                />

                                <Text
                                  style={
                                    styles.examStatusText
                                  }
                                >
                                  {String(
                                    exam.status ||
                                      'scheduled'
                                  ).toUpperCase()}
                                </Text>
                              </View>
                            </View>

                            <Text
                              style={
                                styles.examSubject
                              }
                            >
                              {subject?.code ??
                                'SUBJECT'}{' '}
                              •{' '}
                              {subject?.name ??
                                'Unknown subject'}
                            </Text>

                            <Text
                              style={
                                styles.examType
                              }
                            >
                              {exam.exam_type ||
                                'Examination'}
                            </Text>
                          </View>

                          <View
                            style={
                              styles.rowActions
                            }
                          >
                            <ActionButton
                              icon="pencil-outline"
                              onPress={() =>
                                openEditExam(
                                  exam
                                )
                              }
                            />

                            <ActionButton
                              icon="delete-outline"
                              danger
                              onPress={() =>
                                deleteExam(
                                  exam
                                )
                              }
                            />
                          </View>
                        </View>

                        <View
                          style={
                            styles.detailGrid
                          }
                        >
                          {exam.date ? (
                            <DetailChip
                              icon="calendar-outline"
                              text={
                                exam.date
                              }
                            />
                          ) : null}

                          <DetailChip
                            icon="clock-outline"
                            text={`${exam.duration} min`}
                          />

                          <DetailChip
                            icon="trophy-outline"
                            text={`${exam.total_marks} marks`}
                          />

                          {exam.venue ? (
                            <DetailChip
                              icon="map-marker-outline"
                              text={
                                exam.venue
                              }
                            />
                          ) : null}
                        </View>
                      </View>
                    );
                  }
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
  visible={activeModule === 'events'}
  transparent
  animationType="slide"
  onRequestClose={() => setActiveModule(null)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.managementModal}>
      <View style={styles.modalHeader}>
        <View>
          <Text style={styles.modalTitle}>
            Events
          </Text>

          <Text style={styles.modalSubtitle}>
            Manage institution events
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setActiveModule(null)}
        >
          <MaterialCommunityIcons
            name="close"
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.primaryAction}
        onPress={openAddEvent}
      >
        <MaterialCommunityIcons
          name="plus"
          size={20}
          color="#fff"
        />

        <Text style={styles.primaryActionText}>
          Create Event
        </Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 30,
        }}
      >
        {institutionEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="calendar-blank-outline"
              size={46}
              color="#64748b"
            />

            <Text style={styles.emptyTitle}>
              No Events Yet
            </Text>

            <Text style={styles.emptyText}>
              Create your first institution event.
            </Text>
          </View>
        ) : (
          institutionEvents.map((event) => (
            <View
              key={event.id}
              style={styles.managementRow}
            >
              <View style={styles.rowIcon}>
                <MaterialCommunityIcons
                  name="calendar-star"
                  size={23}
                  color="#60a5fa"
                />
              </View>

              <View style={styles.rowContent}>
                <Text
                  style={styles.rowTitle}
                  numberOfLines={1}
                >
                  {event.title}
                </Text>

                <Text style={styles.rowMeta}>
                  {event.type}
                  {event.start_date
                    ? ` • ${event.start_date}`
                    : ''}
                </Text>

                {!!event.venue && (
                  <Text
                    style={styles.rowSecondary}
                    numberOfLines={1}
                  >
                    {event.venue}
                  </Text>
                )}

                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>
                    {event.status}
                  </Text>
                </View>
              </View>

              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={styles.iconAction}
                  onPress={() =>
                    openEditEvent(event)
                  }
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={19}
                    color="#60a5fa"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconAction}
                  onPress={() =>
                    deleteEvent(event)
                  }
                >
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={19}
                    color="#f87171"
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  </View>
</Modal>

<Modal
  visible={eventModal}
  transparent
  animationType="slide"
  onRequestClose={() => setEventModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.formModal}>
      <View style={styles.modalHeader}>
        <View>
          <Text style={styles.modalTitle}>
            {editingEvent
              ? 'Edit Event'
              : 'Create Event'}
          </Text>

          <Text style={styles.modalSubtitle}>
            Event information
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setEventModal(false)}
        >
          <MaterialCommunityIcons
            name="close"
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.inputLabel}>
          Event Title
        </Text>

        <TextInput
          style={styles.input}
          value={eventTitle}
          onChangeText={setEventTitle}
          placeholder="Annual Tech Fest"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.inputLabel}>
          Description
        </Text>

        <TextInput
          style={[
            styles.input,
            styles.multilineInput,
          ]}
          value={eventDescription}
          onChangeText={setEventDescription}
          placeholder="Describe the event..."
          placeholderTextColor="#64748b"
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.inputLabel}>
          Event Type
        </Text>

        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() =>
            setSelector('eventType')
          }
        >
          <Text style={styles.selectorValue}>
            {eventType}
          </Text>

          <MaterialCommunityIcons
            name="chevron-down"
            size={21}
            color="#94a3b8"
          />
        </TouchableOpacity>

        <Text style={styles.inputLabel}>
          Start Date
        </Text>

        <TextInput
          style={styles.input}
          value={eventStartDate}
          onChangeText={setEventStartDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.inputLabel}>
          End Date
        </Text>

        <TextInput
          style={styles.input}
          value={eventEndDate}
          onChangeText={setEventEndDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.inputLabel}>
          Venue
        </Text>

        <TextInput
          style={styles.input}
          value={eventVenue}
          onChangeText={setEventVenue}
          placeholder="Main Auditorium"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.inputLabel}>
          Organizer
        </Text>

        <TextInput
          style={styles.input}
          value={eventOrganizer}
          onChangeText={setEventOrganizer}
          placeholder="Computer Science Department"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.inputLabel}>
          Status
        </Text>

        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() =>
            setSelector('eventStatus')
          }
        >
          <Text style={styles.selectorValue}>
            {eventStatus}
          </Text>

          <MaterialCommunityIcons
            name="chevron-down"
            size={21}
            color="#94a3b8"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveEvent}
        >
          <MaterialCommunityIcons
            name={
              editingEvent
                ? 'content-save-outline'
                : 'plus-circle-outline'
            }
            size={21}
            color="#fff"
          />

          <Text style={styles.saveButtonText}>
            {editingEvent
              ? 'Update Event'
              : 'Create Event'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  </View>
</Modal>
      {/* =====================================================
          SUBJECT FORM
      ===================================================== */}

      <Modal
        visible={subjectModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSubjectModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <ModalHeader
              icon={
                editingSubject
                  ? 'pencil-outline'
                  : 'book-open-variant'
              }
              title={
                editingSubject
                  ? 'Edit Subject'
                  : 'Add Subject'
              }
              subtitle={
                editingSubject
                  ? 'Update subject information'
                  : 'Create a new academic subject'
              }
              onClose={() =>
                setSubjectModal(false)
              }
            />

            <Input
              label="Subject Code"
              value={subjectCode}
              onChangeText={setSubjectCode}
              placeholder="Example: DBMS"
              autoCapitalize="characters"
            />

            <Input
              label="Subject Name"
              value={subjectName}
              onChangeText={setSubjectName}
              placeholder="Example: Database Management System"
            />

            <Pressable
              style={styles.primaryButton}
              onPress={saveSubject}
            >
              <MaterialCommunityIcons
                name={
                  editingSubject
                    ? 'content-save-outline'
                    : 'plus'
                }
                size={21}
                color="#fff"
              />

              <Text style={styles.primaryButtonText}>
                {editingSubject
                  ? 'Update Subject'
                  : 'Add Subject'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          CLASS FORM
      ===================================================== */}

      <Modal
        visible={classModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setClassModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <ModalHeader
                icon="calendar-clock-outline"
                title={
                  editingClass
                    ? 'Edit Class'
                    : 'Create Class'
                }
                subtitle="Connect teacher, subject and timetable"
                onClose={() =>
                  setClassModal(false)
                }
              />

              <Text style={styles.inputLabel}>
                Subject
              </Text>

              <Selector
                value={
                  institutionSubjects.find(
                    (s) =>
                      s.id ===
                      selectedSubjectId
                  )?.name
                }
                placeholder="Select subject"
                onPress={() =>
                  setSelector('subject')
                }
              />

              <Text style={styles.inputLabel}>
                Teacher
              </Text>

              <Selector
                value={
                  institutionTeachers.find(
                    (t) =>
                      t.id ===
                      selectedTeacherId
                  )?.name
                }
                placeholder="Select teacher"
                onPress={() =>
                  setSelector('teacher')
                }
              />

              <Text style={styles.inputLabel}>
                Day
              </Text>

              <Selector
                value={
                  selectedDay !== null
                    ? dayName(selectedDay)
                    : undefined
                }
                placeholder="Select day"
                onPress={() =>
                  setSelector('day')
                }
              />

              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Input
                    label="Start Time"
                    value={startTime}
                    onChangeText={
                      setStartTime
                    }
                    placeholder="09:00"
                    maxLength={5}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>

                <View style={styles.timeField}>
                  <Input
                    label="End Time"
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="10:00"
                    maxLength={5}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              <Input
                label="Class Name"
                value={className}
                onChangeText={setClassName}
                placeholder="Example: BCA 2nd Year - A"
              />

              <Input
                label="Room"
                value={room}
                onChangeText={setRoom}
                placeholder="Example: Room 101"
              />

              <Pressable
                style={styles.primaryButton}
                onPress={saveClass}
              >
                <MaterialCommunityIcons
                  name={
                    editingClass
                      ? 'content-save-outline'
                      : 'plus'
                  }
                  size={21}
                  color="#fff"
                />

                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  {editingClass
                    ? 'Update Class'
                    : 'Create Class'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          ENROLLMENT FORM
      ===================================================== */}

      <Modal
        visible={enrollmentModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setEnrollmentModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <ModalHeader
                icon="account-plus-outline"
                title="Enroll Student"
                subtitle="Assign a student to a class"
                onClose={() =>
                  setEnrollmentModal(false)
                }
              />

              <Text style={styles.inputLabel}>
                Student
              </Text>

              <Selector
                value={
                  institutionStudents.find(
                    (s) =>
                      s.id ===
                      selectedStudentId
                  )?.name
                }
                placeholder="Select student"
                onPress={() =>
                  setSelector('student')
                }
              />

              <Text style={styles.inputLabel}>
                Subject
              </Text>

              <Selector
                value={
                  institutionSubjects.find(
                    (s) =>
                      s.id ===
                      selectedEnrollmentSubjectId
                  )?.name
                }
                placeholder="Select subject"
                onPress={() =>
                  setSelector(
                    'enrollmentSubject'
                  )
                }
              />

              <Text style={styles.inputLabel}>
                Class
              </Text>

              <Selector
                value={(() => {
                  const item =
                    institutionClasses.find(
                      (c) =>
                        c.id ===
                        selectedEnrollmentClassId
                    );

                  if (!item) return undefined;

                  const subject =
                    institutionSubjects.find(
                      (s) =>
                        s.id ===
                        item.subject_id
                    );

                  return `${subject?.code ?? 'Class'} • ${dayName(
                    item.day_of_week
                  )} • ${displayTime(
                    item.start_time
                  )}`;
                })()}
                placeholder="Select class"
                onPress={() =>
                  setSelector(
                    'enrollmentClass'
                  )
                }
              />

              <Pressable
                style={styles.primaryButton}
                onPress={saveEnrollment}
              >
                <MaterialCommunityIcons
                  name="account-plus-outline"
                  size={21}
                  color="#fff"
                />

                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Enroll Student
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          EXAM FORM
      ===================================================== */}

      <Modal
        visible={examModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setExamModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <ModalHeader
                icon={
                  editingExam
                    ? 'pencil-outline'
                    : 'clipboard-text-outline'
                }
                title={
                  editingExam
                    ? 'Edit Exam'
                    : 'Create Exam'
                }
                subtitle={
                  editingExam
                    ? 'Update examination details'
                    : 'Create a new institution examination'
                }
                onClose={() =>
                  setExamModal(false)
                }
              />

              <Input
                label="Exam Title"
                value={examTitle}
                onChangeText={setExamTitle}
                placeholder="Example: DBMS Mid Term Examination"
              />

              <Text style={styles.inputLabel}>
                Subject
              </Text>

              <Selector
                value={
                  institutionSubjects.find(
                    (subject) =>
                      subject.id ===
                      selectedExamSubjectId
                  )?.name
                }
                placeholder="Select subject"
                onPress={() =>
                  setSelector(
                    'examSubject'
                  )
                }
              />

              <Text style={styles.inputLabel}>
                Exam Type
              </Text>

              <Selector
                value={
                  examType || undefined
                }
                placeholder="Select exam type"
                onPress={() =>
                  setSelector('examType')
                }
              />

              <Input
                label="Exam Date"
                value={examDate}
                onChangeText={setExamDate}
                placeholder="YYYY-MM-DD"
                maxLength={10}
              />

              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Input
                    label="Duration"
                    value={examDuration}
                    onChangeText={
                      setExamDuration
                    }
                    placeholder="60"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.timeField}>
                  <Input
                    label="Total Marks"
                    value={examTotalMarks}
                    onChangeText={
                      setExamTotalMarks
                    }
                    placeholder="100"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Input
                label="Venue"
                value={examVenue}
                onChangeText={setExamVenue}
                placeholder="Example: Room 101"
              />

              <Text style={styles.inputLabel}>
                Status
              </Text>

              <Selector
                value={
                  examStatus
                    ? examStatus
                        .charAt(0)
                        .toUpperCase() +
                      examStatus.slice(1)
                    : undefined
                }
                placeholder="Select status"
                onPress={() =>
                  setSelector(
                    'examStatus'
                  )
                }
              />

              <Pressable
                style={styles.primaryButton}
                onPress={saveExam}
              >
                <MaterialCommunityIcons
                  name={
                    editingExam
                      ? 'content-save-outline'
                      : 'plus'
                  }
                  size={21}
                  color="#fff"
                />

                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  {editingExam
                    ? 'Update Exam'
                    : 'Create Exam'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          SELECTOR
      ===================================================== */}

      <Modal
        visible={selector !== null}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSelector(null)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.selectorModal}>
            <ModalHeader
              icon="format-list-bulleted"
              title={selectorTitle}
              onClose={() =>
                setSelector(null)
              }
            />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.selectorList
              }
            >
              {/* SUBJECT */}

              {selector === 'subject' &&
                institutionSubjects.map(
                  (subject) => (
                    <Option
                      key={subject.id}
                      icon="book-open-variant"
                      title={subject.code}
                      subtitle={subject.name}
                      selected={
                        selectedSubjectId ===
                        subject.id
                      }
                      onPress={() => {
                        setSelectedSubjectId(
                          subject.id
                        );
                        setSelector(null);
                      }}
                    />
                  )
                )}

              {/* TEACHER */}

              {selector === 'teacher' &&
                institutionTeachers.map(
                  (teacher) => (
                    <Option
                      key={teacher.id}
                      icon="account-tie-outline"
                      title={teacher.name}
                      subtitle={
                        teacher.department ||
                        teacher.email ||
                        'Teacher'
                      }
                      selected={
                        selectedTeacherId ===
                        teacher.id
                      }
                      onPress={() => {
                        setSelectedTeacherId(
                          teacher.id
                        );
                        setSelector(null);
                      }}
                    />
                  )
                )}

              {/* DAY */}

              {selector === 'day' &&
                DAYS.map((day) => (
                  <Option
                    key={day.value}
                    icon="calendar-outline"
                    title={day.label}
                    selected={
                      selectedDay ===
                      day.value
                    }
                    onPress={() => {
                      setSelectedDay(
                        day.value
                      );
                      setSelector(null);
                    }}
                  />
                ))}

              {/* STUDENT */}

              {selector === 'student' &&
                institutionStudents.map(
                  (student) => (
                    <Option
                      key={student.id}
                      icon="account-outline"
                      title={student.name}
                      subtitle={`${student.roll_no}${
                        student.branch
                          ? ` • ${student.branch}`
                          : ''
                      }`}
                      selected={
                        selectedStudentId ===
                        student.id
                      }
                      onPress={() => {
                        setSelectedStudentId(
                          student.id
                        );
                        setSelector(null);
                      }}
                    />
                  )
                )}

              {/* ENROLLMENT SUBJECT */}

              {selector ===
                'enrollmentSubject' &&
                institutionSubjects.map(
                  (subject) => (
                    <Option
                      key={subject.id}
                      icon="book-open-variant"
                      title={subject.code}
                      subtitle={subject.name}
                      selected={
                        selectedEnrollmentSubjectId ===
                        subject.id
                      }
                      onPress={() => {
                        setSelectedEnrollmentSubjectId(
                          subject.id
                        );

                        setSelectedEnrollmentClassId(
                          null
                        );

                        setSelector(null);
                      }}
                    />
                  )
                )}

              {/* ENROLLMENT CLASS */}

              {selector ===
                'enrollmentClass' &&
                institutionClasses
                  .filter(
                    (item) =>
                      item.subject_id ===
                      selectedEnrollmentSubjectId
                  )
                  .map((item) => {
                    const subject =
                      institutionSubjects.find(
                        (s) =>
                          s.id ===
                          item.subject_id
                      );

                    const teacher =
                      institutionTeachers.find(
                        (t) =>
                          t.id ===
                          item.teacher_id
                      );

                    return (
                      <Option
                        key={item.id}
                        icon="calendar-clock-outline"
                        title={`${subject?.code ?? 'Class'} • ${dayName(
                          item.day_of_week
                        )}`}
                        subtitle={`${displayTime(
                          item.start_time
                        )} - ${displayTime(
                          item.end_time
                        )}${
                          teacher
                            ? ` • ${teacher.name}`
                            : ''
                        }${
                          item.room
                            ? ` • ${item.room}`
                            : ''
                        }`}
                        selected={
                          selectedEnrollmentClassId ===
                          item.id
                        }
                        onPress={() => {
                          setSelectedEnrollmentClassId(
                            item.id
                          );

                          setSelector(null);
                        }}
                      />
                    );
                  })}

              {selector ===
                'enrollmentClass' &&
                institutionClasses.filter(
                  (item) =>
                    item.subject_id ===
                    selectedEnrollmentSubjectId
                ).length === 0 && (
                  <EmptyState
                    icon="calendar-remove-outline"
                    title="No classes available"
                    text="Create a class for this subject first."
                  />
                )}

              {/* =================================================
                  EXAM SUBJECT
              ================================================= */}

              {selector === 'examSubject' &&
                institutionSubjects.map(
                  (subject) => (
                    <Option
                      key={subject.id}
                      icon="book-open-variant"
                      title={subject.code}
                      subtitle={subject.name}
                      selected={
                        selectedExamSubjectId ===
                        subject.id
                      }
                      onPress={() => {
                        setSelectedExamSubjectId(
                          subject.id
                        );

                        setSelector(null);
                      }}
                    />
                  )
                )}

              {/* =================================================
                  EXAM TYPE
              ================================================= */}

              {selector === 'examType' &&
                [
                  'Mid Term',
                  'Internal Assessment',
                  'Final Examination',
                  'Practical Examination',
                  'Viva',
                  'Quiz',
                ].map((type) => (
                  <Option
                    key={type}
                    icon="clipboard-text-outline"
                    title={type}
                    selected={
                      examType === type
                    }
                    onPress={() => {
                      setExamType(type);
                      setSelector(null);
                    }}
                  />
                ))}

              {/* =================================================
                  EXAM STATUS
              ================================================= */}

              {selector === 'examStatus' &&
                [
                  'scheduled',
                  'completed',
                  'cancelled',
                ].map((status) => (
                  <Option
                    key={status}
                    icon={
                      status ===
                      'scheduled'
                        ? 'calendar-clock-outline'
                        : status ===
                          'completed'
                        ? 'check-circle-outline'
                        : 'close-circle-outline'
                    }
                    title={
                      status
                        .charAt(0)
                        .toUpperCase() +
                      status.slice(1)
                    }
                    selected={
                      examStatus ===
                      status
                    }
                    onPress={() => {
                      setExamStatus(
                        status
                      );

                      setSelector(null);
                    }}
                  />
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}


// =============================================================
// SMALL COMPONENTS
// =============================================================

function Metric({
  icon,
  value,
  label,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricIcon}>
        <MaterialCommunityIcons
          name={icon}
          size={17}
          color={colors.text}
        />
      </View>

      <View>
        <Text style={styles.metricValue}>
          {value}
        </Text>

        <Text style={styles.metricLabel}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function ManagementCard({
  icon,
  title,
  description,
  count,
  countLabel,
  active,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  count: number;
  countLabel: string;
  active?: boolean;
  onPress: () => void;
}) {
  const scale = useRef(
    new Animated.Value(1)
  ).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 5,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.managementCardWrapper,
        {
          transform: [{ scale }],
        },
      ]}
    >
      <Pressable
        style={[
          styles.managementCard,
          active &&
            styles.managementCardActive,
        ]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.managementIcon}>
            <MaterialCommunityIcons
              name={icon}
              size={23}
              color={colors.text}
            />
          </View>

          <View style={styles.arrowButton}>
            <MaterialCommunityIcons
              name="arrow-top-right"
              size={17}
              color={colors.subtext}
            />
          </View>
        </View>

        <Text style={styles.cardTitle}>
          {title}
        </Text>

        <Text
          style={styles.cardDescription}
          numberOfLines={2}
        >
          {description}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardCount}>
            {count}
          </Text>

          <Text style={styles.cardCountLabel}>
            {countLabel}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function ComingCard({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const scale = useRef(
    new Animated.Value(1)
  ).current;

  return (
    <Animated.View
      style={[
        styles.managementCardWrapper,
        {
          transform: [{ scale }],
        },
      ]}
    >
      <Pressable
        style={styles.comingCard}
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
          }).start()
        }
      >
        <View style={styles.cardTopRow}>
          <View style={styles.managementIconMuted}>
            <MaterialCommunityIcons
              name={icon}
              size={23}
              color={colors.subtext}
            />
          </View>

          <View style={styles.nextBadge}>
            <Text style={styles.nextBadgeText}>
              NEXT
            </Text>
          </View>
        </View>

        <Text style={styles.comingTitle}>
          {title}
        </Text>

        <Text
          style={styles.cardDescription}
          numberOfLines={2}
        >
          {description}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function ModalHeader({
  icon,
  title,
  subtitle,
  onClose,
}: {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.modalHeader}>
      <View style={styles.modalHeaderLeft}>
        {icon ? (
          <View style={styles.modalHeaderIcon}>
            <MaterialCommunityIcons
              name={icon}
              size={21}
              color={colors.text}
            />
          </View>
        ) : null}

        <View style={{ flex: 1 }}>
          <Text style={styles.modalTitle}>
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={
                styles.modalSubtitle
              }
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <Pressable
        style={styles.closeButton}
        onPress={onClose}
      >
        <MaterialCommunityIcons
          name="close"
          size={22}
          color={colors.text}
        />
      </Pressable>
    </View>
  );
}

function ActionButton({
  icon,
  danger,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.smallAction,
        danger &&
          styles.dangerAction,
        pressed &&
          styles.actionPressed,
      ]}
      onPress={onPress}
    >
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={
          danger
            ? '#d64545'
            : colors.text
        }
      />
    </Pressable>
  );
}

function DetailChip({
  icon,
  text,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.detailChip}>
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={colors.subtext}
      />

      <Text
        style={styles.detailChipText}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons
          name={icon}
          size={35}
          color={colors.subtext}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.emptyText}>
        {text}
      </Text>
    </View>
  );
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  maxLength?: number;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={
          colors.subtext
        }
        maxLength={maxLength}
        keyboardType={keyboardType}
        autoCapitalize={
          autoCapitalize
        }
        style={styles.input}
      />
    </View>
  );
}

function Selector({
  value,
  placeholder,
  onPress,
}: {
  value?: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.selector,
        pressed &&
          styles.selectorPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.selectorLeft}>
        <View
          style={
            styles.selectorMiniIcon
          }
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={16}
            color={colors.subtext}
          />
        </View>

        <Text
          style={
            value
              ? styles.selectorText
              : styles.selectorPlaceholder
          }
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
      </View>

      <MaterialCommunityIcons
        name="chevron-down"
        size={21}
        color={colors.subtext}
      />
    </Pressable>
  );
}

function Option({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.option,
        selected &&
          styles.optionSelected,
        pressed &&
          styles.optionPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.optionIcon}>
        <MaterialCommunityIcons
          name={icon}
          size={19}
          color={colors.text}
        />
      </View>

      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={
              styles.optionSubtitle
            }
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {selected ? (
        <MaterialCommunityIcons
          name="check-circle"
          size={22}
          color={colors.text}
        />
      ) : (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={colors.subtext}
        />
      )}
    </Pressable>
  );
}

// =============================================================
// STYLES
// =============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    padding: 10,
    marginBottom: 15,
  },

  managementModal: {
  flex: 1,
  backgroundColor: '#fff',
},

  content: {
    padding: 18,
    paddingTop: 20,
    paddingBottom: 45,
  },

  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },

  headerText: {
    flex: 1,
    paddingRight: 15,
  },

  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: colors.text,
    marginRight: 7,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: colors.subtext,
  },

  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    color: colors.text,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: colors.subtext,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  selectorOption: {
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderBottomWidth: 1,
  borderBottomColor: '#e2e8f0',
},

selectorOptionText: {
  fontSize: 14,
  color: '#1e293b',
  fontWeight: '600',
},

  overviewCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 28,
  },

  overviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  overviewLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.subtext,
  },

  overviewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 5,
  },

  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    paddingVertical: 6,
    gap: 5,
  },

  secureText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.7,
  },

  metricsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 9,
  },

  metric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 15,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  metricIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    marginRight: 8,
  },

  metricValue: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
  },

  metricLabel: {
    fontSize: 9,
    color: colors.subtext,
    marginTop: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.text,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 3,
  },

  moduleCount: {
    alignItems: 'flex-end',
  },

  moduleCountText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },

  moduleCountLabel: {
    fontSize: 9,
    color: colors.subtext,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 11,
  },

  managementCardWrapper: {
    width: '48.4%',
  },

  managementCard: {
    minHeight: 174,
    padding: 15,
    borderRadius: 19,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  managementCardActive: {
    borderColor: colors.text,
  },

  comingCard: {
    minHeight: 174,
    padding: 15,
    borderRadius: 19,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.78,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  managementIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  managementIconMuted: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrowButton: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  nextBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },

  nextBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.subtext,
    letterSpacing: 0.6,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },

  comingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  cardDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.subtext,
    marginTop: 5,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 'auto',
    gap: 5,
  },

  cardCount: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },

  cardCountLabel: {
    fontSize: 10,
    color: colors.subtext,
  },

  statusCard: {
    marginTop: 22,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  statusText: {
    flex: 1,
  },

  statusTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },

  statusDescription: {
    fontSize: 10,
    color: colors.subtext,
    marginTop: 2,
  },

  statusIndicator: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: colors.text,
  },

  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },

  loadingText: {
    fontSize: 12,
    color: colors.subtext,
  },

  primaryAction: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 10,
  backgroundColor: '#2563eb',
},

primaryActionText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '700',
  marginLeft: 6,
},

managementRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 12,
  marginBottom: 8,
  backgroundColor: '#f8fafc',
},

rowIcon: {
  width: 40,
  height: 40,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

rowContent: {
  flex: 1,
  minWidth: 0,
},

rowTitle: {
  fontSize: 15,
  fontWeight: '700',
  color: '#111827',
},

rowMeta: {
  fontSize: 12,
  color: '#64748b',
  marginTop: 3,
},

rowSecondary: {
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 8,
},

iconAction: {
  width: 36,
  height: 36,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
},

selectorButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: 48,
  paddingHorizontal: 14,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  borderRadius: 12,
  backgroundColor: '#fff',
},

selectorValue: {
  flex: 1,
  fontSize: 14,
  color: '#334155',
},



  // ===========================================================
  // MODALS
  // ===========================================================

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
  },

  largeModal: {
    height: '91%',
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
  },

  formModal: {
    maxHeight: '90%',
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 19,
    paddingBottom: 30,
  },

  selectorModal: {
    maxHeight: '82%',
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  modalHeaderIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: colors.text,
  },

  modalSubtitle: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 3,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  primaryButton: {
    height: 51,
    borderRadius: 15,
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },

  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  listContent: {
    paddingBottom: 35,
    gap: 10,
  },

  // ===========================================================
  // SUBJECT
  // ===========================================================

  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 17,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  subjectInfo: {
    flex: 1,
  },

  codeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  subjectCode: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.subtext,
    letterSpacing: 0.5,
  },

  subjectName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginTop: 5,
  },

  rowActions: {
    flexDirection: 'row',
    gap: 6,
  },

  smallAction: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dangerAction: {
    backgroundColor:
      'rgba(214,69,69,0.05)',
  },

  actionPressed: {
    opacity: 0.55,
    transform: [
      {
        scale: 0.94,
      },
    ],
  },

  // ===========================================================
  // CLASS
  // ===========================================================

  classCard: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 19,
    padding: 14,
  },

  classTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  classIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  classMain: {
    flex: 1,
    paddingRight: 5,
  },

  classCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },

  classSubject: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.subtext,
  },

  scheduleBadge: {
    borderRadius: 7,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  scheduleBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.text,
  },

  classSubjectName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginTop: 3,
  },

  classNameText: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 3,
  },

  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  detailChip: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    gap: 6,
    maxWidth: '100%',
  },

  detailChipText: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },

  // ===========================================================
  // ENROLLMENT
  // ===========================================================

  enrollmentCard: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 19,
    padding: 14,
  },

  enrollmentTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  studentAvatar: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  studentAvatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },

  enrollmentMain: {
    flex: 1,
    paddingRight: 6,
  },

  studentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  studentRoll: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.subtext,
  },

  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },

  activeBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: colors.text,
  },

  activeBadgeText: {
    fontSize: 7,
    fontWeight: '900',
    color: colors.text,
  },

  studentName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },

  enrollmentSubject: {
    fontSize: 10,
    color: colors.subtext,
    marginTop: 3,
  },

  eventRow: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#111827',
  borderRadius: 18,
  padding: 14,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#1e293b',
},

statusBadge: {
  alignSelf: 'flex-start',
  marginTop: 7,
  paddingHorizontal: 9,
  paddingVertical: 4,
  borderRadius: 8,
  backgroundColor: '#172554',
},

statusBadgeText: {
  color: '#93c5fd',
  fontSize: 10,
  fontWeight: '700',
  textTransform: 'capitalize',
},

multilineInput: {
  minHeight: 90,
  paddingTop: 13,
},

saveButton: {
  height: 52,
  borderRadius: 15,
  backgroundColor: '#2563eb',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  gap: 9,
  marginTop: 18,
  marginBottom: 25,
},

saveButtonText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '800',
},

emptyState: {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 55,
},

emptyTitle: {
  color: '#f8fafc',
  fontSize: 17,
  fontWeight: '800',
  marginTop: 12,
},

emptyText: {
  color: '#64748b',
  fontSize: 13,
  marginTop: 5,
  textAlign: 'center',
},

  // ===========================================================
  // EXAMS
  // ===========================================================

  examCard: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 19,
    padding: 14,
  },

  examTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  examIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  examMain: {
    flex: 1,
    paddingRight: 6,
  },

  examTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 7,
  },

  examTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    color: colors.text,
  },

  examStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },

  examStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: colors.text,
  },

  examStatusText: {
    fontSize: 7,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.4,
  },

  examSubject: {
    fontSize: 10,
    color: colors.subtext,
    marginTop: 5,
  },

  examType: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginTop: 3,
  },

  // ===========================================================
  // FORMS
  // ===========================================================

  inputContainer: {
    marginBottom: 5,
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 7,
    marginTop: 9,
  },

  input: {
    height: 49,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 13,
  },


  selectorPressed: {
    opacity: 0.65,
  },

  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },

  selectorMiniIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  selectorText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  selectorPlaceholder: {
    flex: 1,
    color: colors.subtext,
    fontSize: 13,
  },

  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },

  timeField: {
    flex: 1,
  },

  // ===========================================================
  // SELECTOR OPTIONS
  // ===========================================================

  selectorList: {
    paddingBottom: 30,
    gap: 8,
  },

  option: {
    minHeight: 62,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  optionSelected: {
    borderColor: colors.text,
    backgroundColor: colors.card,
  },

  optionPressed: {
    opacity: 0.65,
  },

  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  optionContent: {
    flex: 1,
    paddingRight: 8,
  },

  optionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },

  optionSubtitle: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.subtext,
    marginTop: 3,
  },

  // ===========================================================
  // EMPTY
  // ===========================================================

  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 25,
  },

  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

});