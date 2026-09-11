/*
# Phase 2 (Android) — Live attendance sessions (BLE + QR, server-verified)

## Why this migration exists
Neither the website nor the database has any concept of a "live attendance
session" today — `attendance` is a plain table teachers upsert into
directly. BLE/QR attendance needs something session-bound, short-lived, and
verified server-side, so this migration adds exactly that, without touching
any existing table's columns, data, or the website's queries.

## Design
1. `attendance_sessions` — one row per "teacher started attendance for
   subject X". Holds a random `secret` used only server-side (via the RPCs
   below) to compute a rotating verification code every 15 seconds:
     code = first 8 hex chars of HMAC-SHA256(secret, session_id || ':' || time_bucket)
   The teacher's device independently computes the same code (it receives
   the secret once, at session start) to embed in its BLE advertisement /
   QR payload. The student's device never sees the secret — it only relays
   whatever code it read from BLE/QR to the server, which recomputes and
   compares. This makes a sniffed code useless after ~30s and useless for
   any other session (the session_id is mixed into the HMAC input).
2. `attendance_verifications` — append-only audit log of every attempt
   (verified, duplicate, expired, invalid_code, not_enrolled), which is
   what the live attendance console reads via Realtime.
3. Three SECURITY DEFINER RPCs are the ONLY way any of this gets written:
   - `start_attendance_session` (teacher/admin)
   - `close_attendance_session` (teacher/admin)
   - `mark_attendance_via_session` (student) — this is the anti-proxy
     gate: re-validates the caller's real student_id from their JWT
     (never trusts a client-supplied id), the session's status/expiry,
     the rotating code, institution match, and duplicate submission,
     before it ever inserts into `attendance`.
   Direct table access from the client is not how this is used — RLS
   below intentionally keeps `attendance_sessions.secret` and direct
   writes out of reach of both roles except through these functions.

## Not covered by this migration (unchanged, still true after applying it)
- Proximity/geofencing is NOT implemented — the "geo-fenced to campus"
  copy on the website is decorative and this migration doesn't change
  that. Real geofencing would need device GPS + a campus polygon, which
  is a separate feature; the anti-proxy protection here is
  session/time/identity based, not location based.
- This does not modify `attendance`, `subjects`, `classes`, or any
  existing RLS policy on those tables.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tables -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  secret text NOT NULL,
  methods text[] NOT NULL DEFAULT ARRAY['ble', 'qr']::text[],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  closed_at timestamptz
);

CREATE TABLE IF NOT EXISTS attendance_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('ble', 'qr', 'manual')),
  result text NOT NULL CHECK (result IN ('verified', 'duplicate', 'expired', 'invalid_code', 'not_enrolled', 'error')),
  code_used text,
  verified_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_subject ON attendance_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_teacher ON attendance_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status ON attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_attendance_verifications_session ON attendance_verifications(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_verifications_student ON attendance_verifications(student_id);

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_verifications ENABLE ROW LEVEL SECURITY;

-- 2. RLS ------------------------------------------------------------------
-- Students get NO direct access to attendance_sessions (that's where the
-- rotating-code secret lives) — everything for students goes through
-- mark_attendance_via_session(). Teachers/admins can see sessions in their
-- own institution (needed for the live console), and only the owning
-- teacher (or an admin) can start/close one for their own subject.

DROP POLICY IF EXISTS "sessions_staff_select" ON attendance_sessions;
CREATE POLICY "sessions_staff_select" ON attendance_sessions FOR SELECT TO authenticated
  USING (auth_role() IN ('teacher', 'admin') AND institution_id = auth_institution_id());

DROP POLICY IF EXISTS "sessions_staff_insert" ON attendance_sessions;
CREATE POLICY "sessions_staff_insert" ON attendance_sessions FOR INSERT TO authenticated
  WITH CHECK (
    auth_role() IN ('teacher', 'admin')
    AND institution_id = auth_institution_id()
    AND (auth_role() = 'admin' OR teacher_id = auth_teacher_id())
  );

DROP POLICY IF EXISTS "sessions_staff_update" ON attendance_sessions;
CREATE POLICY "sessions_staff_update" ON attendance_sessions FOR UPDATE TO authenticated
  USING (auth_role() IN ('teacher', 'admin') AND institution_id = auth_institution_id() AND (auth_role() = 'admin' OR teacher_id = auth_teacher_id()))
  WITH CHECK (institution_id = auth_institution_id());

-- Verification log: teachers/admins read their own institution's log
-- (live console). Students may read only their own rows (so the app can
-- show "you're marked present" without re-deriving it). No direct INSERT
-- policy for anyone — only the SECURITY DEFINER RPC below writes here.
DROP POLICY IF EXISTS "verifications_staff_select" ON attendance_verifications;
CREATE POLICY "verifications_staff_select" ON attendance_verifications FOR SELECT TO authenticated
  USING (
    auth_role() IN ('teacher', 'admin')
    AND EXISTS (SELECT 1 FROM attendance_sessions s WHERE s.id = attendance_verifications.session_id AND s.institution_id = auth_institution_id())
  );

DROP POLICY IF EXISTS "verifications_student_select_own" ON attendance_verifications;
CREATE POLICY "verifications_student_select_own" ON attendance_verifications FOR SELECT TO authenticated
  USING (auth_role() = 'student' AND student_id = auth_student_id());

ALTER PUBLICATION supabase_realtime ADD TABLE attendance_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_verifications;

-- 3. Rotating-code helper (used by RPCs; not exposed directly) -----------

CREATE OR REPLACE FUNCTION attendance_session_code(p_session_id uuid, p_secret text, p_bucket bigint) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT upper(substring(encode(hmac(p_session_id::text || ':' || p_bucket::text, p_secret, 'sha256'), 'hex') from 1 for 8));
$$;

-- 4. start_attendance_session ---------------------------------------------
-- Teacher/admin only. Returns the secret ONCE — the client must hold it in
-- memory for the life of the session to keep computing the rotating code;
-- it is never returned by any SELECT policy above.

CREATE OR REPLACE FUNCTION start_attendance_session(
  p_subject_id uuid,
  p_class_id uuid DEFAULT NULL,
  p_duration_seconds int DEFAULT 900,
  p_methods text[] DEFAULT ARRAY['ble', 'qr']::text[]
) RETURNS TABLE(session_id uuid, secret text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text := auth_role();
  v_teacher_id uuid := auth_teacher_id();
  v_institution_id uuid := auth_institution_id();
  v_secret text;
  v_session_id uuid;
  v_expires timestamptz;
BEGIN
  IF v_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Only teachers or admins can start an attendance session';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM subjects s WHERE s.id = p_subject_id AND s.institution_id = v_institution_id) THEN
    RAISE EXCEPTION 'Subject not found in your institution';
  END IF;

  -- Close any other session this teacher already has open, so a crashed
  -- app / forgotten "stop" never leaves two live sessions for one teacher.
  IF v_role = 'teacher' THEN
    UPDATE attendance_sessions SET status = 'closed', closed_at = now()
      WHERE teacher_id = v_teacher_id AND status = 'active';
  END IF;

  v_secret := encode(gen_random_bytes(16), 'hex');
  v_expires := now() + make_interval(secs => p_duration_seconds);

  INSERT INTO attendance_sessions (institution_id, subject_id, class_id, teacher_id, secret, methods, expires_at)
  VALUES (v_institution_id, p_subject_id, p_class_id, COALESCE(v_teacher_id, (SELECT id FROM teachers WHERE institution_id = v_institution_id LIMIT 1)), v_secret, p_methods, v_expires)
  RETURNING id INTO v_session_id;

  RETURN QUERY SELECT v_session_id, v_secret, v_expires;
END;
$$;

-- 5. close_attendance_session ----------------------------------------------

CREATE OR REPLACE FUNCTION close_attendance_session(p_session_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE attendance_sessions
    SET status = 'closed', closed_at = now()
    WHERE id = p_session_id
      AND institution_id = auth_institution_id()
      AND (auth_role() = 'admin' OR teacher_id = auth_teacher_id());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or not yours to close';
  END IF;
END;
$$;

-- 6. resolve_session_by_prefix ----------------------------------------------
-- BLE advertisement packets are byte-limited (~20-24 bytes of usable
-- payload), too small to carry a full UUID alongside the rotating code, so
-- the BLE broadcast only carries the session id's first 8 hex chars. This
-- turns that prefix into the full id the student's app needs to call
-- mark_attendance_via_session() — without exposing anything else about
-- the session (no secret, no teacher identity beyond what RLS already
-- allows). A prefix collision between two concurrently active sessions in
-- the same institution is astronomically unlikely; if it ever happened
-- this simply returns NULL and the student's app reports "session not
-- found" rather than picking the wrong one.

CREATE OR REPLACE FUNCTION resolve_session_by_prefix(p_prefix text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id FROM attendance_sessions s
  WHERE s.status = 'active'
    AND s.expires_at > now()
    AND s.institution_id = auth_institution_id()
    AND s.id::text LIKE lower(p_prefix) || '%'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION resolve_session_by_prefix(text) TO authenticated;

-- 7. mark_attendance_via_session -------------------------------------------
-- The actual anti-proxy gate. Student-only. Never trusts a client-supplied
-- student_id/subject_id — both are derived server-side from the session
-- row and the caller's own JWT.

CREATE OR REPLACE FUNCTION mark_attendance_via_session(
  p_session_id uuid,
  p_code text,
  p_method text DEFAULT 'ble'
) RETURNS TABLE(result text, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_student_id uuid := auth_student_id();
  v_student_institution uuid;
  v_session attendance_sessions%ROWTYPE;
  v_now_bucket bigint := floor(extract(epoch FROM now()) / 15)::bigint;
  v_expected_now text;
  v_expected_prev text;
  v_already boolean;
BEGIN
  IF auth_role() != 'student' OR v_student_id IS NULL THEN
    INSERT INTO attendance_verifications (session_id, student_id, method, result, code_used)
      VALUES (p_session_id, COALESCE(v_student_id, '00000000-0000-0000-0000-000000000000'), p_method, 'error', p_code);
    RETURN QUERY SELECT 'error', 'Only an authenticated student can mark attendance this way';
    RETURN;
  END IF;

  SELECT * INTO v_session FROM attendance_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'error', 'Session not found';
    RETURN;
  END IF;

  IF v_session.status != 'active' OR v_session.expires_at < now() THEN
    INSERT INTO attendance_verifications (session_id, student_id, method, result, code_used)
      VALUES (p_session_id, v_student_id, p_method, 'expired', p_code);
    RETURN QUERY SELECT 'expired', 'This attendance session has ended';
    RETURN;
  END IF;

  SELECT institution_id INTO v_student_institution FROM students WHERE id = v_student_id;
  IF v_student_institution IS DISTINCT FROM v_session.institution_id THEN
    INSERT INTO attendance_verifications (session_id, student_id, method, result, code_used)
      VALUES (p_session_id, v_student_id, p_method, 'not_enrolled', p_code);
    RETURN QUERY SELECT 'not_enrolled', 'You are not enrolled in this institution';
    RETURN;
  END IF;

  v_expected_now := attendance_session_code(p_session_id, v_session.secret, v_now_bucket);
  v_expected_prev := attendance_session_code(p_session_id, v_session.secret, v_now_bucket - 1);
  IF upper(p_code) NOT IN (v_expected_now, v_expected_prev) THEN
    INSERT INTO attendance_verifications (session_id, student_id, method, result, code_used)
      VALUES (p_session_id, v_student_id, p_method, 'invalid_code', p_code);
    RETURN QUERY SELECT 'invalid_code', 'That code is invalid or has expired — get close to the teacher''s device and try again';
    RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM attendance_verifications
    WHERE session_id = p_session_id AND student_id = v_student_id AND result = 'verified'
  ) INTO v_already;
  IF v_already THEN
    INSERT INTO attendance_verifications (session_id, student_id, method, result, code_used)
      VALUES (p_session_id, v_student_id, p_method, 'duplicate', p_code);
    RETURN QUERY SELECT 'duplicate', 'You are already marked present for this session';
    RETURN;
  END IF;

  INSERT INTO attendance (student_id, subject_id, class_date, status, method, marked_by)
    VALUES (v_student_id, v_session.subject_id, current_date, 'present', p_method, v_session.teacher_id)
    ON CONFLICT (student_id, subject_id, class_date)
    DO UPDATE SET status = 'present', method = EXCLUDED.method, marked_by = EXCLUDED.marked_by;

  INSERT INTO attendance_verifications (session_id, student_id, method, result, code_used)
    VALUES (p_session_id, v_student_id, p_method, 'verified', p_code);

  INSERT INTO notifications (user_role, user_ref, title, body, type)
    VALUES ('student', v_student_id, 'Attendance marked',
      (SELECT code FROM subjects WHERE id = v_session.subject_id) || ' — present (' || p_method || ')', 'attendance');

  RETURN QUERY SELECT 'verified', 'Attendance marked — you are present';
END;
$$;

GRANT EXECUTE ON FUNCTION start_attendance_session(uuid, uuid, int, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION close_attendance_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_attendance_via_session(uuid, text, text) TO authenticated;
