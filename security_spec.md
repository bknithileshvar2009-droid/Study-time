# Security Specification & Threat Model

## 1. Data Invariants

1. **User Data Isolation**: Every resource path (`/users/{userId}/...`) is strictly gated by the authenticated user's `request.auth.uid`. A user cannot read, query, create, update, or delete another user's records.
2. **Identifier Integrity**: Document IDs must not exceed 128 characters and must match the alphanumeric pattern `^[a-zA-Z0-9_\-]+$`.
3. **Session Immutability**: Critical session identifiers (`id`, `userId`, `startTime`, `createdAt`) cannot be maliciously altered or re-assigned to other accounts during updates.
4. **Duration & Type Bounds**: Numeric metrics (`accumulatedActiveMs`, `startTime`, `rating`) must be non-negative numbers within sane biological boundaries (e.g., rating between 1 and 5; active study duration cannot be negative or absurdly infinite).
5. **No Client Query Scraping**: List rules must strictly evaluate `request.auth.uid == userId` on the subcollection path to prevent global index dumping.

---

## 2. The "Dirty Dozen" Malicious Payloads

1. **Ghost Field Shadow Write**: Attempt to write `{ "isAdmin": true, "vipAccess": true }` into a session document. Expected: `PERMISSION_DENIED`.
2. **Cross-Tenant ID Spoofing**: Attempt to insert `{ "userId": "attacker_uid" }` into victim `/users/victim_123/sessions/s1`. Expected: `PERMISSION_DENIED`.
3. **Path Traversal / Jumbo Key Attack**: Attempt to create document with 2000-character key with invalid symbols `/users/{uid}/sessions/../../../etc`. Expected: `PERMISSION_DENIED`.
4. **Rating Boundary Violation**: Attempt to update DailyReview with `{ "rating": 9999 }` or `{ "rating": -1 }`. Expected: `PERMISSION_DENIED`.
5. **Type Poisoning Attack**: Attempt to set `accumulatedActiveMs` to a string `"lots_of_hours"` or a nested boolean. Expected: `PERMISSION_DENIED`.
6. **Unauthenticated Read Dump**: Calling `get()` or `list()` on `/users/{victimId}/sessions` without authentication credentials. Expected: `PERMISSION_DENIED`.
7. **Session Timestamp Corruption**: Attempt to update session to mutate its original `createdAt` timestamp. Expected: `PERMISSION_DENIED`.
8. **Malicious Subject Hex Injection**: Attempt to inject 100KB executable CSS payload inside `color` property. Expected: `PERMISSION_DENIED`.
9. **Snapshot Data Injection Attack**: Attempt to write a snapshot without required `timestamp` or `dataJson`. Expected: `PERMISSION_DENIED`.
10. **Target Hours Denial-of-Wallet**: Attempt to set negative `targetHours: -500` or huge floating array. Expected: `PERMISSION_DENIED`.
11. **Foreign User Session Delete**: Authenticated user B attempting to call `delete()` on `/users/userA/sessions/session1`. Expected: `PERMISSION_DENIED`.
12. **Settings Escalation**: Non-owner attempting to modify `/users/{userId}/settings/{settingsId}`. Expected: `PERMISSION_DENIED`.

---

## 3. Test Runner Coverage

The security rules defined in `firestore.rules` enforce these constraints at the database engine level.
