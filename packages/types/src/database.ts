/**
 * Supabase Database types — generated from schema + migrations
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      merchants: {
        Row: {
          id: string;
          shop_domain: string;
          platform: 'shopify' | 'widget';
          plan: string;
          brand_name: string | null;
          brand_slug: string | null;
          stripe_customer_id: string | null;
          owner_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_domain: string;
          platform: 'shopify' | 'widget';
          plan?: string;
          brand_name?: string | null;
          brand_slug?: string | null;
          stripe_customer_id?: string | null;
          owner_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_domain?: string;
          platform?: 'shopify' | 'widget';
          plan?: string;
          brand_name?: string | null;
          brand_slug?: string | null;
          stripe_customer_id?: string | null;
          owner_user_id?: string | null;
          created_at?: string;
        };
        Relationships: any[];
      };
      merchant_installations: {
        Row: {
          id: string;
          merchant_id: string | null;
          platform_access_token_encrypted: string | null;
          scopes: string[] | null;
          installed_at: string;
          uninstalled_at: string | null;
        };
        Insert: {
          id?: string;
          merchant_id?: string | null;
          platform_access_token_encrypted?: string | null;
          scopes?: string[] | null;
          installed_at?: string;
          uninstalled_at?: string | null;
        };
        Update: {
          id?: string;
          merchant_id?: string | null;
          platform_access_token_encrypted?: string | null;
          scopes?: string[] | null;
          installed_at?: string;
          uninstalled_at?: string | null;
        };
        Relationships: any[];
      };
      products: {
        Row: {
          id: string;
          merchant_id: string | null;
          platform_product_id: string;
          title: string;
          handle: string | null;
          primary_image_url: string | null;
          image_quality_status: 'ok' | 'warning' | 'blocked';
          category: string;
          buy_url: string | null;
          marketplace_visible: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id?: string | null;
          platform_product_id: string;
          title: string;
          handle?: string | null;
          primary_image_url?: string | null;
          image_quality_status?: 'ok' | 'warning' | 'blocked';
          category?: string;
          buy_url?: string | null;
          marketplace_visible?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string | null;
          platform_product_id?: string;
          title?: string;
          handle?: string | null;
          primary_image_url?: string | null;
          image_quality_status?: 'ok' | 'warning' | 'blocked';
          category?: string;
          buy_url?: string | null;
          marketplace_visible?: boolean;
          created_at?: string;
        };
        Relationships: any[];
      };
      variants: {
        Row: {
          id: string;
          product_id: string | null;
          platform_variant_id: string;
          price: number | null;
          currency: string | null;
          image_url: string | null;
          buy_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          platform_variant_id: string;
          price?: number | null;
          currency?: string | null;
          image_url?: string | null;
          buy_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string | null;
          platform_variant_id?: string;
          price?: number | null;
          currency?: string | null;
          image_url?: string | null;
          buy_url?: string | null;
          created_at?: string;
        };
        Relationships: any[];
      };
      user_profiles: {
        Row: {
          user_id: string;
          face_image_path: string | null;
          body_params: Json | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          face_image_path?: string | null;
          body_params?: Json | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          face_image_path?: string | null;
          body_params?: Json | null;
          updated_at?: string;
        };
        Relationships: any[];
      };
      dressing_rooms: {
        Row: {
          id: string;
          user_id: string | null;
          merchant_id: string | null;
          status: 'active' | 'archived';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          merchant_id?: string | null;
          status?: 'active' | 'archived';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          merchant_id?: string | null;
          status?: 'active' | 'archived';
          created_at?: string;
        };
        Relationships: any[];
      };
      dressing_room_items: {
        Row: {
          id: string;
          dressing_room_id: string | null;
          product_id: string | null;
          variant_id: string | null;
          selected: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          dressing_room_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          selected?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          dressing_room_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          selected?: boolean;
          created_at?: string;
        };
        Relationships: any[];
      };
      generations: {
        Row: {
          id: string;
          user_id: string | null;
          merchant_id: string | null;
          product_id: string | null;
          variant_id: string | null;
          mode: 'single' | 'outfit';
          input_user_image_path: string | null;
          input_product_image_url: string | null;
          result_image_path: string | null;
          status: 'queued' | 'processing' | 'succeeded' | 'failed';
          error_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          merchant_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          mode: 'single' | 'outfit';
          input_user_image_path?: string | null;
          input_product_image_url?: string | null;
          result_image_path?: string | null;
          status?: 'queued' | 'processing' | 'succeeded' | 'failed';
          error_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          merchant_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          mode?: 'single' | 'outfit';
          input_user_image_path?: string | null;
          input_product_image_url?: string | null;
          result_image_path?: string | null;
          status?: 'queued' | 'processing' | 'succeeded' | 'failed';
          error_code?: string | null;
          created_at?: string;
        };
        Relationships: any[];
      };
      saved_items: {
        Row: {
          id: string;
          user_id: string | null;
          merchant_id: string | null;
          product_id: string | null;
          variant_id: string | null;
          saved_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          merchant_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          saved_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          merchant_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          saved_at?: string;
        };
        Relationships: any[];
      };
      saved_outfits: {
        Row: {
          id: string;
          user_id: string | null;
          generation_id: string | null;
          saved_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          generation_id?: string | null;
          saved_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          generation_id?: string | null;
          saved_at?: string;
        };
        Relationships: any[];
      };
      entitlements: {
        Row: {
          id: string;
          subject_type: 'user' | 'merchant';
          subject_id: string;
          plan: string;
          daily_generation_limit: number;
          unlimited: boolean;
          renews_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_type: 'user' | 'merchant';
          subject_id: string;
          plan: string;
          daily_generation_limit?: number;
          unlimited?: boolean;
          renews_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_type?: 'user' | 'merchant';
          subject_id?: string;
          plan?: string;
          daily_generation_limit?: number;
          unlimited?: boolean;
          renews_at?: string | null;
          created_at?: string;
        };
        Relationships: any[];
      };
      usage_counters: {
        Row: {
          id: string;
          subject_type: 'user' | 'merchant';
          subject_id: string;
          date: string;
          generations_used: number;
        };
        Insert: {
          id?: string;
          subject_type: 'user' | 'merchant';
          subject_id: string;
          date?: string;
          generations_used?: number;
        };
        Update: {
          id?: string;
          subject_type?: 'user' | 'merchant';
          subject_id?: string;
          date?: string;
          generations_used?: number;
        };
        Relationships: any[];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// Convenience type aliases
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
