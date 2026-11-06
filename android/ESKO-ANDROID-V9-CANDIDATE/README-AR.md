# ESKO Android — V9.0.2 source candidate (not a release)

The app wraps the synchronized ESKO six-section web interface in Android WebView. The persistent bottom navigation order is: Home, Store, Repositories, Assistant, Sections, Account.

## Local/offline shell

The bundled `app/src/main/assets/www/` files can render the six-section interface locally. In this mode, account, feed, repository and product endpoints still require a reachable ESKO backend; local assets alone do not create a server or cloud storage. The assistant is a limited local rules engine, not a connected generative model.

## Build against a deployed ESKO server

Set `ESKO_SITE_URL` to the HTTPS origin/path of a deployed ESKO site when invoking Gradle, then build with Android Studio/Gradle. The remote page should serve the backend API on the same origin unless a separately configured and tested CORS policy is provided. Do not put API keys or signing passwords in source files.

## Build blocker in this audit environment

No Gradle executable, Gradle wrapper, Android SDK, `sdkmanager`, or `adb` was present during this audit. The Java source, manifest and static assets were reviewed, but no APK was built, signed, installed or tested on a device.

## Source security notes

The WebView denies file/content access, disallows mixed content, enables Safe Browsing, and uses `WebViewAssetLoader` for local assets. User repository files are stored as text by the backend and must not be executed.
