# Forge Watch prototype

This folder contains a native SwiftUI watchOS prototype. It runs against sample
workouts by default, so it cannot modify the live Forge account or Google Sheets.

## Included flow

- Choose a workout day.
- Review the current exercise and coaching cue.
- Adjust reps and load with watch-native steppers and the Digital Crown.
- Log sets and receive haptic confirmation.
- Run or skip a rest timer, with a completion haptic.
- Finish on a compact session summary.

`ForgeAPIClient` documents the existing `/api/workouts` request contract. It is
not enabled because the current Sites authentication headers are browser-only.
The next integration slice needs device pairing endpoints, a normalized Watch
catalog endpoint, Keychain token storage, and an offline retry queue.

## Run it

1. Install the current stable Xcode from Apple.
2. Open `ForgeWatch.xcodeproj`.
3. Select your development team for the `ForgeWatch` target.
4. Choose an Apple Watch simulator and Run.

The app targets watchOS 11.0 and uses Swift 5.0 language mode. A real device is
recommended for checking Crown input and haptics.

## Production integration outline

1. Add a short-lived pairing code endpoint to the Forge Site.
2. Approve that code from the signed-in Forge web experience.
3. Exchange it on Watch for a revocable, device-scoped bearer token.
4. Store the token in Watch Keychain and authenticate Watch API requests.
5. Queue set writes locally and retry them idempotently when networking returns.
6. Add HealthKit only after the core logging and synchronization flow is stable.
