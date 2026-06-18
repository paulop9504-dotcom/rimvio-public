/** Experience-scoped conversation preview — not a messenger list. */

export type ExperienceConversationPreview = {
  id: string;
  speakerName: string;
  excerpt: string;
  sentAtIso: string | null;
};

export type ExperienceConversationProjection = {
  peerThreadId: string | null;
  previews: readonly ExperienceConversationPreview[];
  totalCount: number;
  overflowCount: number;
};
