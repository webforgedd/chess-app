# Setting up voice moves (Development Build)

Voice moves need a real speech-recognition library, which cannot run inside the plain
Expo Go app. This is a one-time setup to build your own custom version of Expo Go for
your phone. It takes about 15-20 minutes the first time; after that, you keep using it
like Expo Go for everything (including all the features you already have).

## 1. Install the voice package

```powershell
cd C:\dev\chess-app
npx expo install expo-speech-recognition
```

## 2. Add the plugin to app.json

Open `app.json`, find `"plugins"` (create it as `"plugins": []` inside `"expo": { ... }` if
it doesn't exist yet), and add this entry:

```json
"plugins": [
  "expo-speech-recognition"
]
```

If you already have other plugins listed, just add `"expo-speech-recognition"` as one more
item in that same array.

## 3. Give the app a package name (needed to build)

Still in `app.json`, inside `"expo": { ... }`, make sure these exist (pick any name you like
for the id, lowercase, no spaces):

```json
"android": { "package": "com.yourname.chessapp" },
"ios": { "bundleIdentifier": "com.yourname.chessapp" }
```

## 4. Install EAS CLI and log in

```powershell
npm install -g eas-cli
eas login
```
This opens a browser to sign in or create a free Expo account.

## 5. Configure the project for builds (one-time)

```powershell
eas build:configure
```
Answer its questions with the defaults (press Enter) unless you know you want something else.

## 6. Build a development client (Android first — it's simpler and free)

```powershell
eas build --profile development --platform android
```
This uploads your project and builds it on Expo's servers (free tier, usually 10-20 minutes).
When it finishes, the terminal shows a link, and also sends you an email with a QR code.

## 7. Install the build on your phone

Open that link (or scan the QR code) **on your phone**, and download/install the APK it
offers. Android will warn about "unknown sources" — allow it for this install. This app icon
looks like your chess app; that's your new development client, used instead of Expo Go.

## 8. Run the app with this new build

```powershell
npx expo start --dev-client
```
Open the resulting QR code with your **new custom app icon**, not Expo Go, this time.

## iOS note

iOS development builds normally need an Apple Developer account ($99/year) to install on a
real iPhone. If you're Android-only for now, skip this — everything above is Android-only and
free.

## After this, day-to-day work is the same

`npx expo start --dev-client` replaces `npx expo start` from here on, for this project only
(because it now has a native module). Copying `App.tsx`/`src` updates from a new zip works
exactly the same as before.
