export type LinkActionStatus = "ready" | "pending" | "done";

export type LinkAction = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  prefetchHref?: string;
  icon?: string;
  status: LinkActionStatus;
  createdAt: string;
};

export type SharedLinkPayload = {
  title?: string;
  text?: string;
  url?: string;
};
