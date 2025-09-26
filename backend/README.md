# SihatAI Backend API Server

This is the Node.js + Express backend server for the SihatAI nutrition tracking app.

## Features

- RESTful API endpoints
- Google Gemini AI integration for food analysis
- Supabase authentication and database integration
- Image upload and storage
- Nutrition data processing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Fill in your API keys and configuration
```

3. Run the server:
```bash
npm start
```

## API Endpoints

### Food Analysis
- `POST /api/analyze-food` - Analyze food image with Gemini AI

### Meals
- `GET /api/meals` - Get user's meals
- `GET /api/summary` - Get daily nutrition summary

### Weights
- `POST /api/weight` - Add weight entry
- `GET /api/weights` - Get weight history

## Environment Variables

- `GOOGLE_AI_API_KEY` - Google AI (Gemini) API key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `PORT` - Server port (default: 3001)