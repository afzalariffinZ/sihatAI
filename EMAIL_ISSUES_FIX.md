# Supabase Email Issues - Quick Fix Guide

## Common Email-Related Issues and Solutions

### 1. Email Confirmation Required (Most Common Issue)

**Problem**: Users sign up but get stuck because Supabase requires email confirmation by default.

**Solution**: Disable email confirmation for development:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Settings** 
3. Find **Email Confirmation** setting
4. **Disable** "Enable email confirmations" (toggle it OFF)
5. Click **Save**

### 2. Database Schema Not Created

**Problem**: User registration fails because the `users` table doesn't exist.

**Solution**: Run the database schema:

1. Go to **SQL Editor** in your Supabase Dashboard
2. Copy and paste the content from `database/schema.sql`
3. Click **Run** to execute

### 3. Row Level Security Issues

**Problem**: Users can't create profiles due to RLS policies.

**Quick Fix**: Temporarily disable RLS for testing:

```sql
-- Run this in SQL Editor to disable RLS temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

**Proper Fix**: Ensure RLS policies are correct (already in schema.sql)

### 4. Email Format Validation

**Problem**: Invalid email formats cause signup failures.

**Solution**: Already fixed - added email validation in `auth-screen.tsx`

### 5. Testing the Auth Flow

**Steps to test**:
1. Start the app with `npx expo start`
2. Try signing up with a valid email
3. If you get email confirmation error, follow step 1 above
4. Try signing in with the same credentials

### 6. Environment Variables

Make sure your `.env.local` has:
```env
EXPO_PUBLIC_SUPABASE_URL=https://zwrxsimzmigouhgnjynp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3cnhzaW16bWlnb3VoZ25qeW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MjI4MzksImV4cCI6MjA3NDM5ODgzOX0.yzlBktYZCv_kgsPlDpXwEIXe5Vljkgs8NNfPoiJ7PxM
```

### 7. Common Error Messages and Solutions

- **"Invalid login credentials"** → Check email/password, try signup first
- **"Email not confirmed"** → Disable email confirmation (step 1)
- **"User already registered"** → Try signing in instead
- **"supabaseUrl is required"** → Check environment variables

## Next Steps

1. **Disable email confirmation** in Supabase Dashboard (most important)
2. **Run database schema** if not done yet
3. **Test the auth flow** in your app
4. **Re-enable email confirmation** in production later

Let me know if you encounter any specific error messages!