# App icon and splash screen

A gold knight (matching the app's Royal piece style) on a dark background, so it feels
consistent with the app itself.

## 1. Copy the images

From `assets_new/` in this zip, copy all 6 files into your project's `assets/` folder,
**replacing** the existing ones with the same names:
- icon.png
- android-icon-foreground.png
- android-icon-background.png
- android-icon-monochrome.png
- favicon.png
- splash-icon.png (new file)

## 2. Install the splash screen package

```powershell
cd C:\dev\chess-app
npx expo install expo-splash-screen
```

## 3. Add splash config to app.json

Open `app.json`. Inside `"expo": { ... }`, find `"plugins": [ "expo-speech-recognition" ]`
and change it to:

```json
"plugins": [
  "expo-speech-recognition",
  [
    "expo-splash-screen",
    {
      "image": "./assets/splash-icon.png",
      "imageWidth": 220,
      "resizeMode": "contain",
      "backgroundColor": "#0D0D0D"
    }
  ]
]
```

## 4. Rebuild

Icons and splash screens are baked into the native app, not loaded live like the rest of
the app -- so `npx expo start --dev-client` will NOT show the new icon. You only see it
after a fresh build:

```powershell
eas build --profile development --platform android
```

Install that new build on your phone the same way as before (the "Install and run on an
emulator?" prompt -- answer whatever you did last time; the real install link/QR is what
matters).

## Where you'll see it

- The app icon on your phone's home screen and app drawer
- The splash screen (the knight, briefly, on a dark background) when the app is launching
- The browser tab icon if you ever run the app in a browser
