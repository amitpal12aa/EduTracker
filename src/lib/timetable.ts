import { ClassSlot } from './supabase';

export type ClassStatus = 'completed' | 'live' | 'upcoming';

function toMinutes(hhmm?: string | null): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function classStatus(slot: ClassSlot, now: Date = new Date()): ClassStatus {
  const start = toMinutes(slot.start_time);
  const end = toMinutes(slot.end_time);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (start === null || end === null) return 'upcoming';
  if (nowMinutes < start) return 'upcoming';
  if (nowMinutes >= start && nowMinutes < end) return 'live';
  return 'completed';
}

export function todaysClasses(classes: ClassSlot[], now: Date = new Date()): ClassSlot[] {
  const dow = now.getDay(); // 0=Sun..6=Sat, matches `day_of_week` in the schema
  return classes
    .filter((c) => c.day_of_week === dow)
    .sort((a, b) => (toMinutes(a.start_time) ?? 0) - (toMinutes(b.start_time) ?? 0));
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
