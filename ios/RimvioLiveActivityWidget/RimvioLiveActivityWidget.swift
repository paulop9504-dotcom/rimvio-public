import ActivityKit
import SwiftUI
import WidgetKit

/// Live Activity UI — add Widget Extension target; include ../Shared/RimvioMainSurfaceAttributes.swift in both targets.
@available(iOS 16.2, *)
struct RimvioMainSurfaceLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RimvioMainSurfaceAttributes.self) { context in
            VStack(alignment: .leading, spacing: 6) {
                Text(context.state.eyebrowKo)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text(context.state.labelKo)
                    .font(.headline)
                if !context.state.placeLabel.isEmpty {
                    Text(context.state.placeLabel)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.vertical, 4)
            .activityBackgroundTint(Color.white.opacity(0.92))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.eyebrowKo)
                        .font(.caption.weight(.bold))
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.labelKo)
                        .font(.headline)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.placeLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } compactLeading: {
                Text("🎫")
            } compactTrailing: {
                Text(context.state.eyebrowKo)
                    .font(.caption2.weight(.semibold))
            } minimal: {
                Text("🎫")
            }
        }
    }
}

@available(iOS 16.2, *)
@main
struct RimvioLiveActivityWidgetBundle: WidgetBundle {
    var body: some Widget {
        RimvioMainSurfaceLiveActivity()
    }
}
