"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { ActionCard } from "@/components/action-card";
import { Button } from "@/components/ui/button";
import { useRealtimeLinks } from "@/hooks/use-realtime-links";
import {
  dismissLinkId,
  readDismissedIds,
} from "@/lib/local-links/now-session";

export function ActionStackList() {
  const { activeLinks, archivedLinks } = useRealtimeLinks();
  const [dismissed, setDismissed] = useState(() => readDismissedIds());

  const stackLinks = useMemo(
    () => activeLinks.filter((link) => !dismissed.has(link.id)),
    [activeLinks, dismissed]
  );

  const topLink = stackLinks[0];
  const ghostLinks = stackLinks.slice(1, 3);
  const remaining = stackLinks.length - 1;

  const handleDone = () => {
    if (!topLink) {
      return;
    }

    dismissLinkId(topLink.id);
    setDismissed((current) => new Set([...current, topLink.id]));
    toast("👀 Done", { description: topLink.title });
  };

  if (!topLink) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
        <p className="text-4xl">👀</p>
        <p className="mt-4 text-lg font-medium">All clear</p>
        <p className="mt-2 max-w-[16rem] text-sm text-muted-foreground">
          Share a link from another app — your next action appears here.
        </p>
        {archivedLinks.length > 0 ? (
          <Link
            href="/archive"
            className="mt-6 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            👀 보관함 {archivedLinks.length}개
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-[60dvh] flex-col">
      <div className="relative flex-1 pt-4">
        {ghostLinks
          .slice()
          .reverse()
          .map((link, index) => (
            <div
              key={link.id}
              className="pointer-events-none absolute inset-x-0 top-4"
              style={{
                transform: `translateY(${(ghostLinks.length - index) * 10}px) scale(${0.94 - index * 0.03})`,
                opacity: 0.35 - index * 0.1,
                zIndex: index,
              }}
            >
              <ActionCard link={link} />
            </div>
          ))}

        <AnimatePresence mode="popLayout">
          <motion.div
            key={topLink.id}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10"
          >
            <ActionCard link={topLink} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 space-y-3 pb-2">
        <Button
          className="h-12 w-full rounded-2xl font-semibold"
          onClick={handleDone}
        >
          <ChevronUp className="mr-2 size-4" strokeWidth={2.5} />
          Done — next
        </Button>

        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          {remaining > 0 ? (
            <span>{remaining} more in stack</span>
          ) : (
            <span>Stack clear after this</span>
          )}
          <Link
            href="/inbox"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            All links →
          </Link>
        </div>

        {archivedLinks.length > 0 ? (
          <p className="text-center text-xs text-muted-foreground/80">
            <Link href="/archive" className="hover:underline">
              👀 보관함으로 이동된 링크 {archivedLinks.length}개
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
