const FEED_TALK_INLINE_FEATURES = new Set(["peer_talk", "group_talk"]);

export function isFeedTalkInlineFeature(featureId: string): boolean {
  return FEED_TALK_INLINE_FEATURES.has(featureId);
}
