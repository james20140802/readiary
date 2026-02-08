export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.3 (519615d)';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      badges: {
        Row: {
          code: string;
          created_at: string | null;
          description: string | null;
          icon_url: string | null;
          id: string;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string | null;
          description?: string | null;
          icon_url?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          description?: string | null;
          icon_url?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      books: {
        Row: {
          author: string | null;
          cover_url: string | null;
          id: string;
          isbn: string | null;
          title: string;
          total_pages: number | null;
        };
        Insert: {
          author?: string | null;
          cover_url?: string | null;
          id?: string;
          isbn?: string | null;
          title: string;
          total_pages?: number | null;
        };
        Update: {
          author?: string | null;
          cover_url?: string | null;
          id?: string;
          isbn?: string | null;
          title?: string;
          total_pages?: number | null;
        };
        Relationships: [];
      };
      entries: {
        Row: {
          created_at: string | null;
          date: string;
          from_page: number | null;
          id: string;
          is_private: boolean;
          summary: string | null;
          to_page: number | null;
          user_book_id: string;
        };
        Insert: {
          created_at?: string | null;
          date: string;
          from_page?: number | null;
          id?: string;
          is_private?: boolean;
          summary?: string | null;
          to_page?: number | null;
          user_book_id: string;
        };
        Update: {
          created_at?: string | null;
          date?: string;
          from_page?: number | null;
          id?: string;
          is_private?: boolean;
          summary?: string | null;
          to_page?: number | null;
          user_book_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_user_book_id';
            columns: ['user_book_id'];
            isOneToOne: false;
            referencedRelation: 'user_books';
            referencedColumns: ['id'];
          },
        ];
      };
      friends: {
        Row: {
          accepted_at: string | null;
          friend_id: string;
          id: string;
          requested_at: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          friend_id: string;
          id?: string;
          requested_at?: string | null;
          status: string;
          user_id: string;
        };
        Update: {
          accepted_at?: string | null;
          friend_id?: string;
          id?: string;
          requested_at?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'friends_friend_id_fkey';
            columns: ['friend_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friends_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          bio: string | null;
          created_at: string | null;
          id: string;
          name: string;
          nickname: string;
          profile_image: string | null;
          tag: string;
        };
        Insert: {
          bio?: string | null;
          created_at?: string | null;
          id: string;
          name: string;
          nickname: string;
          profile_image?: string | null;
          tag: string;
        };
        Update: {
          bio?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string;
          nickname?: string;
          profile_image?: string | null;
          tag?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          awarded_at: string | null;
          badge_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          awarded_at?: string | null;
          badge_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          awarded_at?: string | null;
          badge_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_user_badges_badge_id';
            columns: ['badge_id'];
            isOneToOne: false;
            referencedRelation: 'badges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_badges_badge_id_fkey';
            columns: ['badge_id'];
            isOneToOne: false;
            referencedRelation: 'badges';
            referencedColumns: ['id'];
          },
        ];
      };
      user_books: {
        Row: {
          book_id: string;
          created_at: string | null;
          id: string;
          is_finished: boolean | null;
          last_read_page: number | null;
          progress: number | null;
          started_at: string | null;
          user_id: string;
        };
        Insert: {
          book_id: string;
          created_at?: string | null;
          id?: string;
          is_finished?: boolean | null;
          last_read_page?: number | null;
          progress?: number | null;
          started_at?: string | null;
          user_id: string;
        };
        Update: {
          book_id?: string;
          created_at?: string | null;
          id?: string;
          is_finished?: boolean | null;
          last_read_page?: number | null;
          progress?: number | null;
          started_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_books_book_id_fkey';
            columns: ['book_id'];
            isOneToOne: false;
            referencedRelation: 'books';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      update_user_book_progress: {
        Args: { p_book_id: string; p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      status: 'accepted' | 'pending';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      status: ['accepted', 'pending'],
    },
  },
} as const;
