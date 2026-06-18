import Foundation
import Capacitor

@objc(RimvioNativeBridgePlugin)
public class RimvioNativeBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RimvioNativeBridge"
    public let jsName = "RimvioNativeBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isNotificationAccessEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openNotificationAccessSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPlatformInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getNetworkType", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPhotoLibraryPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scanPhotoLibrary", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "importPhotoToCache", returnType: CAPPluginReturnPromise),
    ]

    @objc func isNotificationAccessEnabled(_ call: CAPPluginCall) {
        call.resolve(["enabled": false])
    }

    @objc func openNotificationAccessSettings(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func getPlatformInfo(_ call: CAPPluginCall) {
        call.resolve([
            "platform": "ios",
            "isNative": true,
        ])
    }

    @objc func getNetworkType(_ call: CAPPluginCall) {
        call.resolve([
            "type": PhotoLibraryScanner.getNetworkType(),
        ])
    }

    @objc func requestPhotoLibraryPermission(_ call: CAPPluginCall) {
        PhotoLibraryScanner.requestPhotoLibraryPermission { granted in
            call.resolve(["granted": granted])
        }
    }

    @objc func scanPhotoLibrary(_ call: CAPPluginCall) {
        let sinceMs = call.getInt("sinceMs") ?? 0
        let limit = call.getInt("limit") ?? 40
        let windowDays = call.getInt("windowDays") ?? 7
        let result = PhotoLibraryScanner.scan(
            sinceMs: Int64(sinceMs),
            limit: limit,
            windowDays: windowDays
        )
        call.resolve(result)
    }

    @objc func importPhotoToCache(_ call: CAPPluginCall) {
        guard let contentUri = call.getString("contentUri") else {
            call.reject("missing_content_uri")
            return
        }
        let fileName = call.getString("fileName") ?? "album-import.jpg"
        PhotoLibraryScanner.importToCache(contentUri: contentUri, fileName: fileName) { payload, error in
            if let payload = payload {
                call.resolve(payload)
                return
            }
            call.reject(error ?? "import_failed")
        }
    }
}
