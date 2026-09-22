# Admin user management

Set `ADMIN_PHONE_NUMBER` in `src/config/admin.ts` using the Firebase Auth phone
format (for example, `+919876543210`). When that account opens Profile, an
Administration section exposes the user-management screen.

The screen searches `users` by UID, phone, English name, or Tamil name. User
records are edited as JSON so fields remain dynamic as the database schema
changes. Invalid JSON, arrays, empty values, oversized records, missing IDs,
and Firebase failures are handled without replacing the existing record.
Deletion requires confirmation and removes the user's Realtime Database user,
room, and owned call-history nodes. It does not delete the Firebase
Authentication account; that requires Firebase Admin SDK on a trusted backend.

The client-side phone check is navigation protection, not a security boundary.
Production Realtime Database rules must independently restrict reads and writes
to an admin identity, preferably using a custom Firebase Auth claim. Never rely
only on the mobile application's configured phone number because application
code can be modified by an attacker.
