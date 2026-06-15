import type { LinkRow } from "@/types/database";

export type FeedBackupV1 = {
  version: 1;
  exportedAt: string;
  links: LinkRow[];
};

export function exportFeedBackup(links: LinkRow[]): string {
  const payload: FeedBackupV1 = {
    version: 1,
    exportedAt: new Date().toISOString(),
    links,
  };

  return JSON.stringify(payload, null, 2);
}

export function parseFeedBackup(raw: string): LinkRow[] {
  const parsed = JSON.parse(raw) as FeedBackupV1 | LinkRow[];

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed?.version === 1 && Array.isArray(parsed.links)) {
    return parsed.links;
  }

  throw new Error("지원하지 않는 백업 형식이에요.");
}
