import Foundation

#if canImport(ActivityKit)
import ActivityKit

@available(iOS 16.2, *)
public struct RimvioMainSurfaceAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var labelKo: String
        public var placeLabel: String
        public var eyebrowKo: String
        public var ctaLabelKo: String

        public init(
            labelKo: String,
            placeLabel: String,
            eyebrowKo: String,
            ctaLabelKo: String
        ) {
            self.labelKo = labelKo
            self.placeLabel = placeLabel
            self.eyebrowKo = eyebrowKo
            self.ctaLabelKo = ctaLabelKo
        }
    }

    public var surfaceId: String
    public var contextTitle: String

    public init(surfaceId: String, contextTitle: String) {
        self.surfaceId = surfaceId
        self.contextTitle = contextTitle
    }
}
#endif
