export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_number: string | null
          account_type: string
          balance: number
          bank_id: string
          bank_name: string
          created_at: string | null
          currency: string
          iban: string | null
          id: string
          name: string
          overdraft_interest_rate: number
          overdraft_limit: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_number?: string | null
          account_type: string
          balance?: number
          bank_id: string
          bank_name: string
          created_at?: string | null
          currency?: string
          iban?: string | null
          id?: string
          name: string
          overdraft_interest_rate?: number
          overdraft_limit?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          balance?: number
          bank_id?: string
          bank_name?: string
          created_at?: string | null
          currency?: string
          iban?: string | null
          id?: string
          name?: string
          overdraft_interest_rate?: number
          overdraft_limit?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_cache: {
        Row: {
          adjusted_ttl_hours: number | null
          base_ttl_hours: number | null
          cache_key: string
          cache_type: string
          created_at: string
          expires_at: string
          hit_count: number | null
          id: string
          last_hit_at: string | null
          request_hash: string
          response_data: Json
          user_id: string
        }
        Insert: {
          adjusted_ttl_hours?: number | null
          base_ttl_hours?: number | null
          cache_key: string
          cache_type: string
          created_at?: string
          expires_at: string
          hit_count?: number | null
          id?: string
          last_hit_at?: string | null
          request_hash: string
          response_data: Json
          user_id: string
        }
        Update: {
          adjusted_ttl_hours?: number | null
          base_ttl_hours?: number | null
          cache_key?: string
          cache_type?: string
          created_at?: string
          expires_at?: string
          hit_count?: number | null
          id?: string
          last_hit_at?: string | null
          request_hash?: string
          response_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          category: string
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category?: string
          created_at?: string | null
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value?: number
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      budget_limits: {
        Row: {
          alert_threshold: number | null
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          monthly_limit: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_threshold?: number | null
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_limit: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_threshold?: number | null
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_limit?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cache_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          balance: number
          bank_id: string
          bank_name: string
          card_limit: number
          created_at: string | null
          currency: string
          due_date: number
          id: string
          last_four_digits: string
          minimum_payment: number
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          bank_id: string
          bank_name: string
          card_limit?: number
          created_at?: string | null
          currency?: string
          due_date: number
          id?: string
          last_four_digits: string
          minimum_payment?: number
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          bank_id?: string
          bank_name?: string
          card_limit?: number
          created_at?: string | null
          currency?: string
          due_date?: number
          id?: string
          last_four_digits?: string
          minimum_payment?: number
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crypto_holdings: {
        Row: {
          created_at: string | null
          exchange: string | null
          id: string
          name: string
          notes: string | null
          purchase_currency: string
          purchase_price: number
          quantity: number
          symbol: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exchange?: string | null
          id?: string
          name: string
          notes?: string | null
          purchase_currency?: string
          purchase_price?: number
          quantity?: number
          symbol: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          exchange?: string | null
          id?: string
          name?: string
          notes?: string | null
          purchase_currency?: string
          purchase_price?: number
          quantity?: number
          symbol?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crypto_price_alerts: {
        Row: {
          created_at: string | null
          direction: string
          id: string
          is_active: boolean | null
          is_triggered: boolean | null
          name: string
          symbol: string
          target_price: number
          triggered_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          id?: string
          is_active?: boolean | null
          is_triggered?: boolean | null
          name: string
          symbol: string
          target_price: number
          triggered_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          is_active?: boolean | null
          is_triggered?: boolean | null
          name?: string
          symbol?: string
          target_price?: number
          triggered_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      currency_holdings: {
        Row: {
          asset_code: string
          asset_name: string
          asset_type: string
          created_at: string | null
          id: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number
          quantity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asset_code: string
          asset_name: string
          asset_type: string
          created_at?: string | null
          id?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number
          quantity?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asset_code?: string
          asset_name?: string
          asset_type?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number
          quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_analytics: {
        Row: {
          created_at: string
          email_type: string
          event_type: string
          id: string
          ip_address: string | null
          link_url: string | null
          user_agent: string | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_type: string
          event_type: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          user_agent?: string | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_type?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          created_at: string
          email: string
          frequency: string
          id: string
          is_active: boolean
          language: string | null
          last_sent_at: string | null
          preferred_day: number | null
          preferred_hour: number | null
          preferred_minute: number | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          frequency?: string
          id?: string
          is_active?: boolean
          language?: string | null
          last_sent_at?: string | null
          preferred_day?: number | null
          preferred_hour?: number | null
          preferred_minute?: number | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          frequency?: string
          id?: string
          is_active?: boolean
          language?: string | null
          last_sent_at?: string | null
          preferred_day?: number | null
          preferred_hour?: number | null
          preferred_minute?: number | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      family_groups: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      family_invites: {
        Row: {
          created_at: string | null
          expires_at: string | null
          family_id: string
          id: string
          invited_by: string
          invited_email: string
          status: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          family_id: string
          id?: string
          invited_by: string
          invited_email: string
          status?: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          family_id?: string
          id?: string
          invited_by?: string
          invited_email?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invites_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          family_id: string
          id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          family_id: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          family_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_payments: {
        Row: {
          account_id: string | null
          amount: number
          card_id: string | null
          category: string
          created_at: string | null
          currency: string
          id: string
          is_active: boolean | null
          name: string
          payment_day: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          card_id?: string | null
          category: string
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          name: string
          payment_day: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          card_id?: string | null
          category?: string
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          name?: string
          payment_day?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_payments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          card_id: string | null
          category: string
          created_at: string | null
          currency: string
          id: string
          is_active: boolean | null
          monthly_amount: number
          name: string
          paid_months: number
          start_date: string
          total_amount: number
          total_months: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_id?: string | null
          category: string
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          monthly_amount: number
          name: string
          paid_months?: number
          start_date: string
          total_amount: number
          total_months: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_id?: string | null
          category?: string
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          monthly_amount?: number
          name?: string
          paid_months?: number
          start_date?: string
          total_amount?: number
          total_months?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          account_id: string | null
          bank_id: string | null
          bank_name: string | null
          card_id: string | null
          created_at: string | null
          currency: string
          end_date: string | null
          id: string
          interest_rate: number | null
          is_active: boolean | null
          loan_type: string
          monthly_payment: number
          name: string
          paid_months: number
          payment_day: number
          remaining_amount: number
          start_date: string
          total_amount: number
          total_months: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          bank_id?: string | null
          bank_name?: string | null
          card_id?: string | null
          created_at?: string | null
          currency?: string
          end_date?: string | null
          id?: string
          interest_rate?: number | null
          is_active?: boolean | null
          loan_type: string
          monthly_payment: number
          name: string
          paid_months?: number
          payment_day: number
          remaining_amount: number
          start_date: string
          total_amount: number
          total_months: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          bank_id?: string | null
          bank_name?: string | null
          card_id?: string | null
          created_at?: string | null
          currency?: string
          end_date?: string | null
          id?: string
          interest_rate?: number | null
          is_active?: boolean | null
          loan_type?: string
          monthly_payment?: number
          name?: string
          paid_months?: number
          payment_day?: number
          remaining_amount?: number
          start_date?: string
          total_amount?: number
          total_months?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      login_events: {
        Row: {
          city: string | null
          country_code: string | null
          event_type: string
          id: string
          ip_address: string | null
          is_suspicious: boolean | null
          login_at: string
          suspicious_reason: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          is_suspicious?: boolean | null
          login_at?: string
          suspicious_reason?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          country_code?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          is_suspicious?: boolean | null
          login_at?: string
          suspicious_reason?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          priority: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          related_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          priority?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          related_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          priority?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          related_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_emails: {
        Row: {
          created_at: string
          current_day: number
          id: string
          is_completed: boolean
          language: string
          last_sent_at: string | null
          updated_at: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          current_day?: number
          id?: string
          is_completed?: boolean
          language?: string
          last_sent_at?: string | null
          updated_at?: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          current_day?: number
          id?: string
          is_completed?: boolean
          language?: string
          last_sent_at?: string | null
          updated_at?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          duration_seconds: number | null
          id: string
          page_name: string
          page_path: string
          session_id: string | null
          user_id: string
          viewed_at: string
        }
        Insert: {
          duration_seconds?: number | null
          id?: string
          page_name: string
          page_path: string
          session_id?: string | null
          user_id: string
          viewed_at?: string
        }
        Update: {
          duration_seconds?: number | null
          id?: string
          page_name?: string
          page_path?: string
          session_id?: string | null
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      payment_records: {
        Row: {
          amount: number
          created_at: string
          fixed_payment_id: string | null
          id: string
          paid_at: string | null
          payment_month: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          fixed_payment_id?: string | null
          id?: string
          paid_at?: string | null
          payment_month: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          fixed_payment_id?: string | null
          id?: string
          paid_at?: string | null
          payment_month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_fixed_payment_id_fkey"
            columns: ["fixed_payment_id"]
            isOneToOne: false
            referencedRelation: "fixed_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      push_notification_preferences: {
        Row: {
          achievement_alerts: boolean | null
          budget_alerts: boolean | null
          created_at: string | null
          enabled: boolean | null
          id: string
          payment_reminders: boolean | null
          subscription_endpoint: string | null
          subscription_keys: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievement_alerts?: boolean | null
          budget_alerts?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          payment_reminders?: boolean | null
          subscription_endpoint?: string | null
          subscription_keys?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievement_alerts?: boolean | null
          budget_alerts?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          payment_reminders?: boolean | null
          subscription_endpoint?: string | null
          subscription_keys?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      receipt_items: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          id: string
          name: string
          quantity: number | null
          total_price: number
          transaction_date: string | null
          transaction_id: string | null
          unit_price: number | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name: string
          quantity?: number | null
          total_price: number
          transaction_date?: string | null
          transaction_id?: string | null
          unit_price?: number | null
          user_id: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          quantity?: number | null
          total_price?: number
          transaction_date?: string | null
          transaction_id?: string | null
          unit_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          category: string | null
          created_at: string
          current_amount: number
          deadline: string | null
          id: string
          is_completed: boolean
          name: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          is_completed?: boolean
          name: string
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          is_completed?: boolean
          name?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_accounts: {
        Row: {
          account_id: string
          created_at: string | null
          family_id: string
          id: string
          shared_by: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          family_id: string
          id?: string
          shared_by: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          family_id?: string
          id?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_accounts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      suspicious_activity_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          id: string
          is_resolved: boolean | null
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          card_id: string | null
          category: string
          created_at: string | null
          currency: string
          description: string | null
          id: string
          receipt_image_url: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          card_id?: string | null
          category: string
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          receipt_image_url?: string | null
          transaction_date?: string
          transaction_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          card_id?: string | null
          category?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          receipt_image_url?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          progress: number | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          progress?: number | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          preference_key: string
          preference_value: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preference_key: string
          preference_value?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preference_key?: string
          preference_value?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_adaptive_ttl: {
        Args: {
          p_base_ttl_hours?: number
          p_cache_type: string
          p_user_id: string
        }
        Returns: number
      }
      cleanup_expired_ai_cache: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_family_invite: {
        Args: { _email: string; _family_id: string }
        Returns: boolean
      }
      is_family_member: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_owner: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      trigger_onboarding_emails: { Args: never; Returns: undefined }
      trigger_onboarding_emails_v2: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
