export type QrAttendancePayload = { v: 1; sessionId: string; code: string };

export function encodeQrPayload(sessionId: string, code: string): string {
  const payload: QrAttendancePayload = { v: 1, sessionId, code };
  return JSON.stringify(payload);
}

export function decodeQrPayload(raw: string): QrAttendancePayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === 1 && typeof parsed.sessionId === 'string' && typeof parsed.code === 'string') {
      return parsed as QrAttendancePayload;
    }
    return null;
  } catch {
    return null;
  }
}
