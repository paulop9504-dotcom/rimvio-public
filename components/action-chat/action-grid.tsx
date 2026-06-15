"use client";

import { ActionAppIcon } from "@/components/ui/action-app-icon";
import { RimvioActionButton } from "@/components/ui/rimvio-action-button";
import { cleanFeedActionLabel } from "@/lib/feed/feed-display";
import { resolveActionBrandAccent } from "@/lib/brand/action-brand-style";
import { resolveActionAppIconTheme } from "@/lib/feed/action-app-icon-theme";
import { resolveActionGridIcon } from "@/lib/feed/action-grid-icon";
import type { AppLocale } from "@/lib/i18n/types";
import type { LinkActionItem } from "@/types/database";
import { cn } from "@/lib/utils";

type ActionChatGridProps = {
  primary: LinkActionItem;
  primaryLabel: string;
  secondary?: LinkActionItem[];
  locale: AppLocale;
  loading?: boolean;
  emphasizePrimary?: boolean;
  layout?: "vertical" | "horizontal" | "app-icons";
  onPrimary: () => void;
  onAction: (action: LinkActionItem) => void;
  className?: string;
};

function ActionTile({
  label,
  hint,
  action,
  onClick,
  variant,
  disabled,
}: {
  label: string;
  hint?: string | null;
  action: LinkActionItem;
  onClick: () => void;
  variant: "primary" | "secondary";
  disabled?: boolean;
}) {
  const Icon = resolveActionGridIcon(action);
  const iconBrand =
    variant === "secondary"
      ? resolveActionBrandAccent({
          id: action.id,
          label: action.label,
          href: action.href,
          type: action.kind,
        })
      : undefined;

  return (
    <RimvioActionButton
      variant={variant}
      layout="tile"
      fullWidth
      disabled={disabled}
      onClick={onClick}
      icon={Icon}
      iconBrand={iconBrand}
      hint={hint}
    >
      {label}
    </RimvioActionButton>
  );
}

export function ActionChatGrid({
  primary,
  primaryLabel,
  secondary = [],
  locale,
  loading = false,
  emphasizePrimary = false,
  layout = "app-icons",
  onPrimary,
  onAction,
  className,
}: ActionChatGridProps) {
  const secondaries = secondary.slice(0, 3).map((action) => ({
    action,
    label: cleanFeedActionLabel(action.label, locale),
    hint:
      typeof action.payload?.universalHint === "string"
        ? action.payload.universalHint
        : null,
  }));

  const primaryHint =
    typeof primary.payload?.universalHint === "string"
      ? primary.payload.universalHint
      : null;

  const primaryEmphasis =
    emphasizePrimary ||
    Boolean(primary.payload?.universalPrimary ?? primary.payload?.domainPrimary);

  if (layout === "app-icons") {
    const primaryIcon = resolveActionGridIcon(primary);
    const primaryTheme = resolveActionAppIconTheme(primary, 0, { primary: true });

    return (
      <div className={cn("rimvio-action-app-icon-grid rimvio-action-app-icon-grid--scroll", className)}>
        <ActionAppIcon
          label={loading ? "찾는 중…" : primaryLabel}
          icon={primaryIcon}
          theme={primaryTheme}
          size="lg"
          disabled={loading}
          onClick={onPrimary}
          className="rimvio-action-app-icon--lg shrink-0"
          badge={primaryEmphasis ? "1" : null}
        />
        {secondaries.map((slot, index) => {
          const Icon = resolveActionGridIcon(slot.action);
          const theme = resolveActionAppIconTheme(slot.action, index + 1);
          return (
            <ActionAppIcon
              key={slot.action.id || `${slot.label}-${index}`}
              label={slot.label}
              icon={Icon}
              theme={theme}
              onClick={() => onAction(slot.action)}
              className="shrink-0"
            />
          );
        })}
      </div>
    );
  }

  if (layout === "horizontal") {
    return (
      <div className={cn("rimvio-container-card__action-row", className)}>
        <ActionTile
          label={loading ? "찾는 중…" : primaryLabel}
          hint={loading ? null : primaryHint}
          action={primary}
          onClick={onPrimary}
          variant="primary"
          disabled={loading}
        />
        {secondaries.map((slot, index) => {
          const Icon = resolveActionGridIcon(slot.action);
          const iconBrand = resolveActionBrandAccent({
            id: slot.action.id,
            label: slot.action.label,
            href: slot.action.href,
            type: slot.action.kind,
          });
          return (
            <RimvioActionButton
              key={slot.action.id || `${slot.label}-${index}`}
              type="button"
              variant="secondary"
              layout="pill"
              icon={Icon}
              iconBrand={iconBrand}
              onClick={() => onAction(slot.action)}
              className="shrink-0"
            >
              {slot.label}
            </RimvioActionButton>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <ActionTile
        label={loading ? "찾는 중…" : primaryLabel}
        hint={loading ? null : primaryHint}
        action={primary}
        onClick={onPrimary}
        variant="primary"
        disabled={loading}
      />

      {secondaries.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {secondaries.map((slot, index) => (
            <ActionTile
              key={slot.action.id || `${slot.label}-${index}`}
              label={slot.label}
              hint={slot.hint}
              action={slot.action}
              onClick={() => onAction(slot.action)}
              variant="secondary"
            />
          ))}
        </div>
      ) : null}

      {primaryEmphasis ? (
        <p className="px-1 text-center text-[10px] font-medium text-[#4A90E2]/75">
          1순위 · 탭 한 번으로 실행
        </p>
      ) : null}
    </div>
  );
}
