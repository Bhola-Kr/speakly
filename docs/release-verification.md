# Speakly local verification

No deployment, publishing, commits, or production Firebase writes were performed. Existing root lockfile changes were preserved. No dependencies were added. Existing screen designs, routes, pricing, commissions and withdrawal thresholds remain in use.

## All ten requirements

| Requirement | Local result | External verification |
| --- | --- | --- |
| 1. Hinglish | App-owned reachable native copy completed; terminology, topic IDs and route regression checks pass. Home visually checked on Android emulator. | Hosted WebView page copy and comprehensive physical-device/font-size review. |
| 2. Audio isolation | Unique channels, intended participant tokens, atomic caller exclusivity, concurrent claims, old callbacks and pending initialization verified. | Four-device simultaneous audio and real RTC transport. |
| 3. Billing | Real RTDB transactions verify zero-charge unanswered/failed calls, confirmed connected intervals, rounding, reconnect pause, duplicate settlement, abandoned sessions and wallet/history/credit reconciliation. | Real hardware/network behavior. |
| 4. Host availability alerts | Real emulator roles/ownership and trigger handlers verify approved hosts, customer audience, availability transition and deduplication. | Real push delivery. |
| 5. Next-host fallback | Component tests verify timeout/progress, cancellation/back navigation/pending lookup, host exclusion, price cap and wallet guard. | Native transport behavior. |
| 6. Notification calling | Handler tests verify persisted exact-host intent, auth deferral, freshness and concurrent/repeated tap deduplication. Existing Home guarded call action retained. | OS background/terminated launch and authenticated native end-to-end flow. |
| 7. Lock-screen security | Manifest/Activity protections reviewed and Android build passed. | Physical keyguard/OEM/incoming alert behavior. |
| 8. Token ownership | Real transactions verify canonical account transfer, stale logout protection, private registration and current role/preferences filtering. | Real device token delivery. |
| 9. New-customer alerts | Completed-onboarding transition, approved-host audience, event deduplication and ordinary-login suppression verified. | Real host push/tap. |
| 10. Admin monitoring | Authenticated admin realtime REST stream observed live call transitions and final single history/credit. Date/time filters and status/topic display mapping pass. | Native admin visual review with real accounts. |

## Security and accounting

The new local RTDB rules default to deny. Clients cannot claim calls or write connected time, charges, earnings, financial histories, role approval or wallet balances. Safe profile edits, acceptance/rejection, per-call cancellation, existing admin operations and history archiving remain usable. Token values now live in a private server-owned registry. Real Auth emulator identities exercised both permitted and denied operations.

Signup bonus claims and withdrawal reservations now use authenticated server transactions: retaining client financial writes would bypass the protections. Existing bonus configuration/defaults, once-only claim, minimum withdrawal, available-balance reservation, admin rejection and payout behavior are preserved and tested. Gateway/recharge math is retained; no payment provider was called.

Claim/token/billing endpoints require call protocol header 2. The server claims unique call_<callId> channels atomically and returns only the authenticated intended participant's token, with stable UIDs 1/2. Public room tokens remain empty. Session-generation/engine guards prevent pending token responses and old callbacks from joining or ending a replacement session.

Both intended participants report connection and five-second heartbeats. Duration advances to the earlier server heartbeat while both 15-second connection leases remain valid. Disconnect/expiry pauses accrual; ended calls cannot reopen. Existing prepaid-minute rounding remains. Wallet and history changes share an atomic transaction; host credit uses the existing idempotent ledger with a retryable history trigger. A warmed transaction helper fixes the real Admin SDK cold-cache/null callback problem discovered in emulator testing.

Admin displays confirmed connected duration, both identities, final charges, credited earnings, end time, archived history and updates to previously loaded pages. Reconnect request failures are handled; leaving outgoing calling prevents delayed timeout/fallback work.

## Tests actually run

