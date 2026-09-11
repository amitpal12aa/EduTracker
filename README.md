# EduTrack AI — Android

Talks to the exact same Supabase project as the website — same URL, same
anon key, same tables, same RLS, same RPCs. No separate backend, no
separate database. The website itself was never modified by this project.

## Applying the Phase 2 database migration (REQUIRED, not yet applied)

`supabase/migrations/20260821000000_edutrack_ble_attendance_sessions.sql`
adds the BLE/QR attendance-session backend (2 new tables, 4 new RPCs — see
the comment block at the top of the file for the full design). This
migration has been WRITTEN but **NOT applied** to your live database — this
sandbox has no network access or database credentials to run it. Apply it
yourself before the Attendance screens will work:

```bash
# from your web project (the one with supabase/migrations already tracked)
supabase db push
# or paste the file's contents into Supabase Dashboard → SQL Editor → Run
```

The website keeps working identically before and after — nothing existing
is altered, only two new tables/four new functions are added.

## Running the app

```bash
npm install
npx expo prebuild --platform android
npx expo run:android
```

Needs Android Studio + SDK locally. This must be a **dev client / bare**
build, not Expo Go — the BLE native modules require it.

### A note on the BLE libraries
`react-native-ble-plx` (scanning) and `react-native-ble-advertiser`
(broadcasting) are wired up in `src/lib/ble.ts` against their documented
APIs, but I had no network access in this sandbox to `npm install` them or
verify the exact call signature `npm install` will resolve — the advertiser
library in particular has some API drift between versions/forks. If
`expo run:android` reports a method mismatch on `BLEAdvertiser`, check the
README of whatever version lands in your `node_modules` and adjust the 3
calls in that file — everything else (permissions, payload format, the
rotating code, the server-side verification) doesn't depend on that detail.

## What's real vs. placeholder right now
See the Phase 3 final report delivered in chat for the full, current
breakdown. Short version: auth, dashboards, real-schema timetable,
notifications (both roles), marks, assignment submission + grading, and
the full BLE/QR/anti-proxy attendance system are real and
backend-verified. Quizzes cannot be completed — the `quizzes` table has no
question-bank/answer schema, so real quiz-taking would need a new
migration, which was not authorized this phase; it's flagged as remaining
work rather than faked. Admin People screen supports add/list/search;
edit/deactivate and push notifications are still open.
