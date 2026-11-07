# Pic-Curate — Architecture & Roadmap (approved 2026-11-07)

## Context
New Expo/React Native/TypeScript app, built from scratch. The project dir currently holds only the mascot art:
- `assets/mascot/removedbg_mascot.png` — 475×570 **RGBA, true transparency** → the one the app uses.
- `assets/mascot/mascot.png` — 400×480 **RGB, checkerboard baked into pixels** (not transparent) → unused, kept untouched.
Art: cozy cream bunny, pink scarf, blue cocoa mug, yellow feet. Neither file is modified; animation is done with transforms only.

Goal: photos (camera or gallery) become physical objects in a bin. They fall, stack, can be dragged, and react to phone tilt. Kira the mascot comments on events, and streaks and milestones encourage daily contributions. Local-first, no backend, runs in Expo Go.

## Decisions locked in (from product owner)
| Topic | Decision |
|---|---|
| Daily contribution | ≥1 photo added, camera **or** gallery; day = device-local calendar date |
| Removals | Stats never go down (lifetime total, streak days, achievements are permanent) |
| Missed day | Hard reset to 0; today is "at risk", not broken, until local midnight passes; best streak kept |
| Duplicates | Allowed, no detection |
| Bin size | 20 photos max at ~110 dp long side (changed from 30 after M2 device test); oldest overflow to an Archive grid, swappable back |
| Remove UX | Drag photo onto a trash zone that appears while dragging; removes app copy only, never the gallery original |
| Relaunch | Photos re-drop from the top; no position saving |
| Mascot | "Kira": cozy and gentle, occasionally snobbish. Text bubbles only, no audio |

## 1. Concept analysis
Three loops: **Collect** (add photo → it drops in), **Play** (drag, tilt, shake the pile), **Return** (streak, milestones, Kira nagging gently). Collect + Return drive retention; Play is the delight. The physics feel is the main risk, so it gets built first.

## 2. Technical challenges
1. **Physics on the JS thread.** Matter.js is plain JS and can't run as a Reanimated worklet. Plan: fixed-step `Engine.update` (1/60 s) inside a `requestAnimationFrame` loop. Each frame, write all body transforms into **one** Reanimated shared value (flat array `[x,y,angle,…]`). Each photo's `useAnimatedStyle` reads its slot on the UI thread, so React never re-renders per frame. Bodies sleep (`enableSleeping`), and the bin cap (~30) bounds the cost.
2. **Dragging.** Matter's `MouseConstraint` is DOM-only. Instead: a single Gesture Handler `Pan` over the bin (`runOnJS` → JS), `Query.point` to hit-test, then a `Constraint` from the touch point to the body (stiffness ~0.2). Releasing keeps the body's velocity, so flings feel natural. While dragging, the trash zone shows, and dropping inside it removes the photo.
3. **Tilt.** `expo-sensors` `Accelerometer` at ~60 Hz with a low-pass filter. Its x/y set `engine.gravity`. **Hardware calibration is required:** axis signs differ between iOS and Android, and portrait lock must be handled. A small `axisSign` per platform is tuned on real devices. Shake (high-pass spike) → random impulses. Sensors pause when the app goes to background.
4. **Photo bodies.** Rectangles sized to the photo's aspect ratio (long side ~110 dp), polaroid-style white border, and moderate restitution/friction so the pile stacks without jitter. Walls/floor are static bodies sized from the bin's `onLayout`.
5. **Image weight.** Picker returns full-res images (often 12 MP+), and dozens on screen would exhaust memory. On import, `expo-image-manipulator` resizes to 1024 px long side (JPEG 0.8). The bin renders that copy, and the Archive grid uses the same files at small size.
6. **Persistence.** Picker/camera URIs live in the cache and can be purged. Copy the resized file into `documentDirectory/photos/<id>.jpg` (expo-file-system). Metadata + stats are one small JSON blob in AsyncStorage. If a write fails, keep the original and show an error, so nothing is lost silently.
7. **Streak correctness.** Date maths across midnight, DST, and timezone changes. Store contribution days as local `YYYY-MM-DD` strings and compare calendar dates, never 24-hour spans. This is pure logic with unit tests.

## 3. Architecture
Single-screen app with one modal and a few layers, without a state library:
```
UI (React components) ── reads/writes ──> AppStore (React context + useReducer, persisted JSON)
   │                                         │
   ├─ BinView ─ owns PhysicsWorld (Matter)   ├─ photos[] {id, uri, w, h, addedAt, inBin}
   │     ↑ gravity from useTilt()            ├─ stats {totalAdded, days[], best, unlocked[]}
   ├─ Kira ─ listens to app events ─────────>└─ events → dialogue picker
   └─ ProgressModal / ArchiveModal
```
- **Physics stays outside React state.** `PhysicsWorld` is a plain class (add/remove body, step, hit-test, set gravity). React only tells it which photos are in the bin.
- **Logic is pure functions.** `streak.ts` and `achievements.ts` take stats + date and return new stats + unlocked events. They can be unit tested without a device.
- **Kira dialogue** = a typed lines table keyed by event (`added`, `addedFromCamera`, `removed`, `streakUp`, `streakAtRisk`, `streakBroken`, `milestone:<id>`, `idle`, `tapped`, `binFull`, `welcomeBack`). The picker avoids repeating the last few lines. An idle timer (random 45–120 s, only while the app is in the foreground) triggers random lines. Kira animates through Reanimated transforms (bob, hop on add, sniff-tilt on remove, wobble on milestone). The PNG itself is never altered.
- **No navigation library.** The two secondary views (Progress, Archive) are RN `Modal`s.

