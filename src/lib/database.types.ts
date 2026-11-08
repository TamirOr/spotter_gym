// Database types in the shape `supabase gen types typescript` produces.
// Regenerate with `npm run gen:types` against a local Supabase after changing a migration.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Enums = {
  approval_status: 'pending' | 'approved' | 'rejected';
  activity_kind: 'strength' | 'endurance' | 'sport' | 'mobility' | 'other';
  app_language: 'he' | 'en';
  checkin_source: 'manual' | 'place';
  checkin_state: 'going' | 'done' | 'cancelled';
  clique_member_status: 'invited' | 'active' | 'left';
  clique_role: 'owner' | 'member';
  friendship_status: 'pending' | 'accepted' | 'blocked';
  goal_metric: 'sessions' | 'distance_km' | 'steps';
  goal_period: 'day' | 'week' | 'month';
  goal_visibility: 'shared' | 'private';
  notification_kind:
    | 'going'
    | 'done'
    | 'cheer'
    | 'friend_invite'
    | 'clique_invite'
    | 'plan_reminder'
    | 'plan_missed'
    | 'nudge'
    | 'signup_pending'
    | 'account_approved';
  plan_exception_action: 'skip' | 'move';
  reaction_type: 'muscle' | 'fire' | 'clap' | 'trophy' | 'yalla' | 'well_done' | 'champ' | 'note';
  weekday: 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  language: Enums['app_language'];
  time_zone: string;
  paused_until: string | null;
  automation_token_hash: string | null;
  onboarded_at: string | null;
  nudges_enabled: boolean;
  muted_notification_kinds: Enums['notification_kind'][];
  quiet_hours_start: string;
  quiet_hours_end: string;
  going_ignores_quiet_hours: boolean;
  created_at: string;
  is_admin: boolean;
  approval: Enums['approval_status'];
  rejection_reason: string | null;
  approved_at: string | null;
  active: boolean;
};

type ActivityRow = {
  id: string;
  owner_id: string | null;
  name: string;
  name_he: string | null;
  normalized_name: string;
  aliases: string[];
  kind: Enums['activity_kind'];
  created_at: string;
};

type GoalRow = {
  id: string;
  user_id: string;
  activity_id: string;
  metric: Enums['goal_metric'];
  target: number;
  period: Enums['goal_period'];
  visibility: Enums['goal_visibility'];
  starts_on: string;
  ends_on: string | null;
  created_at: string;
};

type PlanItemRow = {
  id: string;
  user_id: string;
  activity_id: string;
  place_id: string | null;
  time: string | null;
  rrule: string | null;
  starts_on: string;
  reminder_lead_min: number | null;
  created_at: string;
  deleted_at: string | null;
};

type RoutineRow = {
  id: string;
  user_id: string;
  activity_id: string;
  times_per_week: number;
  created_at: string;
};

type RoutineDayRow = {
  routine_id: string;
  weekday: Enums['weekday'];
  name: string | null;
};

type PlanExceptionRow = {
  plan_item_id: string;
  occurs_on: string;
  action: Enums['plan_exception_action'];
  new_date: string | null;
};

type CheckinRow = {
  id: string;
  user_id: string;
  activity_id: string;
  plan_item_id: string | null;
  place_id: string | null;
  state: Enums['checkin_state'];
  source: Enums['checkin_source'];
  started_at: string;
  ended_at: string | null;
  local_day: string;
  duration_min: number | null;
  distance_km: number | null;
  note: string | null;
  created_at: string;
};

type CliqueRow = {
  id: string;
  name: string;
  photo_url: string | null;
  owner_id: string;
  time_zone: string;
  created_at: string;
};

type CliqueMemberRow = {
  clique_id: string;
  user_id: string;
  role: Enums['clique_role'];
  status: Enums['clique_member_status'];
  invited_by: string | null;
  muted: boolean;
  joined_at: string | null;
};

type FriendshipRow = {
  user_low: string;
  user_high: string;
  status: Enums['friendship_status'];
  requested_by: string;
  created_at: string;
};

type ReactionRow = {
  id: string;
  checkin_id: string;
  sender_id: string | null;
  type: Enums['reaction_type'];
  body: string | null;
  created_at: string;
};

type GoingPhotoRow = {
  checkin_id: string;
  user_id: string;
  path: string;
  created_at: string;
  expires_at: string;
  removed_at: string | null;
};

