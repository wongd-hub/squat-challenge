# 🏋️‍♂️ Squat Challenge App

A beautiful, production-ready web application for tracking daily squat progress through a 23-day challenge. Built with Next.js, TypeScript, and Supabase, featuring an intuitive dial interface, real-time progress tracking, and competitive leaderboards with social features.

## ✨ Key Features

### 🎯 Core Features
- **Interactive Squat Dial**: Intuitive drag-to-count interface with visual feedback
- **23-Day Challenge**: Structured program with varying daily targets and rest days
- **Progress Tracking**: Comprehensive charts showing daily, weekly, and overall progress
- **Real-time Stats**: Live updates of total squats, streaks, and achievements
- **Responsive Design**: Optimized for mobile, tablet, and desktop

### 🏆 Social Features
- **Leaderboard**: Compete with others on daily and all-time rankings
- **User Authentication**: Passwordless login with 6-digit email codes
- **Profile Management**: Custom display names and progress sharing

### 🎨 Design & UX
- **Glassmorphism UI**: Modern glass-effect design with smooth animations
- **Dark/Light Mode**: Automatic theme switching with system preference
- **Micro-interactions**: Hover states, transitions, and visual feedback
- **Apple-level Polish**: Attention to detail in every interaction

### 📊 Data Management
- **Supabase Integration**: Cloud database with real-time sync
- **Offline Support**: Local storage fallback when offline
- **Data Persistence**: Never lose your progress
- **Export Ready**: Built for production deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- (Optional) Supabase account for cloud features

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd squat-challenge-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup (Optional)**
   
   For cloud features, create `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   
   > **Note**: The app works perfectly in offline mode without Supabase configuration

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 13.5+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom glassmorphism effects
- **UI Components**: shadcn/ui with Radix UI primitives
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with OTP codes
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Deployment**: Static export ready for any hosting platform

### Project Structure
```
squat-challenge-app/
├── app/                          # Next.js App Router
│   ├── globals.css              # Global styles and glassmorphism effects
│   ├── layout.tsx               # Root layout with theme provider
│   ├── page.tsx                 # Main dashboard page
│   └── leaderboard/             # Leaderboard page
├── components/                   # Reusable UI components
│   ├── ui/                      # shadcn/ui components
│   ├── AuthModal.tsx            # Authentication modal
│   ├── CountUp.tsx              # Animated number counter
│   ├── DailyTarget.tsx          # Daily goal display
│   ├── LeaderboardPreview.tsx   # Leaderboard widget
│   ├── ProgressChart.tsx        # Challenge progress visualization
│   ├── SquatDial.tsx            # Interactive counting dial
│   ├── StarBorder.tsx           # Animated button component
│   ├── StatsOverview.tsx        # Statistics cards
│   └── theme-*.tsx              # Theme management
├── lib/                         # Utility libraries
│   ├── supabase.ts              # Database and auth configuration
│   └── utils.ts                 # Helper functions
├── supabase/                    # Database schema and migrations
│   └── migrations/              # SQL migration files
└── public/                      # Static assets
```

## 🎮 How to Use

### Getting Started
1. **Open the app** - The dial interface is immediately available
2. **Set your squats** - Drag the dial clockwise to add squats, counter-clockwise to subtract
3. **Bank your progress** - Click "Bank Squats" to save your count
4. **Track your journey** - View progress in the comprehensive chart below

### Challenge Structure
- **23 Days Total**: Mix of workout and rest days
- **Varying Targets**: Daily goals range from 75 to 230 squats
- **Rest Days**: Built-in recovery on days 5, 12, and 19
- **Progressive Difficulty**: Targets increase throughout the challenge

### Authentication (Optional)
1. Click "Sign In" in the header
2. Enter your email and display name
3. Check email for 6-digit code
4. Enter code to complete sign-in
5. Your progress syncs across devices

## 🗄️ Database Schema

### Tables
- **profiles**: User information and display names
- **daily_targets**: Challenge day targets (23 days)
- **user_progress**: Daily squat completions per user
- **login_codes**: Temporary authentication codes

### Key Features
- **Row Level Security**: Users can only access their own data
- **Real-time Sync**: Changes appear instantly across devices
- **Offline Fallback**: Local storage when database unavailable
- **Data Integrity**: Constraints prevent invalid data

## 🎨 Design System

### Color Palette
- **Primary**: Blue to purple gradient
- **Success**: Green tones for achievements
- **Warning**: Orange for streaks and progress
- **Error**: Red for validation and limits

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 400 (regular), 600 (semibold), 700 (bold)
- **Scale**: Responsive sizing from mobile to desktop

### Components
- **Glass Effects**: Backdrop blur with transparency
- **Animations**: Smooth transitions and micro-interactions
- **Responsive**: Mobile-first design approach
- **Accessibility**: ARIA labels and keyboard navigation

## 🔧 Configuration

### Challenge Settings
Edit `lib/supabase.ts` to modify:
```typescript
export const CHALLENGE_CONFIG = {
  START_DATE: '2025-06-10',  // Challenge start date
  TOTAL_DAYS: 23             // Total challenge duration
}
```

### Daily Targets
Targets are stored in the database and can be modified via SQL:
```sql
UPDATE daily_targets SET target_squats = 150 WHERE day = 1;
```

### Styling
- **Glassmorphism**: Defined in `app/globals.css`
- **Theme Colors**: Configured in `tailwind.config.ts`
- **Component Styles**: Using Tailwind utility classes

## 📱 Deployment

### Static Export (Recommended)
```bash
npm run build
```
Outputs to `out/` directory - deploy to any static hosting:
- Vercel
- Netlify
- GitHub Pages
- AWS S3
- Cloudflare Pages

### Environment Variables
For production with Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

## 🔒 Security

### Authentication
- **Passwordless**: Email-based OTP codes only
- **Secure**: 6-digit codes expire in 10 minutes
- **Privacy**: No password storage required

### Database Security
- **Row Level Security**: Enabled on all tables
- **User Isolation**: Users can only access their own data
- **Public Data**: Leaderboard data available to all users
- **Input Validation**: Server-side validation on all inputs

## 🐛 Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clear Next.js cache
npm run clean
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Supabase Connection Issues**
- Verify environment variables are set correctly
- Check Supabase project URL and anon key
- Ensure RLS policies are properly configured

**Local Storage Issues**
- Clear browser storage: `localStorage.clear()`
- Check browser console for errors
- Verify JavaScript is enabled

### Performance Optimization
- **Image Optimization**: Disabled for static export
- **Bundle Size**: Optimized with tree shaking
- **Caching**: Aggressive caching for static assets
- **Lazy Loading**: Components loaded on demand

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for Next.js
- **Prettier**: Consistent code formatting
- **Conventions**: React functional components with hooks

### Testing
```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Build test
npm run build
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **shadcn/ui**: Beautiful, accessible UI components
- **Supabase**: Backend-as-a-Service platform
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide**: Beautiful icon library
- **Recharts**: Composable charting library

## 📞 Support

For questions, issues, or feature requests:
1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed information
4. Include browser, OS, and reproduction steps

---

**Built with ❤️ for fitness enthusiasts who love beautiful, functional apps.**