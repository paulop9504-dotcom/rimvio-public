import AVFoundation
import Foundation
import Photos
import SystemConfiguration

enum PhotoLibraryScanner {
    static func getNetworkType() -> String {
        var zeroAddress = sockaddr_in()
        zeroAddress.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        zeroAddress.sin_family = sa_family_t(AF_INET)

        guard let reachability = withUnsafePointer(to: &zeroAddress, {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                SCNetworkReachabilityCreateWithAddress(nil, $0)
            }
        }) else {
            return "unknown"
        }

        var flags = SCNetworkReachabilityFlags()
        if !SCNetworkReachabilityGetFlags(reachability, &flags) {
            return "unknown"
        }

        if !flags.contains(.reachable) {
            return "none"
        }

        if flags.contains(.isWWAN) {
            return "cellular"
        }

        return "wifi"
    }

    static func requestPhotoLibraryPermission(completion: @escaping (Bool) -> Void) {
        if #available(iOS 14, *) {
            PHPhotoLibrary.requestAuthorization(for: .readWrite) { status in
                DispatchQueue.main.async {
                    completion(status == .authorized || status == .limited)
                }
            }
            return
        }

        PHPhotoLibrary.requestAuthorization { status in
            DispatchQueue.main.async {
                completion(status == .authorized)
            }
        }
    }

    static func scan(sinceMs: Int64, limit: Int, windowDays: Int) -> [String: Any] {
        let nowMs = Int64(Date().timeIntervalSince1970 * 1000)
        let windowStartMs = nowMs - Int64(windowDays) * 86_400_000
        let effectiveSinceMs = max(sinceMs, windowStartMs)
        let sinceDate = Date(timeIntervalSince1970: Double(effectiveSinceMs) / 1000)

        let fetchOptions = PHFetchOptions()
        fetchOptions.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: true)]
        fetchOptions.predicate = NSPredicate(format: "creationDate >= %@", sinceDate as NSDate)

        let assets = PHAsset.fetchAssets(with: fetchOptions)
        var photos: [[String: Any]] = []
        var maxCapturedMs = effectiveSinceMs

        assets.enumerateObjects { asset, _, stop in
            if photos.count >= limit {
                stop.pointee = true
                return
            }

            guard let created = asset.creationDate else {
                return
            }

            let capturedMs = Int64(created.timeIntervalSince1970 * 1000)
            let mediaKind = asset.mediaType == .video ? "video" : "photo"
            let ext = mediaKind == "video" ? "mp4" : "jpg"
            let fileName = "IMG_\(asset.localIdentifier.prefix(8)).\(ext)"

            var item: [String: Any] = [
                "id": asset.localIdentifier,
                "contentUri": "photos-local://\(asset.localIdentifier)",
                "fileName": fileName,
                "mimeType": mediaKind == "video" ? "video/mp4" : "image/jpeg",
                "capturedAtMs": capturedMs,
                "mediaKind": mediaKind,
            ]

            if let location = asset.location {
                item["lat"] = location.coordinate.latitude
                item["lng"] = location.coordinate.longitude
            } else {
                item["lat"] = NSNull()
                item["lng"] = NSNull()
            }

            photos.append(item)
            maxCapturedMs = max(maxCapturedMs, capturedMs)
        }

        return [
            "photos": photos,
            "nextCursorMs": maxCapturedMs,
        ]
    }

    static func importToCache(
        contentUri: String,
        fileName: String,
        completion: @escaping ([String: Any]?, String?) -> Void
    ) {
        let prefix = "photos-local://"
        guard contentUri.hasPrefix(prefix) else {
            completion(nil, "invalid_content_uri")
            return
        }

        let localIdentifier = String(contentUri.dropFirst(prefix.count))
        let assets = PHAsset.fetchAssets(withLocalIdentifiers: [localIdentifier], options: nil)
        guard let asset = assets.firstObject else {
            completion(nil, "asset_not_found")
            return
        }

        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let safeName = fileName.isEmpty ? "album-import.jpg" : fileName
        let outUrl = cacheDir.appendingPathComponent("album-sync-\(UUID().uuidString)-\(safeName)")

        if asset.mediaType == .video {
            let options = PHVideoRequestOptions()
            options.isNetworkAccessAllowed = true
            PHImageManager.default().requestAVAsset(forVideo: asset, options: options) { avAsset, _, _ in
                guard let urlAsset = avAsset as? AVURLAsset else {
                    DispatchQueue.main.async { completion(nil, "video_export_failed") }
                    return
                }
                do {
                    if FileManager.default.fileExists(atPath: outUrl.path) {
                        try FileManager.default.removeItem(at: outUrl)
                    }
                    try FileManager.default.copyItem(at: urlAsset.url, to: outUrl)
                    DispatchQueue.main.async {
                        completion([
                            "cachePath": outUrl.path,
                            "fileName": safeName,
                            "mimeType": "video/mp4",
                            "sizeBytes": (try? FileManager.default.attributesOfItem(atPath: outUrl.path)[.size] as? NSNumber)?.intValue ?? 0,
                        ], nil)
                    }
                } catch {
                    DispatchQueue.main.async { completion(nil, "video_copy_failed") }
                }
            }
            return
        }

        let options = PHImageRequestOptions()
        options.isNetworkAccessAllowed = true
        options.deliveryMode = .highQualityFormat
        PHImageManager.default().requestImageDataAndOrientation(for: asset, options: options) { data, uti, _, _ in
            guard let data = data else {
                DispatchQueue.main.async { completion(nil, "image_export_failed") }
                return
            }
            do {
                try data.write(to: outUrl)
                let mimeType: String
                if let uti = uti as String?, uti.contains("png") {
                    mimeType = "image/png"
                } else {
                    mimeType = "image/jpeg"
                }
                DispatchQueue.main.async {
                    completion([
                        "cachePath": outUrl.path,
                        "fileName": safeName,
                        "mimeType": mimeType,
                        "sizeBytes": data.count,
                    ], nil)
                }
            } catch {
                DispatchQueue.main.async { completion(nil, "image_write_failed") }
            }
        }
    }
}