- Backend npm run build: PASS.
- Android ./gradlew assembleDebug: PASS.
- Metro Android production JavaScript bundle: PASS.
- Five Node suites: **40 passed, zero failed or skipped**, including the integration parent and its 15 subtests.
- Integration uses real local Auth/RTDB emulator bearer authorization, security rules, Admin transactions, concurrent claims, reconnect accounting, registration ownership, signup credits, withdrawals, existing frontend admin rejection/payout transactions through REST CAS, local HTTP API handlers, stale cleanup, notification triggers and admin realtime SSE data.
- Trigger messaging transport alone is mocked. RTC transport is mocked in component tests. Functions handlers run through a local Node HTTP server; triggers/scheduler run through exported .run methods. Cloud Functions event delivery/retry infrastructure, real push and real audio are not claimed as tested.
- Android debug APK installed and home rendered on emulator. Metro uses adb reverse and localhost developer setting. Network was disabled before launch to prevent production writes; the emulator remains offline. This verifies offline startup/home, not native online backend integration.
- Root npx tsc --noEmit: FAIL with 13 existing diagnostics. Virtual compiler comparison against tracked HEAD source found 18 baseline diagnostics and **zero new diagnostic fingerprints**. Remaining errors concern mixed RN/backend fetch typings, AbortSignal, unknown JSON results and StyleSheet.absoluteFillObject.
- Existing Jest command cannot start: missing @react-native/jest-preset. No global configuration or dependencies were restructured. Focused suites use existing TypeScript/React Test Renderer and Node's test runner.
- Stored topic IDs and stack/tab route names compared with HEAD: PASS.
- App-owned TS/TSX literal/JSX prohibited-terminology scan: PASS.

### Reproduce

From firebase-backend in one terminal (Java 17 and cached CLI used here):

    npx --yes firebase-tools@13.35.1 emulators:start --only database,auth --project demo-speakly-local

From the repository root in another:

    npm --prefix firebase-backend/functions run build
    node --test __tests__/callBilling.node.cjs __tests__/callFlow.node.cjs __tests__/copyAndAdmin.node.cjs __tests__/notifications.node.cjs __tests__/firebase.integration.node.cjs

Fixtures are pinned to demo-speakly-local, Auth 127.0.0.1:9099, RTDB 127.0.0.1:9000 and namespace demo-speakly-local-default-rtdb. They replace the local speakly fixture root and cannot select production. Credential-free backend initialization is restricted to demo projects with emulator variables.

## Exact blockers and release prerequisites

