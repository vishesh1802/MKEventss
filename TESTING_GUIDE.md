# Testing Guide for Login System

## Prerequisites

1. Make sure you have your database connection configured in `.env` or `.env.local`
2. Ensure you have Node.js and npm installed

## Step 1: Initialize Database Tables

First, create the necessary database tables (including the new `user_profiles` and `user_sessions` tables):

```bash
npx tsx scripts/init-db.ts
```

This will create:
- `users` table (for authentication)
- `user_profiles` table (for storing user profiles)
- `user_sessions` table (for session management)
- `events` table (if not exists)
- `user_history` table (if not exists)

## Step 2: Start the Development Server

```bash
npm run dev
```

The app should start at `http://localhost:5173` (or the port shown in terminal)

## Step 3: Test the Login Flow

### Test 1: Sign Up (Create New Account)

1. Navigate to `http://localhost:5173/login`
2. Click on the **"Sign Up"** tab
3. Fill in the form:
   - **Name**: Test User
   - **Email**: test@example.com
   - **Password**: password123 (must be at least 6 characters)
4. Click **"Sign Up"**
5. ✅ You should see a success toast and be redirected to `/profile`
6. ✅ Check the Navbar - it should show your name instead of "Login"

### Test 2: Logout

1. Click on your name in the Navbar
2. Click **"Logout"**
3. ✅ You should be logged out and see "Login" button again
4. ✅ You should be redirected to the home page

### Test 3: Login (Existing Account)

1. Navigate to `/login` again
2. Click on the **"Login"** tab
3. Enter credentials:
   - **Email**: test@example.com
   - **Password**: password123
4. Click **"Login"**
5. ✅ You should be logged in successfully

### Test 4: Profile Management (Authenticated)

1. While logged in, go to `/profile`
2. Create a new profile:
   - Click **"Create New Profile"**
   - Enter name: "Food Lover"
   - Select region: "Third Ward"
   - Select genres: "Food & Drink", "Music"
   - Click **"Create"**
3. ✅ Profile should be created and saved to the database
4. ✅ Check the Navbar dropdown - you should see profile switching options

### Test 5: Profile Switching

1. Create another profile (e.g., "Sports Fan" with "Sports" genre)
2. Click on your name in the Navbar
3. In the dropdown, you should see both profiles listed
4. Click on a different profile
5. ✅ The active profile should change (marked with "Active" badge)
6. ✅ Go to `/recommendations` - filters should reflect the new profile

### Test 6: Profile Persistence

1. Logout
2. Login again with the same account
3. Go to `/profile`
4. ✅ Your profiles should still be there (loaded from database)
5. ✅ The active profile should be restored

### Test 7: Guest Mode (No Login)

1. Logout (or clear localStorage)
2. Navigate to `/profile`
3. ✅ You should still be able to create profiles (stored in localStorage)
4. ✅ Profiles work the same way, but are not synced to backend

## Step 4: Verify Database

You can verify that data is being saved correctly:

### Check Users Table
```sql
SELECT id, email, name FROM users;
```

### Check User Profiles
```sql
SELECT * FROM user_profiles;
```

### Check Sessions
```sql
SELECT * FROM user_sessions;
```

## Step 5: Test API Endpoints Directly

### Test Login API
```bash
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Signup API
```bash
curl -X POST http://localhost:5173/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"password123","name":"New User"}'
```

### Test Get Profiles (requires auth token)
```bash
# First login to get token, then:
curl http://localhost:5173/api/profiles \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Common Issues

### Issue: "Cannot connect to database"
- **Solution**: Check your `.env` file has correct `POSTGRES_URL` or database connection string

### Issue: "Table does not exist"
- **Solution**: Run `npx tsx scripts/init-db.ts` to create tables

### Issue: "Unauthorized" errors
- **Solution**: Make sure you're logged in and the session token is valid

### Issue: Profiles not syncing
- **Solution**: Check browser console for errors, verify API endpoints are working

## Testing Checklist

- [ ] Can create new account (signup)
- [ ] Can login with existing account
- [ ] Can logout
- [ ] Can create profiles when authenticated
- [ ] Can switch between profiles
- [ ] Profiles persist after logout/login
- [ ] Guest mode still works (localStorage)
- [ ] Navbar shows correct user info
- [ ] Profile filters work in Recommendations page

