# SihatAI - AI-Powered Nutrition Tracking App

A comprehensive health and nutrition tracking app built with React Native (Expo), Node.js backend, Google Gemini AI, and Supabase database.

## � Features

- **📸 Smart Food Recognition**: Take photos of meals and get AI-powered nutrition analysis
- **📊 Progress Dashboard**: Track calories, macros, weight, and nutrition trends
- **🍽️ Meal Logging**: Comprehensive meal tracking with detailed nutrition breakdown  
- **🔐 User Authentication**: Secure login/signup with Supabase Auth
- **☁️ Cloud Sync**: All data synced across devices via Supabase
- **📈 Analytics**: Visual charts and trends for nutrition and weight tracking

## 🏗️ Architecture

**6-Layer System:**
1. **React Native + Expo** - Cross-platform mobile client
2. **Node.js + Express** - RESTful API backend
3. **Google Gemini AI** - Multimodal food image analysis
4. **Supabase PostgreSQL** - Database with Row Level Security
5. **Supabase Storage** - Image storage for meal photos
6. **Analytics Layer** - Progress tracking and insights

**Data Flow:**
```
📱 User takes food photo → 🔄 Backend processes image → 🤖 Gemini AI analyzes → 
💾 Supabase stores data → 📊 React Native displays dashboard
```

## 🛠️ Tech Stack

### Frontend (React Native)
- **Expo SDK** ~54.0.10
- **React Native** 0.81.4
- **TypeScript** for type safety
- **Expo Camera** for food photo capture
- **React Native Chart Kit** for analytics visualization
- **Supabase JS** for backend integration

### Backend (Node.js)
- **Express.js** web framework
- **Google Generative AI** SDK for Gemini integration
- **Sharp** for image processing
- **Multer** for file uploads
- **Helmet** for security headers
- **CORS** for cross-origin requests

### Database & Storage
- **Supabase PostgreSQL** with Row Level Security
- **Supabase Storage** for meal images
- **Supabase Auth** for user authentication

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Expo CLI: `npm install -g @expo/cli`
- Supabase account
- Google AI API key

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd SihatAI
```

### 2. Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

### 3. Database Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema in `database/schema.sql` via Supabase SQL Editor
3. Note your Project URL and API keys

### 4. Environment Configuration

**Frontend (.env.local):**
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Backend (.env):**
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_AI_API_KEY=your-gemini-api-key
PORT=3000
```

### 5. Google AI Setup
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Get your Gemini API key
3. Add to backend .env file

## 🏃‍♂️ Running the App

### Development Mode

**Start Backend Server:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:3000
```

**Start React Native App:**
```bash
npx expo start
# Use Expo Go app or simulator to view
```

### Production Deployment

See `DEPLOYMENT.md` for detailed deployment instructions for:
- Railway (recommended)
- Vercel
- Fly.io  
- Heroku

## 📱 App Structure

```
app/
├── (tabs)/
│   ├── index.tsx          # Dashboard screen
│   ├── explore.tsx        # Meal logging screen  
│   └── _layout.tsx        # Tab navigation
├── _layout.tsx            # Root layout with auth
└── modal.tsx              # Camera modal

components/
├── auth-screen.tsx        # Login/signup UI
├── food-camera.tsx        # Camera interface
├── meal-log.tsx           # Meal tracking UI
├── progress-dashboard.tsx # Analytics dashboard
└── ui/                    # Reusable UI components

lib/
├── supabase.ts            # Database client & types
└── api.ts                 # API service layer

backend/src/
├── index.js               # Express server
├── middleware/            # Auth & validation
├── routes/                # API endpoints
│   ├── food-analysis.js   # Gemini AI integration
│   ├── meals.js           # Meal CRUD operations
│   ├── weights.js         # Weight tracking
│   └── summary.js         # Analytics aggregation
└── config/                # Database configuration
```

## 🔧 API Endpoints

**Authentication:**
- All endpoints require valid JWT token in Authorization header

**Food Analysis:**
- `POST /api/food/analyze` - Upload image, get AI nutrition analysis

**Meals:**
- `GET /api/meals` - Get user's meals with pagination
- `PUT /api/meals/:id` - Update meal entry
- `DELETE /api/meals/:id` - Delete meal

**Weight Tracking:**
- `GET /api/weights` - Get weight history
- `POST /api/weights` - Add weight entry
- `PUT /api/weights/:id` - Update weight
- `DELETE /api/weights/:id` - Delete weight entry

**Analytics:**
- `GET /api/summary/daily` - Daily nutrition summary
- `GET /api/summary/trends` - Weekly/monthly trends

## 🎯 Key Features Implemented

### ✅ Smart Food Recognition
- Camera interface with photo capture
- Image upload to Supabase Storage
- Gemini AI multimodal analysis
- Structured nutrition data extraction

### ✅ Comprehensive Meal Tracking
- Daily meal log with nutrition breakdown
- Progress bars for calories and macros
- Image thumbnails for meal entries
- Edit/delete meal functionality

### ✅ Progress Dashboard
- Interactive charts for weight trends
- Calorie and macro distribution
- Weekly/monthly analytics
- Goal tracking and progress indicators

### ✅ User Authentication
- Secure signup/login with Supabase Auth
- Protected routes and screens
- User profile management
- JWT token authentication

### ✅ Data Synchronization
- Real-time data sync across devices
- Offline capability with local storage
- Row Level Security for data privacy
- Automatic conflict resolution

## 🔒 Security Features

- **Row Level Security**: Users can only access their own data
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: All API inputs validated and sanitized
- **HTTPS Enforcement**: SSL/TLS encryption in production
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Restricted cross-origin requests

## 📊 Database Schema

**Tables:**
- `users` - User profiles and goals
- `meals` - Food entries with nutrition data
- `weights` - Weight tracking history
- `foods` - Common food database
- `user_preferences` - App settings

**Key Features:**
- Automatic timestamps
- Data validation constraints
- Optimized indexes
- Foreign key relationships

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section in `DEPLOYMENT.md`
2. Review database setup in `database/README.md`
3. Open an issue on GitHub
4. Check Expo and Supabase documentation

## 🎉 Acknowledgments

- **Expo** for the amazing React Native framework
- **Supabase** for backend-as-a-service platform  
- **Google AI** for powerful Gemini multimodal capabilities
- **React Native Community** for excellent libraries and tools