- Read-only deployed-rule inspection failed with IAM 403: the available account lacks firebase.projects.get and firebasedatabase.instances.get. Local rules are verified; deployed rules could not be inspected or compared. No production rules were changed.
- firebase-backend/functions/adminsdk.json is absent. Demo tests need no service-account key; normal production credential loading and provider-backed behavior cannot be verified with the available credentials.
- About/Privacy/Terms screens load www.joinspeakly.com WebViews. Their source is outside this repository and publishing is prohibited. Native app-owned copy is complete; hosted content remains under the website owner's control.
- Four-device audio, real RTC reconnects, FCM/APNs delivery, OS notification launches and physical keyguard behavior need devices/external services. Existing payment, OTP and Google sign-in providers were preserved; no real money/SMS/sign-in was attempted.
- Existing AppUpdateGate forces major updates; minor/patch notices are dismissible. Coordinate the mandatory-major-version configuration, backend, rules and latest clients. New clients must not be released alone against the old backend. No release version or production configuration changed here.
- Old public users/*/fcmTokens data requires a controlled release migration. Updated registration removes legacy aliases, but accounts that never launch will not self-migrate. Local rules do not erase deployed data. Drain old calls during the mandatory update.
- Root speakly transactions retain the database architecture. Tests establish correctness, not production-size contention/latency.

No known failing regression remains in the tested changes. The baseline TypeScript/Jest issues remain. Coordinated release is **not signed off** until external checks, deployed-rule review and production configuration are completed.

## Changed-file inventory

The following inventory covers the current implementation and tests; root package-lock.json and yarn.lock were already dirty and were preserved. Generated CLI logs are excluded.

- `__tests__/callBilling.node.cjs`: Interval/idempotency and wallet-settlement regression tests.
- `__tests__/callFlow.node.cjs`: Actual component/notification-handler tests using native transport mocks.
- `__tests__/copyAndAdmin.node.cjs`: Copy terminology, stored IDs, route preservation and date filters.
- `__tests__/firebase.integration.node.cjs`: Real emulator rules, transaction, authorization and realtime integration tests.
- `__tests__/notifications.node.cjs`: Role/ownership/onboarding notification fixture tests.
- `android/app/src/main/AndroidManifest.xml`: Prevent normal activity interaction over keyguard.
- `android/app/src/main/java/com/ra/speakly/MainActivity.kt`: Clear lock-screen activity flags with API guard.
- `docs/release-verification.md`: Actual results, test boundaries, blockers and inventory.
- `firebase-backend/database.rules.json`: Deny unsafe direct financial/session/role/token writes while preserving permitted native/admin operations.
- `firebase-backend/firebase.json`: Configure local database rules and Auth/RTDB emulators.
- `firebase-backend/functions/src/callBilling.ts`: Authenticated atomic call claims, confirmed intervals, wallet/history settlement.
- `firebase-backend/functions/src/callHistoryEvents.ts`: Record unanswered history and retry idempotent host-credit recovery.
- `firebase-backend/functions/src/databaseTransaction.ts`: Warm Admin cache for real transactional callbacks.
- `firebase-backend/functions/src/expertCompensation.ts`: Server withdrawal reservation and private notification tokens; retain commission/payout behavior.
- `firebase-backend/functions/src/hostOnlineNotifications.ts`: Approved-host availability transitions, current customer audience, deduplication and freshness.
- `firebase-backend/functions/src/index.ts`: Wire secured endpoints/triggers, protocol gating, requester authorization and private token lookup.
- `firebase-backend/functions/src/onboardingNotifications.ts`: Once-only genuine new-customer host/admin alerts.
- `firebase-backend/functions/src/payments.ts`: Server-owned once-only signup credit and visible copy; retain gateways/recharge math.
- `firebase-backend/functions/src/pushTokenOwnership.ts`: Private canonical ownership, registration/removal and current-role audiences.
- `firebase-backend/functions/src/rtcAuthorization.ts`: Issue participant-only per-session RTC credentials.
- `firebase-backend/functions/src/staleCalls.ts`: Finalize abandoned calls through authoritative settlement with guarded resets.
- `src/App.tsx`: Session-keyed calls, guarded incoming actions, calling/ringing recognition and visible copy.
- `src/api/api.ts`: Auth, call protocol/version headers and localized request errors.
- `src/api/otpService.ts`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/components/AppAlert.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/components/VerificationAnimation.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/components/appUpdate/AppUpdateGate.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/components/appUpdate/AppUpdateNotice.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/constants/constants.ts`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/constants/strings.ts`: Shared Hinglish and display-only topic/status mapping; stored identifiers retained.
- `src/firebase/RoomService.ts`: Backend claims/billing, per-call guarded signaling and bounded fallback selection.
- `src/firebase/authData.ts`: Preserve protected existing account records; safe in-call metadata edits and visible copy.
- `src/firebase/expertEarnings.ts`: Use authenticated server reservation endpoint and localized copy.
- `src/firebase/signupOffer.ts`: Use authenticated server signup-credit endpoint.
- `src/hooks/useCallBalanceGuard.ts`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/hooks/useFirstCallRechargePrompt.ts`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/notifications/pushNotifications.ts`: Canonical token sync/logout and persisted serialized fresh exact-host notification intents.
- `src/payment/payuCheckout.ts`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/payment/razorpayCheckout.ts`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/AudioVerificationScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/AvatarScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/BirthYearScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/FAQScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/FemaleBottomTabs.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/FemaleHistoryScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/FemaleHomeScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/GenderScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/LanguageScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/LoginScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/NicknameScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/OnboardingPreferencesScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/OtpScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/SplashScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/admin/AdminUsersScreen.tsx`: Live room/history/credit data, identity/time/charge fields, search/date filters and labels using existing design.
- `src/screens/agora/CallScreen.tsx`: Own RTC token, peer/session guards, reconnect reporting and error handling, confirmed duration/countdown.
- `src/screens/agora/IncomingCallModal.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/agora/OnlineRoomScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/agora/incomingCall/IncomingCallScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/agora/outgoingCall/OutgoingCallScreen.tsx`: Timed cancellable fallback, wallet/rate/exclusion checks, back-navigation and timeout guards.
- `src/screens/home/Banner.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/home/CategoryList.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/home/GuestLoginModal.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/home/Header.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/home/HomeScreen.tsx`: Notification intent through authenticated existing wallet/availability call action; use actual claimed random room.
- `src/screens/home/SignupOfferModal.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/home/UserCard.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/payment/TransactionScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/payment/WalletScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/profile/EditProfileScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/profile/ProfileScreenSettings.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/profile/dummyData.ts`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/recentScreen/EmptyState.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/recentScreen/ManHistoryScreen.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/screens/recentScreen/RecentCallCard.tsx`: Targeted Hinglish user-visible labels/messages or display-only topic mapping; existing layout/navigation retained.
- `src/utils/callMonitoring.ts`: Match local displayed/ISO dates and times.
