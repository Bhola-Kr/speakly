# Speakly calling verification — 17 November 2026

All work was local. No production deployment, publishing, production data writes, pricing changes or commission changes were performed. Earlier uncommitted emulator/authentication work was preserved.

## Performance and causes

The final measured call showed **105 ms tap → outgoing screen**, **252 ms tap → reservation response**, and **1,198 ms tap → host ringing acknowledgement**. These durations came from the customer device's clock, so they do not depend on the different emulator clocks. Other observed outgoing-screen times ranged from 16–145 ms. No numerical baseline was captured before the changes.

Previously Home and Recents awaited the claim API before navigating. They now open the existing screen immediately and reserve asynchronously. Ringback starts after the host acknowledges ringing. A missing dependency discovered during live testing was fixed so the new asynchronous reservation starts the status listener and acceptance navigates the customer correctly.

The initial online failure was a missing room despite an online profile. Claims now construct an idle room when necessary and reserve atomically with caller exclusivity and wallet checks. Busy is set during reservation. Acceptance now uses an authenticated, warm server transaction instead of depending on the native client's transaction cache. Old call IDs and expired answers are rejected; repeat answers are idempotent. Online/offline preferences are also changed in a server transaction that preserves reserved calls. The app's `.info/connected` reference was corrected to use Firebase's metadata root rather than `/speakly/.info`.

Agora authorization still restricts each token to the intended participant, unique `call_<callId>` channel and stable channel-scoped UID. The engine uses the authorized app ID. Agora token expiration now uses the installed SDK's expected relative seconds. Stale callbacks and pending token requests are guarded by the RTC generation; native join failures are handled. Hang-up stops local media immediately and sends the authoritative end event.

## Real emulator verification

Identified devices from ADB and their visible logged-in accounts:

- `emulator-5554`: Pixel 7a, customer/admin test account `1111111111`.
- `emulator-5556`: CallMitra AVD, approved host test account `2222222222`.

Both have the debug application installed and use local Functions/Auth/Database services. OTP remains `1234` for the two local accounts.

Observed live:

- Foreground incoming screen and ringtone path, Accept, two Agora peer joins, backend connection quorum and matching backend-driven timers.
- Repeated calls, customer-side and host-side hang-up; both sides exited and the host became online again.
- Busy modal while an independently identified test customer owned a reservation; the second customer could not reserve the host.
- Offline modal with the requested wording. Dismissing a failed setup returns to Main rather than leaving a blank navigation screen.
- Host rejection, unanswered timeout/no alternate-host result, and customer cancellation without wallet debit or host credit. Cancellation dismissed the host's incoming screen.
- Background host notification with Accept/Reject actions. Accept resumed the existing call screen and established the same authorized Agora session.
- Customer network disabled for 20 seconds: confirmed duration froze at **25.826 s**, remained unchanged through the interruption, then resumed after reconnection. Final settlement excluded that gap.
- Availability notification delivered through the local database inbox and Notifee. Tapping it called the selected host. Watchers are consumed once and respect blocks, role, notification preferences and a 24-hour expiry.
- Host dashboard refresh after background-call completion matched backend Online status and credited earnings.

No four-client live audio test was performed. Audible audio quality/crosstalk cannot be certified from RTC peer joins alone.

## Financial records from real local calls

The existing policy charges commenced connected minutes. The local host's existing earnings configuration was ₹1 per paid minute; customer rate was ₹5/minute.

| Session suffix | Confirmed billable time | Customer charge | Host credit | Final result |
| --- | ---: | ---: | ---: | --- |
| `PCuY` (setup never connected) | 0 s | ₹0 | ₹0 | No billable connection |
| `CqH7` | 100.033 s | ₹10 | ₹2 | One finalized history/credit, customer ended |
| `Bc8-` | 29.884 s | ₹5 | ₹1 | One finalized history/credit, host ended |
| `HXgp` | 14.950 s | ₹5 | ₹1 | One finalized history/credit, host ended |
| `c7fK` (network interruption) | 50.845 s | ₹5 | ₹1 | Gap excluded; settled once |
| `vxIx` | 9.673 s | ₹5 | ₹1 | Customer ended; host dashboard updated |
| `As1f` / `hNYm` | 0 s | ₹0 | ₹0 | Rejected / cancelled |

Backend wallet, history, `chargedAmount` and `expertEarnings.creditedCalls` were inspected. Acceptance/ringing alone did not debit the wallet. Existing rounding, withdrawal limits and earnings calculations were retained.

## Automated verification

**37 focused tests passed**, covering actual Auth/RTDB transactions, concurrent independent conversations, caller/host reservation exclusivity, own-token-only authorization, rejected cross-session access, missing-room recovery, repeated/stale acceptance, offline preference, interested-customer alerts, reconnect interval accounting, rounding, insufficient balance, duplicate settlement, crash/abandonment cleanup, fallback cancellation, notification tap handling, and old RTC callbacks during replacement.

