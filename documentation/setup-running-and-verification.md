# Setup, Running, And Verification

## Requirements

- Node.js 20 or newer
- npm
- Optional Apex Legends Status API key
- Optional Android Studio, Android SDK, JDK 17, and Gradle for the native Android app

## Install

```powershell
npm install
Copy-Item .env.example .env.local
```

Add a real key to `.env.local` for live data:

```env
APEX_API_KEY=your_real_api_key
```

## Run Development Mode

```powershell
npm run dev
```

Visit `http://localhost:3000`.

The development and production build scripts use Next.js Webpack mode because it is more
reliable when this workspace is stored in a Windows OneDrive folder. The app does not depend
on Webpack-specific application code; this only selects Next.js's builder.

## Build And Run Production Mode

```powershell
npm run build
npm run start
```

## Verify Code Quality

```powershell
npm run verify
```

The lint command checks TypeScript, React, and Next.js rules. The build command performs
production compilation and TypeScript checking.

## Native Android Verification

The Android scaffold lives in `android/`. To verify it from the terminal, use local JDK 17,
Android SDK Platform 36, Android Build-Tools 36.1.0, and Gradle 9.4.1.

```powershell
cd android
.\gradlew.bat assembleDebug
```

You can also open the `android` folder in Android Studio and let Gradle sync, then run the
`app` configuration on an emulator or real Android phone.

Android Studio is still recommended for emulator setup and visual widget testing.

## Common Setup Problems

- If live data does not appear, confirm `.env.local` contains `APEX_API_KEY`.
- Restart the development server after changing `.env.local`.
- For PC players, search using the linked EA/Origin account name rather than the Steam name.
- If a player is not found, confirm the selected platform and exact account spelling.
- If the Android project does not sync, install or update Android Studio and make sure it uses
  JDK 17.
