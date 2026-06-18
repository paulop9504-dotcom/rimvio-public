"use client";

import {
  MagicActionTrigger,
  RevealedActionGrid,
} from "@/components/action-chat/magic-action-ui";
import { ActionChatGrid } from "@/components/action-chat/action-grid";
import { PlaceDiscoveryCards } from "@/components/action-chat/place-discovery-cards";
import { EntityQuickPickStrip } from "@/components/action-chat/entity-quick-pick-strip";
import { ExperienceChoiceStrip } from "@/components/action-chat/experience-choice-strip";
import { TimeChoiceStrip } from "@/components/action-chat/time-choice-strip";
import { PolicyRedirectStrip } from "@/components/action-chat/policy-redirect-strip";
import { ScheduleAdvisoryStrip } from "@/components/action-chat/schedule-advisory-strip";
import { PresentationDashboardStrip } from "@/components/action-chat/presentation-dashboard-strip";
import { PresentationTimelineStrip } from "@/components/action-chat/presentation-timeline-strip";
import { ActionOsDockStrip } from "@/components/action-chat/action-os-dock-strip";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import { TransportLiveCardView } from "@/components/action-chat/transport-live-card";
import { FlightStatusCardView } from "@/components/action-chat/flight-status-card";
import { PackingChecklistStrip } from "@/components/action-chat/packing-checklist-strip";
import { cleanFeedActionLabel } from "@/lib/feed/feed-display";
import {
  resolvePresentationWire,
  shouldUseVisualGallery,
} from "@/lib/presentation/presentation-mode";
import type { DockActionWire } from "@/lib/action-os/types";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { AppLocale } from "@/lib/i18n/types";
import type { LinkActionItem } from "@/types/database";
import type { TimeChoiceExecuteInput } from "@/lib/time-decision/time-choice-execute-input";

type AssistantPresentationFooterProps = {
  message: ActionChatMessage;
  locale: AppLocale;
  loading?: boolean;
  showMagicPulse?: boolean;
  showActionGrid?: boolean;
  emphasizePrimary?: boolean;
  onRevealActions?: () => void;
  onAction: (action: LinkActionItem) => void;
  onPolicyRedirect?: (prompt: string) => void;
  onScheduleAdvisory?: (prompt: string) => void;
  onExperienceChoice?: (prompt: string) => void;
  onTimeChoice?: (input: TimeChoiceExecuteInput) => void;
  onPackingToggle?: (tripId: string, itemId: string) => void;
  onFlightAction?: (prompt: string) => void;
  onActionOsDock?: (action: DockActionWire) => void;
};

