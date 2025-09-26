-- SihatAI Database Schema - COMPLETE SAFE UPDATE VERSION
-- Run this SQL in your Supabase SQL Editor
-- This version creates ALL necessary tables and handles existing objects safely

-- Create custom types if they don't exist
DO $$ BEGIN
    CREATE TYPE user_activity_level AS ENUM ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_goal AS ENUM ('lose_weight', 'maintain_weight', 'gain_weight', 'build_muscle');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table if it doesn't exist (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    weight DECIMAL(5,2), -- in pounds
    height DECIMAL(5,2), -- in inches
    activity_level user_activity_level DEFAULT 'moderately_active',
    primary_goal user_goal DEFAULT 'maintain_weight',
    goal_calories INTEGER DEFAULT 2000 CHECK (goal_calories > 0),
    goal_protein INTEGER DEFAULT 150 CHECK (goal_protein > 0),
    goal_carbs INTEGER DEFAULT 250 CHECK (goal_carbs > 0),
    goal_fat INTEGER DEFAULT 67 CHECK (goal_fat > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create meals table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.meals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    datetime TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    food_item TEXT NOT NULL,
    portion TEXT NOT NULL,
    calories INTEGER NOT NULL CHECK (calories >= 0),
    protein_g DECIMAL(6,2) NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
    carbs_g DECIMAL(6,2) NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
    fat_g DECIMAL(6,2) NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
    fiber_g DECIMAL(6,2) DEFAULT 0 CHECK (fiber_g >= 0),
    sugar_g DECIMAL(6,2) DEFAULT 0 CHECK (sugar_g >= 0),
    sodium_mg DECIMAL(8,2) DEFAULT 0 CHECK (sodium_mg >= 0),
    image_url TEXT,
    confidence_score DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    gemini_raw_response JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create weights table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.weights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    weight DECIMAL(5,2) NOT NULL CHECK (weight > 0), -- in pounds
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, date)
);

-- Create step_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.step_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    steps INTEGER NOT NULL DEFAULT 0 CHECK (steps >= 0),
    distance_miles DECIMAL(6,2) DEFAULT 0 CHECK (distance_miles >= 0),
    calories_burned INTEGER DEFAULT 0 CHECK (calories_burned >= 0),
    active_minutes INTEGER DEFAULT 0 CHECK (active_minutes >= 0),
    source TEXT DEFAULT 'device' CHECK (source IN ('device', 'manual', 'health_app', 'external')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, date)
);

-- Create activity_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.activity_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    activity_type TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    intensity TEXT DEFAULT 'moderate' CHECK (intensity IN ('low', 'moderate', 'high', 'extreme')),
    calories_burned INTEGER DEFAULT 0 CHECK (calories_burned >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create foods table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.foods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    serving_size TEXT NOT NULL,
    calories_per_serving INTEGER NOT NULL CHECK (calories_per_serving >= 0),
    protein_per_serving DECIMAL(6,2) NOT NULL DEFAULT 0 CHECK (protein_per_serving >= 0),
    carbs_per_serving DECIMAL(6,2) NOT NULL DEFAULT 0 CHECK (carbs_per_serving >= 0),
    fat_per_serving DECIMAL(6,2) NOT NULL DEFAULT 0 CHECK (fat_per_serving >= 0),
    fiber_per_serving DECIMAL(6,2) DEFAULT 0 CHECK (fiber_per_serving >= 0),
    sugar_per_serving DECIMAL(6,2) DEFAULT 0 CHECK (sugar_per_serving >= 0),
    sodium_per_serving DECIMAL(8,2) DEFAULT 0 CHECK (sodium_per_serving >= 0),
    barcode TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    reminder_times JSONB DEFAULT '["08:00", "12:00", "18:00"]'::jsonb,
    preferred_units TEXT DEFAULT 'imperial' CHECK (preferred_units IN ('imperial', 'metric')),
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    privacy_level TEXT DEFAULT 'private' CHECK (privacy_level IN ('public', 'friends', 'private')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id)
);

