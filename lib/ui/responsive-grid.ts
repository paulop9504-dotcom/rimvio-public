/** Responsive shell / grid class tokens — pairs with globals.css @utility rules. */
export const GRID = {
  viewport: "app-viewport",
  shell: "app-shell-grid",
  column: "app-shell-column",
  navSide: "app-nav-side",
  navBottomFrame: "app-nav-bottom-frame",
  inboxLayout: "app-inbox-layout",
  inboxListGrid: "app-inbox-list-grid",
  roomHubGrid: "app-room-hub-grid",
  feedViewport: "app-feed-viewport",
  feedStage: "app-feed-stage",
} as const;

export const BREAKPOINTS = {
  phablet: 640,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
} as const;