Android `assembleDebug` passed. Backend `npm run build` passed. Targeted app ESLint has zero errors; existing style warnings remain. Root `tsc --noEmit` was run and still fails on pre-existing mixed Node/React Native response/AbortSignal types, `constants.ts` unknown JSON types and `styles.ts`'s `absoluteFillObject`. No calling-flow TypeScript errors introduced by this work remain.

Isolated tests avoid the application's running account data:

```sh
npm --prefix firebase-backend/functions run build
# Run in a separate terminal, using Java 21 on PATH:
npx firebase-tools emulators:start --only auth,database --project demo-speakly-local --config firebase-backend/local-verification.json
SPEAKLY_TEST_DATABASE_PORT=19000 SPEAKLY_TEST_AUTH_PORT=19099 node --test __tests__/firebase.integration.node.cjs __tests__/callBilling.node.cjs __tests__/callFlow.node.cjs __tests__/notifications.node.cjs
```

## Remaining boundaries

- Real FCM server delivery is blocked by the available local project's credentials. The successful emulator background test used the running app's realtime listener and local Android notification. A terminated process requires valid FCM delivery; that path is not certified here.
- Physical-device keyguard, OEM battery policies, Bluetooth/audio quality and four simultaneous live clients remain device checks. Full-screen Android launching is subject to OS permissions and policy.
- Scheduled cleanup was exercised by integration tests. This local Functions session does not run the Pub/Sub scheduler, so its automatic scheduled invocation was not verified in the Android session.
- Production needs the updated Functions and database rules released together with the client; nothing was deployed.

## Relevant files

| Files | Change |
| --- | --- |
| `firebase-backend/functions/src/callBilling.ts` | Atomic availability/reservation and authenticated answer/reject/cancel transitions with specific errors |
| `firebase-backend/functions/src/availabilityNotifications.ts` | Interested-customer availability inbox and push dispatch |
| `firebase-backend/functions/src/rtcAuthorization.ts` | Correct token expiry duration |
| `firebase-backend/functions/src/index.ts` | Register calling endpoints/triggers; preserve earlier local initialization/test OTP work |
| `firebase-backend/database.rules.json` | Private recipient-owned notification inbox access |
| `firebase-backend/local-verification.json` | Isolated demo emulator ports |
| `src/screens/agora/outgoingCall/OutgoingCallScreen.tsx` | Immediate asynchronous setup, delivered-ring state, cancellation and diagnostics |
| `src/screens/agora/CallScreen.tsx` | Authorized RTC initialization, lifecycle guards and immediate local hang-up |
| `src/firebase/RoomService.ts` | Server transitions, safe availability changes and reusable terminal rooms |
| `src/App.tsx` | Foreground/background answer handling, ringing acknowledgement and post-call refresh |
| `src/hooks/UserContext.tsx`, `src/screens/FemaleHomeScreen.tsx` | Resume/status/earnings refresh and Busy display |
| `src/screens/home/HomeScreen.tsx`, `src/screens/recentScreen/RecentCallCard.tsx` | Immediate outgoing navigation |
| `src/notifications/pushNotifications.ts` | Server rejection and recipient availability notifications |
| `src/api/api.ts` | Structured API error codes; preserve earlier local URL routing |
| `src/api/calls.ts`, `src/screens/LoginScreen.tsx` | Remove successful OTP response/token logging |
| `src/firebase/firebase.ts`, `index.js` | Preserve local routing; correct Firebase metadata paths |
| `__tests__/firebase.integration.node.cjs`, `__tests__/callFlow.node.cjs` | New transition/availability cases, isolated ports and pending/previous RTC session checks |

## Timer display follow-up

The original display copied each device's separate five-second heartbeat response, causing visible five-second jumps and different displayed seconds. The display now listens to the same room checkpoints on both devices, corrects local time with Firebase `.info/serverTimeOffset`, and renders the ongoing connected interval every 200 ms (the visible text changes once per second). Rendering is independent of billing requests. Projection stops on pause/termination and is bounded by the existing connection lease if signaling is lost. It never writes billable duration, charges or earnings.

Live simultaneous emulator screenshots captured matching `00:29`, `00:30`, `00:31`, `00:32`, `00:33` and `00:34` at one-second sampling intervals, including a heartbeat boundary. The test call was then ended and settled normally.

Five new display-timer tests cover successive seconds, checkpoint continuity, different clock offsets/heartbeat arrival times, preconnection states, paused/reconnected intervals and lease expiry. All **21** timer, call-flow and billing unit/component tests pass. Relevant changes are `src/utils/callDisplayTime.ts`, `src/screens/agora/CallScreen.tsx`, `__tests__/callDisplayTime.node.cjs` and the call-flow test module loader. Backend financial logic was not changed for this follow-up.
