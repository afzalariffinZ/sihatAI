import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  weight?: number;
  height?: number;
  activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  primary_goal?: 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'build_muscle';
  goal_calories?: number;
  goal_protein?: number;
  goal_carbs?: number;
  goal_fat?: number;
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  datetime: string;
  food_item: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  image_url?: string;
  confidence_score?: number;
  gemini_raw_response?: any;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Weight {
  id: string;
  user_id: string;
  date: string;
  weight: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface DailySummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  meal_count: number;
  weight?: number;
}

export interface Food {
  id: string;
  name: string;
  brand?: string;
  serving_size: string;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  fiber_per_serving?: number;
  sugar_per_serving?: number;
  sodium_per_serving?: number;
  barcode?: string;
  verified: boolean;
  created_at: string;
  updated_at?: string;
}