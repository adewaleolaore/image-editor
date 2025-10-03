import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types (we'll expand this as we build)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          token_balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          token_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          token_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      videos: {
        Row: {
          id: string;
          user_id: string;
          youtube_url: string;
          video_id: string;
          title: string;
          description: string | null;
          transcript: string | null;
          duration: number | null;
          thumbnail_url: string | null;
          summary: string | null;
          generated_description: string | null;
          keywords: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          youtube_url: string;
          video_id: string;
          title: string;
          description?: string | null;
          transcript?: string | null;
          duration?: number | null;
          thumbnail_url?: string | null;
          summary?: string | null;
          generated_description?: string | null;
          keywords?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          youtube_url?: string;
          video_id?: string;
          title?: string;
          description?: string | null;
          transcript?: string | null;
          duration?: number | null;
          thumbnail_url?: string | null;
          summary?: string | null;
          generated_description?: string | null;
          keywords?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      clips: {
        Row: {
          id: string;
          video_id: string;
          title: string;
          start_time: number;
          end_time: number;
          transcript_excerpt: string;
          hook_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          title: string;
          start_time: number;
          end_time: number;
          transcript_excerpt: string;
          hook_score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          title?: string;
          start_time?: number;
          end_time?: number;
          transcript_excerpt?: string;
          hook_score?: number;
          created_at?: string;
        };
      };
      thumbnails: {
        Row: {
          id: string;
          video_id: string;
          user_id: string;
          image_url: string;
          prompt: string;
          edit_type: string;
          template_dimensions: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id?: string | null;
          user_id: string;
          image_url: string;
          prompt: string;
          edit_type: string;
          template_dimensions?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          user_id?: string;
          image_url?: string;
          prompt?: string;
          edit_type?: string;
          template_dimensions?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
    };
  };
}