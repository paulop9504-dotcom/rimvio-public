import Foundation
import Capacitor
import UIKit

@objc(RimvioMainSurfacePlugin)
public class RimvioMainSurfacePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RimvioMainSurface"
    public let jsName = "RimvioMainSurface"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncMainSurface", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endAllMainSurfaces", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setScanBrightnessEnabled", returnType: CAPPluginReturnPromise),
    ]

    private var savedBrightness: CGFloat?
    private var foregroundScanActive = false
    private var backgroundScanPreferred = false

    @objc func syncMainSurface(_ call: CAPPluginCall) {
        guard let command = call.getObject("command") else {
            call.reject("missing_command")
            return
        }

        let lifecycle = command["lifecycle"] as? String ?? "end"
        let payload = command["payload"] as? [String: Any]

        if lifecycle == "end" || payload == nil {
            backgroundScanPreferred = false
            clearSurface()
            call.resolve([
                "ok": true,
                "platform": "ios",
                "lifecycle": "end",
            ])
            return
        }

        backgroundScanPreferred = payload?["preferScanBrightness"] as? Bool ?? false
        refreshScanBrightness()

        if let payload = payload,
           let data = try? JSONSerialization.data(withJSONObject: payload, options: []) {
            UserDefaults.standard.set(data, forKey: "rimvio.mainSurface.payload")
        }

        if #available(iOS 16.2, *) {
            RimvioMainSurfaceLiveActivityController.sync(payload: payload)
        }

        call.resolve([
            "ok": true,
            "platform": "ios",
            "lifecycle": lifecycle,
            "note": "ios_live_activity_sync",
        ])
    }

    @objc func endAllMainSurfaces(_ call: CAPPluginCall) {
        backgroundScanPreferred = false
        clearSurface()
        call.resolve(["ok": true])
    }

    @objc func setScanBrightnessEnabled(_ call: CAPPluginCall) {
        foregroundScanActive = call.getBool("enabled") ?? false
        refreshScanBrightness()
        call.resolve(["ok": true])
    }

    private func clearSurface() {
        UserDefaults.standard.removeObject(forKey: "rimvio.mainSurface.payload")
        if #available(iOS 16.2, *) {
            RimvioMainSurfaceLiveActivityController.endAll()
        }
        refreshScanBrightness()
    }

    private func refreshScanBrightness() {
        applyScanBrightness(foregroundScanActive || backgroundScanPreferred)
    }

    private func applyScanBrightness(_ enable: Bool) {
        if enable {
            if savedBrightness == nil {
                savedBrightness = UIScreen.main.brightness
            }
            UIScreen.main.brightness = 1.0
        } else if let prior = savedBrightness {
            UIScreen.main.brightness = prior
            savedBrightness = nil
        }
    }
}
