# SihatAI Backend Deployment Guide

## Overview
This guide covers deploying the Node.js/Express backend to various cloud platforms.

## Prerequisites
- Supabase project set up with database schema
- Google AI API key for Gemini
- Git repository (for some deployment methods)

## Option 1: Railway (Recommended)

Railway offers simple deployment with automatic builds.

### Steps:
1. **Sign up**: Go to [railway.app](https://railway.app)
2. **Connect GitHub**: Link your repository
3. **Deploy**: Select your repository and backend folder
4. **Environment Variables**: Add in Railway dashboard:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   GOOGLE_AI_API_KEY=your-gemini-api-key
   PORT=3000
   NODE_ENV=production
   ```
5. **Custom Start Command**: Set to `npm start` or `node src/index.js`
6. **Domain**: Railway provides a domain like `your-app.railway.app`

### Railway Configuration File:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

## Option 2: Vercel

Great for Node.js APIs with serverless functions.

### Steps:
1. Install Vercel CLI: `npm i -g vercel`
2. In backend folder: `vercel`
3. Configure `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.js"
    }
  ],
  "env": {
    "SUPABASE_URL": "@supabase-url",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key",
    "GOOGLE_AI_API_KEY": "@google-ai-key"
  }
}
```

4. Add environment variables: `vercel env add`

## Option 3: Fly.io

Container-based deployment with good performance.

### Steps:
1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Create `Dockerfile` in backend folder:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 3000

CMD ["node", "src/index.js"]
```

3. Create `fly.toml`:

```toml
app = "sihatai-backend"
primary_region = "dfw"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[[services]]
  http_checks = []
  internal_port = 3000
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [services.concurrency]
    hard_limit = 25
    soft_limit = 20
    type = "connections"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"
```

4. Deploy: `fly deploy`
5. Set secrets: `fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... GOOGLE_AI_API_KEY=...`

## Option 4: Heroku

Traditional platform-as-a-service option.

### Steps:
1. Install Heroku CLI
2. Create `Procfile` in backend folder:
   ```
   web: node src/index.js
   ```
3. Deploy:
   ```bash
   heroku create sihatai-backend
   heroku config:set SUPABASE_URL=your-url
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-key
   heroku config:set GOOGLE_AI_API_KEY=your-key
   git push heroku main
   ```

## Environment Variables Checklist

Make sure these are set in your deployment platform:

- ✅ `SUPABASE_URL`: Your Supabase project URL
- ✅ `SUPABASE_SERVICE_ROLE_KEY`: Service role key (not anon key)
- ✅ `GOOGLE_AI_API_KEY`: Google AI/Gemini API key
- ✅ `PORT`: Port number (usually auto-set by platform)
- ✅ `NODE_ENV`: Set to "production"

## Post-Deployment

1. **Test Health Check**: Visit `https://your-domain.com/health`
2. **Test API**: Try uploading an image via the `/api/food/analyze` endpoint
3. **Update Frontend**: Update `API_BASE_URL` in React Native app
4. **Monitor Logs**: Check platform logs for any errors
5. **Set up Monitoring**: Consider adding error tracking (Sentry, LogRocket)

## Frontend Configuration

Update your React Native app's API base URL:

```typescript
// lib/api.ts
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000' 
  : 'https://your-deployed-backend.com';
```

## Production Optimizations

### 1. Add API Rate Limiting
```bash
npm install express-rate-limit
```

```javascript
// In src/index.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 2. Add Request Logging
```bash
npm install morgan
```

```javascript
const morgan = require('morgan');
app.use(morgan('combined'));
```

### 3. Add Health Monitoring
```javascript
// Add to src/index.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## Troubleshooting

**Common Issues:**

1. **CORS Errors**: Ensure frontend domain is in CORS origin list
2. **Image Upload Fails**: Check Supabase storage permissions
3. **Gemini API Errors**: Verify API key and quota
4. **Database Connection**: Confirm Supabase service role key
5. **Memory Issues**: Monitor usage, consider upgrading plan

**Debug Steps:**
1. Check deployment logs
2. Test API endpoints individually
3. Verify environment variables
4. Check database connectivity
5. Monitor error rates and performance

## Security Checklist

- ✅ Use HTTPS in production
- ✅ Validate all input data
- ✅ Rate limit API endpoints
- ✅ Use service role key (not anon key) for backend
- ✅ Enable CORS only for your frontend domain
- ✅ Add request logging for monitoring
- ✅ Keep dependencies updated
- ✅ Use environment variables for secrets