export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** One executable action attached to a saved link */
export type LinkActionItem = {
  id: string;
  label: string;
  kind: "open" | "save" | "share" | "remind" | "copy" | "custom";
  href?: string;
  payload?: Record<string, Json>;
};

export type FeedVisualMode = "brand" | "poster" | "thumb";

export type LinkStatus = "open" | "done";

export type LinkCommentKind =
  | "text"
  | "done"
  | "coupon"
  | "note"
  | "price_snap"
  | "price_ok"
  | "price_high";

export type LinkRow = {
  id: string;
  user_id: string | null;
  original_url: string;
  title: string;
  thumbnail_url: string | null;
  domain: string;
  category: string | null;
  actions: LinkActionItem[];
  visual_mode?: FeedVisualMode | null;
  source_type?: string | null;
  share_slug?: string | null;
  link_status?: LinkStatus | null;
  room_id?: string | null;
  created_at: string;
  expires_at: string | null;
};

export type RoomRow = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
};

export type LinkCommentRow = {
  id: string;
  link_id: string;
  kind: LinkCommentKind;
  message: string;
  author_label: string;
  created_at: string;
};

export type UserActionBinRow = {
  id: string;
  user_id: string | null;
  context_bin: string;
  action_key: string;
  impressions: number;
  clicks: number;
  skips: number;
  updated_at: string;
};

export type AnalyticsEventRow = {
  id: string;
  event_type: "enrich" | "action_click" | "funnel";
  ts: string;
  session_id: string;
  flow_id: string | null;
  domain: string | null;
  enricher_id: string | null;
  payload: Json;
  created_at: string;
};

export type UserActionEventRow = {
  id: string;
  user_id: string | null;
  session_id: string;
  link_id: string | null;
  context_bin: string;
  action_key: string;
  action_family: string;
  domain: string | null;
  domain_family: string;
  link_category: string | null;
  route_mode: string | null;
  event: "impression" | "click" | "skip" | "dismiss" | "defer" | "yield";
  metadata: Json;
  ts: string;
};

export type UserLinkStateRow = {
  id: string;
  user_id: string | null;
  session_id: string;
  link_id: string;
  domain_family: string;
  link_category: string | null;
  lifecycle_state: "saved" | "opened" | "compared" | "decided" | "done" | "undone";
  first_saved_at: string;
  last_opened_at: string | null;
  last_action_family: string | null;
  last_action_at: string | null;
  reopen_count: number;
  updated_at: string;
};

export type UserRecentActionProfileRow = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  recent_clicks: Json;
  family_counts: Json;
  domain_affinity: Json;
  click_total: number;
  updated_at: string;
};

export type PlaceLocateCacheRow = {
  id: string;
  place_name_key: string;
  place_name: string;
  formatted_address: string | null;
  lat: number;
  lng: number;
  google_place_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PeerThreadRow = {
  id: string;
  owner_user_id: string;
  display_name: string;
  invite_code: string;
  created_at: string;
};

export type PeerThreadMemberRow = {
  thread_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
};

export type PeerMessageRow = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
};