/** Route assistant payload → VISUAL | ACTION | TIMELINE | DASHBOARD renderer. */
export function AssistantPresentationFooter({
  message,
  locale,
  loading = false,
  showMagicPulse = false,
  showActionGrid = true,
  emphasizePrimary = false,
  onRevealActions,
  onAction,
  onPolicyRedirect,
  onScheduleAdvisory,
  onExperienceChoice,
  onTimeChoice,
  onPackingToggle,
  onFlightAction,
  onActionOsDock,
}: AssistantPresentationFooterProps) {
  const presentation = resolvePresentationWire(message);
  const primary = message.actions?.[0];
  const secondary = message.actions?.slice(1) ?? [];

  if (loading) {
    return null;
  }

  if (presentation.mode === "TIMELINE" && message.scheduleAdvisory) {
    return (
      <ScheduleAdvisoryStrip
        wire={message.scheduleAdvisory}
        onSelectOption={(prompt) => onScheduleAdvisory?.(prompt)}
      />
    );
  }

  if (presentation.mode === "POLICY_REDIRECT" && message.policy) {
    return (
      <PolicyRedirectStrip
        wire={message.policy}
        onRedirect={(prompt) => onPolicyRedirect?.(prompt)}
      />
    );
  }

  if (presentation.mode === "TIME_CHOICE" && message.timeChoice) {
    return (
      <TimeChoiceStrip
        wire={message.timeChoice}
        onSelectOption={(input) => onTimeChoice?.(input)}
      />
    );
  }

  if (presentation.mode === "EXPERIENCE_CHOICE" && message.experienceChoice) {
    return (
      <ExperienceChoiceStrip
        wire={message.experienceChoice}
        onSelectOption={(prompt) => onExperienceChoice?.(prompt)}
      />
    );
  }

  if (presentation.mode === "ENTITY_QUICK_PICK" && message.entityQuickPick) {
    return (
      <EntityQuickPickStrip
        wire={message.entityQuickPick}
        onSelectOption={(prompt) => onExperienceChoice?.(prompt)}
      />
    );
  }

  if (presentation.mode === "FLIGHT_CARD" && message.flightStatusCard) {
    return (
      <FlightStatusCardView
        wire={message.flightStatusCard}
        onMainAction={(card) => {
          const url = card.main_action.url;
          if (url) {
            window.open(url, "_blank", "noopener,noreferrer");
            return;
          }
          onFlightAction?.(card.main_action.label);
        }}
        onShadowAction={(action) => {
          if (action.url) {
            window.open(action.url, "_blank", "noopener,noreferrer");
            return;
          }
          if (action.prompt) {
            onFlightAction?.(action.prompt);
          }
        }}
      />
    );
  }

  if (presentation.mode === "PACKING_CHECKLIST" && message.packingChecklist) {
    return (
      <PackingChecklistStrip
        wire={message.packingChecklist}
        onToggleItem={(tripId, itemId) => onPackingToggle?.(tripId, itemId)}
      />
    );
  }

  if (shouldUseVisualGallery(presentation) && message.cafeDiscovery) {
    const precisionMinimal =
      (message.metadata as { precision_affordance?: string } | undefined)
        ?.precision_affordance === "minimal";
    const progressive = Boolean(
      (message.metadata as { progressive_disclosure?: boolean } | undefined)
        ?.progressive_disclosure
    );
    if (precisionMinimal && !progressive) {
      return null;
    }
    return (
      <PlaceDiscoveryCards
        wire={message.cafeDiscovery}
        containerId={message.metadata?.container_id}
      />
    );
  }

  if (presentation.mode === "DASHBOARD" && message.morningBriefing) {
    return <PresentationDashboardStrip briefing={message.morningBriefing} />;
  }

  if (presentation.mode === "TIMELINE" && message.schedule?.tasks?.length) {
    return (
      <div className="space-y-3">
        <PresentationTimelineStrip schedule={message.schedule} />
        {message.actionOsDock && onActionOsDock ? (
          <ActionOsDockStrip
            main_action={message.actionOsDock.main_action}
            shadow_actions={message.actionOsDock.shadow_actions}
            onAction={onActionOsDock}
          />
        ) : primary ? (
          <RevealedActionGrid open={showActionGrid}>
            <ActionChatGrid
              primary={primary}
              primaryLabel={cleanFeedActionLabel(primary.label, locale)}
              secondary={secondary}
              locale={locale}
              layout="horizontal"
              emphasizePrimary={emphasizePrimary}
              onPrimary={() => onAction(primary)}
              onAction={onAction}
            />
          </RevealedActionGrid>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {message.transportLive ? (
        <TransportLiveCardView
          card={message.transportLive}
          actions={message.actions ?? []}
          onAction={onAction}
          embedded
        />
      ) : null}

      {showMagicPulse ? <MagicActionTrigger onClick={() => onRevealActions?.()} /> : null}

      {message.actionOsDock && onActionOsDock ? (
        <ActionOsDockStrip
          main_action={message.actionOsDock.main_action}
          shadow_actions={message.actionOsDock.shadow_actions}
          onAction={onActionOsDock}
        />
      ) : primary && !message.transportLive ? (
        <RevealedActionGrid open={showActionGrid}>
          <ActionChatGrid
            primary={primary}
            primaryLabel={cleanFeedActionLabel(primary.label, locale)}
            secondary={secondary}
            locale={locale}
            layout="horizontal"
            emphasizePrimary={emphasizePrimary}
            onPrimary={() => onAction(primary)}
            onAction={onAction}
          />
        </RevealedActionGrid>
      ) : null}
    </div>
  );
}
