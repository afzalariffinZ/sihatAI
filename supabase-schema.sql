-- Health Tracking Database Schema for SihatAI
-- This file contains the SQL commands to create the necessary tables for the health tracking features

-- User Profiles table (stores height, target weight, step goals)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    height_inches DECIMAL(5,2), -- Height in inches
    target_weight_kg DECIMAL(5,2), -- Target weight in kg
    daily_steps_goal INTEGER DEFAULT 10000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weight Entries table (stores weight measurements)
CREATE TABLE IF NOT EXISTS weight_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    weight DECIMAL(5,2) NOT NULL, -- Weight in kg
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity Entries table (stores exercise activities)
CREATE TABLE IF NOT EXISTS activity_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_name VARCHAR(255) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    calories_burned INTEGER,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step Data table (stores daily step counts from device)
CREATE TABLE IF NOT EXISTS step_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    steps INTEGER NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date) -- One entry per user per day
);

-- Food Entries table (enhanced from existing to include calories)
CREATE TABLE IF NOT EXISTS food_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    food_name VARCHAR(255) NOT NULL,
    calories INTEGER,
    protein DECIMAL(8,2),
    carbs DECIMAL(8,2),
    fat DECIMAL(8,2),
    fiber DECIMAL(8,2),
    sugar DECIMAL(8,2),
    sodium DECIMAL(8,2),
    serving_size VARCHAR(100),
    meal_type VARCHAR(50), -- breakfast, lunch, dinner, snack
    image_url TEXT,
    ai_analysis JSONB, -- Store full AI analysis response
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Summaries table (aggregated daily health data)
CREATE TABLE IF NOT EXISTS daily_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_calories_consumed INTEGER DEFAULT 0,
    total_calories_burned INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 0,
    weight_kg DECIMAL(5,2), -- Weight recorded on this date (if any)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date) -- One summary per user per day
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entries_user_date ON activity_entries(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_step_data_user_date ON step_data(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_date ON daily_summaries(user_id, date DESC);

-- Create Row Level Security (RLS) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON user_profiles FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for weight_entries
CREATE POLICY "Users can view own weight entries" ON weight_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weight entries" ON weight_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weight entries" ON weight_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weight entries" ON weight_entries FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for activity_entries
CREATE POLICY "Users can view own activity entries" ON activity_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity entries" ON activity_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activity entries" ON activity_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own activity entries" ON activity_entries FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for step_data
CREATE POLICY "Users can view own step data" ON step_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own step data" ON step_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own step data" ON step_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own step data" ON step_data FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for food_entries
CREATE POLICY "Users can view own food entries" ON food_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own food entries" ON food_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own food entries" ON food_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own food entries" ON food_entries FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for daily_summaries
CREATE POLICY "Users can view own daily summaries" ON daily_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily summaries" ON daily_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily summaries" ON daily_summaries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily summaries" ON daily_summaries FOR DELETE USING (auth.uid() = user_id);

-- Create functions to automatically update daily summaries
CREATE OR REPLACE FUNCTION update_daily_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update daily summary when food or activity is added/updated
    INSERT INTO daily_summaries (user_id, date, total_calories_consumed, total_calories_burned, updated_at)
    VALUES (
        NEW.user_id,
        CURRENT_DATE,
        COALESCE((
            SELECT SUM(calories) 
            FROM food_entries 
            WHERE user_id = NEW.user_id 
            AND DATE(recorded_at) = CURRENT_DATE
        ), 0),
        COALESCE((
            SELECT SUM(calories_burned) 
            FROM activity_entries 
            WHERE user_id = NEW.user_id 
            AND DATE(recorded_at) = CURRENT_DATE
        ), 0),
        NOW()
    )
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        total_calories_consumed = COALESCE((
            SELECT SUM(calories) 
            FROM food_entries 
            WHERE user_id = EXCLUDED.user_id 
            AND DATE(recorded_at) = EXCLUDED.date
        ), 0),
        total_calories_burned = COALESCE((
            SELECT SUM(calories_burned) 
            FROM activity_entries 
            WHERE user_id = EXCLUDED.user_id 
            AND DATE(recorded_at) = EXCLUDED.date
        ), 0),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update daily summaries
CREATE TRIGGER food_entry_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON food_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_summary();

CREATE TRIGGER activity_entry_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON activity_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_summary();

-- Create function to get user's health dashboard data
CREATE OR REPLACE FUNCTION get_health_dashboard(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'date', target_date,
        'summary', (
            SELECT json_build_object(
                'calories_consumed', COALESCE(total_calories_consumed, 0),
                'calories_burned', COALESCE(total_calories_burned, 0),
                'steps', COALESCE(total_steps, 0),
                'weight', weight_kg
            )
            FROM daily_summaries
            WHERE user_id = user_uuid AND date = target_date
        ),
        'latest_weight', (
            SELECT json_build_object(
                'weight', weight,
                'recorded_at', recorded_at
            )
            FROM weight_entries
            WHERE user_id = user_uuid
            ORDER BY recorded_at DESC
            LIMIT 1
        ),
        'recent_activities', (
            SELECT json_agg(
                json_build_object(
                    'activity', activity_name,
                    'duration', duration_minutes,
                    'calories_burned', calories_burned,
                    'recorded_at', recorded_at
                )
            )
            FROM activity_entries
            WHERE user_id = user_uuid
            AND DATE(recorded_at) = target_date
            ORDER BY recorded_at DESC
        ),
        'recent_meals', (
            SELECT json_agg(
                json_build_object(
                    'food_name', food_name,
                    'calories', calories,
                    'meal_type', meal_type,
                    'recorded_at', recorded_at
                )
            )
            FROM food_entries
            WHERE user_id = user_uuid
            AND DATE(recorded_at) = target_date
            ORDER BY recorded_at DESC
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for demo purposes (optional - remove in production)
-- Note: This assumes a demo user exists with specific UUID
-- INSERT INTO user_profiles (user_id, height_inches, target_weight_kg, daily_steps_goal)
-- VALUES ('00000000-0000-0000-0000-000000000000', 70, 60, 10000)
-- ON CONFLICT (user_id) DO NOTHING;