import Foundation

#if canImport(ActivityKit)
import ActivityKit

@available(iOS 16.2, *)
public enum RimvioMainSurfaceLiveActivityController {
    public static func sync(payload: [String: Any]?) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled, let payload = payload else {
            return
        }

        let surfaceId = payload["surfaceId"] as? String ?? "rimvio.main"
        let label = payload["labelKo"] as? String ?? "티켓"
        let place = payload["contextPlace"] as? String
            ?? payload["placeLabel"] as? String
            ?? ""
        let eyebrow = payload["eyebrowKo"] as? String ?? "지금"
        let cta = payload["ctaLabelKo"] as? String ?? "열기"
        let contextTitle = payload["contextTitle"] as? String ?? label

        let content = RimvioMainSurfaceAttributes.ContentState(
            labelKo: label,
            placeLabel: place,
            eyebrowKo: eyebrow,
            ctaLabelKo: cta
        )

        if let existing = Activity<RimvioMainSurfaceAttributes>.activities.first(where: {
            $0.attributes.surfaceId == surfaceId
        }) {
            Task {
                await existing.update(ActivityContent(state: content, staleDate: nil))
            }
            return
        }

        let attributes = RimvioMainSurfaceAttributes(
            surfaceId: surfaceId,
            contextTitle: contextTitle
        )

        do {
            _ = try Activity.request(
                attributes: attributes,
                content: ActivityContent(state: content, staleDate: nil),
                pushType: nil
            )
        } catch {
            // Live Activity UI ships in RimvioLiveActivityWidget extension target.
        }
    }

    public static func endAll() {
        Task {
            for activity in Activity<RimvioMainSurfaceAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }
}
#endif
