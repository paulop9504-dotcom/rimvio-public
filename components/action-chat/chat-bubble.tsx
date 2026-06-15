"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { ChatBubbleGroup } from "@/lib/ui/chat-bubble-group";
import { cn } from "@/lib/utils";
import { ACTION_SHELL } from "@/lib/ui/action-chat-theme";

export type { ChatBubbleGroup };

type ChatBubbleProps = {
  children: ReactNode;
  className?: string;
  group?: ChatBubbleGroup;
};

const USER_GROUP_CLASS: Record<ChatBubbleGroup, string> = {
  single: "chat-bubble--user-single",
  first: "chat-bubble--user-first",
  middle: "chat-bubble--user-middle",
  last: "chat-bubble--user-last",
};

const AI_GROUP_CLASS: Record<ChatBubbleGroup, string> = {
  single: "chat-bubble--ai-single",
  first: "chat-bubble--ai-first",
  middle: "chat-bubble--ai-middle",
  last: "chat-bubble--ai-last",
};

export function UserChatBubble({
  children,
  className,
  group = "single",
}: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: ACTION_SHELL.enterDuration, ease: ACTION_SHELL.enterEase }}
      className={cn("flex w-full justify-end", className)}
    >
      <div
        className={cn(
          "chat-bubble chat-bubble--user",
          USER_GROUP_CLASS[group],
        )}
      >
        {children}
      </div>
    </motion.div>
  );
}

export function AiChatBubble({
  children,
  className,
  group = "single",
}: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: ACTION_SHELL.enterDuration, ease: ACTION_SHELL.enterEase }}
      className={cn("flex w-full justify-start", className)}
    >
      <div
        className={cn("chat-bubble chat-bubble--ai", AI_GROUP_CLASS[group])}
      >
        {children}
      </div>
    </motion.div>
  );
}

export function ContainerEnter({ children, className }: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ACTION_SHELL.enterDuration, ease: ACTION_SHELL.enterEase }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
