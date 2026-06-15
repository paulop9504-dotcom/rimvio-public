export {
  EXPERIENCE_INTENTS,
  EXPERIENCE_INTENT_META_KEYS,
  INTENT_CONFIDENCE_FULL_SCORE,
  INTENT_MIN_WIN_SCORE,
  type ExperienceIntent,
  type IntentEvidence,
  type IntentEvidenceKind,
  type IntentResolution,
  type IntentRunnerUp,
  type IntentScoreboard,
  type IntentScoreEntry,
} from "@/lib/experience-intent/experience-intent-types";

export {
  buildIntentScorerInput,
  type IntentCalendarContext,
  type IntentScorerInput,
} from "@/lib/experience-intent/intent-scorer-input";

export {
  INTENT_SIGNAL_REGISTRY,
  intentSpecFor,
  type IntentSignalMatch,
  type IntentSignalRule,
  type IntentSignalSpec,
} from "@/lib/experience-intent/intent-signal-registry";

export { scoreIntentEvidence } from "@/lib/experience-intent/score-intent-evidence";

export {
  readExperienceIntentFromEvent,
  resolveExperienceIntent,
} from "@/lib/experience-intent/resolve-experience-intent";

export {
  resolveAndStampExperienceIntent,
  stampExperienceIntentMetadata,
} from "@/lib/experience-intent/stamp-experience-intent-metadata";

export { mapIntentToCategory } from "@/lib/experience-intent/map-intent-to-category";

export {
  FEED_RECIPE_MIN_CONFIDENCE,
  FEED_RECIPE_REGISTRY,
  FEED_RECIPE_SLOT_EMOJI,
  FEED_RECIPE_SLOT_KINDS,
  FEED_RECIPE_SLOT_LABELS,
  feedRecipeForIntent,
  type FeedRecipe,
  type FeedRecipeSlotKind,
} from "@/lib/experience-intent/feed-recipe-registry";

export {
  projectFeedRecipeSlots,
  shouldUseFeedRecipeLayout,
  type FeedRecipeProjection,
  type FeedRecipeProjectionInput,
  type FeedRecipeSlotProjection,
} from "@/lib/experience-intent/project-feed-recipe-slots";
