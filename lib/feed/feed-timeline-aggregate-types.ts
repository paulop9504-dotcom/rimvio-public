export type FeedTimelineAggregate = {
  photos: number;
  videos: number;
  links: number;
  memos: number;
  dwellMinutes: number | null;
  friendCount: number;
  friendLabels: string[];
  hasContent: boolean;
};

export type FeedTimelineAggregateChip = {
  id: string;
  emoji?: string;
  label: string;
};
