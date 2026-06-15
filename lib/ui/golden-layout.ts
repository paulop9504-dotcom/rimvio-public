/** Golden-ratio (φ) layout class tokens — pairs with globals.css @utility rules. */
export const GOLDEN = {
  /** Inbox vertical stack */
  inbox: "inbox-golden",
  inboxInput: "inbox-golden-input",
  inboxCommand: "inbox-golden-command",
  inboxBody: "inbox-golden-body",
  inboxScroll: "inbox-golden-scroll",
  /** Feed / room action card interior */
  card: "feed-golden-card",
  meta: "feed-golden-meta",
  visual: "feed-golden-visual",
  actions: "feed-golden-actions",
  aspectMedia: "golden-aspect-media",
  heroFrame: "feed-hero-frame",
  heroFrameCompact: "feed-hero-frame-compact",
  visualStack: "room-visual-stack",
  /** App shell content area */
  shellBody: "shell-golden-body",
} as const;

/** φ-based spacing for inline styles / Tailwind arbitrary values */
export const GOLDEN_SPACE = {
  u: "var(--space-u)",
  phi: "var(--space-phi)",
  phi2: "var(--space-phi2)",
  phi3: "var(--space-phi3)",
} as const;
