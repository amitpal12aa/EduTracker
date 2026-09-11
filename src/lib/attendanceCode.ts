import HmacSHA256 from 'crypto-js/hmac-sha256';
import encHex from 'crypto-js/enc-hex';

// Mirrors supabase/migrations/20260821000000_edutrack_ble_attendance_sessions.sql
// attendance_session_code(): first 8 hex chars (uppercased) of
// HMAC-SHA256(secret, sessionId + ':' + 15-second time bucket).
// This MUST stay byte-identical to the SQL function — if you change one,
// change both, or every code the teacher's device generates will be
// rejected by the server.
export const CODE_BUCKET_SECONDS = 15;

export function currentTimeBucket(): number {
  return Math.floor(Date.now() / 1000 / CODE_BUCKET_SECONDS);
}

export function computeSessionCode(sessionId: string, secret: string, bucket: number): string {
  const message = `${sessionId}:${bucket}`;
  const digest = HmacSHA256(message, secret).toString(encHex);
  return digest.slice(0, 8).toUpperCase();
}

// BLE manufacturer-data payload the teacher device advertises. Kept short
// (BLE advertisement packets are ~26 bytes total after overhead) — it
// carries only the session id's first 8 chars (enough to disambiguate
// concurrent sessions on a scan, the server RPC call carries the full
// session id separately once the student's app is in range and connects
// logically via the code) and the current rotating code.
export function encodeBlePayload(sessionId: string, code: string): string {
  return `${sessionId.slice(0, 8)}:${code}`;
}

export function decodeBlePayload(payload: string): { sessionPrefix: string; code: string } | null {
  const [sessionPrefix, code] = payload.split(':');
  if (!sessionPrefix || !code) return null;
  return { sessionPrefix, code };
}

// EduTrack's own 128-bit BLE service UUID so student scans only pick up
// EduTrack teacher devices, not every random beacon nearby.
export const EDUTRACK_BLE_SERVICE_UUID = '5f1a2b3c-8e4d-4a6f-9c2e-1d3b5a7c9e0f';
