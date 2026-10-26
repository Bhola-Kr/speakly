# App updates

The app reads Firebase Realtime Database `/configs` and compares the phone's
installed native version with `updateAppVersion`. The splash screen also displays
the installed version. `package.json` is not used as the installed app version.

```json
{
  "configs": {
    "currentAppVersion": "1.0.0",
    "updateAppVersion": "1.0.0"
  }
}
```

`currentAppVersion` is a fallback release target only when `updateAppVersion` is
absent. It never overrides the installed version. Keep both values as strings
using `major.minor.patch`. Invalid versions and equal/older targets show nothing.

For a phone running `1.0.0`:

| updateAppVersion | Behavior |
| --- | --- |
| `2.0.0` | Required modal. No dismiss button; Android Back cannot dismiss it. |
| `1.1.0` | Optional modal with Update now and Maybe later. |
| `1.0.1` | Inline, dismissible performance-update message. |
| `1.0.0` | No update notice. |

A major-number increase takes priority over minor/patch changes. Optional
dismissals persist for that installed/target version pair; a different release
can prompt again. Required updates ignore dismissal preferences. Returning from
the store without installing does not dismiss the required update.

Changes arrive through a realtime listener. The app also rereads config when it
returns to the foreground, and reattaches its listener after authentication
changes. Ensure existing Firebase rules allow the intended users to read
`/configs` (including unauthenticated users if prompts should appear before login).
Do not grant clients write access just for this feature. Missing or unreadable
config does not block startup; a previously received valid requirement remains
in effect if a subsequent read fails.

Prompts are deferred on Splash, Call, IncomingCall, OutgoingCall, OnlineRoom, and
Payment to avoid interrupting calls or payments. They appear after leaving those
screens. This is an app UI update gate, not server-side access enforcement.

## Store links

Android defaults to the existing Speakly Play Store listing:
`https://play.google.com/store/apps/details?id=com.ra.speakly`.
An optional `/configs/playStoreUrl` can override it with another Play Store URL.

For iOS, set `/configs/appStoreUrl` to the real HTTPS `apps.apple.com` listing
before announcing an update. No App Store ID is currently configured in this repo.
If a store link is missing or fails to open, the notice shows an inline error and
keeps the update button available for retry.

Publish the release to the store before increasing the Firebase release target.
Set Android `versionName` in `android/app/build.gradle` and iOS marketing version
(`CFBundleShortVersionString`) for each release. A phone that already installed
the target (or a newer version) will not see the notice again.

## Build and verify

`react-native-device-info` reads the native installed version. Rebuild the app
after installing dependencies; Metro refresh alone cannot load a new native
module. For iOS run `pod install` in `ios` before rebuilding.

Run `npx jest __tests__/appVersion.test.ts __tests__/AppUpdateGate.test.tsx --runInBand`.
On a device, verify the three example targets, the store button, Android Back,
optional dismissal after restart, and returning from the store without updating.

### Local Android autolinking cache

During validation, Gradle generated an empty
`android/build/generated/autolinking/autolinking.json`, even though running the
CLI directly returned valid JSON. Android compilation passed after regenerating
that build artifact from the project root:

```sh
mkdir -p android/build/generated/autolinking
node node_modules/@react-native-community/cli/build/bin.js config > android/build/generated/autolinking/autolinking.json
cd android
./gradlew :app:compileDebugKotlin
```

Native version API reference:
[react-native-device-info getVersion](https://github.com/react-native-device-info/react-native-device-info#getversion).

The iOS dependency check did not complete: the local CocoaPods spec sources could
not resolve the project's existing `Firebase/Auth (= 12.15.0)` dependency. Refresh
those sources with `pod install --repo-update` before attempting an iOS build.
