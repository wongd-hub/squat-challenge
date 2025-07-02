# 🏋️‍♂️ Squat Challenge

A beautiful, production-ready web application for tracking daily squat progress through a 23-day challenge. Built with Next.js, TypeScript, and Supabase, featuring an intuitive dial interface, real-time progress tracking, and competitive leaderboards with social features.

> **🚀 Currently in Testing Phase** - Launching July 9th, 2025. Try it now and help us test!

## ✨ Key Features

### 🎯 Core Features
- **Interactive Squat Dial**: Intuitive drag-to-count interface with visual feedback
- **23-Day Challenge**: Structured program with varying daily targets (50-150 squats) and strategic rest days
- **Smart Progress Tracking**: Comprehensive charts showing daily, weekly, and overall progress
- **Real-time Stats**: Live updates of total squats, current streaks (max 23 days), and achievements
- **Timezone-Safe**: Robust date handling with automatic midnight transitions
- **Edit History**: Click any previous day to update your squat count

### 🏆 Social Features
- **Live Leaderboard**: Real-time competition with daily and all-time rankings
- **Passwordless Auth**: Simple 6-digit email codes for sign-in
- **Profile Management**: Custom display names with cross-device sync
- **Streak Competition**: Compare consecutive completion streaks with others

### 🎨 Design & UX
- **Glassmorphism UI**: Modern glass-effect design with smooth framer-motion animations
- **Dark/Light Mode**: Automatic theme switching with system preference detection
- **Responsive Design**: Optimized for mobile, tablet, and desktop experiences
- **Micro-interactions**: Polished hover states, transitions, and visual feedback
- **Apple-level Polish**: Attention to detail in every interaction and animation

### 📊 Advanced Features
- **Offline-First**: Full functionality with local storage fallback
- **Real-time Sync**: Live updates across devices when online
- **Data Export Ready**: Built for production deployment and data portability
- **Charity Integration**: Built-in information about supporting blood cancer and Parkinson's research

## 🎮 Challenge Structure

### Daily Targets
- **Days 1-6**: 50, 55, 60, 65, 70, 75 squats
- **Day 7**: Rest day (0 squats) 🛌
- **Days 8-13**: 80, 85, 90, 95, 100, 105 squats  
- **Day 14**: Rest day (0 squats) 🛌
- **Days 15-20**: 110, 115, 120, 125, 130, 135 squats
- **Day 21**: Rest day (0 squats) 🛌
- **Days 22-23**: 140, 150 squats 🎯

**Total Challenge**: 2,045 squats over 23 days with 3 strategic rest days

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- (Optional) Supabase account for cloud features

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/squat-challenge.git
   cd squat-challenge
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
   NEXT_PUBLIC_CHALLENGE_START_DATE=2025-06-15
   NEXT_PUBLIC_CHALLENGE_TOTAL_DAYS=23
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

