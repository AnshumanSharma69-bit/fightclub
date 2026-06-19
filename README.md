# 🥊 FightClub

**Location-based fighter matchmaking with real-time challenges, ELO rankings, and territory badge system — inspired by Pokémon GO.**

🌐 **Live Demo:** [fightclub-kappa.vercel.app](https://fightclub-kappa.vercel.app)

---

## What is this?

FightClub lets fighters in your city find each other on a live map, send real-time challenge requests, settle fights, and earn territory badges by dominating their local zone. Beat everyone in your area and claim the city badge — hold it or lose it to the next challenger.

No login required to browse the map and see active fighters near you.

---

## Features

### 🗺️ Live Fighter Map
- Real-time map powered by Leaflet + OpenStreetMap (no API key needed)
- Fighter pins with pulsing animation for available fighters
- Colored zone overlays showing territory holders for 9 Indian cities
- Geolocation-based nearby fighter queries using MongoDB's `$near` operator

### ⚔️ Real-Time Challenge System
- Send/accept/decline fight challenges with optional trash talk messages
- Socket.io events deliver notifications instantly — no refresh needed
- Meetup code generated on accept so both fighters can verify they met

### 📸 Photo Proof Upload
- Both fighters independently upload proof photos after the fight
- Winner's photo is shown to the opponent for confirmation or dispute
- If both claim victory → automatic dispute with both photos saved for review
- Cloudinary handles image storage and compression

### 🏆 ELO Rating System
- Standard ELO algorithm (K=32, starting at 1000)
- Rating updates automatically after both fighters confirm the result
- Win rate, total fights, and fight history visible on every public profile

### 🏅 Territory Badge System
- 9 city zones defined as GeoJSON polygons (Mumbai, Delhi, Pune, Bangalore, Hyderabad, Chennai, Kolkata, Nagpur, Aurangabad)
- Win a fight inside an unclaimed zone → automatically claim the badge
- Beat the current zone holder → badge transfers to you
- Badge holders shown on the map and leaderboard

### 👤 Public Fighter Profiles
- Shareable profile page for every fighter (`/fighter/:id`)
- Fight history timeline showing wins, losses, disputes, and proof photos
- No login required to view profiles

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose, geospatial indexes) |
| Real-time | Socket.io |
| Auth | JWT, bcryptjs, Passport.js (Google OAuth 2.0) |
| Maps | Leaflet, React-Leaflet, OpenStreetMap |
| Media | Cloudinary |
| Deployment | Vercel (frontend), Render (backend) |

---

## Architecture

```
client/                          server/
├── app/                         ├── config/
│   ├── map/page.jsx             │   ├── db.js
│   ├── login/page.jsx           │   └── passport.js
│   ├── register/page.jsx        ├── models/
│   ├── onboarding/page.jsx      │   ├── User.js
│   ├── leaderboard/page.jsx     │   ├── Fighter.js
│   ├── fighters/page.jsx        │   ├── Challenge.js
│   └── fighter/[id]/page.jsx   │   └── Zone.js
├── components/                  ├── controllers/
│   ├── MapView.jsx              │   ├── auth.controller.js
│   ├── FighterCard.jsx          │   ├── fighter.controller.js
│   ├── ChallengeModal.jsx       │   ├── challenge.controller.js
│   └── NotificationsPanel.jsx  │   └── zone.controller.js
├── context/                     ├── routes/
│   └── AuthContext.jsx          ├── utils/
└── lib/                         │   ├── elo.js
    └── api.js                   │   ├── badge.js
                                 │   └── cloudinary.js
                                 └── index.js
```

---

## Key Technical Decisions

**MongoDB Geospatial** — Fighter locations are stored as GeoJSON Points with a `2dsphere` index. The "find fighters near me" query uses `$near` with a configurable radius. Territory zones are stored as GeoJSON Polygons; the `$geoIntersects` operator checks whether a fighter's location falls inside a zone after each fight.

**Socket.io rooms** — Each fighter joins a Socket.io room named after their Fighter `_id` on login. This lets the server send targeted events (challenge received, result confirmed, ELO updated) without broadcasting to everyone.

**ELO implementation** — Standard formula: `new_rating = old_rating + K * (actual - expected)` where expected = `1 / (1 + 10^((opponent_rating - your_rating) / 400))`. K=32 means max 32 points per fight. Ratings floor at 0.

**Dual proof system** — Both fighters have independent `challengerProofUrl` and `defenderProofUrl` fields. This prevents a race condition where one fighter could upload proof before the other and lock them out. If both upload before either confirms, the system auto-detects the conflict and marks it disputed.

**Passport.js Google OAuth** — New Google users get a placeholder fighter profile with `needsOnboarding: true`. The auth callback redirects them to `/onboarding` where they fill in real stats. Existing email users who sign in with Google get their accounts linked via email matching.

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier)
- Cloudinary account (free tier)
- Google Cloud Console project with OAuth 2.0 credentials

### Backend

```bash
cd server
npm install
cp .env.example .env
# Fill in your values
node index.js
```

`.env` variables:
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
PORT=5000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Seed city zones (run once):
```bash
curl -X POST http://localhost:5000/api/zone/seed
```

### Frontend

```bash
cd client
npm install
# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register with email/password |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/google` | — | Google OAuth redirect |
| GET | `/api/auth/me` | ✓ | Get current user + fighter |
| GET | `/api/fighter/nearby` | — | Get fighters near coordinates |
| GET | `/api/fighter/:id` | — | Get public fighter profile |
| GET | `/api/fighter/:id/history` | — | Get fight history timeline |
| PATCH | `/api/fighter/me` | ✓ | Update stats / availability / location |
| POST | `/api/challenge/send` | ✓ | Send challenge |
| POST | `/api/challenge/:id/accept` | ✓ | Accept challenge |
| POST | `/api/challenge/:id/upload-proof` | ✓ | Upload fight proof photo |
| POST | `/api/challenge/:id/confirm` | ✓ | Confirm/dispute result |
| GET | `/api/zone/all` | — | Get all territory zones |
| GET | `/api/zone/leaderboard` | — | Get badge holders leaderboard |

---

## Deployment

- **Frontend** → Vercel (auto-deploys from `main` branch, root directory: `client`)
- **Backend** → Render (root directory: `server`, start command: `node index.js`)
- **Database** → MongoDB Atlas M0 (free tier)
- **Media** → Cloudinary (free tier, 25GB)

---

## Built By

**Anshuman Sharma** — B.Tech Computer Science, Ramdeobaba University (2028)

[GitHub](https://github.com/AnshumanSharma69-bit) · [Live Demo](https://fightclub-kappa.vercel.app)
