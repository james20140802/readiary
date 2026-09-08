import type { Database, Json } from '@/types/supabase';
export const PUSH_KINDS = ['reminder', 'finished', 'weekly', 'recall', 'friends'] as const;
export type PushKind = (typeof PUSH_KINDS)[number];
export interface PushPreferences {
  enabled: boolean;
  kinds: PushKind[];
  timezone: string;
  hour: number;
  weekdays: number[];
}
export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  enabled: false,
  kinds: [],
  timezone: 'Asia/Seoul',
  hour: 20,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
};
export interface PushItem {
  kind: PushKind;
  href: string;
  label: string;
  book?: string;
  entry?: string;
}
export interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}
export interface Delivery {
  id: string;
  user_id: string;
  items: Json;
  status: string;
  created_at: string;
  opened_at: string | null;
}
type Table<T> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: [] };
export type PushDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables' | 'Functions'> & {
    Tables: Database['public']['Tables'] & {
      push_preferences: Table<
        PushPreferences & { user_id: string; consent_at: string; seen_at: string }
      >;
      push_subscriptions: Table<SubscriptionRow>;
      push_deliveries: Table<Delivery>;
    };
    Functions: Database['public']['Functions'] & {
      save_push_preferences: {
        Args: {
          p_enabled: boolean;
          p_kinds: string[];
          p_timezone: string;
          p_hour: number;
          p_weekdays: number[];
        };
        Returns: undefined;
      };
      save_push_subscription: {
        Args: { p_endpoint: string; p_p256dh: string; p_auth: string };
        Returns: undefined;
      };
      mark_push_seen: { Args: { p_kind: string; p_delivery?: string }; Returns: undefined };
      has_unread_notifications: { Args: Record<string, never>; Returns: boolean };
      claim_push_test: { Args: { p_user: string; p_endpoint: string }; Returns: Json };
      claim_push_batch: { Args: { p_limit: number }; Returns: Delivery[] };
      authorize_push_delivery: { Args: { p_id: string }; Returns: Json };
    };
  };
};