-- Create weight_entries view if it doesn't exist (compatibility)
CREATE OR REPLACE VIEW public.weight_entries AS SELECT * FROM public.weights;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON public.meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_datetime ON public.meals(datetime);
CREATE INDEX IF NOT EXISTS idx_meals_user_datetime ON public.meals(user_id, datetime);
CREATE INDEX IF NOT EXISTS idx_weights_user_id ON public.weights(user_id);
CREATE INDEX IF NOT EXISTS idx_weights_date ON public.weights(date);
CREATE INDEX IF NOT EXISTS idx_weights_user_date ON public.weights(user_id, date);
CREATE INDEX IF NOT EXISTS idx_step_data_user_id ON public.step_data(user_id);
CREATE INDEX IF NOT EXISTS idx_step_data_date ON public.step_data(date);
CREATE INDEX IF NOT EXISTS idx_step_data_user_date ON public.step_data(user_id, date);
CREATE INDEX IF NOT EXISTS idx_activity_entries_user_id ON public.activity_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_entries_date ON public.activity_entries(date);
CREATE INDEX IF NOT EXISTS idx_activity_entries_user_date ON public.activity_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_foods_name ON public.foods(name);
CREATE INDEX IF NOT EXISTS idx_foods_barcode ON public.foods(barcode) WHERE barcode IS NOT NULL;

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for users table
DO $$ BEGIN
    CREATE POLICY "Users can view own profile" ON public.users
        FOR SELECT USING (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own profile" ON public.users
        FOR UPDATE USING (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own profile" ON public.users
        FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create RLS Policies for meals table
DO $$ BEGIN
    CREATE POLICY "Users can view own meals" ON public.meals
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own meals" ON public.meals
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own meals" ON public.meals
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own meals" ON public.meals
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create RLS Policies for weights table
DO $$ BEGIN
    CREATE POLICY "Users can view own weights" ON public.weights
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own weights" ON public.weights
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own weights" ON public.weights
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own weights" ON public.weights
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create RLS Policies for step_data table
DO $$ BEGIN
    CREATE POLICY "Users can view own step data" ON public.step_data
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own step data" ON public.step_data
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own step data" ON public.step_data
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own step data" ON public.step_data
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create RLS Policies for activity_entries table
DO $$ BEGIN
    CREATE POLICY "Users can view own activities" ON public.activity_entries
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own activities" ON public.activity_entries
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own activities" ON public.activity_entries
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own activities" ON public.activity_entries
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create RLS Policies for foods table (public read, admin write)
DO $$ BEGIN
    CREATE POLICY "Anyone can view foods" ON public.foods
        FOR SELECT USING (TRUE);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create RLS Policies for user_preferences table
DO $$ BEGIN
    CREATE POLICY "Users can view own preferences" ON public.user_preferences
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own preferences" ON public.user_preferences
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own preferences" ON public.user_preferences
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create or replace function for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at if they don't exist
DO $$ BEGIN
    CREATE TRIGGER set_updated_at_users
        BEFORE UPDATE ON public.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER set_updated_at_meals
        BEFORE UPDATE ON public.meals
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER set_updated_at_weights
        BEFORE UPDATE ON public.weights
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER set_updated_at_step_data
        BEFORE UPDATE ON public.step_data
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER set_updated_at_activity_entries
        BEFORE UPDATE ON public.activity_entries
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER set_updated_at_foods
        BEFORE UPDATE ON public.foods
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER set_updated_at_user_preferences
        BEFORE UPDATE ON public.user_preferences
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create storage bucket for meal images (safe version)
DO $$ BEGIN
    INSERT INTO storage.buckets (id, name, public) VALUES ('meal-images', 'meal-images', true);
EXCEPTION
    WHEN unique_violation THEN null;
END $$;

-- Note: Storage policies need to be created manually in Supabase Dashboard
-- Go to Storage > Policies and create these policies manually:
-- 1. "Users can upload meal images" - INSERT policy for bucket 'meal-images'
-- 2. "Users can view meal images" - SELECT policy for bucket 'meal-images' 
-- 3. "Users can update own meal images" - UPDATE policy for bucket 'meal-images'
-- 4. "Users can delete own meal images" - DELETE policy for bucket 'meal-images'

-- Success message
SELECT 'SihatAI database schema updated successfully! Missing tables and policies have been added. Please set up storage policies manually in Supabase Dashboard.' AS status;