# Rimvio Live Activity Widget

Dynamic Island + Lock Screen UI for MAIN ticket QR (`MainNativeSurfacePayload`).

## Xcode (pre-wired)

The **`RimvioLiveActivityWidget`** extension target is already in `ios/App/App.xcodeproj/project.pbxproj`:

- Sources: `RimvioLiveActivityWidget.swift` + shared `ios/Shared/RimvioMainSurfaceAttributes.swift`
- App-only controller: `ios/App/App/RimvioMainSurfaceLiveActivityController.swift`
- Embedded via **Embed Foundation Extensions** on the App target
- Bundle id: `com.rimvio.app.RimvioLiveActivityWidget` · deployment **iOS 16.2+**

On Mac: open `ios/App/App.xcworkspace`, set signing for **App** and **RimvioLiveActivityWidget**, then Archive.

Capacitor bridge: `RimvioMainSurface.syncMainSurface` → `RimvioMainSurfaceLiveActivityController.sync`.

Verify locally: `npx tsx scripts/test-ios-live-activity-widget-target.ts`
