# Background voice calls

Android starts `OngoingCallService` after microphone permission is granted and
before joining Agora. The service declares microphone/media playback types,
shows an ongoing notification, and holds a partial wake lock for the call.
Tapping the notification returns to the existing app activity. Ending the call
or unmounting its screen stops the service and releases the wake lock.

Native one-second events drive the call timer and sequential minute billing
while the screen is off. Billing still uses the shared call rate; locking the
phone does not pause charges. Delayed billing events are processed sequentially.

The waiting-room background listener ignores call transitions and unfocused
screens. `goOffline` also refuses to clear an accepted or active call using a
Firebase transaction, covering races between lifecycle events and acceptance.
Temporary Agora peer/network interruptions show a reconnecting status rather
than immediately closing the call. A dropped peer gets two minutes to reconnect;
additional minute charges pause during that grace period. An explicit hang-up or terminal Agora failure
still ends it. Audio interruptions retain the Agora session and let the SDK
recover audio when the operating system releases it.

On iOS, the audio background mode is enabled. A cellular call can take priority
over the microphone/audio on either platform. This feature cannot provide
simultaneous cellular and app-call audio, survive an explicit force-stop, or
keep calls working without network access. This is not a CallKit/Android Telecom
integration and does not add answering new incoming calls from a locked screen.

## Device verification

Rebuild/install the native app on two physical devices. Start a call, press the
power key, and verify both directions of audio for several minutes. Check that
Firebase room status stays active, billing remains at the configured rate, and
unlocking returns to the same call. Repeat with Home/app switching. Verify the
ongoing notification returns to the call and disappears after either side hangs
up. Exercise cellular-call interruptions, a temporary network loss, and denied
microphone permission. No automated test cases are added.

## Navigating during a call

The call session is mounted above the navigation stack. The Call route launches
it, while the header back arrow and Android Back button minimize it. A green
return-to-call bar remains visible across Home, Wallet, Payment, and other screens.
Minimizing only hides the call view; it does not recreate Agora or restart billing.
Payment completion can reset navigation without affecting the call. If the other
participant hangs up during checkout, checkout stays open.

For male callers, the active call shows a one-time vibrating low-balance prompt
when the live wallet balance reaches three minutes of call credit. Choosing Add
minimizes the call and opens Wallet so a recharge pack can be selected. If a
recharge lifts the balance above the threshold, the prompt is armed again for a
later low-balance point in the same call.

The screen stays awake only while the full call view is visible. A second call
is blocked while one is active, and logout requires ending the current call.
App-update and review prompts are deferred while the call exists. Verify a
recharge while talking, minimize/restore repeatedly, and have the peer hang up
during payment.

## Female availability

After a female host chooses Go Online, availability is independent of the Online
Room screen. Navigating elsewhere, locking the screen, or switching apps does
not write an offline status. Firebase `onDisconnect` operations mark both the
profile and room offline when the device actually loses its Realtime Database
connection. The app remembers the host's choice and restores the waiting room
after connectivity returns. Go Offline and logout explicitly clear that choice.

An app-level room listener displays incoming calls over other screens and posts
a silent notification when the app process is running in the background. On
Android the notification includes Accept and Reject actions with call icons;
iOS exposes matching notification-category actions. Reject updates Firebase in
the background. Accept updates Firebase, opens the app, and continues into the
call screen. Reliable
delivery after the operating system terminates or force-stops the process still
requires a trusted backend/Cloud Function to send an FCM notification when a
room changes to `ringing`; mobile client code cannot guarantee execution after
process termination.