# Start production server (or deploy the 'out' folder)
npm start
```

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with custom glassmorphism effects
- **UI Components**: shadcn/ui with Radix UI primitives
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with OTP codes
- **Charts**: Recharts for data visualization
- **Animation**: Framer Motion for smooth transitions
- **Icons**: Lucide React
- **Deployment**: Static export ready for any hosting platform

### Project Structure
```
squat-challenge/
├── app/                          # Next.js App Router
│   ├── globals.css              # Global styles and glassmorphism effects
│   ├── layout.tsx               # Root layout with theme provider
│   ├── page.tsx                 # Main dashboard page
│   └── leaderboard/
│       └── page.tsx             # Full leaderboard page
├── components/                   # Reusable UI components
│   ├── ui/                      # shadcn/ui components (40+ components)
│   ├── AuthModal.tsx            # Authentication modal with OTP
│   ├── CountUp.tsx              # Animated number counter
│   ├── DailyTarget.tsx          # Daily goal display
│   ├── EditDayModal.tsx         # Edit previous day progress
│   ├── FooterFloat.tsx          # Floating footer with actions
│   ├── LeaderboardPreview.tsx   # Leaderboard widget with live updates
│   ├── ProgressChart.tsx        # Interactive challenge progress chart
│   ├── ScrollFloat.tsx          # Scroll-based animations
│   ├── ScrollLottie.tsx         # Lottie animation component
│   ├── ShinyText.tsx            # Text animation effects
│   ├── SquatDial.tsx            # Interactive counting dial
│   ├── StarBorder.tsx           # Animated border component
│   ├── StatsOverview.tsx        # Statistics cards overview
│   └── theme-*.tsx              # Theme management components
├── hooks/                       # Custom React hooks
│   ├── use-mobile.tsx           # Mobile detection hook
│   └── use-toast.ts             # Toast notification hook
├── lib/                         # Utility libraries
│   ├── mockData.ts              # Demo data for offline mode
│   ├── supabase.ts              # Database, auth, and configuration
│   └── utils.ts                 # Helper functions and utilities
├── supabase/                    # Database schema and migrations
│   └── migrations/              # SQL migration files with RLS
└── public/                      # Static assets and icons
```

## 🎮 How to Use

### Getting Started
1. **Open the app** - The dial interface is immediately available
2. **Set your squats** - Drag the dial clockwise to add squats, counter-clockwise to subtract
3. **Bank your progress** - Click "Bank Squats" to save your daily count
4. **Track your journey** - View progress in the interactive chart below
5. **Edit history** - Click any previous day in the chart to update your count

### Smart Features
- **Automatic Midnight Transition**: App detects date changes and updates automatically
- **Streak Tracking**: Consecutive days completing targets (limited to 23 days max)
- **Weekly Progress**: Current week squat totals with goals
- **Rest Day Handling**: Zero targets on rest days don't break your streak

### Authentication (Optional)
1. Click "Sign In" in the header
2. Enter your email and display name (for new users)
3. Check email for 6-digit code
4. Enter code to complete sign-in
5. Your progress syncs in real-time across all devices

## 🗄️ Database Schema

### Core Tables
- **profiles**: User information (id, email, display_name, created_at)
- **daily_targets**: Challenge day targets (day, target_squats)
- **user_progress**: Daily completions (user_id, date, squats_completed, target_squats)

### Advanced Features
- **Row Level Security**: Users can only access their own progress data
- **Real-time Subscriptions**: Live updates when data changes
- **Streak Calculation**: Server-side SQL function for consistent streak logic
- **Leaderboard Functions**: Optimized queries for ranking and totals

### Database Functions
```sql
-- Calculate user's current consecutive streak
calculate_user_streak(user_id) → integer

-- Get total leaderboard with streaks
get_total_leaderboard(start_date, end_date) → table