export type UserProfileRow = {
  user_id: string;
  phone_e164: string | null;
  email_lower: string | null;
  rimvio_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      links: {
        Row: LinkRow;
        Insert: {
          id?: string;
          user_id?: string | null;
          original_url: string;
          title: string;
          thumbnail_url?: string | null;
          domain: string;
          category?: string | null;
          actions?: LinkActionItem[];
          visual_mode?: FeedVisualMode | null;
          source_type?: string | null;
          share_slug?: string | null;
          link_status?: LinkStatus | null;
          room_id?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          original_url?: string;
          title?: string;
          thumbnail_url?: string | null;
          domain?: string;
          category?: string | null;
          actions?: LinkActionItem[];
          visual_mode?: FeedVisualMode | null;
          source_type?: string | null;
          share_slug?: string | null;
          link_status?: LinkStatus | null;
          room_id?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      user_action_bins: {
        Row: UserActionBinRow;
        Insert: {
          id?: string;
          user_id?: string | null;
          context_bin: string;
          action_key: string;
          impressions?: number;
          clicks?: number;
          skips?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          context_bin?: string;
          action_key?: string;
          impressions?: number;
          clicks?: number;
          skips?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: AnalyticsEventRow;
        Insert: {
          id?: string;
          event_type: "enrich" | "action_click" | "funnel";
          ts: string;
          session_id: string;
          flow_id?: string | null;
          domain?: string | null;
          enricher_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: "enrich" | "action_click" | "funnel";
          ts?: string;
          session_id?: string;
          flow_id?: string | null;
          domain?: string | null;
          enricher_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      user_action_events: {
        Row: UserActionEventRow;
        Insert: Partial<UserActionEventRow> & Pick<UserActionEventRow, "session_id" | "context_bin" | "action_key" | "action_family" | "domain_family" | "event">;
        Update: Partial<UserActionEventRow>;
        Relationships: [];
      };
      user_link_states: {
        Row: UserLinkStateRow;
        Insert: Partial<UserLinkStateRow> & Pick<UserLinkStateRow, "session_id" | "link_id" | "domain_family">;
        Update: Partial<UserLinkStateRow>;
        Relationships: [];
      };
      user_recent_action_profile: {
        Row: UserRecentActionProfileRow;
        Insert: Partial<UserRecentActionProfileRow>;
        Update: Partial<UserRecentActionProfileRow>;
        Relationships: [];
      };
      place_locate_cache: {
        Row: PlaceLocateCacheRow;
        Insert: {
          id?: string;
          place_name_key: string;
          place_name: string;
          formatted_address?: string | null;
          lat: number;
          lng: number;
          google_place_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          place_name_key?: string;
          place_name?: string;
          formatted_address?: string | null;
          lat?: number;
          lng?: number;
          google_place_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      peer_threads: {
        Row: PeerThreadRow;
        Insert: {
          id: string;
          owner_user_id: string;
          display_name?: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          display_name?: string;
          invite_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      peer_thread_members: {
        Row: PeerThreadMemberRow;
        Insert: {
          thread_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          thread_id?: string;
          user_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      peer_messages: {
        Row: PeerMessageRow;
        Insert: {
          id?: string;
          thread_id: string;
          sender_user_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          sender_user_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      friend_connections: {
        Row: {
          user_id: string;
          friend_id: string;
          thread_id: string;
          is_pinned: boolean;
          pin_slot: number | null;
          interaction_score: number;
          last_interaction_at: string;
          last_read_at: string;
          peer_last_read_at: string | null;
          last_inbound_at: string | null;
          unread_count: number;
          messages_purge_after: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      relationship_slots: {
        Row: {
          id: string;
          user_id: string;
          room_id: string;
          friend_id: string;
          last_message: string | null;
          last_activity_at: string;
          unread_count: number;
          is_pinned: boolean;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      user_profiles: {
        Row: UserProfileRow;
        Insert: {
          user_id: string;
          phone_e164?: string | null;
          email_lower?: string | null;
          rimvio_id?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          phone_e164?: string | null;
          email_lower?: string | null;
          rimvio_id?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      lookup_user_id_by_phone: {
        Args: { p_phone_e164: string };
        Returns: string | null;
      };
      lookup_user_id_by_email: {
        Args: { p_email_lower: string };
        Returns: string | null;
      };
      lookup_user_id_by_rimvio_id: {
        Args: { p_rimvio_id: string };
        Returns: string | null;
      };
      rimvio_user_is_member: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      rimvio_ensure_user_profile: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      get_peer_public_profile: {
        Args: { p_target_user_id: string };
        Returns: Json;
      };
      get_friend_add_preview_profile: {
        Args: { p_target_user_id: string };
        Returns: Json;
      };
      ensure_dm_thread_partner_member: {
        Args: { p_thread_id: string; p_partner_user_id: string };
        Returns: undefined;
      };
      ensure_reciprocal_friend_connection: {
        Args: {
          p_friend_id: string;
          p_thread_id: string;
          p_bump_interaction?: boolean;
        };
        Returns: undefined;
      };
      complete_dm_friend_add: {
        Args: {
          p_other_user_id: string;
          p_friend_display_name?: string | null;
        };
        Returns: Json;
      };
      is_peer_thread_member: {
        Args: { p_thread_id: string; p_user_id?: string };
        Returns: boolean;
      };
      rimvio_rename_group_thread: {
        Args: { p_thread_id: string; p_display_name: string };
        Returns: string;
      };
      match_users_by_phones: {
        Args: { p_phones: string[] };
        Returns: Array<{
          user_id: string;
          phone_e164: string;
          display_name: string | null;
          rimvio_id: string | null;
        }>;
      };
      record_action_bin_event: {
        Args: {
          p_context_bin: string;
          p_action_key: string;
          p_event: string;
          p_user_id?: string | null;
        };
        Returns: undefined;
      };
      record_personalization_click: {
        Args: {
          p_session_id: string;
          p_user_id?: string;
          p_link_id?: string;
          p_context_bin?: string;
          p_action_key?: string;
          p_action_family?: string;
          p_domain?: string;
          p_domain_family?: string;
          p_link_category?: string;
          p_route_mode?: string;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      record_user_action_event: {
        Args: {
          p_session_id: string;
          p_user_id?: string;
          p_link_id?: string;
          p_context_bin?: string;
          p_action_key?: string;
          p_action_family?: string;
          p_domain?: string;
          p_domain_family?: string;
          p_link_category?: string;
          p_route_mode?: string;
          p_event?: string;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      record_link_reopen: {
        Args: {
          p_session_id: string;
          p_link_id: string;
          p_user_id?: string;
          p_domain_family?: string;
          p_link_category?: string;
        };
        Returns: Json;
      };
      merge_guest_personalization: {
        Args: {
          p_session_id: string;
          p_user_id: string;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const mockLinks: LinkRow[] = [
  {
    id: "mock-1",
    user_id: null,
    original_url: "https://www.figma.com/file/design-handoff",
    title: "Review design handoff",
    thumbnail_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&h=256&fit=crop",
    domain: "figma.com",
    category: "Design",
    actions: [
      { id: "a1", label: "Open in Figma", kind: "open", href: "https://www.figma.com/file/design-handoff" },
      { id: "a2", label: "Remind me tonight", kind: "remind", payload: { at: "20:00" } },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    expires_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "mock-2",
    user_id: null,
    original_url: "https://linear.app/team/issue/SCOPE-42",
    title: "Approve sprint scope",
    thumbnail_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=256&h=256&fit=crop",
    domain: "linear.app",
    category: "Product",
    actions: [
      { id: "a1", label: "Open issue", kind: "open", href: "https://linear.app/team/issue/SCOPE-42" },
      { id: "a2", label: "Share with team", kind: "share" },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "mock-3",
    user_id: null,
    original_url: "https://stripe.com/docs/payments/checkout",
    title: "Stripe Checkout integration guide",
    thumbnail_url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=256&h=256&fit=crop",
    domain: "stripe.com",
    category: "Engineering",
    actions: [
      { id: "a1", label: "Read docs", kind: "open", href: "https://stripe.com/docs/payments/checkout" },
      { id: "a2", label: "Save for later", kind: "save" },
      { id: "a3", label: "Copy link", kind: "copy" },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: "mock-4",
    user_id: null,
    original_url: "https://www.notion.so/product-roadmap-q2",
    title: "Q2 product roadmap",
    thumbnail_url: null,
    domain: "notion.so",
    category: "Planning",
    actions: [
      { id: "a1", label: "Open in Notion", kind: "open", href: "https://www.notion.so/product-roadmap-q2" },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
];
