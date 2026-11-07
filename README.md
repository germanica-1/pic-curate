<p align="center">
  <img src="assets/mascot/removedbg_mascot.png" alt="Kira, the Pic-Curate mascot: a cream bunny in a pink scarf holding a mug of cocoa" width="180" />
</p>

<h1 align="center">Pic-Curate</h1>

<p align="center">
  A playful photo collection app for iOS and Android. Your photos become physical objects in a basket:
  they fall, stack and tumble when you tilt your phone, while Kira the bunny keeps an eye on your daily streak.
</p>

<p align="center">
  Expo SDK 58 · React Native 0.88 · TypeScript · Runs in Expo Go · Local-first, no backend
</p>

---

## Table of contents

- [Overview](#overview)
- [Key features](#key-features)
- [Screenshots](#screenshots)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the app](#running-the-app)
- [Testing and code quality](#testing-and-code-quality)
- [Data and privacy](#data-and-privacy)
- [Troubleshooting](#troubleshooting)
- [Future improvements](#future-improvements)
- [License](#license)

## Overview

Pic-Curate turns a photo collection into something you can play with. Take a picture or pick some from your gallery, and each one drops into a knitted basket as a small polaroid. The photos obey gravity, collide and stack. You can grab and fling them, tilt the phone to slide the pile around, or shake it to toss everything up.

Kira, the app's mascot, sits on the rim of the basket. She comments when you add or remove photos, celebrates streaks and achievements, and occasionally speaks up on her own. She is cozy, gentle and just a little bit of a snob.

To encourage a daily habit, the app tracks contribution streaks, lifetime totals and 14 achievements. Everything stays on the device: there are no accounts, no servers and no network calls.

## Key features

**Physics photo bin**
- Every photo is a rigid body (Matter.js) with gravity, collisions and stacking.
- Drag and fling photos; the last photo you grab is drawn on top.
- Tilting the phone changes the direction of gravity (accelerometer). Shaking tosses the pile.
- Photos keep their own shape (portrait or landscape) inside a polaroid frame, sized to the screen width.
- The bin holds 20 photos. Older ones move to an **Archive**, and tapping one there drops it back in.
- When the app reopens, photos rain back into the bin one by one.

**Adding, viewing and removing**
- Take a photo with the camera, or pick up to 20 at once from the gallery.
- Tap a photo to view it full screen.
- Drag a photo to the bottom of the bin to remove it, with a 4-second **Undo**. Only the app's copy is deleted, never the original in your gallery.

**Kira, the mascot**
- Context-aware lines when photos are added (one, several, or from the camera), removed, restored, or when the bin overflows.
- The opening line depends on your streak: a first-time introduction, a welcome back, a nudge when the streak is at risk, or a gentle note when it broke.
- Achievements and new streak days take priority over routine comments.
- Hops, tilts and wiggles to match the moment. Tap her for a reply. After 45–120 seconds of quiet she says something on her own, without repeating recent lines.
- All animations are disabled when the system "Reduce Motion" setting is on.

**Progress and achievements**
- Current streak, best streak and lifetime photo count.
- A 5-week contribution calendar.
- 14 achievements: first photo, first camera photo, totals (10, 25, 50, 100, 250, 500), streaks (3, 7, 14, 30, 100 days) and returning after a missed day.
- A flame chip on the main screen shows the streak and turns pink when it is at risk.

**Polish**
- Haptic feedback for grabbing, removing, adding and achievements. Android uses the system haptics engine.
- An empty-bin hint, an "Open Settings" shortcut when camera access is denied, and an app icon and splash screen made from the mascot.

### Streak rules

| Rule | Behaviour |
| --- | --- |
| What counts | At least one photo added that day, from the camera or the gallery |
| Day boundary | Midnight in the phone's local time zone (calendar dates, safe across DST changes) |
| Removing photos | Never lowers any statistic: totals, streak days and achievements are permanent |
| Missing a day | The current streak resets to 0; the best streak is kept |
| Today without a photo yet | The streak is "at risk", not broken, until midnight passes |
| Duplicates | Allowed; re-adding the same photo counts again |

## Screenshots

There are no app screenshots in the repository yet. These are the visual assets that ship with the app:

| Mascot (`assets/mascot/removedbg_mascot.png`) | App icon (`assets/icon.png`) |
| :---: | :---: |
| <img src="assets/mascot/removedbg_mascot.png" alt="Kira the mascot" width="160" /> | <img src="assets/icon.png" alt="Pic-Curate app icon" width="160" /> |

## Technology stack

| Area | Package | Version | Used for |
| --- | --- | --- | --- |
| Framework | `expo` | ~58.0.23 | App runtime, tooling, Expo Go support |
| | `react-native` / `react` | 0.88.1 / 19.3.0 | UI |
| Language | `typescript` | ~6.0.3 | Static typing (strict mode) |
| Physics | `matter-js` | ^0.20.0 | 2D rigid-body simulation |
| Gestures | `react-native-gesture-handler` | ~3.3.0 | Drag, fling and tap in the bin (v3 hooks API) |
| Animation | `react-native-reanimated` (+ `react-native-worklets`) | 4.7.1 | Moving photos and Kira on the UI thread |
| Sensors | `expo-sensors` | ~58.0.4 | Accelerometer for tilt and shake |
| Photos | `expo-image-picker` | ~58.0.10 | Camera capture and gallery selection |
| | `expo-image-manipulator` | ~58.0.16 | Resizing imports to 1024 px JPEG |
| Storage | `expo-file-system` | ~58.0.13 | Durable photo copies in the app's documents folder |
| | `@react-native-async-storage/async-storage` | 2.2.0 | Photo list and statistics (JSON) |
| Feedback | `expo-haptics` | ~58.0.7 | Haptic feedback |
| UI | `@expo/vector-icons` (+ `expo-font`) | ^15.0.2 | Icons |
| | `expo-splash-screen`, `expo-status-bar` | ~58.0.x | Splash screen and status bar |
| Testing | `jest`, `jest-expo` | ^30.5.2, ^58.0.14 | Unit tests |
| Linting | `eslint`, `eslint-config-expo` | ^9.39.5, ^58.0.4 | Linting with Expo's rules |

Every runtime package is either bundled with Expo Go or plain JavaScript, so the app runs in Expo Go with no native build.

## Project structure

```text
pic-curate/
├── App.tsx                     # Main screen: Kira, the basket, the action dock, modals
├── index.ts                    # Entry point (registerRootComponent)
├── app.json                    # Expo config: name, icons, splash, permission texts
├── assets/
│   ├── mascot/                 # Original mascot artwork (removedbg_mascot.png is used in-app)
│   ├── icon.png                # App icon (generated from the mascot)
│   ├── android-icon-*.png      # Android adaptive and themed icons
│   ├── splash-icon.png         # Splash screen image
│   └── favicon.png
├── src/
│   ├── components/
│   │   ├── BinView.tsx         # Physics loop, drag/tap gestures, trash zone, empty state
│   │   ├── PhotoBody.tsx       # One animated photo that follows its physics body
│   │   ├── Kira.tsx            # Mascot, speech bubble and animations
│   │   ├── ArchiveModal.tsx    # Grid of photos that overflowed the bin
│   │   ├── ProgressModal.tsx   # Streaks, calendar and achievements
│   │   └── PhotoViewer.tsx     # Full-screen photo view
│   ├── physics/
│   │   ├── PhysicsWorld.ts     # Matter.js wrapper: bodies, walls, grab, shake
│   │   └── useTilt.ts          # Accelerometer → gravity, shake detection
│   ├── store/
│   │   ├── reducer.ts          # Pure app state: photos, bin cap, statistics
│   │   ├── AppStore.tsx        # React context, loading and saving
│   │   └── photos.ts           # Pick, resize and store photos; file cleanup
│   ├── logic/
│   │   ├── streak.ts           # Day keys and streak calculations
│   │   └── achievements.ts     # Achievement table and unlock checks
│   ├── mascot/
│   │   ├── lines.ts            # Kira's dialogue, moods and line picker
│   │   ├── react.ts            # Chooses Kira's reaction to each state change
│   │   └── useKira.ts          # Current line and idle chatter
│   ├── haptics.ts              # Platform-aware haptic feedback
│   └── theme.ts                # Colour palette
├── jest.global-setup.js        # Runs tests in a fixed time zone (America/New_York)
├── eslint.config.js
└── tsconfig.json
```

Tests sit next to the code they cover (`*.test.ts`).

## How it works

**Physics loop.** `PhysicsWorld` steps Matter.js at a fixed 60 Hz on the JavaScript thread. After each frame, the position and angle of every body are written into a single Reanimated shared value. Each `PhotoBody` reads its slot from that value inside an animated style, so photos move on the UI thread without React re-rendering. Collision shapes are plain rectangles and catch-up steps are capped at two per frame to keep the frame rate up on mid-range phones.

**Dragging.** A single pan gesture covers the bin. On touch, the topmost body under the finger is attached to the finger with a spring constraint, so releasing it keeps its velocity (a fling). A short touch that barely moves opens the photo instead.

**Tilt.** The accelerometer is low-pass filtered and mapped to screen-space gravity (iOS and Android report opposite signs). Resting bodies are woken when gravity changes, otherwise sleeping photos would ignore the tilt.

**State.** `reducer.ts` is a pure reducer holding the photo list and statistics. Statistics only change when photos are added, which is how "stats never go down" is enforced. `AppStore` loads the saved JSON on start and saves after every change.

**Kira's reactions.** Every action is run through the same pure reducer to get the next state, and `reactionFor(prev, next)` decides what Kira says. Achievement unlocks and streak days come first, then a full bin, then camera, batch or single adds.

## Prerequisites

- **Node.js** 22.13+ or 24.3+ (required by Expo SDK 58), with **npm**
- **Git**
- A phone with **Expo Go** installed, updated to a version that supports **SDK 58**:
  - [Expo Go for Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - [Expo Go for iOS](https://apps.apple.com/app/expo-go/id982107779)
- The phone and the computer on the **same Wi-Fi network** (or use tunnel mode, see below)

A physical device is strongly recommended: tilt, shake, haptics and the camera don't work, or work only partly, in simulators and emulators.

## Installation

1. Clone the repository:

   ```bash
   git clone git@github.com:germanica-1/pic-curate.git
   # or over HTTPS:
   git clone https://github.com/germanica-1/pic-curate.git
   cd pic-curate
   ```

2. Install dependencies from the lockfile:

   ```bash
   npm ci
   ```

   (`npm install` also works, but `npm ci` installs the exact versions in `package-lock.json`.)

3. Optionally, check that the project is healthy:

   ```bash
   npx expo-doctor
   ```

### Adding dependencies

Always add packages with `npx expo install`, which picks versions compatible with the Expo SDK:

```bash
npx expo install <package-name>
```

Only add packages that Expo Go already includes or that are pure JavaScript. Anything that needs custom native code would stop the app from running in Expo Go.

## Running the app

Start the development server:

```bash
npm start
# same as: npx expo start
```

Then open the app:

- **Android:** open Expo Go and scan the QR code shown in the terminal.
- **iOS:** scan the QR code with the Camera app and open the link in Expo Go.

Other useful ways to start it:

| Command | When to use it |
| --- | --- |
| `npx expo start --lan` | Force the local-network address (the default for most setups) |
| `npx expo start --tunnel` | The phone can't reach the computer (different networks, firewall, VPN) |
| `npx expo start --clear` | Clear the bundler cache after dependency or config changes |
| `npx expo start --no-dev --minify` | Production-like JavaScript, to judge real performance |
| `npm run android` | Open on a connected Android device or running emulator |
| `npm run ios` | Open in the iOS Simulator (macOS with Xcode only) |

> **Note:** web isn't supported. `npm run web` is left over from the Expo template, and the web dependencies (`react-dom`, `react-native-web`) aren't installed.

On first launch Kira introduces herself. The camera permission prompt appears the first time you tap the camera button.

## Testing and code quality

```bash
npm test            # Jest unit tests (jest-expo preset)
npm run typecheck   # TypeScript, no emit
npm run lint        # ESLint with Expo's config
```

The tests cover the logic that can be checked without a device:

| Test file | What it covers |
| --- | --- |
| `src/physics/PhysicsWorld.test.ts` | Stacking inside the bin, dragging, waking on tilt, shaking, removal |
| `src/store/reducer.test.ts` | Bin cap and archive, undo, statistics, loading and migrating saved data |
| `src/logic/streak.test.ts` | Local dates, DST changes, at-risk and broken streaks, best streak, comebacks |
| `src/mascot/mascot.test.ts` | Which reaction Kira picks, opening lines, placeholder filling, no repeats |
| `src/haptics.test.ts` | Android system haptics, fallbacks for older Android versions, iOS feedback |

Tests run in the `America/New_York` time zone (set in `jest.global-setup.js`) so daylight-saving cases behave the same on every machine. Setting `process.env.TZ` inside a test file has no effect.

## Data and privacy

Everything stays on the device. Nothing is uploaded, and the app makes no network calls.

| Data | Where it is stored |
| --- | --- |
| Photos | Resized copies (max 1024 px, JPEG) in the app's documents folder, under `photos/` |
| Photo list and statistics | AsyncStorage, key `pic-curate/state/v1` |

- Originals in your gallery are never changed or deleted.
- Removing a photo deletes only the app's copy, after the 4-second undo window.
- If saved data ever can't be read, a backup copy is kept under a `pic-curate/state/v1.corrupt-<timestamp>` key instead of being overwritten.
- In Expo Go, the data belongs to Expo Go's sandbox for this project. Clearing Expo Go's storage or uninstalling it removes your bin.

## Troubleshooting

| Problem | What to try |
| --- | --- |
| Expo Go can't connect or times out | Make sure the phone and computer are on the same Wi-Fi. Check that your firewall allows port 8081. Otherwise use `npx expo start --tunnel`. |
| "Project is incompatible with this version of Expo Go" | Update Expo Go from the app store. The project uses SDK 58, and Expo Go supports only the latest SDK. |
| Old code still shows after changes | Restart with `npx expo start --clear`, then reload the app in Expo Go. |
| Photos don't move when tilting | Simulators and emulators have no real accelerometer, so use a physical phone. Tilt only shifts the pile; a phone lying flat has almost no sideways gravity. |
| No vibration (Android) | The app uses the system haptics, which follow the phone's setting. Turn on *Settings → Sound & vibration → Vibration & haptics → Touch feedback* (names vary by brand). If your keyboard doesn't vibrate, the app won't either. |
| No vibration (iOS) | Check *Settings → Sounds & Haptics → System Haptics*. Low Power Mode also turns haptics off. |
| Camera button says access is off | Use the dialog's **Open Settings** button and allow camera access for Expo Go. |
| Physics feels slow or stutters | Development mode is much slower than production. Try `npx expo start --no-dev --minify`. |
| A photo couldn't be added | The app shows how many failed. Pick those photos again; very large or unusual formats can fail to decode. |
| `npm run web` fails | Expected: the app targets iOS and Android only. |

## Future improvements

Ideas that are **not implemented** yet:

- **Streak reminders:** an optional daily local notification when the streak is at risk.
- **In-app camera:** a custom viewfinder (`expo-camera`) instead of the system camera screen.
- **Archive management:** deleting photos directly from the Archive, and sorting or searching it.
- **Backup and export:** saving the collection and statistics to a file, and restoring them.
- **Larger screens:** tablet layouts and rotation support (the app is portrait-only).
- **Store builds:** release builds with EAS Build, where the custom app icon and splash screen appear (Expo Go shows its own).
- **App screenshots:** for this README.

## License

No license has been chosen yet, so all rights are reserved by the author. Please open an issue before reusing the code.