-- Filter leaderboard by challenge dates
filter_leaderboard_by_challenge_dates() → trigger
```

## 🔧 Configuration

### Challenge Settings
Edit `lib/supabase.ts` to modify:
```typescript
export const CHALLENGE_CONFIG = {
  START_DATE: '2025-06-15',  // Challenge start date
  TOTAL_DAYS: 23,            // Total challenge duration
  DAILY_TARGETS: [
    { day: 1, target_squats: 50 },
    { day: 2, target_squats: 55 },
    // ... complete target array
  ]
}
```

### Environment Variables
```env
# Required for cloud features
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional configuration
NEXT_PUBLIC_CHALLENGE_START_DATE=2025-06-15
NEXT_PUBLIC_CHALLENGE_TOTAL_DAYS=23
```

## 📱 Deployment

### Static Export (Recommended)
```bash
npm run build
```
Outputs to `out/` directory - deploy to any static hosting:

#### Hosting Options
- **Vercel** (Recommended): `vercel deploy`
- **Netlify**: Drag & drop the `out` folder
- **GitHub Pages**: Upload `out` contents to gh-pages branch
- **Cloudflare Pages**: Connect repository for automatic deployments
- **AWS S3**: Upload `out` folder and enable static website hosting
- **Surge.sh**: `surge ./out your-domain.surge.sh`

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

## 🔒 Security & Performance

### Security Features
- **Passwordless Authentication**: Email OTP codes only (6-digit, 10-minute expiry)
- **Row Level Security**: Database-level access control
- **Input Validation**: Client and server-side data validation
- **XSS Prevention**: Sanitized inputs and secure defaults

### Performance Optimizations
- **Bundle Splitting**: Automatic code splitting with Next.js
- **Image Optimization**: Optimized for static export
- **Caching Strategy**: Aggressive caching for static assets
- **Real-time Efficiency**: Throttled updates and background sync
- **Mobile Performance**: Optimized for touch devices and slow connections

## 🆕 Recent Updates

### Version 2.0 (Latest)
- ✅ **Fixed Streak Calculation**: Now properly tracks consecutive streaks (not historical)
- ✅ **Improved Date Handling**: Timezone-safe with automatic midnight transitions
- ✅ **Enhanced Animations**: Reduced animation duration for better UX (800ms countups)
- ✅ **Real-time Leaderboard**: Live updates with framer-motion animations
- ✅ **23-Day Streak Limit**: Streaks capped at challenge duration
- ✅ **Code Cleanup**: Removed debug logs for cleaner production console

### Coming Soon
- 🔄 Challenge completion celebrations
- 🔄 Achievement badges and milestones
- 🔄 Social sharing features
- 🔄 Export progress data (CSV/JSON)

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with proper TypeScript types
4. Test thoroughly (especially date handling and streaks)
5. Ensure no console errors in production build
6. Submit a pull request with detailed description

### Code Standards
- **TypeScript**: Strict mode with proper typing
- **ESLint**: Next.js recommended configuration
- **Prettier**: Consistent code formatting
- **Component Structure**: Functional components with hooks
- **File Naming**: kebab-case for files, PascalCase for components

### Testing Checklist
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Production build test
npm run build

# Manual testing areas:
# - Date transitions (especially around midnight)
# - Streak calculations with various scenarios
# - Offline/online mode switching
# - Cross-device sync
# - Mobile responsiveness
```

## 🐛 Troubleshooting

### Common Issues

**Date/Timezone Problems**
- App uses local timezone for all calculations
- Midnight transitions are detected automatically
- If day seems wrong, check your system date/timezone

**Streak Calculation Issues**
- Streaks only count consecutive completed days
- Rest days (0 target) don't break streaks
- Maximum streak is 23 days (challenge duration)
- Historical completed days don't continue broken streaks

**Build/Deployment Errors**
```bash
# Clear Next.js cache
rm -rf .next out
npm run build

# Reset dependencies
rm -rf node_modules package-lock.json
npm install
```

**Supabase Connection Issues**
- Verify environment variables in production
- Check Supabase project status and URL
- Ensure RLS policies allow user access
- Test with offline mode first

## 🎯 Charity Support

The app encourages supporting these important causes:

### Blood Cancer Research
- [Lymphoma Research Foundation](https://lymphoma.org)
- [Leukemia & Lymphoma Society](https://lls.org)
- [Follicular Lymphoma Foundation](https://www.theflf.org/)

### Parkinson's Research
- [Michael J. Fox Foundation](https://michaeljfox.org)
- [Parkinson's Foundation](https://parkinson.org)
- [Parkinson's & Brain Research Foundation](https://researchparkinsons.org)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **shadcn/ui**: Beautiful, accessible UI component library
- **Supabase**: Powerful backend-as-a-service platform
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Production-ready motion library
- **Lucide**: Comprehensive icon library
- **Recharts**: Composable charting library for React

## 📞 Support

For questions, issues, or feature requests:

1. **Check Documentation**: Review this README and troubleshooting section
2. **Search Issues**: Look through existing GitHub issues
3. **Create Issue**: Include browser, OS, reproduction steps, and screenshots
4. **Join Discussion**: Use GitHub Discussions for questions and ideas

### Issue Template
```
**Environment:**
- Browser: [e.g., Chrome 91]
- OS: [e.g., macOS 12.0]
- Device: [e.g., iPhone 12, Desktop]

**Bug Description:**
Clear description of the issue

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. See error...

**Expected Behavior:**
What should happen

**Screenshots:**
If applicable, add screenshots
```

---

**Built with ❤️ for fitness enthusiasts who love beautiful, functional apps.**

*Challenge yourself. Track your progress. Compete with friends. Support important causes.*