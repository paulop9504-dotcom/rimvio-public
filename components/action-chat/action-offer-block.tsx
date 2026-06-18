"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionChatGrid } from "@/components/action-chat/action-grid";
import { ContainerEnter } from "@/components/action-chat/chat-bubble";
import { ContainerCard } from "@/components/action-chat/container-card";
import {
  ConfirmRevealButtons,
  MagicActionTrigger,
  RevealedActionGrid,
} from "@/components/action-chat/magic-action-ui";
import {
  buildProgressiveSummary,
  estimateLinkActionConfidence,
  type ActionDisclosureTier,
} from "@/lib/action-chat/action-confidence";
import {
  applyAlternateActionOffer,
  buildAlternateOfferSummary,
} from "@/lib/action-chat/rotate-action-offer";
import { resolveActionOfferUx } from "@/lib/action-chat/trust-disclosure";
import { cleanFeedActionLabel } from "@/lib/feed/feed-display";
import { useActionTrust } from "@/hooks/use-action-trust";
import { MapPin } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/types";
import type { LinkActionItem } from "@/types/database";
import type { ReactNode } from "react";

type ActionOfferBlockProps = {
  summaryText: string;
  cardTitle?: string;
  primary: LinkActionItem;
  primaryLabel: string;
  secondary: LinkActionItem[];
  locale: AppLocale;
  loading?: boolean;
  confidence?: number;
  actionsRevealed?: boolean;
  onReveal?: () => void;
  onRevealAlternate?: () => void;
  receiptRail?: ReactNode;
  onPrimary: (action: LinkActionItem) => void;
  onAction: (action: LinkActionItem) => void;
};

function resolveDisplayText(input: {
  summaryText: string;
  cardTitle: string;
  tier: ActionDisclosureTier;
  primaryLabel: string;
  loading: boolean;
  stage: 1 | 2 | 3;
}) {
  if (input.loading) {
    return input.summaryText;
  }

  if (input.stage === 2) {
    return `${input.cardTitle || input.summaryText} · 바로 실행할 수 있어요.`;
  }

  if (input.stage === 3) {
    return `${input.cardTitle || input.summaryText} · 1순위 액션을 준비해 두었어요.`;
  }

  if (input.tier === "medium" || input.tier === "high") {
    return buildProgressiveSummary({
      title: input.cardTitle || input.summaryText,
      tier: input.tier,
      primaryLabel: input.primaryLabel,
    });
  }

  return input.summaryText;
}

export function ActionOfferBlock({
  summaryText,
  cardTitle,
  primary,
  primaryLabel,
  secondary,
  locale,
  loading = false,
  confidence: confidenceProp,
  actionsRevealed: actionsRevealedProp,
  onReveal,
  onRevealAlternate,
  receiptRail,
  onPrimary,
  onAction,
}: ActionOfferBlockProps) {
  const trust = useActionTrust();
  const [localRevealed, setLocalRevealed] = useState(false);
  const [alternateSummary, setAlternateSummary] = useState<string | null>(null);
  const [rotatedActions, setRotatedActions] = useState<LinkActionItem[] | null>(null);
  const userRevealed = actionsRevealedProp ?? localRevealed;

  const baseActions = useMemo(
    () => [primary, ...secondary].filter(Boolean),
    [primary, secondary]
  );

  useEffect(() => {
    setRotatedActions(null);
    setAlternateSummary(null);
  }, [baseActions.map((action) => action.id).join("|")]);

  const offerActions = rotatedActions ?? baseActions;
  const offerPrimary = offerActions[0] ?? primary;
  const offerSecondary = offerActions.slice(1);
  const offerPrimaryLabel = cleanFeedActionLabel(offerPrimary.label, locale);

  const confidence = confidenceProp ?? 0.85;

  const ux = useMemo(
    () =>
      resolveActionOfferUx({
        confidence,
        actionsRevealed: userRevealed,
        hasActions: Boolean(offerPrimary),
        loading,
      }),
    [confidence, loading, offerPrimary, trust.successScore, trust.mode, userRevealed]
  );

  const displayText = useMemo(() => {
    if (alternateSummary) {
      return alternateSummary;
    }

    return resolveDisplayText({
      summaryText,
      cardTitle: cardTitle ?? "",
      tier: ux.tier,
      primaryLabel: offerPrimaryLabel,
      loading,
      stage: ux.stage,
    });
  }, [
    alternateSummary,
    cardTitle,
    loading,
    offerPrimaryLabel,
    summaryText,
    ux.stage,
    ux.tier,
  ]);

  const reveal = () => {
    setLocalRevealed(true);
    onReveal?.();
  };

  const revealAlternate = () => {
    if (offerActions.length <= 1) {
      reveal();
      return;
    }

    const alternate = applyAlternateActionOffer({ actions: offerActions });
    setRotatedActions(alternate.actions);
    setAlternateSummary(
      alternate.summary ?? buildAlternateOfferSummary(alternate.actions[0]?.label ?? "")
    );
    setLocalRevealed(true);
    onRevealAlternate?.();
  };

  return (
    <ContainerEnter>
      <ContainerCard
        icon={MapPin}
        title={cardTitle?.trim() || summaryText.split("\n")[0]?.trim() || "링크 액션"}
        body={displayText}
        loading={loading}
        meta={
          <div className="space-y-2">
            {ux.showConfirmPrompt ? (
              <ConfirmRevealButtons
                onConfirm={reveal}
                onAlternate={revealAlternate}
                showAlternate={offerActions.length > 1}
              />
            ) : null}
            {ux.offerAutoRun ? (
              <p className="text-[11px] font-medium text-[#4A90E2]/80">
                자동 실행 준비됨 · 1순위 버튼을 탭하세요
              </p>
            ) : null}
            {receiptRail}
          </div>
        }
        footer={
          <div className="space-y-2">
            {ux.showMagicPulse ? <MagicActionTrigger onClick={reveal} /> : null}
            <RevealedActionGrid open={ux.showActionGrid}>
              <ActionChatGrid
                primary={offerPrimary}
                primaryLabel={offerPrimaryLabel}
                secondary={offerSecondary}
                locale={locale}
                loading={loading}
                layout="horizontal"
                emphasizePrimary={ux.emphasizePrimary}
                onPrimary={() => onPrimary(offerPrimary)}
                onAction={onAction}
              />
            </RevealedActionGrid>
          </div>
        }
      />
    </ContainerEnter>
  );
}

export function estimateOfferConfidenceFromLink(
  input: Parameters<typeof estimateLinkActionConfidence>[0]
) {
  return estimateLinkActionConfidence(input);
}
