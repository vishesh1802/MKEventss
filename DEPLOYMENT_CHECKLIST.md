# Deployment Readiness Checklist

## ✅ Build Status
- [x] **Build succeeds** - `npm run build` completes without errors
- [x] **No TypeScript errors** - Code compiles successfully
- [x] **No linting errors** - Code passes linting

## ⚠️ Critical Issues to Fix Before Deployment

### 1. **Security: Password Hashing** 🔴 HIGH PRIORITY
**Issue**: Currently using SHA256 with a default salt, which is insecure.

**Location**: `api/auth/login.ts` and `api/auth/signup.ts`

**Fix Required**:
```typescript
// Current (INSECURE):
const passwordHash = crypto
  .createHash("sha256")
  .update(password + (process.env.PASSWORD_SALT || "default_salt"))
  .digest("hex");

// Should use bcrypt instead:
import bcrypt from 'bcryptjs';
const passwordHash = await bcrypt.hash(password, 10);
```

**Action**: Install `bcryptjs` and update authentication endpoints.

### 2. **Environment Variables** 🟡 MEDIUM PRIORITY
**Required Variables**:
- `POSTGRES_URL` - Vercel Postgres connection string
- `POSTGRES_PRISMA_URL` - (Optional) Prisma connection string
- `POSTGRES_URL_NON_POOLING` - (Optional) Non-pooling connection
- `PASSWORD_SALT` - (CRITICAL) Must be set in production, never use default

**Action**: Ensure all environment variables are set in Vercel dashboard.

### 3. **Database Initialization** 🟡 MEDIUM PRIORITY
**Issue**: Database tables need to be created before first use.

**Action**: 
- Run `npx tsx scripts/init-db.ts` after deployment
- Or add a migration script that runs automatically
- Consider adding a health check endpoint that creates tables if missing

### 4. **API Route Configuration** 🟢 LOW PRIORITY
**Status**: API routes are properly structured for Vercel serverless functions.

**Note**: Vercel will automatically detect and deploy API routes in the `/api` folder.

## 📋 Pre-Deployment Steps

### Step 1: Fix Security Issues
```bash
npm install bcryptjs @types/bcryptjs
```
Then update `api/auth/login.ts` and `api/auth/signup.ts` to use bcrypt.

### Step 2: Set Environment Variables in Vercel
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `POSTGRES_URL` (from Vercel Postgres)
   - `PASSWORD_SALT` (generate a secure random string)
   - `NODE_ENV=production`

### Step 3: Initialize Database
After first deployment:
```bash
# Connect to your Vercel project
vercel env pull

# Run database initialization
npx tsx scripts/init-db.ts

# Upload event data (optional)
npm run upload-data
```

### Step 4: Test Deployment
1. Deploy to Vercel staging/preview
2. Test:
   - [ ] User signup/login works
   - [ ] Profiles can be created
   - [ ] Events load correctly
   - [ ] API endpoints respond
   - [ ] Database queries work

## 🚀 Deployment Steps

### Option 1: Deploy via Vercel CLI
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy
vercel

# Follow prompts to link project
```

### Option 2: Deploy via GitHub Integration
1. Push code to GitHub
2. Connect repository in Vercel Dashboard
3. Configure build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Add environment variables
5. Deploy!

### Option 3: Deploy via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Configure settings (same as Option 2)
5. Deploy!

## 📝 Post-Deployment Checklist

- [ ] Database tables created successfully
- [ ] Environment variables configured
- [ ] User registration works
- [ ] User login works
- [ ] Profile creation works
- [ ] Events load correctly
- [ ] API endpoints respond
- [ ] No console errors in browser
- [ ] Mobile responsiveness works
- [ ] Dark mode works
- [ ] All routes accessible

## 🔒 Security Recommendations

1. **Use HTTPS** - Vercel provides this automatically ✅
2. **Set secure PASSWORD_SALT** - Generate a random 32+ character string
3. **Use bcrypt for passwords** - Replace SHA256 hashing
4. **Rate limiting** - Consider adding rate limits to auth endpoints
5. **CORS configuration** - Ensure CORS is properly configured
6. **Session expiration** - Current 30-day sessions might be too long
7. **Input validation** - Ensure all inputs are validated/sanitized

## 📊 Performance Considerations

- [x] Build output is optimized (490KB JS bundle)
- [x] CSS is minified (69KB)
- [ ] Consider code splitting for large pages
- [ ] Add loading states for better UX
- [ ] Consider caching strategies for API responses

## 🐛 Known Issues

1. **Profile persistence** - Profiles may not persist after logout/login (needs testing)
2. **Password security** - Using SHA256 instead of bcrypt (needs fixing)
3. **Default password salt** - Using "default_salt" if env var not set (security risk)

## ✅ What's Working Well

- ✅ Build process is clean
- ✅ TypeScript compilation successful
- ✅ API routes properly structured
- ✅ Database schema defined
- ✅ Authentication flow implemented
- ✅ Profile management implemented
- ✅ Event filtering and recommendations working

## 🎯 Recommended Next Steps

1. **Fix password hashing** (Critical)
2. **Set production environment variables**
3. **Test full authentication flow**
4. **Initialize database**
5. **Deploy to staging first**
6. **Test thoroughly**
7. **Deploy to production**

---

**Status**: ⚠️ **Almost Ready** - Fix password security before production deployment

