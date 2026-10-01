# Admin user management

Set `ADMIN_PHONE_NUMBER` in `src/config/admin.ts` using the Firebase Auth phone
format (for example, `+919876543210`). When that account opens Profile, an
Administration section exposes the user-management screen.

The screen loads users in cursor-based pages as the administrator scrolls; it
does not show Previous/Next page controls. Search checks the complete `users`
collection by UID, phone, English name, or Tamil name, rather than only the
records already loaded on screen. Because Realtime Database does not provide a
multi-field substring query, a search reads the collection and filters it on
the client. For a very large user collection this should be replaced by a
server-maintained search index.

Tapping any result opens an edit modal. Only the explicitly supported profile,
verification, and wallet fields are updated, so unrelated record data is not
replaced. Invalid field values, missing IDs, and Firebase failures are handled.
Administrators can also enable the Chat Host switch for female accounts. Only
female users with the root-level `isChatHost` value set to `true` appear in the
male Chat tab.
Deletion requires confirmation and removes the user's Realtime Database user,
room, and owned call-history nodes. It does not delete the Firebase
Authentication account; that requires Firebase Admin SDK on a trusted backend.

The client-side phone check is navigation protection, not a security boundary.
Production Realtime Database rules must independently restrict reads and writes
to an admin identity, preferably using a custom Firebase Auth claim. Never rely
only on the mobile application's configured phone number because application
code can be modified by an attacker.
