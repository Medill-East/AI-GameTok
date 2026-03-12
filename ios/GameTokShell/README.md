# GameTokShell

Minimal iOS wrapper prototype for validating inline autoplay behavior in a real app shell.

## What it does

- Loads the existing GameTok web app in a `WKWebView`
- Enables inline media playback
- Disables user-action requirements for media playback so the embedded YouTube player can be tested under app-shell conditions

## Local setup

1. Open this folder on a Mac.
2. Install [XcodeGen](https://github.com/yonaskolb/XcodeGen) if needed.
3. Run:

```bash
xcodegen generate
open GameTokShell.xcodeproj
```

4. In Xcode, set `GAMETOK_BASE_URL` to your reachable preview URL or LAN URL.

## Notes

- This is a validation shell, not a native rewrite.
- It intentionally keeps a single WebView and reuses the existing web routes and APIs.
