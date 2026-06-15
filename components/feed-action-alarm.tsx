"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FeedActionPanel } from "@/components/feed-action-panel";
import { FeedReceiptPeek } from "@/components/feed-receipt-peek";
import { useReceiptPeekCycle } from "@/hooks/use-receipt-peek-cycle";
import type { ReceiptPeekKind } from "@/lib/feed/resolve-receipt-peek";
import type { MarketPriceSnapshot } from "@/lib/commerce/market-price";
import type { TimeReceipt } from "@/lib/media/time-receipt";
import type { TrueCostReceipt } from "@/lib/commerce/true-cost-receipt";
import type { StudyReceipt } from "@/lib/study/build-study-receipt";
import type { AppLocale } from "@/lib/i18n/types";
import type { LinkActionItem, LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

type FeedActionAlarmProps = {
  link: LinkRow;
  isActive?: boolean;
  peekKind?: ReceiptPeekKind | null;
  peekResetKey?: string | number;
  signalLine?: string | null;
  title?: string | null;
  primaryLabel: string;
  onPrimary: () => void;
  secondary?: LinkActionItem[];
  onSecondary?: (action: LinkActionItem) => void;
  locale: AppLocale;
  primaryVariant?: "default" | "youtube";
  showPrimary?: boolean;
  loading?: boolean;
  className?: string;
  variant?: "card" | "stack" | "overlay";
  timeReceipt?: TimeReceipt | null;
  marketSnapshot?: MarketPriceSnapshot | null;
  trueCostReceipt?: TrueCostReceipt | null;
  studyReceipt?: StudyReceipt | null;
  rankingWhy?: string | null;
};

/** Action alarm + optional receipt peek (auto show/hide). */
export function FeedActionAlarm({
  link,
  isActive = false,
  peekKind = null,
  peekResetKey,
  signalLine,
  title,
  primaryLabel,
  onPrimary,
  secondary = [],
  onSecondary,
  locale,
  primaryVariant = "default",
  showPrimary = true,
  loading = false,
  className,
  variant = "stack",
  timeReceipt = null,
  marketSnapshot = null,
  trueCostReceipt = null,
  studyReceipt = null,
  rankingWhy = null,
}: FeedActionAlarmProps) {
  const peekEnabled = Boolean(peekKind);
  const { visible: peekVisible, dismiss: dismissPeek } = useReceiptPeekCycle(
    isActive,
    peekEnabled,
    peekResetKey
  );

  const handlePrimary = () => {
    dismissPeek();
    onPrimary();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <AnimatePresence initial={false}>
        {peekKind && peekVisible ? (
          <motion.div
            key={`peek-${link.id}`}
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 6, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <FeedReceiptPeek
              kind={peekKind}
              link={link}
              primaryActionLabel={primaryLabel}
              signalLine={signalLine}
              timeReceipt={timeReceipt}
              marketSnapshot={marketSnapshot}
              trueCostReceipt={trueCostReceipt}
              studyReceipt={studyReceipt}
              overlay={variant === "overlay"}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <FeedActionPanel
        variant={variant}
        signalLine={signalLine}
        title={title}
        primaryLabel={primaryLabel}
        onPrimary={handlePrimary}
        secondary={secondary}
        onSecondary={onSecondary}
        locale={locale}
        primaryVariant={primaryVariant}
        showPrimary={showPrimary}
        loading={loading}
        rankingWhy={rankingWhy}
      />
    </div>
  );
}
