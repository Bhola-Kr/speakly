# Calling changes and production verification — 18 November 2026

## Current status

Source changes are prepared locally. Production verification remains incomplete until an authorized Firebase maintainer deploys and checks the changes. This laptop's Firebase account received HTTP 403 for cloudfunctions.functions.list on recent-chat-7fd34.

Both Android emulators have been restored to Android user 0 and the deployed backend (USE_LOCAL_BACKEND = false). Separate Android user 10 profiles and test data on local ports 19000/19099/15001 were used for preliminary checks.

## Observed production results

A foreground call between the signed-in customer SAC and host Ravi reproduced the issue:
- Ravi appeared Online on both devices before calling.
- Customer logs measured reservation response at 25,106 ms and ringing acknowledgement at 26,324 ms.
- Host logs measured Accept confirmation at 1,312 ms and the peer joining at 3,836 ms.
- Screenshots before hangup showed 37 and 42 seconds on the two call screens.
- Both histories saved 15 seconds.
- Customer wallet changed from ₹40 to ₹35. Host earnings changed from ₹21 to ₹22.
- The host returned Online on both screens.

The production API delay and truncated history have been reproduced, not resolved on the deployed service. Cold starts, database transaction contention, and server timing need investigation in production logs. Audible audio quality, background/full-screen delivery on production, and post-call FCM delivery are still unverified.

## Prepared source changes

- Prepare participant-specific RTC tokens during ringing/answering, scoped by account and channel with a short cache lifetime.
- Accept using the authorized Firebase room transaction, with a populated cache, matching call ID and expiry checks. Show Connecting while waiting and handle failed acceptance.
- Parallelize independent token authorization and push-recipient reads.
- Use one native-backed heartbeat loop for both participants. Use shared server timing on active calls so display drift does not accumulate.
- Save actual connected milliseconds in history. Both history screens display completed seconds.
- New calls use prorated billing. Charge uses ceil(durationMs / 1000), multiplied by the per-minute rate / 60, rounded to the nearest paise. History retains durationMs independently.
- Example: 1.3 seconds records 1,300 ms and bills two seconds. At ₹5/min the customer charge is ₹0.17.
- Preserve older call billing mode for sessions created before deployment.
- Keep settlement and caller wallet changes atomic and duplicate end events idempotent. Host credit uses the configured host earnings rate.
- Client-provided durations cannot increase charges. A stale/abandoned connection cannot bill an unbounded final interval.

## Deploy from the reviewed source revision

The maintainer needs the complete app and backend changes from this working tree. They are not yet committed or pushed.

From the repository root:

    npm --prefix firebase-backend/functions ci
    npm --prefix firebase-backend/functions run build
    node --test __tests__/callBilling.node.cjs __tests__/callDisplayTime.node.cjs __tests__/callFlow.node.cjs __tests__/notifications.node.cjs

From firebase-backend, with the authorized Firebase account:

    firebase use recent-chat-7fd34
    firebase deploy --only functions:api,functions:cleanupStaleCalls,functions:notifyAllUsersWhenExpertOnline,functions:notifyInterestedWhenHostOnline,functions:notifyInterestedWhenRoomAvailable,functions:settleRecordedCall,database --project recent-chat-7fd34

Review production rules before deploying them. Build and install the updated Android client on both test devices after backend deployment. Run all checks below before publishing.

## Required verification after deployment

1. Confirm host Online on the host dashboard and customer list.
2. Measure Call tap → incoming alert in foreground, background and locked-device states. Check ringtone and Accept/Reject actions.
3. Accept, verify both RTC peers join and timers tick together.
4. End one 30-second call from each side. Compare identical server duration in both histories, caller wallet debit and host configured-rate credit.
5. Check 0.5-second and 1.3-second billing boundaries and duplicate end requests.
6. Interrupt connectivity and verify disconnected gaps are excluded.
7. Verify host returns Online promptly after both hangup paths and customers receive the Hinglish availability notification.
8. Check cancel, reject, unanswered and busy/offline outcomes. No connected duration or charge for unanswered calls.
9. Check cold and warm API response times in Functions logs. Reservation and billing still transact at the shared app root, which requires production performance review if delay persists.

## Local validation

The focused suite passed 26 tests, including the added millisecond-history/rounded-second-charge cases (1 ms, 999 ms, 1,000 ms, 1,300 ms and 30,000 ms), repeated settlement and stale RTC callback handling. Backend TypeScript build passed. These results do not certify production latency or FCM delivery.
