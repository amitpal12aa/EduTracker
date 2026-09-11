import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, AttendanceVerification } from './supabase';
import { computeSessionCode, currentTimeBucket, encodeBlePayload } from './attendanceCode';
import { requestBlePermissions, startAdvertising, stopAdvertising } from './ble';

export type LiveSessionState = {
  sessionId: string;
  secret: string;
  expiresAt: string;
} | null;

export function useTeacherAttendanceSession() {
  const [session, setSession] = useState<LiveSessionState>(null);
  const [code, setCode] = useState<string>('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [bleStatus, setBleStatus] = useState<'idle' | 'advertising' | 'unavailable'>('idle');
  const [verifications, setVerifications] = useState<AttendanceVerification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // The 15s tick below lives inside an effect that only re-runs when the
  // session id changes (see its dependency array), so it must not read
  // `bleStatus` state directly — that would capture a stale closure and
  // never see the 'advertising' transition that happens moments after
  // start() requests permission. A ref is always current.
  const bleStatusRef = useRef(bleStatus);
  useEffect(() => { bleStatusRef.current = bleStatus; }, [bleStatus]);

  const clearTick = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  };

  const start = useCallback(async (subjectId: string, classId: string | null, durationSeconds: number) => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('start_attendance_session', {
      p_subject_id: subjectId,
      p_class_id: classId,
      p_duration_seconds: durationSeconds,
      p_methods: ['ble', 'qr'],
    });
    if (rpcError || !data || data.length === 0) {
      setError(rpcError?.message ?? 'Could not start attendance session');
      return;
    }
    const row = data[0] as { session_id: string; secret: string; expires_at: string };
    setSession({ sessionId: row.session_id, secret: row.secret, expiresAt: row.expires_at });
    setVerifications([]);

    const perm = await requestBlePermissions('advertiser');
    if (!perm.granted) {
      setBleStatus('unavailable');
      setError(perm.message ?? 'Bluetooth permission denied — QR fallback is still available.');
    } else {
      setBleStatus('advertising');
    }
  }, []);

  const stop = useCallback(async () => {
    clearTick();
    if (bleStatus === 'advertising') {
      await stopAdvertising();
    }
    setBleStatus('idle');
    if (session) {
      await supabase.rpc('close_attendance_session', { p_session_id: session.sessionId });
    }
    setSession(null);
    setCode('');
  }, [session, bleStatus]);

  // Rotate the code every 15s, keep the BLE advertisement in sync with it,
  // and update the remaining-time countdown.
  useEffect(() => {
    if (!session) { clearTick(); return; }

    const tick = async () => {
      const bucket = currentTimeBucket();
      const newCode = computeSessionCode(session.sessionId, session.secret, bucket);
      setCode(newCode);
      setRemainingSeconds(Math.max(0, Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 1000)));

      if (bleStatusRef.current === 'advertising') {
        try {
          await stopAdvertising();
          await startAdvertising(encodeBlePayload(session.sessionId, newCode));
        } catch (e) {
          setBleStatus('unavailable');
          setError(e instanceof Error ? e.message : 'BLE advertising failed on this device.');
        }
      }
    };

    tick();
    tickRef.current = setInterval(tick, 15000);
    const secondTimer = setInterval(() => {
      setRemainingSeconds(Math.max(0, Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);

    return () => { clearTick(); clearInterval(secondTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.sessionId]);

  // Live verification feed for the console.
  useEffect(() => {
    if (!session) return;
    supabase
      .from('attendance_verifications')
      .select('*')
      .eq('session_id', session.sessionId)
      .order('verified_at', { ascending: false })
      .then(({ data }) => setVerifications((data as AttendanceVerification[]) ?? []));

    const channel = supabase
      .channel(`session-console-${session.sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendance_verifications', filter: `session_id=eq.${session.sessionId}` },
        (payload) => setVerifications((prev) => [payload.new as AttendanceVerification, ...prev])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.sessionId]);

  // Auto-end the session when time runs out — otherwise BLE keeps
  // advertising (and the QR keeps displaying) a code the server will now
  // reject as expired, which wastes battery and misleads the teacher into
  // thinking the session is still live.
  const autoStoppedRef = useRef(false);
  useEffect(() => {
    if (!session) { autoStoppedRef.current = false; return; }
    if (remainingSeconds <= 0 && !autoStoppedRef.current) {
      autoStoppedRef.current = true;
      stop();
    }
  }, [remainingSeconds, session, stop]);

  useEffect(() => () => { clearTick(); if (bleStatusRef.current === 'advertising') stopAdvertising(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { session, code, remainingSeconds, bleStatus, verifications, error, start, stop };
}
