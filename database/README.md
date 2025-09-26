# Database Setup Instructions

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your:
   - Project URL: `https://your-project-id.supabase.co`
   - Anon Key: `eyJhbGciOiJIUzI1...`
   - Service Role Key: `eyJhbGciOiJIUzI1...` (for backend)

## 2. Run Database Schema

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `schema.sql`
4. Click **Run** to execute the schema

## 3. Configure Storage

The schema automatically creates a storage bucket called `meal-images`. Verify it exists:

1. Go to **Storage** in Supabase Dashboard
2. You should see `meal-images` bucket
3. If not, create it manually with public access

## 4. Environment Variables

Update your environment files with the actual values:

### Frontend (.env.local)
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
```

### Backend (.env)
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...
GOOGLE_AI_API_KEY=your-gemini-api-key
```

## 5. Test Database Connection

Run this SQL in the SQL Editor to verify everything is working:

```sql
-- Test query
SELECT 
    schemaname, 
    tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

You should see tables: foods, meals, user_preferences, users, weights

## 6. Seed Data (Optional)

```sql
-- Insert some common foods
INSERT INTO public.foods (name, serving_size, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving) VALUES
('Apple', '1 medium (182g)', 95, 0.5, 25, 0.3),
('Banana', '1 medium (118g)', 105, 1.3, 27, 0.4),
('Chicken Breast', '3.5 oz (100g)', 165, 31, 0, 3.6),
('Brown Rice', '1 cup cooked (195g)', 216, 5, 45, 1.8),
('Salmon', '3.5 oz (100g)', 208, 20, 0, 13),
('Broccoli', '1 cup chopped (91g)', 25, 3, 5, 0.3);
```

## Database Structure

### Tables Created:
- **users**: Extended user profiles with goals and preferences
- **meals**: Food entries with nutrition data and AI analysis
- **weights**: Daily weight tracking
- **foods**: Common food database for quick entry
- **user_preferences**: App settings and notifications

### Key Features:
- Row Level Security (RLS) enabled on all tables
- Automatic timestamp updates
- Data validation with CHECK constraints
- Proper foreign key relationships
- Optimized indexes for performance
- Storage bucket for meal images

### Security:
- Users can only access their own data
- Meal images are organized by user ID
- Service role key required for backend operations
- Public read access to foods database

## Troubleshooting

1. **RLS Issues**: Make sure auth.uid() returns the correct user ID
2. **Storage Issues**: Verify bucket permissions and public access
3. **Migration Errors**: Run schema sections individually if needed
4. **Performance**: Indexes are created for common queries

## Next Steps

1. Run the schema in Supabase
2. Update environment variables
3. Test the app with actual data
4. Deploy the backend server
5. Test the complete flow: Camera → AI → Database → Dashboard