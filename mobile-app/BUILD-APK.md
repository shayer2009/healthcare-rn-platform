# Building Android APK for World Health Portal

## Prerequisites

1. **Node.js** installed (v18 or higher)
2. **Expo account** (free) - sign up at https://expo.dev
3. **EAS CLI** installed globally

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

## Step 2: Login to Expo

```bash
eas login
```

Enter your Expo account credentials (create one at https://expo.dev if needed).

## Step 3: Configure Project

```bash
cd mobile-app
eas build:configure
```

This will create/update the `eas.json` file.

## Step 4: Create Project ID (if needed)

If you see a prompt about project ID, run:

```bash
eas init
```

This will generate a project ID and update `app.json`.

## Step 5: Build APK

### Option A: Preview Build (Recommended for testing)

```bash
npm run build:android
```

or directly:

```bash
eas build --platform android --profile preview
```

### Option B: Production Build

```bash
npm run build:android:prod
```

or directly:

```bash
eas build --platform android --profile production
```

## Step 6: Download APK

1. The build will start on Expo's servers (takes 10-20 minutes)
2. You'll get a URL to track the build progress
3. Once complete, you can:
   - Download directly from the Expo dashboard
   - Get download link via email
   - Run `eas build:list` to see your builds

## Step 7: Install on Android Phone

1. Transfer the `.apk` file to your Android phone
2. Enable "Install from Unknown Sources" in Android settings:
   - Settings → Security → Unknown Sources (enable)
3. Open the APK file on your phone and install

## Alternative: Local Build (Advanced)

If you want to build locally (requires Android Studio):

```bash
eas build --platform android --local
```

**Note:** Local builds require Android SDK and are more complex to set up.

## Troubleshooting

### Build fails?
- Check that `API_URL` in `App.js` points to your deployed backend
- Ensure all dependencies are installed: `npm install`
- Check Expo dashboard for detailed error logs

### Can't install APK?
- Make sure "Unknown Sources" is enabled
- Try downloading directly on phone instead of transferring

### Need to update backend URL?
Edit `mobile-app/App.js` line 23:
```javascript
const API_URL = "https://world-health-portal-gpeip.ondigitalocean.app";
```

Then rebuild the APK.

## Current Backend URL

The app is configured to use:
**https://world-health-portal-gpeip.ondigitalocean.app**

Make sure this backend is running and accessible before building/testing.