## 4. Dependencies & Expo Go compatibility (Expo SDK 58 is current; install via `npx expo install` so versions match the SDK)
| Package | Purpose | Expo Go |
|---|---|---|
| expo (blank-typescript template), react-native, typescript | base | ✅ |
| expo-image-picker | gallery **and** camera capture (`launchCameraAsync`) | ✅ |
| expo-sensors | Accelerometer | ✅ |
| react-native-gesture-handler | Pan / tap | ✅ bundled |
| react-native-reanimated (+ react-native-worklets) | UI-thread transforms, Kira anims | ✅ bundled |
| matter-js + @types/matter-js | 2D physics | ✅ plain JS |
| expo-file-system | durable photo storage | ✅ |
| expo-image-manipulator | resize on import | ✅ |
| @react-native-async-storage/async-storage | metadata/stats JSON | ✅ |
| jest-expo (dev) | logic tests | n/a |

**Not adding:**
- **expo-camera:** the picker's camera mode already covers "take a photo". Add a custom in-app viewfinder later only if wanted.
- **Skia:** Views + Reanimated are enough at about 30 bodies.
- **expo-router / navigation:** a single screen doesn't need it.
- **expo-sqlite:** one small JSON blob is enough.
- **expo-notifications:** streak reminders are out of v1 scope.
- **Backend / sync.**

## 5. Project structure
```
pic_curate/
  App.tsx                     # providers (GestureHandlerRootView, AppStore), Home screen
  app.json                    # name, icon, camera/photos permission strings, portrait lock
  assets/mascot/…             # untouched originals
  src/
    store/AppStore.tsx        # context + reducer + load/save JSON
    store/photos.ts           # import (pick → resize → copy), remove (delete file)
    logic/streak.ts           # pure: recordContribution, currentStreak(today)
    logic/achievements.ts     # pure: milestone table + check()
    logic/*.test.ts
    physics/PhysicsWorld.ts   # Matter wrapper
    physics/useTilt.ts        # accelerometer → gravity (filtered, calibrated)
    components/BinView.tsx    # physics loop, pan gesture, trash zone
    components/PhotoBody.tsx  # animated polaroid
    components/Kira.tsx       # mascot + speech bubble + anims
    components/AddButtons.tsx # Camera / Gallery
    components/ProgressModal.tsx
    components/ArchiveModal.tsx
    mascot/lines.ts           # Kira's dialogue table
```

## 6. Screens & interactions
**Home (the bin).** Kira at the top, about 30% of the height, with a speech bubble. The bin fills the middle. At the bottom: Camera and Gallery buttons, plus a streak chip (🔥 n) that opens Progress.
- Add: photo drops in from the top. Kira reacts, with milestone/streak lines taking priority. Gallery multi-select is allowed.
- Drag/fling photos. Tilting the phone shifts gravity, and shaking scatters the pile.
- Dragging shows a trash zone at the bottom. Dropping a photo there removes it (with a 4 s undo toast) and Kira reacts.
- Tap a photo to see it full-size in a simple modal.
- Tap Kira for a random line.
- If the bin is over the cap, the oldest photo moves to the Archive and Kira remarks the bin is full.

**Progress modal.** Current streak, best streak, lifetime photos added, a 5-week contribution calendar, and an achievements list (locked/unlocked).

**Archive modal.** Grid of overflowed photos. Tapping one sends it back to the bin, which pushes the oldest bin photo out.

**First launch.** Kira introduces herself, and permission prompts appear only when a button is first tapped.

Draft milestones: first photo; 10/25/50/100/250/500 total; 3/7/14/30/100-day streak; first camera photo; first comeback after a broken streak.

Kira's voice sample: *"oh, a new one~ it's actually rather nice. I'd have framed it differently, but fine ☕"* / *"three days in a row. I suppose you have taste after all."*

## 7. Roadmap (each milestone ends with something runnable in Expo Go)
- **M0 Scaffold:** blank-typescript app, install deps, lint/tsc pass, Kira image shows on screen.
- **M1 Physics spike** (riskiest part, uses colored placeholder boxes): Matter loop → shared value → animated views; walls sized from layout; drag + fling; tilt gravity with per-platform calibration on a real phone; FPS check with 30 boxes on Android. *Go/no-go checkpoint for the approach.*
- **M2 Real photos:** pick/capture → resize → copy to documents → bodies with aspect ratio + polaroid frame; persistence and re-drop on relaunch; trash-zone removal + undo; bin cap + Archive.
- **M3 Progress:** `streak.ts` / `achievements.ts` with unit tests (midnight, DST, missed day, same-day multiples, removal doesn't decrement); Progress modal.
- **M4 Kira:** dialogue table, event wiring with priorities, idle chatter, tap reactions, transform animations, first-launch intro.
- **M5 Polish:** haptics (expo-haptics, in Expo Go) on drop/milestone, empty-state, permission-denied states, app icon/splash built from a *copy* of the mascot, real-device pass on iOS + Android.

## 8. Remaining open questions (defaults used unless you object)
- Kira's pronouns are assumed to be "she". Tell me if that's wrong.
- Platforms: test both iOS and Android in Expo Go? (default: both)
- Haptics in M5: okay to add expo-haptics? (default: yes, small)
- Streak reminder notifications: confirm they are out of v1 (default: out)

## Verification
- `npx tsc --noEmit` and `npx jest` (streak/achievement tests) at each milestone.
- `npx expo start` → scan in Expo Go on a real phone (sensors don't work in simulators). Check per milestone: drop/stack/drag/fling, tilt direction matches the physical tilt on each OS, smooth FPS with 30 photos, photos survive app kill + relaunch, streak rolls correctly when the device date is changed.
- Confirm `assets/mascot/*` checksums are unchanged (`sha256sum` before/after).
