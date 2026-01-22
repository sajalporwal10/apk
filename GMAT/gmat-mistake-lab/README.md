# GMAT Mistake Lab 🎯

> Turn every mistake into a data point. Turn every data point into mastery.

A personal GMAT preparation app focused on storing, organizing, and practicing questions you got wrong.

## Features

### ✅ Core Features
- **Add Questions** - Log wrong questions with full text, options, and classification
- **GMAT Focus Taxonomy** - Organize by Section → Topic → Subtopic
- **Error Analysis** - Categorize mistakes (Careless, Conceptual, Time Pressure, etc.)
- **GMAT Club Search** - Auto-search for discussion threads
- **Timed Practice** - 10Q/25min, 20Q/45min, or 20 Mixed/45min modes
- **Spaced Repetition** - SM-2 algorithm prioritizes questions due for review

### 📊 Analytics
- **Topic Mastery** - Track progress from Novice to Master
- **Accuracy Trends** - Weekly performance charts
- **Weak Areas** - Identify topics needing focus
- **Repeat Mistakes** - See questions you keep getting wrong

### 🎮 Gamification
- **XP System** - Earn points for adding and practicing questions
- **Levels** - Progress through levels as you gain XP
- **Streaks** - Build daily practice streaks
- **Achievements** - Unlock badges for milestones

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| Charts | Recharts |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone and navigate
cd /Users/sajalporwal/Chatgpt/Nifty\ 500/GMAT/gmat-mistake-lab

# Install all dependencies
npm run install:all

# Initialize database
npm run db:init

# Start development servers
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## Project Structure

```
gmat-mistake-lab/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── stores/         # Zustand state stores
│   │   ├── services/       # API client
│   │   └── utils/          # Helpers & taxonomy
│   └── ...
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── db/             # SQLite database
│   └── data/               # Database file
├── shared/                 # Shared TypeScript types
└── package.json            # Root scripts
```

## API Endpoints

### Questions
- `GET /api/questions` - List all questions (with filters)
- `GET /api/questions/:id` - Get single question
- `POST /api/questions` - Create new question
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question
- `POST /api/questions/import` - Bulk import from CSV

### Practice
- `POST /api/practice/start` - Start new session
- `GET /api/practice/:id` - Get session details
- `POST /api/practice/:id/attempt` - Submit answer
- `POST /api/practice/:id/complete` - End session

### Analytics
- `GET /api/analytics/overview` - Dashboard stats
- `GET /api/analytics/topics` - Topic breakdown
- `GET /api/analytics/trends` - Weekly trends
- `GET /api/analytics/achievements` - Achievement list

## Development

### Running in Development

```bash
# Run both server and client
npm run dev

# Or run separately
cd server && npm run dev  # Backend on :3001
cd client && npm run dev  # Frontend on :5173
```

### Building for Production

```bash
npm run build
cd server && npm start
```

## Future Enhancements

- [ ] Screenshot OCR upload
- [ ] CSV bulk import UI
- [ ] Exam simulation mode
- [ ] Similar question tagging
- [ ] Cloud sync / backup
- [ ] Mobile app (React Native)

---

Built with 💜 for GMAT prep