type PhotoViewRow = {
  checkin_id: string;
  viewer_id: string;
  opened_at: string;
};

type NudgeRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  day: string;
  body: string | null;
  created_at: string;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  subscription: Json;
  updated_at: string;
};

type Relationship<Column extends string, Table extends string> = {
  foreignKeyName: string;
  columns: [Column];
  isOneToOne: false;
  referencedRelation: Table;
  referencedColumns: ['id'];
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>, Relationships extends unknown[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      activities: Table<ActivityRow, Pick<ActivityRow, 'name'> & Partial<Pick<ActivityRow, 'kind'>>>;
      goals: Table<
        GoalRow,
        Pick<GoalRow, 'activity_id' | 'target'> &
          Partial<Pick<GoalRow, 'metric' | 'period' | 'visibility' | 'starts_on' | 'ends_on'>>
      >;
      plan_items: Table<
        PlanItemRow,
        Pick<PlanItemRow, 'activity_id'> &
          Partial<Pick<PlanItemRow, 'place_id' | 'time' | 'rrule' | 'starts_on' | 'reminder_lead_min'>>
      >;
      plan_exceptions: Table<
        PlanExceptionRow,
        Pick<PlanExceptionRow, 'plan_item_id' | 'occurs_on' | 'action'> & Partial<Pick<PlanExceptionRow, 'new_date'>>
      >;
      routines: Table<RoutineRow, Record<string, never>, Record<string, never>>;
      routine_days: Table<
        RoutineDayRow,
        Record<string, never>,
        Record<string, never>,
        [Relationship<'routine_id', 'routines'>]
      >;
      checkins: Table<CheckinRow, Partial<CheckinRow>, Partial<CheckinRow>, [Relationship<'user_id', 'profiles'>]>;
      cliques: Table<CliqueRow, Pick<CliqueRow, 'name'> & Partial<Pick<CliqueRow, 'photo_url' | 'time_zone'>>>;
      clique_members: Table<
        CliqueMemberRow,
        Partial<CliqueMemberRow>,
        Partial<CliqueMemberRow>,
        [Relationship<'clique_id', 'cliques'>, Relationship<'user_id', 'profiles'>]
      >;
      friendships: Table<FriendshipRow>;
      reactions: Table<
        ReactionRow,
        Pick<ReactionRow, 'checkin_id' | 'type'> & Partial<Pick<ReactionRow, 'body'>>,
        Partial<ReactionRow>,
        [Relationship<'checkin_id', 'checkins'>, Relationship<'sender_id', 'profiles'>]
      >;
      nudges: Table<NudgeRow, Pick<NudgeRow, 'recipient_id'> & Partial<Pick<NudgeRow, 'body'>>>;
      // Written only through attach_going_photo() and open_going_photo().
      going_photos: Table<GoingPhotoRow, Record<string, never>, Record<string, never>>;
      photo_views: Table<
        PhotoViewRow,
        Record<string, never>,
        Record<string, never>,
        [
          {
            foreignKeyName: string;
            columns: ['checkin_id'];
            isOneToOne: false;
            referencedRelation: 'going_photos';
            referencedColumns: ['checkin_id'];
          },
        ]
      >;
      push_subscriptions: Table<PushSubscriptionRow>;
    };
    Views: Record<never, never>;
    Functions: {
      get_my_profile: { Args: Record<string, never>; Returns: ProfileRow };
      match_activity: { Args: { p_name: string }; Returns: { activity_id: string; exact: boolean }[] };
      revise_goal: {
        Args: { p_goal_id: string; p_target: number; p_period: Enums['goal_period'] };
        Returns: GoalRow;
      };
      remove_plan_item: { Args: { p_plan_item_id: string }; Returns: undefined };
      save_routine: {
        Args: { p_routine_id: string | null; p_activity_id: string; p_times_per_week: number; p_days?: Json };
        Returns: string;
      };
      mark_going: { Args: { p_checkin_id: string; p_activity_id: string }; Returns: CheckinRow };
      mark_done: {
        Args: {
          p_checkin_id: string;
          p_activity_id: string;
          p_ended_at?: string;
          p_duration_min?: number | null;
          p_distance_km?: number | null;
          p_note?: string | null;
        };
        Returns: CheckinRow;
      };
      cancel_going: { Args: Record<string, never>; Returns: undefined };
      attach_going_photo: { Args: { p_checkin_id: string }; Returns: undefined };
      open_going_photo: { Args: { p_checkin_id: string }; Returns: string };
      search_profiles: {
        Args: { p_query: string };
        Returns: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          friendship: 'none' | 'friends' | 'request_sent' | 'request_received' | 'blocked';
        }[];
      };
      request_friend: { Args: { p_other: string }; Returns: string };
      decline_friend_request: { Args: { p_other: string }; Returns: undefined };
      remove_friendship: { Args: { p_other: string }; Returns: undefined };
      block_user: { Args: { p_other: string }; Returns: undefined };
      invite_to_clique: { Args: { p_clique_id: string; p_user_id: string }; Returns: undefined };
      respond_clique_invite: { Args: { p_clique_id: string; p_accept: boolean }; Returns: undefined };
      leave_clique: { Args: { p_clique_id: string }; Returns: undefined };
      save_push_subscription: { Args: { p_subscription: Json }; Returns: undefined };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
      admin_users: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          full_name: string;
          email: string;
          avatar_url: string | null;
          is_admin: boolean;
          approval: Enums['approval_status'];
          rejection_reason: string | null;
          active: boolean;
          created_at: string;
          approved_at: string | null;
          onboarded_at: string | null;
          last_sign_in_at: string | null;
        }[];
      };
      admin_added_users: { Args: Record<string, never>; Returns: { email: string; created_at: string }[] };
      admin_user_support: { Args: { p_user_id: string }; Returns: Json };
      admin_health: {
        Args: Record<string, never>;
        Returns: { push_backlog: number; oldest_push_minutes: number; pending_signups: number }[];
      };
      approve_user: { Args: { p_user_id: string }; Returns: undefined };
      reject_user: { Args: { p_user_id: string; p_reason?: string | null }; Returns: undefined };
      set_user_active: { Args: { p_user_id: string; p_active: boolean }; Returns: undefined };
      delete_user: { Args: { p_user_id: string }; Returns: undefined };
      add_user: { Args: { p_email: string }; Returns: undefined };
      cancel_added_user: { Args: { p_email: string }; Returns: undefined };
      clique_today: {
        Args: { p_clique_id: string };
        Returns: {
          user_id: string;
          full_name: string;
          avatar_url: string | null;
          status: 'training' | 'done' | 'planned' | 'none';
          activity_id: string | null;
          planned_time: string | null;
          checkin_id: string | null;
          cheered: boolean;
          nudged: boolean;
          can_nudge: boolean;
        }[];
      };
      my_today: {
        Args: Record<string, never>;
        Returns: {
          today: string;
          planned_plan_item_id: string | null;
          planned_activity_id: string | null;
          planned_time: string | null;
          going_checkin_id: string | null;
          going_activity_id: string | null;
          going_started_at: string | null;
          going_expired: boolean | null;
          done_checkin_id: string | null;
          done_activity_id: string | null;
          cheer_count: number;
          friends_training: number;
        }[];
      };
      clique_leaderboard: {
        Args: { p_clique_id: string; p_period?: 'week' | 'month'; p_periods_ago?: number };
        Returns: {
          user_id: string;
          full_name: string;
          avatar_url: string | null;
          planned: number;
          completed: number;
          score: number;
          rank: number | null;
        }[];
      };
      my_week: {
        Args: { p_week_start: string };
        Returns: {
          day: string;
          activity_id: string;
          time: string | null;
          plan_item_id: string | null;
          checkin_id: string | null;
          status: 'done' | 'planned' | 'skipped' | 'missed';
        }[];
      };
      clique_routines: {
        Args: { p_clique_id: string };
        Returns: {
          routine_id: string;
          user_id: string;
          activity_id: string;
          times_per_week: number;
          days: { weekday: Enums['weekday']; name: string | null }[];
        }[];
      };
      goal_progress: {
        Args: { p_clique_id?: string | null };
        Returns: {
          goal_id: string;
          user_id: string;
          activity_id: string;
          metric: Enums['goal_metric'];
          target: number;
          period: Enums['goal_period'];
          visibility: Enums['goal_visibility'];
          progress: number;
        }[];
      };
    };
    Enums: Enums;
    CompositeTypes: Record<never, never>;
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type Rpc<T extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][T]['Returns'];
export type Enum<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];
