# Push notifications

The app uses Firebase Cloud Messaging for delivery and Notifee for foreground
notifications. Notifications with a `notification` payload are displayed by the
OS in background/quit mode; the background handler only displays data-only
messages, avoiding duplicate alerts. Tapping a notification opens the app.
No automatic call answering or screen-specific routing is included.

Android requests notification permission, creates the high-importance
`voicetamil_general` channel, and uses a white microphone status-bar icon.
User notification settings can silence or block alerts.

## Device tokens

After a successful login or completed signup and permission approval, the app
saves one token record per user:

`users/{uid}/fcmTokens`

```json
{ "token": "FCM_DEVICE_TOKEN", "platform": "android", "updatedAt": 1234567890 }
```

Tokens refresh automatically by replacing this record, so old tokens and legacy
installation entries do not accumulate. The most recently registered device is
the active notification device for the account. Logging out removes the record
and revokes its FCM token. Existing Firebase database rules must permit the
authenticated user to write their own token record; never expose it publicly.
No server credentials belong in the mobile app.

## Sending

Use Firebase Console > Messaging for a test notification, targeting a saved FCM
token. For server delivery, send through Firebase Admin SDK or FCM HTTP v1. Example
Admin SDK payload (run on your trusted backend):

```js
await admin.messaging().send({
  token: deviceToken,
  notification: { title: 'Speakly', body: 'You have a new notification.' },
  android: {
    priority: 'high',
    notification: { channelId: 'voicetamil_general', sound: 'default' },
  },
  apns: { payload: { aps: { sound: 'default' } } },
});
```

For data-only delivery use string `data.title` and `data.body` instead of
`notification`. Set Android priority to `high`; for iOS set
`apns.payload.aps.contentAvailable: true` with headers `apns-push-type: background`
and `apns-priority: 5`. Silent delivery is controlled by the OS and is not guaranteed;
prefer a notification payload for user-visible alerts.

This repository integrates the receiving app. Automatic sends for calls or other
business events still need a trusted backend trigger.

## Native setup and verification

Rebuild/install Android after adding the native packages; Metro reload is not enough.
Open the app, allow notifications, sign in, then send a notification to the saved
token with the app open, minimized, and normally closed. Confirm one notification
per message and that tapping opens the app. Android force-stop prevents delivery
until the user reopens the app. No automated test cases were added.

For iOS, the repository does not contain `GoogleService-Info.plist` or APNs credentials:

1. Register the iOS app `com.ra.speakly` in the same Firebase project.
2. Add its downloaded `GoogleService-Info.plist` to the Speakly Xcode target,
   including Copy Bundle Resources.
3. Upload an APNs authentication key in Firebase > Project settings > Cloud Messaging.
4. Select your signing team and a provisioning profile supporting Push Notifications.
   Push entitlement and Remote notifications background mode are configured in the repo.
   Xcode selects the appropriate APNs environment when signing/exporting.
5. Run `pod install` inside `ios`, rebuild, and verify on a physical iPhone.

Foreground presentation is handled by Notifee; Firebase's own iOS foreground
presentation is disabled in `firebase.json` to prevent duplicates. Headless iOS
launches do not mount the app's normal UI or request permissions.

References: [Firebase messaging](https://rnfirebase.io/messaging/usage),
[Notifee display](https://notifee.app/react-native/docs/displaying-a-notification/),
[iOS setup](https://rnfirebase.io/messaging/usage/ios-setup).
